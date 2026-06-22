import requests

BASE_URL = "http://localhost:3001"


def test_protected_route_without_token_rejected():
    try:
        response = requests.get(
            f"{BASE_URL}/api/tables",
            headers={},  # No Authorization header
            timeout=30
        )
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 401, f"Expected status code 401, got {response.status_code}"
    # Optionally verify response body has 'error' or similar message
    try:
        json_response = response.json()
    except ValueError:
        json_response = None

    assert json_response is not None, "Response is not a valid JSON"
    # Could check for some error indication in the body
    assert "error" in json_response or "message" in json_response or "Unauthorized" in response.text, \
        "Response body does not indicate authorization error"


test_protected_route_without_token_rejected()