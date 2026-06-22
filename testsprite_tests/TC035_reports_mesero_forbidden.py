import requests

BASE_URL = "http://localhost:3001"
LOGIN_PATH = "/api/auth/login"
REPORTS_DAILY_PATH = "/api/reports/daily"
TIMEOUT = 30

def test_reports_mesero_forbidden():
    # Step 1: Login as mesero/123456
    login_payload = {"username": "mesero", "password": "123456"}
    try:
        login_resp = requests.post(f"{BASE_URL}{LOGIN_PATH}", json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Expected 200 on login, got {login_resp.status_code}"
        login_data = login_resp.json()
        assert "token" in login_data and login_data["token"], "No token in login response"
        token = login_data["token"]
        assert login_data.get("role") == "MESERO", f"Expected role MESERO, got {login_data.get('role')}"
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: GET /api/reports/daily as MESERO - expect 403 Forbidden
    try:
        reports_resp = requests.get(f"{BASE_URL}{REPORTS_DAILY_PATH}", headers=headers, timeout=TIMEOUT)
        assert reports_resp.status_code == 403, f"Expected 403 Forbidden, got {reports_resp.status_code}"
    except requests.RequestException as e:
        assert False, f"Reports daily request failed: {e}"

test_reports_mesero_forbidden()