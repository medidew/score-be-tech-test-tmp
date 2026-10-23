import math
import re
import pandas as pd
from pathlib import Path

CODE_COLS = ("Unnamed: 0", "Unnamed: 1")
DESCRIPTION_COLS = ("Unnamed: 2", "Unnamed: 3")

def normalise_code(value):
    """Return a category code as text, or None for descriptions/blanks."""
    if pd.isna(value):
        return None

    if isinstance(value, (int, float)) and float(value).is_integer():
        value = int(value)

    code = str(value).strip().lstrip("'")

    # Accept category codes like 1, 4.1 and 11.2.1
    if re.fullmatch(r"\d+(?:\.\d+)*", code):
        return code

    return None


def has_content(value):
    """Flags an empty Excel cell; not the same as ".."."""
    return not pd.isna(value) and str(value).strip() != ""

def parse_amount(value, code, region, small_sample_warnings, unrecognised_values):
    """Convert a single ONS amount to float or NaN."""
    if pd.isna(value):
        return math.nan

    text = str(value).strip().replace("−", "-")
    
    # Missing or suppressed data
    if text in ("", "..", "-"):
        return math.nan

    # Brackets flag a low-sample estimate
    if text.startswith("[") and text.endswith("]"):
        small_sample_warnings.add((code, region))
        text = text[1:-1].strip()

    try:
        amount = float(text.replace(",", ""))
    except ValueError:
        unrecognised_values.append((code, region, value))
        return math.nan
    if not math.isfinite(amount):
        raise ValueError(f"Invalid value {value!r} for {code} / {region}")

    return amount


def clean_regional_data(filepath, needed_codes):
    """Return with added code column, inferred merges and diagnostics.

    Continuation-row merges are heuristics: ALWAYS review `repairs` against
    the original workbook before using estimates in a real decision.
    """

    needed_codes = set(needed_codes)

    df = pd.DataFrame(pd.read_excel(filepath, dtype=object).reset_index(drop=True))

    required_cols = (*CODE_COLS, *DESCRIPTION_COLS, "UK")
    absent_cols = [col for col in required_cols if col not in df.columns]
    if absent_cols:
        raise ValueError(f"Unexpected ONS worksheet layout: missing {absent_cols}")
    
    # Regional columns start at UK
    region_cols = df.columns[df.columns.get_loc("UK"):].tolist()
   
    # Combine the two code columns
    df["code"] = (df[CODE_COLS[0]].map(normalise_code).combine_first(df[CODE_COLS[1]].map(normalise_code)))

    repairs = []

    # Repair continuation rows for the needed categories 
    for i in range(len(df)):
 
        code = df.at[i, "code"]

        if pd.isna(code) or code not in needed_codes:
            continue

        
        # A row containing values (including '..') is not blank
        if any(has_content(v) for v in df.loc[i, region_cols]):
            continue

        candidate_rows = []
        j = i + 1

        while j < len(df):
            # Stop when another numbered category starts
            if pd.notna(df.at[j, "code"]):
                break

            row_values = df.loc[j, region_cols]

            if any(has_content(v) for v in row_values):
                candidate_rows.append(j)

            else:
                # Stop at a completely empty row
                text_cols = CODE_COLS + DESCRIPTION_COLS
                if not any(has_content(df.at[j, col]) for col in text_cols):
                    break
            j += 1

        # Cannot guess between multiple possible continuations
        if len(candidate_rows) > 1:
            raise ValueError(f"Ambiguous continuation for {code}: Excel rows {[pos+2 for pos in candidate_rows]}")

        if len(candidate_rows) == 1:
            source_row = candidate_rows[0]

            df.loc[i, region_cols] = (df.loc[source_row, region_cols].to_numpy())

            # Store the original Excel row numbers for review
            repairs.append((code, i + 2, source_row + 2))

    # Retain only categories needed for the API
    clean = df.loc[df["code"].isin(needed_codes),["code", *region_cols]].copy()
    
    # Reject duplicate category codes
    duplicates = clean.loc[clean["code"].duplicated(), "code"].tolist()

    if duplicates:
        raise ValueError(f"Duplicate ONS codes:{duplicates}")

    diagnostics = {
        "missing_codes": sorted(needed_codes - set(clean["code"])),
        "small_sample": set(),
        "unrecognised_values": [],
    }

    # Convert expenditure values to numbers
    for region in region_cols:
        clean[region] = [
            parse_amount(value, code, region, diagnostics["small_sample"], diagnostics["unrecognised_values"])
            for code, value in zip(clean["code"], clean[region])
        ]

    return clean.set_index("code"), repairs, diagnostics


def calc_outgoings(clean_df: pd.DataFrame, mapping, region, small_sample_warnings=(), unrecognised_values=()):
    """Calculate weekly regional averages: explicit warnings for partial estimates."""
    if region not in clean_df.columns:
        raise ValueError(f"Unsupported ONS region: {region}")

    low_sample = set(small_sample_warnings)
    outgoings = {}
    details = []
    
    for field, config in mapping.items():
        codes = config.get("codes")
        if config.get("notes"):
            details.append(f"{field}: {config['notes']}")

        if not codes:
            outgoings[field] = None
            continue
        
        # Series preserves the requested code order;
        # absent categories become NaN so we can report partial totals.
        values = clean_df[region].reindex(codes)   
        available = values.dropna()
        missing_codes = values.index[values.isna()].to_list()       

        if missing_codes:
            details.append(
                f"{field}: ONS categories {', '.join(missing_codes)} "
                "were unavailable; result is partial or missing."
                )  
        unrecognised_codes = [
            code
            for code, warning_region, value in unrecognised_values
            if code in codes and warning_region == region
        ]

        if unrecognised_codes:
            details.append(
                f"{field}: Unrecognised ONS values for categories "
                f"{', '.join(unrecognised_codes)} were excluded."
            )

        outgoings[field] = (round(float(available.sum()), 2) if not available.empty else None)
        
        flagged = [code for code in codes if (code, region) in low_sample]

        if flagged:
            details.append(
                f"{field}: Low-sample estimates used for ONS "
                f"categories {', '.join(flagged)}."
                )

    outgoings["outgoings_additional_details"] = "\n".join(details)
    return outgoings


OUTGOINGS_MAPPING = {
    "outgoings_water": {
        "codes": ["4.3"],
        "notes": "Estimated: Dataset does not isolate water expenditure; may include additional dwellings services."
    },

    "outgoings_communications" : {
        "codes": ["8"],
        "notes": None,           
    },

    "outgoings_mortgage_rent": {
        "codes": ["4.1.3", "14.5"],
        "notes": "Includes net rent and ONS category: Purchase or alteration of dwellings, "
        "mortgages. This also includes one-off expenses. Mortgage interest is excluded because it cannot be isolated from other housing costs. Actual value may be higher or lower.",           
    },

    "outgoings_insurance" : {
        "codes": ["12.4", "14.2"],
        "notes": "Excludes ONS category 14.1 (Life assurance, contributions to pension funds), "
        "because life insurance cannot be separated from pension funds contributions, which "
        "are represented by a different outgoing field.",           
    }, 

    "outgoings_investments": {
        "codes": ["14.6"],
        "notes": "Includes savings and investments.",           
    },

    "outgoings_council_tax": {
        "codes": ["13.1"],
        "notes": "Not separately identifiable: aggregates council tax and mortgage interest payments.",           
    },

    "outgoings_food": {
        "codes": ["1","11.1.1","11.1.3","11.1.4","11.1.5"],
        "notes": "Excludes alcoholic drinks.",           
    },

    "outgoings_clothing": {
        "codes": ["3"],
        "notes": "Includes footwear.",           
    }, 

    "outgoings_other_living_costs": {
        "codes": ["5", "6", "10", "12.1", "12.2", "12.3", "12.5"],
        "notes": "Includes following ONS categories: Household goods & services, Health, "
        "Education, Personal care, Personal effects, Social protection, Bank, building society, "
        "post office, credit card charges, and Other services and professional fees"
    },
      
    "outgoings_entertainment": {
        "codes": [
            "9.1", "9.2", "9.3.1", "9.3.2", "9.3.4", "9.3.5", 
            "9.4.2", "9.4.4", "9.4.5", "9.4.6", "9.5"
        ],
        "notes": "Excludes sports, package holidays and TV, video, satellite rental, cable "
        "subscriptions and TV licences, as they are represented by separate outgoing fields"
    },

    "outgoings_holidays": {
        "codes": ["9.6", "11.2.1", "11.2.2", "13.3"],
        "notes": None,
    },

    "outgoings_sports": {
        "codes": ["9.3.3", "9.4.1"],
        "notes": None,
    },

    "outgoings_pension": {
        "codes": ["14.1"],
        "notes": "Overestimated: aggregates life assurance with contributions to pension funds."
    },

    "outgoings_car_costs": {
        "codes": ["7.1", "7.2"],
        "notes": "Excludes car insurance as that is included with insurance outgoings. "
        "Includes vehicle purchases, which aren't recurring expenses."
    },

    "outgoings_other_transport_costs": {
        "codes": ["7.3"],
        "notes": None,
    },


    "outgoings_child_care": {
        "codes": None,
        "notes": "No ONS categories explicitly represents child care costs.",
    },

    "outgoings_fuel": {
        "codes": ["4.4"],
        "notes": "Excludes car fuel costs as that is included with car costs.",
    },


    "outgoings_ground_rent_service_charge_shared_equity_rent":  {
        "codes": None,
        "notes": "No ONS categories explicitly identify these costs; "
        "reliable estimate requires additional property specific information.",
    }, 

    "outgoings_television_license":  {
        "codes": ["9.4.3"],
        "notes": "Overestimated: aggregates TV licence and TV, video, "
        "satellite rental, cable subscriptions costs.",
    },

    "outgoings_household_repairs": {
        "codes": ["4.2"],
        "notes": None,
    },
}


if __name__ == "__main__":
    filepath = Path(__file__).resolve().parent / "ONSByRegion2019.xlsx"

    needed_codes = {
        code
        for config in OUTGOINGS_MAPPING.values()
        for code in (config.get("codes") or [])
    }
   

    clean_df, repairs, diagnostics = clean_regional_data(filepath, needed_codes)
    print("Continuation rows to verify:", repairs)
    print("Missing category codes:", diagnostics["missing_codes"])
    print("Low-sample cells:", sorted(diagnostics["small_sample"]))

    outgoings = calc_outgoings(
        clean_df, OUTGOINGS_MAPPING, "East Midlands", diagnostics["small_sample"], diagnostics["unrecognised_values"]
    )
    for field, value in outgoings.items():
        if field != "outgoings_additional_details":
            print(f"{field}: {value}")
    print("\nAdditional details:\n", outgoings["outgoings_additional_details"])

    # Check all mappings against every available region
    expected_fields = set(OUTGOINGS_MAPPING) | {
        "outgoings_additional_details"
    }

    failures = []

    for region in clean_df.columns:
        try:
            result = calc_outgoings(
                clean_df,
                OUTGOINGS_MAPPING,
                region,
                diagnostics["small_sample"],
                diagnostics["unrecognised_values"],
            )

            # Check that all expected fields are returned
            missing_fields = expected_fields - set(result)
            if missing_fields:
                raise AssertionError(
                    f"Missing output fields: {missing_fields}"
                )

            # Validate the types of the calculated values
            for field, value in result.items():
                if field == "outgoings_additional_details":
                    if not isinstance(value, str):
                        raise AssertionError("Additional details must be text")
                    continue

                if value is not None:
                    if not isinstance(value, (int, float)):
                        raise AssertionError(f"{field}: not numeric")

                    if not math.isfinite(value):
                        raise AssertionError(f"{field}: non-finite value")

            # Fields with mapped codes but no usable estimate
            unavailable = [
                field
                for field, config in OUTGOINGS_MAPPING.items()
                if config.get("codes") and result[field] is None
            ]

            print(f"{region}: PASS")
            if unavailable:
                print(f"  Unavailable estimates: {unavailable}")

        except Exception as exc:
            failures.append((region, str(exc)))
            print(f"{region}: FAIL - {exc}")
    print("Unrecognised values:", diagnostics["unrecognised_values"])
    print(f"\nTested {len(clean_df.columns)} regions")
    print(f"Regions with failures: {len(failures)}")
