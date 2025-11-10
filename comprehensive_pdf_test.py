#!/usr/bin/env python3
"""
Comprehensive PDF Processing Test
Tests all success criteria from the review request.
"""

import requests
import json
import os
import subprocess

class ComprehensivePDFTest:
    def __init__(self):
        self.base_url = "https://payables-master.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.test_empresa_id = "4d87e4d4-33f4-4f22-9c6f-a113c49038fc"
        self.created_invoice_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.test_results.append({
            'name': test_name,
            'success': success,
            'details': details
        })
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
    
    def test_pdf_upload_completes_without_errors(self):
        """SUCCESS CRITERIA: PDF upload completes without errors"""
        print("\n🔍 Testing: PDF upload completes without errors")
        
        try:
            with open('/app/test_invoice.pdf', 'rb') as f:
                files = {'file': ('test_invoice.pdf', f, 'application/pdf')}
                url = f"{self.api_url}/upload-pdf/{self.test_empresa_id}"
                
                response = requests.post(url, files=files)
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get('success'):
                        self.created_invoice_id = response_data['data']['id']
                        self.log_result("PDF upload completes without errors", True, 
                                      f"Invoice created with ID: {self.created_invoice_id}")
                        return True
                    else:
                        self.log_result("PDF upload completes without errors", False, 
                                      "Response indicates failure")
                        return False
                else:
                    error_msg = f"HTTP {response.status_code}"
                    try:
                        error_data = response.json()
                        error_msg += f": {error_data.get('detail', 'Unknown error')}"
                    except:
                        pass
                    self.log_result("PDF upload completes without errors", False, error_msg)
                    return False
                    
        except Exception as e:
            self.log_result("PDF upload completes without errors", False, str(e))
            return False
    
    def test_gemini_ai_processes_pdf_successfully(self):
        """SUCCESS CRITERIA: Gemini AI successfully processes PDF and extracts data"""
        print("\n🔍 Testing: Gemini AI successfully processes PDF and extracts data")
        
        if not self.created_invoice_id:
            self.log_result("Gemini AI processes PDF successfully", False, 
                          "No invoice created to verify")
            return False
        
        # Get the created invoice to verify extraction
        try:
            url = f"{self.api_url}/invoices/{self.test_empresa_id}"
            response = requests.get(url)
            
            if response.status_code == 200:
                invoices = response.json()
                created_invoice = None
                
                for invoice in invoices:
                    if invoice.get('id') == self.created_invoice_id:
                        created_invoice = invoice
                        break
                
                if created_invoice:
                    # Verify all required fields were extracted
                    required_fields = ['numero_factura', 'nombre_proveedor', 'fecha_factura', 'monto']
                    extracted_fields = []
                    
                    for field in required_fields:
                        if field in created_invoice and created_invoice[field] is not None:
                            extracted_fields.append(f"{field}: {created_invoice[field]}")
                        else:
                            self.log_result("Gemini AI processes PDF successfully", False, 
                                          f"Missing field: {field}")
                            return False
                    
                    self.log_result("Gemini AI processes PDF successfully", True, 
                                  f"Extracted: {', '.join(extracted_fields)}")
                    return True
                else:
                    self.log_result("Gemini AI processes PDF successfully", False, 
                                  "Created invoice not found")
                    return False
            else:
                self.log_result("Gemini AI processes PDF successfully", False, 
                              f"Could not retrieve invoices: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Gemini AI processes PDF successfully", False, str(e))
            return False
    
    def test_invoice_data_saved_correctly(self):
        """SUCCESS CRITERIA: Invoice data is correctly saved to database"""
        print("\n🔍 Testing: Invoice data is correctly saved to database")
        
        if not self.created_invoice_id:
            self.log_result("Invoice data saved correctly", False, 
                          "No invoice created to verify")
            return False
        
        try:
            # Verify invoice exists in database
            url = f"{self.api_url}/invoices/{self.test_empresa_id}"
            response = requests.get(url)
            
            if response.status_code == 200:
                invoices = response.json()
                invoice_found = any(inv.get('id') == self.created_invoice_id for inv in invoices)
                
                if invoice_found:
                    # Verify invoice can be retrieved individually
                    # Try to download the PDF to confirm it's properly linked
                    download_url = f"{self.api_url}/invoices/{self.created_invoice_id}/download"
                    download_response = requests.get(download_url)
                    
                    if download_response.status_code == 200:
                        self.log_result("Invoice data saved correctly", True, 
                                      f"Invoice saved and PDF accessible ({len(download_response.content)} bytes)")
                        return True
                    else:
                        self.log_result("Invoice data saved correctly", False, 
                                      "Invoice saved but PDF not accessible")
                        return False
                else:
                    self.log_result("Invoice data saved correctly", False, 
                                  "Invoice not found in database")
                    return False
            else:
                self.log_result("Invoice data saved correctly", False, 
                              f"Could not query database: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Invoice data saved correctly", False, str(e))
            return False
    
    def test_no_404_model_errors(self):
        """SUCCESS CRITERIA: No 404 model errors in backend logs"""
        print("\n🔍 Testing: No 404 model errors in backend logs")
        
        try:
            # Check recent backend logs for model errors
            result = subprocess.run(['tail', '-n', '50', '/var/log/supervisor/backend.err.log'], 
                                  capture_output=True, text=True)
            
            logs = result.stdout
            
            # Check for old model usage
            if "gemini-1.5-flash" in logs:
                self.log_result("No 404 model errors", False, 
                              "Old Gemini model (1.5-flash) still being used")
                return False
            
            # Check for model not found errors
            if "model not found" in logs.lower() or "models/gemini-1.5-flash is not found" in logs:
                self.log_result("No 404 model errors", False, 
                              "Model not found errors detected in logs")
                return False
            
            # Check for new model usage
            if "gemini-2.0-flash" in logs:
                self.log_result("No 404 model errors", True, 
                              "New Gemini model (2.0-flash) being used successfully")
                return True
            else:
                self.log_result("No 404 model errors", True, 
                              "No model errors detected in recent logs")
                return True
                
        except Exception as e:
            self.log_result("No 404 model errors", False, f"Could not check logs: {e}")
            return False
    
    def test_files_stored_and_accessible(self):
        """SUCCESS CRITERIA: Files are properly stored and accessible"""
        print("\n🔍 Testing: Files are properly stored and accessible")
        
        try:
            # Check uploads directory exists
            upload_dir = "/app/uploads"
            if not os.path.exists(upload_dir):
                self.log_result("Files stored and accessible", False, 
                              "Uploads directory does not exist")
                return False
            
            # Count PDF files
            files = os.listdir(upload_dir)
            pdf_files = [f for f in files if f.endswith('.pdf')]
            
            if len(pdf_files) == 0:
                self.log_result("Files stored and accessible", False, 
                              "No PDF files found in uploads directory")
                return False
            
            # Test file accessibility if we have a created invoice
            if self.created_invoice_id:
                download_url = f"{self.api_url}/invoices/{self.created_invoice_id}/download"
                response = requests.get(download_url)
                
                if response.status_code == 200 and len(response.content) > 0:
                    self.log_result("Files stored and accessible", True, 
                                  f"{len(pdf_files)} PDF files stored, download working ({len(response.content)} bytes)")
                    return True
                else:
                    self.log_result("Files stored and accessible", False, 
                                  "Files stored but download not working")
                    return False
            else:
                self.log_result("Files stored and accessible", True, 
                              f"{len(pdf_files)} PDF files found in uploads directory")
                return True
                
        except Exception as e:
            self.log_result("Files stored and accessible", False, str(e))
            return False
    
    def test_end_to_end_flow(self):
        """SUCCESS CRITERIA: Complete flow works (Upload → Processing → Storage)"""
        print("\n🔍 Testing: Complete end-to-end flow")
        
        # This is essentially a summary of all previous tests
        upload_success = any(r['name'] == "PDF upload completes without errors" and r['success'] 
                           for r in self.test_results)
        processing_success = any(r['name'] == "Gemini AI processes PDF successfully" and r['success'] 
                               for r in self.test_results)
        storage_success = any(r['name'] == "Invoice data saved correctly" and r['success'] 
                            for r in self.test_results)
        
        if upload_success and processing_success and storage_success:
            self.log_result("Complete end-to-end flow", True, 
                          "Upload → Gemini Processing → Database Storage all working")
            return True
        else:
            failed_steps = []
            if not upload_success:
                failed_steps.append("Upload")
            if not processing_success:
                failed_steps.append("Processing")
            if not storage_success:
                failed_steps.append("Storage")
            
            self.log_result("Complete end-to-end flow", False, 
                          f"Failed steps: {', '.join(failed_steps)}")
            return False
    
    def run_all_tests(self):
        """Run all tests according to success criteria"""
        print("🚀 Comprehensive PDF Processing Test")
        print("Testing all success criteria from review request")
        print("=" * 60)
        
        # Run tests in order
        self.test_pdf_upload_completes_without_errors()
        self.test_gemini_ai_processes_pdf_successfully()
        self.test_invoice_data_saved_correctly()
        self.test_no_404_model_errors()
        self.test_files_stored_and_accessible()
        self.test_end_to_end_flow()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 FINAL TEST RESULTS:")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r['success'])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"{status} {result['name']}")
            if result['details']:
                print(f"    └─ {result['details']}")
        
        print(f"\n📈 Overall Success Rate: {passed}/{total} ({(passed/total)*100:.1f}%)")
        
        if passed == total:
            print("\n🎉 ALL SUCCESS CRITERIA MET!")
            print("✅ PDF processing with Gemini AI integration is fully working")
            print("✅ The gemini-2.0-flash model fix was successful")
            return True
        else:
            print(f"\n⚠️  {total - passed} criteria not met. See details above.")
            return False

def main():
    tester = ComprehensivePDFTest()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())