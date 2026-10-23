"""ONS preparation/calculation regression tests.

Run from the repository root:
    python -m pytest -q

Most tests use tiny synthetic Excel workbooks, so no network or real ONS
spreadsheet is needed. An optional real-workbook smoke test runs if present.
"""
from pathlib import Path
import math

import pandas as pd
import pytest

from read_ons import (
    OUTGOINGS_MAPPING,
    calc_outgoings,
    clean_regional_data,
    normalise_code,
    parse_amount,
)

COLUMNS = [
    "Unnamed: 0", "Unnamed: 1", "Unnamed: 2", "Unnamed: 3",
    "UK", "East Midlands", "Scotland",
]


def make_workbook(tmp_path, rows):
    """Write a small real .xlsx file to exercise the parsing path."""
    file = tmp_path / "ONSByRegion2019.xlsx"
    pd.DataFrame(rows, columns=COLUMNS).to_excel(file, index=False)
    return file


@pytest.mark.parametrize(
    "raw,expected",
    [(1, "1"), (1.0, "1"), ("'4.3", "4.3"),
     (" 11.2.1 ", "11.2.1"), ("Food", None), (None, None)],
)
def test_normalise_code(raw, expected):
    assert normalise_code(raw) == expected


def test_multiline_continuation_and_regular_row(tmp_path):
    workbook = make_workbook(tmp_path, [
        {"Unnamed: 0": "4.3", "Unnamed: 1": "Water supply"},
        {"Unnamed: 1": "and miscellaneous services"},
        {"Unnamed: 1": "relating to the dwelling", "UK": 8.0,
         "East Midlands": 9.3, "Scotland": 8.0},
        {"Unnamed: 0": "4.4", "Unnamed: 1": "Electricity and gas",
         "UK": 23.1, "East Midlands": 25.2, "Scotland": 24.0},
    ])
    clean, repairs, diagnostics = clean_regional_data(workbook, {"4.3", "4.4"})
    assert clean.at["4.3", "East Midlands"] == pytest.approx(9.3)
    assert clean.at["4.4", "UK"] == pytest.approx(23.1)
    assert repairs == [("4.3", 2, 4)]
    assert diagnostics["missing_codes"] == []


def test_missing_marker_is_not_treated_as_continuation(tmp_path):
    workbook = make_workbook(tmp_path, [
        {"Unnamed: 0": "4.3", "Unnamed: 1": "Water", "UK": "..",
         "East Midlands": "..", "Scotland": ".."},
        {"Unnamed: 1": "Some other line", "UK": 999,
         "East Midlands": 999, "Scotland": 999},
    ])
    clean, repairs, _ = clean_regional_data(workbook, {"4.3"})
    assert repairs == []
    assert math.isnan(clean.at["4.3", "East Midlands"])


def test_never_cross_a_numbered_category_boundary(tmp_path):
    workbook = make_workbook(tmp_path, [
        {"Unnamed: 0": "4.3", "Unnamed: 1": "No value given"},
        {"Unnamed: 0": "4.4", "Unnamed: 1": "Different category",
         "East Midlands": 99},
    ])
    clean, repairs, _ = clean_regional_data(workbook, {"4.3", "4.4"})
    assert repairs == []
    assert math.isnan(clean.at["4.3", "East Midlands"])
    assert clean.at["4.4", "East Midlands"] == 99.0


def test_ambiguous_continuation_fails_closed(tmp_path):
    workbook = make_workbook(tmp_path, [
        {"Unnamed: 0": "4.3", "Unnamed: 1": "Water"},
        {"Unnamed: 1": "Line A", "UK": 8},
        {"Unnamed: 1": "Line B", "UK": 9},
    ])
    with pytest.raises(ValueError, match="Ambiguous continuation"):
        clean_regional_data(workbook, {"4.3"})


def test_duplicate_codes_raise_instead_of_choosing_arbitrarily(tmp_path):
    workbook = make_workbook(tmp_path, [
        {"Unnamed: 0": "1", "UK": 60},
        {"Unnamed: 0": "1", "UK": 65},
    ])
    with pytest.raises(ValueError, match="Duplicate ONS codes"):
        clean_regional_data(workbook, {"1"})


def test_numeric_conversion_and_warning_markers():
    samples = set()
    unknown = []
    assert parse_amount("1,234.50", "1", "UK", samples, unknown) == 1234.5
    assert parse_amount("[9.10]", "1", "UK", samples, unknown) == 9.1
    assert ("1", "UK") in samples
    assert math.isnan(parse_amount("..", "1", "UK", samples, unknown))
    assert math.isnan(parse_amount(None, "1", "UK", samples, unknown))
    assert math.isnan(parse_amount("unrecognised", "1", "UK", samples, unknown))
    assert unknown == [("1", "UK", "unrecognised")]


def test_missing_category_and_unknown_cell_are_recorded(tmp_path):
    workbook = make_workbook(tmp_path, [
        {"Unnamed: 0": "1", "UK": "57", "East Midlands": "unknown", "Scotland": 57},
    ])
    clean, _, diag = clean_regional_data(workbook, {"1", "99.9"})
    assert diag["missing_codes"] == ["99.9"]
    assert ("1", "East Midlands", "unknown") in diag["unrecognised_values"]
    assert math.isnan(clean.at["1", "East Midlands"])


def test_partial_and_missing_estimates_are_labelled_concisely():
    clean = pd.DataFrame(
        {"East Midlands": [10.0, math.nan, 57.0]},
        index=pd.Index(["12.4", "14.2", "1"], name="code"),
    )
    mapping = {
        "outgoings_insurance": {
            "codes": ["12.4", "14.2"],
            "notes": "A very long mapping explanation that belongs in the README.",
        },
        "outgoings_food": {"codes": ["1"], "notes": None},
        "outgoings_child_care": {"codes": None, "notes": "Unavailable."},
        "outgoings_water": {"codes": ["9.9"], "notes": None},
    }
    result = calc_outgoings(
        clean, mapping, "East Midlands",
        small_sample_warnings={("12.4", "East Midlands")},
        unrecognised_values=[("14.2", "East Midlands", "bad text")],
    )
    assert result["outgoings_insurance"] == 10.0
    assert result["outgoings_food"] == 57.0
    assert result["outgoings_child_care"] is None
    assert result["outgoings_water"] is None
    details = result["outgoings_additional_details"]
    details = result["outgoings_additional_details"]

    # Mapping notes should be preserved
    assert "A very long mapping explanation" in details
    assert "outgoings_child_care: Unavailable." in details

    # Partial estimate due to missing ONS values
    assert "outgoings_insurance: ONS categories 14.2 were unavailable" in details

    # Unrecognised source value
    assert "Unrecognised ONS values for categories 14.2 were excluded" in details

    # Low-sample estimate
    assert "Low-sample estimates used for ONS categories 12.4" in details

    # Entirely unavailable category
    assert "outgoings_water: ONS categories 9.9 were unavailable" in details


def test_region_not_in_data_is_rejected():
    clean = pd.DataFrame({"Scotland": [57.0]}, index=["1"])
    with pytest.raises(ValueError, match="Unsupported ONS region"):
        calc_outgoings(clean, {"outgoings_food": {"codes": ["1"]}}, "Mars")


def test_no_exact_code_reused_by_different_output_fields():
    used = {}
    for field, config in OUTGOINGS_MAPPING.items():
        for code in config.get("codes") or []:
            assert code not in used, f"{code} used in both {used.get(code)} and {field}"
            used[code] = field


def test_real_workbook_smoke_if_available():
    """Integration check; cannot establish that inferred repairs are semantically right."""
    workbook = Path(__file__).resolve().parents[1] / "ONSByRegion2019.xlsx"
    if not workbook.exists():
        pytest.skip("Real ONS workbook not present beside read_ons.py")
    needed = {
        code for config in OUTGOINGS_MAPPING.values()
        for code in (config.get("codes") or [])
    }
    clean, repairs, diagnostics = clean_regional_data(workbook, needed)
    assert clean.at["1", "Scotland"] == pytest.approx(57.0)
    assert "East Midlands" in clean.columns
    assert len(repairs) == len(set(repairs))
    result = calc_outgoings(
        clean, OUTGOINGS_MAPPING, "East Midlands",
        diagnostics["small_sample"], diagnostics["unrecognised_values"],
    )
    assert isinstance(result["outgoings_additional_details"], str)
    assert all(field in result for field in OUTGOINGS_MAPPING)
