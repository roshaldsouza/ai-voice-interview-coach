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
const STORAGE_KEY = "voice_coach_history";

// ─── LocalStorage Helpers ─────────────────────────────────────────────────────
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(history) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch {}
}

// ─── Streak Calculator ────────────────────────────────────────────────────────
function calcStreak(history) {
  if (!history.length) return 0;
  const days = [...new Set(history.map(h => new Date(h.date).toDateString()))];
  days.sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);
  for (let d of days) {
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diff = (current - day) / 86400000;
    if (diff <= 1) { streak++; current = day; }
    else break;
  }
  return streak;
}

// ─── Groq API ─────────────────────────────────────────────────────────────────
async function getAIFeedback(question, answer) {
  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
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
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.4, max_tokens: 600 }),
    });
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch (err) { console.error("Groq API error:", err); return null; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function countFillerWords(text) {
  const lower = text.toLowerCase();
  const found = {};
  FILLER_WORDS.forEach(word => {
    const matches = lower.match(new RegExp(`\\b${word}\\b`, "gi"));
    if (matches) found[word] = matches.length;
  });
  return found;
}
function wordCount(text) { return text.trim().split(/\s+/).filter(Boolean).length; }
function formatTime(s) { return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
function scoreColor(s) { return s >= 8 ? "#00d4aa" : s >= 6 ? "#ffa500" : "#ff4757"; }

// ─── Shared Styles ────────────────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: "#090d1a", fontFamily: "'DM Sans', sans-serif", color: "#e8edf8", position: "relative", overflow: "hidden" },
  glow: { position: "fixed", top: "-200px", left: "50%", transform: "translateX(-50%)", width: "800px", height: "400px", background: "radial-gradient(ellipse, rgba(0,212,170,0.07) 0%, transparent 70%)", pointerEvents: "none" },
  container: { maxWidth: "100%", margin: "0", padding: "40px 60px" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24, marginBottom: 16, backdropFilter: "blur(10px)" },
  badge: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", borderRadius: 20, padding: "4px 14px", fontSize: 12, color: "#00d4aa", letterSpacing: "0.08em", textTransform: "uppercase" },
  label: { fontSize: 11, color: "#8899bb", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 },
  btnPrimary: { background: "linear-gradient(135deg, #00d4aa, #00a884)", border: "none", borderRadius: 12, padding: "13px 28px", color: "#090d1a", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  btnSecondary: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "13px 28px", color: "#e8edf8", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  btnDanger: { background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.2)", borderRadius: 10, padding: "8px 16px", color: "#ff4757", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  strengthTag: { display: "inline-block", background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 6, padding: "4px 10px", fontSize: 13, color: "#00d4aa", margin: "3px" },
  improveTag: { display: "inline-block", background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.2)", borderRadius: 6, padding: "4px 10px", fontSize: 13, color: "#ffa500", margin: "3px" },
  fillerTag: { display: "inline-block", background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: 12, color: "#ff6b7a", margin: "2px" },
};

// ─── Global Styles Component ──────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap');
      @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,71,87,0.4)} 50%{box-shadow:0 0 0 16px rgba(255,71,87,0)} }
      @keyframes wave { from{transform:scaleY(0.4)} to{transform:scaleY(1)} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      * { box-sizing: border-box; margin: 0; padding: 0; }
    `}</style>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label, color, size = 72 }) {
  const r = size * 0.39;
  const circ = 2 * Math.PI * r;
  const safe = (!score || isNaN(score)) ? 0 : score;
  const offset = circ - (safe / 10) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2535" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
        <text x={size/2} y={size/2+6} textAnchor="middle" fill="white"
          fontSize={size*0.22} fontWeight="700" fontFamily="'DM Mono', monospace">{safe}</text>
      </svg>
      <span style={{ fontSize: 11, color: "#8899bb", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function WaveformBars({ isRecording }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 40 }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{ width: 3, borderRadius: 2, background: isRecording ? "#00d4aa" : "#1e2535", animation: isRecording ? `wave ${0.4+(i%5)*0.1}s ease-in-out infinite alternate` : "none", height: isRecording ? `${20+Math.sin(i)*15}px` : "6px", transition: "height 0.3s ease, background 0.3s ease" }} />
      ))}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, width = 300, height = 60 }) {
  if (!data || data.length < 2) return <span style={{ color: "#8899bb", fontSize: 13 }}>Practice more to see your trend</span>;
  const pts = data.map((v, i) => `${(i/(data.length-1))*width},${height-((v/10)*height)}`).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke="#00d4aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i/(data.length-1))*width;
        const y = height-((v/10)*height);
        return <circle key={i} cx={x} cy={y} r="4" fill="#00d4aa" stroke="#090d1a" strokeWidth="2" />;
      })}
    </svg>
  );
}

// ─── History Card ─────────────────────────────────────────────────────────────
function HistoryCard({ item, index, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const totalFiller = Object.values(item.fillers || {}).reduce((a, b) => a + b, 0);
  return (
    <div style={{ ...S.card, marginBottom: 10, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ ...S.badge, fontSize: 10 }}>#{index + 1}</span>
            <span style={{ fontSize: 12, color: "#8899bb" }}>
              {new Date(item.date).toLocaleDateString()} · {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p style={{ fontSize: 14, color: "#c8d4e8", lineHeight: 1.4 }}>{item.question}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: scoreColor(item.score) }}>{item.score}</div>
            <div style={{ fontSize: 10, color: "#8899bb" }}>SCORE</div>
          </div>
          <span style={{ color: "#8899bb", fontSize: 18 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            {[{ label: "Relevance", val: item.relevance, color: "#7c6dfa" }, { label: "Clarity", val: item.clarity, color: "#00b8d9" }, { label: "Confidence", val: item.confidence, color: "#ffa500" }].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                <span style={{ fontSize: 12, color: "#8899bb" }}>{s.label}:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.val ?? "—"}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e8edf8" }} />
              <span style={{ fontSize: 12, color: "#8899bb" }}>Words: <strong style={{ color: "#e8edf8" }}>{item.words}</strong></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4757" }} />
              <span style={{ fontSize: 12, color: "#8899bb" }}>Fillers: <strong style={{ color: totalFiller > 3 ? "#ff4757" : "#00d4aa" }}>{totalFiller}</strong></span>
            </div>
          </div>
          {item.summary && <p style={{ fontSize: 13, color: "#8899bb", fontStyle: "italic", marginBottom: 12 }}>"{item.summary}"</p>}
          {item.strengths?.length > 0 && <div style={{ marginBottom: 8 }}><div style={{ ...S.label, marginBottom: 6 }}>✅ Strengths</div>{item.strengths.map(s => <span key={s} style={S.strengthTag}>{s}</span>)}</div>}
          {item.improvements?.length > 0 && <div style={{ marginBottom: 12 }}><div style={{ ...S.label, marginBottom: 6 }}>💡 Improvements</div>{item.improvements.map(s => <span key={s} style={S.improveTag}>{s}</span>)}</div>}
          <button style={S.btnDanger} onClick={() => onDelete(item.id)}>🗑 Delete session</button>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
function DashboardScreen({ history, onClearAll, onBack }) {
  const [localHistory, setLocalHistory] = useState(history);
  const streak = calcStreak(localHistory);
  const avgScore = localHistory.length ? (localHistory.reduce((a, b) => a + (b.score || 0), 0) / localHistory.length).toFixed(1) : "—";
  const best = localHistory.length ? Math.max(...localHistory.map(h => h.score || 0)) : "—";
  const totalFiller = localHistory.reduce((a, b) => a + Object.values(b.fillers || {}).reduce((x, y) => x + y, 0), 0);
  const recentScores = localHistory.slice(-10).map(h => h.score || 0);
  const byQuestion = {};
  localHistory.forEach(h => {
    if (!byQuestion[h.question]) byQuestion[h.question] = [];
    byQuestion[h.question].push(h.score);
  });

  const handleDelete = (id) => {
    const updated = localHistory.filter(h => h.id !== id);
    setLocalHistory(updated);
    saveHistory(updated);
  };

  return (
    <div style={S.app}>
      <GlobalStyles />
      <div style={S.glow} />
      <div style={S.container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button style={{ ...S.btnSecondary, padding: "8px 16px", fontSize: 14 }} onClick={onBack}>← Back</button>
          <div style={S.badge}>📊 Progress Dashboard</div>
          {localHistory.length > 0 && <button style={S.btnDanger} onClick={onClearAll}>Clear All</button>}
        </div>

        {localHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
            <p style={{ color: "#8899bb", fontSize: 18 }}>No sessions yet. Start practicing!</p>
            <button style={{ ...S.btnPrimary, marginTop: 24 }} onClick={onBack}>Start Practice →</button>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { icon: "🔥", label: "Streak", value: `${streak}d`, color: "#ffa500" },
                { icon: "📝", label: "Sessions", value: localHistory.length, color: "#00d4aa" },
                { icon: "⭐", label: "Avg Score", value: avgScore, color: "#7c6dfa" },
                { icon: "🏆", label: "Best", value: best, color: "#00b8d9" },
                { icon: "🚫", label: "Fillers", value: totalFiller, color: totalFiller > 10 ? "#ff4757" : "#00d4aa" },
              ].map(stat => (
                <div key={stat.label} style={{ ...S.card, textAlign: "center", padding: 20, marginBottom: 0 }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{stat.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: "#8899bb", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Score Trend */}
            <div style={{ ...S.card, marginBottom: 20 }}>
              <div style={S.label}>Score Trend (last {recentScores.length} sessions)</div>
              <div style={{ marginTop: 12, paddingBottom: 8 }}>
                <Sparkline data={recentScores} width={Math.min(600, recentScores.length * 60)} height={70} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#8899bb" }}>Oldest →</span>
                <span style={{ fontSize: 11, color: "#8899bb" }}>← Latest</span>
              </div>
            </div>

            {/* Score by Question */}
            <div style={{ ...S.card, marginBottom: 20 }}>
              <div style={S.label}>Avg Score by Question</div>
              {Object.entries(byQuestion).map(([q, scores]) => {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                return (
                  <div key={q} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: "#c8d4e8", maxWidth: "80%", lineHeight: 1.4 }}>{q}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: scoreColor(avg), marginLeft: 8 }}>{avg.toFixed(1)}</span>
                    </div>
                    <div style={{ height: 5, background: "#1e2535", borderRadius: 3 }}>
                      <div style={{ height: "100%", borderRadius: 3, background: scoreColor(avg), width: `${(avg/10)*100}%`, transition: "width 0.8s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#8899bb", marginTop: 3 }}>{scores.length} attempt{scores.length !== 1 ? "s" : ""}</div>
                  </div>
                );
              })}
            </div>

            {/* Session History List */}
            <div style={S.label}>All Sessions ({localHistory.length} total) — click to expand</div>
            {[...localHistory].reverse().map((item, i) => (
              <HistoryCard key={item.id} item={item} index={localHistory.length - 1 - i} onDelete={handleDelete} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function VoiceInterviewCoach() {
  const [screen, setScreen] = useState("home");
  const [currentQ, setCurrentQ] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [timer, setTimer] = useState(0);
  const [history, setHistory] = useState(loadHistory);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) setSupported(false);
  }, []);

  useEffect(() => {
    if (isRecording) { timerRef.current = setInterval(() => setTimer(t => t + 1), 1000); }
    else { clearInterval(timerRef.current); setTimer(0); }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let finalText = "";
    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
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

  const stopRecording = () => { recognitionRef.current?.stop(); setIsRecording(false); setInterimText(""); };

  const analyzeAnswer = async () => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);
    setScreen("feedback");
    const result = await getAIFeedback(INTERVIEW_QUESTIONS[currentQ], transcript);
    const fillers = countFillerWords(transcript);
    const words = wordCount(transcript);
    const entry = {
      id: Date.now(), date: new Date().toISOString(),
      question: INTERVIEW_QUESTIONS[currentQ], answer: transcript,
      score: result?.score ?? 0, relevance: result?.relevance ?? 0,
      clarity: result?.clarity ?? 0, confidence: result?.confidence ?? 0,
      strengths: result?.strengths ?? [], improvements: result?.improvements ?? [],
      betterAnswer: result?.betterAnswer ?? "", summary: result?.summary ?? "",
      fillers, words,
    };
    const updated = [...history, entry];
    setHistory(updated);
    saveHistory(updated);
    setFeedback(entry);
    setIsAnalyzing(false);
  };

  const nextQuestion = () => { setFeedback(null); setTranscript(""); setCurrentQ(q => (q+1) % INTERVIEW_QUESTIONS.length); setScreen("interview"); };
  const clearHistory = () => { setHistory([]); saveHistory([]); setScreen("home"); };

  const streak = calcStreak(history);
  const avgScore = history.length ? (history.reduce((a, b) => a + (b.score || 0), 0) / history.length).toFixed(1) : null;

  // Dashboard
  if (screen === "dashboard") return <DashboardScreen history={history} onClearAll={clearHistory} onBack={() => setScreen("home")} />;

  // Home
  if (screen === "home") return (
    <div style={S.app}>
      <GlobalStyles />
      <div style={S.glow} />
      <div style={S.container}>
        <div style={{ animation: "fadeUp 0.6s ease forwards" }}>
          <div style={S.badge}>🎙 AI-Powered · Free · No signup</div>
          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 800, lineHeight: 1.1, margin: "20px 0 16px", fontFamily: "'DM Serif Display', serif", background: "linear-gradient(135deg, #e8edf8 0%, #00d4aa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Ace Your Next<br />Interview
          </h1>
          <p style={{ color: "#8899bb", fontSize: 17, lineHeight: 1.6, maxWidth: 480, margin: "0 0 32px" }}>
            Practice answering real interview questions out loud. Get instant AI feedback on your clarity, confidence, and content — completely free.
          </p>

          {!supported && (
            <div style={{ ...S.card, borderColor: "rgba(255,71,87,0.3)", background: "rgba(255,71,87,0.05)", marginBottom: 24 }}>
              ⚠️ Your browser doesn't support voice recognition. Please use Chrome or Edge.
            </div>
          )}

          {/* Live Stats Bar */}
          {history.length > 0 && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              {[
                { icon: "🔥", label: "Day Streak", value: streak },
                { icon: "📝", label: "Sessions", value: history.length },
                { icon: "⭐", label: "Avg Score", value: avgScore },
              ].map(s => (
                <div key={s.label} style={{ ...S.card, padding: "14px 20px", marginBottom: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "#00d4aa" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "#8899bb", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
            <button style={S.btnPrimary} onClick={() => setScreen("interview")}>Start Practice →</button>
            <button style={S.btnSecondary} onClick={() => setScreen("dashboard")}>
              📊 Dashboard {history.length > 0 && `(${history.length} sessions)`}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { icon: "🎙", title: "Voice Recognition", desc: "Speak naturally, we transcribe in real-time" },
              { icon: "🤖", title: "AI Feedback", desc: "Powered by Llama 3 via Groq (free)" },
              { icon: "📊", title: "Score Breakdown", desc: "Clarity, relevance & confidence scores" },
              { icon: "📈", title: "Progress Tracking", desc: "History, streaks & score trends saved locally" },
            ].map(f => (
              <div key={f.title} style={S.card}>
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

  // Interview
  if (screen === "interview") return (
    <div style={S.app}>
      <GlobalStyles />
      <div style={S.glow} />
      <div style={S.container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button style={{ ...S.btnSecondary, padding: "8px 16px", fontSize: 14 }} onClick={() => setScreen("home")}>← Back</button>
          <div style={S.badge}>Question {currentQ + 1} of {INTERVIEW_QUESTIONS.length}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", color: isRecording ? "#ff4757" : "#8899bb", fontSize: 18 }}>
            {isRecording ? `⏺ ${formatTime(timer)}` : formatTime(timer)}
          </div>
        </div>

        <div style={{ height: 3, background: "#1e2535", borderRadius: 2, marginBottom: 32 }}>
          <div style={{ height: "100%", borderRadius: 2, background: "#00d4aa", width: `${((currentQ+1)/INTERVIEW_QUESTIONS.length)*100}%`, transition: "width 0.5s ease" }} />
        </div>

        <div style={{ ...S.card, borderColor: "rgba(0,212,170,0.2)", marginBottom: 24 }}>
          <div style={S.label}>Your Question</div>
          <p style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)", fontFamily: "'DM Serif Display', serif", lineHeight: 1.5 }}>
            {INTERVIEW_QUESTIONS[currentQ]}
          </p>
        </div>

        <div style={{ ...S.card, textAlign: "center" }}>
          <WaveformBars isRecording={isRecording} />
          <div style={{ margin: "20px 0" }}>
            <button style={{ width: 80, height: 80, borderRadius: "50%", border: isRecording ? "2px solid #ff4757" : "2px solid #00d4aa", background: isRecording ? "rgba(255,71,87,0.15)" : "rgba(0,212,170,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, transition: "all 0.3s ease", animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none", margin: "0 auto" }}
              onClick={isRecording ? stopRecording : startRecording} disabled={!supported}>
              {isRecording ? "⏹" : "🎙"}
            </button>
          </div>
          <p style={{ color: "#8899bb", fontSize: 14 }}>{isRecording ? "Recording... click to stop" : "Click to start recording your answer"}</p>
        </div>

        {(transcript || interimText) && (
          <div style={{ ...S.card, marginTop: 16, animation: "fadeUp 0.4s ease" }}>
            <div style={S.label}>Live Transcript</div>
            <p style={{ lineHeight: 1.7, color: "#c8d4e8" }}>
              {transcript}
              {interimText && <span style={{ color: "#8899bb" }}>{interimText}</span>}
            </p>
            <span style={{ color: "#8899bb", fontSize: 13, marginTop: 8, display: "block" }}>{wordCount(transcript)} words</span>
          </div>
        )}

        {transcript && !isRecording && (
          <div style={{ marginTop: 16, textAlign: "center", animation: "fadeUp 0.4s ease" }}>
            <button style={S.btnPrimary} onClick={analyzeAnswer}>Analyze My Answer →</button>
          </div>
        )}
      </div>
    </div>
  );

  // Feedback
  if (screen === "feedback") return (
    <div style={S.app}>
      <GlobalStyles />
      <div style={S.glow} />
      <div style={S.container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button style={{ ...S.btnSecondary, padding: "8px 16px", fontSize: 14 }} onClick={() => setScreen("home")}>← Home</button>
          <div style={S.badge}>📊 AI Analysis</div>
          <button style={{ ...S.btnSecondary, padding: "8px 16px", fontSize: 14 }} onClick={() => setScreen("dashboard")}>📈 Dashboard</button>
        </div>

        {isAnalyzing ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🤖</div>
            <p style={{ color: "#8899bb", fontSize: 18 }}>Analyzing your answer with Llama 3...</p>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 8 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4aa", animation: `wave ${0.5+i*0.15}s ease-in-out infinite alternate` }} />)}
            </div>
          </div>
        ) : feedback ? (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            <div style={{ ...S.card, borderColor: "rgba(0,212,170,0.2)", marginBottom: 16 }}>
              <div style={S.label}>Overall Assessment</div>
              <p style={{ fontSize: 17, lineHeight: 1.6, color: "#c8d4e8" }}>{feedback.summary}</p>
            </div>

            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={S.label}>Scores</div>
              <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
                <ScoreRing score={feedback.score} label="Overall" color="#00d4aa" />
                <ScoreRing score={feedback.relevance} label="Relevance" color="#7c6dfa" />
                <ScoreRing score={feedback.clarity} label="Clarity" color="#00b8d9" />
                <ScoreRing score={feedback.confidence} label="Confidence" color="#ffa500" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={S.card}>
                <div style={S.label}>Word Count</div>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "#00d4aa" }}>{feedback.words}</div>
                <div style={{ color: "#8899bb", fontSize: 13, marginTop: 4 }}>{feedback.words < 50 ? "Too short — aim for 80-150 words" : feedback.words > 200 ? "A bit long — be more concise" : "Good length ✓"}</div>
              </div>
              <div style={S.card}>
                <div style={S.label}>Filler Words</div>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: Object.values(feedback.fillers).reduce((a,b)=>a+b,0) > 3 ? "#ff4757" : "#00d4aa" }}>
                  {Object.values(feedback.fillers).reduce((a,b)=>a+b,0)}
                </div>
                <div style={{ marginTop: 6 }}>{Object.entries(feedback.fillers).map(([w,c]) => <span key={w} style={S.fillerTag}>"{w}" ×{c}</span>)}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={S.card}>
                <div style={S.label}>✅ Strengths</div>
                <div style={{ marginTop: 8 }}>{feedback.strengths?.map(s => <div key={s} style={S.strengthTag}>{s}</div>)}</div>
              </div>
              <div style={S.card}>
                <div style={S.label}>💡 Improve</div>
                <div style={{ marginTop: 8 }}>{feedback.improvements?.map(s => <div key={s} style={S.improveTag}>{s}</div>)}</div>
              </div>
            </div>

            <div style={{ ...S.card, borderColor: "rgba(124,109,250,0.25)", marginBottom: 16 }}>
              <div style={S.label}>✨ Suggested Better Answer</div>
              <p style={{ lineHeight: 1.7, color: "#c8d4e8", fontStyle: "italic", marginTop: 8 }}>"{feedback.betterAnswer}"</p>
            </div>

            {/* Progress Nudge */}
            <div style={{ ...S.card, borderColor: "rgba(0,212,170,0.15)", marginBottom: 24, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 36 }}>{streak > 1 ? "🔥" : "📈"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{streak > 1 ? `${streak}-day streak! Keep going!` : `Session #${history.length} complete!`}</div>
                <div style={{ color: "#8899bb", fontSize: 13 }}>Your avg score: <strong style={{ color: "#00d4aa" }}>{avgScore}</strong> across {history.length} session{history.length !== 1 ? "s" : ""}</div>
              </div>
              <button style={{ ...S.btnSecondary, padding: "8px 14px", fontSize: 13 }} onClick={() => setScreen("dashboard")}>View Progress →</button>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button style={S.btnPrimary} onClick={nextQuestion}>Next Question →</button>
              <button style={S.btnSecondary} onClick={() => { setFeedback(null); setTranscript(""); setScreen("interview"); }}>Try Again</button>
            </div>
          </div>
        ) : (
          <p style={{ color: "#8899bb" }}>Something went wrong. Please check your Groq API key.</p>
        )}
      </div>
    </div>
  );
}