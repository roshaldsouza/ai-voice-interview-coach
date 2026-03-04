<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>AI Voice Interview Coach — README</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap');

  :root {
    --green: #39ff14;
    --green-dim: #1a7a0a;
    --green-mid: #22c40a;
    --white: #f0fff0;
    --bg: #020a02;
    --bg2: #050f05;
    --scanline: rgba(0,0,0,0.35);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--green);
    font-family: 'Share Tech Mono', monospace;
    padding: 48px 24px;
    max-width: 820px;
    margin: 0 auto;
    line-height: 1.7;
    position: relative;
    overflow-x: hidden;
  }

  /* ── CRT scanlines overlay ── */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      var(--scanline) 0px,
      var(--scanline) 1px,
      transparent 1px,
      transparent 4px
    );
    pointer-events: none;
    z-index: 100;
  }

  /* ── CRT flicker vignette ── */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%);
    pointer-events: none;
    z-index: 99;
  }

  /* ── Animations ── */
  @keyframes blink    { 0%,100%{opacity:1} 49%{opacity:1} 50%{opacity:0} 99%{opacity:0} }
  @keyframes wave     { from{transform:scaleY(0.15)} to{transform:scaleY(1)} }
  @keyframes flicker  { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.8} 94%{opacity:1} 96%{opacity:0.9} 97%{opacity:1} }
  @keyframes scandown { 0%{top:-10%} 100%{top:110%} }
  @keyframes glow     { 0%,100%{text-shadow:0 0 8px var(--green),0 0 16px var(--green-dim)} 50%{text-shadow:0 0 4px var(--green)} }
  @keyframes fillring { from{stroke-dashoffset:144.5} }
  @keyframes typeIn   { from{width:0} to{width:100%} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes scroll-line {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  /* ── Scan beam ── */
  .scan-beam {
    position: fixed;
    left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(57,255,20,0.15), transparent);
    animation: scandown 5s linear infinite;
    pointer-events: none;
    z-index: 101;
  }

  /* ── Typography ── */
  h1 {
    font-family: 'VT323', monospace;
    font-size: 3.2rem;
    color: var(--white);
    text-shadow: 0 0 20px var(--green), 0 0 40px var(--green-dim);
    letter-spacing: 0.04em;
    margin-bottom: 4px;
    animation: flicker 8s infinite, glow 3s ease-in-out infinite;
  }

  .tagline {
    color: var(--green-mid);
    font-size: 13px;
    margin-bottom: 24px;
    letter-spacing: 0.05em;
  }

  /* ── Badges ── */
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 40px; }
  .badge {
    font-size: 11px; padding: 3px 10px;
    border: 1px solid var(--green-dim);
    background: rgba(57,255,20,0.04);
    color: var(--green-mid);
    letter-spacing: 0.05em;
  }
  .badge.white { color: var(--white); border-color: rgba(240,255,240,0.3); background: rgba(240,255,240,0.04); }

  /* ── Section header ── */
  .sh {
    display: flex; align-items: center; gap: 10px;
    margin: 44px 0 16px;
  }
  .sh-num {
    font-family: 'VT323', monospace;
    font-size: 1.3rem;
    color: var(--white);
    text-shadow: 0 0 10px var(--green);
    background: rgba(57,255,20,0.08);
    border: 1px solid var(--green-dim);
    padding: 0 10px;
    line-height: 1.6;
  }
  .sh-title {
    font-family: 'VT323', monospace;
    font-size: 1.3rem;
    color: var(--white);
    text-shadow: 0 0 10px var(--green);
    letter-spacing: 0.05em;
  }
  .sh-line { flex: 1; height: 1px; background: var(--green-dim); }

  /* ── Box (card) ── */
  .box {
    background: var(--bg2);
    border: 1px solid var(--green-dim);
    padding: 18px;
    margin-bottom: 12px;
    position: relative;
  }
  .box::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--green-mid), transparent);
  }

  /* ── Terminal bar ── */
  .term-bar {
    background: rgba(57,255,20,0.06);
    border-bottom: 1px solid var(--green-dim);
    padding: 6px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--green-mid);
    letter-spacing: 0.08em;
  }
  .term-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green-dim); }
  .term-dot.active { background: var(--green); box-shadow: 0 0 6px var(--green); }

  .code {
    padding: 16px 18px;
    font-size: 13px;
    line-height: 1.9;
  }
  .cg  { color: var(--green); }
  .cw  { color: var(--white); }
  .cdim{ color: var(--green-dim); }
  .cm  { color: var(--green-mid); }
  .cy  { color: #ccff99; }

  /* ── Prompt line ── */
  .prompt-line { display: flex; gap: 8px; align-items: flex-start; }
  .ps { color: var(--green); flex-shrink: 0; }
  .pc { color: var(--white); }
  .pa { color: #ccff99; }

  /* ── Mic demo ── */
  .mic-demo {
    display: flex; align-items: center; gap: 20px;
  }
  .mic-btn {
    width: 54px; height: 54px;
    border: 2px solid var(--green);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; flex-shrink: 0;
    box-shadow: 0 0 12px var(--green-dim), inset 0 0 8px rgba(57,255,20,0.05);
    color: var(--green);
  }
  .waveform { display: flex; align-items: center; gap: 3px; height: 32px; }
  .wb {
    width: 3px;
    background: var(--green);
    box-shadow: 0 0 4px var(--green);
    animation: wave 0.4s ease-in-out infinite alternate;
  }
  .transcript {
    flex: 1;
    font-size: 12px;
    color: var(--green-mid);
    line-height: 1.7;
    border-left: 1px solid var(--green-dim);
    padding-left: 14px;
  }
  .live { color: var(--white); }
  .cursor { animation: blink 1s step-end infinite; color: var(--green); }

  /* ── Rings ── */
  .rings-row {
    display: flex; gap: 24px; align-items: center;
    flex-wrap: wrap;
  }
  .ring-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .ring-lbl { font-size: 10px; color: var(--green-dim); text-transform: uppercase; letter-spacing: 0.1em; }

  /* ── Features ── */
  .features { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .feat {
    background: var(--bg2);
    border: 1px solid var(--green-dim);
    padding: 11px 14px;
    font-size: 12px;
    display: flex; gap: 10px; align-items: flex-start;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .feat:hover {
    border-color: var(--green);
    box-shadow: 0 0 8px rgba(57,255,20,0.15);
  }
  .feat-icon { flex-shrink: 0; }
  .feat strong { display: block; color: var(--white); margin-bottom: 1px; }
  .feat span   { color: var(--green-mid); }

  /* ── Pills ── */
  .pills { display: flex; flex-wrap: wrap; gap: 8px; }
  .pill {
    border: 1px solid var(--green-dim);
    background: rgba(57,255,20,0.04);
    padding: 5px 12px;
    font-size: 12px;
    color: var(--green-mid);
    letter-spacing: 0.04em;
    transition: all 0.2s;
  }
  .pill:hover { border-color: var(--green); color: var(--white); box-shadow: 0 0 6px rgba(57,255,20,0.2); }

  /* ── Roadmap ── */
  .roadmap { display: flex; flex-direction: column; gap: 4px; }
  .rm { font-size: 12px; padding: 7px 12px; letter-spacing: 0.03em; }
  .rm.done { color: var(--green); background: rgba(57,255,20,0.04); border-left: 2px solid var(--green); }
  .rm.todo { color: var(--green-dim); border-left: 2px solid var(--green-dim); }

  /* ── Ticker ── */
  .ticker-wrap { overflow: hidden; border-top: 1px solid var(--green-dim); border-bottom: 1px solid var(--green-dim); padding: 8px 0; margin: 32px 0; }
  .ticker { display: flex; gap: 40px; white-space: nowrap; animation: scroll-line 18s linear infinite; }
  .ticker span { font-size: 11px; color: var(--green-dim); letter-spacing: 0.1em; flex-shrink: 0; }
  .ticker span b { color: var(--green); }

  hr { border: none; border-top: 1px solid var(--green-dim); margin: 40px 0; }

  footer { font-size: 12px; color: var(--green-dim); text-align: center; letter-spacing: 0.05em; }
  footer a { color: var(--green); text-decoration: none; }
  footer a:hover { text-shadow: 0 0 8px var(--green); }

  @media(max-width:560px){
    .features { grid-template-columns: 1fr; }
    .mic-demo { flex-direction: column; }
    .transcript { border-left: none; border-top: 1px solid var(--green-dim); padding-left: 0; padding-top: 10px; }
  }
</style>
</head>
<body>

<div class="scan-beam"></div>

<!-- Header -->
<h1>🎙 AI VOICE INTERVIEW COACH</h1>
<p class="tagline">// practice interview questions out loud · get instant ai feedback · track your progress</p>

<div class="badges">
  <span class="badge white">⚛ REACT 18</span>
  <span class="badge white">🤖 GROQ + LLAMA 3</span>
  <span class="badge">✓ $0 FREE</span>
  <span class="badge">🎙 WEB SPEECH API</span>
</div>

<!-- Ticker -->
<div class="ticker-wrap">
  <div class="ticker">
    <span>🎙 VOICE RECORDING</span>
    <span>🤖 <b>LLAMA 3</b> AI FEEDBACK</span>
    <span>📊 SCORE RINGS</span>
    <span>🔥 STREAK TRACKER</span>
    <span>📈 PROGRESS DASHBOARD</span>
    <span>📄 PDF EXPORT</span>
    <span>🎯 CUSTOM QUESTIONS</span>
    <span>⚡ <b>ZERO COST</b></span>
    <span>🎙 VOICE RECORDING</span>
    <span>🤖 <b>LLAMA 3</b> AI FEEDBACK</span>
    <span>📊 SCORE RINGS</span>
    <span>🔥 STREAK TRACKER</span>
    <span>📈 PROGRESS DASHBOARD</span>
    <span>📄 PDF EXPORT</span>
    <span>🎯 CUSTOM QUESTIONS</span>
    <span>⚡ <b>ZERO COST</b></span>
  </div>
</div>

<!-- 01 Recording -->
<div class="sh"><span class="sh-num">01</span><span class="sh-title">VOICE RECORDING + LIVE TRANSCRIPT</span><div class="sh-line"></div></div>

<div class="box">
  <div class="mic-demo">
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
      <div class="mic-btn">⏹</div>
      <div class="waveform">
        <div class="wb" style="height:10px;animation-delay:0s;animation-duration:0.35s"></div>
        <div class="wb" style="height:22px;animation-delay:0.05s;animation-duration:0.42s"></div>
        <div class="wb" style="height:14px;animation-delay:0.1s;animation-duration:0.5s"></div>
        <div class="wb" style="height:28px;animation-delay:0.15s;animation-duration:0.38s"></div>
        <div class="wb" style="height:8px;animation-delay:0.2s;animation-duration:0.44s"></div>
        <div class="wb" style="height:20px;animation-delay:0.25s;animation-duration:0.36s"></div>
        <div class="wb" style="height:16px;animation-delay:0.3s;animation-duration:0.52s"></div>
        <div class="wb" style="height:26px;animation-delay:0.35s;animation-duration:0.4s"></div>
      </div>
      <span style="font-size:11px;color:#ff5555;letter-spacing:0.1em;">⏺ REC 00:38</span>
    </div>
    <div class="transcript">
      <span class="live">I led a React dashboard optimization at my last
role. We had severe lag due to unnecessary re-renders
across 200+ components. Used React.memo and
react-window — reduced render time by </span><span style="color:var(--green);text-shadow:0 0 8px var(--green)">70%</span><span class="live">.</span><span class="cursor">█</span>
      <div style="margin-top:10px;font-size:11px;color:var(--green-dim);">// 87 words · 0 fillers detected · good length ✓</div>
    </div>
  </div>
</div>

<!-- 02 Groq -->
<div class="sh"><span class="sh-num">02</span><span class="sh-title">GROQ API CALL + RESPONSE</span><div class="sh-line"></div></div>

<div class="box" style="padding:0;">
  <div class="term-bar">
    <div class="term-dot"></div>
    <div class="term-dot"></div>
    <div class="term-dot active"></div>
    <span style="margin-left:6px;letter-spacing:0.08em;">getAIFeedback.js</span>
  </div>
  <div class="code">
<span class="cdim">// llama-3.3-70b via Groq — free tier, ~1s response</span>
<span class="cm">const</span> <span class="cw">res</span> = <span class="cm">await</span> <span class="cy">fetch</span>(<span class="cg">"https://api.groq.com/openai/v1/chat/completions"</span>, {
  <span class="cw">body:</span> <span class="cy">JSON.stringify</span>({ <span class="cw">model:</span> <span class="cg">"llama-3.3-70b-versatile"</span>, <span class="cw">messages</span> }),
});

<span class="cdim">// → structured JSON response</span>
{
  <span class="cg">score</span>:        <span class="cw">8</span>,   <span class="cg">relevance</span>:   <span class="cw">9</span>,
  <span class="cg">clarity</span>:      <span class="cw">7</span>,   <span class="cg">confidence</span>:  <span class="cw">8</span>,
  <span class="cg">strengths</span>:    [<span class="cy">"Quantified impact (70%)"</span>, <span class="cy">"Technical depth"</span>],
  <span class="cg">improvements</span>: [<span class="cy">"Add team context"</span>, <span class="cy">"Mention business impact"</span>],
  <span class="cg">betterAnswer</span>: <span class="cy">"I led a performance optimization that reduced..."</span>
}
  </div>
</div>

<!-- Rings -->
<div class="box">
  <div class="rings-row">
    <div class="ring-item">
      <svg width="62" height="62" viewBox="0 0 62 62">
        <circle cx="31" cy="31" r="23" fill="none" stroke="#1a3a0a" stroke-width="4"/>
        <circle cx="31" cy="31" r="23" fill="none" stroke="#39ff14" stroke-width="4"
          stroke-dasharray="144.5" stroke-dashoffset="28.9" stroke-linecap="square"
          transform="rotate(-90 31 31)" style="animation:fillring 1.2s ease forwards;filter:drop-shadow(0 0 4px #39ff14)"/>
        <text x="31" y="36" text-anchor="middle" fill="#f0fff0" font-size="14" font-weight="700" font-family="'Share Tech Mono',monospace">8</text>
      </svg>
      <span class="ring-lbl">Overall</span>
    </div>
    <div class="ring-item">
      <svg width="62" height="62" viewBox="0 0 62 62">
        <circle cx="31" cy="31" r="23" fill="none" stroke="#1a3a0a" stroke-width="4"/>
        <circle cx="31" cy="31" r="23" fill="none" stroke="#ccff99" stroke-width="4"
          stroke-dasharray="144.5" stroke-dashoffset="14.5" stroke-linecap="square"
          transform="rotate(-90 31 31)" style="animation:fillring 1.5s ease forwards;filter:drop-shadow(0 0 4px #ccff99)"/>
        <text x="31" y="36" text-anchor="middle" fill="#f0fff0" font-size="14" font-weight="700" font-family="'Share Tech Mono',monospace">9</text>
      </svg>
      <span class="ring-lbl">Relevance</span>
    </div>
    <div class="ring-item">
      <svg width="62" height="62" viewBox="0 0 62 62">
        <circle cx="31" cy="31" r="23" fill="none" stroke="#1a3a0a" stroke-width="4"/>
        <circle cx="31" cy="31" r="23" fill="none" stroke="#22c40a" stroke-width="4"
          stroke-dasharray="144.5" stroke-dashoffset="43.4" stroke-linecap="square"
          transform="rotate(-90 31 31)" style="animation:fillring 1.3s ease forwards;filter:drop-shadow(0 0 4px #22c40a)"/>
        <text x="31" y="36" text-anchor="middle" fill="#f0fff0" font-size="14" font-weight="700" font-family="'Share Tech Mono',monospace">7</text>
      </svg>
      <span class="ring-lbl">Clarity</span>
    </div>
    <div class="ring-item">
      <svg width="62" height="62" viewBox="0 0 62 62">
        <circle cx="31" cy="31" r="23" fill="none" stroke="#1a3a0a" stroke-width="4"/>
        <circle cx="31" cy="31" r="23" fill="none" stroke="#39ff14" stroke-width="4"
          stroke-dasharray="144.5" stroke-dashoffset="28.9" stroke-linecap="square"
          transform="rotate(-90 31 31)" style="animation:fillring 1.6s ease forwards;filter:drop-shadow(0 0 4px #39ff14)"/>
        <text x="31" y="36" text-anchor="middle" fill="#f0fff0" font-size="14" font-weight="700" font-family="'Share Tech Mono',monospace">8</text>
      </svg>
      <span class="ring-lbl">Confidence</span>
    </div>
    <div style="flex:1;border-left:1px solid var(--green-dim);padding-left:18px;font-size:12px;line-height:2.2;">
      <div style="color:var(--green)">✓ Quantified impact (70%)</div>
      <div style="color:var(--green)">✓ Specific technical depth</div>
      <div style="color:#ccff99">↑ Add team collaboration</div>
      <div style="color:#ccff99">↑ Mention business impact</div>
    </div>
  </div>
</div>

<!-- 03 Quick Start -->
<div class="sh"><span class="sh-num">03</span><span class="sh-title">QUICK START</span><div class="sh-line"></div></div>

<div class="box" style="padding:0;">
  <div class="term-bar">
    <div class="term-dot active"></div>
    <div class="term-dot"></div>
    <div class="term-dot"></div>
    <span style="margin-left:6px;">terminal</span>
  </div>
  <div class="code">
    <div class="prompt-line"><span class="ps">$</span><span class="pc">git clone </span><span class="pa">https://github.com/roshaldsouza/ai-voice-interview-coach</span></div>
    <div class="prompt-line"><span class="ps">$</span><span class="pc">npm install</span></div>
    <div style="height:8px"></div>
    <div class="cdim">// get free key → console.groq.com (no credit card)</div>
    <div class="prompt-line"><span class="ps">$</span><span class="pc">echo </span><span class="pa">"REACT_APP_GROQ_API_KEY=gsk_..."</span><span class="pc"> > .env</span></div>
    <div style="height:8px"></div>
    <div class="prompt-line"><span class="ps">$</span><span class="pc">npm start</span><span class="cdim">  // → localhost:3000  [chrome or edge]</span></div>
  </div>
</div>

<!-- 04 Features -->
<div class="sh"><span class="sh-num">04</span><span class="sh-title">FEATURES</span><div class="sh-line"></div></div>

<div class="features">
  <div class="feat"><span class="feat-icon">🎙</span><div><strong>Voice Recording</strong><span>Web Speech API, zero install</span></div></div>
  <div class="feat"><span class="feat-icon">🤖</span><div><strong>AI Scoring</strong><span>Llama 3 via Groq free tier</span></div></div>
  <div class="feat"><span class="feat-icon">🚫</span><div><strong>Filler Detection</strong><span>Tracks "um", "uh", "like"...</span></div></div>
  <div class="feat"><span class="feat-icon">📈</span><div><strong>Dashboard</strong><span>Streak, trends, history</span></div></div>
  <div class="feat"><span class="feat-icon">📄</span><div><strong>PDF Export</strong><span>Full session report</span></div></div>
  <div class="feat"><span class="feat-icon">🎯</span><div><strong>Question Sets</strong><span>Frontend · Behavioral · System Design · Custom</span></div></div>
</div>

<!-- 05 Stack -->
<div class="sh"><span class="sh-num">05</span><span class="sh-title">STACK</span><div class="sh-line"></div></div>

<div class="pills">
  <div class="pill">REACT 18</div>
  <div class="pill">GROQ API</div>
  <div class="pill">LLAMA 3.3-70B</div>
  <div class="pill">WEB SPEECH API</div>
  <div class="pill">JSPDF</div>
  <div class="pill">LOCALSTORAGE</div>
  <div class="pill">VERCEL</div>
</div>

<!-- 06 Roadmap -->
<div class="sh"><span class="sh-num">06</span><span class="sh-title">ROADMAP</span><div class="sh-line"></div></div>

<div class="roadmap">
  <div class="rm done">[x] Voice recording + live transcript</div>
  <div class="rm done">[x] Groq AI scoring — 4 dimensions</div>
  <div class="rm done">[x] Progress dashboard + streak tracker</div>
  <div class="rm done">[x] PDF export report</div>
  <div class="rm done">[x] Custom question sets builder</div>
</div>

<hr/>

<footer>
  built by <a href="https://github.com/roshaldsouza">roshaldsouza</a>
  &nbsp;·&nbsp; MIT
  &nbsp;·&nbsp; ⭐ if it helped you land a job
</footer>

</body>
</html>
