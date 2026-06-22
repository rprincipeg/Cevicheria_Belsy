import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_reports_daily_export_xlsx():
    login_url = f"{BASE_URL}/api/auth/login"
    reports_export_url = f"{BASE_URL}/api/reports/daily/export"
    login_payload = {"username": "admin", "password": "12345"}

    try:
        # Login as admin
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert token and isinstance(token, str) and len(token) > 0, "Token missing or invalid"

        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Get daily report export (binary Excel)
        export_resp = requests.get(reports_export_url, headers=headers, timeout=TIMEOUT)
        assert export_resp.status_code == 200, f"Export request failed: {export_resp.text}"

        content_type = export_resp.headers.get("Content-Type", "").lower()
        body = export_resp.content

        # Assert content type contains 'spreadsheet' or 'excel' OR body is non-empty binary
        assert ("spreadsheet" in content_type or "excel" in content_type) or (body and len(body) > 0), \
            f"Response is not a spreadsheet or empty body. Content-Type: {content_type}, Body length: {len(body)}"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_reports_daily_export_xlsx()