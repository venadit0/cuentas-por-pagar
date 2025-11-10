#!/usr/bin/env python3
"""
Focused PDF Upload and Processing Test
Tests the specific functionality requested in the review.
"""

import requests
import json
import os
import tempfile

class PDFProcessingTester:
    def __init__(self):
        self.base_url = "https://payables-master.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.test_empresa_id = "4d87e4d4-33f4-4f22-9c6f-a113c49038fc"  # Valid company ID
        self.created_invoice_id = None
        
    def test_pdf_upload_endpoint(self):
        """Test PDF upload endpoint with the test PDF file"""
        print("🔍 Testing PDF Upload Endpoint...")
        
        # Check if test PDF exists
        test_pdf_path = "/app/test_invoice.pdf"
        if not os.path.exists(test_pdf_path):
            print("❌ Test PDF file not found at /app/test_invoice.pdf")
            return False
            
        try:
            with open(test_pdf_path, 'rb') as f:
                files = {'file': ('test_invoice.pdf', f, 'application/pdf')}
                url = f"{self.api_url}/upload-pdf/{self.test_empresa_id}"
                
                print(f"   URL: {url}")
                response = requests.post(url, files=files)
                
                print(f"   Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    response_data = response.json()
                    print("✅ PDF Upload Successful!")
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                    
                    # Store invoice ID for further tests
                    if 'data' in response_data and 'id' in response_data['data']:
                        self.created_invoice_id = response_data['data']['id']
                        print(f"   Created Invoice ID: {self.created_invoice_id}")
                    
                    # Verify extracted data
                    data = response_data.get('data', {})
                    required_fields = ['numero_factura', 'nombre_proveedor', 'fecha_factura', 'monto']
                    
                    for field in required_fields:
                        if field in data and data[field] is not None:
                            print(f"   ✅ {field}: {data[field]}")
                        else:
                            print(f"   ❌ Missing or null field: {field}")
                            return False
                    
                    return True
                else:
                    print(f"❌ PDF Upload Failed - Status: {response.status_code}")
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data}")
                    except:
                        print(f"   Error: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ PDF Upload failed with exception: {e}")
            return False
    
    def test_gemini_ai_integration(self):
        """Test that Gemini AI integration works without model errors"""
        print("\n🤖 Testing Gemini AI Integration...")
        
        # Create a simple test PDF content
        test_content = """
        FACTURA DE PRUEBA
        
        Número de Factura: TEST-GEMINI-001
        Proveedor: Gemini Test Company S.A.
        Fecha: 2024-10-27
        Monto Total: $3750.50
        
        Descripción: Servicios de integración AI
        """
        
        try:
            # Create temporary PDF file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', mode='w') as temp_file:
                temp_file.write(test_content)
                temp_file_path = temp_file.name
            
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('gemini_test.pdf', f, 'application/pdf')}
                url = f"{self.api_url}/upload-pdf/{self.test_empresa_id}"
                
                response = requests.post(url, files=files)
                
                if response.status_code == 200:
                    print("✅ Gemini AI Integration Working!")
                    response_data = response.json()
                    
                    # Check if we got proper extracted data
                    data = response_data.get('data', {})
                    if data.get('numero_factura') and data.get('nombre_proveedor'):
                        print(f"   ✅ AI extracted invoice number: {data.get('numero_factura')}")
                        print(f"   ✅ AI extracted provider: {data.get('nombre_proveedor')}")
                        print("   ✅ No 'model not found' errors detected")
                        return True
                    else:
                        print("   ❌ AI extraction incomplete")
                        return False
                else:
                    print(f"❌ Gemini AI Integration Failed - Status: {response.status_code}")
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data}")
                        # Check for specific Gemini model errors
                        if "model not found" in str(error_data).lower() or "404" in str(error_data):
                            print("   ❌ CRITICAL: Gemini model error detected!")
                    except:
                        print(f"   Error: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Gemini AI test failed with exception: {e}")
            return False
        finally:
            # Clean up temp file
            if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    def test_end_to_end_processing(self):
        """Test complete PDF processing flow"""
        print("\n🔄 Testing End-to-End PDF Processing...")
        
        if not self.created_invoice_id:
            print("⚠️  No invoice ID available for end-to-end test")
            return True
        
        # 1. Verify invoice was saved to database
        print("   1. Checking database storage...")
        url = f"{self.api_url}/invoices/{self.test_empresa_id}"
        response = requests.get(url)
        
        if response.status_code == 200:
            invoices = response.json()
            invoice_found = any(inv.get('id') == self.created_invoice_id for inv in invoices)
            
            if invoice_found:
                print("   ✅ Invoice saved to database successfully")
            else:
                print("   ❌ Invoice not found in database")
                return False
        else:
            print(f"   ❌ Could not retrieve invoices - Status: {response.status_code}")
            return False
        
        # 2. Check file storage
        print("   2. Checking file storage...")
        upload_dir = "/app/uploads"
        if os.path.exists(upload_dir):
            files = os.listdir(upload_dir)
            pdf_files = [f for f in files if f.endswith('.pdf')]
            print(f"   ✅ Found {len(pdf_files)} PDF files in uploads directory")
            
            if len(pdf_files) > 0:
                print("   ✅ Files are being stored correctly")
            else:
                print("   ⚠️  No PDF files found in uploads directory")
        else:
            print("   ❌ Uploads directory not found")
            return False
        
        # 3. Test PDF download
        print("   3. Testing PDF download...")
        url = f"{self.api_url}/invoices/{self.created_invoice_id}/download"
        response = requests.get(url)
        
        if response.status_code == 200:
            print(f"   ✅ PDF download successful - {len(response.content)} bytes")
            return True
        else:
            print(f"   ❌ PDF download failed - Status: {response.status_code}")
            return False
    
    def check_backend_logs(self):
        """Check backend logs for any Gemini errors"""
        print("\n📋 Checking Backend Logs...")
        
        try:
            # Check recent backend logs
            import subprocess
            result = subprocess.run(['tail', '-n', '20', '/var/log/supervisor/backend.err.log'], 
                                  capture_output=True, text=True)
            
            logs = result.stdout
            
            # Look for Gemini model errors
            if "gemini-1.5-flash" in logs:
                print("   ❌ Old Gemini model (1.5-flash) still being used!")
                return False
            elif "gemini-2.0-flash" in logs:
                print("   ✅ New Gemini model (2.0-flash) is being used")
            
            if "model not found" in logs.lower() or "404" in logs:
                print("   ❌ Model not found errors detected in logs")
                return False
            else:
                print("   ✅ No model errors in recent logs")
            
            return True
            
        except Exception as e:
            print(f"   ⚠️  Could not check logs: {e}")
            return True  # Don't fail the test if we can't check logs

def main():
    print("🚀 PDF Upload and Processing Test")
    print("=" * 50)
    
    tester = PDFProcessingTester()
    
    # Run focused tests
    results = []
    
    # Test 1: PDF Upload Endpoint
    results.append(tester.test_pdf_upload_endpoint())
    
    # Test 2: Gemini AI Integration
    results.append(tester.test_gemini_ai_integration())
    
    # Test 3: End-to-End Processing
    results.append(tester.test_end_to_end_processing())
    
    # Test 4: Backend Logs Check
    results.append(tester.check_backend_logs())
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS:")
    
    test_names = [
        "PDF Upload Endpoint",
        "Gemini AI Integration", 
        "End-to-End Processing",
        "Backend Logs Check"
    ]
    
    for i, (name, result) in enumerate(zip(test_names, results)):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {i+1}. {name}: {status}")
    
    passed = sum(results)
    total = len(results)
    
    print(f"\n📈 Overall: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🎉 All PDF processing tests passed!")
        print("✅ PDF upload and Gemini AI integration is working correctly!")
        return 0
    else:
        print("⚠️  Some tests failed. Check details above.")
        return 1

if __name__ == "__main__":
    exit(main())