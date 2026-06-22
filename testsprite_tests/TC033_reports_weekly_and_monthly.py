import requests

BASE_URL = "http://localhost:3001"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
WEEKLY_REPORT_URL = f"{BASE_URL}/api/reports/weekly"
MONTHLY_REPORT_URL = f"{BASE_URL}/api/reports/monthly"
TIMEOUT = 30

def test_reports_weekly_and_monthly():
    # Step 1: Login with admin credentials
    login_payload = {"username": "admin", "password": "12345"}
    login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    login_data = login_resp.json()
    token = login_data.get("token")
    assert token and isinstance(token, str) and len(token) > 0, "Token missing or invalid in login response"
    assert login_data.get("role") == "ADMIN", f"Expected role ADMIN but got {login_data.get('role')}"
    assert login_data.get("username") == "admin", f"Expected username admin but got {login_data.get('username')}"

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: GET /api/reports/weekly
    weekly_resp = requests.get(WEEKLY_REPORT_URL, headers=headers, timeout=TIMEOUT)
    assert weekly_resp.status_code == 200, f"Weekly report request failed with status {weekly_resp.status_code}"
    weekly_data = weekly_resp.json()
    assert isinstance(weekly_data, dict), "Weekly report response is not a JSON object"

    # Step 3: GET /api/reports/monthly
    monthly_resp = requests.get(MONTHLY_REPORT_URL, headers=headers, timeout=TIMEOUT)
    assert monthly_resp.status_code == 200, f"Monthly report request failed with status {monthly_resp.status_code}"
    monthly_data = monthly_resp.json()
    assert isinstance(monthly_data, dict), "Monthly report response is not a JSON object"


test_reports_weekly_and_monthly()