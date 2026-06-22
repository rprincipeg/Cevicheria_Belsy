import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_reports_closures_list_as_admin():
    login_url = f"{BASE_URL}/api/auth/login"
    closures_url = f"{BASE_URL}/api/reports/closures"

    # Step 1: Login as admin
    login_payload = {"username": "admin", "password": "12345"}
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_json = login_resp.json()
        token = login_json.get("token")
        role = login_json.get("role")
        username = login_json.get("username")
        assert token and isinstance(token, str) and token.strip() != "", "Token is missing or empty"
        assert role == "ADMIN", f"Expected role 'ADMIN', got {role}"
        assert username == "admin", f"Expected username 'admin', got {username}"

        # Step 2: GET /api/reports/closures with Authorization header
        headers = {"Authorization": f"Bearer {token}"}
        closures_resp = requests.get(closures_url, headers=headers, timeout=TIMEOUT)
        assert closures_resp.status_code == 200, f"GET closures failed with status {closures_resp.status_code}"
        
        closures_json = closures_resp.json()
        assert isinstance(closures_json, list), f"Expected a JSON array, got {type(closures_json)}"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_reports_closures_list_as_admin()