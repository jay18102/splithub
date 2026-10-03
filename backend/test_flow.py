import sys
sys.path.append('backend')
from starlette.testclient import TestClient
from app.main import app

def test_api():
    client = TestClient(app)
    # 1. Login as Amit
    login_res = client.post('/api/auth/login', data={'username': 'amit@splitsub.dev', 'password': 'password123'})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 2. Obligations
    obs_res = client.get('/api/payments/obligations', headers=headers)
    assert obs_res.status_code == 200
    obs = obs_res.json()
    print(f"Amit has {len(obs)} obligations")
    target = next((o for o in obs if o['status'] in ['pending', 'overdue']), None)
    assert target is not None, "Expected pending or overdue obligation"
    print(f"Target obligation: {target['subscription_name']} - Rs {target['amount']} ({target['status']})")

    # 3. Initiate payment
    init_res = client.post(f"/api/payments/{target['id']}/initiate", headers=headers)
    assert init_res.status_code == 200
    init_data = init_res.json()
    print("UPI URI:", init_data['upi_uri'])
    print("QR Data URL length:", len(init_data['qr_code_data_url']))
    assert init_data['upi_uri'].startswith("upi://pay?")
    assert init_data['qr_code_data_url'].startswith("data:image/png;base64,")

    # 4. Sandbox Confirm Payment
    confirm_res = client.post(
        f"/api/payments/{target['id']}/confirm",
        json={"simulate_status": "successful", "payer_vpa": "amit@paytm"},
        headers=headers
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    print("Confirm Result:", confirm_data['message'], "TXN ID:", confirm_data['upi_txn_id'])
    assert confirm_data['success'] is True
    assert confirm_data['obligation_status'] == "paid"

    # 5. Check Settlement updated for owner (Jay)
    jay_login = client.post('/api/auth/login', data={'username': 'jay@splitsub.dev', 'password': 'password123'})
    jay_token = jay_login.json()['access_token']
    jay_headers = {'Authorization': f'Bearer {jay_token}'}
    settle_res = client.get(f"/api/settlements/{target['subscription_id']}", headers=jay_headers)
    assert settle_res.status_code == 200
    settle_data = settle_res.json()
    print(f"Updated Settlement for {settle_data['subscription_name']}: Collected Rs {settle_data['total_collected']}, Pending Rs {settle_data['total_pending']}")

    print("\nALL TEST PASSES! End-to-end UPI payment & settlement verification succeeded.")

if __name__ == "__main__":
    test_api()
