import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_postapiauthlogoutwithvalidtoken():
    login_url = f"{BASE_URL}/api/auth/login"
    logout_url = f"{BASE_URL}/api/auth/logout"

    login_payload = {
        "username": "admin",
        "password": "12345"
    }
    headers = {"Content-Type": "application/json"}

    # Step 1: Login to obtain token
    try:
        login_resp = requests.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        role = login_data.get("role")
        username = login_data.get("username")
        assert token and isinstance(token, str) and token.strip() != "", "Token missing or empty"
        assert role == "ADMIN", f"Expected role 'ADMIN' but got '{role}'"
        assert username == "admin", f"Expected username 'admin' but got '{username}'"
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"
    except ValueError:
        assert False, f"Login response is not valid JSON"

    # Step 2: Logout using the token
    logout_headers = {
        "Authorization": f"Bearer {token}"
    }
    try:
        logout_resp = requests.post(logout_url, headers=logout_headers, timeout=TIMEOUT)
        assert logout_resp.status_code == 200, f"Logout failed with status {logout_resp.status_code}"
        logout_data = logout_resp.json()
        assert "message" in logout_data and isinstance(logout_data["message"], str) and logout_data["message"].strip() != "", \
            "Logout response missing or empty 'message' field"
    except requests.RequestException as e:
        assert False, f"Logout request failed: {e}"
    except ValueError:
        assert False, f"Logout response is not valid JSON"

test_postapiauthlogoutwithvalidtoken()