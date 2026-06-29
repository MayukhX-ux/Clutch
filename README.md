# Clutch ⚡ — The Last-Minute Time Saver

Clutch is a professional-grade, high-performance, proactive AI-powered productivity companion designed to solve a critical real-world challenge: helping students, professionals, and entrepreneurs plan, prioritize, and complete tasks before deadlines are missed. 

Moving beyond passive reminders that are easily ignored, Clutch combines a versatile, block-based planning workspace with intelligent AI scheduling assistance, real-time notification alerts, calendar integration, and proactive decision-making helpers powered by Google Gemini.

---

## 🎯 The Last-Minute Life Saver Challenge

### 📖 Background & Problem
Traditional productivity tools rely on static reminders and checklist notifications. These are easily swiped away, resulting in missed meetings, skipped assignments, overdue bill payments, and forgotten commitments. Users need a system that actively helps them take meaningful action rather than just sounding alarms.

### 💡 The Clutch Solution
Clutch acts as an autonomous productivity copilot:
- **Intelligent Prioritization**: Computes progress metrics and dynamically filters high-priority tasks to focus the user's attention where it's needed most.
- **AI-Powered Scheduling & Execution**: Helps users instantly break down complex topics, draft blueprints, and schedule task items right into their calendar.
- **Context-Aware Recommendations**: Leverages the deeply integrated **Clutch AI Assistant** to summarize blocks, expand ideas, improve styling, and suggest actionable micro-tasks.
- **Durable Notification & Sync Engine**: Syncs real-time workspace updates to the cloud and schedules context-aware task actions.

---

## 🚀 Core Features

1. **Intelligent Task & Document Planning (Block-Based Workspace)**:
   - **Perfect-Focus Interactive Editor**: Seamlessly draft task lists, heading sections, horizontal dividers, and code blocks.
   - **Slash Command Menu (`/`)**: Instantly convert block representations to checklists (To-Dos), warning/callout cards, lists, or custom styled headings.
   - **Progress Tracker Indicators**: Real-time progress indicators calculate exactly how many checklist items have been checked off to visualize completion.

2. **Proactive AI Scheduling & Companionship (Gemini Integration)**:
   - **Workspace AI Panel**: Ask custom prompts, brainstorm creative blueprints, or draft complete multi-heading action plans, which can be instantly appended to the active workspace.
   - **Inline AI Refinement**: One-click actions to condense, expand, translate, or proofread your planning document blocks.
   - **Structured Outline Generation**: Draft highly structured task pipelines and templates autonomously.

3. **Integrated Calendar & Scheduling View**:
   - Seamlessly switch from document-view to a comprehensive **Interactive Calendar**.
   - Track scheduled events, deadlines, and task statuses (`Pending`, `In Progress`, `Completed`) visually.
   - Filter by status, search key terms, and quickly inspect task details.

4. **Launch Task Engine**:
   - Easily launch new task items with metadata configuration (Priority levels: Low/Medium/High, Category presets, and Deadlines).
   - Dynamic calendar synchronization options.
   - Opt-in automated reminders and notifications for critical tasks.

5. **Durable Storage & Sync Engine**:
   - Syncs and persists real-time updates using **Google Cloud Firestore**.
   - Offline-ready resilience through automatic fallback to **LocalStorage**, keeping your planning flow lightning-fast and data safe.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19 (TypeScript), Tailwind CSS 4.x, Motion (Animations), Lucide Icons, Vite 6.x.
- **Backend**: Node.js, Express, tsx, esbuild (bundling server module to standalone CommonJS).
- **Database & Syncer**: Google Firebase Web SDK (Cloud Firestore client-side sync).
- **Large Language Model (LLM)**: `@google/genai` TypeScript SDK (utilizing `gemini-2.5-flash` on the secure backend layer).

---

## 💻 Local Development Setup

Follow these commands to configure and start the full-stack server locally:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file at the root of your project:
   ```env
   GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   This boots the custom Express server with Vite middleware on port `3000`. Open `http://localhost:3000` in your web browser.

4. **Production Build & Start**:
   ```bash
   npm run build
   ```
   This compiles static assets into `dist/` and bundles the custom Express TypeScript server into `dist/server.cjs` using esbuild. Then, run:
   ```bash
   npm run start
   ```

---

## 🔒 Security Best Practices

- **Zero Client-Side Secrets**: All sensitive API keys (including the `GEMINI_API_KEY`) are managed strictly server-side. The client application communicates through proxy endpoints (`/api/ai/*`), protecting developer credentials and keys from browser inspection.
- **Validation**: Strict schema checks and parsing logic ensure server stability and prevent malicious payloads.
