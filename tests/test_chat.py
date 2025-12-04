"""Test MIRA chat endpoint with your own prompts"""
import httpx
import json

def chat(message, user_id="test_user"):
    """Send a message to MIRA"""
    url = "http://localhost:8000/chat/"
    payload = {
        "user_id": user_id,
        "message": message
    }
    
    print(f"\n{'='*60}")
    print(f"User: {message}")
    print(f"{'='*60}")
    
    try:
        response = httpx.post(url, json=payload, timeout=30.0)
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ MIRA: {data['answer']}")
            print(f"\n📊 Metadata:")
            print(f"   Sources: {data.get('sources', [])}")
            print(f"   Confidence: {data.get('confidence', 'N/A')}")
            print(f"   RAG Used: {data.get('rag_used', False)}")
            return data
        elif response.status_code == 429:
            error = response.json()
            print(f"\n⚠️ Rate Limited: {error['detail']}")
        else:
            print(f"\n❌ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")

# Test with your prompts
if __name__ == "__main__":
    print("\n🤖 MIRA Chat Test\n")
    
    # Example 1: Simple question
    chat("හෙලෝ MIRA")
    
    # Example 2: Knowledge question
    # chat("ශ්‍රී ලංකාවේ අගනුවර කුමක්ද?")
    
    # Example 3: Follow-up (uses memory)
    # chat("එහි ජනගහනය කීයද?")
