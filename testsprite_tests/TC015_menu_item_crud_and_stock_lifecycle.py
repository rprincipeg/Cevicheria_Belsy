import requests
import time

BASE_URL = "http://localhost:3001"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "12345"
TIMEOUT = 30

def test_menu_item_crud_and_stock_lifecycle():
    token = None
    category_id = None
    item_id = None

    try:
        # Step 0: Login admin/12345
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get('token')
        assert token and isinstance(token, str), "Missing or invalid token in login response"
        assert login_data.get('role') == 'ADMIN', f"Expected role ADMIN but got {login_data.get('role')}"
        headers = {"Authorization": f"Bearer {token}"}

        timestamp = str(int(time.time()))

        # Step 1: POST /api/menu/admin/categories {name:'QA_TEST_CAT_ITEM_'+<timestamp>, sortOrder:98}
        category_payload = {"name": f"QA_TEST_CAT_ITEM_{timestamp}", "sortOrder": 98}
        category_resp = requests.post(
            f"{BASE_URL}/api/menu/admin/categories",
            json=category_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert category_resp.status_code in (200, 201), f"Category creation failed with status {category_resp.status_code}"
        category_data = category_resp.json()
        category_id = category_data.get('id')
        assert category_id is not None, "No category id returned"

        # Step 2: POST /api/menu/admin/items {name:'QA_TEST_ITEM_'+<timestamp>, price:12.5, categoryId, isPreparable:true}
        item_payload = {
            "name": f"QA_TEST_ITEM_{timestamp}",
            "price": 12.5,
            "categoryId": category_id,
            "isPreparable": True
        }
        item_resp = requests.post(
            f"{BASE_URL}/api/menu/admin/items",
            json=item_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert item_resp.status_code in (200, 201), f"Item creation failed with status {item_resp.status_code}"
        item_data = item_resp.json()
        item_id = item_data.get('id')
        assert item_id is not None, "No item id returned"

        # Step 3: PATCH /api/menu/admin/items/{id} {price:15}
        patch_item_payload = {"price": 15}
        patch_item_resp = requests.patch(
            f"{BASE_URL}/api/menu/admin/items/{item_id}",
            json=patch_item_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert patch_item_resp.status_code == 200, f"Item update failed with status {patch_item_resp.status_code}"

        # Step 4: PATCH /api/menu/admin/items/{id}/stock {stockStatus:'OUT_OF_STOCK'}
        patch_stock_payload = {"stockStatus": "OUT_OF_STOCK"}
        patch_stock_resp = requests.patch(
            f"{BASE_URL}/api/menu/admin/items/{item_id}/stock",
            json=patch_stock_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert patch_stock_resp.status_code == 200, f"Item stock update failed with status {patch_stock_resp.status_code}"

    finally:
        # Step 5: DELETE /api/menu/admin/items/{id}
        if item_id is not None and token is not None:
            try:
                del_item_resp = requests.delete(
                    f"{BASE_URL}/api/menu/admin/items/{item_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=TIMEOUT
                )
                assert del_item_resp.status_code in (200, 204), f"Item deletion failed with status {del_item_resp.status_code}"
            except Exception as e:
                print(f"Error during item deletion cleanup: {e}")

        # Step 6: DELETE /api/menu/admin/categories/{categoryId}
        if category_id is not None and token is not None:
            try:
                del_cat_resp = requests.delete(
                    f"{BASE_URL}/api/menu/admin/categories/{category_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=TIMEOUT
                )
                assert del_cat_resp.status_code in (200, 204), f"Category deletion failed with status {del_cat_resp.status_code}"
            except Exception as e:
                print(f"Error during category deletion cleanup: {e}")

test_menu_item_crud_and_stock_lifecycle()