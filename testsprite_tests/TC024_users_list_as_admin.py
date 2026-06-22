import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_users_list_as_admin():
    login_url = f"{BASE_URL}/api/auth/login"
    users_url = f"{BASE_URL}/api/users"
    
    # Step 1: Login as admin to get JWT token
    login_payload = {
        "username": "admin",
        "password": "12345"
    }
    try:
        login_response = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Expected 200 on login, got {login_response.status_code}"
        login_data = login_response.json()
        token = login_data.get("token")
        role = login_data.get("role")
        username = login_data.get("username")
        assert isinstance(token, str) and token, "Token is missing or empty"
        assert role == "ADMIN", f"Expected role 'ADMIN', got '{role}'"
        assert username == "admin", f"Expected username 'admin', got '{username}'"
    except Exception as e:
        raise AssertionError(f"Login failed: {e}")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Step 2: GET /api/users to list users
    try:
        users_response = requests.get(users_url, headers=headers, timeout=TIMEOUT)
        assert users_response.status_code == 200, f"Expected 200 on users list, got {users_response.status_code}"
        users_data = users_response.json()
        assert isinstance(users_data, list), f"Expected list of users, got {type(users_data)}"
        
        for user in users_data:
            # Check required keys in each user
            assert isinstance(user, dict), "User entry is not a dict"
            expected_keys = {"id", "username", "role", "status"}
            user_keys = set(user.keys())
            # The user dict must contain exactly at least these keys (may have more except passwordHash)
            for key in expected_keys:
                assert key in user_keys, f"User missing key '{key}'"
            # No 'passwordHash' field exposed
            assert "passwordHash" not in user_keys, "User exposes 'passwordHash' field"
            # None has role 'ADMIN'
            user_role = user.get("role")
            assert user_role != "ADMIN", "User has role 'ADMIN' which is forbidden in this listing"
    except Exception as e:
        raise AssertionError(f"Failed to validate users list: {e}")

test_users_list_as_admin()