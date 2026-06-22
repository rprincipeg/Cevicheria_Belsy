import requests

base_url = "http://localhost:3001"
timeout = 30


def test_payments_bill_no_active_orders_404():
    session = requests.Session()

    # Step 1: Login admin/12345 to get token
    login_payload = {"username": "admin", "password": "12345"}
    login_resp = session.post(f"{base_url}/api/auth/login", json=login_payload, timeout=timeout)
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    login_json = login_resp.json()
    token = login_json.get("token")
    assert token and isinstance(token, str) and token != "", "Token missing or invalid"
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Step 2: GET /api/tables, find a table whose status=='FREE' and has a 'number' field
    tables_resp = session.get(f"{base_url}/api/tables", headers=auth_headers, timeout=timeout)
    assert tables_resp.status_code == 200, f"GET /api/tables failed with status {tables_resp.status_code}"
    tables = tables_resp.json()
    assert isinstance(tables, list), "Tables response is not a list"
    free_table_id = None
    for t in tables:
        if not isinstance(t, dict):
            continue
        if 'number' in t and t.get('status') == 'FREE':
            free_table_id = t.get('id')
            break
    assert free_table_id is not None, "No table with status=='FREE' found"

    # Step 3: GET /api/payments/tables/{id}/bill, expect 404 with JSON error field 'No hay pedidos activos en esta mesa'
    bill_resp = session.get(f"{base_url}/api/payments/tables/{free_table_id}/bill", headers=auth_headers, timeout=timeout)
    assert bill_resp.status_code == 404, f"Expected 404 for table bill but got {bill_resp.status_code}"
    try:
        bill_json = bill_resp.json()
    except Exception:
        assert False, "Response is not valid JSON"
    error_msg = bill_json.get("error")
    assert error_msg == "No hay pedidos activos en esta mesa", f"Unexpected error message: {error_msg}"


test_payments_bill_no_active_orders_404()