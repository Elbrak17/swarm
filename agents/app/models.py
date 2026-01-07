"""
Pydantic models for request/response validation.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class AgentRole(str, Enum):
    """Agent roles in the crew."""
    ROUTER = "router"
    WORKER = "worker"
    QA = "qa"


class JobInput(BaseModel):
    """Input model for job execution requests."""
    job_id: str = Field(..., description="Unique job identifier")
    title: str = Field(..., description="Job title")
    description: str = Field(..., description="Job description")
    requirements: str = Field(default="", description="Job requirements")
    swarm_id: str = Field(..., description="Swarm identifier")
    callback_url: Optional[str] = Field(
        default=None, 
        description="URL to POST progress updates"
    )


class TaskResult(BaseModel):
    """Result from a single agent task."""
    agent_address: str = Field(..., description="Agent wallet address")
    task_name: str = Field(..., description="Name of the task")
    output: str = Field(..., description="Task output")
    tokens_used: int = Field(default=0, description="Tokens consumed")
    execution_time_ms: int = Field(default=0, description="Execution time in ms")


class JobResult(BaseModel):
    """Complete job execution result."""
    job_id: str = Field(..., description="Job identifier")
    success: bool = Field(..., description="Whether job completed successfully")
    final_output: str = Field(..., description="Final combined output")
    task_results: list[TaskResult] = Field(
        default_factory=list, 
        description="Results from each agent task"
    )
    total_cost_usd: float = Field(default=0.0, description="Total cost in USD")
    result_hash: str = Field(..., description="Hash of the result for verification")


class ProgressUpdate(BaseModel):
    """Progress update during job execution."""
    job_id: str
    stage: str  # routing, processing, qa, complete
    agent_id: str
    message: str
    progress: int  # 0-100


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str = "0.1.0"
