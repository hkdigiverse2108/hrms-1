import os
import json
import time
import logging
import functools
from typing import Any, Optional, Union, List, Callable
from datetime import datetime, date
from bson import ObjectId
import redis.asyncio as aioredis
from fastapi import Request, Response

logger = logging.getLogger("redis_manager")

# Configuration from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "true").lower() in ("true", "1", "yes")

# Global Redis pool & client instance
_redis_client: Optional[aioredis.Redis] = None

# High-speed fallback in-memory cache when Redis server is unreachable or offline
_fallback_cache: dict = {}
_fallback_expiry: dict = {}


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder handling datetime, date, and BSON ObjectId."""
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, ObjectId):
            return str(obj)
        if hasattr(obj, "dict") and callable(obj.dict):
            return obj.dict()
        if hasattr(obj, "model_dump") and callable(obj.model_dump):
            return obj.model_dump()
        return super().default(obj)


async def init_redis() -> Optional[aioredis.Redis]:
    """Initialize Redis connection pool on application startup."""
    global _redis_client
    if not REDIS_ENABLED:
        logger.info("Redis is disabled via environment configuration.")
        return None

    try:
        _redis_client = aioredis.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
            max_connections=50
        )
        # Test connectivity
        await _redis_client.ping()
        logger.info(f"✅ Successfully connected to Redis at {REDIS_URL}")
        return _redis_client
    except Exception as e:
        logger.warning(f"⚠️ Could not connect to Redis ({e}). Running with in-memory fallback caching.")
        _redis_client = None
        return None


async def close_redis():
    """Safely close Redis connection pool on shutdown."""
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.close()
            logger.info("Closed Redis connection pool.")
        except Exception as e:
            logger.warning(f"Error closing Redis connection: {e}")
        finally:
            _redis_client = None


def get_redis_client() -> Optional[aioredis.Redis]:
    """Get active Redis client instance."""
    return _redis_client


async def get_cached(key: str) -> Optional[Any]:
    """
    Retrieve and parse cached JSON object.
    Checks Redis first; falls back to in-memory cache if Redis is down.
    """
    client = get_redis_client()
    if client is not None:
        try:
            raw_val = await client.get(key)
            if raw_val is not None:
                return json.loads(raw_val)
        except Exception as e:
            logger.debug(f"Redis GET failed for key '{key}': {e}")
    
    # In-memory fallback
    if key in _fallback_cache:
        if time.time() < _fallback_expiry.get(key, 0):
            return _fallback_cache[key]
        else:
            _fallback_cache.pop(key, None)
            _fallback_expiry.pop(key, None)
    return None


async def set_cached(key: str, data: Any, ttl: int = 60) -> bool:
    """
    Serialize and store data in Redis with TTL (seconds).
    Also stores in in-memory fallback cache.
    """
    if data is None:
        return False
        
    client = get_redis_client()
    if client is not None:
        try:
            json_str = json.dumps(data, cls=JSONEncoder)
            await client.set(key, json_str, ex=ttl)
            return True
        except Exception as e:
            logger.debug(f"Redis SET failed for key '{key}': {e}")
            
    # Always keep in-memory fallback updated
    try:
        _fallback_cache[key] = json.loads(json.dumps(data, cls=JSONEncoder))
        _fallback_expiry[key] = time.time() + ttl
        return True
    except Exception as e:
        logger.debug(f"Fallback cache SET failed for key '{key}': {e}")
        return False


async def delete_cached(*keys: str) -> bool:
    """Delete specific cache keys from Redis and in-memory cache."""
    client = get_redis_client()
    if client is not None:
        try:
            valid_keys = [k for k in keys if k]
            if valid_keys:
                await client.delete(*valid_keys)
        except Exception as e:
            logger.debug(f"Redis DELETE failed: {e}")
            
    for k in keys:
        _fallback_cache.pop(k, None)
        _fallback_expiry.pop(k, None)
    return True


async def invalidate_namespace(namespace: str) -> bool:
    """
    Invalidate all keys matching namespace pattern (e.g., 'hrms:tasks:*').
    Invalidates both Redis and in-memory fallback cache.
    """
    if not namespace:
        return False

    client = get_redis_client()
    pattern = f"{namespace}:*" if not namespace.endswith("*") else namespace
    if client is not None:
        try:
            keys_to_delete = []
            async for key in client.scan_iter(match=pattern, count=100):
                keys_to_delete.append(key)
                if len(keys_to_delete) >= 500:
                    await client.delete(*keys_to_delete)
                    keys_to_delete = []
            
            if keys_to_delete:
                await client.delete(*keys_to_delete)
            logger.debug(f"Invalidated Redis namespace pattern: '{pattern}'")
        except Exception as e:
            logger.warning(f"Redis invalidate_namespace failed for '{pattern}': {e}")

    # Also invalidate in-memory fallback
    ns_prefix = namespace.rstrip("*")
    matched = [k for k in _fallback_cache.keys() if k.startswith(ns_prefix)]
    for k in matched:
        _fallback_cache.pop(k, None)
        _fallback_expiry.pop(k, None)
    logger.debug(f"Invalidated fallback cache namespace pattern: '{namespace}' ({len(matched)} keys)")
    return True


def build_cache_key(namespace: str, path: str, params: dict) -> str:
    """Build a deterministic cache key from namespace, route path, and sorted query parameters."""
    clean_params = []
    if params:
        for k in sorted(params.keys()):
            v = params[k]
            if v is not None and v != "":
                clean_params.append(f"{k}={v}")
    param_str = ":".join(clean_params) if clean_params else "default"
    clean_path = path.strip("/").replace("/", "_")
    return f"{namespace}:{clean_path}:{param_str}"


def cached_api(namespace: str, ttl: int = 60):
    """
    Universal FastAPI Endpoint Decorator for Redis Caching.
    
    Usage:
        @app.get("/tasks")
        @cached_api(namespace="hrms:tasks", ttl=60)
        async def get_tasks(request: Request, ...):
            ...
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request object if passed
            request: Optional[Request] = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            # If request object is available, build dynamic key
            if request:
                query_params = dict(request.query_params)
                cache_key = build_cache_key(namespace, request.url.path, query_params)
                cached_data = await get_cached(cache_key)
                if cached_data is not None:
                    return cached_data

                # Execute original route function on cache miss
                res = await func(*args, **kwargs)
                if res is not None:
                    await set_cached(cache_key, res, ttl=ttl)
                return res

            # Fallback execution if request is not injected
            return await func(*args, **kwargs)

        return wrapper
    return decorator
