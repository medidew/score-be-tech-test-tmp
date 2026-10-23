Mortgage Affordability Outgoings API

A Python/FastAPI proof of concept for the mortgage-affordability backend technical exercise. Given a Case ID, the API retrieves the supplied example case, determines the household's geographic region from client postcodes, and estimates outgoings from the supplied ONS 2019 regional household expenditure spreadsheet.

Important: Amounts are regional household averages in pounds per week (GBP/week), not the applicants' actual expenditure or verified mortgage costs. This is a technical-exercise prototype, not a lending or underwriting decision system.

Prerequisites
- Python 3.10 or newer.
- Internet access for the postcode lookup at Postcodes.io.
- The supplied case.json and ONSByRegion2019.xlsx in the project directory.

Installation and running

From the project directory:
python -m venv .venv

Activate the environment:
# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
# .venv\Scripts\Activate.ps1

Install and start the API:
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload


Open http://127.0.0.1:8000/docs for interactive API documentation.


API endpoint
GET /cases/{case_id}/outgoings

Example using the Case ID supplied with the exercise:
curl -i "http://127.0.0.1:8000/cases/56763bf7-d046-4a54-a4a1-0728c724a092/outgoings"

A successful response is a JSON object containing the mapped outgoings_... fields and outgoings_additional_details. Numeric amounts are estimated weekly GBP expenditure. Some fields are null when the dataset does not support a defensible estimate; null must not be interpreted as zero spending.

outgoings_additional_details intentionally retains the explanatory notes from the category mapping, and adds relevant warnings for unavailable components, low-sample values and unrecognised source values. Partial estimates sum only usable components and are explicitly flagged; they are not complete household totals.

GET /cases/{case_id}/clients

Returns the case's client details in the same JSON structure as case.json (case_id plus the clients list):
curl -i "http://127.0.0.1:8000/cases/56763bf7-d046-4a54-a4a1-0728c724a092/clients"

Returns 404 when the Case ID does not match the supplied fixture.

HTTP status	Meaning
200	Case found and estimates calculated
404	Case ID does not match the supplied fixture
422	Invalid/missing postcode, clients in different regions, or unsupported ONS geography
503	Postcode lookup service failed or was unavailable

Processing and design
1. Retrieve case. Read the supplied case.json fixture and check its case_id against the URL parameter. There is no supplied case-management API or database, so this implementation supports only the provided sample case.
2. Determine household region. Extract postcodes for each client, normalise and deduplicate them, and resolve them using Postcodes.io. The prototype requires all clients to map to one region; conflicting regions yield a validation error. For England the lookup returns an English region; elsewhere it uses the returned country when supported by the ONS workbook.
3. Prepare ONS data. clean_regional_data() reads ONSByRegion2019.xlsx, normalises category codes across the relevant spreadsheet columns, and converts expenditure cells to numbers. The prepared dataframe is loaded once for the API rather than on every request.
4. Calculate estimates. calc_outgoings() uses OUTGOINGS_MAPPING to select and sum source categories for the resolved region, producing an estimated amount or null for each outgoing field.
5. Return JSON. The endpoint returns expenditure estimates and explanatory details; it does not return client postcodes, names or addresses.
The implementation separates HTTP routing, case retrieval, postcode lookup, and ONS data processing. The category-to-field mapping is explicit in read_ons.py so its assumptions can be reviewed.

Data handling and warnings
- Blank cells and the ONS missing/suppressed markers (.. and -) are treated as missing, never as zero.
- Bracketed values (for example, [8.40]) are parsed as numeric estimates and recorded as small-sample warnings.
- Unrecognised cells (for example, :) are recorded in diagnostics["unrecognised_values"] and excluded from calculations. When those diagnostics are supplied to calc_outgoings(), the API details explain which mapped categories were affected.
- A field with some available categories returns their sum with a partial-estimate warning. A field with no usable values returns null.
- Some categories have descriptions split across spreadsheet rows. The cleaner can infer a continuation row and records each inferred merge in repairs. These are heuristics, not verified facts. Each repair must be checked against the original workbook.
- Missing source codes and small-sample cells are also available through the cleaner's diagnostics return value. Running the checks under if __name__ == "__main__": in read_ons.py prints them for developer review.

Financial mapping assumptions and limitations
The mapping approximates affordability expenditure fields using aggregated ONS categories. It cannot isolate all costs accurately:

Water (4.3)	Source category includes additional dwelling-related costs, not water alone.
Mortgage/rent (4.1.3, 14.5)	Includes rent and a broad category containing property purchases/alterations; excludes separately unidentifiable mortgage interest. May materially over- or underestimate recurring housing costs.
Council tax (13.1)	Aggregated with mortgage interest and other housing charges, so cannot be isolated accurately.
Insurance and pensions (12.4, 14.2, 14.1)	Life assurance is grouped with pension contributions in the source, preventing a precise split.
Car costs (7.1, 7.2)	Includes purchases of vehicles, which are not necessarily recurring.
Television licence (9.4.3)	Includes subscriptions and related TV services.
Childcare	No suitable standalone category identified; returns null.
Ground rent, service charges and shared-equity rent	Cannot be estimated reliably from the supplied regional aggregates; returns null.

The source is from 2019, and regional averages do not reflect the applicants' specific circumstances, current prices, household composition, tenure or actual commitments. Values should not be presented as individual affordability assessments. Other age/composition datasets supplied with the exercise are not incorporated in this version.

Tests
Install test dependencies:
python -m pip install -r requirements-dev.txt
Run the unit and mocked API tests, present in tests directory:
python -m pytest -q
These test ONS parsing, missing and unrecognised values, continuation-row handling, partial sums, low-sample warnings and API error paths. Mocked HTTP tests do not verify the live postcode service or the actual financial meaning of an inferred spreadsheet merge.
For an end-to-end smoke test, start the FastAPI server in one terminal and run:
python smoke_test_api.py
The smoke test checks that the sample Case ID returns the expected fields and types and an unknown ID returns 404. It does not establish that each estimate is financially correct.

Non-functional considerations and improvement suggestions for production

Maintainability:	Separate modules and an explicit OUTGOINGS_MAPPING	

Performance:	Load/clean the ONS workbook once when the API starts; deduplicate client postcodes per request	
Improvement: Cache postcode results and store a reviewed, prepared ONS dataset

Reliability:	Time-limited external postcode lookup and HTTP error handling	
Improvement: Adding provider-failure strategy

Data quality:	Explicit missing values, partial-estimate warnings, small-sample flags and continuation-row diagnostics	
Improvement: Source validation, audited mappings, periodic dataset updates

Security and privacy:	No personal case data returned in expenditure response; HTTPS to postcode service	
Improvement: Authentication, case-level authorisation, and access controls

Known scope limitations
- Case retrieval is fixture-based, not backed by a database or live case system.
- Client postcode conflicts are rejected rather than resolved by business policy.
- The selected ONS mapping includes approximations and some one-off expenditure. It is not a reliable model for an individual's contractual monthly commitments.
- Authentication and authorisation are not implemented in this prototype.
- The technical brief expresses a preference for Go; this implementation uses Python/FastAPI.