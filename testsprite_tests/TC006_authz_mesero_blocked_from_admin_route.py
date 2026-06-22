import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_authz_mesero_blocked_from_admin_route():
    login_url = f"{BASE_URL}/api/auth/login"
    users_url = f"{BASE_URL}/api/users"
    headers = {"Content-Type": "application/json"}

    # Login as mesero with correct credentials
    login_payload = {"username": "mesero", "password": "123456"}
    try:
        login_resp = requests.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Expected 200 on login, got {login_resp.status_code}"
        login_data = login_resp.json()
        assert "token" in login_data and isinstance(login_data["token"], str) and login_data["token"], "Missing or empty token"
        assert login_data.get("role") == "MESERO", f"Expected role 'MESERO', got {login_data.get('role')}"
        token = login_data["token"]
    except Exception as e:
        raise AssertionError(f"Login request failed or assertion failed: {e}")

    # Attempt to access ADMIN-only /api/users route with MESERO token
    auth_headers = {
        "Authorization": f"Bearer {token}"
    }
    try:
        users_resp = requests.get(users_url, headers=auth_headers, timeout=TIMEOUT)
        assert users_resp.status_code == 403, f"Expected 403 Forbidden on /api/users for MESERO role, got {users_resp.status_code}"
    except requests.RequestException as e:
        raise AssertionError(f"Request to /api/users failed: {e}")

test_authz_mesero_blocked_from_admin_route()