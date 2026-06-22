import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_role_authorization_mesero_cannot_access_admin_route():
    login_url = f"{BASE_URL}/api/auth/login"
    users_url = f"{BASE_URL}/api/users"

    # Step 1: Login as MESERO to obtain token
    login_payload = {"username": "mesero", "password": "123456"}
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Expected 200 on MESERO login, got {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        role = login_data.get("role")
        username = login_data.get("username")
        assert isinstance(token, str) and token, "Empty or missing token"
        assert role == "MESERO", f"Expected role MESERO, got {role}"
        assert username == "mesero", f"Expected username mesero, got {username}"

        # Step 2: Call GET /api/users with MESERO token (ADMIN-only route)
        headers = {"Authorization": f"Bearer {token}"}
        users_resp = requests.get(users_url, headers=headers, timeout=TIMEOUT)

        # Expect HTTP 403 Forbidden because MESERO lacks ADMIN privileges
        assert users_resp.status_code == 403, f"Expected 403 Forbidden, got {users_resp.status_code}"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_role_authorization_mesero_cannot_access_admin_route()