import requests
from datetime import datetime

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_reports_daily_as_admin():
    # Step 1: Login as admin
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {"username": "admin", "password": "12345"}
    try:
        login_response = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
        login_json = login_response.json()
        token = login_json.get("token")
        role = login_json.get("role")
        username = login_json.get("username")
        assert token and isinstance(token, str) and len(token) > 0, "Token missing or empty"
        assert role == "ADMIN", f"Expected role ADMIN but got {role}"
        assert username == "admin", f"Expected username admin but got {username}"

        # Step 2: GET /api/reports/daily optionally with today's date query param
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        headers = {"Authorization": f"Bearer {token}"}
        reports_url = f"{BASE_URL}/api/reports/daily?date={today_str}"
        reports_response = requests.get(reports_url, headers=headers, timeout=TIMEOUT)
        assert reports_response.status_code == 200, f"Reports daily failed with status {reports_response.status_code}"
        reports_json = reports_response.json()
        assert isinstance(reports_json, dict), "Response is not a JSON object"
        # Check presence of required keys and their reasonable types
        assert "totalSales" in reports_json, "'totalSales' missing in response"
        assert isinstance(reports_json["totalSales"], (int, float)), "'totalSales' is not a number"
        assert "totalOrders" in reports_json, "'totalOrders' missing in response"
        assert isinstance(reports_json["totalOrders"], int), "'totalOrders' is not an integer"
        assert "topItems" in reports_json, "'topItems' missing in response"
        assert isinstance(reports_json["topItems"], list), "'topItems' is not a list"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Test failed: {e}")

test_reports_daily_as_admin()