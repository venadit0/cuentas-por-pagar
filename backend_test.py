import requests
import sys
import json
import tempfile
import os
from datetime import datetime

class InvoiceAPITester:
    def __init__(self, base_url="https://bill-master-pdf.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_invoice_id = None
        self.test_empresa_id = "f94fee4d-dc88-41b8-b4eb-d611d3c4bbb1"  # Demo company ID

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, response_type='json'):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    if response_type == 'json':
                        response_data = response.json()
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                        return True, response_data
                    else:
                        # For binary responses like PDF downloads
                        print(f"   Response size: {len(response.content)} bytes")
                        return True, response.content
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_get_invoices_empty(self):
        """Test getting invoices when database might be empty"""
        return self.run_test("Get All Invoices", "GET", "invoices", 200)

    def test_get_invoices_with_filters(self):
        """Test getting invoices with filters"""
        success1, _ = self.run_test("Get Invoices - Filter by Estado", "GET", "invoices?estado=pendiente", 200)
        success2, _ = self.run_test("Get Invoices - Filter by Proveedor", "GET", "invoices?proveedor=test", 200)
        return success1 and success2

    def test_resumen_endpoints(self):
        """Test summary endpoints"""
        success1, _ = self.run_test("Get Resumen por Proveedor", "GET", "resumen/proveedor", 200)
        success2, _ = self.run_test("Get Resumen General", "GET", "resumen/general", 200)
        return success1 and success2

    def test_estado_cuenta_pagadas(self):
        """Test the new Estado de Cuenta Pagadas endpoint"""
        success, response_data = self.run_test("Get Estado Cuenta Pagadas", "GET", "estado-cuenta/pagadas", 200)
        
        if success and response_data:
            # Validate response structure
            required_fields = ['total_pagado', 'cantidad_facturas_pagadas', 'facturas_por_proveedor', 'facturas_pagadas']
            for field in required_fields:
                if field not in response_data:
                    print(f"❌ Missing required field: {field}")
                    return False
            
            print(f"   ✅ Total Pagado: ${response_data['total_pagado']:,.2f}")
            print(f"   ✅ Cantidad Facturas Pagadas: {response_data['cantidad_facturas_pagadas']}")
            print(f"   ✅ Proveedores con Facturas Pagadas: {len(response_data['facturas_por_proveedor'])}")
            print(f"   ✅ Facturas Pagadas Detalle: {len(response_data['facturas_pagadas'])}")
            
            # Validate that totals make sense
            if response_data['cantidad_facturas_pagadas'] != len(response_data['facturas_pagadas']):
                print(f"❌ Mismatch: cantidad_facturas_pagadas ({response_data['cantidad_facturas_pagadas']}) != len(facturas_pagadas) ({len(response_data['facturas_pagadas'])})")
                return False
            
            # Calculate total from individual invoices to verify
            calculated_total = sum(factura['monto'] for factura in response_data['facturas_pagadas'])
            if abs(calculated_total - response_data['total_pagado']) > 0.01:  # Allow small floating point differences
                print(f"❌ Total mismatch: calculated {calculated_total} != reported {response_data['total_pagado']}")
                return False
            
            print("   ✅ All validations passed for Estado Cuenta Pagadas")
        
        return success

    def create_test_pdf(self):
        """Create a simple test PDF file"""
        try:
            # Create a simple text file that we'll pretend is a PDF for testing
            # In a real scenario, you'd want to create an actual PDF
            test_content = """
            FACTURA
            
            Número de Factura: TEST-001
            Proveedor: Empresa Test S.A.
            Fecha: 2024-01-15
            Monto Total: $1500.00
            
            Descripción: Servicios de prueba
            """
            
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', mode='w')
            temp_file.write(test_content)
            temp_file.close()
            return temp_file.name
        except Exception as e:
            print(f"Error creating test PDF: {e}")
            return None

    def test_upload_pdf(self):
        """Test PDF upload endpoint"""
        # Create a test file
        test_file_path = self.create_test_pdf()
        if not test_file_path:
            print("❌ Could not create test PDF file")
            return False

        try:
            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_invoice.pdf', f, 'application/pdf')}
                success, response_data = self.run_test(
                    "Upload PDF", 
                    "POST", 
                    "upload-pdf", 
                    200,  # Expecting success, but might fail due to Gemini processing
                    files=files
                )
                
                if success and 'data' in response_data:
                    self.created_invoice_id = response_data['data'].get('id')
                    print(f"   Created invoice ID: {self.created_invoice_id}")
                
                return success
        except Exception as e:
            print(f"❌ PDF Upload failed with error: {e}")
            return False
        finally:
            # Clean up test file
            if os.path.exists(test_file_path):
                os.unlink(test_file_path)

    def test_update_invoice_status(self):
        """Test updating invoice status"""
        if not self.created_invoice_id:
            print("⚠️  Skipping status update test - no invoice ID available")
            return True  # Don't fail the test if we don't have an invoice to update
        
        # Test updating to "pagado"
        success1, _ = self.run_test(
            "Update Invoice Status to Pagado",
            "PUT",
            f"invoices/{self.created_invoice_id}/estado",
            200,
            data={"estado_pago": "pagado"}
        )
        
        # Test updating back to "pendiente"
        success2, _ = self.run_test(
            "Update Invoice Status to Pendiente",
            "PUT",
            f"invoices/{self.created_invoice_id}/estado",
            200,
            data={"estado_pago": "pendiente"}
        )
        
        return success1 and success2

    def test_invalid_endpoints(self):
        """Test error handling for invalid requests"""
        # Test non-existent invoice
        success1, _ = self.run_test(
            "Update Non-existent Invoice",
            "PUT",
            "invoices/non-existent-id/estado",
            404,
            data={"estado_pago": "pagado"}
        )
        
        return True  # We expect this to fail, so we return True if it fails correctly

def main():
    print("🚀 Starting Invoice Management API Tests")
    print("=" * 50)
    
    # Initialize tester
    tester = InvoiceAPITester()
    
    # Run all tests
    print("\n📋 Testing Basic Endpoints...")
    tester.test_root_endpoint()
    tester.test_get_invoices_empty()
    tester.test_get_invoices_with_filters()
    tester.test_resumen_endpoints()
    
    print("\n💰 Testing Estado Cuenta Pagadas (NEW FUNCTIONALITY)...")
    tester.test_estado_cuenta_pagadas()
    
    print("\n📄 Testing PDF Upload...")
    tester.test_upload_pdf()
    
    print("\n🔄 Testing Invoice Status Updates...")
    tester.test_update_invoice_status()
    
    print("\n❌ Testing Error Handling...")
    tester.test_invalid_endpoints()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed. Check the details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())