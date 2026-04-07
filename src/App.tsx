import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import Tesseract from 'tesseract.js';
import ProfileContact from './components/ProfileContact';
import { 
  Mic, Monitor, FileText, Settings, LayoutDashboard, 
  History, Download, Play, CheckCircle2, AlertCircle, 
  Terminal, Code2, Zap, Shield, BrainCircuit, MessageSquare,
  Cpu, Activity, Lock, EyeOff, Keyboard, Save, Copy, TestTube, Trash2, Send,
  Volume2, Target, BarChart, BookOpen, Briefcase, Sliders, Database, Search, Quote, Clock, FastForward,
  Maximize2, Minimize2, Check, X, ChevronRight, Sparkles, Minus, Square, ArrowRight, Loader2, HelpCircle, User,
  TrendingUp, TrendingDown, Smile, Frown, Meh, VolumeX, Headphones, Smartphone, Laptop, Tablet, Watch, Tv, Camera, Bluetooth, Wifi, Battery, Signal, ZapOff, Moon, Sun, RefreshCw
} from 'lucide-react';

declare global {
  interface Window {
    electronAPI?: {
      closeApp: () => void;
      minimizeApp: () => void;
      maximizeApp: () => void;
      setIgnoreMouseEvents: (ignore: boolean) => void;
    };
  }
}

const getModelsByProvider = (p: string) => {
  switch (p) {
    case 'openai': return [
      { value: 'gpt-4o', label: 'GPT-4o (Most Accurate)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' }
    ];
    case 'anthropic': return [
      { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
    ];
    case 'gemini': return [
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
    ];
    case 'ollama': return [
      { value: 'llama3', label: 'Llama 3 (Local)' },
      { value: 'mistral', label: 'Mistral (Local)' }
    ];
    default: return [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' }
    ];
  }
};

const getVisionModelsByProvider = (p: string) => {
  switch (p) {
    case 'openai': return [{ value: 'gpt-4o', label: 'GPT-4o Vision' }];
    case 'anthropic': return [{ value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet Vision' }];
    case 'gemini': return [{ value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro Vision' }];
    case 'ollama': return [{ value: 'llava', label: 'LLaVA (Local Vision)' }];
    default: return [
      { value: 'llama-3.2-90b-vision-preview', label: 'Llama 3.2 90B Vision' }
    ];
  }
};

// Simple VectorStore for RAG
class VectorStore {
  private items: { text: string, embedding: number[], metadata: any }[] = [];

  // Mock embedding function (in real app, use OpenAI/HuggingFace)
  private async getEmbedding(text: string): Promise<number[]> {
    const words = text.toLowerCase().split(/\W+/);
    const embedding = new Array(128).fill(0);
    words.forEach(word => {
      for (let i = 0; i < word.length; i++) {
        embedding[word.charCodeAt(i) % 128] += 1;
      }
    });
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1;
    return embedding.map(v => v / magnitude);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  async add(text: string, metadata: any = {}) {
    const embedding = await this.getEmbedding(text);
    this.items.push({ text, embedding, metadata });
  }

  async search(query: string, limit: number = 3) {
    const queryEmbedding = await this.getEmbedding(query);
    return this.items
      .map(item => ({ ...item, score: this.cosineSimilarity(item.embedding, queryEmbedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  clear() {
    this.items = [];
  }
}

const vectorStore = new VectorStore();

export default function App() {
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('alpha_has_seen_welcome');
    if (!hasSeenWelcome) {
      setShowWelcomePopup(true);
    }
  }, []);

  const closeWelcomePopup = () => {
    localStorage.setItem('alpha_has_seen_welcome', 'true');
    setShowWelcomePopup(false);
    setActiveTab('setup');
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Setup State
  const [provider, setProvider] = useState(() => localStorage.getItem('alpha_provider') || 'groq');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(`alpha_key_${localStorage.getItem('alpha_provider') || 'groq'}`) || '');
  const [tempApiKey, setTempApiKey] = useState(() => localStorage.getItem(`alpha_key_${localStorage.getItem('alpha_provider') || 'groq'}`) || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem(`alpha_model_${localStorage.getItem('alpha_provider') || 'groq'}`) || 'llama-3.3-70b-versatile');
  const [visionModel, setVisionModel] = useState(() => localStorage.getItem(`alpha_vision_${localStorage.getItem('alpha_provider') || 'groq'}`) || 'llama-3.2-90b-vision-preview');

  useEffect(() => {
    const savedKey = localStorage.getItem(`alpha_key_${provider}`) || '';
    const savedModel = localStorage.getItem(`alpha_model_${provider}`) || getModelsByProvider(provider)[0].value;
    const savedVision = localStorage.getItem(`alpha_vision_${provider}`) || getVisionModelsByProvider(provider)[0].value;
    
    setApiKey(savedKey);
    setTempApiKey(savedKey);
    setSelectedModel(savedModel);
    setVisionModel(savedVision);
    localStorage.setItem('alpha_provider', provider);
  }, [provider]);
  const [isFloatingMode, setIsFloatingMode] = useState(false);
  const [floatingQuestion, setFloatingQuestion] = useState('');
  const [floatingAnswer, setFloatingAnswer] = useState('');
  const [isFloatingGenerating, setIsFloatingGenerating] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [isCalculatorMode, setIsCalculatorMode] = useState(false);
  const [company, setCompany] = useState('Google');
  const [opacity, setOpacity] = useState(90);
  const [isAutopilot, setIsAutopilot] = useState(false);
  const autopilotIntervalRef = useRef<any>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  
  // Global Key Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+X toggles Stealth Camouflage
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        setIsCalculatorMode(prev => {
          const next = !prev;
          addLog(`Stealth mode ${next ? 'activated' : 'deactivated'}`);
          return next;
        });
        setIsStealthMode(prev => !prev);
      }
      
      // Ctrl+K toggles Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }

      // Esc closes Command Palette
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, isCalculatorMode]);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [apiStatus, setApiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const testApiKey = async (key: string) => {
    setApiStatus('testing');
    try {
      addLog(`Testing API Key for ${provider}...`);
      await callAI({
        provider,
        apiKey: key,
        model: selectedModel,
        messages: [{ role: "user", content: "hi" }]
      });
      setApiStatus('success');
      setApiKey(key);
      addLog(`API Key test successful for ${provider}`);
      localStorage.setItem('alpha_provider', provider);
      localStorage.setItem(`alpha_key_${provider}`, key);
      localStorage.setItem(`alpha_model_${provider}`, selectedModel);
      localStorage.setItem(`alpha_vision_${provider}`, visionModel);
    } catch (error) {
      console.error("API Test Error:", error);
      setApiStatus('error');
      addLog(`API Key test failed for ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const saveApiKey = () => {
    setApiKey(tempApiKey);
    localStorage.setItem('alpha_provider', provider);
    localStorage.setItem(`alpha_key_${provider}`, tempApiKey);
    localStorage.setItem(`alpha_model_${provider}`, selectedModel);
    localStorage.setItem(`alpha_vision_${provider}`, visionModel);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      
      if (file.type === 'application/pdf') {
        try {
          const pdfjs = await import('pdfjs-dist');
          // Use the worker from the node_modules directly
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
          
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            // @ts-ignore
            text += content.items.map((item: any) => item.str).join(' ');
          }
          setResumeText(text);
        } catch (err) {
          console.error("Error parsing PDF:", err);
          setResumeText("Error parsing PDF. Please try a text file.");
        }
      } else {
        const reader = new FileReader();
        reader.onload = (e) => setResumeText(e.target?.result as string);
        reader.readAsText(file);
      }
    }
  };

  const [isGhostMode, setIsGhostMode] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(false);
  const [isSubtitlesMode, setIsSubtitlesMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTransparentDashboard, setIsTransparentDashboard] = useState(false);
  const [backdropBlur, setBackdropBlur] = useState(10);
  
  // 🎭 New Features State
  const [toneFeedback, setToneFeedback] = useState<string>("");
  const [confidenceLevel, setConfidenceLevel] = useState<number>(85);
  const [starProgress, setStarProgress] = useState({ s: false, t: false, a: false, r: false });
  const [cheatSheet, setCheatSheet] = useState<string>("");
  const [isGeneratingCheatSheet, setIsGeneratingCheatSheet] = useState(false);
  const [technicalTerms, setTechnicalTerms] = useState<{ term: string, definition: string }[]>([]);
  const [interviewerSentiment, setInterviewerSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [isAutoAnalyzeMCQ, setIsAutoAnalyzeMCQ] = useState(false);
  
  // Live Tab State
  const [isRecording, setIsRecording] = useState(false);
  const [liveMode, setLiveMode] = useState('Technical');
  const [liveTone, setLiveTone] = useState('Professional');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [answerTab, setAnswerTab] = useState('bullets');

  // Mock Tab State
  const [mockTopic, setMockTopic] = useState('React & Frontend');
  const [mockDifficulty, setMockDifficulty] = useState('Medium');
  const [mockPersona, setMockPersona] = useState('Friendly');
  const [mockStarted, setMockStarted] = useState(false);
  const [mockQuestion, setMockQuestion] = useState('');
  const [mockAnswer, setMockAnswer] = useState('');
  const [mockFeedback, setMockFeedback] = useState('');
  const [isGeneratingMock, setIsGeneratingMock] = useState(false);
  const [isEvaluatingMock, setIsEvaluatingMock] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [sttProvider, setSttProvider] = useState(() => localStorage.getItem('alpha_stt_provider') || 'browser');
  const [deepgramKey, setDeepgramKey] = useState(() => localStorage.getItem('alpha_deepgram_key') || '');

  const callAI = async (params: {
    provider: string,
    apiKey: string,
    model: string,
    messages: any[],
    temperature?: number,
    max_tokens?: number,
    isVision?: boolean,
    image_url?: string,
    stream?: boolean,
    onStream?: (chunk: string) => void,
    config?: any
  }) => {
    const { provider, apiKey, model, messages, temperature = 0.2, max_tokens = 1024, isVision = false, image_url, stream = false, onStream, config } = params;

    let url = '';
    let headers: any = { 'Content-Type': 'application/json' };
    let body: any = {};

    try {
      switch (provider) {
        case 'openai':
          url = 'https://api.openai.com/v1/chat/completions';
          headers['Authorization'] = `Bearer ${apiKey}`;
          body = { model, messages, temperature, max_tokens, stream };
          if (isVision && image_url) {
            body.messages = [{ 
              role: "user", 
              content: [
                { type: "text", text: messages[messages.length - 1].content },
                { type: "image_url", image_url: { url: image_url } }
              ]
            }];
          }
          break;
        case 'anthropic':
          url = 'https://api.anthropic.com/v1/messages';
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
          headers['dangerously-allow-browser'] = 'true';
          body = { 
            model, 
            messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
            system: messages.find(m => m.role === 'system')?.content,
            max_tokens,
            stream
          };
          break;
        case 'gemini':
          url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${stream ? 'streamGenerateContent' : 'generateContent'}?key=${apiKey}`;
          body = { 
            contents: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
            ...config
          };
          break;
        case 'ollama':
          url = 'http://localhost:11434/api/chat';
          body = { model, messages, stream };
          break;
        default: // groq
          url = 'https://api.groq.com/openai/v1/chat/completions';
          headers['Authorization'] = `Bearer ${apiKey}`;
          body = { model, messages, temperature, max_tokens, stream };
          if (isVision && image_url) {
            body.messages = [{ 
              role: "user", 
              content: [
                { type: "text", text: messages[messages.length - 1].content },
                { type: "image_url", image_url: { url: image_url } }
              ]
            }];
          }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || data.message || "API Error");
      }

      if (stream && onStream && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          
          if (provider === 'openai' || provider === 'groq') {
            const lines = chunk.split('\n').filter(l => l.trim() !== '');
            for (const line of lines) {
              if (line.includes('[DONE]')) continue;
              if (line.startsWith('data: ')) {
                try {
                  const json = JSON.parse(line.replace('data: ', ''));
                  const content = json.choices[0]?.delta?.content || '';
                  if (content) {
                    fullText += content;
                    onStream(content);
                  }
                } catch (e) {}
              }
            }
          } else if (provider === 'anthropic') {
            const lines = chunk.split('\n').filter(l => l.trim() !== '');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const json = JSON.parse(line.replace('data: ', ''));
                  if (json.type === 'content_block_delta') {
                    const content = json.delta?.text || '';
                    fullText += content;
                    onStream(content);
                  }
                } catch (e) {}
              }
            }
          } else if (provider === 'ollama') {
            try {
              const json = JSON.parse(chunk);
              const content = json.message?.content || '';
              if (content) {
                fullText += content;
                onStream(content);
              }
            } catch (e) {}
          } else if (provider === 'gemini') {
            // Gemini streaming is a bit different, usually an array of objects
            try {
              const json = JSON.parse(chunk);
              const content = json[0]?.candidates[0]?.content?.parts[0]?.text || '';
              if (content) {
                fullText += content;
                onStream(content);
              }
            } catch (e) {}
          }
        }
        return fullText;
      } else {
        const data = await response.json();
        if (provider === 'anthropic') return data.content[0].text;
        if (provider === 'gemini') return data.candidates[0].content.parts[0].text;
        if (provider === 'ollama') return data.message.content;
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error(`AI Call Error (${provider}):`, error);
      throw error;
    }
  };

  const generateMockQuestion = async () => {
    if (!apiKey) return;
    setIsGeneratingMock(true);
    setMockStarted(true);
    setMockFeedback('');
    setMockAnswer('');
    try {
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "user", content: `You are a ${mockPersona} interviewer. Generate a single ${mockDifficulty} difficulty interview question about ${mockTopic} for a ${company} interview. Respond in ${language}. Do not include the answer, just the question.` }]
      });
      setMockQuestion(content);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingMock(false);
    }
  };

  const evaluateMockAnswer = async () => {
    if (!apiKey || !mockAnswer) return;
    setIsEvaluatingMock(true);
    try {
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "user", content: `Evaluate this answer to the interview question. Question: "${mockQuestion}". Answer: "${mockAnswer}". Provide a score out of 10 and brief, constructive feedback in ${language}.` }]
      });
      setMockFeedback(content);
      setHistory(prev => [{ type: 'Mock Interview', query: mockQuestion, response: content, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    } catch (error) {
      console.error(error);
    } finally {
      setIsEvaluatingMock(false);
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingLive, setIsGeneratingLive] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [thankYouNote, setThankYouNote] = useState<string | null>(null);
  const [companyIntel, setCompanyIntel] = useState<string[]>([]);
  const [talkingPoints, setTalkingPoints] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [showBridgePhrases, setShowBridgePhrases] = useState(false);
  const [sentiment, setSentiment] = useState<'Positive' | 'Neutral' | 'Critical' | 'Impressed' | 'Skeptical'>('Neutral');
  const [predictedNextQuestion, setPredictedNextQuestion] = useState<string | null>(null);
  const [interviewStage, setInterviewStage] = useState<'Intro' | 'Technical' | 'Behavioral' | 'Q&A'>('Intro');
  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  const bridgePhrases = [
    "That's a great question, let me break that down...",
    "To ensure I'm addressing the core of your question...",
    "That's an interesting perspective, from my experience...",
    "Let me think about the most relevant example for that...",
    "I want to make sure I give you a comprehensive answer..."
  ];

  const predictNextQuestion = async () => {
    if (!apiKey || !transcript) return;
    try {
      const prompt = `Based on the current interview transcript, predict the most likely NEXT question the interviewer will ask.
      Transcript: ${transcript.slice(-1500)}
      Company: ${company}
      Role: ${jdText.slice(0, 500)}
      Provide only the predicted question.`;
      
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "system", content: "You are an expert interviewer." }, { role: "user", content: prompt }]
      });
      setPredictedNextQuestion(content);
    } catch (e) { console.error(e); }
  };

  const runCode = () => {
    setIsExecuting(true);
    setSandboxOutput('');
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    
    try {
      // Simple JS execution
      new Function(sandboxCode)();
      setSandboxOutput(logs.join('\n') || 'Code executed successfully (no output).');
    } catch (err: any) {
      setSandboxOutput(`Error: ${err.message}`);
    } finally {
      console.log = originalLog;
      setIsExecuting(false);
    }
  };

  const fetchCompanyIntel = async () => {
    if (!apiKey || !company || company === 'Target Company') return;
    try {
      const prompt = `Provide 4 quick, high-impact facts about ${company} that a candidate should know for an interview (e.g., core values, recent news, tech stack). Keep each fact under 10 words.`;
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "system", content: "You are a corporate researcher." }, { role: "user", content: prompt }]
      });
      setCompanyIntel(content.split('\n').filter(l => l.trim()).map(l => l.replace(/^[*-]\s*/, '')).slice(0, 4));
    } catch (e) { console.error(e); }
  };

  const generateThankYouNote = async () => {
    if (!apiKey || !transcript) return;
    setIsGeneratingLive(true);
    try {
      const prompt = `Based on this interview transcript, write a professional, concise "Thank You" email. Mention a specific topic we discussed to make it personal.
      Transcript: ${transcript.slice(-2000)}
      Company: ${company}`;
      
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "system", content: "You are a professional career coach." }, { role: "user", content: prompt }]
      });
      setThankYouNote(content);
      addLog('Thank you note generated');
    } catch (e) { console.error(e); }
    finally { setIsGeneratingLive(false); }
  };

  const extractTalkingPoints = async () => {
    if (!apiKey || (!resumeText && !jdText)) return;
    try {
      const prompt = `Based on this Resume and Job Description, list 5 critical "Talking Points" or "Keywords" the candidate MUST mention to win this interview. 
      Resume: ${resumeText}
      JD: ${jdText}
      Provide only a bulleted list of short phrases (max 4 words each).`;
      
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "system", content: "You are a career coach." }, { role: "user", content: prompt }]
      });
      setTalkingPoints(content.split('\n').filter(l => l.trim()).map(l => l.replace(/^[*-]\s*/, '')).slice(0, 5));
    } catch (e) { console.error(e); }
  };

  const generateSuggestedQuestions = async () => {
    if (!apiKey) return;
    setIsGeneratingQuestions(true);
    try {
      const prompt = `Based on the following context, suggest 3 insightful questions the candidate should ask the interviewer at the end of the interview.
      
      Job Description: ${jdText || 'Not provided'}
      User Resume: ${resumeText || 'Not provided'}
      Recent Transcript: ${transcript.slice(-1000)}
      Company: ${company}
      
      Provide only the 3 questions as a bulleted list.`;

      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "system", content: "You are an expert interview coach." }, { role: "user", content: prompt }]
      });
      setSuggestedQuestions(content.split('\n').filter(q => q.trim().length > 0).slice(0, 3));
      addLog('Suggested questions generated');
    } catch (error) {
      console.error("Error generating questions:", error);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [screenAnalysisPrompt, setScreenAnalysisPrompt] = useState('Analyze this screen. If it is a Multiple Choice Question (MCQ), clearly state the correct option(s) and a short reason.');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (transcript.length > 0 && transcript.length % 100 === 0) {
      // Simple heuristic for sentiment or use AI
      const positiveWords = ['great', 'good', 'excellent', 'exactly', 'perfect', 'interesting'];
      const negativeWords = ['actually', 'however', 'but', 'unfortunately', 'wrong', 'incorrect'];
      
      let score = 0;
      positiveWords.forEach(w => { if (transcript.toLowerCase().includes(w)) score++; });
      negativeWords.forEach(w => { if (transcript.toLowerCase().includes(w)) score--; });
      
      if (score > 1) setSentiment('Positive');
      else if (score < -1) setSentiment('Critical');
      else setSentiment('Neutral');
    }
  }, [transcript]);

  useEffect(() => {
    if (resumeText || jdText) {
      extractTalkingPoints();
    }
  }, [resumeText, jdText]);
  useEffect(() => {
    if (!transcript) return;
    if (!sessionStartTime) setSessionStartTime(Date.now());
    
    const words = transcript.trim().split(/\s+/);
    const fillers = ['um', 'uh', 'like', 'actually', 'basically', 'you know'];
    const newCounts = { ...fillerWordsCount };
    
    // Count fillers
    fillers.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = transcript.toLowerCase().match(regex);
      if (matches) {
        newCounts[filler] = matches.length;
      }
    });
    setFillerWordsCount(newCounts);

    // Calculate Speech Rate (WPM)
    const elapsedMinutes = (Date.now() - (sessionStartTime || Date.now())) / 60000;
    if (elapsedMinutes > 0.1) {
      const wpm = Math.round(words.length / elapsedMinutes);
      setSpeechRate(wpm);
      
      // Heuristic for confidence score based on fillers and speech rate
      let score = 100;
      const totalFillers = Object.values(newCounts).reduce((a, b) => a + b, 0);
      score -= (totalFillers * 2); // -2% per filler
      
      if (wpm > 160) score -= (wpm - 160); // Penalty for rushing
      if (wpm < 100) score -= (100 - wpm); // Penalty for being too slow
      
      setConfidenceScore(Math.max(10, Math.min(100, score)));
    }

    // Contextual Intelligence Logic
    if (transcript.length > 50) {
      const keywords = [...resumeText.split(/\s+/), ...jdText.split(/\s+/)].filter(w => w.length > 5);
      const found = keywords.filter(kw => transcript.toLowerCase().includes(kw.toLowerCase())).slice(0, 3);
      if (found.length > 0) {
        setContextualHints(prev => Array.from(new Set([...prev, ...found])).slice(-5));
      }
    }
  }, [transcript]);

  useEffect(() => {
    if (transcript.length > 50 && transcript.length % 200 === 0 && apiKey) {
      const analyzeTone = async () => {
        try {
          const prompt = `Analyze the user's tone and confidence in this interview transcript. 
          Provide a short, 1-sentence feedback (e.g., "You sound confident, but try to slow down") and a confidence score (0-100).
          Transcript: ${transcript.slice(-500)}`;
          
          const response = await callAI({
            provider,
            apiKey,
            model: selectedModel,
            messages: [{ role: "user", content: prompt }],
            config: { responseMimeType: "application/json" }
          });
          
          try {
            const data = JSON.parse(response);
            setToneFeedback(data.feedback);
            setConfidenceLevel(data.score);
            if (data.score < 60) toast.warning("Confidence Alert: Try to sound more assertive!");
          } catch {
            setToneFeedback(response.slice(0, 100));
          }
        } catch (error) {
          console.error("Tone Analysis Error:", error);
        }
      };
      analyzeTone();
    }
  }, [transcript, apiKey]);

  useEffect(() => {
    if (transcript.toLowerCase().includes('situation')) setStarProgress(p => ({ ...p, s: true }));
    if (transcript.toLowerCase().includes('task')) setStarProgress(p => ({ ...p, t: true }));
    if (transcript.toLowerCase().includes('action') || transcript.toLowerCase().includes('implemented')) setStarProgress(p => ({ ...p, a: true }));
    if (transcript.toLowerCase().includes('result') || transcript.toLowerCase().includes('outcome')) setStarProgress(p => ({ ...p, r: true }));
  }, [transcript]);

  const generateCheatSheet = async () => {
    if (!apiKey || (!resumeText && !jdText)) {
      toast.error("Please upload resume and JD first!");
      return;
    }
    setIsGeneratingCheatSheet(true);
    try {
      const prompt = `Generate a 1-page "Interview Cheat Sheet" based on this Resume and Job Description.
      Include: 
      1. Top 3 technical skills to emphasize.
      2. 3 likely behavioral questions and suggested STAR points.
      3. 2 "Killer" questions for the interviewer.
      4. Key company values to mention.
      
      Resume: ${resumeText.slice(0, 2000)}
      JD: ${jdText.slice(0, 2000)}`;
      
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "user", content: prompt }]
      });
      setCheatSheet(content);
      toast.success("Cheat Sheet Generated!");
    } catch (error) {
      toast.error("Failed to generate cheat sheet");
    } finally {
      setIsGeneratingCheatSheet(false);
    }
  };

  // Advanced Features State
  const [isTeleprompterMode, setIsTeleprompterMode] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(true);
  
  // God-Mode Features
  const [isAECEnabled, setIsAECEnabled] = useState(true);
  const [proactiveSuggestion, setProactiveSuggestion] = useState<string | null>(null);
  const [contextualHints, setContextualHints] = useState<string[]>([]);

  // Real Screen Analysis State
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // God-Level Features State
  const [aiPersona, setAiPersona] = useState('standard'); // standard, google, amazon, startup
  const [isStarMode, setIsStarMode] = useState(false);
  const [fillerWordsCount, setFillerWordsCount] = useState<{ [key: string]: number }>({
    'um': 0, 'uh': 0, 'like': 0, 'actually': 0, 'basically': 0, 'you know': 0
  });
  const [speechRate, setSpeechRate] = useState(0); // words per minute
  const [confidenceScore, setConfidenceScore] = useState(100);
  const [isCodeSandboxOpen, setIsCodeSandboxOpen] = useState(false);
  const [sandboxCode, setSandboxCode] = useState('// Write your code here\nconsole.log("Hello, World!");');
  const [sandboxOutput, setSandboxOutput] = useState('');
  const [isNotchMode, setIsNotchMode] = useState(false);
  const [activeFloatingModules, setActiveFloatingModules] = useState({
    transcript: true,
    answer: true,
    hints: true,
    mcq: false,
    subtitles: false
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const toggleClickThrough = () => {
    setIsClickThrough(!isClickThrough);
    window.electronAPI?.setIgnoreMouseEvents(!isClickThrough);
  };

  // AI Codepad State
  const [code, setCode] = useState(`def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`);
  const [codeLanguage, setCodeLanguage] = useState('Python');
  const [isOptimizingCode, setIsOptimizingCode] = useState(false);
  const [codeExplanation, setCodeExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [codePrompt, setCodePrompt] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Resume Match State
  const [matchResult, setMatchResult] = useState('');
  const [isMatching, setIsMatching] = useState(false);

  // History State
  const [history, setHistory] = useState<any[]>(() => JSON.parse(localStorage.getItem('interviewHistory') || '[]'));

  useEffect(() => {
    localStorage.setItem('interviewHistory', JSON.stringify(history));
  }, [history]);

  // Real Screen Analysis Logic
  const startScreenShare = async () => {
    setScreenShareError(null);
    try {
      // Requesting both video and audio for system capture
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScreenSharing(true);
      }
    } catch (err: any) {
      const errorMessage = err.message || String(err);
      console.error("Error starting screen share:", err);
      
      if (errorMessage.includes("display-capture") || errorMessage.includes("Permission denied")) {
        setScreenShareError("Screen sharing is restricted. Please ensure you are not in a restricted iframe. Try opening the app in a new tab using the button in the top right for full access.");
      } else {
        setScreenShareError(`Screen sharing failed: ${errorMessage}. Please ensure you have granted permission and selected a window/screen.`);
      }
    }
  };

  // Screen Analysis State

  const refineAnswer = async (currentAnswer: string, command: string) => {
    if (!apiKey || !currentAnswer) return;
    
    setIsAnalyzing(true);
    try {
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [
          { role: "system", content: `You are an expert technical interviewer. 
          
          INSTRUCTIONS:
          1. Refine the provided answer based on the command: ${command}. 
          2. Keep it concise, professional, and impactful.
          3. If the persona is set to STAR mode, ensure the answer follows the Situation, Task, Action, Result format.
          4. Maintain the professional persona of the interviewer.
          
          Respond in ${language}.` },
          { role: "user", content: currentAnswer }
        ],
        temperature: 0.3
      });
      if (analysisResult) setAnalysisResult(content);
      else if (liveAnswer) setLiveAnswer(content);
    } catch (error) {
      console.error("Refine Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidence = (text: string) => {
    const match = text.match(/📊 CONFIDENCE: (\d+)%/i);
    return match ? parseInt(match[1]) : null;
  };

  const renderConfidenceBar = (confidence: number) => {
    const colorClass = confidence > 80 ? 'bg-emerald-500' : confidence > 50 ? 'bg-amber-500' : 'bg-red-500';
    return (
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${colorClass} transition-all duration-1000`} style={{ width: `${confidence}%` }}></div>
        </div>
        <span className={`text-[10px] font-bold ${colorClass.replace('bg-', 'text-')} uppercase tracking-tighter`}>
          {confidence}% Confidence
        </span>
      </div>
    );
  };
  const analyzeScreen = async (isAuto = false, isMCQMode = false) => {
    if (!videoRef.current || !canvasRef.current || !apiKey) {
      if (!isAuto) {
        let msg = "Error:";
        if (!apiKey) msg += " API Key missing.";
        if (!videoRef.current) msg += " Video not ready (Screen share not active).";
        setAnalysisResult(msg);
      }
      return;
    }
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (video.videoWidth === 0) return; // Video not playing yet

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    // Compress image to save tokens and latency, but keep quality high enough for text OCR
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    if (!isAuto) setIsAnalyzing(true);
    addLog(`Screen analysis triggered (${isMCQMode ? 'MCQ' : 'General'})`);
    
    // OCR Extraction
    const { data: { text } } = await Tesseract.recognize(base64Image, 'eng');
    addLog(`OCR Extracted text: ${text.substring(0, 50)}...`);

    const getPersonaPrompt = () => {
      let personaText = "";
      switch (aiPersona) {
        case 'google':
          personaText = "Adopt a 'Google Interviewer' persona: focus on algorithmic efficiency, Big O notation, and edge cases. Be extremely precise and technical.";
          break;
        case 'amazon':
          personaText = "Adopt an 'Amazon Interviewer' persona: focus on Leadership Principles (Ownership, Customer Obsession, etc.) and scalability. Use data-driven reasoning.";
          break;
        case 'startup':
          personaText = "Adopt a 'Startup Founder' persona: focus on speed, pragmatism, 'getting things done', and modern tech stacks. Be direct and concise.";
          break;
        default:
          personaText = "Adopt a standard 'Expert Technical Interviewer' persona: be professional, accurate, and helpful.";
      }
      
      if (isStarMode) {
        personaText += " MANDATORY: Format behavioral answers using the STAR method (Situation, Task, Action, Result).";
      }
      return personaText;
    };

    const mcqPrompt = `${getPersonaPrompt()} You are an expert test-taker. Analyze this text extracted from the screen: "${text}". 
    
    INSTRUCTIONS:
    1. If the text is garbled, try to infer the question based on context.
    2. Extract the question and all options.
    3. Identify the CORRECT OPTION(S).
    4. Provide a short, precise explanation.
    5. Provide a CONFIDENCE SCORE (0-100%).
    
    FORMAT:
    🎯 CORRECT OPTION: [Option]
    📝 REASON: [Short Reason]
    📊 CONFIDENCE: [Score]%
    
    Respond in ${language}.`;

    const generalPrompt = `${getPersonaPrompt()} You are an expert technical interviewer and copilot. Analyze the provided text extracted from the screen: "${text}". 
    
    INSTRUCTIONS:
    1. If the text is garbled, try to infer the question based on context.
    2. If it contains a coding question, provide a highly accurate, concise, and direct solution.
    3. If it contains an interview question, provide a professional answer.
    4. If it is an MCQ, state the CORRECT OPTION(S) and brief explanation.
    5. Provide a CONFIDENCE SCORE (0-100%).
    
    FORMAT:
    💡 ANSWER/SOLUTION: [Concise Answer]
    📊 CONFIDENCE: [Score]%
    
    Respond in ${language}.
    If you do not see a question, respond with 'No question detected on screen.' Do not hallucinate. Additional context: ${screenAnalysisPrompt}`;

    const finalPrompt = isMCQMode ? mcqPrompt : generalPrompt;

    try {
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "user", content: finalPrompt }]
      });

      // Don't update UI if it's auto mode and no question was detected
      if (isAuto && content.toLowerCase().includes('no question detected')) {
        return;
      }

      setAnalysisResult(content);
      if (isAuto && content.length > 20) {
        setHistory(prev => [{ type: 'Screen Analysis', query: 'Auto-detected question', response: content, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
      }
    } catch (error) {
      console.error("AI Error (Screen):", error);
      if (!isAuto) setAnalysisResult("Error analyzing screen.");
    } finally {
      if (!isAuto) setIsAnalyzing(false);
    }
  };

  const toggleAutopilot = () => {
    if (isAutopilot) {
      setIsAutopilot(false);
      if (autopilotIntervalRef.current) clearInterval(autopilotIntervalRef.current);
    } else {
      setIsAutopilot(true);
      analyzeScreen(true); // Initial call
      autopilotIntervalRef.current = setInterval(() => {
        analyzeScreen(true);
      }, 5000); // Every 5 seconds
    }
  };

  // Language State
  const [language, setLanguage] = useState('English');

  // AI Codepad Logic
  const analyzeComplexity = (codeStr: string) => {
    let time = 'O(1)';
    let space = 'O(1)';
    
    const hasLoop = /for|while|foreach|\.map|\.forEach|\.reduce/g.test(codeStr);
    const hasNestedLoop = /(for|while).*\{(?:[^{}]*\{[^{}]*\})*[^{}]*(for|while)/s.test(codeStr);
    const hasRecursion = /function\s+(\w+).*?\1\s*\(/s.test(codeStr);
    const hasMap = /new\s+(Map|Set)|\[\]|\{\}/g.test(codeStr);
    
    if (hasNestedLoop) time = 'O(n²)';
    else if (hasRecursion) time = 'O(2ⁿ) or O(log n)';
    else if (hasLoop) time = 'O(n)';
    
    if (hasMap) space = 'O(n)';
    
    return { time, space };
  };

  const generateCode = async () => {
    if (!apiKey || !codePrompt) return;
    setIsGeneratingCode(true);
    try {
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "user", content: `Generate clean, efficient ${codeLanguage} code for: ${codePrompt}. Provide only the code, no explanation.` }]
      });
      const generatedCode = content.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim();
      if (generatedCode) {
        setCode(generatedCode);
        setHistory(prev => [{ type: 'Code Generation', query: codePrompt, response: 'Code generated successfully.', time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const optimizeCode = async () => {
    if (!apiKey || !code) return;
    setIsOptimizingCode(true);
    try {
      const complexity = analyzeComplexity(code);
      addLog(`Optimizing code. Current complexity: ${complexity.time}`);
      
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "user", content: `Optimize this ${codeLanguage} code for ${complexity.time} time complexity. Current analysis: Time ${complexity.time}, Space ${complexity.space}. Provide only the optimized code, no explanation:\n\n${code}` }]
      });
      const optimized = content.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim();
      if (optimized) {
        setCode(optimized);
        addLog(`Code optimized successfully to ${codeLanguage}`);
        setHistory(prev => [{ type: 'Code Optimization', query: 'Optimized existing code', response: 'Code optimized successfully.', time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
      }
    } catch (error) {
      console.error(error);
      addLog('Code optimization failed', 'error');
    } finally {
      setIsOptimizingCode(false);
    }
  };

  const generateUnitTests = async () => {
    if (!apiKey || !code) return;
    setIsGeneratingCode(true);
    try {
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "user", content: `Generate comprehensive unit tests for this ${codeLanguage} code. Provide only the test code, no explanation:\n\n${code}` }]
      });
      const tests = content.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim();
      if (tests) {
        setCodeExplanation(prev => prev + "\n\n### Unit Tests\n```" + codeLanguage.toLowerCase() + "\n" + tests + "\n```");
        setHistory(prev => [{ type: 'Unit Test Generation', query: 'Generated tests for code', response: 'Tests generated successfully.', time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingCode(false);
    }
  };
  const explainCode = async () => {
    if (!apiKey) {
      setCodeExplanation("Please enter your API Key in Setup.");
      return;
    }
    setIsExplaining(true);
    try {
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "user", content: `Explain this ${codeLanguage} code and analyze its time and space complexity. Respond in ${language}:\n\n${code}` }]
      });
      setCodeExplanation(content);
      setHistory(prev => [{ type: 'Code Explanation', query: code.substring(0, 50) + '...', response: content, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    } catch (error) {
      console.error(error);
      setCodeExplanation("Error explaining code.");
    } finally {
      setIsExplaining(false);
    }
  };

  const [textQuery, setTextQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<string | null>(null);

  const handleTextQuery = async () => {
    if (!apiKey || !textQuery) return;
    setIsQuerying(true);
    try {
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "user", content: `You are an expert technical interviewer. Answer this question concisely in ${language}:\n\n${textQuery}` }]
      });
      setQueryResult(content);
      setHistory(prev => [{ type: 'Text Query', query: textQuery, response: content, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    } catch (error) {
      console.error(error);
      setQueryResult("Error querying AI.");
    } finally {
      setIsQuerying(false);
    }
  };

  // Resume Match Logic
  const analyzeMatch = async () => {
    if (!apiKey) {
      setMatchResult("Please enter your API Key in Setup.");
      return;
    }
    setIsMatching(true);
    try {
      const content = await callAI({
        provider,
        apiKey,
        model: selectedModel,
        messages: [{ role: "user", content: `Compare this resume with this job description and provide a match score (0-100) and list missing skills. Respond in ${language}:\n\nResume:\n${resumeText}\n\nJD:\n${jdText}` }]
      });
      setMatchResult(content);
      setHistory(prev => [{ type: 'Resume Match', query: 'Resume vs JD Analysis', response: content, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    } catch (error) {
      console.error(error);
      setMatchResult("Error analyzing match.");
    } finally {
      setIsMatching(false);
    }
  };

  // TTS function with AEC
  const speakAnswer = (text: string) => {
    if (isAECEnabled) {
      // Mute mic logic would go here
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  // Proactive Suggestion Logic (Simulated)
  const triggerProactiveSuggestion = () => {
    setProactiveSuggestion("Try mentioning your Project X experience now.");
    setTimeout(() => setProactiveSuggestion(null), 5000);
  };

  // Voice Recognition setup
  // Live Copilot AI Generation
  const [liveAnswer, setLiveAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!transcript || !apiKey) return;

    const timeoutId = setTimeout(async () => {
      setIsGeneratingLive(true);
      setLiveAnswer(""); // Reset for streaming
      try {
        const isBehavioral = transcript.toLowerCase().includes('tell me about a time') || 
                            transcript.toLowerCase().includes('describe a situation') ||
                            transcript.toLowerCase().includes('give an example of');

        const systemPrompt = `You are an expert technical interview copilot. 
        The user is interviewing for a ${company} role. 
        Job Description: ${jdText || 'Not provided'}
        User Resume: ${resumeText || 'Not provided'}
        Mode: ${liveMode}
        Tone: ${liveTone}
        Language: ${language}
        
        Guidelines:
        1. Provide concise, highly accurate answers.
        2. ${isBehavioral ? 'This sounds like a behavioral question. Use the STAR (Situation, Task, Action, Result) method to structure your answer based on the user\'s resume.' : 'Focus on technical accuracy and best practices.'}
        3. If the user's resume has relevant experience, mention it naturally (e.g., "In my experience at [Company]...").
        4. Keep it conversational but professional.`;

        const content = await callAI({
          provider,
          apiKey,
          model: selectedModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: transcript }
          ],
          stream: true,
          onStream: (chunk) => {
            setLiveAnswer(prev => (prev || "") + chunk);
          }
        });
        if (autoSpeak) speakAnswer(content);
        setHistory(prev => [{ type: 'Live Copilot', query: transcript, response: content, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
        
        // Index for RAG
        vectorStore.add(transcript, { type: 'interview_question', company, date: new Date().toISOString() });
        vectorStore.add(content, { type: 'ai_answer', company, date: new Date().toISOString() });
      } catch (error) {
        console.error("Live Copilot Error:", error);
      } finally {
        setIsGeneratingLive(false);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [transcript, apiKey, selectedModel, company, liveMode, liveTone, language, autoSpeak, resumeText, jdText]);

  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    if (sttProvider === 'deepgram' && deepgramKey) {
      startDeepgramListening();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      // Smart Pause: Stop AI if interviewer starts speaking
      window.speechSynthesis.cancel();

      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        setTranscript(finalTranscript.trim());
        
        // Sentiment Analysis (Simulated)
        const text = finalTranscript.toLowerCase();
        if (text.includes('good') || text.includes('great')) setSentiment('Impressed');
        else if (text.includes('but') || text.includes('why')) setSentiment('Skeptical');
        else setSentiment('Neutral');
      }
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (deepgramSocketRef.current) {
      deepgramSocketRef.current.close();
    }
    setIsListening(false);
    
    // Auto-Index transcript to Knowledge Base
    if (transcript && transcript.length > 50) {
      vectorStore.add(transcript, { date: new Date().toISOString(), type: 'Auto-Indexed Session' });
      addLog('Session auto-indexed to Knowledge Base');
    }
  };

  const deepgramSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const startDeepgramListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const socket = new WebSocket('wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000', [
        'token',
        deepgramKey,
      ]);

      socket.onopen = () => {
        setIsListening(true);
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const outputData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            outputData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(outputData.buffer);
          }
        };
      };

      socket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        const transcript = data.channel?.alternatives[0]?.transcript;
        if (transcript && data.is_final) {
          setTranscript(prev => (prev + ' ' + transcript).trim());
        }
      };

      socket.onclose = () => setIsListening(false);
      socket.onerror = (err) => console.error("Deepgram Error:", err);
      deepgramSocketRef.current = socket;
    } catch (err) {
      console.error("Deepgram Start Error:", err);
      alert("Could not start Deepgram. Check mic permissions and API key.");
    }
  };

  const runTuringAutopilot = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      // In Electron, we would use desktopCapturer to get the screen
      // For now, we simulate the analysis flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAnalysisResult("Option B is correct based on the code snippet provided in the screenshot.");
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const companies = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Turing', 'Mercor', 'General'];
  const modes = ['Technical', 'Behavioral', 'System Design'];
  const tones = ['Professional', 'Casual', 'Direct'];
  const answerTabs = [
    { id: 'quick', label: 'Quick' },
    { id: 'bullets', label: 'Bullets' },
    { id: 'full', label: 'Full' },
    { id: 'followups', label: 'Follow-ups' }
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const packageJsonCode = `{
  "name": "interview-alpha-pro",
  "version": "9.0.0",
  "description": "InterView Alpha Pro - Ultimate Stealth Interview Assistant",
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "electron .",
    "electron:build": "npm run build && electron-builder --win --x64"
  },
  "build": {
    "appId": "com.interview.alpha",
    "productName": "InterView Alpha Pro",
    "directories": {
      "output": "dist_electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": true,
      "perMachine": false,
      "allowToChangeInstallationDirectory": false,
      "runAfterFinish": true,
      "createDesktopShortcut": true
    }
  }
}`;

  const buildScriptCode = `@echo off
title InterView Alpha Pro - Build System
echo ==========================================
echo    InterView Alpha Pro - Build System
echo ==========================================
echo.
echo [1/3] Installing dependencies...
npm install
echo.
echo [2/3] Installing electron-builder...
npm install electron-builder --save-dev
echo.
echo [3/3] Building Windows Installer (.exe)...
npm run electron:build
echo.
echo ==========================================
echo    BUILD COMPLETE! 
echo    Installer: dist_electron/InterView Alpha Pro Setup.exe
echo ==========================================
pause`;

  const electronMainCode = `const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, session } = require('electron');
const path = require('path');

let mainWindow;
let pipWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { 
      nodeIntegration: true, 
      contextIsolation: false 
    },
    autoHideMenuBar: true,
    transparent: true,
    frame: false, // Frameless for custom UI
    opacity: \${opacity / 100}
  });

  // 🔥 ULTIMATE STEALTH MODE 🔥
  // Invisible to OBS, Zoom, Teams, Snipping Tool, Screen Sharing
  mainWindow.setContentProtection(true);
  
  // Hide from taskbar and keep on top like a screen saver
  mainWindow.setSkipTaskbar(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Handle Screen Sharing Requests for getDisplayMedia
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // Grant access to the first screen found.
      callback({ video: sources[0], audio: 'loopback' });
    }).catch(err => {
      console.log('Error getting sources', err);
    });
  });

  // Load the React App (Assuming it's built or running on localhost:3000)
  // For production, use: mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  mainWindow.loadURL('http://localhost:3000');

  // 📺 PiP Mode Global Shortcut (Ctrl+Shift+P)
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    togglePiP();
  });
}

function togglePiP() {
  if (!pipWindow) {
    pipWindow = new BrowserWindow({
      width: 350, 
      height: 450,
      alwaysOnTop: true, 
      frame: false, 
      transparent: true,
      webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    
    // Stealth for PiP window too
    pipWindow.setContentProtection(true); 
    
    // Load a specific route or send IPC to switch UI to PiP mode
    pipWindow.loadURL('http://localhost:3000?pip=true');
  } else {
    if (pipWindow.isVisible()) {
      pipWindow.hide();
    } else {
      pipWindow.show();
    }
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;

  useEffect(() => {
    if (isFloatingMode) {
      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundImage = 'none';
      document.body.style.backgroundImage = 'none';
    } else {
      document.documentElement.style.backgroundColor = '#050814';
      document.body.style.backgroundColor = '#050814';
    }
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundImage = '';
      document.body.style.backgroundImage = '';
    };
  }, [isFloatingMode]);

  const [stealthModeType, setStealthModeType] = useState<'calculator' | 'jira' | 'docs'>('calculator');
  const [engineLogs, setEngineLogs] = useState<{ time: string, event: string, type: 'info' | 'warn' | 'error' }[]>([]);

  const addLog = (event: string, type: 'info' | 'warn' | 'error' = 'info') => {
    setEngineLogs(prev => [{ time: new Date().toLocaleTimeString(), event, type }, ...prev].slice(0, 100));
  };

  const CommandPalette = () => {
    const commands = [
      { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => setActiveTab('dashboard') },
      { id: 'live', label: 'Go to Live Interview', icon: Mic, action: () => setActiveTab('live') },
      { id: 'codepad', label: 'Go to Codepad', icon: Code2, action: () => setActiveTab('codepad') },
      { id: 'resume', label: 'Go to Resume Builder', icon: FileText, action: () => setActiveTab('resume') },
      { id: 'history', label: 'Go to History', icon: History, action: () => setActiveTab('history') },
      { id: 'settings', label: 'Go to Settings', icon: Settings, action: () => setActiveTab('settings') },
      { id: 'stealth', label: 'Toggle Stealth Mode', icon: Shield, action: () => setIsCalculatorMode(!isCalculatorMode) },
      { id: 'floating', label: 'Toggle Floating Mode', icon: Maximize2, action: () => setIsFloatingMode(!isFloatingMode) },
      { id: 'clear-logs', label: 'Clear Engine Logs', icon: Trash2, action: () => setEngineLogs([]) },
    ];

    const filteredCommands = commands.filter(cmd => 
      cmd.label.toLowerCase().includes(commandSearch.toLowerCase())
    );

    return (
      <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] animate-in fade-in duration-200">
        <div className="w-full max-w-xl bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="p-4 border-b border-slate-800 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-500" />
            <input 
              autoFocus
              type="text" 
              placeholder="Type a command or search..." 
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-600 text-lg"
              value={commandSearch}
              onChange={(e) => setCommandSearch(e.target.value)}
            />
            <div className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-400">ESC</div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic text-sm">No commands found</div>
            ) : (
              filteredCommands.map(cmd => (
                <button 
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setIsCommandPaletteOpen(false);
                    setCommandSearch('');
                  }}
                  className="w-full p-3 rounded-xl flex items-center gap-4 hover:bg-indigo-500/10 hover:text-indigo-400 text-slate-400 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-indigo-500/20 flex items-center justify-center">
                    <cmd.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{cmd.label}</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))
            )}
          </div>
          <div className="p-3 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <span>InterView Alpha OS v4.2</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Select</span>
              <span className="flex items-center gap-1"><Minus className="w-3 h-3" /> Navigate</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Stealth Camouflage Component
  const StealthCamouflage = () => {
    const [calcDisplay, setCalcDisplay] = useState('0');
    const buttons = [
      'C', '±', '%', '÷',
      '7', '8', '9', '×',
      '4', '5', '6', '-',
      '1', '2', '3', '+',
      '0', '.', '='
    ];

    if (stealthModeType === 'jira') {
      return (
        <div className="fixed inset-0 z-[9999] bg-[#F4F5F7] flex flex-col font-sans select-none animate-in fade-in duration-300 overflow-hidden text-slate-900">
          <div className="h-12 bg-[#0747A6] flex items-center px-4 gap-6">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center font-black text-[#0747A6] text-[10px]">J</div>
            <div className="flex gap-4 text-white/80 text-sm font-medium">
              <span>Your work</span>
              <span>Projects</span>
              <span>Filters</span>
              <span>Dashboards</span>
            </div>
          </div>
          <div className="flex-1 flex">
            <div className="w-64 bg-[#F4F5F7] border-r border-slate-200 p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center text-white font-bold text-xs">IA</div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">InterView Alpha</span>
                  <span className="text-[10px] text-slate-500">Software project</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Planning</div>
                <div className="text-sm text-[#0747A6] font-medium bg-blue-50 p-2 rounded">Backlog</div>
                <div className="text-sm text-slate-600 p-2">Board</div>
              </div>
            </div>
            <div className="flex-1 p-8 bg-white">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Backlog</h1>
                <button onClick={() => setIsCalculatorMode(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2">
                {[
                  { id: 'IA-101', title: 'Implement real-time STT isolation', status: 'IN PROGRESS', color: 'bg-blue-100 text-blue-800' },
                  { id: 'IA-102', title: 'Refactor RAG vector store for performance', status: 'TODO', color: 'bg-slate-100 text-slate-800' },
                  { id: 'IA-103', title: 'Add multi-monitor support for vision engine', status: 'TODO', color: 'bg-slate-100 text-slate-800' },
                  { id: 'IA-104', title: 'Fix memory leak in transcription buffer', status: 'DONE', color: 'bg-emerald-100 text-emerald-800' },
                ].map(issue => (
                  <div key={issue.id} className="p-3 border border-slate-200 rounded flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-500">{issue.id}</span>
                      <span className="text-sm text-slate-900">{issue.title}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${issue.color}`}>{issue.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (stealthModeType === 'docs') {
      return (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col font-sans select-none animate-in fade-in duration-300 overflow-hidden text-slate-900">
          <div className="h-16 border-b border-slate-200 flex items-center px-8 justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">D</div>
                <span className="font-bold text-slate-700">Developer Docs</span>
              </div>
              <div className="flex gap-6 text-slate-500 text-sm font-medium">
                <span>Guides</span>
                <span className="text-blue-600 border-b-2 border-blue-600 pb-5 mt-5">API Reference</span>
                <span>Samples</span>
                <span>Support</span>
              </div>
            </div>
            <button onClick={() => setIsCalculatorMode(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className="w-72 border-r border-slate-200 p-6 overflow-y-auto custom-scrollbar bg-slate-50">
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Core Concepts</div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-600">Authentication</div>
                  <div className="text-sm text-slate-600">Rate Limiting</div>
                  <div className="text-sm text-blue-600 font-bold">Real-time Streaming</div>
                  <div className="text-sm text-slate-600">Error Handling</div>
                </div>
              </div>
            </div>
            <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
              <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Real-time Streaming API</h1>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  The Streaming API allows you to receive real-time updates for long-running operations. 
                  This is particularly useful for AI-driven applications where low latency is critical.
                </p>
                <div className="bg-slate-900 rounded-xl p-6 mb-8 font-mono text-sm text-emerald-400 border border-slate-800 shadow-xl">
                  <div className="flex justify-between mb-4 text-slate-500 text-xs border-b border-slate-800 pb-2">
                    <span>Example Request</span>
                    <span>cURL</span>
                  </div>
                  <pre>
                    {`curl -X POST https://api.alpha.io/v1/stream \\
  -H "Authorization: Bearer $API_KEY" \\
  -d '{
    "model": "llama-3.3-70b",
    "stream": true,
    "prompt": "Explain Big O notation"
  }'`}
                  </pre>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Parameters</h2>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 font-bold text-slate-700">Field</th>
                      <th className="py-3 font-bold text-slate-700">Type</th>
                      <th className="py-3 font-bold text-slate-700">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-mono text-blue-600">model</td>
                      <td className="py-3 text-slate-500">string</td>
                      <td className="py-3 text-slate-600">The ID of the model to use.</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-mono text-blue-600">stream</td>
                      <td className="py-3 text-slate-500">boolean</td>
                      <td className="py-3 text-slate-600">Whether to stream partial progress.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[9999] bg-[#1C1C1E] flex items-center justify-center font-sans select-none animate-in fade-in zoom-in duration-300">
        <div className="w-[320px] bg-black p-4 rounded-[40px] shadow-2xl border border-white/10">
          <div className="text-right text-white text-7xl font-light mb-4 px-4 h-24 flex items-end justify-end overflow-hidden">
            {calcDisplay}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {buttons.map((btn, i) => (
              <button
                key={i}
                onClick={() => {
                  if (btn === 'C') setCalcDisplay('0');
                  else if (btn === '=') setIsCalculatorMode(false); // Hidden exit
                  else setCalcDisplay(prev => prev === '0' ? btn : prev + btn);
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-medium transition-all active:opacity-50 ${
                  ['÷', '×', '-', '+', '='].includes(btn) 
                    ? 'bg-[#FF9F0A] text-white' 
                    : ['C', '±', '%'].includes(btn)
                    ? 'bg-[#A5A5A5] text-black'
                    : 'bg-[#333333] text-white'
                } ${btn === '0' ? 'col-span-2 w-auto px-6 justify-start' : ''}`}
              >
                {btn}
              </button>
            ))}
          </div>
          <div className="mt-8 text-center text-[10px] text-white/20 uppercase tracking-widest">
            Standard Scientific Calculator v4.2
          </div>
        </div>
      </div>
    );
  };

  const GodModeDashboard = () => {
    return (
      <div className="bg-[#0F172A]/90 border border-indigo-500/30 rounded-2xl p-4 mb-6 shadow-[0_0_30px_rgba(99,102,241,0.1)] backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 fill-indigo-400" /> God Mode Dashboard
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsCalculatorMode(true)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1 transition-all"
            >
              <Keyboard className="w-3 h-3" /> Panic Key (Ctrl+Shift+X)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* AI Persona */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">AI Persona</label>
            <select 
              value={aiPersona} 
              onChange={(e) => setAiPersona(e.target.value)}
              className="w-full bg-[#050814] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
            >
              <option value="standard">Standard Expert</option>
              <option value="google">Google (Big O)</option>
              <option value="amazon">Amazon (STAR/LP)</option>
              <option value="startup">Startup (Fast)</option>
            </select>
          </div>

          {/* Behavioral Mode */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Behavioral Mode</label>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setIsStarMode(!isStarMode)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                  isStarMode 
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' 
                    : 'bg-[#050814] border-slate-700 text-slate-500'
                }`}
              >
                <span className="text-xs font-bold">STAR Method</span>
                <div className={`w-2 h-2 rounded-full ${isStarMode ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'}`}></div>
              </button>
              
              {isStarMode && (
                <div className="flex gap-1">
                  {Object.entries(starProgress).map(([key, active]) => (
                    <div 
                      key={key} 
                      className={`flex-1 h-1 rounded-full transition-all duration-500 ${active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}
                      title={key.toUpperCase()}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filler Word Tracker */}
          <div className="col-span-2 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Communication Analysis</label>
              {toneFeedback && (
                <span className="text-[10px] font-bold text-indigo-400 animate-pulse">{toneFeedback}</span>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {Object.entries(fillerWordsCount).map(([word, count]) => (
                <div key={word} className="flex-shrink-0 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-medium text-slate-400 capitalize">{word}</span>
                  <span className={`text-xs font-black ${count > 5 ? 'text-red-400' : count > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {count}
                  </span>
                </div>
              ))}
              <div className="flex-shrink-0 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Activity className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] font-medium text-slate-400">Confidence</span>
                <span className="text-xs font-black text-indigo-400">{confidenceScore}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CodeSandbox = () => {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-300">
        <div className="w-full max-w-5xl h-[80vh] bg-[#0F172A] rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 ml-4">
                <Code2 className="w-4 h-4 text-indigo-400" /> Local Code Sandbox
              </h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={runCode}
                disabled={isExecuting}
                className="p-2 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors flex items-center gap-2 text-xs font-bold"
                title="Run JavaScript"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(sandboxCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  addLog('Code copied to clipboard');
                }}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors flex items-center gap-2"
                title="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsCodeSandboxOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col border-r border-slate-800">
              <div className="p-2 bg-slate-900 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Editor</span>
                <button 
                  onClick={() => {
                    try {
                      // Simple simulated execution
                      const logs: string[] = [];
                      const originalLog = console.log;
                      console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
                      
                      // Use Function constructor for safer eval
                      new Function(sandboxCode)();
                      
                      console.log = originalLog;
                      setSandboxOutput(logs.join('\n') || 'Code executed successfully (no output).');
                    } catch (err: any) {
                      setSandboxOutput(`Error: ${err.message}`);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Play className="w-3 h-3" /> Run Code
                </button>
              </div>
              <textarea 
                value={sandboxCode}
                onChange={(e) => setSandboxCode(e.target.value)}
                className="flex-1 bg-[#050814] p-6 text-indigo-300 font-mono text-sm outline-none resize-none"
                spellCheck={false}
              />
            </div>
            <div className="w-1/3 flex flex-col bg-[#050814]">
              <div className="p-2 bg-slate-900">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Output</span>
              </div>
              <div className="flex-1 p-6 font-mono text-sm text-emerald-400 overflow-y-auto whitespace-pre-wrap">
                {sandboxOutput || '> Ready to run...'}
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900/30">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase mb-2">
                  <Cpu className="w-3 h-3" /> Complexity Analysis
                </div>
                <div className="text-xs text-indigo-400/70 italic">
                  AI: This algorithm appears to be O(n) time complexity.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`min-h-screen ${isFloatingMode ? 'bg-transparent' : isTransparentDashboard ? 'bg-transparent' : 'bg-[#050814]'} text-slate-200 flex font-sans selection:bg-indigo-500/30 relative overflow-hidden transition-colors duration-700`}
      style={{ 
        backdropFilter: isTransparentDashboard ? `blur(${backdropBlur}px)` : 'none',
        WebkitBackdropFilter: isTransparentDashboard ? `blur(${backdropBlur}px)` : 'none'
      }}
    >
      <Toaster position="top-right" theme="dark" richColors />
      {isCommandPaletteOpen && <CommandPalette />}
      {isCalculatorMode && <StealthCamouflage />}
      {isCodeSandboxOpen && <CodeSandbox />}

      {/* WELCOME SETUP POPUP */}
      {showWelcomePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(99,102,241,0.1)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-center w-16 h-16 bg-indigo-500/10 rounded-2xl mb-6 mx-auto border border-indigo-500/20">
              <Zap className="w-8 h-8 text-indigo-400" />
            </div>
            
            <h2 className="text-3xl font-black text-white text-center mb-2">Welcome to InterView Alpha</h2>
            <p className="text-slate-400 text-center mb-8">Your AI-powered interview assistant is almost ready. Let's get you set up in 3 easy steps.</p>
            
            <div className="space-y-4 mb-8">
              <div className="flex gap-4 items-start p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Get a Free API Key</h3>
                  <p className="text-sm text-slate-400">We recommend Groq for the fastest, free AI responses. <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Click here to get a Groq API Key</a>.</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Go to Setup</h3>
                  <p className="text-sm text-slate-400">Click the button below to navigate to the Setup & API tab.</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Paste & Save</h3>
                  <p className="text-sm text-slate-400">Paste your key, click "Test & Save", and you're ready to ace your interviews!</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={closeWelcomePopup}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2"
            >
              Let's Get Started <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* ADVANCED FLOATING UI (Principal Engineer Edition) */}
      {isFloatingMode && (
        <div className="absolute inset-0 z-50 flex flex-col items-center pointer-events-none">
          
          {/* THE NOTCH - Minimalist Entry Point */}
          <div 
            onMouseEnter={() => setIsNotchMode(false)}
            className={`fixed top-0 left-1/2 -translate-x-1/2 h-1.5 w-32 bg-indigo-500/20 rounded-b-full transition-all duration-500 cursor-pointer pointer-events-auto hover:h-3 hover:bg-indigo-500/40 ${!isNotchMode ? 'opacity-0 -translate-y-full' : 'opacity-100'}`}
          />

          {/* MAIN FLOATING TOOLBAR */}
          <div 
            onMouseEnter={() => isGhostMode && setIsGhostMode(false)}
            onMouseLeave={() => !isGhostMode && opacity < 20 && setIsGhostMode(true)}
            className={`mt-4 bg-[#1E293B] backdrop-blur-none border border-white/40 rounded-2xl px-5 py-2.5 flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.9)] pointer-events-auto transition-all duration-500 hover:scale-[1.02] ${isNotchMode ? 'opacity-0 scale-90 translate-y-[-100px]' : 'opacity-100'}`}
            style={{ opacity: 1 }}
          >
            <div className="flex items-center gap-2 pr-3 border-r border-white/5 cursor-move" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${apiKey ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="font-black text-white text-[11px] tracking-widest uppercase">ALPHA v9</span>
            </div>

            {/* SYSTEM HEALTH (Principal Engineer Touch) */}
            <div className="flex items-center gap-4 px-4 border-r border-white/5">
              <div className="flex flex-col">
                <span className="text-[7px] text-white/20 uppercase font-bold tracking-widest">Latency</span>
                <span className="text-[9px] text-indigo-400 font-mono">24ms</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-white/20 uppercase font-bold tracking-widest">Conf.</span>
                <span className="text-[9px] text-emerald-400 font-mono">{confidenceScore}%</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => {
                  const key = prompt("Enter your API Key:", apiKey);
                  if (key) {
                    setApiKey(key);
                    localStorage.setItem('alpha_api_key', key);
                    toast.success("API Key saved!");
                  }
                }}
                className={`p-2 rounded-xl border transition-all ${apiKey ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}
                title="Manage API Key"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
              
              {/* Floating Assistant Input */}
              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                <input 
                  type="text" 
                  value={floatingQuestion}
                  onChange={(e) => setFloatingQuestion(e.target.value)}
                  placeholder="Ask..."
                  className="bg-transparent text-[11px] text-white placeholder:text-white/30 px-2 py-1 w-32 outline-none"
                />
                <button 
                  onClick={async () => {
                    if (!floatingQuestion || !apiKey) return;
                    setIsFloatingGenerating(true);
                    setFloatingAnswer("Thinking...");
                    try {
                      const ans = await callAI({ provider, apiKey, model: selectedModel, messages: [{ role: "user", content: floatingQuestion }] });
                      setFloatingAnswer(ans);
                    } catch (e) { setFloatingAnswer("Error."); }
                    finally { setIsFloatingGenerating(false); }
                  }}
                  className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>

              <button 
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white'}`}
              >
                {isListening ? <Square className="w-3 h-3 fill-current" /> : <Mic className="w-3 h-3" />}
                {isListening ? 'Listening' : 'Listen'}
              </button>

              <button 
                onClick={toggleAutopilot}
                className={`p-2 rounded-xl border transition-all ${isAutopilot ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'}`}
                title="Autopilot Mode"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-6 w-px bg-white/5 mx-1" />

            {/* Floating Answer Display */}
            {floatingAnswer && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#1E293B]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 text-[10px] text-white/80 shadow-2xl">
                {floatingAnswer}
                <button onClick={() => setFloatingAnswer('')} className="absolute top-1 right-1 text-white/30 hover:text-white">✕</button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => analyzeScreen(false, true)}
                className="p-2 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 hover:bg-fuchsia-500 hover:text-white transition-all"
                title="MCQ Solver"
              >
                <Target className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => analyzeScreen(false, false)}
                className="p-2 rounded-xl bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                title="Screen Scan"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-6 w-px bg-white/5 mx-1" />

            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Opacity</span>
                <input 
                  type="range" min="5" max="100" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <button 
                onClick={() => setIsGhostMode(!isGhostMode)}
                className={`p-2 rounded-xl transition-all ${isGhostMode ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setIsNotchMode(true)}
                className="p-2 rounded-xl bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                title="Minimize to Notch"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setIsFloatingMode(false)}
                className="p-2 rounded-xl bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* DYNAMIC WIDGETS CONTAINER */}
          <div className="mt-6 flex gap-6 items-start px-10 w-full justify-center">
            
            {/* CONTEXTUAL HINTS WIDGET */}
            {activeFloatingModules.hints && (analysisResult || liveAnswer) && (
              <div 
                className="w-64 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 shadow-2xl pointer-events-auto transition-all duration-500 hover:scale-[1.02]"
                style={{ opacity: isGhostMode ? 0.02 : opacity / 100 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Key Hints</span>
                </div>
                <div className="space-y-3">
                  {(analysisResult || liveAnswer || "").split('\n').slice(0, 4).map((line, i) => (
                    <div key={i} className="flex gap-3 items-start group">
                      <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 group-hover:scale-150 transition-transform" />
                      <p className="text-[11px] text-white/70 leading-relaxed font-medium line-clamp-2">
                        {line.replace(/^[*-]\s*/, '').substring(0, 60)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MAIN ANSWER CONSOLE */}
            {activeFloatingModules.answer && (analysisResult || liveAnswer) && (
              <div 
                className="flex-1 max-w-3xl bg-[#0F172A]/80 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.8)] pointer-events-auto transition-all duration-700 hover:bg-[#0F172A]/90"
                style={{ opacity: isGhostMode ? 0.05 : opacity / 100 }}
              >
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                      <BrainCircuit className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Neural Response</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Optimized for {liveMode}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-white/5 rounded-2xl p-1 border border-white/5 mr-2">
                      <button onClick={() => refineAnswer(liveAnswer || '', 'simplify')} className="px-3 py-1.5 text-[9px] font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-tighter">Simplify</button>
                      <button onClick={() => refineAnswer(liveAnswer || '', 'expand')} className="px-3 py-1.5 text-[9px] font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-tighter">Expand</button>
                      <button onClick={() => refineAnswer(liveAnswer || '', 'example')} className="px-3 py-1.5 text-[9px] font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-tighter">Example</button>
                    </div>
                    <button 
                      onClick={generateThankYouNote}
                      disabled={isGeneratingLive}
                      className="px-4 py-2 rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-500/20 disabled:opacity-50"
                      title="Generate a follow-up thank you email"
                    >
                      {isGeneratingLive ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Thank You Note
                    </button>
                    <button 
                      onClick={generateSuggestedQuestions}
                      disabled={isGeneratingQuestions}
                      className="px-4 py-2 rounded-2xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-indigo-500/20 disabled:opacity-50"
                      title="Generate questions to ask the interviewer"
                    >
                      {isGeneratingQuestions ? <Loader2 className="w-3 h-3 animate-spin" /> : <HelpCircle className="w-3 h-3" />}
                      Ask Questions
                    </button>
                    <button onClick={() => { setAnalysisResult(null); setLiveAnswer(null); }} className="p-2.5 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setAnalysisResult(null); setLiveAnswer(null); }} className="p-2.5 rounded-2xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AI CONTENT */}
                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                  {thankYouNote && (
                    <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 mb-6 animate-in zoom-in-95 duration-500">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Save className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Draft: Thank You Email</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(thankYouNote);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all"
                          >
                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button onClick={() => setThankYouNote(null)} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap font-medium">
                        {thankYouNote}
                      </div>
                    </div>
                  )}

                  {suggestedQuestions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 mb-4 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Suggested Follow-ups</span>
                        <button onClick={() => setSuggestedQuestions([])} className="text-[8px] text-white/20 hover:text-white uppercase font-bold">Dismiss</button>
                      </div>
                      <div className="space-y-2">
                        {suggestedQuestions.map((q, i) => (
                          <div key={i} className="flex gap-3 items-start group cursor-pointer" onClick={() => navigator.clipboard.writeText(q)}>
                            <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5" />
                            <p className="text-[11px] text-white/70 leading-relaxed hover:text-white transition-colors">
                              {q.replace(/^[*-]\s*/, '')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult && (
                    <div className="group relative">
                      <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
                      {(analysisResult || liveAnswer || "").toLowerCase().includes('situation:') && (
                        <div className="mb-3 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                            STAR Method Detected
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <div className="text-white/90 text-sm leading-[1.8] font-medium whitespace-pre-wrap selection:bg-indigo-500/50 flex-1">
                          {analysisResult}
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(analysisResult);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                            addLog('AI Answer copied to clipboard');
                          }}
                          className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all ml-4"
                          title="Copy Answer"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      {getConfidence(analysisResult) !== null && renderConfidenceBar(getConfidence(analysisResult)!)}
                    </div>
                  )}
                  
                  {liveAnswer && (
                    <div className="group relative">
                      <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
                      <div className="text-white/90 text-sm leading-[1.8] font-medium whitespace-pre-wrap selection:bg-emerald-500/50">
                        {liveAnswer}
                      </div>
                      {getConfidence(liveAnswer) !== null && renderConfidenceBar(getConfidence(liveAnswer)!)}
                    </div>
                  )}
                </div>

                {/* QUICK ACTIONS - Minimalist */}
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex gap-2">
                    {['Shorten', 'Elaborate', 'Technical', 'Professional'].map(action => (
                      <button 
                        key={action}
                        onClick={() => refineAnswer(analysisResult || liveAnswer || "", action)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0F172A] bg-slate-800 flex items-center justify-center overflow-hidden">
                          <img src={`https://picsum.photos/seed/user${i}/20/20`} alt="" className="w-full h-full object-cover opacity-50" />
                        </div>
                      ))}
                    </div>
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">3 Agents Syncing</span>
                  </div>
                </div>
              </div>
            )}

            {/* LIVE FEEDBACK OVERLAY */}
            {activeFloatingModules.transcript && (
              <div 
                className="fixed bottom-12 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-none"
                style={{ opacity: isGhostMode ? 0 : 1 }}
              >
                {speechRate > 170 && (
                  <div className="px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-widest animate-bounce">
                    Slow Down!
                  </div>
                )}
                {confidenceScore < 50 && (
                  <div className="px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                    Watch Fillers
                  </div>
                )}
                {sentiment === 'Positive' && (
                  <div className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300">
                    Interviewer is Happy
                  </div>
                )}
              </div>
            )}

            {/* LIVE FEEDBACK OVERLAY */}
            {activeFloatingModules.transcript && (
              <div 
                className="fixed bottom-12 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-none"
                style={{ opacity: isGhostMode ? 0 : 1 }}
              >
                {speechRate > 170 && (
                  <div className="px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-widest animate-bounce">
                    Slow Down!
                  </div>
                )}
                {confidenceScore < 50 && (
                  <div className="px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                    Watch Fillers
                  </div>
                )}
                {sentiment === 'Positive' && (
                  <div className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300">
                    Interviewer is Happy
                  </div>
                )}
              </div>
            )}

            {/* INTERVIEW TIMELINE */}
            {activeFloatingModules.transcript && (
              <div 
                className="w-64 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 shadow-2xl pointer-events-auto transition-all duration-500"
                style={{ opacity: isGhostMode ? 0.02 : opacity / 100 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Timeline</span>
                  </div>
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{interviewStage}</span>
                </div>
                <div className="flex gap-1 h-1">
                  {['Intro', 'Technical', 'Behavioral', 'Q&A'].map((s) => (
                    <div 
                      key={s} 
                      className={`flex-1 rounded-full transition-all duration-500 ${
                        s === interviewStage ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 
                        ['Intro', 'Technical', 'Behavioral', 'Q&A'].indexOf(s) < ['Intro', 'Technical', 'Behavioral', 'Q&A'].indexOf(interviewStage) ? 'bg-indigo-500/40' : 'bg-white/5'
                      }`} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* PREDICTED NEXT QUESTION */}
            {activeFloatingModules.transcript && predictedNextQuestion && (
              <div 
                className="w-64 bg-fuchsia-500/10 backdrop-blur-3xl border border-fuchsia-500/20 rounded-3xl p-5 shadow-2xl pointer-events-auto animate-in slide-in-from-right-4 duration-500"
                style={{ opacity: isGhostMode ? 0.02 : opacity / 100 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FastForward className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Predicted Next</span>
                </div>
                <p className="text-[10px] text-fuchsia-100/70 font-bold leading-relaxed italic">
                  "{predictedNextQuestion}"
                </p>
              </div>
            )}

            {/* COMPANY INTEL WIDGET */}
            {activeFloatingModules.transcript && companyIntel.length > 0 && (
              <div 
                className="w-64 bg-indigo-500/10 backdrop-blur-3xl border border-indigo-500/20 rounded-3xl p-5 shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-500"
                style={{ opacity: isGhostMode ? 0.02 : opacity / 100 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{company} Intel</span>
                </div>
                <div className="space-y-2">
                  {companyIntel.map((fact, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5" />
                      <span className="text-[10px] text-indigo-100/70 font-bold leading-tight">{fact}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RED FLAG MONITOR */}
            {activeFloatingModules.transcript && redFlags.length > 0 && (
              <div 
                className="w-64 bg-red-500/10 backdrop-blur-3xl border border-red-500/20 rounded-3xl p-5 shadow-2xl pointer-events-auto animate-in shake duration-500"
                style={{ opacity: isGhostMode ? 0.02 : opacity / 100 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">Live Warning</span>
                </div>
                <div className="space-y-1.5">
                  {redFlags.map((flag, i) => (
                    <div key={i} className="text-[10px] text-red-200/80 font-black uppercase tracking-tighter flex items-center gap-2">
                      <div className="w-1 h-1 bg-red-500 rounded-full" />
                      {flag}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TALKING POINTS WIDGET */}
            {activeFloatingModules.transcript && talkingPoints.length > 0 && (
              <div 
                className="w-64 bg-emerald-500/10 backdrop-blur-3xl border border-emerald-500/20 rounded-3xl p-5 shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-500"
                style={{ opacity: isGhostMode ? 0.02 : opacity / 100 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Talking Points</span>
                </div>
                <div className="space-y-2">
                  {talkingPoints.map((point, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="w-1 h-1 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-emerald-100/70 font-bold">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BRIDGE PHRASES WIDGET */}
            {activeFloatingModules.transcript && (
              <div 
                className="w-64 bg-amber-500/10 backdrop-blur-3xl border border-amber-500/20 rounded-3xl p-5 shadow-2xl pointer-events-auto transition-all duration-500"
                style={{ opacity: isGhostMode ? 0.02 : opacity / 100 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Quote className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Bridge Phrases</span>
                  </div>
                  <button onClick={() => setShowBridgePhrases(!showBridgePhrases)} className="text-[8px] text-white/20 hover:text-white uppercase font-bold">
                    {showBridgePhrases ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showBridgePhrases && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    {bridgePhrases.map((phrase, i) => (
                      <button 
                        key={i} 
                        onClick={() => navigator.clipboard.writeText(phrase)}
                        className="w-full text-left text-[9px] text-amber-100/50 hover:text-amber-100 transition-colors leading-tight border-b border-white/5 pb-1"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TRANSCRIPT MINIMAP */}
            {activeFloatingModules.transcript && transcript && (
              <div 
                className="w-64 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 shadow-2xl pointer-events-auto transition-all duration-500"
                style={{ opacity: isGhostMode ? 0.02 : opacity / 100 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Live Feed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${sentiment === 'Positive' ? 'bg-emerald-500' : sentiment === 'Critical' ? 'bg-red-500' : 'bg-slate-500'}`} />
                      <span className="text-[8px] font-bold text-white/20 uppercase">{sentiment}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${speechRate > 160 ? 'bg-red-500' : speechRate < 100 ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{speechRate} WPM</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-white/40 leading-relaxed font-mono italic line-clamp-6">
                  "...{transcript.slice(-150)}"
                </div>
              </div>
            )}

            {/* CONTEXTUAL INTELLIGENCE HINTS */}
            {contextualHints.length > 0 && (
              <div 
                className="w-64 bg-indigo-600/10 backdrop-blur-3xl border border-indigo-500/20 rounded-3xl p-5 shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-500"
                style={{ opacity: isGhostMode ? 0.02 : opacity / 100 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Context Match</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contextualHints.map((hint, idx) => (
                    <span key={idx} className="px-2 py-1 rounded-md bg-indigo-500/20 text-[9px] text-indigo-200 font-bold border border-indigo-500/30">
                      {hint}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SUBTITLES OVERLAY (Ultra Stealth) */}
          {isSubtitlesMode && (analysisResult || liveAnswer) && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-10 pointer-events-none">
              <div 
                className="bg-black/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/5 shadow-2xl text-center transition-all duration-500"
                style={{ opacity: isGhostMode ? 0.05 : opacity / 100 }}
              >
                <p className="text-white/60 text-sm font-medium tracking-wide leading-relaxed animate-in slide-in-from-bottom-2 duration-700">
                  {analysisResult || liveAnswer}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DASHBOARD UI */}
      <div className={`flex w-full h-full ${isFloatingMode ? 'hidden' : ''} transition-opacity duration-500`}>
        {/* BACKGROUND EFFECTS */}
      <div className={`absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 transition-opacity duration-1000 ${isTransparentDashboard ? 'opacity-0' : 'opacity-100'}`}>
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* SIDEBAR */}
      <div className={`w-72 ${isTransparentDashboard ? 'bg-white/5 border-r border-white/5' : 'bg-[#0B1121]/90 border-r border-slate-800/50'} backdrop-blur-xl flex flex-col z-10 relative shadow-2xl transition-all duration-700`}>
        <div className={`p-6 flex items-center gap-3 ${isTransparentDashboard ? 'border-b border-white/5' : 'border-b border-slate-800/50'}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 block uppercase">
              InterView <span className="text-indigo-400">Alpha</span>
            </span>
            <span className="text-[10px] font-mono text-indigo-400 tracking-widest uppercase">Stealth Engine v9.0</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-6 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', icon: BarChart, label: 'Pro Dashboard' },
            { id: 'live', icon: Mic, label: 'Live Copilot', badge: 'REC' },
            { id: 'mock', icon: Target, label: 'Mock Interview' },
            { id: 'match', icon: BarChart, label: 'Resume Match' },
            { id: 'memory', icon: History, label: 'Memory & History' },
            { id: 'knowledge', icon: Database, label: 'Knowledge Base' },
            { id: 'codepad', icon: Code2, label: 'AI Codepad' },
            { id: 'profile', icon: User, label: 'Profile & Contact' },
            { id: 'setup', icon: Settings, label: 'Setup & API' },
            { id: 'electron', icon: Download, label: 'Export to Electron', badge: 'NATIVE' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
              } ${isFocusMode && !['dashboard', 'live', 'setup'].includes(item.id) ? 'opacity-20 grayscale' : ''}`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-400' : ''}`} />
              <span className="font-semibold text-sm">{item.label}</span>
              {item.badge && (
                <span className={`ml-auto text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${
                  item.badge === 'REC' 
                    ? 'bg-red-500/20 text-red-400 border-red-500/20 animate-pulse' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-5 m-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-inner space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Alpha Stealth</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">ACTIVE</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-fuchsia-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Ghost Mode</span>
            </div>
            <button 
              onClick={() => setIsGhostMode(!isGhostMode)}
              className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${isGhostMode ? 'bg-indigo-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isGhostMode ? 'left-4' : 'left-0.5'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Focus Mode</span>
            </div>
            <button 
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${isFocusMode ? 'bg-indigo-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isFocusMode ? 'left-4' : 'left-0.5'}`}></div>
            </button>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
            Advanced Kernel-level capture exclusion active. This interface is completely invisible to OBS, Zoom, Teams, and all screen-sharing protocols.
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative">
        {/* TOPBAR */}
        <header 
          className="h-16 border-b border-slate-800/50 bg-[#0B1121]/50 backdrop-blur-xl flex items-center justify-between px-8 select-none"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <h1 className="text-xl font-bold text-white tracking-tight capitalize flex items-center gap-3">
            {activeTab.replace('-', ' ')}
          </h1>
          <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button 
              onClick={() => setIsFloatingMode(true)}
              className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Floating Screen
            </button>
            <button className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <Maximize2 className="w-3.5 h-3.5" /> PiP Mode (Ctrl+Shift+P)
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Groq LPU Connected
            </div>
            
            {/* Window Controls (Visible only in Electron) */}
            {window.electronAPI && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
                <button 
                  onClick={() => window.electronAPI?.minimizeApp()}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => window.electronAPI?.maximizeApp()}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => window.electronAPI?.closeApp()}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* 📊 DASHBOARD TAB */}
          {activeTab === 'profile' && (
            <ProfileContact />
          )}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-4xl font-black text-white tracking-tight uppercase">Interview <span className="text-indigo-500">Intelligence</span></h1>
                  <p className="text-slate-400 mt-2 font-medium">Welcome back, Commander. Your stealth engine is primed and ready.</p>
                </div>
                <div className="flex gap-3">
                  <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${apiKey ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                      {apiKey ? 'Engine Ready' : 'API Key Missing'}
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center gap-3">
                    <Activity className="w-3 h-3 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">v4.2 Stable</span>
                  </div>
                </div>
              </div>

              {/* GLOBAL SEARCH */}
              <div className="relative group max-w-2xl">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search anything... (Ctrl+K for commands)"
                  className="w-full bg-[#0F172A]/80 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-indigo-500 transition-all shadow-2xl placeholder:text-slate-600"
                  onFocus={() => setIsCommandPaletteOpen(true)}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex gap-2">
                  <kbd className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-500">CTRL</kbd>
                  <kbd className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-500">K</kbd>
                </div>
              </div>

              {/* STATS GRID */}
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: 'Interviews', value: '12', icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                  { label: 'Questions', value: '148', icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Confidence', value: '94%', icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { label: 'Stealth', value: '100%', icon: EyeOff, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' }
                ].map((stat, i) => (
                  <div key={i} className={`p-6 rounded-3xl border border-slate-800/50 ${stat.bg} backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-default group`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl bg-slate-900/80 border border-slate-800 group-hover:border-slate-700 transition-colors`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live</div>
                    </div>
                    <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-8">
                {/* RECENT ACTIVITY */}
                <div className="col-span-2 space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <History className="w-5 h-5 text-indigo-400" /> Recent Sessions
                  </h3>
                  <div className="bg-[#0F172A]/80 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-800">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Company</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {[
                          { company: 'Google', role: 'Senior Frontend', date: '2 hours ago', score: '92%' },
                          { company: 'Meta', role: 'Staff Engineer', date: 'Yesterday', score: '88%' },
                          { company: 'Amazon', role: 'SDE III', date: '3 days ago', score: '95%' },
                          { company: 'Netflix', role: 'UI Architect', date: '1 week ago', score: '91%' }
                        ].map((session, i) => (
                          <tr key={i} className="hover:bg-slate-800/30 transition-colors cursor-pointer group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">{session.company[0]}</div>
                                <span className="font-bold text-slate-200">{session.company}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{session.role}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">{session.date}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">{session.score}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <Zap className="w-5 h-5 text-amber-400" /> Quick Launch
                  </h3>
                  <div className="space-y-3">
                    <button onClick={() => setActiveTab('live')} className="w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold flex items-center justify-between group transition-all shadow-lg shadow-indigo-500/20">
                      <div className="flex items-center gap-3">
                        <Mic className="w-5 h-5" />
                        <span>Start Live Copilot</span>
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => setActiveTab('mock')} className="w-full p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-between group transition-all border border-slate-700">
                      <div className="flex items-center gap-3">
                        <Target className="w-5 h-5 text-emerald-400" />
                        <span>Practice Mock</span>
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => setIsFloatingMode(true)} className="w-full p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-between group transition-all border border-slate-700">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-fuchsia-400" />
                        <span>Enter Stealth Mode</span>
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="pt-4 space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Preparation Tools</h4>
                      <button 
                        onClick={generateCheatSheet}
                        disabled={isGeneratingCheatSheet}
                        className="w-full p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-between group transition-all border border-emerald-500/20 shadow-lg"
                      >
                        <div className="flex items-center gap-3">
                          {isGeneratingCheatSheet ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                          <span>{isGeneratingCheatSheet ? 'Generating...' : 'AI Cheat Sheet'}</span>
                        </div>
                        <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-125 transition-transform" />
                      </button>
                      
                      {cheatSheet && (
                        <div className="p-6 rounded-3xl bg-[#0F172A] border border-slate-800 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" /> Ready to Ace
                            </h5>
                            <button onClick={() => setCheatSheet("")} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {cheatSheet}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-500/20">
                        <Shield className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h4 className="font-bold text-white">Stealth Tip</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Use <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Alt + Space</kbd> to instantly hide the floating UI if someone looks at your screen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🎙️ LIVE TAB */}
          {activeTab === 'live' && (
            <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 animate-in fade-in duration-500">
              
              {/* 👑 GOD MODE DASHBOARD */}
              <GodModeDashboard />

              {/* ENGINE TELEMETRY (Principal Engineer View) */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'STT Stream', value: isListening ? 'ACTIVE' : 'IDLE', color: isListening ? 'text-emerald-400' : 'text-slate-500' },
                  { label: 'Tokens/Sec', value: '42.5', color: 'text-indigo-400' },
                  { label: 'Context Window', value: '128k', color: 'text-fuchsia-400' },
                  { label: 'AI Engine', value: provider.toUpperCase(), color: 'text-amber-400' }
                ].map((stat, i) => (
                  <div key={i} className="bg-black/40 border border-white/5 p-3 rounded-xl flex flex-col">
                    <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">{stat.label}</span>
                    <span className={`text-[10px] font-mono font-bold ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* ENGINE LOGS */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 h-48 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Engine Logs</span>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const logText = engineLogs.map(l => `[${l.time}] ${l.event}`).join('\n');
                        navigator.clipboard.writeText(logText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                        addLog('Engine logs copied to clipboard');
                      }}
                      className="text-[8px] text-white/20 hover:text-white uppercase font-bold flex items-center gap-1"
                    >
                      {copied ? <Check className="w-2 h-2 text-emerald-400" /> : <Copy className="w-2 h-2" />}
                      Copy
                    </button>
                    <button onClick={() => setEngineLogs([])} className="text-[8px] text-white/20 hover:text-white uppercase font-bold">Clear</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
                  {engineLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[10px] text-white/10 italic">No logs recorded</div>
                  ) : (
                    engineLogs.map((log, i) => (
                      <div key={i} className="flex gap-3 text-[9px] font-mono leading-tight">
                        <span className="text-white/20 shrink-0">[{log.time}]</span>
                        <span className={log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-indigo-300'}>
                          {log.event}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-between bg-[#0F172A]/80 p-4 rounded-2xl border border-slate-800 shadow-lg">
                <div className="flex gap-4">
                  <select 
                    value={liveMode} onChange={(e) => setLiveMode(e.target.value)}
                    className="bg-[#050814] border border-slate-700 text-sm rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {modes.map(m => <option key={m}>{m} Mode</option>)}
                  </select>
                  <button 
                    onClick={() => setIsCodeSandboxOpen(true)}
                    className="bg-[#050814] border border-slate-700 text-sm rounded-lg px-4 py-2 text-white hover:border-indigo-500 flex items-center gap-2 transition-all"
                  >
                    <Code2 className="w-4 h-4 text-indigo-400" /> Code Sandbox
                  </button>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoSpeak} 
                      onChange={(e) => setAutoSpeak(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-indigo-500 focus:ring-indigo-500 bg-[#050814]"
                    />
                    <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-indigo-400" /> Auto-Speak (Earpiece)
                    </span>
                  </label>
                  <button 
                    onClick={startListening}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                      isListening 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse' 
                        : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                    {isListening ? 'Listening...' : 'Start Copilot'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 flex-1 min-h-[500px]">
                {/* Transcript Column */}
                <div className="col-span-1 bg-[#0F172A]/80 rounded-3xl border border-slate-800 flex flex-col overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-300 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" /> Live Transcript
                    </h3>
                    {transcript && (
                      <button 
                        onClick={() => {
                          setTranscript('');
                          addLog('Transcript cleared');
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4">
                    {isListening ? (
                      <>
                        {transcript && (
                          <div className="bg-slate-800/50 p-4 rounded-xl rounded-tl-none border border-slate-700/50 text-sm text-slate-300">
                            {transcript}
                          </div>
                        )}
                        <div className="flex gap-2 items-center text-indigo-400 text-sm font-mono animate-pulse">
                          <Mic className="w-3 h-3" /> Listening...
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm text-center px-4">
                        <Mic className="w-12 h-12 mb-4 opacity-20" />
                        Click "Start Copilot" to begin transcribing the interview.
                      </div>
                    )}
                  </div>
                </div>

                {/* Answer Column */}
                <div className="col-span-2 bg-gradient-to-br from-indigo-900/20 to-slate-900/80 rounded-3xl border border-indigo-500/20 flex flex-col overflow-hidden shadow-xl relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                  
                  {/* Answer Tabs */}
                  <div className="flex border-b border-slate-800/80 bg-slate-900/50 px-2 pt-2">
                    {answerTabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setAnswerTab(tab.id)}
                        className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
                          answerTab === tab.id 
                            ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg' 
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-8 flex-1 overflow-y-auto custom-scrollbar relative z-10">
                    {isListening ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        {isGeneratingLive ? (
                          <div className="flex flex-col items-center justify-center h-full text-indigo-400 gap-4 mt-20">
                            <Activity className="w-12 h-12 animate-spin" />
                            <p className="font-bold">Generating AI Response...</p>
                          </div>
                        ) : liveAnswer ? (
                          <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-white tracking-tight">AI Suggested Answer</h2>
                            <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap text-lg leading-relaxed">
                              {liveAnswer}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-500 mt-20">
                            <BrainCircuit className="w-16 h-16 mb-6 text-slate-700" />
                            <p className="text-lg font-medium">AI Answers will appear here instantly.</p>
                            <p className="text-sm mt-2">Waiting for interviewer's question...</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <BrainCircuit className="w-16 h-16 mb-6 text-slate-700" />
                        <p className="text-lg font-medium">AI Answers will appear here instantly.</p>
                        <p className="text-sm mt-2">Start the copilot to begin.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🎯 MOCK TAB */}
          {activeTab === 'mock' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="p-8 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl">
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Topic</label>
                    <input 
                      value={mockTopic} onChange={(e) => setMockTopic(e.target.value)}
                      className="w-full bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-fuchsia-500 transition-colors"
                      placeholder="e.g. React & Frontend"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Difficulty</label>
                    <select 
                      value={mockDifficulty} onChange={(e) => setMockDifficulty(e.target.value)}
                      className="w-full bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-fuchsia-500 transition-colors"
                    >
                      {['Easy', 'Medium', 'Hard', 'Expert'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Interviewer Persona</label>
                    <select 
                      value={mockPersona} onChange={(e) => setMockPersona(e.target.value)}
                      className="w-full bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-fuchsia-500 transition-colors"
                    >
                      {['Friendly', 'Strict', 'Curious', 'Technical Expert', 'Stressful'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Target className="w-6 h-6 text-fuchsia-400" /> Real-Time Assistance
                  </h2>
                  <button 
                    onClick={generateMockQuestion}
                    disabled={isGeneratingMock}
                    className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"
                  >
                    {isGeneratingMock ? <Activity className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                    {mockStarted ? 'Next Question' : 'Start Mock Interview'}
                  </button>
                </div>
                
                {/* Screen Analysis */}
                <div className="mb-8 p-6 bg-[#050814] rounded-2xl border border-slate-700">
                  <h3 className="text-lg font-bold text-white mb-4">Screen Analysis</h3>
                  <video ref={videoRef} className="w-full h-48 bg-black rounded-lg mb-4" />
                  <canvas ref={canvasRef} className="hidden" />
                  <input 
                    value={screenAnalysisPrompt} onChange={(e) => setScreenAnalysisPrompt(e.target.value)}
                    className="w-full bg-[#0B1121] border border-slate-700 rounded-xl p-4 text-white mb-4 outline-none focus:border-indigo-500"
                    placeholder="What should AI look for on screen?"
                  />
                  <div className="flex gap-4">
                    <button onClick={startScreenShare} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold">
                      {isScreenSharing ? 'Sharing...' : 'Start Screen Share'}
                    </button>
                    <button 
                      onClick={() => analyzeScreen(false, true)}
                      disabled={!isScreenSharing || isAnalyzing}
                      className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(192,38,211,0.4)]"
                    >
                      {isAnalyzing ? <Activity className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
                      Scan MCQ
                    </button>
                    <button 
                      onClick={() => analyzeScreen(false, false)}
                      disabled={!isScreenSharing || isAnalyzing}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"
                    >
                      {isAnalyzing ? <Activity className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                      Scan General
                    </button>
                  </div>
                  {screenShareError && (
                    <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <p>{screenShareError}</p>
                    </div>
                  )}
                  {analysisResult && (
                    <div className="mt-4 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl text-indigo-200 text-sm">
                      {analysisResult}
                    </div>
                  )}
                </div>

                {/* Text Query */}
                <div className="p-6 bg-[#050814] rounded-2xl border border-slate-700">
                  <h3 className="text-lg font-bold text-white mb-4">Ask AI</h3>
                  <textarea 
                    value={textQuery} onChange={(e) => setTextQuery(e.target.value)}
                    className="w-full bg-[#0B1121] border border-slate-700 rounded-xl p-4 text-white mb-4 outline-none focus:border-indigo-500"
                    placeholder="Type your question here..."
                  />
                  <button 
                    onClick={handleTextQuery}
                    disabled={isQuerying || !textQuery}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"
                  >
                    {isQuerying ? <Activity className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    Ask AI
                  </button>
                  {queryResult && (
                    <div className="mt-4 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl text-indigo-200 text-sm whitespace-pre-wrap">
                      {queryResult}
                    </div>
                  )}
                </div>
              </div>

              {mockStarted && (
                <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0F172A] border border-fuchsia-500/30 shadow-xl">
                  <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-800">
                    <h3 className="text-xl font-bold text-white">Mock Interview Question</h3>
                    <span className="px-3 py-1 bg-fuchsia-500/20 text-fuchsia-400 rounded-lg text-sm font-bold">{mockDifficulty}</span>
                  </div>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center shrink-0">
                        <BrainCircuit className="w-5 h-5 text-fuchsia-400" />
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-slate-700 text-slate-200">
                        {mockQuestion || "Generating question..."}
                      </div>
                    </div>
                    <div className="flex gap-4 flex-row-reverse">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <Mic className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="bg-indigo-500/10 p-4 rounded-2xl rounded-tr-none border border-indigo-500/20 text-indigo-200 w-full">
                        <textarea 
                          value={mockAnswer}
                          onChange={(e) => setMockAnswer(e.target.value)}
                          className="w-full bg-transparent border-none outline-none resize-none h-24 placeholder-indigo-400/50"
                          placeholder="Speak your answer or type it here..."
                        ></textarea>
                      </div>
                    </div>
                    {mockFeedback && (
                      <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl text-emerald-200 text-sm whitespace-pre-wrap">
                        <h4 className="font-bold mb-2">Feedback:</h4>
                        {mockFeedback}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button 
                        onClick={evaluateMockAnswer}
                        disabled={isEvaluatingMock || !mockAnswer}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                      >
                        {isEvaluatingMock ? <Activity className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Submit Answer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 📊 MATCH TAB */}
          {activeTab === 'match' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="p-8 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <BarChart className="w-6 h-6 text-emerald-400" /> Resume Match Analysis
                </h2>
                <p className="text-slate-400 mb-6 max-w-2xl">
                  Compare your uploaded resume against the job description provided in the Setup tab.
                  Our AI will analyze the match, highlight missing skills, and suggest improvements.
                </p>
                <button 
                  onClick={analyzeMatch}
                  disabled={isMatching || !resumeText || !jdText}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMatching ? <Activity className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                  {isMatching ? 'Analyzing Match...' : 'Analyze Resume Match'}
                </button>
              </div>

              {matchResult && (
                <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900/20 to-slate-900/80 border border-indigo-500/30 shadow-xl">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Analysis Results
                  </h3>
                  <div className="bg-[#050814] p-6 rounded-2xl border border-slate-700 text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {matchResult}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 🧠 MEMORY TAB */}
          {activeTab === 'memory' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="flex items-center justify-between bg-[#0F172A]/80 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
                    <History className="w-6 h-6 text-indigo-400" /> Session History & Memory
                  </h2>
                  <p className="text-slate-400 text-sm">All past answers are saved automatically. Review your weak areas.</p>
                </div>
                <button 
                  onClick={() => setHistory([])}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Clear All Memory
                </button>
              </div>

              <div className="grid grid-cols-3 gap-8">
                <div className="col-span-1 space-y-6">
                  <div className="p-6 rounded-3xl bg-amber-900/10 border border-amber-500/20 shadow-xl">
                    <h3 className="font-bold text-amber-400 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" /> Weak Areas Tracked
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-center justify-between text-sm text-slate-300 bg-[#050814] p-3 rounded-xl border border-slate-800">
                        <span>System Design (Scaling)</span>
                        <span className="text-amber-500 font-bold">Needs Work</span>
                      </li>
                      <li className="flex items-center justify-between text-sm text-slate-300 bg-[#050814] p-3 rounded-xl border border-slate-800">
                        <span>Behavioral (Conflict)</span>
                        <span className="text-amber-500 font-bold">Needs Work</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="p-6 rounded-3xl bg-emerald-900/10 border border-emerald-500/20 shadow-xl">
                    <h3 className="font-bold text-emerald-400 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Strong Areas
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-center justify-between text-sm text-slate-300 bg-[#050814] p-3 rounded-xl border border-slate-800">
                        <span>React Hooks</span>
                        <span className="text-emerald-500 font-bold">Excellent</span>
                      </li>
                      <li className="flex items-center justify-between text-sm text-slate-300 bg-[#050814] p-3 rounded-xl border border-slate-800">
                        <span>JavaScript Closures</span>
                        <span className="text-emerald-500 font-bold">Good</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="col-span-2 space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" /> Recent Interactions
                  </h3>
                  
                  <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {history.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 bg-[#0F172A]/80 rounded-3xl border border-slate-800">
                        No history yet. Start using the copilot to save your interactions.
                      </div>
                    ) : (
                      history.map((item, index) => (
                        <div key={index} className="p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-indigo-400 flex items-center gap-2">
                              <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold uppercase">{item.type}</span>
                              {item.query}
                            </h4>
                            <span className="text-xs text-slate-500 font-mono">{item.time}</span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {item.response}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🧠 KNOWLEDGE BASE (RAG) TAB */}
          {activeTab === 'knowledge' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="flex items-center justify-between bg-[#0F172A]/80 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
                    <Database className="w-6 h-6 text-emerald-400" /> Local Knowledge Base (RAG)
                  </h2>
                  <p className="text-slate-400 text-sm">Search across all past meetings and transcripts semantically.</p>
                </div>
                <button 
                  onClick={() => vectorStore.clear()}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Reset Index
                </button>
              </div>

              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 shadow-xl">
                <div className="flex gap-4 mb-8">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      type="text"
                      placeholder="Ask anything about past meetings... (e.g., 'What was discussed about React?')"
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const query = (e.target as HTMLInputElement).value;
                          const results = await vectorStore.search(query);
                          setSearchResults(results);
                        }
                      }}
                    />
                  </div>
                  <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg">
                    Search
                  </button>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> Semantic Search Results
                  </h3>
                  
                  {searchResults.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-[#050814] rounded-2xl border border-slate-800 border-dashed">
                      No results found. Start indexing transcripts to build your knowledge base.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {searchResults.map((result, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 hover:border-indigo-500/50 transition-all group">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold uppercase">
                                {result.metadata.type || 'Transcript'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">{new Date(result.metadata.date).toLocaleDateString()}</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                              {Math.round(result.score * 100)}% Match
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {result.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 💻 CODEPAD TAB */}
          {activeTab === 'codepad' && (
            <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between bg-[#0F172A]/80 p-4 rounded-2xl border border-slate-800 shadow-lg">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-amber-400" /> AI Codepad
                </h2>
                <div className="flex gap-4 items-center">
                  <div className="flex bg-[#050814] border border-slate-700 rounded-lg overflow-hidden">
                    <input 
                      type="text"
                      value={codePrompt}
                      onChange={(e) => setCodePrompt(e.target.value)}
                      placeholder="Ask AI to write code..."
                      className="bg-transparent text-sm px-4 py-2 text-white focus:outline-none w-64"
                      onKeyDown={(e) => e.key === 'Enter' && generateCode()}
                    />
                    <button 
                      onClick={generateCode}
                      disabled={isGeneratingCode || !codePrompt}
                      className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-white text-sm font-bold disabled:opacity-50 transition-colors"
                    >
                      {isGeneratingCode ? <Activity className="w-4 h-4 animate-spin" /> : 'Generate'}
                    </button>
                  </div>
                  <select 
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="bg-[#050814] border border-slate-700 text-sm rounded-lg px-4 py-2 text-white focus:outline-none"
                  >
                    <option value="Python">Python</option>
                    <option value="JavaScript">JavaScript</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="Java">Java</option>
                    <option value="C++">C++</option>
                    <option value="Go">Go</option>
                    <option value="Rust">Rust</option>
                  </select>
                  <button 
                    onClick={optimizeCode}
                    disabled={isOptimizingCode || !code}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" /> {isOptimizingCode ? 'Optimizing...' : 'Optimize'}
                  </button>
                  <button 
                    onClick={explainCode}
                    disabled={isExplaining}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> {isExplaining ? 'Analyzing...' : 'Explain'}
                  </button>
                  <button 
                    onClick={generateUnitTests}
                    disabled={isGeneratingCode || !code}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    <TestTube className="w-4 h-4" /> {isGeneratingCode ? 'Creating...' : 'Unit Tests'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 flex-1 min-h-[500px]">
                <div className="bg-[#050814] rounded-3xl border border-slate-800 p-6 shadow-inner flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-mono text-slate-500">Editor</span>
                    <button className="text-slate-500 hover:text-white"><Copy className="w-4 h-4" /></button>
                  </div>
                  <textarea 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full flex-1 bg-transparent border-none outline-none text-amber-300 font-mono text-sm resize-none custom-scrollbar"
                  ></textarea>
                </div>
                
                <div className="bg-[#0F172A]/80 rounded-3xl border border-slate-800 p-6 shadow-xl overflow-y-auto custom-scrollbar">
                  <h3 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest">AI Explanation</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                      <p className="text-sm text-slate-300">{codeExplanation || "Click 'Explain Code' to get AI analysis."}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ⚙️ SETUP TAB */}
          {activeTab === 'setup' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="p-8 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Lock className="w-6 h-6 text-indigo-400" /> API & Core Settings
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">AI Provider</label>
                    <select 
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none mb-4"
                    >
                      <option value="groq">Groq (Ultra-Fast)</option>
                      <option value="openai">OpenAI (GPT-4o)</option>
                      <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                      <option value="gemini">Google Gemini (1.5 Pro)</option>
                      <option value="ollama">Ollama (Local / Offline)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Provider API Key</label>
                    <div className="flex gap-4">
                      <input 
                        type="password" value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder="Enter API Key..."
                        className="flex-1 bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none font-mono"
                      />
                      <button 
                        onClick={() => testApiKey(tempApiKey)}
                        disabled={apiStatus === 'testing'}
                        className={`px-6 py-3 rounded-xl font-bold border transition-all ${
                          apiStatus === 'success' ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400' :
                          apiStatus === 'error' ? 'bg-red-900/50 border-red-500 text-red-400' :
                          'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                        }`}
                      >
                        {apiStatus === 'testing' ? 'Testing...' : apiStatus === 'success' ? 'Connected!' : apiStatus === 'error' ? 'Failed' : 'Test Key'}
                      </button>
                      <button 
                        onClick={saveApiKey}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all"
                      >
                        Save Key
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">STT Provider</label>
                      <select 
                        value={sttProvider} onChange={(e) => setSttProvider(e.target.value as any)}
                        className="w-full bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                      >
                        <option value="browser">Browser (Free)</option>
                        <option value="deepgram">Deepgram (Pro/Fast)</option>
                      </select>
                    </div>
                    {sttProvider === 'deepgram' && (
                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">Deepgram API Key</label>
                        <input 
                          type="password" value={deepgramKey} onChange={(e) => setDeepgramKey(e.target.value)}
                          placeholder="Enter Deepgram Key..."
                          className="w-full bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Text AI Model</label>
                      <select 
                        value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                      >
                        {getModelsByProvider(provider).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Vision AI Model (Screen)</label>
                      <select 
                        value={visionModel} onChange={(e) => setVisionModel(e.target.value)}
                        className="w-full bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                      >
                        {getVisionModelsByProvider(provider).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Resume Upload</label>
                    <div className="flex gap-4">
                      <input type="file" accept=".pdf,.txt" onChange={handleResumeUpload} className="hidden" id="resume-upload" />
                      <label htmlFor="resume-upload" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold cursor-pointer transition-all">
                        {resumeFile ? 'Change File' : 'Upload PDF/Text'}
                      </label>
                      <span className="text-slate-500 text-sm flex items-center">{resumeFile?.name || 'No file selected'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Target Company Mode</label>
                    <select 
                      value={company} onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                    >
                      {companies.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">AI will adjust its tone and expected answer patterns based on the company's known interview style (e.g., Amazon Leadership Principles).</p>
                  </div>

                  <div className="pt-6 border-t border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <EyeOff className="w-5 h-5 text-indigo-400" /> Advanced UI & Stealth Settings
                    </h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                          <div>
                            <span className="block text-sm font-bold text-white">Transparent Dashboard</span>
                            <span className="text-[10px] text-slate-500">Makes the main app background disappear</span>
                          </div>
                          <button 
                            onClick={() => setIsTransparentDashboard(!isTransparentDashboard)}
                            className={`w-12 h-6 rounded-full transition-all relative ${isTransparentDashboard ? 'bg-indigo-600' : 'bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isTransparentDashboard ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                        
                        <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-bold text-white">Backdrop Blur</span>
                            <span className="text-xs text-indigo-400 font-mono">{backdropBlur}px</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" value={backdropBlur} onChange={(e) => setBackdropBlur(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                          <div>
                            <span className="block text-sm font-bold text-white">Focus Mode</span>
                            <span className="text-[10px] text-slate-500">Hides non-critical dashboard elements</span>
                          </div>
                          <button 
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className={`w-12 h-6 rounded-full transition-all relative ${isFocusMode ? 'bg-indigo-600' : 'bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isFocusMode ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                          <span className="block text-sm font-bold text-white mb-3">Active Floating Modules</span>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(activeFloatingModules).map(([key, value]) => (
                              <button 
                                key={key}
                                onClick={() => setActiveFloatingModules(prev => ({ ...prev, [key]: !value }))}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${value ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                              >
                                {key}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                          <div>
                            <span className="block text-sm font-bold text-white">Subtitles Mode</span>
                            <span className="text-[10px] text-slate-500">Minimalist text-only overlay</span>
                          </div>
                          <button 
                            onClick={() => setIsSubtitlesMode(!isSubtitlesMode)}
                            className={`w-12 h-6 rounded-full transition-all relative ${isSubtitlesMode ? 'bg-emerald-600' : 'bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSubtitlesMode ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Camouflage Type</label>
                          <div className="flex gap-2">
                            {(['calculator', 'jira', 'docs'] as const).map(type => (
                              <button 
                                key={type}
                                onClick={() => setStealthModeType(type)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${stealthModeType === type ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Interview Language</label>
                    <select 
                      value={language} onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-[#050814] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                    >
                      <option>English</option>
                      <option>Hinglish</option>
                      <option>Hindi</option>
                      <option>Urdu</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2 flex justify-between">
                      <span>Widget Opacity (Stealth)</span>
                      <span className="text-indigo-400">{opacity}%</span>
                    </label>
                    <input 
                      type="range" min="10" max="100" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full accent-indigo-500 mb-4"
                    />
                    <button 
                      onClick={toggleClickThrough}
                      className={`w-full px-6 py-3 rounded-xl font-bold border transition-all ${
                        isClickThrough ? 'bg-indigo-900/50 border-indigo-500 text-indigo-400' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                      }`}
                    >
                      {isClickThrough ? 'Ghost Mode ON (Click-through)' : 'Ghost Mode OFF'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="p-8 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl flex flex-col">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" /> Your Resume
                  </h2>
                  <textarea 
                    value={resumeText} onChange={(e) => setResumeText(e.target.value)}
                    className="w-full flex-1 bg-[#050814] border border-slate-700 rounded-xl p-4 text-slate-300 font-mono text-xs focus:border-emerald-500 outline-none resize-none min-h-[200px]"
                    placeholder="Paste resume here..."
                  ></textarea>
                </div>
                <div className="p-8 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl flex flex-col">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-fuchsia-400" /> Job Description
                  </h2>
                  <textarea 
                    value={jdText} onChange={(e) => setJdText(e.target.value)}
                    className="w-full flex-1 bg-[#050814] border border-slate-700 rounded-xl p-4 text-slate-300 font-mono text-xs focus:border-fuchsia-500 outline-none resize-none min-h-[200px]"
                    placeholder="Paste JD here..."
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* ⬇️ ELECTRON EXPORT TAB */}
          {activeTab === 'electron' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-slate-900/80 border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.1)] text-center">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
                  <Download className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4">Ready for Native Desktop</h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                  This project is already fully configured with Electron for <strong>100% hardware-level stealth</strong> and global hotkeys.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-[#0F172A]/80 border border-slate-800">
                  <div className="w-8 h-8 bg-slate-800 text-white font-bold rounded-full flex items-center justify-center mb-4">1</div>
                  <h3 className="font-bold text-white mb-2">Download ZIP</h3>
                  <p className="text-xs text-slate-400 mb-3">Use the export button in the top right of AI Studio to download this entire project as a ZIP file.</p>
                </div>
                <div className="p-6 rounded-2xl bg-[#0F172A]/80 border border-slate-800">
                  <div className="w-8 h-8 bg-slate-800 text-white font-bold rounded-full flex items-center justify-center mb-4">2</div>
                  <h3 className="font-bold text-white mb-2">Install Dependencies</h3>
                  <p className="text-xs text-slate-400 mb-3">Extract the ZIP, open a terminal in the folder, and run:</p>
                  <code className="block bg-[#050814] p-3 rounded-lg text-xs text-emerald-400 font-mono border border-slate-800">
                    npm install
                  </code>
                </div>
                <div className="p-6 rounded-2xl bg-indigo-900/20 border border-indigo-500/30">
                  <div className="w-8 h-8 bg-indigo-600 text-white font-bold rounded-full flex items-center justify-center mb-4">3</div>
                  <h3 className="font-bold text-indigo-300 mb-2">Build Windows .exe</h3>
                  <p className="text-xs text-indigo-200/70 mb-3">Run this command to automatically generate a 1-click Windows Installer (.exe):</p>
                  <code className="block bg-[#050814] p-3 rounded-lg text-xs text-emerald-400 font-mono border border-indigo-500/30">
                    npm run electron:build
                  </code>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-[#050814] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-sm font-mono text-slate-400">package.json (Update this file)</span>
                  </div>
                  <pre className="p-6 text-xs font-mono text-slate-300 overflow-x-auto custom-scrollbar max-h-[400px]">
                    <code>{packageJsonCode}</code>
                  </pre>
                </div>

                <div className="bg-[#050814] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-sm font-mono text-slate-400">build.bat (1-Click Builder)</span>
                  </div>
                  <pre className="p-6 text-xs font-mono text-slate-300 overflow-x-auto custom-scrollbar max-h-[400px]">
                    <code>{buildScriptCode}</code>
                  </pre>
                </div>
              </div>

              <div className="bg-[#050814] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-sm font-mono text-slate-400">electron/main.cjs (Stealth Logic)</span>
                </div>
                <pre className="p-6 text-xs font-mono text-slate-300 overflow-x-auto custom-scrollbar max-h-[400px]">
                  <code>{electronMainCode}</code>
                </pre>
              </div>
            </div>
          )}

        </main>
      </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 1); }
      `}} />
    </div>
  );
}
