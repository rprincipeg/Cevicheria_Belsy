import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30


def test_tables_get_active_items():
    session = requests.Session()
    try:
        # Step 1: Login mesero/123456 to get token
        login_resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "mesero", "password": "123456"},
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert token and isinstance(token, str) and token.strip(), "No token received"
        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: GET /api/tables and find a table whose status=='OCCUPIED'
        tables_resp = session.get(f"{BASE_URL}/api/tables", headers=headers, timeout=TIMEOUT)
        assert tables_resp.status_code == 200, f"Failed to get tables: {tables_resp.text}"
        tables = tables_resp.json()
        assert isinstance(tables, list), "Tables response is not a list"

        occupied_table_id = None
        any_real_table_id = None
        for table in tables:
            # Only consider entries with 'number' field (real tables)
            if "number" in table and "id" in table:
                if any_real_table_id is None:
                    any_real_table_id = table["id"]
                if table.get("status") == "OCCUPIED":
                    occupied_table_id = table["id"]
                    break

        target_table_id = occupied_table_id or any_real_table_id
        assert target_table_id is not None, "No valid table id found to test"

        # Step 3: GET /api/tables/{id}/active-items
        active_items_resp = session.get(
            f"{BASE_URL}/api/tables/{target_table_id}/active-items",
            headers=headers,
            timeout=TIMEOUT,
        )
        # Accept 200 or 404 if no OCCUPIED table exists (using any real table id)
        assert active_items_resp.status_code in (200, 404), (
            f"Unexpected status code {active_items_resp.status_code} "
            f"for /api/tables/{target_table_id}/active-items"
        )
        if active_items_resp.status_code == 200:
            try:
                active_items_json = active_items_resp.json()
            except Exception as e:
                assert False, f"Response from /api/tables/{target_table_id}/active-items is not valid JSON: {e}"
            # Expect JSON response with array or object type
            assert isinstance(active_items_json, (list, dict)), (
                f"Response JSON is not an array or object: {active_items_json}"
            )
    finally:
        session.close()


test_tables_get_active_items()