"""
CrewAI Agent definitions for Customer Support Crew.

This module defines three specialized agents:
1. Router Agent - Classifies and routes tickets
2. Worker Agent - Resolves issues
3. QA Agent - Validates responses
"""

from crewai import Agent
from langchain_groq import ChatGroq

from ..config import get_settings


def get_llm() -> ChatGroq:
    """Create and return the Groq LLM instance."""
    settings = get_settings()
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.model_name,
        temperature=settings.model_temperature,
    )


def create_router_agent() -> Agent:
    """
    Create the Router Agent for ticket classification.
    
    The Router Agent analyzes incoming support tickets and classifies them
    into categories, determining the appropriate handling approach.
    """
    return Agent(
        role="Support Ticket Router",
        goal="Accurately classify and route customer support tickets to ensure "
             "efficient resolution by the appropriate specialist",
        backstory="""You are an expert support ticket classifier with years of 
        experience in customer service operations. You excel at quickly 
        understanding the nature of customer issues and determining the best 
        path to resolution. You categorize tickets by urgency, complexity, 
        and type (technical, billing, general inquiry, etc.).""",
        llm=get_llm(),
        verbose=True,
        allow_delegation=False,
        memory=True,
    )


def create_worker_agent() -> Agent:
    """
    Create the Worker Agent for issue resolution.
    
    The Worker Agent takes classified tickets and provides detailed
    solutions based on the issue type and context.
    """
    return Agent(
        role="Support Resolution Specialist",
        goal="Provide comprehensive, accurate, and helpful solutions to "
             "customer issues while maintaining a professional and empathetic tone",
        backstory="""You are a seasoned customer support specialist with deep 
        knowledge across technical troubleshooting, billing inquiries, and 
        general product questions. You're known for your clear explanations, 
        step-by-step guidance, and ability to resolve complex issues 
        efficiently. You always aim to exceed customer expectations.""",
        llm=get_llm(),
        verbose=True,
        allow_delegation=False,
        memory=True,
    )


def create_qa_agent() -> Agent:
    """
    Create the QA Agent for response validation.
    
    The QA Agent reviews responses from the Worker Agent to ensure
    quality, accuracy, and completeness before delivery.
    """
    return Agent(
        role="Quality Assurance Reviewer",
        goal="Ensure all customer responses meet high quality standards for "
             "accuracy, completeness, tone, and helpfulness",
        backstory="""You are a meticulous quality assurance specialist with 
        expertise in customer communication. You review support responses to 
        ensure they are accurate, complete, professionally worded, and truly 
        address the customer's needs. You catch errors, suggest improvements, 
        and ensure consistency with company standards.""",
        llm=get_llm(),
        verbose=True,
        allow_delegation=False,
        memory=True,
    )
