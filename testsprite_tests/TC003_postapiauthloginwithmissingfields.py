import requests

BASE_URL = "http://localhost:3001"
LOGIN_ENDPOINT = "/api/auth/login"
TIMEOUT = 30

def test_postapiauthloginwithmissingfields():
    url = BASE_URL + LOGIN_ENDPOINT
    headers = {"Content-Type": "application/json"}
    payload = {}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 400, f"Expected status code 400, got {response.status_code}"
    try:
        json_response = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(json_response, dict), "Response JSON is not an object"
    assert "error" in json_response, "Response JSON does not contain 'error' field"

test_postapiauthloginwithmissingfields()