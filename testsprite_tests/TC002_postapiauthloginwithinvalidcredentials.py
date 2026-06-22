import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_postapiauthloginwithinvalidcredentials():
    url = f"{BASE_URL}/api/auth/login"
    payload = {
        "username": "admin",
        "password": "wrongpassword"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 401, f"Expected status code 401, got {response.status_code}"
    
    try:
        json_response = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "error" in json_response, "Response JSON should contain 'error' field"
    # Confirm no token returned
    assert "token" not in json_response, "Response should not contain 'token' field"

test_postapiauthloginwithinvalidcredentials()