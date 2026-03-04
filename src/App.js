import { useState, useRef, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const INTERVIEW_QUESTIONS = [
  "Tell me about yourself and your background.",
  "What is your greatest strength as a frontend developer?",
  "Describe a challenging project you worked on and how you overcame obstacles.",
  "Why do you want to work at this company?",
  "Where do you see yourself in 5 years?",
  "How do you handle tight deadlines and pressure?",
  "What's your experience with React and modern JavaScript?",
  "Tell me about a time you worked in a team and faced conflict.",
];

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "literally", "actually", "so", "right"];

// ─── Groq API Call ─────────────────────────────────────────────────────────────
async function getAIFeedback(question, answer) {
  const GROQ_API_KEY = "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"; // 🔑 Replace with your free key from console.groq.com

  const prompt = `You are an expert interview coach. Analyze this interview answer and give structured feedback.

Question: "${question}"
Answer: "${answer}"

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "score": <number 1-10>,
  "relevance": <number 1-10>,
  "clarity": <number 1-10>,
  "confidence": <number 1-10>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "betterAnswer": "<a concise improved version of the answer in 2-3 sentences>",
  "summary": "<one sentence overall assessment>"
}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 600,
      }),
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error("Groq API error:", err);
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function countFillerWords(text) {
  const lower = text.toLowerCase();
  const found = {};
  FILLER_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) found[word] = matches.length;
  });
  return found;
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label, color }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const safeScore = (!score || isNaN(score)) ? 0 : score;
  const offset = circ - (safeScore / 10) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#1e2535" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="36" y="41" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="'DM Mono', monospace">
          {safeScore}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: "#8899bb", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

// ─── Waveform Visualizer ──────────────────────────────────────────────────────
function WaveformBars({ isRecording }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 40 }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: isRecording ? "#00d4aa" : "#1e2535",
            animation: isRecording ? `wave ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` : "none",
            height: isRecording ? `${20 + Math.sin(i) * 15}px` : "6px",
            transition: "height 0.3s ease, background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function VoiceInterviewCoach() {
  const [screen, setScreen] = useState("home"); // home | interview | feedback
  const [currentQ, setCurrentQ] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [timer, setTimer] = useState(0);
  const [history, setHistory] = useState([]);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setSupported(false);
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalText = "";

    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript + " ";
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      setTranscript(finalText);
      setInterimText(interim);
    };

    recognition.onerror = (e) => console.error("Speech error:", e);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setTranscript("");
    setInterimText("");
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimText("");
  };

  const analyzeAnswer = async () => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);
    setScreen("feedback");
    const result = await getAIFeedback(INTERVIEW_QUESTIONS[currentQ], transcript);
    const fillers = countFillerWords(transcript);
    const words = wordCount(transcript);
    setFeedback({ ...result, fillers, words, question: INTERVIEW_QUESTIONS[currentQ], answer: transcript });
    setHistory((h) => [...h, { question: INTERVIEW_QUESTIONS[currentQ], score: result?.score, words }]);
    setIsAnalyzing(false);
  };

  const nextQuestion = () => {
    setFeedback(null);
    setTranscript("");
    setCurrentQ((q) => (q + 1) % INTERVIEW_QUESTIONS.length);
    setScreen("interview");
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const styles = {
    app: {
      minHeight: "100vh",
      background: "#090d1a",
      fontFamily: "'DM Sans', sans-serif",
      color: "#e8edf8",
      position: "relative",
      overflow: "hidden",
    },
    glow: {
      position: "fixed", top: "-200px", left: "50%", transform: "translateX(-50%)",
      width: "800px", height: "400px",
      background: "radial-gradient(ellipse, rgba(0,212,170,0.07) 0%, transparent 70%)",
      pointerEvents: "none",
    },
    container: { maxWidth: 760, margin: "0 auto", padding: "40px 20px" },
    badge: {
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)",
      borderRadius: 20, padding: "4px 12px", fontSize: 12,
      color: "#00d4aa", letterSpacing: "0.08em", textTransform: "uppercase",
    },
    h1: {
      fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 800,
      lineHeight: 1.1, margin: "20px 0 16px",
      fontFamily: "'DM Serif Display', serif",
      background: "linear-gradient(135deg, #e8edf8 0%, #00d4aa 100%)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    },
    subtitle: { color: "#8899bb", fontSize: 17, lineHeight: 1.6, maxWidth: 480, margin: "0 0 40px" },
    card: {
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: 28, marginBottom: 16,
      backdropFilter: "blur(10px)",
    },
    btnPrimary: {
      background: "linear-gradient(135deg, #00d4aa, #00a884)",
      border: "none", borderRadius: 12, padding: "14px 32px",
      color: "#090d1a", fontWeight: 700, fontSize: 16,
      cursor: "pointer", transition: "all 0.2s ease",
      fontFamily: "'DM Sans', sans-serif",
    },
    btnSecondary: {
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, padding: "14px 32px",
      color: "#e8edf8", fontWeight: 600, fontSize: 16,
      cursor: "pointer", transition: "all 0.2s ease",
      fontFamily: "'DM Sans', sans-serif",
    },
    btnRecord: {
      width: 80, height: 80, borderRadius: "50%",
      border: isRecording ? "2px solid #ff4757" : "2px solid #00d4aa",
      background: isRecording ? "rgba(255,71,87,0.15)" : "rgba(0,212,170,0.1)",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 28, transition: "all 0.3s ease",
      animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none",
    },
    tag: {
      display: "inline-block", background: "rgba(255,71,87,0.15)",
      border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6,
      padding: "2px 8px", fontSize: 12, color: "#ff6b7a", margin: "2px",
    },
    strengthTag: {
      display: "inline-block", background: "rgba(0,212,170,0.1)",
      border: "1px solid rgba(0,212,170,0.2)", borderRadius: 6,
      padding: "4px 10px", fontSize: 13, color: "#00d4aa", margin: "3px",
    },
    improveTag: {
      display: "inline-block", background: "rgba(255,165,0,0.1)",
      border: "1px solid rgba(255,165,0,0.2)", borderRadius: 6,
      padding: "4px 10px", fontSize: 13, color: "#ffa500", margin: "3px",
    },
    label: { fontSize: 12, color: "#8899bb", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 },
    progressBar: (val, max = 10) => ({
      height: 6, borderRadius: 3, background: "#1e2535",
      position: "relative", overflow: "hidden",
    }),
  };

  // ── Screens ─────────────────────────────────────────────────────────────────

  // HOME
  if (screen === "home") return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,71,87,0.4)} 50%{box-shadow:0 0 0 16px rgba(255,71,87,0)} }
        @keyframes wave { from{transform:scaleY(0.4)} to{transform:scaleY(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={styles.glow} />
      <div style={styles.container}>
        <div style={{ animation: "fadeUp 0.6s ease forwards" }}>
          <div style={styles.badge}>🎙 AI-Powered · Free · No signup</div>
          <h1 style={styles.h1}>Ace Your Next<br />Interview</h1>
          <p style={styles.subtitle}>
            Practice answering real interview questions out loud. Get instant AI feedback on your clarity, confidence, and content — completely free.
          </p>

          {!supported && (
            <div style={{ ...styles.card, borderColor: "rgba(255,71,87,0.3)", background: "rgba(255,71,87,0.05)", marginBottom: 24 }}>
              ⚠️ Your browser doesn't support voice recognition. Please use Chrome or Edge.
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
            <button style={styles.btnPrimary} onClick={() => setScreen("interview")}>
              Start Practice →
            </button>
            {history.length > 0 && (
              <div style={{ ...styles.card, padding: "14px 20px", marginBottom: 0, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "#8899bb", fontSize: 14 }}>Sessions done:</span>
                <span style={{ color: "#00d4aa", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{history.length}</span>
                <span style={{ color: "#8899bb", fontSize: 14 }}>Avg score:</span>
                <span style={{ color: "#00d4aa", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                  {(history.reduce((a, b) => a + (b.score || 0), 0) / history.length).toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Feature Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { icon: "🎙", title: "Voice Recognition", desc: "Speak naturally, we transcribe in real-time" },
              { icon: "🤖", title: "AI Feedback", desc: "Powered by Llama 3 via Groq (free)" },
              { icon: "📊", title: "Score Breakdown", desc: "Clarity, relevance & confidence scores" },
              { icon: "💬", title: "Better Answers", desc: "AI suggests improved versions of your answer" },
            ].map((f) => (
              <div key={f.title} style={styles.card}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                <div style={{ color: "#8899bb", fontSize: 14 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // INTERVIEW
  if (screen === "interview") return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,71,87,0.4)} 50%{box-shadow:0 0 0 16px rgba(255,71,87,0)} }
        @keyframes wave { from{transform:scaleY(0.4)} to{transform:scaleY(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={styles.glow} />
      <div style={styles.container}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button style={{ ...styles.btnSecondary, padding: "8px 16px", fontSize: 14 }} onClick={() => setScreen("home")}>
            ← Back
          </button>
          <div style={{ ...styles.badge }}>
            Question {currentQ + 1} of {INTERVIEW_QUESTIONS.length}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", color: isRecording ? "#ff4757" : "#8899bb", fontSize: 18 }}>
            {isRecording ? `⏺ ${formatTime(timer)}` : formatTime(timer)}
          </div>
        </div>

        {/* Progress */}
        <div style={{ height: 3, background: "#1e2535", borderRadius: 2, marginBottom: 32 }}>
          <div style={{ height: "100%", borderRadius: 2, background: "#00d4aa", width: `${((currentQ + 1) / INTERVIEW_QUESTIONS.length) * 100}%`, transition: "width 0.5s ease" }} />
        </div>

        {/* Question */}
        <div style={{ ...styles.card, borderColor: "rgba(0,212,170,0.2)", marginBottom: 24 }}>
          <div style={styles.label}>Your Question</div>
          <p style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)", fontFamily: "'DM Serif Display', serif", lineHeight: 1.5 }}>
            {INTERVIEW_QUESTIONS[currentQ]}
          </p>
        </div>

        {/* Recording Controls */}
        <div style={{ ...styles.card, textAlign: "center" }}>
          <WaveformBars isRecording={isRecording} />
          <div style={{ margin: "20px 0" }}>
            <button
              style={styles.btnRecord}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!supported}
            >
              {isRecording ? "⏹" : "🎙"}
            </button>
          </div>
          <p style={{ color: "#8899bb", fontSize: 14 }}>
            {isRecording ? "Recording... click to stop" : "Click to start recording your answer"}
          </p>
        </div>

        {/* Live Transcript */}
        {(transcript || interimText) && (
          <div style={{ ...styles.card, marginTop: 16, animation: "fadeUp 0.4s ease" }}>
            <div style={styles.label}>Live Transcript</div>
            <p style={{ lineHeight: 1.7, color: "#c8d4e8" }}>
              {transcript}
              {interimText && <span style={{ color: "#8899bb" }}>{interimText}</span>}
            </p>
            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#8899bb", fontSize: 13 }}>{wordCount(transcript + " " + interimText)} words</span>
            </div>
          </div>
        )}

        {/* Analyze Button */}
        {transcript && !isRecording && (
          <div style={{ marginTop: 16, textAlign: "center", animation: "fadeUp 0.4s ease" }}>
            <button style={styles.btnPrimary} onClick={analyzeAnswer}>
              Analyze My Answer →
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // FEEDBACK
  if (screen === "feedback") return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={styles.glow} />
      <div style={styles.container}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button style={{ ...styles.btnSecondary, padding: "8px 16px", fontSize: 14 }} onClick={() => setScreen("home")}>
            ← Home
          </button>
          <div style={styles.badge}>📊 AI Analysis</div>
        </div>

        {isAnalyzing ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🤖</div>
            <p style={{ color: "#8899bb", fontSize: 18 }}>Analyzing your answer with Llama 3...</p>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: "#00d4aa",
                  animation: `wave ${0.5 + i * 0.15}s ease-in-out infinite alternate`
                }} />
              ))}
            </div>
          </div>
        ) : feedback ? (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            {/* Summary */}
            <div style={{ ...styles.card, borderColor: "rgba(0,212,170,0.2)", marginBottom: 16 }}>
              <div style={styles.label}>Overall Assessment</div>
              <p style={{ fontSize: 17, lineHeight: 1.6, color: "#c8d4e8" }}>{feedback.summary}</p>
            </div>

            {/* Score Rings */}
            <div style={{ ...styles.card, marginBottom: 16 }}>
              <div style={styles.label}>Scores</div>
              <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
                <ScoreRing score={feedback.score} label="Overall" color="#00d4aa" />
                <ScoreRing score={feedback.relevance} label="Relevance" color="#7c6dfa" />
                <ScoreRing score={feedback.clarity} label="Clarity" color="#00b8d9" />
                <ScoreRing score={feedback.confidence} label="Confidence" color="#ffa500" />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={styles.card}>
                <div style={styles.label}>Word Count</div>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "#00d4aa" }}>
                  {feedback.words}
                </div>
                <div style={{ color: "#8899bb", fontSize: 13, marginTop: 4 }}>
                  {feedback.words < 50 ? "Too short — aim for 80-150 words" : feedback.words > 200 ? "A bit long — be more concise" : "Good length ✓"}
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.label}>Filler Words</div>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: Object.values(feedback.fillers).reduce((a, b) => a + b, 0) > 3 ? "#ff4757" : "#00d4aa" }}>
                  {Object.values(feedback.fillers).reduce((a, b) => a + b, 0)}
                </div>
                <div style={{ marginTop: 6 }}>
                  {Object.entries(feedback.fillers).map(([w, c]) => (
                    <span key={w} style={styles.tag}>"{w}" ×{c}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={styles.card}>
                <div style={styles.label}>✅ Strengths</div>
                <div style={{ marginTop: 8 }}>
                  {feedback.strengths?.map((s) => <div key={s} style={styles.strengthTag}>{s}</div>)}
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.label}>💡 Improve</div>
                <div style={{ marginTop: 8 }}>
                  {feedback.improvements?.map((s) => <div key={s} style={styles.improveTag}>{s}</div>)}
                </div>
              </div>
            </div>

            {/* Better Answer */}
            <div style={{ ...styles.card, borderColor: "rgba(124,109,250,0.25)", marginBottom: 24 }}>
              <div style={styles.label}>✨ Suggested Better Answer</div>
              <p style={{ lineHeight: 1.7, color: "#c8d4e8", fontStyle: "italic", marginTop: 8 }}>
                "{feedback.betterAnswer}"
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button style={styles.btnPrimary} onClick={nextQuestion}>
                Next Question →
              </button>
              <button style={styles.btnSecondary} onClick={() => { setFeedback(null); setTranscript(""); setScreen("interview"); }}>
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: "#8899bb" }}>Something went wrong. Please check your Groq API key.</p>
        )}
      </div>
    </div>
  );
}