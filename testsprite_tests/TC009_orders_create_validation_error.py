import requests

BASE_URL = "http://localhost:3001"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
ORDERS_URL = f"{BASE_URL}/api/orders"

def test_orders_create_validation_error():
    try:
        # Step 1: Login as mesero with exact credentials
        login_payload = {"username": "mesero", "password": "123456"}
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=30)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert token and isinstance(token, str), "Missing or invalid token"
        assert login_data.get("role") == "MESERO", "Role is not MESERO"

        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: POST /api/orders with invalid payload (empty items, no tableId)
        invalid_order_payload = {
            "isTakeaway": False,
            "items": []
            # no tableId intentionally
        }
        order_resp = requests.post(ORDERS_URL, json=invalid_order_payload, headers=headers, timeout=30)

        assert order_resp.status_code == 400, f"Expected 400 but got {order_resp.status_code}: {order_resp.text}"
        error_json = order_resp.json()
        assert isinstance(error_json, dict), "Response is not a JSON object"
        assert "error" in error_json, "Response JSON does not contain 'error' field"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_orders_create_validation_error()