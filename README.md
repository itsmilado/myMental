# 🧠 MyMental

**MyMental** is a privacy-first productivity and mental wellness app.<br>
It helps to keep track of mental health notes, important documents, tasks, and appointments, all in one place. Some features use AI, but you’re always in control of your data.<br>
This is my personal project to learn, experiment, and show what I can build with a modern full-stack setup (Node.js, React, PostgreSQL, and more). Everything here is open source and a work in progress.<br>
Currently, I’m working on:<br>
[feat/transcribe] branch - feel free to peek or open an issue.

---

## 🚀 Tech Stack

### 🖥️ Frontend

-   React (with TypeScript)
-   Tailwind CSS for layout
-   Material UI (MUI) for complex components
-   Zustand or Context API _(planned)_ for state management

### ⚙️ Backend

-   Node.js + Express
-   PostgreSQL (with `pg`)
-   Session-based authentication with `express-session`
-   Winston for structured logging
-   AssemblyAI for audio transcription
-   Modular middleware and route structure

### 🧠 AI & Data Intelligence

-   Google Gemini 1.5 for assistant reasoning and Q&A
-   Local LLMs via Ollama _(planned for privacy-sensitive preprocessing)_
-   `pgvector` for document semantic search _(planned)_

---

## 📁 Project Structure

<pre lang="md">
myMental/
├── client/ # React frontend
│ ├── src/
│ │ ├── components/
│ │ │ ├──global/
│ │ │ ├──profile/
│ │ ├── App.css
│ │ ├── App.tsx
│ │ ├── index.css  
│ │ ├── index.tsx
│ │ ├── theme.ts
│ │ └── types.tsx
│ ├── .env
│ └── tailwind.config.js
├── server/ # Node/Express backend
│ ├── db/
│ ├── logs/
│ ├── middlewares/
│ ├── models/
│ ├── routes/
│ ├── tests/
│ ├── transcriptions/
│ ├── uploads/
│ ├── utils/
│ └── server.js
└── README.md
</pre>
---

## 🌿 Git Workflow

### 🔧 Branching Strategy

-   `main` - production-ready code
-   `dev` - integration of tested features
-   `feature/*` - specific features (e.g., `feature/auth-ui`)
-   `bugfix/*` - specific fixes
-   `hotfix/*` - urgent fixes to production

### 🧾 Commit Format (Conventional Commits)

-   `feat:` - new features
-   `fix:` - bug fixes
-   `refactor:` - internal code refactors
-   `docs:` - documentation updates
-   `style:` - formatting only
-   `test:` - test-related updates

---

## 🛣️ Roadmap

### ✅ Phase 1 - MVP

-   Audio transcription upload (AssemblyAI)
-   Session-based login/register
-   Sidebar navigation layout
-   Transcription viewer with download/search
-   Profile management

### 🧠 Phase 2 - AI Integration

-   Legal document viewer + OCR & translation
-   Task + calendar manager (CRUD + reminders)
-   AI assistant (Gemini 1.5)
-   Summary generation for transcripts
-   Persona-based assistant (coach, legal advisor)

### 🌐 Phase 3 - Polish & Performance

-   RAG search (`pgvector` + Ollama fallback)
-   Multilingual UI (i18next)
-   Accessibility & responsiveness
-   Production deployment & GitHub Actions

---

## 📦 Getting Started

### Backend

```bash
Copy
cd server
npm install
npm run dev

```

### Frontend

```bash
Copy
cd client
npm install
npm start

```

-   React will run on localhost:3001 (or configured port).

-   Express backend runs on localhost:5000.
