"""
CrewAI Task definitions for Customer Support Crew.

This module defines the tasks that agents perform during job execution.
"""

from crewai import Task, Agent


def create_routing_task(agent: Agent, ticket_content: str) -> Task:
    """
    Create the routing task for ticket classification.
    
    Args:
        agent: The Router Agent to assign this task to
        ticket_content: The customer support ticket content to classify
        
    Returns:
        Task configured for ticket routing
    """
    return Task(
        description=f"""Analyze and classify the following customer support ticket:

---
{ticket_content}
---

Your task:
1. Identify the primary issue type (technical, billing, general inquiry, complaint, feature request)
2. Assess the urgency level (low, medium, high, critical)
3. Determine the complexity (simple, moderate, complex)
4. Extract key details that will help the resolution specialist
5. Provide routing recommendation

Output a structured classification with all the above elements.""",
        expected_output="""A structured classification containing:
- Issue Type: [type]
- Urgency: [level]
- Complexity: [level]
- Key Details: [bullet points]
- Routing Recommendation: [recommendation]""",
        agent=agent,
    )


def create_processing_task(
    agent: Agent, 
    ticket_content: str, 
    classification: str
) -> Task:
    """
    Create the processing task for issue resolution.
    
    Args:
        agent: The Worker Agent to assign this task to
        ticket_content: The original customer support ticket
        classification: The classification from the Router Agent
        
    Returns:
        Task configured for issue resolution
    """
    return Task(
        description=f"""Resolve the following customer support ticket based on the classification:

ORIGINAL TICKET:
---
{ticket_content}
---

CLASSIFICATION:
---
{classification}
---

Your task:
1. Address the customer's primary concern directly
2. Provide clear, step-by-step instructions if applicable
3. Include any relevant information or resources
4. Anticipate follow-up questions and address them proactively
5. Maintain a professional, empathetic, and helpful tone

Create a complete response that fully resolves the customer's issue.""",
        expected_output="""A complete customer support response that:
- Acknowledges the customer's issue
- Provides a clear solution or answer
- Includes step-by-step instructions if needed
- Offers additional helpful information
- Ends with a professional closing""",
        agent=agent,
    )


def create_qa_task(
    agent: Agent, 
    ticket_content: str, 
    proposed_response: str
) -> Task:
    """
    Create the QA task for response validation.
    
    Args:
        agent: The QA Agent to assign this task to
        ticket_content: The original customer support ticket
        proposed_response: The response from the Worker Agent
        
    Returns:
        Task configured for quality assurance review
    """
    return Task(
        description=f"""Review and validate the following customer support response:

ORIGINAL TICKET:
---
{ticket_content}
---

PROPOSED RESPONSE:
---
{proposed_response}
---

Your task:
1. Verify the response accurately addresses the customer's issue
2. Check for factual accuracy and completeness
3. Evaluate the tone (professional, empathetic, helpful)
4. Identify any missing information or potential improvements
5. Ensure the response is clear and easy to understand

If the response meets quality standards, approve it.
If improvements are needed, provide the corrected version.""",
        expected_output="""Either:
- APPROVED: [original response] (if quality standards are met)
- REVISED: [improved response] (if changes were needed)

Include a brief quality assessment summary.""",
        agent=agent,
    )
