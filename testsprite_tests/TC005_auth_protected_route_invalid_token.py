import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_auth_protected_route_invalid_token():
    url = f"{BASE_URL}/api/tables"
    headers = {
        "Authorization": "Bearer invalid.token.value"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        # The request is expected to be unauthorized with 401
        assert response.status_code == 401, f"Expected status 401 but got {response.status_code}"
        # Optionally check for error message presence
        try:
            data = response.json()
            assert "error" in data or "message" in data
        except Exception:
            # If response is not JSON, just pass
            pass
    except requests.RequestException as e:
        assert False, f"Request failed: {str(e)}"

test_auth_protected_route_invalid_token()