#!/usr/bin/env python3
"""
Focused test for DELETE comprobante functionality
Tests the new DELETE /api/invoices/{invoice_id}/delete-comprobante endpoint
"""

import requests
import os
import json

class DeleteComprobanteTest:
    def __init__(self):
        self.base_url = "https://invoice-central.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        
        # Use existing invoice with comprobante
        self.test_empresa_id = "1e5a42ce-d947-4da5-b48a-72d94d65d6d1"  # GUARDIA NACIONAL NOGALES
        self.test_invoice_id = "6faa8b5c-33f9-4058-956a-ab12e8383753"  # FN-3,790
        
    def log(self, message):
        print(f"🔍 {message}")
        
    def test_step(self, step_name, success, details=""):
        if success:
            print(f"✅ {step_name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {step_name}")
            if details:
                print(f"   {details}")
        return success

    def get_invoice_data(self):
        """Get current invoice data"""
        try:
            response = requests.get(f"{self.api_url}/invoices/{self.test_empresa_id}")
            if response.status_code == 200:
                invoices = response.json()
                for inv in invoices:
                    if inv.get('id') == self.test_invoice_id:
                        return inv
            return None
        except Exception as e:
            print(f"Error getting invoice data: {e}")
            return None

    def test_delete_comprobante_functionality(self):
        """Test the complete DELETE comprobante functionality"""
        print("🚀 Testing DELETE Comprobante Functionality")
        print("=" * 60)
        
        # Step 1: Get initial invoice state
        self.log("Step 1: Getting initial invoice state...")
        initial_invoice = self.get_invoice_data()
        
        if not initial_invoice:
            return self.test_step("Get initial invoice data", False, "Could not find test invoice")
        
        initial_comprobante = initial_invoice.get('comprobante_pago')
        initial_comprobante_original = initial_invoice.get('comprobante_original')
        
        if not initial_comprobante:
            return self.test_step("Check initial comprobante", False, "Test invoice has no comprobante to delete")
        
        self.test_step("Get initial invoice data", True, 
                      f"Invoice: {initial_invoice.get('numero_factura', 'N/A')}")
        self.test_step("Check initial comprobante", True, 
                      f"Comprobante: {initial_comprobante}")
        
        # Step 2: Check if comprobante file exists on server
        comprobante_path = f"/app/uploads/{initial_comprobante}"
        file_exists_before = os.path.exists(comprobante_path)
        self.test_step("Check comprobante file exists", file_exists_before, 
                      f"File: {comprobante_path}")
        
        # Step 3: Test DELETE comprobante endpoint
        self.log("Step 3: Testing DELETE comprobante endpoint...")
        try:
            response = requests.delete(f"{self.api_url}/invoices/{self.test_invoice_id}/delete-comprobante")
            
            if response.status_code == 200:
                response_data = response.json()
                self.test_step("DELETE comprobante API call", True, 
                              f"Response: {response_data.get('message', 'Success')}")
            else:
                return self.test_step("DELETE comprobante API call", False, 
                                    f"Status: {response.status_code}, Error: {response.text}")
        except Exception as e:
            return self.test_step("DELETE comprobante API call", False, f"Exception: {e}")
        
        # Step 4: Verify file was removed from server
        self.log("Step 4: Verifying file removal from server...")
        file_exists_after = os.path.exists(comprobante_path)
        
        if file_exists_before and not file_exists_after:
            self.test_step("File removed from server", True, "Comprobante file properly deleted")
        elif not file_exists_before:
            self.test_step("File removal check", True, "File didn't exist before (still valid)")
        else:
            return self.test_step("File removed from server", False, "File still exists after deletion")
        
        # Step 5: Verify database fields were cleared
        self.log("Step 5: Verifying database fields were cleared...")
        updated_invoice = self.get_invoice_data()
        
        if not updated_invoice:
            return self.test_step("Get updated invoice data", False, "Could not retrieve updated invoice")
        
        updated_comprobante = updated_invoice.get('comprobante_pago')
        updated_comprobante_original = updated_invoice.get('comprobante_original')
        
        if updated_comprobante is None and updated_comprobante_original is None:
            self.test_step("Database fields cleared", True, "comprobante_pago and comprobante_original set to null")
        else:
            return self.test_step("Database fields cleared", False, 
                                f"Fields not cleared: pago={updated_comprobante}, original={updated_comprobante_original}")
        
        # Step 6: Verify invoice data remains intact
        self.log("Step 6: Verifying invoice data remains intact...")
        
        # Check key invoice fields
        invoice_intact = (
            updated_invoice.get('numero_factura') == initial_invoice.get('numero_factura') and
            updated_invoice.get('nombre_proveedor') == initial_invoice.get('nombre_proveedor') and
            updated_invoice.get('monto') == initial_invoice.get('monto') and
            updated_invoice.get('estado_pago') == initial_invoice.get('estado_pago')
        )
        
        if invoice_intact:
            self.test_step("Invoice data intact", True, 
                          f"All key fields preserved: {updated_invoice.get('numero_factura', 'N/A')}")
        else:
            return self.test_step("Invoice data intact", False, "Invoice data was corrupted")
        
        # Step 7: Test error handling - try to delete again (should return 404)
        self.log("Step 7: Testing error handling (delete non-existent comprobante)...")
        try:
            response = requests.delete(f"{self.api_url}/invoices/{self.test_invoice_id}/delete-comprobante")
            
            if response.status_code == 404:
                self.test_step("Error handling - no comprobante", True, 
                              "Properly returns 404 when no comprobante exists")
            else:
                return self.test_step("Error handling - no comprobante", False, 
                                    f"Expected 404, got {response.status_code}")
        except Exception as e:
            return self.test_step("Error handling - no comprobante", False, f"Exception: {e}")
        
        # Step 8: Test download after deletion (should return 404)
        self.log("Step 8: Testing download after deletion...")
        try:
            response = requests.get(f"{self.api_url}/invoices/{self.test_invoice_id}/download-comprobante")
            
            if response.status_code == 404:
                self.test_step("Download after deletion", True, 
                              "Download properly returns 404 after deletion")
            else:
                return self.test_step("Download after deletion", False, 
                                    f"Expected 404, got {response.status_code}")
        except Exception as e:
            return self.test_step("Download after deletion", False, f"Exception: {e}")
        
        print("\n🎉 ALL DELETE COMPROBANTE TESTS PASSED!")
        return True

    def test_error_cases(self):
        """Test error handling for DELETE comprobante"""
        print("\n🚫 Testing DELETE Comprobante Error Cases")
        print("=" * 50)
        
        # Test 1: Delete from non-existent invoice
        self.log("Test 1: Delete comprobante from non-existent invoice...")
        try:
            response = requests.delete(f"{self.api_url}/invoices/non-existent-id/delete-comprobante")
            
            if response.status_code == 404:
                self.test_step("Non-existent invoice error", True, "Properly returns 404")
            else:
                self.test_step("Non-existent invoice error", False, 
                              f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.test_step("Non-existent invoice error", False, f"Exception: {e}")
        
        print("\n✅ Error case testing completed")

def main():
    tester = DeleteComprobanteTest()
    
    # Run the main functionality test
    success = tester.test_delete_comprobante_functionality()
    
    # Run error case tests
    tester.test_error_cases()
    
    if success:
        print("\n🎯 DELETE COMPROBANTE FUNCTIONALITY: FULLY WORKING")
        return 0
    else:
        print("\n❌ DELETE COMPROBANTE FUNCTIONALITY: ISSUES FOUND")
        return 1

if __name__ == "__main__":
    exit(main())