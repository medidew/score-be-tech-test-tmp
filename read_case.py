import json


# case has multiple clients: when tehy have different postcodes check if same region
# if not return error of conflicting regions

def get_case(filepath, case_id):
    """Returns case as dict based on case_id. If ID does not exist in filepath, returns None"""
    with open(filepath) as file:
        cases = json.load(file)
    for case in cases:
        if case_id == case["case_id"]:
            return case
    return None

if __name__ == "__main__":
        pass