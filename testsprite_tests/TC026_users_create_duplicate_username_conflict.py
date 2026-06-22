import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_users_create_duplicate_username_conflict():
    # Step 1: Login as admin to get token
    login_payload = {"username": "admin", "password": "12345"}
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    login_data = login_resp.json()
    token = login_data.get("token")
    assert token and isinstance(token, str) and token.strip() != "", "Token missing or empty in login response"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 2: Attempt to create a user with username 'admin' which already exists
    duplicate_user_payload = {
        "fullName": "Dup User",
        "username": "admin",
        "password": "123456",
        "role": "MESERO"
    }
    create_resp = requests.post(f"{BASE_URL}/api/users", json=duplicate_user_payload, headers=headers, timeout=TIMEOUT)
    
    # Expecting 409 Conflict and JSON body with 'error' field
    assert create_resp.status_code == 409, f"Expected 409 Conflict, got {create_resp.status_code}"
    try:
        resp_json = create_resp.json()
    except Exception:
        assert False, "Response is not valid JSON"
    assert "error" in resp_json and isinstance(resp_json["error"], str) and resp_json["error"].strip() != "", "'error' field missing or empty in response"

test_users_create_duplicate_username_conflict()