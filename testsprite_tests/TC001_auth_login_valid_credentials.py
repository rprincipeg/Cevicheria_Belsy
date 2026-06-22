import requests

BASE_URL = "http://localhost:3001"
LOGIN_ENDPOINT = "/api/auth/login"
TIMEOUT = 30

def test_auth_login_valid_credentials():
    url = BASE_URL + LOGIN_ENDPOINT
    payload = {
        "username": "admin",
        "password": "12345"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "token" in data, "Response JSON missing 'token'"
    assert isinstance(data["token"], str), "'token' is not a string"
    assert data["token"].strip() != "", "'token' is empty"
    assert "role" in data, "Response JSON missing 'role'"
    assert data["role"] == "ADMIN", f"Expected role 'ADMIN', got {data['role']}"
    assert "username" in data, "Response JSON missing 'username'"
    assert data["username"] == "admin", f"Expected username 'admin', got {data['username']}"

test_auth_login_valid_credentials()