import sys
import os
import time
import threading
import keyboard
import mss
import pytesseract
import ctypes
import socket
from PIL import Image
from faster_whisper import WhisperModel
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QTextEdit, QVBoxLayout, QWidget, 
    QLabel, QRubberBand, QFrame, QMessageBox, QPushButton, QHBoxLayout
)
from PyQt6.QtCore import Qt, pyqtSignal, QObject, QPoint, QRect, QSize, QTimer
from PyQt6.QtGui import QFont, QPainter, QColor
import json
import requests
from openai import OpenAI
from groq import Groq
from dotenv import load_dotenv
from flask import Flask, render_template_string, request
from pypdf import PdfReader
try:
    import setproctitle
    setproctitle.setproctitle("svchost.exe") # Process Masking
except ImportError:
    pass

# Load environment variables
load_dotenv()

# Constants for Windows API
WDA_EXCLUDEFROMCAPTURE = 0x00000011

# Configure Groq API
GROQ_API_KEY = os.getenv("VITE_GROQ_API_KEY", "YOUR_API_KEY_HERE")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY and GROQ_API_KEY != "YOUR_API_KEY_HERE" else None

# Role & Task specific prompts
MCQ_PROMPT = "Identify the correct option (A, B, C, or D) from this MCQ. Return ONLY the letter and the option text. Zero explanation. No conversational filler."
INTERVIEW_PROMPT = """You are a World-Class Software Architect. Your ONLY goal is to extract the actual technical question from the messy OCR text and provide the correct answer.

STRICT RULES:
1. The input is raw OCR text. It will be messy, out of order, and contain typos (e.g., options appearing before the question, misspelled words like "uppperCase").
2. Your FIRST task is to piece together the real question and its options, ignoring all UI noise ("Next", "Timer", "1/10").
3. Deduce the programming language from the context if not stated.
4. If it is an MCQ, output ONLY the correct option letter and the exact correct text. Example: "Answer: C) toUpperCase()".
5. If it is a coding/theory question, provide a concise bulleted answer.
6. NEVER explain your reasoning, mention OCR quality, or say "Based on the text".
7. If the text contains ANY technical keywords or resembles a question, answer it immediately.
8. Only output "Waiting for question..." if the text is completely empty or has zero technical relevance.
9. Do NOT use conversational filler. Just the technical answer.

PERSONAL CONTEXT (Use this if relevant to the question):
{context}"""

# Flask App for Mobile Remote
flask_app = Flask(__name__)
remote_signals = None

@flask_app.route('/')
def index():
    return render_template_string("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                body { background: #0a0a0a; color: #00FF00; font-family: sans-serif; text-align: center; padding: 20px; }
                .btn { 
                    width: 100%; padding: 25px; margin: 15px 0; font-size: 20px; font-weight: bold;
                    background: #111; border: 2px solid #00FF00; color: #00FF00; border-radius: 15px;
                    box-shadow: 0 0 15px rgba(0, 255, 0, 0.2);
                }
                .btn:active { background: #00FF00; color: #000; }
                .status { font-size: 12px; opacity: 0.5; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h2>GHOST REMOTE</h2>
            <button class="btn" onclick="fetch('/action/mcq')">HAWK-EYE (OCR)</button>
            <button class="btn" onclick="fetch('/action/audio')">SONIC EAR (AUDIO)</button>
            <button class="btn" onclick="fetch('/action/scroll')">TELEPROMPTER</button>
            <div class="status">Connected to Assistant Server</div>
        </body>
        </html>
    """)

@flask_app.route('/action/<cmd>')
def action(cmd):
    if remote_signals:
        remote_signals.remote_action.emit(cmd)
    return "OK"

class WorkerSignals(QObject):
    response_received = pyqtSignal(str)
    status_update = pyqtSignal(str)
    remote_action = pyqtSignal(str)

class RegionSelector(QWidget):
    region_selected = pyqtSignal(QRect)
    def __init__(self):
        super().__init__()
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.setWindowOpacity(0.3)
        self.setStyleSheet("background-color: black;")
        self.setCursor(Qt.CursorShape.CrossCursor)
        self.origin = QPoint()
        self.rubberBand = QRubberBand(QRubberBand.Shape.Rectangle, self)
        self.showFullScreen()
    def mousePressEvent(self, event):
        self.origin = event.pos()
        self.rubberBand.setGeometry(QRect(self.origin, QSize()))
        self.rubberBand.show()
    def mouseMoveEvent(self, event):
        self.rubberBand.setGeometry(QRect(self.origin, event.pos()).normalized())
    def mouseReleaseEvent(self, event):
        self.rubberBand.hide()
        rect = self.rubberBand.geometry()
        self.region_selected.emit(rect)
        self.close()

class InterviewAssistant(QMainWindow):
    def __init__(self):
        super().__init__()
        global remote_signals
        self.signals = WorkerSignals()
        remote_signals = self.signals
        
        self.signals.response_received.connect(self.update_display)
        self.signals.status_update.connect(self.update_status)
        self.signals.remote_action.connect(self.handle_remote)
        
        self.init_ui()
        self.apply_stealth_protection()
        self.setup_hotkeys()
        self.load_personal_context()
        
        self.is_listening = False
        self.is_auto_pilot = False
        self.is_scrolling = False
        self.selected_model = "llama-3.1-8b-instant" 
        self.last_ocr_text = ""
        self.capture_region = None 
        self.personal_context = "No resume loaded."
        
        # Models
        # Groq models are used directly in call_ai_streaming
        
        # Local Whisper (Tiny model for speed)
        self.update_status("Loading Whisper (Local)...")
        threading.Thread(target=self.init_whisper, daemon=True).start()
        
        # Start Flask Server
        threading.Thread(target=self.run_flask, daemon=True).start()
        
        # Teleprompter Timer
        self.scroll_timer = QTimer()
        self.scroll_timer.timeout.connect(self.auto_scroll)

    def init_whisper(self):
        try:
            self.whisper = WhisperModel("tiny", device="cpu", compute_type="int8")
            self.signals.status_update.emit("SYSTEM READY | F8: MCQ")
        except Exception as e:
            self.signals.status_update.emit(f"Whisper Error: {e}")

    def run_flask(self):
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        print(f"[!] Remote Control URL: http://{local_ip}:5000")
        flask_app.run(host='0.0.0.0', port=5000)

    def handle_remote(self, cmd):
        if cmd == 'mcq': self.capture_mcq()
        elif cmd == 'audio': self.toggle_audio()
        elif cmd == 'scroll': self.toggle_scroll()

    def load_personal_context(self):
        """RAG: Load resume context from PDF or TXT"""
        try:
            if os.path.exists("resume.pdf"):
                reader = PdfReader("resume.pdf")
                self.personal_context = "\n".join([page.extract_text() for page in reader.pages])
                print("[!] Resume Context Loaded (PDF)")
            elif os.path.exists("resume.txt"):
                with open("resume.txt", "r") as f:
                    self.personal_context = f.read()
                print("[!] Resume Context Loaded (TXT)")
        except Exception as e:
            print(f"RAG Error: {e}")

    def init_ui(self):
        self.setWindowFlags(
            Qt.WindowType.WindowStaysOnTopHint | 
            Qt.WindowType.FramelessWindowHint | 
            Qt.WindowType.Tool |
            Qt.WindowType.WindowDoesNotAcceptFocus
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setFixedSize(450, 350)
        self.move(50, 50)

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)

        self.frame = QFrame()
        self.frame.setObjectName("GhostFrame")
        self.frame.setStyleSheet("""
            #GhostFrame {
                background-color: rgba(10, 10, 10, 180);
                border-radius: 12px;
                border: 1px solid rgba(0, 255, 0, 40);
            }
        """)
        frame_layout = QVBoxLayout(self.frame)
        layout.addWidget(self.frame)

        # Header with Remote IP
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        self.status_label = QLabel(f"REMOTE: http://{local_ip}:5000")
        self.status_label.setStyleSheet("color: #00FF00; font-size: 10px; font-family: 'Segoe UI Semibold'; opacity: 0.6;")
        frame_layout.addWidget(self.status_label)

        # Display Area
        self.display = QTextEdit()
        self.display.setReadOnly(True)
        self.display.setStyleSheet("""
            QTextEdit {
                background-color: transparent;
                color: #00FF00;
                border: none;
                font-family: 'Consolas';
                font-size: 13px;
            }
        """)
        frame_layout.addWidget(self.display)

        # Teleprompter Controls
        btn_layout = QHBoxLayout()
        self.scroll_btn = QPushButton("TELEPROMPTER: OFF")
        self.scroll_btn.setStyleSheet("background: rgba(0,255,0,0.1); color: #00FF00; border: 1px solid #00FF00; font-size: 10px; padding: 5px;")
        self.scroll_btn.clicked.connect(self.toggle_scroll)
        btn_layout.addWidget(self.scroll_btn)
        frame_layout.addLayout(btn_layout)

    def apply_stealth_protection(self):
        try:
            if sys.platform == "win32":
                hwnd = self.winId().__int__()
                ctypes.windll.user32.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
        except: pass

    def setup_hotkeys(self):
        keyboard.add_hotkey('f8', self.capture_mcq)
        keyboard.add_hotkey('f9', self.toggle_audio)
        keyboard.add_hotkey('f10', self.toggle_auto_pilot)
        keyboard.add_hotkey('f11', self.toggle_model)
        keyboard.add_hotkey('ctrl+f8', self.select_region)

    def toggle_scroll(self):
        self.is_scrolling = not self.is_scrolling
        if self.is_scrolling:
            self.scroll_timer.start(100) # Scroll every 100ms
            self.scroll_btn.setText("TELEPROMPTER: ON")
        else:
            self.scroll_timer.stop()
            self.scroll_btn.setText("TELEPROMPTER: OFF")

    def auto_scroll(self):
        v_bar = self.display.verticalScrollBar()
        if v_bar.value() < v_bar.maximum():
            v_bar.setValue(v_bar.value() + 1)
        else:
            self.toggle_scroll()

    def select_region(self):
        self.selector = RegionSelector()
        self.selector.region_selected.connect(self.set_region)

    def set_region(self, rect):
        self.capture_region = rect
        self.update_status(f"Region Set: {rect.width()}x{rect.height()}")

    def update_status(self, text):
        self.status_label.setText(text)

    def update_display(self, text):
        self.display.setPlainText(text)
        # Reset scroll when new response arrives
        self.display.verticalScrollBar().setValue(0)

    def call_ai_streaming(self, model_name, prompt, on_chunk):
        try:
            if not groq_client: 
                on_chunk("Error: Groq API Key missing.")
                return "Error"
            
            prompt_str = prompt if isinstance(prompt, str) else "\n".join([str(p) for p in prompt])
            
            stream = groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt_str,
                    }
                ],
                model=model_name,
                stream=True,
            )
            
            full_text = ""
            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    full_text += content
                    on_chunk(full_text)
            return full_text
        except Exception as e:
            on_chunk(f"Error: {str(e)}")
            return "Error"

    def toggle_auto_pilot(self):
        self.is_auto_pilot = not self.is_auto_pilot
        if self.is_auto_pilot:
            self.update_status("Auto-Pilot ACTIVE")
            threading.Thread(target=self._auto_pilot_thread, daemon=True).start()
        else:
            self.update_status("Auto-Pilot STOPPED.")

    def _auto_pilot_thread(self):
        while self.is_auto_pilot:
            try:
                with mss.mss() as sct:
                    monitor = sct.monitors[1]
                    if self.capture_region:
                        monitor = {"top": self.capture_region.top(), "left": self.capture_region.left(), "width": self.capture_region.width(), "height": self.capture_region.height()}
                    screenshot = sct.grab(monitor)
                    img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
                    
                    # OPTIMIZATION: Convert to grayscale and increase contrast
                    img = img.convert('L')
                    from PIL import ImageEnhance
                    enhancer = ImageEnhance.Contrast(img)
                    img = enhancer.enhance(2.0)
                    
                    text = pytesseract.image_to_string(img).strip()
                    if len(text) > 50 and text != self.last_ocr_text:
                        self.last_ocr_text = text
                        self.signals.status_update.emit("New Question Detected...")
                        prompt = INTERVIEW_PROMPT.format(context=self.personal_context) + f"\n\nQUESTION FROM SCREEN:\n{text}"
                        self.call_ai_streaming(self.selected_model, prompt, self.signals.response_received.emit)
                time.sleep(2)
            except: time.sleep(2)

    def capture_mcq(self):
        self.update_status("Hawk-Eye Capturing...")
        threading.Thread(target=self._capture_mcq_thread, daemon=True).start()

    def _capture_mcq_thread(self):
        try:
            with mss.mss() as sct:
                monitor = sct.monitors[1]
                if self.capture_region:
                    monitor = {"top": self.capture_region.top(), "left": self.capture_region.left(), "width": self.capture_region.width(), "height": self.capture_region.height()}
                screenshot = sct.grab(monitor)
                img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
                
                # OPTIMIZATION: Convert to grayscale and increase contrast for faster/better OCR
                img = img.convert('L')
                from PIL import ImageEnhance
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(2.0)
                
                text = pytesseract.image_to_string(img)
                if text.strip():
                    self.signals.status_update.emit("Brain Thinking (MCQ)...")
                    prompt = INTERVIEW_PROMPT.format(context=self.personal_context) + f"\n\nMCQ QUESTION FROM SCREEN:\n{text}"
                    self.call_ai_streaming(self.selected_model, prompt, self.signals.response_received.emit)
        except Exception as e:
            self.signals.status_update.emit(f"Error: {str(e)[:30]}")

    def toggle_audio(self):
        self.is_listening = not self.is_listening
        if self.is_listening:
            self.update_status("Sonic Ear Listening...")
            threading.Thread(target=self._audio_thread, daemon=True).start()
        else:
            self.update_status("Audio Stopped.")

    def _audio_thread(self):
        import sounddevice as sd
        import numpy as np
        import wave

        def callback(indata, frames, time, status):
            if status: print(status)
            self.audio_queue.append(indata.copy())

        self.audio_queue = []
        sample_rate = 16000
        
        while self.is_listening:
            try:
                self.signals.status_update.emit("Listening (Local Whisper)...")
                with sd.InputStream(samplerate=sample_rate, channels=1, callback=callback):
                    time.sleep(5) # Record in 5s chunks
                
                if not self.audio_queue: continue
                
                audio_data = np.concatenate(self.audio_queue, axis=0)
                self.audio_queue = []
                
                # Transcribe with Local Whisper
                segments, _ = self.whisper.transcribe(audio_data.flatten(), beam_size=5)
                text = " ".join([s.text for s in segments]).strip()
                
                if text:
                    self.signals.status_update.emit("Architect Thinking...")
                    full_prompt = INTERVIEW_PROMPT.format(context=self.personal_context)
                    self.call_ai_streaming(self.selected_model, [full_prompt, text], self.signals.response_received.emit)
            except Exception as e:
                print(f"Audio error: {e}")
                break

    def toggle_model(self):
        models = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"]
        current_idx = models.index(self.selected_model) if self.selected_model in models else 0
        self.selected_model = models[(current_idx + 1) % len(models)]
        self.update_status(f"Model Switched to: {self.selected_model.upper()}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = InterviewAssistant()
    window.show()
    sys.exit(app.exec())
