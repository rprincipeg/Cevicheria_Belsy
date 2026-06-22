import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_menu_get_categories_as_mesero():
    login_url = f"{BASE_URL}/api/auth/login"
    categories_url = f"{BASE_URL}/api/menu/categories"
    login_payload = {"username": "mesero", "password": "123456"}

    # Step 1: Login as mesero to get token
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert isinstance(token, str) and token, "Token missing or empty in login response"
        assert login_data.get("role") == "MESERO", "Role is not MESERO"
        assert login_data.get("username") == "mesero", "Username mismatch"

        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: GET /api/menu/categories with mesero token
        categories_resp = requests.get(categories_url, headers=headers, timeout=TIMEOUT)
        assert categories_resp.status_code == 200, f"GET categories failed with status {categories_resp.status_code}"

        categories_data = categories_resp.json()
        assert isinstance(categories_data, list), "Categories response is not a list"

        # Check each category has 'items' array and each item has required fields
        for category in categories_data:
            assert "items" in category, "Category missing 'items' field"
            items = category["items"]
            assert isinstance(items, list), "'items' field is not a list"
            for item in items:
                for field in ("id", "name", "price", "isPreparable", "stockStatus"):
                    assert field in item, f"Menu item missing '{field}' field"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_menu_get_categories_as_mesero()