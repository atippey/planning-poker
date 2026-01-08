import os

import redis.asyncio as redis


class RedisClient:
    """Redis client with connection pooling."""

    _instance: "RedisClient | None" = None
    _redis: "redis.Redis | None" = None

    def __new__(cls) -> "RedisClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def connect(self) -> None:
        """Initialize Redis connection pool."""
        if self._redis is None:
            host = os.getenv("REDIS_HOST", "localhost")
            port = int(os.getenv("REDIS_PORT", "6379"))
            db = int(os.getenv("REDIS_DB", "0"))

            self._redis = redis.Redis(
                host=host,
                port=port,
                db=db,
                decode_responses=True,
                max_connections=10,
            )

    async def disconnect(self) -> None:
        """Close Redis connection pool."""
        if self._redis:
            await self._redis.close()
            self._redis = None

    def get_client(self) -> redis.Redis:
        """Get Redis client instance."""
        if self._redis is None:
            raise RuntimeError("Redis client not connected. Call connect() first.")
        return self._redis


def get_redis() -> redis.Redis:
    """Dependency injection helper for FastAPI."""
    client = RedisClient()
    return client.get_client()
