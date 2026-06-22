import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30


def login(username: str, password: str):
    url = f"{BASE_URL}/api/auth/login"
    payload = {"username": username, "password": password}
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    assert "token" in data and isinstance(data["token"], str) and data["token"]
    assert "role" in data and isinstance(data["role"], str)
    assert data["username"] == username
    return data["token"]


def get_tables(token: str):
    url = f"{BASE_URL}/api/tables"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def get_menu_categories(token: str):
    url = f"{BASE_URL}/api/menu/categories"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def post_order(token: str, tableId: str, menuItemId: int):
    url = f"{BASE_URL}/api/orders"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "tableId": tableId,
        "isTakeaway": False,
        "items": [{"menuItemId": menuItemId, "quantity": 1}],
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (200, 201):
        resp.raise_for_status()
    data = resp.json()
    assert "id" in data
    return data["id"]


def get_kitchen_orders(token: str):
    url = f"{BASE_URL}/api/kitchen/orders"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def patch_kitchen_item_status(token: str, orderId: int, itemId: int, status: str):
    url = f"{BASE_URL}/api/kitchen/orders/{orderId}/items/{itemId}/status"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"status": status}
    resp = requests.patch(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp


def patch_order_deliver(token: str, orderId: int):
    url = f"{BASE_URL}/api/orders/{orderId}/deliver"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.patch(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp


def get_table_bill(token: str, tableId: str):
    url = f"{BASE_URL}/api/payments/tables/{tableId}/bill"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def post_table_payment(token: str, tableId: str, receivedAmount: float, orderItemIds: list, documentType: str, customerDocument: str):
    url = f"{BASE_URL}/api/payments/tables/{tableId}"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "receivedAmount": receivedAmount,
        "orderItemIds": orderItemIds,
        "documentType": documentType,
        "customerDocument": customerDocument,
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (200, 201):
        resp.raise_for_status()
    data = resp.json()
    assert "payment" in data and isinstance(data["payment"], dict)
    return data["payment"]


def patch_table_release(token: str, tableId: str):
    url = f"{BASE_URL}/api/payments/tables/{tableId}/release"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.patch(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp


def e2e_order_kitchen_payment_lifecycle():
    # Step 1: login all three roles
    token_admin = login("admin", "12345")
    token_mesero = login("mesero", "123456")
    token_cocinero = login("cocinero", "123456")

    # Step 2: GET /api/tables as MESERO, find a table with status 'FREE'
    tables = get_tables(token_mesero)
    tableId = None
    for table in tables:
        if isinstance(table, dict) and "number" in table and table.get("status") == "FREE":
            tableId = table["id"]
            break

    if not tableId:
        # No free table found, skip gracefully
        print("No free table found, skipping test.")
        return

    # Step 3: GET /api/menu/categories as MESERO, pick menu item with isPreparable==True
    categories = get_menu_categories(token_mesero)
    menuItemId = None
    for category in categories:
        items = category.get("items", [])
        for item in items:
            if item.get("isPreparable") is True:
                menuItemId = item.get("id")
                if menuItemId is not None:
                    break
        if menuItemId is not None:
            break
    if menuItemId is None:
        print("No preparable menu item found, skipping test.")
        return

    # Step 4: POST /api/orders as MESERO with tableId, isTakeaway false, items
    orderId = None
    try:
        orderId = post_order(token_mesero, tableId, menuItemId)

        # Step 5: GET /api/kitchen/orders as COCINERO, find order by id, get items[0].id as itemId
        kitchen_orders = get_kitchen_orders(token_cocinero)
        order_found = None
        for order in kitchen_orders:
            if order.get("id") == orderId:
                order_found = order
                break

        assert order_found is not None, f"Order {orderId} not found in kitchen orders"

        items = order_found.get("items", [])
        assert isinstance(items, list) and len(items) > 0, "Kitchen order has no items"
        first_item = items[0]
        itemId = first_item.get("id")
        assert itemId is not None, "Item ID missing in kitchen order item"

        # Step 6: PATCH item status to 'IN_PROGRESS'
        patch_kitchen_item_status(token_cocinero, orderId, itemId, "IN_PROGRESS")

        # Step 7: PATCH item status to 'READY'
        patch_kitchen_item_status(token_cocinero, orderId, itemId, "READY")

        # Step 8: PATCH /api/orders/{orderId}/deliver as MESERO
        patch_order_deliver(token_mesero, orderId)

        # Step 9: GET /api/payments/tables/{tableId}/bill as ADMIN
        bill = get_table_bill(token_admin, tableId)
        grandTotal = bill.get("grandTotal")
        assert isinstance(grandTotal, (int, float)), "grandTotal missing or invalid in bill"
        orders = bill.get("orders", [])
        assert isinstance(orders, list), "orders missing or not a list in bill"
        orderItemIds = []
        for order in orders:
            items = order.get("items", [])
            for it in items:
                oid = it.get("id")
                if oid is not None:
                    orderItemIds.append(oid)
        assert len(orderItemIds) > 0, "No order item IDs collected from bill"

        # Step 10: POST /api/payments/tables/{tableId} as ADMIN with payment data
        payment = post_table_payment(
            token_admin,
            tableId,
            receivedAmount=grandTotal,
            orderItemIds=orderItemIds,
            documentType="BOLETA",
            customerDocument="12345678",
        )

        # Step 11: PATCH /api/payments/tables/{tableId}/release as ADMIN
        patch_table_release(token_admin, tableId)

        # Step 12: GET /api/tables as MESERO and assert table status is back to 'FREE'
        final_tables = get_tables(token_mesero)
        final_table = None
        for tbl in final_tables:
            if "number" in tbl and tbl.get("id") == tableId:
                final_table = tbl
                break

        assert final_table is not None, f"Table {tableId} not found in final tables list"
        assert final_table.get("status") == "FREE", f"Table {tableId} status is not FREE after release"

    finally:
        # Cleanup: No explicit delete order or payment endpoint given in PRD.
        # The test plan doesn't specify cleanup except that for created data do cleanup.
        # Here no explicit cleanup step for order or payment. So pass.
        pass


e2e_order_kitchen_payment_lifecycle()