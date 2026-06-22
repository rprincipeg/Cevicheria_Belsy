import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_auth_login_missing_fields():
    url = f"{BASE_URL}/api/auth/login"
    headers = {"Content-Type": "application/json"}
    payload = {}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 400, f"Expected status 400, got {response.status_code}"
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "error" in json_data, "'error' field missing in response JSON"

test_auth_login_missing_fields()