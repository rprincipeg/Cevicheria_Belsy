import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_reports_dashboard_as_admin():
    login_url = f"{BASE_URL}/api/auth/login"
    dashboard_url = f"{BASE_URL}/api/reports/dashboard"

    # Step 1: Login as admin with correct credentials
    try:
        login_resp = requests.post(
            login_url,
            json={"username": "admin", "password": "12345"},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_json = login_resp.json()
        token = login_json.get("token")
        role = login_json.get("role")
        username = login_json.get("username")

        assert token and isinstance(token, str) and token.strip() != "", "Missing or empty token"
        assert role == "ADMIN", f"Expected role ADMIN but got {role}"
        assert username == "admin", f"Expected username admin but got {username}"

        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: GET /api/reports/dashboard with admin token
        dash_resp = requests.get(dashboard_url, headers=headers, timeout=TIMEOUT)
        assert dash_resp.status_code == 200, f"Dashboard request failed with status {dash_resp.status_code}"

        dash_json = dash_resp.json()
        assert isinstance(dash_json, dict), "Dashboard response is not a JSON object"
        assert 'totalSoldToday' in dash_json, "'totalSoldToday' not in dashboard response"
        assert 'lowStockAlerts' in dash_json, "'lowStockAlerts' not in dashboard response"

    except requests.RequestException as e:
        assert False, f"RequestException occurred: {e}"

test_reports_dashboard_as_admin()