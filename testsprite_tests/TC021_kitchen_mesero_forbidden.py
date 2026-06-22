import requests

BASE_URL = "http://localhost:3001"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
KITCHEN_ORDERS_URL = f"{BASE_URL}/api/kitchen/orders"
TIMEOUT = 30

def test_kitchen_mesero_forbidden():
    # Login mesero user
    login_payload = {"username": "mesero", "password": "123456"}
    try:
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        login_resp.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    login_data = login_resp.json()
    assert "token" in login_data and isinstance(login_data["token"], str) and len(login_data["token"]) > 0
    assert login_data.get("role") == "MESERO"
    assert login_data.get("username") == "mesero"

    token = login_data["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to GET /api/kitchen/orders as MESERO (should get 403 Forbidden)
    try:
        kitchen_resp = requests.get(KITCHEN_ORDERS_URL, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Kitchen orders request failed: {e}"

    # Validate status code 403 Forbidden
    assert kitchen_resp.status_code == 403

test_kitchen_mesero_forbidden()