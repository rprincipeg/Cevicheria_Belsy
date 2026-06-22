import requests

BASE_URL = "http://localhost:3001"
LOGIN_ENDPOINT = f"{BASE_URL}/api/auth/login"
ORDERS_ENDPOINT = f"{BASE_URL}/api/orders"

def test_create_order_validation_error_rejected():
    # Step 1: Login as mesero/123456
    login_payload = {"username": "mesero", "password": "123456"}
    login_resp = requests.post(LOGIN_ENDPOINT, json=login_payload, timeout=30)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    token = login_data.get("token")
    assert token and isinstance(token, str), "Token missing or invalid in login response"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 2: Call POST /api/orders with invalid body (no tableId, empty items array)
    invalid_order_payload = {
        "isTakeaway": False,
        "items": []
    }
    order_resp = requests.post(ORDERS_ENDPOINT, json=invalid_order_payload, headers=headers, timeout=30)
    
    # Step 3: Assert HTTP 400 and response contains 'error' field in JSON
    assert order_resp.status_code == 400, f"Expected 400 but got {order_resp.status_code}"
    resp_json = order_resp.json()
    assert isinstance(resp_json, dict), f"Response is not a JSON object: {order_resp.text}"
    assert "error" in resp_json, f"'error' field not found in response: {resp_json}"

test_create_order_validation_error_rejected()