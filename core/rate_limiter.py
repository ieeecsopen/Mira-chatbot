# core/rate_limiter.py
"""
Rate limiting for MIRA API to prevent abuse.
Implements sliding window rate limiting with Redis.
"""
import time
import logging
from typing import Optional, Tuple
from datetime import datetime, timedelta

try:
    import redis
    _HAS_REDIS = True
except ImportError:
    _HAS_REDIS = False

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Sliding window rate limiter using Redis.
    Supports per-user and global rate limits.
    """
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        enabled: bool = True,
        requests_per_minute: int = 10,
        requests_per_hour: int = 100
    ):
        self.enabled = enabled and _HAS_REDIS
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.client: Optional[redis.Redis] = None
        
        if self.enabled:
            try:
                self.client = redis.from_url(redis_url, decode_responses=False)
                self.client.ping()
                logger.info(f"✅ Rate limiter connected: {redis_url}")
            except Exception as e:
                logger.warning(f"⚠️  Redis unavailable, rate limiting disabled: {e}")
                self.enabled = False
        else:
            if not _HAS_REDIS:
                logger.warning("⚠️  Redis package not installed, rate limiting disabled")
            else:
                logger.info("ℹ️  Rate limiting disabled by configuration")
    
    def check_rate_limit(self, user_id: str) -> Tuple[bool, Optional[str]]:
        """
        Check if user has exceeded rate limits.
        
        Returns:
            (allowed: bool, retry_after: Optional[str])
            - allowed: True if request is allowed, False if rate limited
            - retry_after: Human-readable time until limit resets (if limited)
        """
        if not self.enabled:
            return True, None
        
        try:
            now = time.time()
            
            # Check minute limit
            minute_key = f"mira:ratelimit:minute:{user_id}"
            minute_count = self._get_request_count(minute_key, now, 60)
            
            if minute_count >= self.requests_per_minute:
                retry_after = self._calculate_retry_after(minute_key, 60)
                logger.warning(f"🚫 Rate limit exceeded (minute): user {user_id}")
                return False, retry_after
            
            # Check hour limit
            hour_key = f"mira:ratelimit:hour:{user_id}"
            hour_count = self._get_request_count(hour_key, now, 3600)
            
            if hour_count >= self.requests_per_hour:
                retry_after = self._calculate_retry_after(hour_key, 3600)
                logger.warning(f"🚫 Rate limit exceeded (hour): user {user_id}")
                return False, retry_after
            
            # Record this request
            self._record_request(minute_key, now, 60)
            self._record_request(hour_key, now, 3600)
            
            logger.debug(f"✅ Rate limit OK: user {user_id} ({minute_count+1}/{self.requests_per_minute} per min, {hour_count+1}/{self.requests_per_hour} per hour)")
            return True, None
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Fail open - allow request if rate limiter has issues
            return True, None
    
    def _get_request_count(self, key: str, now: float, window: int) -> int:
        """Get number of requests in the sliding window."""
        try:
            # Remove old entries outside the window
            min_timestamp = now - window
            self.client.zremrangebyscore(key, 0, min_timestamp)
            
            # Count remaining entries
            count = self.client.zcard(key)
            return count
        except Exception as e:
            logger.error(f"Error getting request count: {e}")
            return 0
    
    def _record_request(self, key: str, timestamp: float, window: int):
        """Record a new request in the sliding window."""
        try:
            # Add current request with timestamp as score
            self.client.zadd(key, {str(timestamp): timestamp})
            # Set expiry to window duration + buffer
            self.client.expire(key, window + 10)
        except Exception as e:
            logger.error(f"Error recording request: {e}")
    
    def _calculate_retry_after(self, key: str, window: int) -> str:
        """Calculate when the oldest request in window will expire."""
        try:
            # Get oldest entry
            oldest = self.client.zrange(key, 0, 0, withscores=True)
            if oldest:
                oldest_timestamp = oldest[0][1]
                reset_time = oldest_timestamp + window
                wait_seconds = int(reset_time - time.time())
                
                if wait_seconds < 60:
                    return f"{wait_seconds} seconds"
                else:
                    minutes = wait_seconds // 60
                    return f"{minutes} minute{'s' if minutes > 1 else ''}"
            return "1 minute"
        except Exception as e:
            logger.error(f"Error calculating retry: {e}")
            return "1 minute"
    
    def get_user_stats(self, user_id: str) -> dict:
        """Get rate limit statistics for a user."""
        if not self.enabled:
            return {"enabled": False}
        
        try:
            now = time.time()
            
            minute_key = f"mira:ratelimit:minute:{user_id}"
            minute_count = self._get_request_count(minute_key, now, 60)
            
            hour_key = f"mira:ratelimit:hour:{user_id}"
            hour_count = self._get_request_count(hour_key, now, 3600)
            
            return {
                "enabled": True,
                "user_id": user_id,
                "requests_last_minute": minute_count,
                "minute_limit": self.requests_per_minute,
                "requests_last_hour": hour_count,
                "hour_limit": self.requests_per_hour,
                "minute_remaining": max(0, self.requests_per_minute - minute_count),
                "hour_remaining": max(0, self.requests_per_hour - hour_count)
            }
        except Exception as e:
            logger.error(f"Error getting user stats: {e}")
            return {"enabled": True, "error": str(e)}
    
    def reset_user_limits(self, user_id: str):
        """Reset rate limits for a user (admin function)."""
        if not self.enabled:
            return
        
        try:
            minute_key = f"mira:ratelimit:minute:{user_id}"
            hour_key = f"mira:ratelimit:hour:{user_id}"
            
            self.client.delete(minute_key, hour_key)
            logger.info(f"🔄 Reset rate limits for user {user_id}")
        except Exception as e:
            logger.error(f"Error resetting limits: {e}")
