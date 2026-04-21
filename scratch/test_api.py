import requests

def test_stats():
    try:
        response = requests.get("http://localhost:8000/dashboard-stats")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_stats()
