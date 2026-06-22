import requests

BASE_URL = "http://localhost:3001"
LOGIN_ENDPOINT = "/api/auth/login"
MENU_CATEGORIES_ENDPOINT = "/api/menu/categories"
TIMEOUT = 30

def test_getmenucategorieswithmesero():
    login_payload = {
        "username": "mesero",
        "password": "123456"
    }
    try:
        # Login as mesero
        login_resp = requests.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        role = login_data.get("role")
        username = login_data.get("username")
        assert token and isinstance(token, str) and token.strip() != "", "Token is missing or empty"
        assert role == "MESERO", f"Role expected MESERO, got {role}"
        assert username == "mesero", f"Username expected 'mesero', got {username}"

        headers = {
            "Authorization": f"Bearer {token}"
        }

        # GET /api/menu/categories with Bearer token
        categories_resp = requests.get(
            BASE_URL + MENU_CATEGORIES_ENDPOINT,
            headers=headers,
            timeout=TIMEOUT
        )
        assert categories_resp.status_code == 200, f"GET /api/menu/categories failed with {categories_resp.status_code}"
        categories = categories_resp.json()
        assert isinstance(categories, list), "Response is not a JSON array"

        # Validate each category has 'items' array and each item has required fields
        for category in categories:
            assert "items" in category, "'items' field missing in category"
            items = category["items"]
            assert isinstance(items, list), "'items' field is not a list"
            for item in items:
                assert isinstance(item, dict), "Item is not an object"
                assert "id" in item, "Item missing 'id'"
                assert isinstance(item["id"], str), "'id' must be a string"
                assert "name" in item, "Item missing 'name'"
                assert isinstance(item["name"], str), "'name' must be a string"
                assert "price" in item, "Item missing 'price'"
                price = item["price"]
                # Accept price as number or string convertible to float
                if isinstance(price, str):
                    try:
                        float(price)
                    except ValueError:
                        assert False, "'price' string must represent a number"
                elif not isinstance(price, (int, float)):
                    assert False, "'price' must be a number or numeric string"
                assert "isPreparable" in item, "Item missing 'isPreparable'"
                assert isinstance(item["isPreparable"], bool), "'isPreparable' must be boolean"

    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_getmenucategorieswithmesero()
