import requests

BASE_URL = "http://localhost:3001"

def test_menu_admin_list_categories():
    # Step 1: Login as admin
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "username": "admin",
        "password": "12345"
    }
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=30)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert token and isinstance(token, str) and token.strip() != "", "Token missing or empty in login response"
        assert login_data.get("role") == "ADMIN", "Role is not ADMIN"
        assert login_data.get("username") == "admin", "Username in response does not match admin"
    except Exception as e:
        raise AssertionError(f"Login request failed: {e}")

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Step 2: GET /api/menu/admin/categories
    categories_url = f"{BASE_URL}/api/menu/admin/categories"
    try:
        resp = requests.get(categories_url, headers=headers, timeout=30)
    except Exception as e:
        raise AssertionError(f"GET /api/menu/admin/categories request failed: {e}")

    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"

    try:
        categories = resp.json()
    except Exception as e:
        raise AssertionError(f"Response is not valid JSON: {e}")

    assert isinstance(categories, list), "Response JSON is not a list"

    for category in categories:
        assert isinstance(category, dict), "Category entry is not an object"
        assert "items" in category, "Category missing 'items' field"
        items = category["items"]
        assert isinstance(items, list), "'items' field is not a list"
        # No other specific item schema required, just that 'items' is an array

# Execute the test function
test_menu_admin_list_categories()