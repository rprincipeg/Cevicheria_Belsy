import requests

BASE_URL = "http://localhost:3001"
ADMIN_CREDENTIALS = {"username": "admin", "password": "12345"}
TIMEOUT = 30


def test_reports_payments_history_valid_range():
    session = requests.Session()
    try:
        # Login as admin with exact credentials
        login_resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS,
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "token" in login_data and isinstance(login_data["token"], str) and login_data["token"]
        assert login_data.get("role") == "ADMIN"
        assert login_data.get("username") == "admin"
        token = login_data["token"]

        headers = {"Authorization": f"Bearer {token}"}

        # GET /api/reports/payments with valid date range query parameters
        params = {"startDate": "2026-06-01", "endDate": "2026-06-30"}
        report_resp = session.get(
            f"{BASE_URL}/api/reports/payments",
            headers=headers,
            params=params,
            timeout=TIMEOUT,
        )
        assert report_resp.status_code == 200, f"Expected 200 OK, got {report_resp.status_code} with body: {report_resp.text}"

        data = report_resp.json()
        # Validate keys presence
        expected_keys = {"startDate", "endDate", "totalAmount", "totalPayments", "payments"}
        assert isinstance(data, dict), "Response JSON is not an object"
        for key in expected_keys:
            assert key in data, f"Response JSON missing expected key: {key}"

        # Validate payments is an array
        assert isinstance(data["payments"], list), "'payments' should be an array"

        # Validate startDate and endDate match the query parameters exactly
        assert data["startDate"] == params["startDate"], f"startDate mismatch: expected {params['startDate']}, got {data['startDate']}"
        assert data["endDate"] == params["endDate"], f"endDate mismatch: expected {params['endDate']}, got {data['endDate']}"

        # Validate totalAmount and totalPayments are numbers (int or float)
        assert isinstance(data["totalAmount"], (int, float)), "'totalAmount' should be a number"
        assert isinstance(data["totalPayments"], (int, float)), "'totalPayments' should be a number"

    finally:
        session.close()


test_reports_payments_history_valid_range()