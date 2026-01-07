"""
FastAPI application for the CrewAI Agent Service.

This module provides the REST API endpoints for job execution
and integrates with the Node.js backend via HTTP.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .models import JobInput, JobResult, HealthResponse, ProgressUpdate
from .crew import CustomerSupportCrew


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting CrewAI Agent Service...")
    yield
    logger.info("Shutting down CrewAI Agent Service...")


# Create FastAPI app
app = FastAPI(
    title="SWARM CrewAI Agent Service",
    description="AI agent orchestration service for the SWARM Marketplace",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def send_progress_callback(
    callback_url: str, 
    update: ProgressUpdate
) -> None:
    """Send progress update to callback URL."""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                callback_url,
                json=update.model_dump(),
                timeout=5.0,
            )
    except Exception as e:
        logger.warning(f"Failed to send progress callback: {e}")


def create_progress_callback(
    callback_url: Optional[str]
) -> Optional[callable]:
    """Create a progress callback function if URL is provided."""
    if not callback_url:
        return None
    
    def callback(update: ProgressUpdate):
        # Run async callback in background
        asyncio.create_task(send_progress_callback(callback_url, update))
    
    return callback


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(status="healthy", version="0.1.0")


@app.post("/execute", response_model=JobResult)
async def execute_job(job_input: JobInput):
    """
    Execute a job with the CrewAI agents.
    
    This endpoint processes a customer support ticket through the
    Router → Worker → QA agent pipeline and returns the results.
    """
    settings = get_settings()
    
    # Validate API key is configured
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY not configured"
        )
    
    logger.info(f"Executing job: {job_input.job_id}")
    
    # Determine callback URL
    callback_url = job_input.callback_url or settings.callback_url
    progress_callback = create_progress_callback(callback_url)
    
    # Create and execute crew
    crew = CustomerSupportCrew(progress_callback=progress_callback)
    
    try:
        result = await crew.execute(job_input)
        
        if not result.success:
            logger.error(f"Job {job_input.job_id} failed: {result.final_output}")
        else:
            logger.info(f"Job {job_input.job_id} completed successfully")
        
        return result
        
    except Exception as e:
        logger.exception(f"Error executing job {job_input.job_id}")
        raise HTTPException(
            status_code=500,
            detail=f"Job execution failed: {str(e)}"
        )


@app.post("/execute/async")
async def execute_job_async(
    job_input: JobInput, 
    background_tasks: BackgroundTasks
):
    """
    Queue a job for async execution.
    
    This endpoint immediately returns and processes the job in the background.
    Progress updates are sent to the callback URL if provided.
    """
    settings = get_settings()
    
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY not configured"
        )
    
    logger.info(f"Queueing async job: {job_input.job_id}")
    
    async def process_job():
        callback_url = job_input.callback_url or settings.callback_url
        progress_callback = create_progress_callback(callback_url)
        
        crew = CustomerSupportCrew(progress_callback=progress_callback)
        result = await crew.execute(job_input)
        
        # Send final result to callback if configured
        if callback_url:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{callback_url}/result",
                        json=result.model_dump(),
                        timeout=10.0,
                    )
            except Exception as e:
                logger.warning(f"Failed to send result callback: {e}")
    
    background_tasks.add_task(process_job)
    
    return {
        "status": "queued",
        "job_id": job_input.job_id,
        "message": "Job queued for processing"
    }


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
