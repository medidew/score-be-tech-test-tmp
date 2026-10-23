"""API error-path tests, using mocks to avoid external postcode HTTP calls.

These run when this package is copied into the actual project containing
main.py and the supplied ONS workbook. They do not contact Postcodes.io.
"""
import importlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

SAMPLE_ID = "56763bf7-d046-4a54-a4a1-0728c724a092"


@pytest.fixture
def api(monkeypatch):
    root = Path(__file__).resolve().parents[1]
    if not (root / "main.py").is_file():
        pytest.skip("No main.py in this folder; copy tests into your API project")

    main = importlib.import_module("main")
    # Make case lookup deterministic, so no external case service is needed.
    monkeypatch.setattr(main, "get_case", lambda *args: {
        "case_id": SAMPLE_ID,
        "clients": [
            {"details": {"address": {"postcode": "NG1 2ET"}}},
            {"details": {"address": {"postcode": "NG1 2ET"}}},
        ],
    })
    return main, TestClient(main.app)


def test_unknown_case_returns_404(api, monkeypatch):
    main, client = api
    monkeypatch.setattr(main, "get_case", lambda *args: None)
    response = client.get(f"/cases/{SAMPLE_ID}/outgoings")
    assert response.status_code == 404


def test_conflicting_regions_return_422(api, monkeypatch):
    main, client = api

    def conflict(case):
        raise ValueError("Clients belong to different regions")

    monkeypatch.setattr(main, "get_case_region", conflict)
    response = client.get(f"/cases/{SAMPLE_ID}/outgoings")
    assert response.status_code == 422


def test_postcode_service_failure_returns_503(api, monkeypatch):
    main, client = api

    def unavailable(case):
        raise RuntimeError("Postcode lookup service failed")

    monkeypatch.setattr(main, "get_case_region", unavailable)
    response = client.get(f"/cases/{SAMPLE_ID}/outgoings")
    assert response.status_code == 503


def test_region_without_ons_data_returns_422(api, monkeypatch):
    main, client = api
    monkeypatch.setattr(main, "get_case_region", lambda case: "Unsupported Region")
    response = client.get(f"/cases/{SAMPLE_ID}/outgoings")
    assert response.status_code == 422


def test_repeated_postcode_needs_only_one_lookup(api, monkeypatch):
    main, _ = api
    requests = []

    def lookup(postcode):
        requests.append(postcode)
        return "East Midlands"

    monkeypatch.setattr(main, "postcode_to_region", lookup)
    case = {
        "clients": [
            {"details": {"address": {"postcode": " NG1 2ET "}}},
            {"details": {"address": {"postcode": "ng1 2et"}}},
        ]
    }
    assert main.get_case_region(case) == "East Midlands"
    assert requests == ["NG1 2ET"]