# StudyBloom AI

An AI-powered study companion built as a personal project to learn full-stack development — combining a React frontend, a Supabase backend, and Google's Gemini API into one tool that actually helps with studying: summarizing notes, generating quizzes, explaining topics, solving math problems, and keeping track of study plans.

**Live demo:** https://acad-assist-zone.vercel.app

---

## Features

- **AI Study Chatbot** — ask questions and get answers tailored to your subjects
- **Notes Summarizer** — turns long notes into clean, exam-ready summaries
- **Quiz Generator** — creates MCQs, true/false, and short-answer questions from any text, with score tracking across attempts
- **AI Learning Mode** — explains any topic at your chosen difficulty level (beginner to advanced)
- **Math Tutor** — solves math problems step-by-step, accepts typed questions *or* photos of handwritten problems, and renders proper mathematical notation (via KaTeX)
- **Study Planner** — schedule study sessions, exams, and assignments, with reminders
- **Study Analytics** — tracks study streaks, quiz score trends over time, and activity across all features, visualized with charts
- **Authentication** — secure sign-up/login with per-user data isolation

---

## Tech Stack

**Frontend**
- React 19 + TypeScript
- TanStack Start (a full-stack React framework with server-side rendering)
- Tailwind CSS
- Recharts (data visualization)

**Backend**
- Supabase (PostgreSQL database, authentication, row-level security)
- TanStack server functions (serverless backend logic)
- Google Gemini API (AI responses, including image input for Math Tutor)

**Deployment**
- Vercel

**Tools**
- Git & GitHub
- VS Code

---

## What I learned building this

This was my first time deploying a full-stack app independently, and it came with a lot of real debugging: configuring server-side rendering for a serverless environment, managing environment variables across two separate platforms, integrating a third-party AI API from scratch, and securing a database with row-level access policies. It wasn't a smooth build — but that's also where most of the learning happened.

---

## Project Status

🚧 Actively being improved. Core features are complete and working. Currently exploring:

- Streaming AI responses (so answers appear progressively instead of all at once)
- Quick topic shortcuts for faster input
- General UI/UX polish

## Planned / Future Ideas

- Voice interaction
- Flashcard generation
- Multi-language support
- Mobile-friendly redesign

---

## Author

**Warda Zulfiqar**
Computer Science Undergraduate
Interested in AI, agentic systems, and educational technology.
