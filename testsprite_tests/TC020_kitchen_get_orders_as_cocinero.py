import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_kitchen_get_orders_as_cocinero():
    login_url = f"{BASE_URL}/api/auth/login"
    kitchen_orders_url = f"{BASE_URL}/api/kitchen/orders"

    # Step 1: Login with cocinero/123456
    login_payload = {"username": "cocinero", "password": "123456"}
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        role = login_data.get("role")
        username = login_data.get("username")
        assert isinstance(token, str) and len(token) > 0, "Token missing or empty"
        assert role == "COCINERO", f"Expected role COCINERO but got {role}"
        assert username == "cocinero", f"Expected username 'cocinero' but got {username}"
    except Exception as e:
        raise AssertionError(f"Login request failed or invalid response: {e}")

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: GET /api/kitchen/orders
    try:
        resp = requests.get(kitchen_orders_url, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 but got {resp.status_code}"
        orders = resp.json()
        assert isinstance(orders, list), f"Expected a JSON array but got {type(orders)}"
        # If non-empty, each order has 'id' and an 'items' array
        if len(orders) > 0:
            for order in orders:
                assert isinstance(order, dict), "Order is not a JSON object"
                assert "id" in order, "Order missing 'id'"
                assert "items" in order, "Order missing 'items' array"
                assert isinstance(order["items"], list), "'items' is not an array"
    except Exception as e:
        raise AssertionError(f"GET /api/kitchen/orders failed or invalid response: {e}")

test_kitchen_get_orders_as_cocinero()