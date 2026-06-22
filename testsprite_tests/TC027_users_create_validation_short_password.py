import requests
import time

BASE_URL = "http://localhost:3001"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
USERS_URL = f"{BASE_URL}/api/users"
TIMEOUT = 30

def test_users_create_validation_short_password():
    # Step 1: Login as admin/12345 to get JWT token
    login_payload = {"username": "admin", "password": "12345"}
    login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_json = login_resp.json()
    assert "token" in login_json and login_json["token"], "No token returned in login"
    token = login_json["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: Attempt to create user with short password (3 chars)
    timestamp = str(int(time.time() * 1000))
    user_payload = {
        "fullName": "Bad",
        "username": f"qa_bad_{timestamp}",
        "password": "123",
        "role": "MESERO"
    }
    resp = requests.post(USERS_URL, json=user_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 400, f"Expected 400 Bad Request for short password but got {resp.status_code}"
    try:
        resp_json = resp.json()
    except Exception:
        assert False, "Response is not JSON as expected for error"
    assert "error" in resp_json, "Response JSON does not contain 'error' field"

test_users_create_validation_short_password()