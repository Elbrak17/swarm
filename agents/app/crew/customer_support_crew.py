"""
Customer Support Crew orchestration.

This module defines the CustomerSupportCrew class that orchestrates
the Router, Worker, and QA agents to process support tickets.
"""

import hashlib
import time
from typing import Callable, Optional

from crewai import Crew, Process

from .agents import create_router_agent, create_worker_agent, create_qa_agent
from .tasks import create_routing_task, create_processing_task, create_qa_task
from ..models import JobInput, JobResult, TaskResult, ProgressUpdate


# Default agent addresses (would be configured per swarm in production)
DEFAULT_AGENT_ADDRESSES = {
    "router": "0x1111111111111111111111111111111111111111",
    "worker": "0x2222222222222222222222222222222222222222",
    "qa": "0x3333333333333333333333333333333333333333",
}


class CustomerSupportCrew:
    """
    Customer Support Crew for processing support tickets.
    
    This crew consists of three agents:
    1. Router Agent - Classifies tickets
    2. Worker Agent - Resolves issues
    3. QA Agent - Validates responses
    """
    
    def __init__(
        self, 
        agent_addresses: Optional[dict[str, str]] = None,
        progress_callback: Optional[Callable[[ProgressUpdate], None]] = None,
    ):
        """
        Initialize the Customer Support Crew.
        
        Args:
            agent_addresses: Mapping of agent roles to wallet addresses
            progress_callback: Optional callback for progress updates
        """
        self.agent_addresses = agent_addresses or DEFAULT_AGENT_ADDRESSES
        self.progress_callback = progress_callback
        
        # Create agents
        self.router_agent = create_router_agent()
        self.worker_agent = create_worker_agent()
        self.qa_agent = create_qa_agent()
    
    def _send_progress(self, job_id: str, stage: str, agent_id: str, message: str, progress: int):
        """Send a progress update if callback is configured."""
        if self.progress_callback:
            update = ProgressUpdate(
                job_id=job_id,
                stage=stage,
                agent_id=agent_id,
                message=message,
                progress=progress,
            )
            self.progress_callback(update)
    
    def _generate_result_hash(self, content: str) -> str:
        """Generate a hash of the result content."""
        return f"ipfs://{hashlib.sha256(content.encode()).hexdigest()[:46]}"
    
    async def execute(self, job_input: JobInput) -> JobResult:
        """
        Execute a customer support job.
        
        Args:
            job_input: The job input containing ticket details
            
        Returns:
            JobResult with the execution results
        """
        task_results: list[TaskResult] = []
        ticket_content = f"{job_input.title}\n\n{job_input.description}"
        
        if job_input.requirements:
            ticket_content += f"\n\nRequirements: {job_input.requirements}"
        
        try:
            # Stage 1: Routing
            self._send_progress(
                job_input.job_id, "routing", "router",
                "Analyzing and classifying the support ticket", 10
            )
            
            start_time = time.time()
            routing_task = create_routing_task(self.router_agent, ticket_content)
            
            routing_crew = Crew(
                agents=[self.router_agent],
                tasks=[routing_task],
                process=Process.sequential,
                verbose=True,
            )
            
            routing_result = routing_crew.kickoff()
            routing_time = int((time.time() - start_time) * 1000)
            
            task_results.append(TaskResult(
                agent_address=self.agent_addresses["router"],
                task_name="ticket_classification",
                output=str(routing_result),
                tokens_used=0,  # Would be tracked by LLM in production
                execution_time_ms=routing_time,
            ))
            
            # Stage 2: Processing
            self._send_progress(
                job_input.job_id, "processing", "worker",
                "Resolving the customer issue", 40
            )
            
            start_time = time.time()
            processing_task = create_processing_task(
                self.worker_agent, 
                ticket_content, 
                str(routing_result)
            )
            
            processing_crew = Crew(
                agents=[self.worker_agent],
                tasks=[processing_task],
                process=Process.sequential,
                verbose=True,
            )
            
            processing_result = processing_crew.kickoff()
            processing_time = int((time.time() - start_time) * 1000)
            
            task_results.append(TaskResult(
                agent_address=self.agent_addresses["worker"],
                task_name="issue_resolution",
                output=str(processing_result),
                tokens_used=0,
                execution_time_ms=processing_time,
            ))
            
            # Stage 3: QA
            self._send_progress(
                job_input.job_id, "qa", "qa",
                "Validating response quality", 70
            )
            
            start_time = time.time()
            qa_task = create_qa_task(
                self.qa_agent, 
                ticket_content, 
                str(processing_result)
            )
            
            qa_crew = Crew(
                agents=[self.qa_agent],
                tasks=[qa_task],
                process=Process.sequential,
                verbose=True,
            )
            
            qa_result = qa_crew.kickoff()
            qa_time = int((time.time() - start_time) * 1000)
            
            task_results.append(TaskResult(
                agent_address=self.agent_addresses["qa"],
                task_name="quality_assurance",
                output=str(qa_result),
                tokens_used=0,
                execution_time_ms=qa_time,
            ))
            
            # Complete
            self._send_progress(
                job_input.job_id, "complete", "system",
                "Job completed successfully", 100
            )
            
            final_output = str(qa_result)
            result_hash = self._generate_result_hash(final_output)
            
            # Calculate total cost (estimated based on tokens)
            total_time_ms = sum(r.execution_time_ms for r in task_results)
            estimated_cost = total_time_ms * 0.00001  # Rough estimate
            
            return JobResult(
                job_id=job_input.job_id,
                success=True,
                final_output=final_output,
                task_results=task_results,
                total_cost_usd=estimated_cost,
                result_hash=result_hash,
            )
            
        except Exception as e:
            # Return failure result
            return JobResult(
                job_id=job_input.job_id,
                success=False,
                final_output=f"Error: {str(e)}",
                task_results=task_results,
                total_cost_usd=0.0,
                result_hash=self._generate_result_hash(f"error:{str(e)}"),
            )
