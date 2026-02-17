# TutorIQ — AI Powered Learning System

TutorIQ is a college mini-project designed for students who want to **Study Smart, Not Hard**. It uses Google Gemini AI to provide exam-focused answers, concept explanations, and problem-solving guides.

## Features
- **Answer Maker**: High-yield answers for university questions.
- **Exercise Maker**: Syllabus-based practice question generation.
- **Learner Buddy**: Concept teaching with real-life analogies (4-Part Journey).
- **Problem Solver**: Step-by-step C++ & DBMS solutions with dry runs.
- **History**: Keep track of all your past learning sessions.
- **Profile**: Customize AI output by providing your University and Course info.

## Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (Material 3), JS (ES6).
- **Backend**: Node.js & Express.
- **Database**: SQLite (via `better-sqlite3`).
- **AI**: Google Gemini API.
- **Auth**: JWT via cookies + `bcryptjs`.

## Setup Instructions

### 1. Prerequisites
- Node.js installed on your system.

### 2. Installation
1. Clone or download this project.
2. Open terminal in the `tutoriq` folder.
3. Run:
   ```bash
   npm install
   ```

### 3. Configuration
1. Create a `.env` file in the root directory.
2. Add the following:
   ```env
   PORT=3000
   JWT_SECRET=your_super_secret_key_here
   ```

### 4. Running the App
1. Start the server:
   ```bash
   node server/server.js
   ```
2. Open your browser and go to: `http://localhost:3000`

### 5. Using AI Tools
1. Register and Login.
2. Go to **Profile** and save your **Google Gemini API Key**.
   - Get a free key from: [Google AI Studio](https://aistudio.google.com/app/apikey)
3. Go to **Tools** and start studying smart!

---
Made with Love For Students By **Rehan Sayyed**
