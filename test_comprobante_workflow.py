#!/usr/bin/env python3
"""
Complete comprobante workflow test:
1. Create invoice → 2. Upload comprobante → 3. Verify upload → 4. Delete comprobante → 5. Verify deletion → 6. Re-upload
"""

import requests
import os
import json

class ComprobanteWorkflowTest:
    def __init__(self):
        self.base_url = "https://invoice-genius-58.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.test_empresa_id = "4d87e4d4-33f4-4f22-9c6f-a113c49038fc"  # UHM NOGALES SONORA
        self.created_invoice_id = None
        
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

    def create_test_invoice(self):
        """Create a test invoice by uploading a PDF"""
        self.log("Creating test invoice...")
        
        # Create a simple invoice data manually since PDF upload might fail with Gemini
        invoice_data = {
            "empresa_id": self.test_empresa_id,
            "numero_factura": "TEST-WORKFLOW-001",
            "nombre_proveedor": "Test Workflow Provider",
            "fecha_factura": "2024-01-15",
            "monto": 1500.00
        }
        
        # We'll create the invoice directly in the database using a manual approach
        # Since PDF upload with Gemini is failing, let's use the existing invoice creation method
        
        # For this test, let's use a different approach - create via direct API if available
        # or use an existing invoice. Let's check if we can create via a different method
        
        # Actually, let's try to upload a real PDF file that might work with Gemini
        try:
            # Use the comprobante test file as an invoice (it's a valid PDF)
            if os.path.exists('/app/comprobante_test.pdf'):
                with open('/app/comprobante_test.pdf', 'rb') as f:
                    files = {'file': ('test_workflow_invoice.pdf', f, 'application/pdf')}
                    response = requests.post(f"{self.api_url}/upload-pdf/{self.test_empresa_id}", files=files)
                    
                    if response.status_code == 200:
                        response_data = response.json()
                        if 'data' in response_data:
                            self.created_invoice_id = response_data['data'].get('id')
                            return self.test_step("Create test invoice", True, 
                                                f"Invoice ID: {self.created_invoice_id}")
                    
                    return self.test_step("Create test invoice", False, 
                                        f"Upload failed: {response.status_code} - {response.text}")
            else:
                return self.test_step("Create test invoice", False, "Test PDF file not found")
                
        except Exception as e:
            return self.test_step("Create test invoice", False, f"Exception: {e}")

    def upload_comprobante(self):
        """Upload a comprobante to the test invoice"""
        if not self.created_invoice_id:
            return self.test_step("Upload comprobante", False, "No invoice ID available")
        
        self.log("Uploading comprobante...")
        
        try:
            if os.path.exists('/app/comprobante_test.pdf'):
                with open('/app/comprobante_test.pdf', 'rb') as f:
                    files = {'file': ('workflow_comprobante.pdf', f, 'application/pdf')}
                    response = requests.post(
                        f"{self.api_url}/invoices/{self.created_invoice_id}/upload-comprobante", 
                        files=files
                    )
                    
                    if response.status_code == 200:
                        response_data = response.json()
                        comprobante_filename = response_data.get('comprobante_filename')
                        return self.test_step("Upload comprobante", True, 
                                            f"Filename: {comprobante_filename}")
                    else:
                        return self.test_step("Upload comprobante", False, 
                                            f"Status: {response.status_code} - {response.text}")
            else:
                return self.test_step("Upload comprobante", False, "Comprobante test file not found")
                
        except Exception as e:
            return self.test_step("Upload comprobante", False, f"Exception: {e}")

    def verify_comprobante_upload(self):
        """Verify the comprobante was uploaded correctly"""
        if not self.created_invoice_id:
            return self.test_step("Verify comprobante upload", False, "No invoice ID available")
        
        self.log("Verifying comprobante upload...")
        
        try:
            # Test download
            response = requests.get(f"{self.api_url}/invoices/{self.created_invoice_id}/download-comprobante")
            
            if response.status_code == 200:
                file_size = len(response.content)
                return self.test_step("Verify comprobante upload", True, 
                                    f"Download successful, size: {file_size} bytes")
            else:
                return self.test_step("Verify comprobante upload", False, 
                                    f"Download failed: {response.status_code}")
                
        except Exception as e:
            return self.test_step("Verify comprobante upload", False, f"Exception: {e}")

    def delete_comprobante(self):
        """Delete the comprobante"""
        if not self.created_invoice_id:
            return self.test_step("Delete comprobante", False, "No invoice ID available")
        
        self.log("Deleting comprobante...")
        
        try:
            response = requests.delete(f"{self.api_url}/invoices/{self.created_invoice_id}/delete-comprobante")
            
            if response.status_code == 200:
                response_data = response.json()
                return self.test_step("Delete comprobante", True, 
                                    f"Message: {response_data.get('message', 'Success')}")
            else:
                return self.test_step("Delete comprobante", False, 
                                    f"Status: {response.status_code} - {response.text}")
                
        except Exception as e:
            return self.test_step("Delete comprobante", False, f"Exception: {e}")

    def verify_comprobante_deletion(self):
        """Verify the comprobante was deleted correctly"""
        if not self.created_invoice_id:
            return self.test_step("Verify comprobante deletion", False, "No invoice ID available")
        
        self.log("Verifying comprobante deletion...")
        
        try:
            # Test download should fail
            response = requests.get(f"{self.api_url}/invoices/{self.created_invoice_id}/download-comprobante")
            
            if response.status_code == 404:
                return self.test_step("Verify comprobante deletion", True, 
                                    "Download properly returns 404")
            else:
                return self.test_step("Verify comprobante deletion", False, 
                                    f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            return self.test_step("Verify comprobante deletion", False, f"Exception: {e}")

    def verify_invoice_intact(self):
        """Verify the invoice is still accessible after comprobante deletion"""
        if not self.created_invoice_id:
            return self.test_step("Verify invoice intact", False, "No invoice ID available")
        
        self.log("Verifying invoice is still intact...")
        
        try:
            # Get all invoices for the company
            response = requests.get(f"{self.api_url}/invoices/{self.test_empresa_id}")
            
            if response.status_code == 200:
                invoices = response.json()
                
                # Find our invoice
                test_invoice = None
                for inv in invoices:
                    if inv.get('id') == self.created_invoice_id:
                        test_invoice = inv
                        break
                
                if test_invoice:
                    # Check that comprobante fields are cleared but invoice data is intact
                    comprobante_cleared = (
                        test_invoice.get('comprobante_pago') is None and 
                        test_invoice.get('comprobante_original') is None
                    )
                    
                    invoice_data_intact = (
                        test_invoice.get('numero_factura') and
                        test_invoice.get('nombre_proveedor') and
                        test_invoice.get('monto') is not None
                    )
                    
                    if comprobante_cleared and invoice_data_intact:
                        return self.test_step("Verify invoice intact", True, 
                                            f"Invoice {test_invoice.get('numero_factura')} intact, comprobante cleared")
                    else:
                        return self.test_step("Verify invoice intact", False, 
                                            f"Comprobante cleared: {comprobante_cleared}, Data intact: {invoice_data_intact}")
                else:
                    return self.test_step("Verify invoice intact", False, "Invoice not found")
            else:
                return self.test_step("Verify invoice intact", False, 
                                    f"Status: {response.status_code}")
                
        except Exception as e:
            return self.test_step("Verify invoice intact", False, f"Exception: {e}")

    def re_upload_comprobante(self):
        """Test re-uploading a comprobante after deletion"""
        if not self.created_invoice_id:
            return self.test_step("Re-upload comprobante", False, "No invoice ID available")
        
        self.log("Re-uploading comprobante after deletion...")
        
        try:
            if os.path.exists('/app/comprobante_test.pdf'):
                with open('/app/comprobante_test.pdf', 'rb') as f:
                    files = {'file': ('workflow_comprobante_reupload.pdf', f, 'application/pdf')}
                    response = requests.post(
                        f"{self.api_url}/invoices/{self.created_invoice_id}/upload-comprobante", 
                        files=files
                    )
                    
                    if response.status_code == 200:
                        response_data = response.json()
                        comprobante_filename = response_data.get('comprobante_filename')
                        return self.test_step("Re-upload comprobante", True, 
                                            f"Re-upload successful: {comprobante_filename}")
                    else:
                        return self.test_step("Re-upload comprobante", False, 
                                            f"Status: {response.status_code} - {response.text}")
            else:
                return self.test_step("Re-upload comprobante", False, "Comprobante test file not found")
                
        except Exception as e:
            return self.test_step("Re-upload comprobante", False, f"Exception: {e}")

    def cleanup_test_invoice(self):
        """Clean up the test invoice"""
        if not self.created_invoice_id:
            return
        
        self.log("Cleaning up test invoice...")
        
        try:
            response = requests.delete(f"{self.api_url}/invoices/{self.created_invoice_id}")
            if response.status_code == 200:
                self.test_step("Cleanup test invoice", True, "Invoice deleted")
            else:
                self.test_step("Cleanup test invoice", False, f"Status: {response.status_code}")
        except Exception as e:
            self.test_step("Cleanup test invoice", False, f"Exception: {e}")

    def run_complete_workflow(self):
        """Run the complete comprobante workflow test"""
        print("🚀 Complete Comprobante Workflow Test")
        print("=" * 60)
        
        success = True
        
        # Step 1: Create test invoice
        if not self.create_test_invoice():
            success = False
        
        # Step 2: Upload comprobante
        if success and not self.upload_comprobante():
            success = False
        
        # Step 3: Verify upload
        if success and not self.verify_comprobante_upload():
            success = False
        
        # Step 4: Delete comprobante
        if success and not self.delete_comprobante():
            success = False
        
        # Step 5: Verify deletion
        if success and not self.verify_comprobante_deletion():
            success = False
        
        # Step 6: Verify invoice is still intact
        if success and not self.verify_invoice_intact():
            success = False
        
        # Step 7: Test re-upload after deletion
        if success and not self.re_upload_comprobante():
            success = False
        
        # Cleanup
        self.cleanup_test_invoice()
        
        if success:
            print("\n🎉 COMPLETE WORKFLOW TEST: ALL STEPS PASSED!")
            print("✅ Create invoice → Upload comprobante → Verify → Delete → Verify deletion → Re-upload")
        else:
            print("\n❌ COMPLETE WORKFLOW TEST: SOME STEPS FAILED")
        
        return success

def main():
    tester = ComprobanteWorkflowTest()
    success = tester.run_complete_workflow()
    
    if success:
        print("\n🎯 COMPROBANTE WORKFLOW: FULLY FUNCTIONAL")
        return 0
    else:
        print("\n❌ COMPROBANTE WORKFLOW: ISSUES FOUND")
        return 1

if __name__ == "__main__":
    exit(main())