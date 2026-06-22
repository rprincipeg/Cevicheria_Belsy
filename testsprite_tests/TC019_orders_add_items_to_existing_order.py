import requests

base_url = "http://localhost:3001"
timeout = 30

def login(username: str, password: str):
    url = f"{base_url}/api/auth/login"
    payload = {"username": username, "password": password}
    resp = requests.post(url, json=payload, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    assert "token" in data and data["token"], "Login response missing token"
    return data["token"]

def test_orders_add_items_to_existing_order():
    # Login as mesero and cocinero
    mesero_token = login("mesero", "123456")
    cocinero_token = login("cocinero", "123456")

    headers_mesero = {"Authorization": f"Bearer {mesero_token}"}
    headers_cocinero = {"Authorization": f"Bearer {cocinero_token}"}

    order_id = None

    # Step 1: GET /api/tables pick a FREE table (skip gracefully if none)
    try:
        tables_resp = requests.get(f"{base_url}/api/tables", headers=headers_mesero, timeout=timeout)
        tables_resp.raise_for_status()
        tables = tables_resp.json()
        free_table = None
        for table in tables:
            # Validate real tables have 'number' field
            if "number" in table and table.get("status") == "FREE":
                free_table = table
                break
        if free_table is None:
            # No FREE table found, skip rest gracefully by exiting test
            return
        tableId = free_table["id"]

        # Step 2: GET /api/menu/categories, pick a preparable item id
        menu_resp = requests.get(f"{base_url}/api/menu/categories", headers=headers_mesero, timeout=timeout)
        menu_resp.raise_for_status()
        menu_categories = menu_resp.json()

        preparable_item_id = None
        for category in menu_categories:
            items = category.get("items", [])
            for item in items:
                if item.get("isPreparable") is True and "id" in item:
                    preparable_item_id = item["id"]
                    break
            if preparable_item_id:
                break
        if not preparable_item_id:
            # No preparable items found, skip test gracefully
            return

        # Step 3: POST /api/orders {tableId, isTakeaway:false, items:[{menuItemId, quantity:1}]} -> capture orderId
        order_payload = {
            "tableId": tableId,
            "isTakeaway": False,
            "items": [{"menuItemId": preparable_item_id, "quantity": 1}]
        }
        create_order_resp = requests.post(f"{base_url}/api/orders", json=order_payload, headers=headers_mesero, timeout=timeout)
        assert create_order_resp.status_code in (200, 201), f"Unexpected status creating order: {create_order_resp.status_code}"
        create_order_json = create_order_resp.json()
        order_id = create_order_json.get("id")
        assert order_id is not None, "Created order response missing 'id'"

        # Step 4: POST /api/orders/{orderId}/items {items:[{menuItemId, quantity:1}]} -> expect 200/201
        add_items_payload = {"items": [{"menuItemId": preparable_item_id, "quantity": 1}]}
        add_items_resp = requests.post(f"{base_url}/api/orders/{order_id}/items", json=add_items_payload, headers=headers_mesero, timeout=timeout)
        assert add_items_resp.status_code in (200, 201), f"Unexpected status adding items to order: {add_items_resp.status_code}"

        # Step 5: GET /api/orders/{orderId} -> expect 200 and reflects more than one item
        get_order_resp = requests.get(f"{base_url}/api/orders/{order_id}", headers=headers_mesero, timeout=timeout)
        get_order_resp.raise_for_status()
        order_data = get_order_resp.json()
        order_items = order_data.get("items", [])
        # Confirm more than one item now
        assert len(order_items) > 1, f"Order items count expected > 1 but got {len(order_items)}"

    finally:
        # No documented cleanup (no delete), leaving open order is acceptable per instructions
        pass

test_orders_add_items_to_existing_order()