import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_menu_mesero_cannot_create_category():
    login_url = f"{BASE_URL}/api/auth/login"
    create_category_url = f"{BASE_URL}/api/menu/admin/categories"

    # Login as mesero user with exact credentials 'mesero' / '123456'
    login_payload = {
        "username": "mesero",
        "password": "123456"
    }
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Expected 200 on login, got {login_resp.status_code}"
        token = login_resp.json().get("token")
        assert isinstance(token, str) and token, "Token missing or empty in login response"
    except Exception as e:
        raise AssertionError(f"Login step failed: {e}")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Attempt to create a category as mesero - expect 403 forbidden
    create_payload = {
        "name": "QA_FORBIDDEN"
    }
    try:
        create_resp = requests.post(create_category_url, json=create_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 403, \
            f"Expected status code 403 Forbidden, got {create_resp.status_code}"
    except requests.RequestException as e:
        raise AssertionError(f"Request to create category failed: {e}")

test_menu_mesero_cannot_create_category()