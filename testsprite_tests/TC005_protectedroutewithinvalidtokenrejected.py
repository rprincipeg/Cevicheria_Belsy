import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_protectedroutewithinvalidtokenrejected():
    url = f"{BASE_URL}/api/tables"
    headers = {"Authorization": "Bearer invalid.token.value"}

    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

    assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"
    # Optionally check response body for an error message
    try:
        body = response.json()
        assert "error" in body or "message" in body, "Response JSON should contain 'error' or 'message' field"
    except ValueError:
        # If not JSON, ignore check
        pass

test_protectedroutewithinvalidtokenrejected()