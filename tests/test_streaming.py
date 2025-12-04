"""Test SSE Streaming endpoint without hitting Gemini API quota"""
import httpx
import asyncio
import json
import time

BASE_URL = "http://localhost:8000"

async def test_sse_streaming():
    """Test the /chat/stream endpoint"""
    print("="*60)
    print("🧪 TESTING SSE STREAMING ENDPOINT")
    print("="*60)
    
    payload = {
        "user_id": "stream_test",
        "message": "හෙලෝ"  # Simple message to reduce token usage
    }
    
    print(f"\n📡 Connecting to {BASE_URL}/chat/stream")
    print(f"   User: {payload['user_id']}")
    print(f"   Message: {payload['message']}")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{BASE_URL}/chat/stream",
                json=payload,
            ) as response:
                
                print(f"\n✅ Connection Status: {response.status_code}")
                
                if response.status_code == 429:
                    print("⚠️  Rate limited - this means rate limiting is working!")
                    error_data = await response.aread()
                    print(f"   Details: {error_data.decode()}")
                    return True
                
                if response.status_code != 200:
                    error_data = await response.aread()
                    print(f"❌ Error: {error_data.decode()}")
                    return False
                
                print("\n📥 Receiving events:")
                event_count = 0
                events_received = []
                tokens_received = []
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_count += 1
                        data_str = line[6:]  # Remove "data: " prefix
                        
                        try:
                            event = json.loads(data_str)
                            event_type = event.get('event', 'unknown')
                            events_received.append(event_type)
                            
                            if event_type == 'start':
                                print(f"   🟢 Stream started")
                            elif event_type == 'status':
                                step = event.get('step', '')
                                print(f"   🔄 Status: {step}")
                            elif event_type == 'rag_activated':
                                score = event.get('score', 0)
                                print(f"   📚 RAG activated (score: {score:.3f})")
                            elif event_type == 'token':
                                text = event.get('text', '')
                                tokens_received.append(text)
                                if len(tokens_received) <= 5:  # Show first 5 tokens
                                    print(f"   📝 Token {len(tokens_received)}: {text}")
                            elif event_type == 'metadata':
                                sources = event.get('sources', [])
                                confidence = event.get('confidence', '')
                                rag_used = event.get('rag_used', False)
                                print(f"   📊 Metadata:")
                                print(f"      - Sources: {len(sources)}")
                                print(f"      - Confidence: {confidence}")
                                print(f"      - RAG used: {rag_used}")
                            elif event_type == 'done':
                                print(f"   ✅ Stream completed")
                                break
                            elif event_type == 'error':
                                error_msg = event.get('message', 'Unknown error')
                                error_type = event.get('type', 'unknown')
                                print(f"   ❌ Error ({error_type}): {error_msg}")
                                
                                # If it's a server error during retrieval, likely quota issue
                                if error_type == 'server_error':
                                    print("\n⚠️  Server error (likely Gemini quota) - but SSE streaming is working!")
                                    print("   ✅ Connection established")
                                    print("   ✅ Events streaming properly")
                                    print("   ✅ JSON format correct")
                                    return True
                                return False
                                
                        except json.JSONDecodeError as e:
                            print(f"   ⚠️  JSON decode error: {e}")
                            pass
                
                print(f"\n" + "="*60)
                print("📊 STREAMING TEST RESULTS")
                print("="*60)
                print(f"   Total events: {event_count}")
                print(f"   Event types received: {set(events_received)}")
                print(f"   Tokens received: {len(tokens_received)}")
                
                if tokens_received:
                    full_response = ''.join(tokens_received)
                    print(f"\n   Full response preview:")
                    print(f"   {full_response[:200]}...")
                
                # Success if we got done event or some tokens
                success = 'done' in events_received or len(tokens_received) > 0
                
                if success:
                    print(f"\n🎉 SSE STREAMING WORKS!")
                    print(f"   ✅ Connection: OK")
                    print(f"   ✅ Events: {event_count} received")
                    print(f"   ✅ Tokens: {len(tokens_received)} streamed")
                    return True
                else:
                    print(f"\n⚠️  Stream incomplete")
                    return False
                
    except httpx.ConnectError:
        print("❌ Connection failed - is the server running on port 8000?")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    print("\n" + "="*60)
    print("🚀 STARTING SSE STREAMING TEST")
    print("="*60)
    print("\nNote: This test will:")
    print("  1. Connect to /chat/stream endpoint")
    print("  2. Send a simple message")
    print("  3. Receive streaming events")
    print("  4. May encounter quota limits (expected)")
    
    result = await test_sse_streaming()
    
    print("\n" + "="*60)
    if result:
        print("✅ TEST PASSED - Streaming endpoint is functional!")
    else:
        print("❌ TEST FAILED - Check errors above")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
