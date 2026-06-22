import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_orders_get_active_list():
    login_url = f"{BASE_URL}/api/auth/login"
    orders_active_url = f"{BASE_URL}/api/orders/active"
    
    # Step 1: Login mesero/123456 to get token
    login_payload = {
        "username": "mesero",
        "password": "123456"
    }
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_json = login_resp.json()
        token = login_json.get("token")
        role = login_json.get("role")
        username = login_json.get("username")
        assert isinstance(token, str) and len(token) > 0, "Token missing or empty"
        assert role == "MESERO", f"Role expected MESERO but got {role}"
        assert username == "mesero", f"Username expected 'mesero' but got {username}"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Login step failed: {e}")

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Step 2: GET /api/orders/active
    try:
        resp = requests.get(orders_active_url, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK but got {resp.status_code}"
        json_data = resp.json()
        assert isinstance(json_data, list), f"Response expected to be a JSON array but got {type(json_data)}"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"GET /api/orders/active failed: {e}")

test_orders_get_active_list()