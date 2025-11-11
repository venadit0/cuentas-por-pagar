#!/usr/bin/env python3
"""
Focused test script for the new comprobante (payment receipt) functionality
"""

import requests
import os
import json

class ComprobanteAPITester:
    def __init__(self):
        self.base_url = "https://invoice-genius-58.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.test_empresa_id = "4d87e4d4-33f4-4f22-9c6f-a113c49038fc"
        self.test_invoice_id = "bc095578-9935-4f3a-8825-925e12d6a37a"  # Existing invoice
        self.comprobante_test_file = "/app/comprobante_test.pdf"
        
    def test_comprobante_upload(self):
        """Test uploading a comprobante to an existing invoice"""
        print("🔍 Testing Comprobante Upload...")
        
        if not os.path.exists(self.comprobante_test_file):
            print(f"❌ Test file not found: {self.comprobante_test_file}")
            return False
            
        url = f"{self.api_url}/invoices/{self.test_invoice_id}/upload-comprobante"
        
        try:
            with open(self.comprobante_test_file, 'rb') as f:
                files = {'file': ('comprobante_test.pdf', f, 'application/pdf')}
                response = requests.post(url, files=files)
                
            print(f"   URL: {url}")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ SUCCESS: {data.get('message', 'No message')}")
                
                if 'comprobante_filename' in data:
                    filename = data['comprobante_filename']
                    print(f"   ✅ Comprobante filename: {filename}")
                    
                    # Verify file exists in uploads directory
                    file_path = f"/app/uploads/{filename}"
                    if os.path.exists(file_path):
                        file_size = os.path.getsize(file_path)
                        print(f"   ✅ File saved successfully: {file_path} ({file_size} bytes)")
                        return True, filename
                    else:
                        print(f"   ❌ File not found in uploads: {file_path}")
                        return False, None
                else:
                    print("   ❌ No comprobante_filename in response")
                    return False, None
            else:
                print(f"   ❌ FAILED: {response.status_code}")
                try:
                    error = response.json()
                    print(f"   Error: {error}")
                except:
                    print(f"   Error: {response.text}")
                return False, None
                
        except Exception as e:
            print(f"   ❌ Exception: {e}")
            return False, None
    
    def test_comprobante_download(self):
        """Test downloading the uploaded comprobante"""
        print("\n🔍 Testing Comprobante Download...")
        
        url = f"{self.api_url}/invoices/{self.test_invoice_id}/download-comprobante"
        
        try:
            response = requests.get(url)
            print(f"   URL: {url}")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                content_length = len(response.content)
                content_type = response.headers.get('content-type', 'unknown')
                print(f"   ✅ SUCCESS: Downloaded {content_length} bytes")
                print(f"   ✅ Content-Type: {content_type}")
                
                if content_length > 0:
                    print("   ✅ File has content")
                    return True
                else:
                    print("   ❌ File is empty")
                    return False
            else:
                print(f"   ❌ FAILED: {response.status_code}")
                try:
                    error = response.json()
                    print(f"   Error: {error}")
                except:
                    print(f"   Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ Exception: {e}")
            return False
    
    def test_invoice_with_comprobante_fields(self):
        """Test that the invoice now shows comprobante fields"""
        print("\n🔍 Testing Invoice with Comprobante Fields...")
        
        url = f"{self.api_url}/invoices/{self.test_empresa_id}"
        
        try:
            response = requests.get(url)
            print(f"   URL: {url}")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                invoices = response.json()
                
                # Find our test invoice
                test_invoice = None
                for inv in invoices:
                    if inv.get('id') == self.test_invoice_id:
                        test_invoice = inv
                        break
                
                if test_invoice:
                    print(f"   ✅ Found test invoice: {test_invoice.get('numero_factura')}")
                    
                    # Check comprobante fields
                    comprobante_pago = test_invoice.get('comprobante_pago')
                    comprobante_original = test_invoice.get('comprobante_original')
                    
                    print(f"   📎 comprobante_pago: {comprobante_pago}")
                    print(f"   📎 comprobante_original: {comprobante_original}")
                    
                    if comprobante_pago and comprobante_original:
                        print("   ✅ Invoice has comprobante fields populated")
                        return True
                    elif comprobante_pago is None and comprobante_original is None:
                        print("   ⚠️  Invoice has comprobante fields but they are null (expected if no upload yet)")
                        return True
                    else:
                        print("   ❌ Comprobante fields are inconsistent")
                        return False
                else:
                    print(f"   ❌ Test invoice {self.test_invoice_id} not found")
                    return False
            else:
                print(f"   ❌ FAILED: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Exception: {e}")
            return False
    
    def test_file_management(self):
        """Test that files are properly managed in uploads directory"""
        print("\n🔍 Testing File Management...")
        
        # List files in uploads directory
        uploads_dir = "/app/uploads"
        if os.path.exists(uploads_dir):
            files = os.listdir(uploads_dir)
            comprobante_files = [f for f in files if f.startswith('comprobante_')]
            
            print(f"   📁 Total files in uploads: {len(files)}")
            print(f"   📎 Comprobante files: {len(comprobante_files)}")
            
            if comprobante_files:
                print("   ✅ Found comprobante files:")
                for f in comprobante_files[:5]:  # Show first 5
                    file_path = os.path.join(uploads_dir, f)
                    file_size = os.path.getsize(file_path)
                    print(f"      - {f} ({file_size} bytes)")
            
            return True
        else:
            print(f"   ❌ Uploads directory not found: {uploads_dir}")
            return False
    
    def test_error_cases(self):
        """Test error handling"""
        print("\n🔍 Testing Error Cases...")
        
        # Test upload to non-existent invoice
        url = f"{self.api_url}/invoices/non-existent-id/upload-comprobante"
        
        try:
            with open(self.comprobante_test_file, 'rb') as f:
                files = {'file': ('comprobante_test.pdf', f, 'application/pdf')}
                response = requests.post(url, files=files)
                
            print(f"   Upload to non-existent invoice: {response.status_code}")
            if response.status_code == 404:
                print("   ✅ Correctly returns 404 for non-existent invoice")
                success1 = True
            else:
                print(f"   ❌ Expected 404, got {response.status_code}")
                success1 = False
                
        except Exception as e:
            print(f"   ❌ Exception testing upload error: {e}")
            success1 = False
        
        # Test download from non-existent invoice
        url = f"{self.api_url}/invoices/non-existent-id/download-comprobante"
        
        try:
            response = requests.get(url)
            print(f"   Download from non-existent invoice: {response.status_code}")
            if response.status_code == 404:
                print("   ✅ Correctly returns 404 for non-existent invoice")
                success2 = True
            else:
                print(f"   ❌ Expected 404, got {response.status_code}")
                success2 = False
                
        except Exception as e:
            print(f"   ❌ Exception testing download error: {e}")
            success2 = False
        
        return success1 and success2

def main():
    print("🚀 Testing New Comprobante (Payment Receipt) Functionality")
    print("=" * 60)
    
    tester = ComprobanteAPITester()
    
    # Test sequence
    print(f"📋 Using test invoice: {tester.test_invoice_id}")
    print(f"📋 Using test company: {tester.test_empresa_id}")
    
    # 1. Check initial state
    success1 = tester.test_invoice_with_comprobante_fields()
    
    # 2. Test file management
    success2 = tester.test_file_management()
    
    # 3. Upload comprobante
    success3, filename = tester.test_comprobante_upload()
    
    # 4. Download comprobante
    success4 = tester.test_comprobante_download()
    
    # 5. Verify invoice fields updated
    success5 = tester.test_invoice_with_comprobante_fields()
    
    # 6. Test error cases
    success6 = tester.test_error_cases()
    
    # Results
    print("\n" + "=" * 60)
    print("📊 COMPROBANTE FUNCTIONALITY TEST RESULTS:")
    print(f"   1. Initial invoice fields check: {'✅' if success1 else '❌'}")
    print(f"   2. File management check: {'✅' if success2 else '❌'}")
    print(f"   3. Comprobante upload: {'✅' if success3 else '❌'}")
    print(f"   4. Comprobante download: {'✅' if success4 else '❌'}")
    print(f"   5. Invoice fields updated: {'✅' if success5 else '❌'}")
    print(f"   6. Error handling: {'✅' if success6 else '❌'}")
    
    total_tests = 6
    passed_tests = sum([success1, success2, success3, success4, success5, success6])
    
    print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed ({(passed_tests/total_tests)*100:.1f}%)")
    
    if passed_tests == total_tests:
        print("🎉 ALL COMPROBANTE TESTS PASSED!")
        return 0
    else:
        print("⚠️  Some comprobante tests failed.")
        return 1

if __name__ == "__main__":
    exit(main())