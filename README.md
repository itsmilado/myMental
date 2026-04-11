# MyMental

A privacy-first productivity and transcription platform with AI-powered insights.

## Table of Contents

- [TL;DR](#tldr)
- [Getting Started](#getting-started)
- [Why This Project Matters](#why-this-project-matters)
- [Engineering Highlights](#engineering-highlights)
- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [System Design](#system-design)
- [Project Status \& Roadmap](#project-status--roadmap)
- [Project Structure](#project-structure)
- [Database Overview](#database-overview)
- [Development Approach](#development-approach)
- [Motivation](#motivation)
- [Current Focus](#current-focus)
- [Notes](#notes)

## TL;DR

- Full-stack app built with **React, Node.js, and PostgreSQL**
- Real-time transcription pipeline using **AssemblyAI + SSE**
- Secure **session-based authentication with CSRF protection**
- Consistent API key handling across all transcription flows
- Currently in **Phase 2 (AI integration)**

Built as a portfolio project focused on learning how real-world systems are designed and behave.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/itsmilado/myMental.git
cd myMental
```

### 2. Set up PostgreSQL

Create a PostgreSQL database for the project.

Example:

```bash
createdb mymental
```

Or create it from `psql`:

```sql
CREATE DATABASE mymental;
```

### 3. Initialize the database schema

From the project root or the `server` folder, run the schema file located at:

- `server/db/setup.sql`

Example:

```bash
psql -d mymental -f server/db/setup.sql
```

This will create the core tables used by the app:

- `users`
- `user_api_keys`
- `transcriptions`
- `transcription_backups` :contentReference[oaicite:3]{index=3}

### 4. Install backend dependencies

```bash
cd server
npm install
```

### 5. Configure environment variables

Create your environment files before starting the app.

Create a `.env` file in both `server/` and `client/` based on:

- `server/.env.example`
- `client/.env.example`

Fill in the required values before running the app.

### 6. Start the backend

```bash
npm run dev
```

### 7. Install frontend dependencies

Open a new terminal:

```bash
cd client
npm install
```

### 8. Start the frontend

```bash
npm start
```

### 9. Open the app

Once both servers are running, open the frontend in your browser using the local address provided by the React app.

## Why This Project Matters

Most transcription apps focus on converting audio to text.

In this project, my focus is on understanding how such a system behaves under real conditions while building it from scratch:

- handling long-running async jobs reliably
- integrating external AI services without inconsistent results
- designing secure and predictable backend workflows

This project is part of my learning journey focused on backend architecture and system design.

My goal was not just to make features work, but to understand how to build systems that behave **consistently and predictably** as they grow.

## Engineering Highlights

- Built an **SSE-based job pipeline** for handling long-running tasks
- Implemented a **deterministic API key resolution system** (`selected → default → fallback`)
- Designed **session-based authentication with CSRF protection**
- Structured the frontend using a **feature-based architecture**
- Focused on making async workflows predictable and consistent

## Features

### Core System

- Session-based authentication
- Role-based access control
- User preferences system

### Transcription

- Multi-file upload with queue processing
- Real-time progress tracking (SSE)
- AssemblyAI integration (diarization + identification)
- Unified transcription history
- Export functionality

### System Design

- Deterministic API key resolution
- SSE job pipeline
- Metadata-driven persistence

### Security

- CSRF protection
- HTTP-only cookies
- Encrypted API keys
- No client-side secrets

## Architecture Overview

### Backend

- Node.js + Express
- PostgreSQL
- Session-based authentication
- Modular middleware structure
- Winston logging

Key ideas:

- Centralized API connection resolver
- SSE-based job handling
- Predictable data flow

### Frontend

- React + TypeScript
- Feature-based structure
- Zustand state management
- Material UI

Each feature manages its own logic, API calls, and state.

## Tech Stack

### Frontend

- React (TypeScript)
- Zustand
- Material UI

### Backend

- Node.js
- Express

### Database

- PostgreSQL

### AI / External

- AssemblyAI
- Gemini 1.5 _(planned)_

## System Design

### Transcription Flow

1. Upload audio files
2. Create background jobs
3. Resolve API connection
4. Request transcription
5. Stream progress (SSE)
6. Store results
7. Update UI

### API Key Resolution

1. User-selected
2. Default
3. Fallback

Each transcription stores the connection used to ensure consistent behavior across future actions.

## Project Status & Roadmap

### Phase 1 — MVP (Completed)

- Audio Transcription pipeline(AssemblyAI)
- Authentication system
- Core UI
- Export and history

### Phase 2 — AI Integration (In Progress)

- Transcript summaries
- AI assistant integration
- Persona-based workflows
- Legal document viewer + OCR & translation (planned)
- Task & calendar system (planned)

### Phase 3 — Polish (Planned)

- RAG search
- Multilingual UI (i18n)
- Accessibility & responsiveness improvements
- CI/CD setup

## Project Structure

```plaintext
server/
├── db/
├── middlewares/
├── routes/
└── utils/

client/src/
├── features/
├── components/
├── store/
└── api/
```

## Database Overview

The database is designed around four main tables: :contentReference[oaicite:1]{index=1}

- `users`
    - stores account identity, authentication provider, role, preferences, and email/password recovery fields

- `user_api_keys`
    - stores encrypted third-party API keys for user-managed integrations such as AssemblyAI
    - supports one default key per provider per user

- `transcriptions`
    - stores local transcription records, selected options, file metadata, and the AssemblyAI connection context used for the request

- `transcription_backups`
    - stores raw API transcript data and backup metadata for history, recovery, and follow-up operations

This structure supports secure authentication, connection-aware transcription workflows, and consistent persistence of both normalized and raw transcript data. :contentReference[oaicite:2]{index=2}

## Development Approach

- Issue-driven workflow
- Small, focused development sessions
- Continuous refinement

Focus:

- predictable system behavior
- clear architecture
- maintainability

## Motivation

I built this project to move beyond typical CRUD applications and explore more realistic system challenges, such as:

- async job processing using SSE
- reliable integration with external AI services
- secure session-based authentication and data handling

This project reflects my ongoing learning process in full-stack development, with a strong focus on backend architecture and system design.

Rather than aiming for completeness, the goal is to iteratively improve the system while learning how real-world applications are designed and evolved.

## Current Focus

- Improving upload UX
- Better SSE error handling
- Queue interaction refinement
- API cleanup

## Notes

- I'm actively working and evolving the Project, it's work in progress
- I prioritized Architecture over rapid feature building
