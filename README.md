# InterView Alpha - AI Interview Assistant

InterView Alpha is a high-stealth, AI-powered interview assistant designed to help developers ace technical interviews with real-time transcription, vision analysis, and code optimization.

## 🚀 Features

- **Real-time Transcription**: Isolate and transcribe interview questions as they happen.
- **Vision Engine**: Analyze screen content (MCQs, diagrams, code) using advanced vision models.
- **Stealth Camouflage**: Instantly hide the UI behind a Calculator, Jira board, or Developer Docs.
- **RAG Knowledge Base**: Auto-index interview sessions and search your local knowledge base.
- **Multi-Provider Support**: Connect to Groq, OpenAI, Anthropic, Gemini, or local Ollama instances.
- **Command Palette**: Quick navigation and actions via `Ctrl+K`.

## 💻 Windows Setup Instructions

To run InterView Alpha locally on Windows:

### 1. Prerequisites
- **Node.js**: Download and install from [nodejs.org](https://nodejs.org/) (LTS version recommended).
- **Git**: (Optional) For cloning the repository.

### 2. Installation
1. Clone or download the repository to your local machine.
2. Open a terminal (PowerShell or CMD) in the project directory.
3. Run the following command to install dependencies:
   ```bash
   npm install
   ```

### 3. Configuration
1. Create a `.env` file in the root directory (or use the built-in Settings tab in the app).
2. Add your API keys (Groq, OpenAI, etc.):
   ```env
   VITE_GROQ_API_KEY=your_key_here
   VITE_OPENAI_API_KEY=your_key_here
   ```

### 4. Running the App
Start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### 5. Production Build
To create a production-ready build:
```bash
npm run build
```
The output will be in the `dist/` folder.

## ⌨️ Shortcuts

- **Ctrl+K**: Open Command Palette
- **Ctrl+Shift+X**: Toggle Stealth Camouflage (Panic Key)
- **Esc**: Close overlays/modals

## 🛡️ Stealth Tips
- Use **Jira Mode** or **Docs Mode** during interviews to make the app look like part of your workflow.
- Adjust **Backdrop Blur** in Settings to blend the app with your desktop background.
- Use **Floating Mode** for a minimalist, non-intrusive interface.

---
*Developed by Rahool Gir.*
