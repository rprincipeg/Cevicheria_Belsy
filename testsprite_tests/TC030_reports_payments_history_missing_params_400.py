import requests

BASE_URL = "http://localhost:3001"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
REPORTS_PAYMENTS_URL = f"{BASE_URL}/api/reports/payments"
TIMEOUT = 30


def test_reports_payments_history_missing_params_400():
    # Step 1: Login as admin
    login_payload = {"username": "admin", "password": "12345"}
    try:
        login_response = requests.post(
            LOGIN_URL, json=login_payload, timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        token = login_data.get("token")
        assert token and isinstance(token, str), "Token missing or invalid"
        assert login_data.get("role") == "ADMIN", "Role is not ADMIN"
        assert login_data.get("username") == "admin", "Username mismatch"

        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: GET /api/reports/payments WITHOUT startDate/endDate query params
        response = requests.get(REPORTS_PAYMENTS_URL, headers=headers, timeout=TIMEOUT)

        # Validate response 400
        assert response.status_code == 400, f"Expected 400 but got {response.status_code}"

        try:
            resp_json = response.json()
        except Exception:
            assert False, "Response is not JSON"

        error_msg = resp_json.get("error")
        assert error_msg and isinstance(error_msg, str), "Error message missing in response"
        # Check that error message mentions required startDate and endDate
        assert "startDate" in error_msg and "endDate" in error_msg, "Error message does not mention startDate and endDate"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_reports_payments_history_missing_params_400()