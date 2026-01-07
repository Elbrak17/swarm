# SWARM CrewAI Agent Service

Python-based AI agent service using CrewAI for the SWARM Marketplace. This service provides a FastAPI wrapper that integrates with the Node.js backend via BullMQ.

## Architecture

The service implements a Customer Support Crew with three specialized agents:

1. **Router Agent**: Classifies incoming tickets and routes them to appropriate workers
2. **Worker Agent**: Resolves issues based on classification
3. **QA Agent**: Validates responses for quality and completeness

## Setup

### Prerequisites

- Python 3.10+
- Groq API key (for Llama 3.3-70b-versatile)

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your GROQ_API_KEY
```

### Running the Service

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### POST /execute

Execute a job with the CrewAI agents.

**Request Body:**
```json
{
  "job_id": "string",
  "title": "string",
  "description": "string",
  "requirements": "string",
  "swarm_id": "string",
  "callback_url": "string (optional)"
}
```

**Response:**
```json
{
  "job_id": "string",
  "success": true,
  "final_output": "string",
  "task_results": [
    {
      "agent_address": "string",
      "task_name": "string",
      "output": "string",
      "tokens_used": 0,
      "execution_time_ms": 0
    }
  ],
  "total_cost_usd": 0.0,
  "result_hash": "string"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq API key for LLM inference | Required |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `MODEL_NAME` | LLM model name | `llama-3.3-70b-versatile` |
| `MODEL_TEMPERATURE` | LLM temperature | `0.7` |

## Deployment

For Railway deployment:

1. Connect your repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will auto-detect the Python project and deploy

## License

MIT
