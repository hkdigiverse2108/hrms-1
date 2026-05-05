import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_assets():
    # 1. Get all assets
    print("Fetching all assets...")
    response = requests.get(f"{BASE_URL}/assets")
    print(f"Status: {response.status_code}")
    print(f"Data: {response.json()}")

    # 2. Create an asset
    print("\nCreating a new asset...")
    payload = {
        "assetId": "HKSET001",
        "name": "Test Monitor",
        "category": "IT Equipment",
        "status": "Available",
        "condition": "New",
        "location": "Warehouse",
        "purchaseDate": "2026-05-01",
        "value": 500,
        "description": "27-inch test monitor"
    }
    response = requests.post(f"{BASE_URL}/assets", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Data: {response.json()}")
    
    asset_id = response.json().get("id")

    # 3. Get all assets again
    print("\nFetching all assets after creation...")
    response = requests.get(f"{BASE_URL}/assets")
    print(f"Status: {response.status_code}")
    print(f"Count: {len(response.json())}")

if __name__ == "__main__":
    try:
        test_assets()
    except Exception as e:
        print(f"Error: {e}")
