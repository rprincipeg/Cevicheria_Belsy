import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_menu_item_create_validation_error():
    login_url = f"{BASE_URL}/api/auth/login"
    create_item_url = f"{BASE_URL}/api/menu/admin/items"

    # Step 1: Login as admin
    login_payload = {
        "username": "admin",
        "password": "12345"
    }
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert token, "No token returned from login"
        assert login_data.get("role") == "ADMIN", "Logged in user is not ADMIN"
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 2: Attempt to create menu item with invalid data
    bad_item_payload = {
        "name": "QA_BAD",
        "price": -5,
        "categoryId": "nonexistent"
    }

    try:
        create_resp = requests.post(create_item_url, json=bad_item_payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Create menu item request failed: {e}"

    # Step 3: Validate that status code is 400 or 404 and NOT 200 or 201
    assert create_resp.status_code in (400,404), f"Expected 400 or 404 but got {create_resp.status_code}"

test_menu_item_create_validation_error()