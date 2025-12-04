#!/usr/bin/env python3
"""Simple conversation test - send multiple messages with same user_id"""
import requests
import json
import time

url = "http://localhost:8000/chat/"

def send_message(message, user_id="conversation_test"):
    payload = {"user_id": user_id, "message": message}
    print(f"\n👤 You: {message}")
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"🤖 MIRA: {data['answer'][:200]}...")
            return True
        else:
            print(f"❌ Error {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

# Test conversation
print("="*60)
print("Testing Conversation Memory")
print("="*60)

send_message("හෙලෝ")
time.sleep(1)
send_message("මගේ නම සාමන්")
time.sleep(1)
send_message("මගේ නම මොකද්ද?")  # Should remember "සාමන්"

print("\n" + "="*60)
