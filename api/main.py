from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.redis_client import RedisClient
from routes.rooms import router as rooms_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    redis_client = RedisClient()
    await redis_client.connect()
    yield
    await redis_client.disconnect()


app = FastAPI(
    title="Planning Poker API",
    description="Real-time Planning Poker for agile estimation",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms_router, prefix="/api/v1")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
