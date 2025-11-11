#!/usr/bin/env python3
"""
Test with the actual test_invoice.pdf file
"""

import requests
import json

def test_real_pdf():
    """Test with the actual test_invoice.pdf file"""
    
    base_url = "https://invoice-genius-58.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    test_empresa_id = "4d87e4d4-33f4-4f22-9c6f-a113c49038fc"
    
    print("🔍 Testing with real test_invoice.pdf...")
    
    try:
        with open('/app/test_invoice.pdf', 'rb') as f:
            files = {'file': ('test_invoice.pdf', f, 'application/pdf')}
            url = f"{api_url}/upload-pdf/{test_empresa_id}"
            
            print(f"   URL: {url}")
            print(f"   File size: {len(f.read())} bytes")
            f.seek(0)  # Reset file pointer
            
            response = requests.post(url, files=files)
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                print("✅ PDF Upload with real PDF Successful!")
                print(f"   Response: {json.dumps(response_data, indent=2)}")
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
        print(f"❌ Test failed with exception: {e}")
        return False

if __name__ == "__main__":
    success = test_real_pdf()
    if success:
        print("\n🎉 Real PDF test passed!")
    else:
        print("\n❌ Real PDF test failed!")