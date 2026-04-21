import requests

def test_delete():
    # 1. Get employees
    res = requests.get("http://localhost:8000/employees")
    employees = res.json()
    if not employees:
        print("No employees to delete")
        return
    
    emp_id = employees[0]['id']
    print(f"Deleting employee with id: {emp_id}")
    
    # 2. Delete employee
    res = requests.delete(f"http://localhost:8000/employees/{emp_id}")
    print(f"Delete Status: {res.status_code}")
    print(f"Delete Response: {res.json()}")
    
    # 3. Verify deletion
    res = requests.get("http://localhost:8000/employees")
    updated_employees = res.json()
    found = any(e['id'] == emp_id for e in updated_employees)
    print(f"Employee still exists: {found}")

if __name__ == "__main__":
    test_delete()
