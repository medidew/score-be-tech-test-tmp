
import json
import math
import sys
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

BASE_URL = "http://127.0.0.1:8000"
SAMPLE_CASE_ID = "56763bf7-d046-4a54-a4a1-0728c724a092"
UNKNOWN_CASE_ID = "00000000-0000-0000-0000-000000000000"

EXPECTED_FIELDS = {
    "outgoings_water",
    "outgoings_communications",
    "outgoings_mortgage_rent",
    "outgoings_insurance",
    "outgoings_investments",
    "outgoings_council_tax",
    "outgoings_food",
    "outgoings_clothing",
    "outgoings_other_living_costs",
    "outgoings_entertainment",
    "outgoings_holidays",
    "outgoings_sports",
    "outgoings_pension",
    "outgoings_car_costs",
    "outgoings_other_transport_costs",
    "outgoings_child_care",
    "outgoings_fuel",
    "outgoings_ground_rent_service_charge_shared_equity_rent",
    "outgoings_television_license",
    "outgoings_household_repairs",
    "outgoings_additional_details",
}


def request_case(case_id):
    url = f"{BASE_URL}/cases/{case_id}/outgoings"

    try:
        with urlopen(url, timeout=15) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.load(error)


def main():
    # Test 1: Valid case
    status, data = request_case(SAMPLE_CASE_ID)

    assert status == 200, f"Expected 200, got {status}: {data}"
    assert isinstance(data, dict)

    missing_fields = EXPECTED_FIELDS - data.keys()
    assert not missing_fields, f"Missing fields: {missing_fields}"

    for field in EXPECTED_FIELDS - {"outgoings_additional_details"}:
        value = data[field]

        assert (
            value is None
            or (
                isinstance(value, (int, float))
                and not isinstance(value, bool)
                and math.isfinite(value)
            )
        ), f"{field} has invalid value: {value!r}"

    assert isinstance(data["outgoings_additional_details"], str)

    print("PASS: Valid case returns all expected expenditure fields")

    # Test 2: Unknown case
    status, data = request_case(UNKNOWN_CASE_ID)

    assert status == 404, f"Expected 404, got {status}: {data}"

    print("PASS: Unknown case returns 404")
    print("All smoke tests passed!")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, URLError, TimeoutError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
