import requests
import sys
from datetime import datetime

class StudentRegistrationAPITester:
    def __init__(self, base_url="https://student-intake-11.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                self.test_results.append({"test": name, "status": "PASS", "details": f"Status: {response.status_code}"})
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'No detail provided')
                    print(f"   Error: {error_detail}")
                    self.test_results.append({"test": name, "status": "FAIL", "details": f"Expected {expected_status}, got {response.status_code}. Error: {error_detail}"})
                except:
                    self.test_results.append({"test": name, "status": "FAIL", "details": f"Expected {expected_status}, got {response.status_code}"})

            return success, response.json() if response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({"test": name, "status": "FAIL", "details": f"Exception: {str(e)}"})
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "", 200)

    def test_api_health(self):
        """Test API health endpoint"""
        return self.run_test("API Health", "GET", "health", 200)

    def test_valid_login(self):
        """Test login with valid credentials"""
        success, response = self.run_test(
            "Valid Login",
            "POST",
            "login",
            200,
            data={"student_id": "3336", "email": "sean43@hotmail.com"}
        )
        return success, response

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "login",
            401,
            data={"student_id": "9999", "email": "invalid@test.com"}
        )
        return success, response

    def test_get_student(self, student_id="3336"):
        """Test getting student details"""
        success, response = self.run_test(
            f"Get Student {student_id}",
            "GET",
            f"student/{student_id}",
            200
        )
        return success, response

    def test_get_invalid_student(self):
        """Test getting invalid student"""
        success, response = self.run_test(
            "Get Invalid Student",
            "GET",
            "student/9999",
            404
        )
        return success, response

    def test_update_tshirt_size(self, student_id="3336", size="L"):
        """Test updating T-shirt size"""
        success, response = self.run_test(
            f"Update T-shirt Size to {size}",
            "POST",
            "student/update-tshirt",
            200,
            data={"student_id": student_id, "tshirt_size": size}
        )
        return success, response

    def test_invalid_tshirt_size(self, student_id="3336"):
        """Test updating with invalid T-shirt size"""
        success, response = self.run_test(
            "Invalid T-shirt Size",
            "POST",
            "student/update-tshirt",
            400,
            data={"student_id": student_id, "tshirt_size": "INVALID"}
        )
        return success, response

    def test_admin_stats(self):
        """Test admin statistics endpoint"""
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200
        )
        return success, response

    def test_admin_students(self):
        """Test admin students list endpoint"""
        success, response = self.run_test(
            "Admin Students List",
            "GET",
            "admin/students",
            200
        )
        return success, response

def main():
    print("🚀 Starting Student Registration API Tests")
    print("=" * 50)
    
    tester = StudentRegistrationAPITester()
    
    # Test health endpoints
    tester.test_health_check()
    tester.test_api_health()
    
    # Test authentication
    login_success, login_response = tester.test_valid_login()
    tester.test_invalid_login()
    
    # Test student endpoints
    if login_success and login_response.get('student_id'):
        student_id = login_response['student_id']
        student_success, student_data = tester.test_get_student(student_id)
        
        # Test T-shirt size update
        tester.test_update_tshirt_size(student_id, "L")
        tester.test_invalid_tshirt_size(student_id)
    else:
        print("⚠️  Skipping student tests due to login failure")
        tester.test_get_student()  # Test with default ID
        tester.test_update_tshirt_size()
        tester.test_invalid_tshirt_size()
    
    tester.test_get_invalid_student()
    
    # Test admin endpoints
    admin_stats_success, stats_data = tester.test_admin_stats()
    admin_students_success, students_data = tester.test_admin_students()
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Summary: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if admin_stats_success and stats_data:
        print(f"📈 Database Stats:")
        print(f"   Total Students: {stats_data.get('total_students', 'N/A')}")
        print(f"   Completed: {stats_data.get('completed_registrations', 'N/A')}")
        print(f"   Pending: {stats_data.get('pending_registrations', 'N/A')}")
        print(f"   Revenue: ${stats_data.get('total_revenue', 'N/A')}")
    
    if admin_students_success and students_data:
        print(f"👥 Found {len(students_data)} students in database")
    
    # Print failed tests
    failed_tests = [t for t in tester.test_results if t['status'] == 'FAIL']
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   • {test['test']}: {test['details']}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())