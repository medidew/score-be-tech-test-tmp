
from pathlib import Path

from fastapi import FastAPI, HTTPException

from read_case import get_case
from postcodes import postcode_to_region
from read_ons import (OUTGOINGS_MAPPING, clean_regional_data, calc_outgoings,)


app = FastAPI(title="Mortgage Affordability API")

BASE_DIR = Path(__file__).resolve().parent
CASE_FILE = BASE_DIR / "case.json"
ONS_FILE = BASE_DIR / "ONSByRegion2019.xlsx"


# Prepare the ONS dataset once, not for every API request.
needed_codes = {
    code
    for config in OUTGOINGS_MAPPING.values()
    for code in (config.get("codes") or [])
}

clean_df, repairs, diagnostics = clean_regional_data(
    ONS_FILE,
    needed_codes
)


def get_case_region(case):
    clients = case.get("clients")

    if not isinstance(clients, list) or not clients:
        raise ValueError("Case has no valid clients")

    postcodes = set()

    for client in clients:
        try:
            postcode = client["details"]["address"]["postcode"]
        except (KeyError, TypeError):
            raise ValueError("Client postcode information is missing")

        if not isinstance(postcode, str) or not postcode.strip():
            raise ValueError("Client has an invalid postcode")

        postcodes.add(postcode.strip().upper())

    regions = set()

    for postcode in postcodes:
        region = postcode_to_region(postcode)

        if region is None:
            raise ValueError("Client postcode could not be resolved")

        regions.add(region)

        if len(regions) > 1:
            raise ValueError("Clients belong to different regions")

    return regions.pop()


@app.get("/cases/{case_id}/clients")
def get_clients(case_id: str):
    case = get_case(CASE_FILE, case_id)

    if case is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # Same structure as case.json: the case ID and its list of clients
    return {
        "case_id": case["case_id"],
        "clients": case.get("clients", []),
    }


@app.get("/cases/{case_id}/outgoings")
def get_outgoings(case_id: str):
    # 1. Retrieve the case
    case = get_case(CASE_FILE, case_id)

    if case is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # 2. Determine the household region
    try:
        region = get_case_region(case)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc)
        ) from exc
    except (RuntimeError, OSError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Postcode lookup service unavailable"
        ) from exc

    # 3. Check whether ONS covers the region
    if region not in clean_df.columns:
        raise HTTPException(
            status_code=422,
            detail="No ONS expenditure data for this region"
        )

    # 4. Calculate household expenditure
    outgoings = calc_outgoings(
        clean_df,
        OUTGOINGS_MAPPING,
        region,
        diagnostics["small_sample"]
    )

    # 5. FastAPI converts the dictionary into JSON
    return outgoings
