from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.session import engine, Base, SessionLocal
from app.database.seed_data import seed_database
from app.api import (
    auth, subscriptions, splits, payments, settlements,
    reminders, notifications, analytics
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and seed data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SplitSub – Smart Shared Subscription Manager REST APIs",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(subscriptions.router, prefix=settings.API_V1_STR)
app.include_router(splits.router, prefix=settings.API_V1_STR)
app.include_router(payments.router, prefix=settings.API_V1_STR)
app.include_router(settlements.router, prefix=settings.API_V1_STR)
app.include_router(reminders.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)

# Serve the built React app from the same FastAPI service for a simple one-URL deployment.
STATIC_DIR = Path(__file__).resolve().parents[1] / "static"
INDEX_FILE = STATIC_DIR / "index.html"

@app.get("/", include_in_schema=False)
def root():
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return {
        "app": settings.PROJECT_NAME,
        "tagline": "Smart Shared Subscription Manager",
        "status": "online",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str, request: Request):
    # Never intercept API routes or FastAPI docs.
    if full_path.startswith("api") or full_path in {"docs", "redoc", "openapi.json"}:
        return {"detail": "Not Found"}

    requested_file = STATIC_DIR / full_path
    if requested_file.is_file():
        return FileResponse(requested_file)

    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)

    return {
        "app": settings.PROJECT_NAME,
        "tagline": "Smart Shared Subscription Manager",
        "status": "online",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }
