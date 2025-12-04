#!/usr/bin/env python3
"""Test conversation continuity with memory"""
import requests
import json

def chat(message, user_id="test_user"):
    """Send a message and get response"""
    url = "http://localhost:8000/chat/"
    
    payload = {
        "user_id": user_id,
        "message": message
    }
    
    print(f"\n{'='*60}")
    print(f"👤 User ({user_id}): {message}")
    print(f"{'='*60}")
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"🤖 MIRA: {data['answer']}\n")
            print(f"   RAG: {data['rag_used']} | Confidence: {data['confidence']}")
            if data['sources']:
                print(f"   Sources: {', '.join(data['sources'])}")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("MIRA CONVERSATION TEST - Memory Demonstration")
    print("="*60)
    
    # Same user - conversation continues
    print("\n--- CONVERSATION 1: Same User (user_123) ---")
    chat("හෙලෝ", user_id="user_123")
    chat("මගේ නම කාවින්ද", user_id="user_123")
    chat("මගේ නම මොකද්ද?", user_id="user_123")  # Should remember "කාවින්ද"
    
    # Different user - new conversation
    print("\n\n--- CONVERSATION 2: Different User (user_456) ---")
    chat("මගේ නම කාවින්ද කියලා මම කිව්වද?", user_id="user_456")  # Should say NO
    
    print("\n" + "="*60)
    print("Test complete!")
    print("="*60)
