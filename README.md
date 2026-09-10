# AI Job Tracker

A full-stack job application tracker that uses the Gemini API to analyze job descriptions and score how well a candidate fits each role. Built to replace a spreadsheet with something that actually gives feedback on every application.

## Features

- Log job applications with company, role, and job description
- Automatic AI-generated fit analysis and key requirement summary for each posting, powered by Gemini
- Track application status (applied / interview / offer / rejected) with inline updates
- Journal-style log view with expandable AI analysis per entry
- Live stats (total applications, interviews, offers)

## Tech Stack

**Frontend:** React (Vite), Axios
**Backend:** Node.js, Express
**Database:** PostgreSQL
**AI:** Google Gemini API (`@google/genai`)
**Infrastructure:** Docker, Docker Compose

## Architecture

```
frontend (React/Vite) → backend (Express API) → PostgreSQL
                              ↓
                        Gemini API (fit analysis)
```

Both the backend and database run as separate Docker containers, orchestrated with Docker Compose, so the whole stack starts with a single command.

## Setup

### Prerequisites
- Node.js 20+
- Docker Desktop
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)

### Environment variables
Create `backend/.env`:
```
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/jobtracker
GEMINI_API_KEY=your_gemini_key
PORT=5000
```

### Run with Docker (recommended)
```bash
$env:GEMINI_API_KEY="your_gemini_key"
docker compose up --build -d
```
Backend runs on `localhost:5000`, PostgreSQL on an internal container network.

The database schema needs to be created once inside the container:
```bash
docker exec -it ai-job-tracker-db-1 psql -U user -d jobtracker
```
```sql
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  company VARCHAR(100) NOT NULL,
  role VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'applied',
  job_description TEXT,
  ai_analysis TEXT,
  applied_date DATE DEFAULT CURRENT_DATE
);
```

### Run the frontend
```bash
cd frontend
npm install
npm run dev
```
Opens at `localhost:5173`.

### Run locally without Docker (alternative)
```bash
cd backend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/applications` | Fetch all applications |
| POST | `/api/applications` | Add a new application (triggers AI analysis) |
| PATCH | `/api/applications/:id` | Update an application's status |

## Live Demo

*(add your Render URL here once deployed)*
