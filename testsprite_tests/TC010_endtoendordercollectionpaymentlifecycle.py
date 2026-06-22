import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def login(username, password):
    url = f"{BASE_URL}/api/auth/login"
    payload = {"username": username, "password": password}
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Login failed for {username}: {resp.text}"
    data = resp.json()
    assert "token" in data and "role" in data and "username" in data
    return data["token"]

def endtoendordercollectionpaymentlifecycle():
    # Step 1: Login all three users
    mesero_token = login("mesero", "123456")
    cocinero_token = login("cocinero", "123456")
    admin_token = login("admin", "123456")

    headers_mesero = {"Authorization": f"Bearer {mesero_token}"}
    headers_cocinero = {"Authorization": f"Bearer {cocinero_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # Step 2: GET /api/tables as MESERO and pick a table with status 'FREE'
    tables_resp = requests.get(f"{BASE_URL}/api/tables", headers=headers_mesero, timeout=TIMEOUT)
    assert tables_resp.status_code == 200, f"GET /api/tables failed: {tables_resp.text}"
    tables = tables_resp.json()
    free_tables = [t for t in tables if t.get("status") == "FREE" and isinstance(t.get("id"), (int, float))]
    if not free_tables:
        print("No FREE table available, skipping test gracefully.")
        return  # skip test gracefully if no free table
    table = free_tables[0]
    tableId = table["id"]

    # Step 3: GET /api/menu/categories as MESERO and pick one menu item with isPreparable = true
    menu_cats_resp = requests.get(f"{BASE_URL}/api/menu/categories", headers=headers_mesero, timeout=TIMEOUT)
    assert menu_cats_resp.status_code == 200, f"GET /api/menu/categories failed: {menu_cats_resp.text}"
    menu_categories = menu_cats_resp.json()
    menuItemId = None
    for category in menu_categories:
        items = category.get("items", [])
        for item in items:
            if item.get("isPreparable") is True and "id" in item:
                menuItemId = item["id"]
                break
        if menuItemId is not None:
            break
    assert menuItemId is not None, "No preparable menu item found."

    orderId = None
    itemId = None
    try:
        # Step 4: POST /api/orders as MESERO
        order_payload = {
            "tableId": tableId,
            "isTakeaway": False,
            "items": [{"menuItemId": menuItemId, "quantity": 1}]
        }
        order_resp = requests.post(f"{BASE_URL}/api/orders", headers=headers_mesero, json=order_payload, timeout=TIMEOUT)
        assert order_resp.status_code in (200, 201), f"POST /api/orders failed: {order_resp.text}"
        order_obj = order_resp.json()
        orderId = order_obj.get("id")
        assert orderId is not None, "Order ID not found in response."

        # Step 5: GET /api/kitchen/orders as COCINERO, find order by orderId, get items[0].id as itemId
        kitchen_orders_resp = requests.get(f"{BASE_URL}/api/kitchen/orders", headers=headers_cocinero, timeout=TIMEOUT)
        assert kitchen_orders_resp.status_code == 200, f"GET /api/kitchen/orders failed: {kitchen_orders_resp.text}"
        kitchen_orders = kitchen_orders_resp.json()
        kitchen_order = next((o for o in kitchen_orders if o.get("id") == orderId), None)
        assert kitchen_order is not None, "Created order not found in kitchen orders."
        kitchen_items = kitchen_order.get("items", [])
        assert isinstance(kitchen_items, list) and len(kitchen_items) > 0, "Kitchen order has no items."
        # Each item ONLY has fields {id, name, quantity, status, isTakeaway}
        first_item = kitchen_items[0]
        # Validate fields presence and no menuItemId/menuItem
        assert set(first_item.keys()).issubset({"id", "name", "quantity", "status", "isTakeaway"})
        itemId = first_item.get("id")
        assert itemId is not None, "Item ID not found on kitchen order item."

        # Step 6: PATCH /api/kitchen/orders/{orderId}/items/{itemId}/status IN_PROGRESS as COCINERO
        status_payload = {"status": "IN_PROGRESS"}
        patch_in_progress_resp = requests.patch(
            f"{BASE_URL}/api/kitchen/orders/{orderId}/items/{itemId}/status",
            headers=headers_cocinero,
            json=status_payload,
            timeout=TIMEOUT
        )
        assert patch_in_progress_resp.status_code == 200, f"PATCH status IN_PROGRESS failed: {patch_in_progress_resp.text}"

        # Step 7: PATCH /api/kitchen/orders/{orderId}/items/{itemId}/status READY as COCINERO
        status_payload_ready = {"status": "READY"}
        patch_ready_resp = requests.patch(
            f"{BASE_URL}/api/kitchen/orders/{orderId}/items/{itemId}/status",
            headers=headers_cocinero,
            json=status_payload_ready,
            timeout=TIMEOUT
        )
        assert patch_ready_resp.status_code == 200, f"PATCH status READY failed: {patch_ready_resp.text}"

        # Step 8: PATCH /api/orders/{orderId}/deliver as MESERO
        deliver_resp = requests.patch(
            f"{BASE_URL}/api/orders/{orderId}/deliver",
            headers=headers_mesero,
            timeout=TIMEOUT
        )
        assert deliver_resp.status_code == 200, f"PATCH /api/orders/{orderId}/deliver failed: {deliver_resp.text}"

        # Step 9: GET /api/payments/tables/{tableId}/bill as ADMIN
        bill_resp = requests.get(
            f"{BASE_URL}/api/payments/tables/{tableId}/bill",
            headers=headers_admin,
            timeout=TIMEOUT
        )
        assert bill_resp.status_code == 200, f"GET bill failed: {bill_resp.text}"
        bill = bill_resp.json()
        # According to shape:
        # {tableId, tableNumber, grandTotal:number, paidAmount, remainingBalance, orders:[{...,items:[{id, name, quantity, unitPrice, subtotal}]}]}
        assert "grandTotal" in bill and isinstance(bill["grandTotal"], (int, float))
        grandTotal = bill["grandTotal"]
        assert "orders" in bill and isinstance(bill["orders"], list)
        orderItemIds = []
        for order in bill["orders"]:
            items = order.get("items", [])
            for item in items:
                assert all(k in item for k in ["id", "name", "quantity", "unitPrice", "subtotal"])
                orderItemIds.append(item["id"])

        assert orderItemIds, "No item ids found in bill orders."

        # Step 10: POST /api/payments/tables/{tableId} as ADMIN
        payment_payload = {
            "receivedAmount": grandTotal,
            "orderItemIds": orderItemIds,
            "documentType": "BOLETA"
        }
        payment_resp = requests.post(
            f"{BASE_URL}/api/payments/tables/{tableId}",
            headers=headers_admin,
            json=payment_payload,
            timeout=TIMEOUT
        )
        assert payment_resp.status_code == 200, f"POST payment failed: {payment_resp.text}"
        payment_json = payment_resp.json()
        assert "payment" in payment_json and isinstance(payment_json["payment"], dict), "Payment object missing in response."

        # Step 11: PATCH /api/payments/tables/{tableId}/release as ADMIN
        release_resp = requests.patch(
            f"{BASE_URL}/api/payments/tables/{tableId}/release",
            headers=headers_admin,
            timeout=TIMEOUT
        )
        assert release_resp.status_code == 200, f"PATCH release table failed: {release_resp.text}"

        # Step 12: GET /api/tables as MESERO and assert chosen table's status == 'FREE'
        tables_after_resp = requests.get(f"{BASE_URL}/api/tables", headers=headers_mesero, timeout=TIMEOUT)
        assert tables_after_resp.status_code == 200, f"GET /api/tables post-release failed: {tables_after_resp.text}"
        tables_after = tables_after_resp.json()
        updated_table = next((t for t in tables_after if t.get("id") == tableId), None)
        assert updated_table is not None, "Table not found after release."
        assert updated_table.get("status") == "FREE", f"Table status expected 'FREE', got '{updated_table.get('status')}'"
    finally:
        # Cleanup: force release the table if still occupied (in case test failed before release)
        # Using admin token and incidents to force release if available
        try:
            reason_payload = {"reason": "cleanup after test"}
            cleanup_resp = requests.post(
                f"{BASE_URL}/api/incidents/tables/{tableId}",
                headers=headers_admin,
                json=reason_payload,
                timeout=TIMEOUT
            )
        except Exception:
            pass

endtoendordercollectionpaymentlifecycle()
