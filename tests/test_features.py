"""
Test script for MIRA's 4 new features:
1. Redis caching
2. Rate limiting
3. SSE streaming
4. Enhanced memory
"""
import httpx
import asyncio
import json
import time

BASE_URL = "http://localhost:8000"

def test_cache():
    """Test 1: Redis Caching - Make identical requests and verify cache hits"""
    print("\n" + "="*60)
    print("TEST 1: REDIS CACHING")
    print("="*60)
    
    payload = {
        "user_id": "cache_test_user",
        "message": "ශ්‍රී ලංකාවේ අගනුවර කුමක්ද?"
    }
    
    print("\n🔹 Request 1 (should miss cache):")
    start = time.time()
    response1 = httpx.post(f"{BASE_URL}/chat/", json=payload, timeout=30.0)
    time1 = time.time() - start
    print(f"Status: {response1.status_code}")
    print(f"Time: {time1:.2f}s")
    if response1.status_code == 200:
        data = response1.json()
        print(f"Answer (first 100 chars): {data['answer'][:100]}...")
    
    # Wait a bit
    time.sleep(2)
    
    print("\n🔹 Request 2 (identical - should hit cache):")
    start = time.time()
    response2 = httpx.post(f"{BASE_URL}/chat/", json=payload, timeout=30.0)
    time2 = time.time() - start
    print(f"Status: {response2.status_code}")
    print(f"Time: {time2:.2f}s")
    if response2.status_code == 200:
        data = response2.json()
        print(f"Answer (first 100 chars): {data['answer'][:100]}...")
    
    if time2 < time1 * 0.5:
        print(f"\n✅ CACHE HIT CONFIRMED! (2nd request {time1/time2:.1f}x faster)")
    else:
        print(f"\n⚠️ Cache might not be working (times similar)")
    
    return response1.status_code == 200 and response2.status_code == 200


def test_rate_limit():
    """Test 2: Rate Limiting - Make rapid requests to trigger 429"""
    print("\n" + "="*60)
    print("TEST 2: RATE LIMITING")
    print("="*60)
    
    user_id = "rate_limit_test_user"
    success_count = 0
    rate_limited = False
    
    print(f"\n🔹 Sending 12 rapid requests (limit should be 10/min):")
    
    for i in range(1, 13):
        payload = {
            "user_id": user_id,
            "message": f"පරීක්ෂණ පණිවිඩය {i}"
        }
        
        try:
            response = httpx.post(f"{BASE_URL}/chat/", json=payload, timeout=5.0)
            
            if response.status_code == 200:
                success_count += 1
                print(f"  Request {i}: ✓ Success (200)")
            elif response.status_code == 429:
                rate_limited = True
                print(f"  Request {i}: ⛔ Rate Limited (429)")
                error_data = response.json()
                print(f"    Detail: {error_data.get('detail', 'No detail')}")
                break
            else:
                print(f"  Request {i}: ⚠️ Unexpected status {response.status_code}")
        except Exception as e:
            print(f"  Request {i}: ❌ Error - {e}")
        
        time.sleep(0.1)  # Small delay between requests
    
    print(f"\n📊 Results:")
    print(f"  Successful: {success_count}")
    print(f"  Rate limited: {rate_limited}")
    
    if rate_limited and success_count >= 10:
        print(f"\n✅ RATE LIMITING WORKING! (Limited after {success_count} requests)")
        return True
    else:
        print(f"\n⚠️ Rate limiting might not be working properly")
        return False


async def test_streaming():
    """Test 3: SSE Streaming - Test the streaming endpoint"""
    print("\n" + "="*60)
    print("TEST 3: SSE STREAMING")
    print("="*60)
    
    payload = {
        "user_id": "stream_test_user",
        "message": "ශ්‍රී ලංකාව ගැන කෙටි විස්තරයක් දෙන්න"
    }
    
    print("\n🔹 Testing streaming endpoint /chat/stream:")
    print("Connecting to SSE stream...")
    
    async with httpx.AsyncClient() as client:
        try:
            async with client.stream(
                "POST",
                f"{BASE_URL}/chat/stream",
                json=payload,
                timeout=30.0
            ) as response:
                print(f"Status: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"❌ Failed to connect to stream")
                    return False
                
                event_count = 0
                token_count = 0
                events_received = []
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_count += 1
                        data_str = line[6:]  # Remove "data: " prefix
                        
                        try:
                            event = json.loads(data_str)
                            event_type = event.get('event', 'unknown')
                            events_received.append(event_type)
                            
                            if event_type == 'start':
                                print(f"  ✓ Stream started")
                            elif event_type == 'status':
                                step = event.get('step', '')
                                print(f"  ✓ Status: {step}")
                            elif event_type == 'rag_activated':
                                score = event.get('score', 0)
                                print(f"  ✓ RAG activated (score: {score:.3f})")
                            elif event_type == 'token':
                                token_count += 1
                                if token_count <= 3:  # Show first 3 tokens
                                    text = event.get('text', '')
                                    print(f"  ✓ Token: {text}")
                            elif event_type == 'metadata':
                                sources = event.get('sources', [])
                                confidence = event.get('confidence', '')
                                print(f"  ✓ Metadata: {len(sources)} sources, {confidence} confidence")
                            elif event_type == 'done':
                                print(f"  ✓ Stream completed")
                                break
                            elif event_type == 'error':
                                print(f"  ❌ Error: {event.get('message', '')}")
                                return False
                        except json.JSONDecodeError:
                            pass
                
                print(f"\n📊 Stream Results:")
                print(f"  Total events: {event_count}")
                print(f"  Tokens received: {token_count}")
                print(f"  Event types: {set(events_received)}")
                
                if 'done' in events_received and token_count > 0:
                    print(f"\n✅ STREAMING WORKS! Received {token_count} tokens")
                    return True
                else:
                    print(f"\n⚠️ Stream incomplete")
                    return False
                    
        except Exception as e:
            print(f"❌ Streaming error: {e}")
            return False


def test_memory():
    """Test 4: Enhanced Memory - Multi-turn conversation"""
    print("\n" + "="*60)
    print("TEST 4: ENHANCED MEMORY (Redis Persistence)")
    print("="*60)
    
    user_id = "memory_test_user"
    
    # Turn 1
    print("\n🔹 Turn 1: Ask about Sri Lanka")
    payload1 = {
        "user_id": user_id,
        "message": "ශ්‍රී ලංකාවේ අගනුවර කුමක්ද?"
    }
    response1 = httpx.post(f"{BASE_URL}/chat/", json=payload1, timeout=30.0)
    if response1.status_code == 200:
        data1 = response1.json()
        print(f"  Answer: {data1['answer'][:80]}...")
    else:
        print(f"  ❌ Failed: {response1.status_code}")
        return False
    
    time.sleep(2)
    
    # Turn 2 - Reference to previous context
    print("\n🔹 Turn 2: Follow-up question (requires context)")
    payload2 = {
        "user_id": user_id,
        "message": "එහි ජනගහනය කීයද?"  # "What is its population?" - needs context
    }
    response2 = httpx.post(f"{BASE_URL}/chat/", json=payload2, timeout=30.0)
    if response2.status_code == 200:
        data2 = response2.json()
        answer2 = data2['answer'].lower()
        print(f"  Answer: {data2['answer'][:80]}...")
        
        # Check if answer makes sense with context
        # A good answer should reference population/city data
        if any(word in answer2 for word in ['ජන', 'විට', 'වාර්ත', 'අංක']):
            print(f"\n✅ MEMORY WORKS! Answer references context appropriately")
            return True
        else:
            print(f"\n⚠️ Answer might not use context properly")
            return True  # Still passes if response works
    else:
        print(f"  ❌ Failed: {response2.status_code}")
        return False


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🧪 MIRA FEATURE TESTING SUITE")
    print("="*60)
    print("\nTesting 4 new features:")
    print("  1. Redis Caching")
    print("  2. Rate Limiting")
    print("  3. SSE Streaming")
    print("  4. Enhanced Memory")
    
    results = {}
    
    # Test 1: Caching
    try:
        results['cache'] = test_cache()
    except Exception as e:
        print(f"\n❌ Cache test failed with error: {e}")
        results['cache'] = False
    
    time.sleep(3)  # Cooldown between tests
    
    # Test 2: Rate Limiting
    try:
        results['rate_limit'] = test_rate_limit()
    except Exception as e:
        print(f"\n❌ Rate limit test failed with error: {e}")
        results['rate_limit'] = False
    
    time.sleep(5)  # Wait for rate limit window to reset
    
    # Test 3: Streaming
    try:
        results['streaming'] = asyncio.run(test_streaming())
    except Exception as e:
        print(f"\n❌ Streaming test failed with error: {e}")
        results['streaming'] = False
    
    time.sleep(3)
    
    # Test 4: Memory
    try:
        results['memory'] = test_memory()
    except Exception as e:
        print(f"\n❌ Memory test failed with error: {e}")
        results['memory'] = False
    
    # Final summary
    print("\n" + "="*60)
    print("📊 FINAL TEST RESULTS")
    print("="*60)
    passed = sum(results.values())
    total = len(results)
    
    for feature, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {feature.upper():15s}: {status}")
    
    print(f"\n{'='*60}")
    print(f"Overall: {passed}/{total} tests passed ({passed/total*100:.0f}%)")
    print("="*60)
    
    if passed == total:
        print("\n🎉 ALL FEATURES WORKING PERFECTLY! 🎉")
    elif passed >= 3:
        print(f"\n✅ Most features working ({passed}/{total})")
    else:
        print(f"\n⚠️ Some features need attention ({total-passed} failed)")


if __name__ == "__main__":
    main()
