import requests
import time

BASE_URL = "http://localhost:3001"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
USERS_URL = f"{BASE_URL}/api/users"
TIMEOUT = 30

def test_users_crud_lifecycle():
    # Step 0: Login as admin/12345
    login_payload = {"username": "admin", "password": "12345"}
    login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    assert "token" in login_data and login_data["token"], "No token in login response"
    token = login_data["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Prepare username with timestamp
    timestamp = str(int(time.time()))
    new_username = f"qa_test_{timestamp}"
    new_user_payload = {
        "fullName": "QA Tester",
        "username": new_username,
        "password": "123456",
        "role": "MESERO"
    }

    created_user_id = None

    try:
        # Step 1: POST /api/users to create user
        create_resp = requests.post(USERS_URL, json=new_user_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"User creation expected 201, got {create_resp.status_code}: {create_resp.text}"
        create_data = create_resp.json()
        assert "id" in create_data and create_data["id"], "Created user response missing id"
        assert "username" in create_data and create_data["username"] == new_username, "Created username does not match"
        created_user_id = create_data["id"]

        # Step 2: PATCH /api/users/{id} {fullName:'QA Tester Updated'}
        patch_url = f"{USERS_URL}/{created_user_id}"
        patch_payload = {"fullName": "QA Tester Updated"}
        patch_resp = requests.patch(patch_url, json=patch_payload, headers=headers, timeout=TIMEOUT)
        assert patch_resp.status_code == 200, f"User update expected 200, got {patch_resp.status_code}: {patch_resp.text}"

        # Step 3: PATCH /api/users/{id}/status {status:'INACTIVE'}
        status_url = f"{USERS_URL}/{created_user_id}/status"
        status_payload = {"status": "INACTIVE"}
        status_resp = requests.patch(status_url, json=status_payload, headers=headers, timeout=TIMEOUT)
        assert status_resp.status_code == 200, f"User status update expected 200, got {status_resp.status_code}: {status_resp.text}"

    finally:
        # Cleanup: no delete endpoint => deactivate is cleanup, already done
        pass

test_users_crud_lifecycle()