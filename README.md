# InterView Alpha - AI Interview Helper

InterView Alpha is an advanced, AI-powered interview preparation platform designed to help software engineers and developers ace their technical interviews. By simulating real interview environments and providing instant, intelligent feedback, it bridges the gap between studying and actual performance.

## 🎯 Why Use InterView Alpha? (Benefits)

- **Realistic Practice:** Practice with AI personas that mimic real interviewers (from friendly HR to strict Principal Engineers).
- **Targeted Preparation:** Stop guessing what they will ask. By matching your Resume with a Job Description (JD), the AI generates the exact talking points and questions you are most likely to face.
- **Live Code Evaluation:** Don't just write code; understand its efficiency. The AI Code Pad provides real-time feedback on Time/Space complexity and suggests optimizations.
- **Instant Knowledge Retrieval:** Use the built-in RAG (Retrieval-Augmented Generation) Knowledge Base to quickly search through your study notes and technical concepts.
- **Completely Free to Run:** By utilizing free API tiers (like Groq or Gemini) or local models (Ollama), you get premium interview prep without expensive subscriptions.

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, Framer Motion (Animations), Lucide React (Icons)
- **AI Integration:** `@google/genai`, `openai`, `groq-sdk`, Anthropic API
- **Data Processing:** `pdfjs-dist` (Resume parsing), `tesseract.js` (OCR), Custom VectorStore for RAG
- **Deployment:** Vercel (SPA configured)

## 🚀 Core Features & Usage

### 1. Mock Interviews
*   **How to use:** Go to the Dashboard, select an AI Persona (e.g., "Senior Backend Engineer"), set the difficulty, and start a conversation.
*   **Benefit:** Builds confidence and improves your ability to articulate technical concepts under pressure.

### 2. AI Code Pad
*   **How to use:** Open the Code Sandbox, paste an algorithm problem, and start typing. Click "Analyze" to get AI feedback.
*   **Benefit:** Helps you practice writing clean code while keeping Big-O time and space complexity in mind.

### 3. Resume Match & JD Analysis
*   **How to use:** Upload your PDF resume and paste the Job Description of the role you are applying for.
*   **Benefit:** Generates a customized "Cheat Sheet" of your experiences that perfectly align with the job requirements, giving you the best stories to tell during behavioral rounds.

### 4. Setup & API Configuration
*   **How to use:** Navigate to the Setup tab, select your preferred AI provider (Groq is recommended for fast, free responses), paste your API key, and click Save.

## 💻 Local Setup Instructions

To run InterView Alpha locally:

### 1. Prerequisites
- **Node.js**: Download and install from [nodejs.org](https://nodejs.org/) (LTS version recommended).
- **Git**: (Optional) For cloning the repository.

### 2. Installation
1. Clone or download the repository to your local machine.
2. Open a terminal in the project directory.
3. Run the following command to install dependencies:
   ```bash
   npm install
   ```

### 3. Running the App
Start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## 📄 Resume Integration Text

If you want to include this project in your resume, here is a professional way to describe it:

**InterView Alpha — AI-Powered Interview Preparation Platform**
*   Architected and developed a comprehensive interview preparation platform using React, TypeScript, and Vite.
*   Integrated multiple LLM providers (OpenAI, Anthropic, Gemini) and built a local RAG (Retrieval-Augmented Generation) knowledge base for instant concept retrieval.
*   Engineered an AI-driven Resume-to-JD matching engine that generates customized talking points, mock questions, and technical cheat sheets.
*   Implemented a live AI Codepad for algorithm practice with real-time execution and AI feedback.

## 🔮 Future Enhancements

We are continuously working to improve InterView Alpha. Planned features include:
- **Peer-to-Peer Mock Interviews**: Connect with other developers for live mock interview practice.
- **Advanced System Design Canvas**: A collaborative whiteboard for practicing system design questions with AI feedback.
- **Automated Application Tracking**: A built-in Kanban board to track your job applications and interview stages.
- **Behavioral Answer Grader**: Advanced sentiment and tone analysis to grade STAR-method behavioral responses.

---
*Developed by Rahool Gir.*
