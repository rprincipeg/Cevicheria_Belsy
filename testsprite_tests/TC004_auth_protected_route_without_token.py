import requests

BASE_URL = "http://localhost:3001"

def test_auth_protected_route_without_token():
    url = f"{BASE_URL}/api/tables"
    try:
        response = requests.get(url, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"
    assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"

test_auth_protected_route_without_token()