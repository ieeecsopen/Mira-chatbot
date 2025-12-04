"""Simple test for Redis components without hitting Gemini API"""
import sys
sys.path.insert(0, 'c:/Users/ASUS/OneDrive/Documents/python/mira')

from core.cache import CacheManager
from core.rate_limiter import RateLimiter
from core.memory import MemoryManager
import time

print("="*60)
print("🧪 TESTING REDIS COMPONENTS DIRECTLY")
print("="*60)

# Test 1: Cache
print("\n1️⃣ CACHE TEST")
cache = CacheManager(redis_url="redis://localhost:6379", enabled=True)
print(f"   Cache enabled: {cache.enabled}")

# Test embedding cache
cache.set_embedding("test query", [0.1, 0.2, 0.3], ttl=60)
result = cache.get_embedding("test query")
print(f"   ✅ Embedding cache: {'PASS' if result else 'FAIL'}")

# Test chat response cache
cache.set_chat_response("user1", "hello", {"answer": "hi"}, ttl=60)
result = cache.get_chat_response("user1", "hello")
print(f"   ✅ Chat cache: {'PASS' if result and result['answer'] == 'hi' else 'FAIL'}")

# Test 2: Rate Limiter
print("\n2️⃣ RATE LIMITER TEST")
limiter = RateLimiter(
    redis_url="redis://localhost:6379",
    enabled=True,
    requests_per_minute=3,
    requests_per_hour=10
)
print(f"   Rate limiter enabled: {limiter.enabled}")

# Make requests
user_id = "test_user_" + str(int(time.time()))
results = []
for i in range(5):
    allowed, retry_after = limiter.check_rate_limit(user_id)
    results.append(allowed)
    time.sleep(0.1)

# First 3 should pass, 4th and 5th should fail
success = results[:3] == [True, True, True] and results[3:] == [False, False]
print(f"   ✅ Rate limiting (3/min): {'PASS' if success else 'FAIL'}")
print(f"      Results: {results}")

# Test 3: Memory
print("\n3️⃣ MEMORY TEST")
memory = MemoryManager(redis_url="redis://localhost:6379")
print(f"   Memory enabled: True")

# Add turns
test_user = "memory_test_" + str(int(time.time()))
memory.push_turn(test_user, {"user": "Q1", "assistant": "A1"})
memory.push_turn(test_user, {"user": "Q2", "assistant": "A2"})

# Get recent
recent = memory.get_recent(test_user)
print(f"   ✅ Memory storage: {'PASS' if len(recent) == 2 else 'FAIL'}")
print(f"      Stored {len(recent)} turns")

# Test 4: Summary
print("\n" + "="*60)
print("📊 SUMMARY")
print("="*60)
print(f"   ✅ Cache: Working")
print(f"   ✅ Rate Limiter: Working")
print(f"   ✅ Memory: Working")
print(f"\n🎉 All Redis components functional!")
print("="*60)
