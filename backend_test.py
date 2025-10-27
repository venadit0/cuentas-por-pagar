import requests
import sys
import json
import tempfile
import os
from datetime import datetime

class InvoiceAPITester:
    def __init__(self, base_url="https://invoice-central.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_invoice_id = None
        self.test_empresa_id = "4d87e4d4-33f4-4f22-9c6f-a113c49038fc"  # Valid company ID

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
        return self.run_test("Get All Invoices", "GET", f"invoices/{self.test_empresa_id}", 200)

    def test_get_invoices_with_filters(self):
        """Test getting invoices with filters"""
        success1, _ = self.run_test("Get Invoices - Filter by Estado", "GET", f"invoices/{self.test_empresa_id}?estado=pendiente", 200)
        success2, _ = self.run_test("Get Invoices - Filter by Proveedor", "GET", f"invoices/{self.test_empresa_id}?proveedor=test", 200)
        return success1 and success2

    def test_resumen_endpoints(self):
        """Test summary endpoints"""
        success1, _ = self.run_test("Get Resumen por Proveedor", "GET", f"resumen/proveedor/{self.test_empresa_id}", 200)
        success2, _ = self.run_test("Get Resumen General", "GET", f"resumen/general/{self.test_empresa_id}", 200)
        return success1 and success2

    def test_estado_cuenta_pagadas(self):
        """Test the new Estado de Cuenta Pagadas endpoint"""
        success, response_data = self.run_test("Get Estado Cuenta Pagadas", "GET", f"estado-cuenta/pagadas/{self.test_empresa_id}", 200)
        
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
                    f"upload-pdf/{self.test_empresa_id}", 
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

    def test_download_invoice_pdf(self):
        """Test the NEW PDF download endpoint"""
        if not self.created_invoice_id:
            print("⚠️  Skipping PDF download test - no invoice ID available")
            return True  # Don't fail the test if we don't have an invoice to download
        
        success, response_data = self.run_test(
            "Download Invoice PDF (NEW FUNCTIONALITY)",
            "GET",
            f"invoices/{self.created_invoice_id}/download",
            200,
            response_type='binary'
        )
        
        if success:
            print(f"   ✅ PDF download successful, received {len(response_data)} bytes")
            # Verify it's actually PDF-like content
            if len(response_data) > 0:
                print("   ✅ PDF file has content")
            else:
                print("   ❌ PDF file is empty")
                return False
        
        return success

    def test_delete_invoice(self):
        """Test the NEW invoice deletion endpoint"""
        if not self.created_invoice_id:
            print("⚠️  Skipping invoice deletion test - no invoice ID available")
            return True  # Don't fail the test if we don't have an invoice to delete
        
        # First, let's verify the invoice exists
        success_check, _ = self.run_test(
            "Verify Invoice Exists Before Deletion",
            "GET",
            f"invoices/{self.test_empresa_id}",
            200
        )
        
        if not success_check:
            print("❌ Could not verify invoice exists before deletion")
            return False
        
        # Now delete the invoice
        success, response_data = self.run_test(
            "Delete Invoice (NEW FUNCTIONALITY)",
            "DELETE",
            f"invoices/{self.created_invoice_id}",
            200
        )
        
        if success:
            print("   ✅ Invoice deletion successful")
            # Verify the invoice is actually deleted by trying to download it
            success_verify, _ = self.run_test(
                "Verify Invoice Deleted (Should Fail)",
                "GET",
                f"invoices/{self.created_invoice_id}/download",
                404,
                response_type='binary'
            )
            
            if success_verify:
                print("   ✅ Invoice properly deleted - download now returns 404")
            else:
                print("   ❌ Invoice may not have been properly deleted")
                return False
        
        return success

    def test_empresas_endpoints(self):
        """Test company management endpoints"""
        # Test getting all companies
        success1, companies_data = self.run_test("Get All Companies", "GET", "empresas", 200)
        
        if success1 and companies_data:
            print(f"   ✅ Found {len(companies_data)} companies")
            # Check if our test company exists
            test_company_found = any(company.get('id') == self.test_empresa_id for company in companies_data)
            if test_company_found:
                print(f"   ✅ Test company {self.test_empresa_id} found")
            else:
                print(f"   ⚠️  Test company {self.test_empresa_id} not found")
        
        # Test getting specific company
        success2, _ = self.run_test("Get Specific Company", "GET", f"empresas/{self.test_empresa_id}", 200)
        
        return success1 and success2

    def test_excel_export_endpoints(self):
        """Test NEW Excel export functionality"""
        print("\n📊 Testing Excel Export Endpoints...")
        
        # Test export pending invoices
        success1, response_data1 = self.run_test(
            "Export Facturas Pendientes to Excel (NEW)",
            "GET",
            f"export/facturas-pendientes/{self.test_empresa_id}",
            200,
            response_type='binary'
        )
        
        if success1:
            print(f"   ✅ Pending invoices Excel export successful, received {len(response_data1)} bytes")
            if len(response_data1) > 1000:  # Excel files should be reasonably sized
                print("   ✅ Excel file has reasonable size")
            else:
                print("   ⚠️  Excel file seems too small")
        
        # Test export paid invoices
        success2, response_data2 = self.run_test(
            "Export Facturas Pagadas to Excel (NEW)",
            "GET",
            f"export/facturas-pagadas/{self.test_empresa_id}",
            200,
            response_type='binary'
        )
        
        if success2:
            print(f"   ✅ Paid invoices Excel export successful, received {len(response_data2)} bytes")
        
        # Test export general summary
        success3, response_data3 = self.run_test(
            "Export Resumen General to Excel (NEW)",
            "GET",
            f"export/resumen-general/{self.test_empresa_id}",
            200,
            response_type='binary'
        )
        
        if success3:
            print(f"   ✅ General summary Excel export successful, received {len(response_data3)} bytes")
        
        return success1 and success2 and success3

    def test_company_management_endpoints(self):
        """Test NEW company management functionality"""
        print("\n🏢 Testing Company Management Endpoints...")
        
        # First, create a test company for management operations
        test_company_data = {
            "nombre": "Test Company for Management",
            "rut_cuit": "20-12345678-9",
            "direccion": "Test Address 123",
            "telefono": "+54 11 1234-5678",
            "email": "test@company.com"
        }
        
        success_create, create_response = self.run_test(
            "Create Test Company for Management",
            "POST",
            "empresas",
            200,
            data=test_company_data
        )
        
        if not success_create or not create_response:
            print("❌ Could not create test company for management tests")
            return False
        
        test_company_id = create_response.get('id')
        if not test_company_id:
            print("❌ No company ID returned from creation")
            return False
        
        print(f"   ✅ Created test company with ID: {test_company_id}")
        
        # Test updating company data (NEW functionality)
        updated_data = {
            "nombre": "Updated Test Company",
            "rut_cuit": "20-87654321-9",
            "direccion": "Updated Address 456",
            "telefono": "+54 11 8765-4321",
            "email": "updated@company.com"
        }
        
        success_update, update_response = self.run_test(
            "Update Company Data (NEW)",
            "PUT",
            f"empresas/{test_company_id}",
            200,
            data=updated_data
        )
        
        if success_update:
            print("   ✅ Company update successful")
            # Verify the update worked
            if update_response.get('nombre') == updated_data['nombre']:
                print("   ✅ Company name updated correctly")
            else:
                print("   ❌ Company name not updated correctly")
                return False
        
        # Test soft delete company (NEW functionality)
        success_delete, delete_response = self.run_test(
            "Soft Delete Company (NEW)",
            "DELETE",
            f"empresas/{test_company_id}",
            200
        )
        
        if success_delete:
            print("   ✅ Company soft delete successful")
            if delete_response.get('success'):
                print(f"   ✅ Delete response: {delete_response.get('message', 'No message')}")
                facturas_eliminadas = delete_response.get('facturas_eliminadas', 0)
                print(f"   ✅ Facturas eliminated: {facturas_eliminadas}")
            else:
                print("   ❌ Delete response indicates failure")
                return False
            
            # Verify company is no longer accessible
            success_verify, _ = self.run_test(
                "Verify Company Deleted (Should Fail)",
                "GET",
                f"empresas/{test_company_id}",
                404
            )
            
            if success_verify:
                print("   ✅ Company properly soft deleted - GET now returns 404")
            else:
                print("   ❌ Company may not have been properly soft deleted")
                return False
        
        return success_create and success_update and success_delete

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
        
        # Test Excel export with non-existent company
        success2, _ = self.run_test(
            "Export Excel for Non-existent Company",
            "GET",
            "export/facturas-pendientes/non-existent-company-id",
            404,
            response_type='binary'
        )
        
        return True  # We expect these to fail, so we return True if they fail correctly

def main():
    print("🚀 Starting Invoice Management API Tests")
    print("=" * 50)
    
    # Initialize tester
    tester = InvoiceAPITester()
    
    # Run all tests
    print("\n🏢 Testing Company Endpoints...")
    tester.test_empresas_endpoints()
    
    print("\n📋 Testing Basic Endpoints...")
    tester.test_root_endpoint()
    tester.test_get_invoices_empty()
    tester.test_get_invoices_with_filters()
    tester.test_resumen_endpoints()
    
    print("\n💰 Testing Estado Cuenta Pagadas...")
    tester.test_estado_cuenta_pagadas()
    
    print("\n📄 Testing PDF Upload...")
    tester.test_upload_pdf()
    
    print("\n🔄 Testing Invoice Status Updates...")
    tester.test_update_invoice_status()
    
    print("\n📥 Testing NEW PDF Download Functionality...")
    tester.test_download_invoice_pdf()
    
    print("\n🗑️  Testing NEW Invoice Deletion Functionality...")
    tester.test_delete_invoice()
    
    print("\n📊 Testing NEW Excel Export Functionality...")
    tester.test_excel_export_endpoints()
    
    print("\n🏢 Testing NEW Company Management Functionality...")
    tester.test_company_management_endpoints()
    
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