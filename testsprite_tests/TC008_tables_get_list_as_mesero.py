import requests

BASE_URL = "http://localhost:3001"
LOGIN_PATH = "/api/auth/login"
TABLES_PATH = "/api/tables"
TIMEOUT = 30

def test_tables_get_list_as_mesero():
    # Step 1: Login as mesero
    login_payload = {"username": "mesero", "password": "123456"}
    try:
        login_resp = requests.post(
            BASE_URL + LOGIN_PATH, json=login_payload, timeout=TIMEOUT
        )
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token_data = login_resp.json()
    token = token_data.get("token")
    role = token_data.get("role")
    username = token_data.get("username")
    assert token and isinstance(token, str), "Token missing or not a string"
    assert role == "MESERO", f"Unexpected role {role}"
    assert username == "mesero", f"Unexpected username {username}"

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: GET /api/tables with MESERO token
    try:
        tables_resp = requests.get(BASE_URL + TABLES_PATH, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"GET /api/tables request failed: {e}"
    assert tables_resp.status_code == 200, f"GET /api/tables failed: {tables_resp.text}"
    tables = tables_resp.json()
    assert isinstance(tables, list), "Response is not a JSON array"

    valid_statuses = {"FREE", "OCCUPIED", "MERGED"}
    for table in tables:
        # Ignore the synthetic takeaway entry (id='takeaway', type='takeaway')
        if table.get("id") == "takeaway" and table.get("type") == "takeaway":
            continue
        # Validate only real tables that have 'number' field
        if "number" in table:
            assert "id" in table, f"Table with number {table.get('number')} missing 'id'"
            assert "status" in table, f"Table with number {table.get('number')} missing 'status'"
            status = table["status"]
            assert status in valid_statuses, f"Table with number {table.get('number')} has invalid status '{status}'"

test_tables_get_list_as_mesero()