import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_auth_login_invalid_credentials():
    url = f"{BASE_URL}/api/auth/login"
    payload = {
        "username": "admin",
        "password": "wrongpass"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 401, f"Expected status code 401, got {response.status_code}"

    try:
        resp_json = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Must have 'error' field in JSON
    assert "error" in resp_json, "'error' field missing in response JSON"

    # Must NOT have 'token' field
    assert "token" not in resp_json, "Unexpected 'token' field in response for invalid credentials"

test_auth_login_invalid_credentials()