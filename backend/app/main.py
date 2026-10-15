import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .storage import storage_manager
from .routers import health, extract, download

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start periodic file cleanup task
    cleanup_task = asyncio.create_task(storage_manager.start_periodic_cleanup())
    yield
    # Shutdown: Cancel cleanup task
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Free, open-source media extraction and download REST API powered by yt-dlp & FastAPI for ChimtuDrop.",
    lifespan=lifespan,
)

# CORS
app.use_cors = True
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(extract.router)
app.include_router(download.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
