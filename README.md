# InterView Alpha - AI Interview Assistant

InterView Alpha is an advanced AI-powered interview helper designed to help developers prepare for and ace technical interviews. It provides real-time guidance, mock interviews, and intelligent code assistance based on your resume and target job descriptions.

## 🚀 Features

- **Mock Interviews**: Practice with AI personas tailored to specific roles and difficulties.
- **AI Code Pad**: Write, execute, and optimize code with real-time AI feedback.
- **Resume Match & Analysis**: Compare your resume against job descriptions to extract key talking points.
- **Knowledge Base (RAG)**: Auto-index your interview prep materials and search your local knowledge base.
- **Multi-Provider Support**: Connect to Groq, OpenAI, Anthropic, Gemini, or local Ollama instances.

## 📝 Resume Integration (How to add this to your Resume)

If you want to showcase this project on your resume, here are some professional bullet points you can use:

*   **Project: InterView Alpha — AI-Powered Interview Assistant**
*   Developed a comprehensive AI interview preparation platform using React, TypeScript, and Electron, integrating multiple LLM providers (OpenAI, Anthropic, Gemini) for real-time mock interviews and code evaluation.
*   Engineered a Retrieval-Augmented Generation (RAG) knowledge base to index and query technical concepts, improving interview prep efficiency.
*   Built an interactive AI Code Pad with real-time execution and optimization feedback, alongside a Resume-to-JD matching engine to generate targeted talking points.

## 🔮 Future Enhancements

- Integration with LeetCode/HackerRank for automated problem fetching.
- Advanced voice analytics (tone, pacing, and filler word detection).
- Peer-to-peer mock interview matching system.
- Automated post-interview feedback reports and study guides.

## 💻 Setup Instructions

To run InterView Alpha locally:

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

---
*Developed by Rahool Gir.*
