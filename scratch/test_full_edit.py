import requests
import json

BASE_URL = "http://localhost:8000"

def test_employee_endpoints():
    # 1. Get all employees to find an ID
    response = requests.get(f"{BASE_URL}/employees")
    if response.status_code != 200:
        print("Failed to get employees")
        return
    
    employees = response.json()
    if not employees:
        print("No employees found to test with")
        return
    
    emp = employees[0]
    emp_id = emp['id']
    print(f"Testing with employee: {emp['name']} (ID: {emp_id})")
    
    # 2. Get single employee
    response = requests.get(f"{BASE_URL}/employees/{emp_id}")
    if response.status_code == 200:
        print("Successfully fetched single employee")
    else:
        print(f"Failed to fetch single employee: {response.status_code}")
    
    # 3. Update employee
    original_phone = emp.get('phone', '')
    new_phone = original_phone + " (updated)"
    
    update_data = {
        "phone": new_phone,
        "salary": emp.get('salary', 0) + 1000
    }
    
    response = requests.put(f"{BASE_URL}/employees/{emp_id}", json=update_data)
    if response.status_code == 200:
        print("Successfully updated employee")
        updated_emp = response.json()
        print(f"New phone: {updated_emp['phone']}")
        print(f"New salary: {updated_emp['salary']}")
        
        # 4. Verify name recalculation (if we change firstName)
        name_update = {
            "firstName": "UpdatedFirstName",
            "lastName": "UpdatedLastName"
        }
        response = requests.put(f"{BASE_URL}/employees/{emp_id}", json=name_update)
        if response.status_code == 200:
            final_emp = response.json()
            print(f"Recalculated name: {final_emp['name']}")
        else:
            print(f"Failed to update name: {response.status_code}")
    else:
        print(f"Failed to update employee: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_employee_endpoints()
