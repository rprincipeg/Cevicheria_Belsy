import requests

BASE_URL = "http://localhost:3001"
MESERO_USERNAME = "mesero"
MESERO_PASSWORD = "123456"
TIMEOUT = 30


def test_gettableslistwithmesero():
    # Step 1: Login as mesero to get JWT token
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {"username": MESERO_USERNAME, "password": MESERO_PASSWORD}
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        role = login_data.get("role")
        username = login_data.get("username")
        assert token and isinstance(token, str), "Token missing or invalid"
        assert role == "MESERO", f"Expected role MESERO but got {role}"
        assert username == MESERO_USERNAME, f"Expected username {MESERO_USERNAME} but got {username}"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Login request failed or invalid response: {e}")

    # Step 2: Call GET /api/tables with Bearer token
    tables_url = f"{BASE_URL}/api/tables"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        tables_resp = requests.get(tables_url, headers=headers, timeout=TIMEOUT)
        assert tables_resp.status_code == 200, f"GET /api/tables failed with status {tables_resp.status_code}"
        tables_data = tables_resp.json()
        # Support response either as list or dict with 'tables' key
        tables = []
        if isinstance(tables_data, dict) and 'tables' in tables_data:
            tables = tables_data['tables']
        elif isinstance(tables_data, list):
            tables = tables_data
        else:
            raise AssertionError("Unexpected response format for tables list")

        assert isinstance(tables, list), "Response is not a JSON array"
        valid_statuses = {"FREE", "OCCUPIED", "MERGED"}
        for table in tables:
            assert isinstance(table, dict), "Table item is not an object"
            assert 'id' in table, "Table missing 'id'"
            assert 'status' in table, "Table missing 'status'"
            assert table['status'] in valid_statuses, f"Invalid table status: {table['status']}"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"GET /api/tables request failed or invalid response: {e}")


test_gettableslistwithmesero()
