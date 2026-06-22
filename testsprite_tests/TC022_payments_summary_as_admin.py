import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_payments_summary_as_admin():
    # Step 1: Login as admin
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {"username": "admin", "password": "12345"}
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Expected 200 on login but got {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        role = login_data.get("role")
        username = login_data.get("username")
        assert isinstance(token, str) and len(token) > 0, "Token missing or empty"
        assert role == "ADMIN", f"Expected role ADMIN but got {role}"
        assert username == "admin", f"Expected username admin but got {username}"
    except Exception as e:
        raise AssertionError(f"Login failed: {str(e)}")

    # Step 2: GET /api/payments/summary with admin token
    headers = {
        "Authorization": f"Bearer {token}"
    }
    payments_summary_url = f"{BASE_URL}/api/payments/summary"
    try:
        resp = requests.get(payments_summary_url, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 but got {resp.status_code}"
        data = resp.json()
        # Validate it has 'tables' array and 'takeaway' section
        assert isinstance(data, dict), "Response is not a JSON object"
        assert "tables" in data, "'tables' key missing in response"
        assert isinstance(data["tables"], list), "'tables' is not a list"
        assert "takeaway" in data, "'takeaway' key missing in response"
        # Optional further validation on tables and takeaway structure can be done if needed
    except Exception as e:
        raise AssertionError(f"Payment summary request failed: {str(e)}")

test_payments_summary_as_admin()