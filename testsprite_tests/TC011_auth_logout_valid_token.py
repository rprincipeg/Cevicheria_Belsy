import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_auth_logout_valid_token():
    login_url = f"{BASE_URL}/api/auth/login"
    logout_url = f"{BASE_URL}/api/auth/logout"
    
    # Login payload for admin
    login_payload = {
        "username": "admin",
        "password": "12345"
    }
    
    try:
        # Step 1: Perform login
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert token and isinstance(token, str) and len(token) > 0, "Token missing or invalid"
        assert login_data.get("role") == "ADMIN", f"Expected role 'ADMIN', got {login_data.get('role')}"
        assert login_data.get("username") == "admin", f"Expected username 'admin', got {login_data.get('username')}"
        
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        # Step 2: Call logout endpoint with auth header
        logout_resp = requests.post(logout_url, headers=headers, timeout=TIMEOUT)
        assert logout_resp.status_code == 200, f"Logout failed with status {logout_resp.status_code}"
        
        logout_data = logout_resp.json()
        assert "message" in logout_data, "'message' field missing in logout response"
        assert isinstance(logout_data["message"], str) and logout_data["message"], "'message' field empty or invalid"
        
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_auth_logout_valid_token()