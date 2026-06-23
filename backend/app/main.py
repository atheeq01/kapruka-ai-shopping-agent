from dotenv import load_dotenv
load_dotenv()  # must be first — before any module that reads env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.chat import router as chat_router
from app.services.agent import get_gemini_tools, tools_ready
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the (shared, static) MCP tool cache so the first chat request is fast.
    # Per-request MCP sessions are opened on demand inside the chat handler, so we
    # deliberately do NOT hold a long-lived shared session here.
    try:
        await get_gemini_tools()
    except Exception as e:
        logger.warning(f"[startup] MCP tool prefetch failed: {e}. Will retry on first request.")

    yield


app = FastAPI(title="Kapruka Chat Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "healthy", "tools_cached": tools_ready()}