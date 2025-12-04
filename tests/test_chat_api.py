#!/usr/bin/env python3
"""Test the chat API endpoint"""
import requests
import json

def test_chat():
    url = "http://localhost:8000/chat/"
    
    payload = {
        "user_id": "test_user",
        "message": "හෙලෝ"
    }
    
    print(f"Testing: {url}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False)}\n")
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {response.elapsed.total_seconds():.2f}s")
        print(f"\nResponse Body:")
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        
        if response.status_code == 200:
            print("\n✅ SUCCESS!")
        else:
            print(f"\n❌ FAILED with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_chat()
