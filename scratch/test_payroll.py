import os
import requests
import json

def test_payroll():
    url = "http://127.0.0.1:8000/payroll/process"
    payload = {
        "month": "May",
        "year": 2026
    }
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print(f"Sending request to {url}...")
        response = requests.post(url, data=json.dumps(payload), headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_payroll()
