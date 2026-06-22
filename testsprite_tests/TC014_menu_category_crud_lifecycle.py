import requests
import time

BASE_URL = "http://localhost:3001"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "12345"


def test_menu_category_crud_lifecycle():
    session = requests.Session()
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    timeout = 30

    # Step 1: Login admin to get token
    try:
        login_resp = session.post(login_url, json=login_payload, timeout=timeout)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_json = login_resp.json()
        token = login_json.get("token")
        assert isinstance(token, str) and token, "Token not found or empty"
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: POST /api/menu/admin/categories to create category
    timestamp = str(int(time.time()))
    category_name = f"QA_TEST_CAT_{timestamp}"
    create_url = f"{BASE_URL}/api/menu/admin/categories"
    create_payload = {"name": category_name, "sortOrder": 99}

    new_category_id = None
    try:
        create_resp = session.post(create_url, json=create_payload, headers=headers, timeout=timeout)
        assert create_resp.status_code in (200, 201), \
            f"Category creation failed with status {create_resp.status_code}"
        create_json = create_resp.json()
        # Expecting the response to include the created category with id; try common properties
        if isinstance(create_json, dict) and "id" in create_json:
            new_category_id = create_json["id"]
        else:
            # fallback: if response body is list or other shape, try to find id inside
            raise AssertionError("Created category ID not found in response")
        assert new_category_id, "Created category ID is empty or invalid"

        # Step 3: PATCH /api/menu/admin/categories/{id} to update name
        update_name = f"QA_TEST_CAT_UPD_{timestamp}"
        patch_url = f"{create_url}/{new_category_id}"
        patch_payload = {"name": update_name}
        patch_resp = session.patch(patch_url, json=patch_payload, headers=headers, timeout=timeout)
        assert patch_resp.status_code == 200, \
            f"Category update failed with status {patch_resp.status_code}"

    finally:
        # Step 4: DELETE /api/menu/admin/categories/{id} to clean up (if created)
        if new_category_id:
            delete_url = f"{create_url}/{new_category_id}"
            try:
                delete_resp = session.delete(delete_url, headers=headers, timeout=timeout)
                assert delete_resp.status_code in (200, 204), \
                    f"Category deletion failed with status {delete_resp.status_code}"
            except requests.RequestException as e:
                raise AssertionError(f"Category deletion request failed: {e}")


test_menu_category_crud_lifecycle()