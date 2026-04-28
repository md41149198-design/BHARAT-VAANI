// ╔══════════════════════════════════════════════════════════════════╗
// ║  BharatVāṇī v7.0 — FINAL FIXED VERSION                         ║
// ║  ✅ VOICE LANG FIX  (user picks speaking language)              ║
// ║  ✅ HINDI vs MARATHI — improved disambiguation                  ║
// ║  ✅ TRANSLATION: user picks Hindi OR English                    ║
// ║  ✅ OUTPUT FORMAT: Text OR Voice (user choice)                  ║
// ║  ✅ ALL INPUTS: Text · Voice · Image for both tabs              ║
// ║  ✅ ZERO PAID API — UNLIMITED FREE                              ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  INSTALL:  npm install tesseract.js                             ║
// ║  RUN:      npm start                                            ║
// ╚══════════════════════════════════════════════════════════════════╝

import { useState, useRef, useEffect, useCallback } from "react";
import { createWorker } from "tesseract.js";

// ════════════════════════════════════════════════════════════════════
//  LANGUAGE DATABASE
// ════════════════════════════════════════════════════════════════════
const LANGS = {
  Hindi:     { native:"हिन्दी",    script:"Devanagari", color:"#FF6B35", mym:"hi", tts:"hi-IN",  sr:"hi-IN"  },
  Marathi:   { native:"मराठी",    script:"Devanagari", color:"#F4A261", mym:"mr", tts:"mr-IN",  sr:"mr-IN"  },
  Bengali:   { native:"বাংলা",    script:"Bengali",    color:"#2DC653", mym:"bn", tts:"bn-IN",  sr:"bn-IN"  },
  Tamil:     { native:"தமிழ்",   script:"Tamil",      color:"#E63946", mym:"ta", tts:"ta-IN",  sr:"ta-IN"  },
  Telugu:    { native:"తెలుగు",  script:"Telugu",     color:"#457B9D", mym:"te", tts:"te-IN",  sr:"te-IN"  },
  Gujarati:  { native:"ગુજરાતી", script:"Gujarati",   color:"#A8DADC", mym:"gu", tts:"gu-IN",  sr:"gu-IN"  },
  Kannada:   { native:"ಕನ್ನಡ",  script:"Kannada",    color:"#E9C46A", mym:"kn", tts:"kn-IN",  sr:"kn-IN"  },
  Malayalam: { native:"മലയാളം",  script:"Malayalam",  color:"#06D6A0", mym:"ml", tts:"ml-IN",  sr:"ml-IN"  },
  Punjabi:   { native:"ਪੰਜਾਬੀ",  script:"Gurmukhi",   color:"#FFB703", mym:"pa", tts:"pa-IN",  sr:"pa-IN"  },
  Odia:      { native:"ଓଡ଼ିଆ",   script:"Odia",       color:"#9B5DE5", mym:"or", tts:"or-IN",  sr:"or-IN"  },
  English:   { native:"English",  script:"Latin",      color:"#8ECAE6", mym:"en", tts:"en-US",  sr:"en-US"  },
  Unknown:   { native:"Unknown",  script:"—",          color:"#666680", mym:"en", tts:"en-US",  sr:"en-US"  },
};

// Voice recognition lang options (shown in mic selector)
const VOICE_SR_OPTIONS = [
  { label:"Auto (Hinglish/English)",  code:"en-IN",  detect:"auto"    },
  { label:"Hindi — हिन्दी",           code:"hi-IN",  detect:"Hindi"   },
  { label:"Marathi — मराठी",          code:"mr-IN",  detect:"Marathi" },
  { label:"Bengali — বাংলা",          code:"bn-IN",  detect:"Bengali" },
  { label:"Tamil — தமிழ்",           code:"ta-IN",  detect:"Tamil"   },
  { label:"Telugu — తెలుగు",         code:"te-IN",  detect:"Telugu"  },
  { label:"Gujarati — ગુજરાતી",      code:"gu-IN",  detect:"Gujarati"},
  { label:"Kannada — ಕನ್ನಡ",        code:"kn-IN",  detect:"Kannada" },
  { label:"Malayalam — മലയാളം",      code:"ml-IN",  detect:"Malayalam"},
  { label:"Punjabi — ਪੰਜਾਬੀ",        code:"pa-IN",  detect:"Punjabi" },
  { label:"English (US/UK)",          code:"en-US",  detect:"English" },
];

const PALETTE = Object.values(LANGS).map(l => l.color);

// ════════════════════════════════════════════════════════════════════
//  DETECTION ENGINE
// ════════════════════════════════════════════════════════════════════

// --- Native Script Unicode ranges ---
const NATIVE_SCRIPTS = [
  { lang:"Bengali",   re:/[\u0980-\u09FF]/g },
  { lang:"Punjabi",   re:/[\u0A00-\u0A7F]/g },
  { lang:"Gujarati",  re:/[\u0A80-\u0AFF]/g },
  { lang:"Odia",      re:/[\u0B00-\u0B7F]/g },
  { lang:"Tamil",     re:/[\u0B80-\u0BFF]/g },
  { lang:"Telugu",    re:/[\u0C00-\u0C7F]/g },
  { lang:"Kannada",   re:/[\u0C80-\u0CFF]/g },
  { lang:"Malayalam", re:/[\u0D00-\u0D7F]/g },
  { lang:"__Deva",    re:/[\u0900-\u097F]/g },
];

// --- Improved Hindi vs Marathi disambiguation ---
// Marathi: completely unique words not used in Hindi
const MARATHI_STRONG = [
  "आहे","आहेत","नाही","माझी","माझ्या","माझे","आपण","तुम्ही","आम्ही",
  "करतो","करते","करतात","येतो","येते","येतात","जातो","जाते","जातात",
  "म्हणजे","म्हणतो","म्हणाला","म्हणाली","सांगतो","सांगते",
  "महाराष्ट्र","मराठी","पुणे","नागपूर","कोल्हापूर","मुंबई",
  "त्याचा","त्याची","त्याचे","त्यांचा","त्यांची","त्यांचे",
  "आपला","आपली","आपले","आपलं","आपलं",
  "घेतो","घेते","घेतात","देतो","देते","देतात",
  "पाहतो","पाहते","पाहतात","ऐकतो","ऐकते",
  "बघतो","बघते","होतो","होते","होतात",
  "केला","केली","केले","गेला","गेली","गेले",
  "आला","आली","आले","दिला","दिली","दिले",
  "ला","ना","च","ची","चे","चा","चं",
  "असतो","असते","नसतो","नसते","राहतो","राहते",
];

const HINDI_STRONG = [
  "है","हैं","नहीं","मैं","मेरा","मेरी","मेरे","तुम","तुम्हारा","आपका","आपकी",
  "करता","करती","करते","करता है","करती है","जाता","जाती","जाते",
  "आता","आती","आते","देता","देती","देते","लेता","लेती","लेते",
  "था","थी","थे","होगा","होगी","होंगे","होना","करना","जाना",
  "दिल्ली","भारत","हिंदी","हिन्दी","उत्तर प्रदेश","बिहार","राजस्थान",
  "उसका","उसकी","उनका","उनकी","इसका","इसकी","इनका","इनकी",
  "हमारा","हमारी","हमारे","तुम्हारा","तुम्हारी","तुम्हारे",
  "मुझे","तुम्हें","उसे","उन्हें","हमें","आपको",
  "लेकिन","इसलिए","क्योंकि","जब","तब","अगर","तो",
  "कभी","कहीं","कुछ","कोई","सभी","हर","बहुत","थोड़ा","ज़्यादा",
  "बोला","बोली","कहा","कही","सुना","सुनी","देखा","देखी",
  "रहा","रही","रहे","गया","गई","गए","आया","आई","आए",
];

function resolveDevanagari(text) {
  let ms = 0, hs = 0;
  for (const w of MARATHI_STRONG) { if (text.includes(w)) ms += 4; }
  for (const w of HINDI_STRONG)   { if (text.includes(w)) hs += 4; }

  // Extra pattern-based scoring
  // Marathi verb endings: -तो, -ते, -तात are very common
  const marathiVerbEndings = (text.match(/[कजयर]तो|[कजयर]ते|[कजयर]तात/g) || []).length;
  ms += marathiVerbEndings * 3;

  // Hindi auxiliary: है/हैं/था/थी are very common
  const hindiAux = (text.match(/\bहै\b|\bहैं\b|\bथा\b|\bथी\b|\bथे\b/g) || []).length;
  hs += hindiAux * 3;

  // Marathi postpositions: ला, ना uniquely after nouns
  const marathiPost = (text.match(/\w+ला\b|\w+ना\b|\w+ची\b|\w+चे\b|\w+चा\b/g) || []).length;
  ms += marathiPost * 2;

  // Default to Hindi if tie (Hindi more common)
  return ms > hs ? "Marathi" : "Hindi";
}

function detectNativeScript(text) {
  const scores = NATIVE_SCRIPTS.map(d => ({
    lang: d.lang,
    score: (text.match(d.re) || []).join("").length,
  }));
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  if (!top || top.score === 0) return null;
  const total = scores.reduce((s, x) => s + x.score, 0);
  const conf  = Math.min(99, Math.round(top.score / total * 100));
  const lang  = top.lang === "__Deva" ? resolveDevanagari(text) : top.lang;
  return { lang, conf, method: "Native Script" };
}

// --- Roman Script keyword dictionaries ---
const ROMAN_DICTS = {
  Hindi:["namaste","namaskar","dhanyavaad","shukriya","haan","nahi","kya","hai","hain",
    "main","mujhe","mera","meri","mere","hum","hamara","tum","tumhara","aap","aapka",
    "woh","wo","yeh","ye","koi","kuch","bahut","thoda","zyada","accha","theek",
    "ghar","kaam","karo","kiya","jaana","aana","khana","subah","shaam","raat","aaj",
    "kal","abhi","phir","lekin","aur","toh","bharat","dilli","hindi","baat","samajh",
    "kyun","kahan","kaisa","milna","paani","zindagi","duniya","pyar","ishq","dost","yaar"],
  Marathi:["mi","tu","to","ti","aapan","amhi","tumhi","te","mala","tula","kay","kuthe",
    "keva","kasa","hoy","nahi","ahe","ahet","jaato","yeto","karto","namaskar",
    "dhanyavaad","maharashtra","marathi","mumbai","pune","ghar","ithe","tithe",
    "sagla","ekada","ata","mag","aplya","mhanje","sanga","bagha","ekta","dusra"],
  Bengali:["ami","tumi","apni","se","aamra","amar","tomar","ki","keno","kothay","valo",
    "bhalo","hya","na","ache","dhanyabad","namaskar","bangla","bangladesh","kolkata",
    "bari","ghor","din","rat","ebong","kintu","jekhane","shekhane"],
  Tamil:["naan","nee","avar","naam","enna","yaar","enge","vanakam","nandri","aamaa",
    "illai","sari","romba","konjam","nalla","tamil","tamilnadu","veedu","saapidu",
    "inniku","nethu","naalai","ippodhu","aana","pesu","kelvi","paaru"],
  Telugu:["nenu","meeru","atanu","naam","enti","enduku","ekkada","namaskaaram",
    "dhanyavaadamulu","avunu","kaadu","sare","chala","manci","telugu","andhra",
    "intiki","raa","tinandi","matladandi","naadu","ippudu","akada","ikada"],
  Marathi2:["mi","mala","amhi","tumhi","ahe","ahet","nahi","karto","jaato","yeto",
    "mhnje","sagla","ithe","tithe","aplya","namaskar","pune","maharashtra"],
  Gujarati:["hu","tame","te","ame","mane","tamane","shu","kyare","kyan","kem",
    "saru","haa","na","chhe","namaskar","dhanyavaad","gujarat","gujarati",
    "ahmedabad","surat","ghar","kaam","jao","aavo","khaao"],
  Kannada:["naanu","neevu","avaru","naavu","nanage","nimage","yenu","yaaru","yelli",
    "namaskara","dhanyavadagalu","hauda","illa","sari","tumba","olleya","kannada",
    "karnataka","bengaluru","mane","shaale","madiri","bareyiri"],
  Malayalam:["njan","ningal","avan","aval","nammal","enikku","enthu","aaru","evidey",
    "namaskaaram","nandi","athe","alla","valare","konchu","nalla","ente","ninte",
    "kerala","malayalam","veedu","palli","parayoo","nokoo"],
  Punjabi:["main","tusi","oh","assi","manu","tenu","ki","kyun","kithe","dasso",
    "sat sri akal","waheguru","dhanyavaad","punjab","punjabi","amritsar",
    "chandigarh","ghar","kam","haan","changa","theek","kha","pi"],
  Odia:["mu","aapana","se","ame","mora","kana","kahin","namaskara","dhanyavaada",
    "odisha","odia","bhubaneswar","ghara","bidyalaya","kama","jao"],
};

function detectRomanScript(text) {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, " ");
  const words = lower.split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return null;

  const scores = {};
  for (const [lang, kws] of Object.entries(ROMAN_DICTS)) {
    const realLang = lang === "Marathi2" ? "Marathi" : lang;
    let s = 0;
    for (const w of words) {
      if (kws.includes(w)) s += 3;
      else if (kws.some(k => k.length >= 4 && w.length >= 4 && k.startsWith(w.slice(0, 4)))) s += 1;
    }
    if (s > 0) scores[realLang] = (scores[realLang] || 0) + s;
  }

  if (Object.keys(scores).length === 0) return null;
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topLang, topScore] = sorted[0];
  if (topScore < 2) return null;
  const conf = Math.min(90, Math.round(topScore / (words.length * 3) * 100 + 35));
  return { lang: topLang, conf: Math.max(58, conf), method: "Roman Script" };
}

function isPureEnglish(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return false;
  const allIndian = Object.values(ROMAN_DICTS).flat();
  const hits = words.filter(w => allIndian.includes(w)).length;
  return hits / words.length < 0.15;
}

function detectChunk(text) {
  const t = text.trim();
  if (!t) return { lang: "Unknown", conf: 30, method: "None" };
  const native = detectNativeScript(t);
  if (native && native.conf >= 60) return native;
  if (/[a-zA-Z]/.test(t)) {
    const roman = detectRomanScript(t);
    if (roman) return roman;
    if (isPureEnglish(t)) return { lang: "English", conf: 85, method: "English Text" };
    return { lang: "Hindi", conf: 52, method: "Roman (Uncertain)" };
  }
  return native || { lang: "Unknown", conf: 30, method: "Unknown" };
}

const SEG_RE = /[\u0980-\u09FF]+|[\u0A00-\u0A7F]+|[\u0A80-\u0AFF]+|[\u0B00-\u0B7F]+|[\u0B80-\u0BFF]+|[\u0C00-\u0C7F]+|[\u0C80-\u0CFF]+|[\u0D00-\u0D7F]+|[\u0900-\u097F]+|[a-zA-Z][a-zA-Z\s'.,!?\-]{1,}/g;

function detectFull(text, forceLang = null) {
  if (!text?.trim()) return { segments: [], isMulti: false, summary: {}, primary: "Unknown" };

  // If voice gave us a forced language (from SR lang code), trust it more
  if (forceLang && forceLang !== "auto") {
    const meta = LANGS[forceLang] || LANGS.Unknown;
    const { conf, method } = detectChunk(text);
    return {
      segments: [{ text, lang: forceLang, conf: Math.max(conf, 88), method: method + " + Voice SR", meta }],
      isMulti: false,
      summary: { [forceLang]: 100 },
      primary: forceLang,
    };
  }

  const hasNative = /[\u0900-\u0D7F]/.test(text);

  if (!hasNative) {
    const { lang, conf, method } = detectChunk(text);
    const meta = LANGS[lang] || LANGS.Unknown;
    return {
      segments: [{ text, lang, conf, method, meta }],
      isMulti: false,
      summary: { [lang]: 100 },
      primary: lang,
    };
  }

  const raw = [...(text.match(SEG_RE) || [text])].map(s => s.trim()).filter(s => s.length > 1);
  if (raw.length === 0) return { segments: [{ text, lang: "Unknown", conf: 30, method: "None", meta: LANGS.Unknown }], isMulti: false, summary: { Unknown: 100 }, primary: "Unknown" };

  const segs = raw.map(chunk => {
    const { lang, conf, method } = detectChunk(chunk);
    return { text: chunk, lang, conf, method, meta: LANGS[lang] || LANGS.Unknown };
  });

  const merged = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && last.lang === s.lang) { last.text += " " + s.text; last.conf = Math.max(last.conf, s.conf); }
    else merged.push({ ...s });
  }

  const totalChars = merged.reduce((s, r) => s + r.text.length, 0);
  const summary = {};
  merged.forEach(r => { summary[r.lang] = (summary[r.lang] || 0) + Math.round(r.text.length / totalChars * 100); });

  return { segments: merged, isMulti: merged.length > 1, summary, primary: merged[0]?.lang || "Unknown" };
}

// ════════════════════════════════════════════════════════════════════
//  TRANSLATION — MyMemory Free API
// ════════════════════════════════════════════════════════════════════
async function translateTo(text, fromLang, toLang) {
  if (fromLang === toLang) return text;
  const from = LANGS[fromLang]?.mym || "en";
  const to   = LANGS[toLang]?.mym   || "en";
  try {
    const r    = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
    const data = await r.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) return data.responseData.translatedText;
    throw new Error(data.responseMessage || "API error");
  } catch (e) {
    if (from !== "en" && to !== "en") {
      const r1 = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|en`);
      const d1 = await r1.json();
      if (d1.responseStatus !== 200) throw new Error("Translation failed");
      const r2 = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(d1.responseData.translatedText)}&langpair=en|${to}`);
      const d2 = await r2.json();
      if (d2.responseStatus !== 200) throw new Error("Translation step 2 failed");
      return d2.responseData.translatedText;
    }
    throw e;
  }
}

// ════════════════════════════════════════════════════════════════════
//  IMAGE OCR — Tesseract.js (Local)
// ════════════════════════════════════════════════════════════════════
async function ocrImage(file, onProgress) {
  const worker = await createWorker(
    ["hin","ben","tam","tel","mar","guj","kan","mal","pan","ori","eng"], 1,
    { logger: m => m.status === "recognizing text" && onProgress(Math.round(m.progress * 100)) }
  );
  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();
  return text.trim();
}

// ════════════════════════════════════════════════════════════════════
//  TTS — Browser Built-in
// ════════════════════════════════════════════════════════════════════
function speakText(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANGS[lang]?.tts || "en-US";
  u.rate = 0.88;
  window.speechSynthesis.speak(u);
}

// ════════════════════════════════════════════════════════════════════
//  VOICE HOOK — Captures final + interim, uses correct SR lang
// ════════════════════════════════════════════════════════════════════
function useVoice({ srLang, onFinish, onError }) {
  const rRef      = useRef(null);
  const alive     = useRef(false);
  const finalRef  = useRef("");
  const intRef    = useRef("");
  const [active,   setActive]   = useState(false);
  const [liveText, setLiveText] = useState("");
  const [interim,  setInterim]  = useState("");

  const stopRec = useCallback(() => {
    alive.current = false;
    try { rRef.current?.stop(); } catch (_) {}
    setActive(false); setInterim(""); intRef.current = "";
  }, []);

  const startRec = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onError("Chrome browser use karein — voice recognition Chrome mein kaam karta hai."); return; }
    stopRec();
    finalRef.current = ""; intRef.current = "";
    setLiveText(""); setInterim("");

    const r = new SR();
    r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.lang = srLang; // ✅ Uses user-selected language code

    r.onstart  = () => { alive.current = true; setActive(true); };
    r.onresult = e => {
      let tmp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + " ";
        else tmp += e.results[i][0].transcript;
      }
      intRef.current = tmp;
      setLiveText(finalRef.current); setInterim(tmp);
    };
    r.onerror = e => {
      if (e.error === "aborted") return;
      const msgs = {
        "not-allowed": "Microphone allow karo — browser ke lock icon → Microphone → Allow karein",
        "no-speech":   "Awaaz nahi mili — thoda zor se bolein",
        "network":     "Internet check karein",
      };
      onError(msgs[e.error] || `Voice error: ${e.error}`); stopRec();
    };
    r.onend = () => {
      if (alive.current) { try { r.start(); } catch (_) { setActive(false); } } else setActive(false);
    };
    rRef.current = r;
    try { r.start(); } catch (e) { onError("Mic error: " + e.message); }
  }, [srLang, stopRec, onError]);

  // ✅ Captures BOTH final + interim
  const stopAndSubmit = useCallback(() => {
    alive.current = false;
    try { rRef.current?.stop(); } catch (_) {}
    setActive(false); setInterim("");
    const combined = (finalRef.current + " " + intRef.current).trim();
    intRef.current = "";
    if (combined.length > 0) setTimeout(() => onFinish(combined), 150);
    else onError("Kuch record nahi hua — thoda zor se bolein aur dobara try karein.");
  }, [onFinish, onError]);

  const resetRec = useCallback(() => {
    stopRec(); finalRef.current = ""; intRef.current = ""; setLiveText("");
  }, [stopRec]);

  useEffect(() => () => { alive.current = false; try { rRef.current?.stop(); } catch (_) {} }, []);
  return { active, liveText, interim, startRec, stopAndSubmit, resetRec };
}

// ════════════════════════════════════════════════════════════════════
//  UI ATOMS
// ════════════════════════════════════════════════════════════════════
const Card = ({ children, bc = "#FF6B35", p = 20, r = 18, style = {} }) => (
  <div style={{ background: "rgba(13,14,26,.9)", backdropFilter: "blur(20px)", border: `1px solid ${bc}28`, borderRadius: r, padding: p, boxShadow: `0 0 0 1px ${bc}0E, inset 0 1px 0 rgba(255,255,255,.04)`, ...style }}>
    {children}
  </div>
);
const CBar = ({ v, color, h = 4 }) => (
  <div style={{ height: h, borderRadius: 3, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
    <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${color}77,${color})`, width: `${Math.max(2, v)}%`, transition: "width 1.3s cubic-bezier(.16,1,.3,1)" }} />
  </div>
);
const ErrBox = ({ msg, onClose }) => (
  <div style={{ padding: "10px 14px", borderRadius: 11, margin: "10px 0", background: "rgba(230,57,70,.09)", border: "1px solid rgba(230,57,70,.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ color: "#FF7070", fontSize: 13 }}>⚠️ {msg}</span>
    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,.3)", cursor: "pointer", fontSize: 15 }}>✕</button>
  </div>
);
const Spinner = ({ color = "#FF6B35", label = "" }) => (
  <div style={{ textAlign: "center", padding: "28px 0" }}>
    <div style={{ width: 38, height: 38, borderRadius: "50%", border: `3px solid ${color}22`, borderTopColor: color, margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
    {label && <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", margin: 0 }}>{label}</p>}
  </div>
);

// ════════════════════════════════════════════════════════════════════
//  VOICE INPUT PANEL — with language selector
// ════════════════════════════════════════════════════════════════════
function VoiceInput({ onTextReady, onSrLangChange, submitLabel = "🔍 Detect" }) {
  const [srLangIdx, setSrLangIdx] = useState(0);
  const [voiceErr,  setVoiceErr]  = useState("");
  const [editText,  setEditText]  = useState("");
  const [showEdit,  setShowEdit]  = useState(false);

  const srOpt = VOICE_SR_OPTIONS[srLangIdx];

  const { active, liveText, interim, startRec, stopAndSubmit, resetRec } = useVoice({
    srLang: srOpt.code,
    onFinish: t => { setEditText(t); setShowEdit(true); },
    onError:  setVoiceErr,
  });

  const handleLangChange = (idx) => {
    setSrLangIdx(idx);
    if (onSrLangChange) onSrLangChange(VOICE_SR_OPTIONS[idx]);
    resetRec(); setShowEdit(false);
  };

  return (
    <div>
      {/* ✅ Speaking Language Selector */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,.3)", textTransform: "uppercase", marginBottom: 6 }}>
          Main Kis Bhasha Mein Bol Raha/Rahi Hoon
        </div>
        <select
          value={srLangIdx}
          onChange={e => handleLangChange(Number(e.target.value))}
          style={{ width: "100%", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, color: "rgba(255,255,255,.85)", fontFamily: "Georgia,serif", fontSize: 13, padding: "9px 12px", cursor: "pointer", outline: "none" }}
        >
          {VOICE_SR_OPTIONS.map((opt, i) => (
            <option key={i} value={i} style={{ background: "#0E0F1A" }}>{opt.label}</option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", marginTop: 5 }}>
          💡 Sahi bhasha chunne se detection bilkul accurate hogi
        </div>
      </div>

      {voiceErr && <ErrBox msg={voiceErr} onClose={() => setVoiceErr("")} />}

      <div style={{ textAlign: "center" }}>
        {/* Mic button */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }}>
          <button
            onClick={active ? stopAndSubmit : () => { setVoiceErr(""); setShowEdit(false); resetRec(); startRec(); }}
            style={{ width: 88, height: 88, borderRadius: "50%", border: "none", cursor: "pointer", background: active ? "rgba(230,57,70,.15)" : "rgba(255,107,53,.08)", outline: `2px solid ${active ? "#E63946" : "rgba(255,107,53,.4)"}`, outlineOffset: 3, fontSize: 32, transition: "all .3s", animation: active ? "recordPulse 1.8s ease infinite" : "none", boxShadow: active ? "0 0 32px rgba(230,57,70,.3)" : "0 0 20px rgba(255,107,53,.1)" }}>
            {active ? "⏹" : "🎙️"}
          </button>
          {active && (<div style={{ position: "absolute", top: -3, right: -3, width: 17, height: 17, borderRadius: "50%", background: "#E63946", animation: "pulse 1s infinite", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} /></div>)}
        </div>

        <div style={{ fontSize: 13, color: active ? "#E63946" : "rgba(255,255,255,.32)", marginBottom: 12 }}>
          {active ? "🔴 Recording… bolte rahein, phir ⏹ dabaein" : "🎙️ Click karo aur bolna shuru karo"}
        </div>

        {(liveText || interim) && (
          <div style={{ padding: "11px 14px", borderRadius: 11, textAlign: "left", marginBottom: 12, background: "rgba(255,107,53,.06)", border: "1px solid rgba(255,107,53,.2)" }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#FF6B35", textTransform: "uppercase", marginBottom: 5 }}>🔴 Live</div>
            <div style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,.88)", fontFamily: "serif" }}>
              {liveText}<span style={{ color: "rgba(255,255,255,.35)" }}>{interim}</span>
            </div>
          </div>
        )}

        {showEdit && !active && (
          <div style={{ textAlign: "left", padding: 14, borderRadius: 13, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>✅ Recording complete! Edit kar sakte ho:</div>
            <textarea rows={3} value={editText} onChange={e => setEditText(e.target.value)} autoFocus
              style={{ width: "100%", resize: "vertical", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,107,53,.4)", borderRadius: 10, color: "rgba(255,255,255,.88)", fontFamily: "Georgia,serif", fontSize: 15, padding: "10px 12px", outline: "none", lineHeight: 1.8 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
              <button className="pri-btn" onClick={() => { setShowEdit(false); onTextReady(editText.trim(), srOpt.detect); }} disabled={!editText.trim()}>
                {submitLabel}
              </button>
              <button className="sec-btn" onClick={() => { setShowEdit(false); resetRec(); }}>↩ Dobara</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  IMAGE INPUT PANEL
// ════════════════════════════════════════════════════════════════════
function ImageInput({ onExtracted, disabled }) {
  const [prev,    setPrev]    = useState(null);
  const [file,    setFile]    = useState(null);
  const [prog,    setProg]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const [drag,    setDrag]    = useState(false);
  const fileRef = useRef(null);

  const processFile = f => {
    if (!f?.type.startsWith("image/")) { setErr("Sirf image files (JPG, PNG, WEBP)"); return; }
    setFile(f); setErr("");
    const r = new FileReader(); r.onload = e => setPrev(e.target.result); r.readAsDataURL(f);
  };

  const runOcr = async () => {
    if (!file) return;
    setLoading(true); setProg(0); setErr("");
    try {
      const txt = await ocrImage(file, p => setProg(p));
      if (!txt.trim()) { setErr("Image mein text nahi mila — clear image use karein."); return; }
      onExtracted(txt);
    } catch (e) { setErr("OCR error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {err && <ErrBox msg={err} onClose={() => setErr("")} />}
      <div
        onClick={() => !loading && !disabled && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); processFile(e.dataTransfer.files[0]); }}
        style={{ border: `2px dashed ${drag ? "#FF6B35" : prev ? "rgba(255,107,53,.4)" : "rgba(255,255,255,.1)"}`, borderRadius: 13, padding: prev ? 12 : 26, textAlign: "center", cursor: (loading || disabled) ? "default" : "pointer", transition: "all .25s", background: drag ? "rgba(255,107,53,.06)" : "transparent", marginBottom: 12 }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
        {prev
          ? (<><img src={prev} alt="prev" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 9, objectFit: "contain" }} /><p style={{ margin: "7px 0 0", fontSize: 11, color: "rgba(255,255,255,.3)" }}>Click to change</p></>)
          : (<><div style={{ fontSize: 34, marginBottom: 9 }}>🖼️</div><p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.42)" }}>Image drag karo ya click karke upload karo</p><p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,.22)" }}>JPG · PNG · WEBP · Signboard · Book · Screenshot</p></>)
        }
      </div>
      {loading && (<div style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>Tesseract OCR…</span><span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,.3)" }}>{prog}%</span></div><CBar v={prog} color="#FF6B35" h={4} /></div>)}
      {prev && !loading && <button className="pri-btn" onClick={runOcr}>🔍 Extract Text</button>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  DETECTION RESULT
// ════════════════════════════════════════════════════════════════════
function DetectionResult({ result, onTranslate }) {
  const pm = LANGS[result.primary] || LANGS.Unknown;
  return (
    <div style={{ animation: "slideUp .5s cubic-bezier(.16,1,.3,1)" }}>
      <div style={{ borderRadius: 17, overflow: "hidden", marginBottom: 13, background: `linear-gradient(135deg,${pm.color}12,rgba(10,11,22,.96) 65%)`, border: `1px solid ${pm.color}40`, boxShadow: `0 0 38px ${pm.color}14` }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${pm.color},${pm.color}44)` }} />
        <div style={{ padding: "17px 21px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,.3)", textTransform: "uppercase", marginBottom: 4 }}>
                {result.isMulti ? `Multilingual — ${result.segments.length} Segments` : "Detected Language"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 3 }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: pm.color, fontFamily: "'Georgia',serif", letterSpacing: -1 }}>{result.primary}</span>
                <span style={{ fontSize: 19, color: "rgba(255,255,255,.4)", fontFamily: "serif" }}>{pm.native}</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 13 }}>{pm.script} Script</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)", alignSelf: "center" }}>Translate to:</span>
                <button onClick={() => onTranslate(result.segments.map(s => s.text).join(" "), result.primary, "Hindi")}
                  style={{ background: "rgba(255,107,53,.14)", border: "1px solid rgba(255,107,53,.35)", color: "#FF6B35", padding: "6px 14px", borderRadius: 18, cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700 }}>
                  🇮🇳 Hindi
                </button>
                <button onClick={() => onTranslate(result.segments.map(s => s.text).join(" "), result.primary, "English")}
                  style={{ background: "rgba(142,202,230,.12)", border: "1px solid rgba(142,202,230,.35)", color: "#8ECAE6", padding: "6px 14px", borderRadius: 18, cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700 }}>
                  🌐 English
                </button>
              </div>
            </div>
            {result.isMulti && <div style={{ padding: "6px 13px", borderRadius: 17, background: "rgba(255,107,53,.1)", border: "1px solid rgba(255,107,53,.3)", color: "#FF6B35", fontSize: 12, fontFamily: "monospace" }}>⚡ MULTILINGUAL</div>}
          </div>
          {Object.keys(result.summary).length > 1 && (
            <div style={{ marginTop: 14, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.07)" }}>
              {Object.entries(result.summary).map(([l, p], i) => {
                const m = LANGS[l] || LANGS.Unknown;
                return (
                  <div key={l} style={{ marginBottom: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: m.color }}>{l} — {m.native}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", fontFamily: "monospace" }}>{p}%</span>
                    </div>
                    <CBar v={p} color={m.color} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {result.segments.map((seg, i) => {
        const m = LANGS[seg.lang] || LANGS.Unknown;
        const cf = seg.conf >= 90 ? "#2DC653" : seg.conf >= 70 ? "#F7931E" : "#E63946";
        return (
          <div key={i} style={{ borderRadius: 12, overflow: "hidden", marginBottom: 9, background: `linear-gradient(135deg,${m.color}08,rgba(10,11,22,.92))`, border: `1px solid ${m.color}2E`, animation: "slideUp .4s ease both", animationDelay: `${i * 60}ms` }}>
            <div style={{ padding: "9px 13px", borderBottom: `1px solid ${m.color}18`, background: `${m.color}0C`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {result.segments.length > 1 && <div style={{ width: 20, height: 20, borderRadius: 5, background: `${m.color}20`, border: `1px solid ${m.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: m.color, fontWeight: 700 }}>{i + 1}</div>}
                <span style={{ fontSize: 15, fontWeight: 800, color: m.color, fontFamily: "'Georgia',serif" }}>{seg.lang}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.38)", fontFamily: "serif" }}>{m.native}</span>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ padding: "2px 8px", borderRadius: 7, fontSize: 10, background: `${cf}1E`, color: cf, border: `1px solid ${cf}40`, fontFamily: "monospace" }}>{seg.conf >= 90 ? "✓ High" : seg.conf >= 70 ? "~ Med" : "? Low"} {seg.conf}%</span>
                <span style={{ padding: "2px 8px", borderRadius: 7, fontSize: 10, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.36)", border: "1px solid rgba(255,255,255,.09)" }}>{seg.method}</span>
                <button onClick={() => onTranslate(seg.text, seg.lang, "Hindi")} style={{ background: "rgba(255,107,53,.1)", border: "1px solid rgba(255,107,53,.25)", color: "#FF6B35", padding: "2px 8px", borderRadius: 6, cursor: "pointer", fontSize: 10 }}>→ Hindi</button>
                <button onClick={() => onTranslate(seg.text, seg.lang, "English")} style={{ background: "rgba(142,202,230,.1)", border: "1px solid rgba(142,202,230,.25)", color: "#8ECAE6", padding: "2px 8px", borderRadius: 6, cursor: "pointer", fontSize: 10 }}>→ EN</button>
              </div>
            </div>
            <div style={{ padding: "11px 13px" }}>
              <div style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", marginBottom: 7 }}>
                <div style={{ fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,.26)", textTransform: "uppercase", marginBottom: 4 }}>Detected Text</div>
                <div style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,.86)", fontFamily: "serif" }}>{seg.text}</div>
              </div>
              <CBar v={seg.conf} color={m.color} h={3} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TRANSLATION RESULT — user-chosen target + output format
// ════════════════════════════════════════════════════════════════════
function TranslationResult({ data, outputFormat, onChangeFormat }) {
  const sm = LANGS[data.srcLang] || LANGS.Unknown;
  const tm = LANGS[data.tgtLang] || LANGS.Unknown;
  const [copied, setCopied] = useState(false);

  const handleSpeak = () => speakText(data.translated, data.tgtLang);
  const handleCopy  = () => {
    navigator.clipboard?.writeText(data.translated);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // Auto-speak if output format is voice
  useEffect(() => {
    if (outputFormat === "voice" && data.translated) handleSpeak();
  }, [data.translated, outputFormat]);

  return (
    <div style={{ animation: "slideUp .4s ease" }}>
      {/* Direction */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ padding: "5px 13px", borderRadius: 17, background: `${sm.color}18`, border: `1px solid ${sm.color}40`, color: sm.color, fontSize: 12 }}>{data.srcLang} · {sm.native}</span>
        <span style={{ color: "rgba(255,255,255,.3)", fontSize: 18 }}>→</span>
        <span style={{ padding: "5px 13px", borderRadius: 17, background: `${tm.color}18`, border: `1px solid ${tm.color}40`, color: tm.color, fontSize: 12 }}>{data.tgtLang} · {tm.native}</span>
        <span style={{ marginLeft: "auto", padding: "3px 9px", borderRadius: 11, background: "rgba(45,198,83,.1)", border: "1px solid rgba(45,198,83,.2)", color: "#2DC653", fontSize: 10, fontFamily: "monospace" }}>MyMemory Free</span>
      </div>

      {/* Original */}
      <div style={{ padding: "12px 15px", borderRadius: 11, marginBottom: 11, background: `${sm.color}0C`, border: `1px solid ${sm.color}22` }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: `${sm.color}88`, textTransform: "uppercase", marginBottom: 5 }}>Original · {data.srcLang}</div>
        <div style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,.85)", fontFamily: "serif" }}>{data.originalText}</div>
        <button onClick={() => speakText(data.originalText, data.srcLang)} style={{ marginTop: 8, background: "transparent", border: `1px solid ${sm.color}44`, borderRadius: 7, color: sm.color, cursor: "pointer", fontSize: 12, padding: "3px 10px" }}>🔊 Original Sunaao</button>
      </div>

      {/* Translation */}
      <div style={{ padding: "14px 15px", borderRadius: 11, background: `${tm.color}0C`, border: `1px solid ${tm.color}30` }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: `${tm.color}88`, textTransform: "uppercase", marginBottom: 5 }}>Translation · {data.tgtLang}</div>
        <div style={{ fontSize: 17, lineHeight: 1.9, color: "rgba(255,255,255,.92)", fontFamily: "serif", marginBottom: 12 }}>{data.translated}</div>

        {/* Output format toggle */}
        <div style={{ marginBottom: 11 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,.3)", textTransform: "uppercase", marginBottom: 7 }}>Output Format</div>
          <div style={{ display: "flex", gap: 7 }}>
            {[{ id: "text", icon: "📝", l: "Text" }, { id: "voice", icon: "🔊", l: "Voice" }].map(f => (
              <button key={f.id} onClick={() => onChangeFormat(f.id)}
                style={{ padding: "7px 16px", borderRadius: 18, border: `1px solid ${outputFormat === f.id ? tm.color : "rgba(255,255,255,.14)"}`, background: outputFormat === f.id ? `${tm.color}18` : "transparent", color: outputFormat === f.id ? tm.color : "rgba(255,255,255,.45)", cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 13, fontWeight: outputFormat === f.id ? 700 : 400 }}>
                {f.icon} {f.l}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleSpeak} style={{ background: `${tm.color}18`, border: `1px solid ${tm.color}44`, borderRadius: 8, color: tm.color, cursor: "pointer", fontSize: 13, padding: "6px 14px" }}>🔊 {data.tgtLang} Sunaao</button>
          {outputFormat === "text" && (
            <button onClick={handleCopy} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 8, color: "rgba(255,255,255,.55)", cursor: "pointer", fontSize: 13, padding: "6px 14px" }}>{copied ? "✅ Copied!" : "📋 Copy"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════════
export default function BharatVaani() {
  const [mainTab, setMainTab] = useState("detect");

  // Detection tab state
  const [dMethod,  setDMethod]  = useState("text");
  const [dText,    setDText]    = useState("");
  const [dResult,  setDResult]  = useState(null);
  const [dLoading, setDLoading] = useState(false);
  const [dTlRes,   setDTlRes]   = useState(null);
  const [dTlLoad,  setDTlLoad]  = useState(false);
  const [dOutFmt,  setDOutFmt]  = useState("text"); // text | voice
  const [dErr,     setDErr]     = useState("");

  // Translation tab state
  const [tMethod,  setTMethod]  = useState("text");
  const [tText,    setTText]    = useState("");
  const [tSrcLang, setTSrcLang] = useState("Hindi");
  const [tTgtLang, setTTgtLang] = useState("English");
  const [tOutFmt,  setTOutFmt]  = useState("text");
  const [tResult,  setTResult]  = useState(null);
  const [tLoading, setTLoading] = useState(false);
  const [tErr,     setTErr]     = useState("");

  const [pts] = useState(() => Array.from({ length: 18 }, (_, i) => ({ id:i, x:Math.random()*100, y:Math.random()*100, sz:Math.random()*2.5+1, dl:Math.random()*6, dr:Math.random()*9+8, c:PALETTE[i%PALETTE.length] })));

  // ── Detect ──
  const runDetect = useCallback((text, forceLang = null) => {
    if (!text?.trim()) { setDErr("Pehle kuch input do!"); return; }
    setDLoading(true); setDErr(""); setDResult(null); setDTlRes(null);
    setTimeout(() => { setDResult(detectFull(text, forceLang)); setDLoading(false); }, 80);
  }, []);

  // ── Translate (from detection result) ──
  const runDetectTranslate = useCallback(async (text, srcLang, tgtLang) => {
    if (srcLang === tgtLang) return;
    setDTlLoad(true); setDTlRes(null);
    try {
      const translated = await translateTo(text, srcLang, tgtLang);
      setDTlRes({ originalText: text, srcLang, tgtLang, translated });
    } catch (e) { setDErr("Translation error: " + e.message); }
    finally { setDTlLoad(false); }
  }, []);

  // ── Standalone Translation ──
  const runTranslate = useCallback(async (text, srcLang, tgtLang) => {
    if (!text?.trim()) { setTErr("Kuch input do!"); return; }
    if (srcLang === tgtLang) { setTErr("Source aur target language same hain!"); return; }
    setTLoading(true); setTErr(""); setTResult(null);
    try {
      const translated = await translateTo(text, srcLang, tgtLang);
      setTResult({ originalText: text, srcLang, tgtLang, translated });
    } catch (e) { setTErr("Translation error: " + e.message); }
    finally { setTLoading(false); }
  }, []);

  const SAMPLES = [
    "Namaste! Mera naam Raj hai. Hello! Tamil theriyuma?",
    "नमस्ते! Hello! నమస్కారం! வணக்கம்! ਸਤ ਸ੍ਰੀ ਅਕਾਲ!",
    "Aap kaise hain? I am fine. आमी ভালো আছি।",
    "ನಾನು ಕನ್ನಡ ಮಾತನಾಡುತ್ತೇನೆ। Main Hindi bhi jaanta hoon.",
  ];

  const allLangs = Object.keys(LANGS).filter(k => k !== "Unknown");

  return (
    <div style={{ minHeight: "100vh", background: "#090A14", fontFamily: "'Georgia','Times New Roman',serif", color: "rgba(255,255,255,.85)", position: "relative", overflow: "hidden" }}>

      {/* BG particles */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {pts.map(p => <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.sz, height: p.sz, borderRadius: "50%", background: p.c, opacity: .12, animation: `drift ${p.dr}s ease-in-out ${p.dl}s infinite alternate` }} />)}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 45% at 8% 8%,rgba(255,107,53,.08) 0%,transparent 65%),radial-gradient(ellipse 45% 38% at 92% 85%,rgba(45,198,83,.06) 0%,transparent 65%)" }} />
      </div>

      <style>{`
        * { box-sizing:border-box; }
        @keyframes drift { from{transform:translate(0,0)} to{transform:translate(7px,-18px) scale(1.14)} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.35);opacity:.4} }
        @keyframes slideUp { from{opacity:0;transform:translateY(15px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes recordPulse { 0%,100%{box-shadow:0 0 0 0 rgba(230,57,70,.5)} 70%{box-shadow:0 0 0 20px rgba(230,57,70,0)} }
        .tab-pill { background:transparent; border:1px solid rgba(255,255,255,.1); color:rgba(255,255,255,.4); padding:8px 19px; border-radius:23px; cursor:pointer; font-family:Georgia,serif; font-size:12px; transition:all .2s; }
        .tab-pill:hover { border-color:rgba(255,107,53,.4); color:rgba(255,255,255,.8); }
        .tab-pill.on { background:rgba(255,107,53,.14); border-color:#FF6B35; color:#FF6B35; font-weight:600; }
        .pri-btn { background:linear-gradient(135deg,#FF6B35,#F7931E); border:none; color:#fff; padding:10px 24px; border-radius:21px; cursor:pointer; font-family:Georgia,serif; font-size:14px; font-weight:700; transition:all .25s; }
        .pri-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 7px 22px rgba(255,107,53,.45); }
        .pri-btn:disabled { opacity:.4; cursor:not-allowed; }
        .sec-btn { background:transparent; border:1px solid rgba(255,255,255,.14); color:rgba(255,255,255,.45); padding:10px 15px; border-radius:21px; cursor:pointer; font-family:Georgia,serif; font-size:13px; transition:all .2s; }
        .sec-btn:hover { border-color:rgba(255,255,255,.3); color:rgba(255,255,255,.75); }
        textarea:focus, select:focus { border-color:rgba(255,107,53,.45) !important; box-shadow:0 0 0 3px rgba(255,107,53,.08) !important; outline:none !important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,107,53,.3); border-radius:2px; }
      `}</style>

      {/* Header */}
      <header style={{ position: "relative", zIndex: 10, borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(9,10,20,.96)", backdropFilter: "blur(20px)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#FF6B35,#E63946)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, boxShadow: "0 4px 14px rgba(255,107,53,.4)" }}>🪔</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: .5 }}>BharatVāṇī</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 2, textTransform: "uppercase" }}>Indian Language AI · v7.0</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ padding: "4px 11px", borderRadius: 11, background: "rgba(45,198,83,.1)", border: "1px solid rgba(45,198,83,.25)", color: "#2DC653", fontSize: 10, fontWeight: 700 }}>✅ 100% FREE</div>
          <div style={{ display: "flex", gap: 3 }}>
            {Object.entries(LANGS).filter(([k]) => k !== "Unknown" && k !== "English").map(([name, info]) => (
              <div key={name} style={{ width: 25, height: 25, borderRadius: 7, background: `${info.color}18`, border: `1px solid ${info.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: info.color, fontWeight: 700 }} title={name}>{info.native[0]}</div>
            ))}
          </div>
        </div>
      </header>

      {/* Main tabs */}
      <div style={{ position: "relative", zIndex: 5, background: "rgba(9,10,20,.78)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,.05)", padding: "0 28px" }}>
        <div style={{ display: "flex", maxWidth: 1020, margin: "0 auto" }}>
          {[{ id: "detect", label: "🔍 Language Detection" }, { id: "translate", label: "🌐 Translation" }].map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)} style={{ padding: "13px 22px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 14, transition: "all .2s", color: mainTab === t.id ? "#FF6B35" : "rgba(255,255,255,.38)", borderBottom: mainTab === t.id ? "2px solid #FF6B35" : "2px solid transparent", fontWeight: mainTab === t.id ? 700 : 400 }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1020, margin: "0 auto", padding: "22px 16px 60px" }}>

        {/* ══════ DETECTION TAB ══════ */}
        {mainTab === "detect" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
            {/* LEFT — Input */}
            <Card bc="#FF6B35">
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {[{ id: "text", icon: "✍️", l: "Text" }, { id: "voice", icon: "🎙️", l: "Voice" }, { id: "image", icon: "🖼️", l: "Image" }].map(t => (
                  <button key={t.id} className={`tab-pill ${dMethod === t.id ? "on" : ""}`} onClick={() => { setDMethod(t.id); setDResult(null); setDTlRes(null); setDErr(""); }}>{t.icon} {t.l}</button>
                ))}
              </div>

              {dMethod === "text" && (
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 8, lineHeight: 1.6 }}>
                    Native (हिन्दी, தமிழ்…) <strong style={{ color: "#FF6B35" }}>ya</strong> Roman (namaste, vanakam…) — dono kaam karenge
                  </div>
                  <textarea rows={7} value={dText} onChange={e => { setDText(e.target.value); setDResult(null); setDTlRes(null); }}
                    placeholder={"यहाँ हिन्दी लिखें…  OR  Namaste kya haal hai?\nবাংলায় লিখুন…   OR  Ami banglay boli.\nOr mix multiple languages!"}
                    style={{ width: "100%", resize: "vertical", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 11, color: "rgba(255,255,255,.86)", fontFamily: "Georgia,serif", fontSize: 15, padding: "11px 13px", outline: "none", lineHeight: 1.85 }}
                  />
                  {dErr && <ErrBox msg={dErr} onClose={() => setDErr("")} />}
                  <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
                    <button className="pri-btn" onClick={() => runDetect(dText)} disabled={!dText.trim() || dLoading}>{dLoading ? "⏳…" : "🔍 Detect"}</button>
                    <button className="sec-btn" onClick={() => { setDText(SAMPLES[Math.floor(Math.random() * SAMPLES.length)]); setDResult(null); setDTlRes(null); }}>🎲 Sample</button>
                    {dText && <button className="sec-btn" style={{ color: "rgba(230,57,70,.6)", borderColor: "rgba(230,57,70,.2)" }} onClick={() => { setDText(""); setDResult(null); }}>✕</button>}
                  </div>
                </div>
              )}

              {dMethod === "voice" && (
                <VoiceInput
                  submitLabel="🔍 Detect Language"
                  onTextReady={(t, forceLang) => { setDText(t); runDetect(t, forceLang !== "auto" ? forceLang : null); }}
                />
              )}

              {dMethod === "image" && (
                <ImageInput disabled={dLoading} onExtracted={txt => { setDText(txt); runDetect(txt); }} />
              )}

              <div style={{ marginTop: 16, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 5, flexWrap: "wrap" }}>
                {["🔬 Native Script", "🔤 Roman Script", "📷 Tesseract OCR", "🎙️ Multi-lang Voice", "✅ Zero API"].map((t, i) => (
                  <span key={i} style={{ padding: "2px 7px", borderRadius: 6, fontSize: 10, color: "rgba(255,255,255,.26)", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>{t}</span>
                ))}
              </div>
            </Card>

            {/* RIGHT — Result */}
            <div>
              {dLoading && <Card><Spinner label="Language detect ho rahi hai…" /></Card>}
              {dResult && !dLoading && <DetectionResult result={dResult} onTranslate={runDetectTranslate} />}
              {dTlLoad && <Card style={{ marginTop: 12 }}><Spinner color="#2DC653" label="Translate ho raha hai…" /></Card>}
              {dTlRes && !dTlLoad && (
                <Card bc={LANGS[dTlRes.tgtLang]?.color || "#2DC653"} style={{ marginTop: 12 }}>
                  <TranslationResult data={dTlRes} outputFormat={dOutFmt} onChangeFormat={setDOutFmt} />
                </Card>
              )}
              {!dResult && !dLoading && (
                <Card bc="rgba(255,255,255,.08)">
                  <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,.22)", textTransform: "uppercase", marginBottom: 12 }}>10 Supported Languages</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                    {Object.entries(LANGS).filter(([k]) => k !== "Unknown" && k !== "English").map(([name, info]) => (
                      <div key={name} onClick={() => { setDText(info.native + "  "); setDMethod("text"); setDResult(null); }} style={{ padding: "8px 10px", borderRadius: 9, cursor: "pointer", background: `${info.color}0D`, border: `1px solid ${info.color}1C`, transition: "all .2s" }} onMouseEnter={e => { e.currentTarget.style.background = `${info.color}1C`; e.currentTarget.style.transform = "translateX(2px)"; }} onMouseLeave={e => { e.currentTarget.style.background = `${info.color}0D`; e.currentTarget.style.transform = ""; }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: info.color, fontFamily: "serif" }}>{info.native}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{name}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "11px 13px", borderRadius: 10, background: "rgba(255,107,53,.05)", border: "1px solid rgba(255,107,53,.12)", fontSize: 12, color: "rgba(255,255,255,.32)", lineHeight: 1.7 }}>
                    <div style={{ color: "#FF6B35", marginBottom: 4, fontSize: 10, letterSpacing: 1 }}>✅ v7.0 Fixes</div>
                    🎙️ <strong style={{ color: "rgba(255,255,255,.55)" }}>Voice:</strong> Bhasha choose karo → bilkul sahi transcript<br />
                    🔤 <strong style={{ color: "rgba(255,255,255,.55)" }}>Roman:</strong> "namaste" = Hindi, "vanakam" = Tamil<br />
                    🔬 <strong style={{ color: "rgba(255,255,255,.55)" }}>Marathi/Hindi:</strong> Improved disambiguation
                  </div>
                </Card>
              )}
              {(dResult || dTlRes) && <div style={{ textAlign: "center", marginTop: 11 }}><button className="sec-btn" onClick={() => { setDResult(null); setDTlRes(null); setDText(""); }}>↩ Naya Try Karo</button></div>}
            </div>
          </div>
        )}

        {/* ══════ TRANSLATION TAB ══════ */}
        {mainTab === "translate" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
            {/* LEFT — Input + Config */}
            <Card bc="#2DC653">
              {/* Lang selectors */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "end", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,.3)", textTransform: "uppercase", marginBottom: 6 }}>Source Language</div>
                  <select value={tSrcLang} onChange={e => { setTSrcLang(e.target.value); setTResult(null); }}
                    style={{ width: "100%", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 9, color: "rgba(255,255,255,.85)", fontFamily: "Georgia,serif", fontSize: 13, padding: "8px 10px", cursor: "pointer" }}>
                    {allLangs.map(l => <option key={l} value={l} style={{ background: "#0E0F1A" }}>{l} — {LANGS[l].native}</option>)}
                  </select>
                </div>
                <button onClick={() => { const tmp = tSrcLang; setTSrcLang(tTgtLang); setTTgtLang(tmp); setTResult(null); }}
                  style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 9, color: "rgba(255,255,255,.6)", cursor: "pointer", fontSize: 18, padding: "8px 13px", marginBottom: 0 }} title="Swap">⇄</button>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,.3)", textTransform: "uppercase", marginBottom: 6 }}>Target Language</div>
                  <select value={tTgtLang} onChange={e => { setTTgtLang(e.target.value); setTResult(null); }}
                    style={{ width: "100%", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 9, color: "rgba(255,255,255,.85)", fontFamily: "Georgia,serif", fontSize: 13, padding: "8px 10px", cursor: "pointer" }}>
                    {allLangs.map(l => <option key={l} value={l} style={{ background: "#0E0F1A" }}>{l} — {LANGS[l].native}</option>)}
                  </select>
                </div>
              </div>

              {/* Output format toggle */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,.3)", textTransform: "uppercase", marginBottom: 7 }}>Output Format Chahiye</div>
                <div style={{ display: "flex", gap: 7 }}>
                  {[{ id: "text", icon: "📝", l: "Text" }, { id: "voice", icon: "🔊", l: "Voice (Auto-play)" }].map(f => (
                    <button key={f.id} onClick={() => setTOutFmt(f.id)}
                      style={{ padding: "7px 16px", borderRadius: 18, border: `1px solid ${tOutFmt === f.id ? "#2DC653" : "rgba(255,255,255,.14)"}`, background: tOutFmt === f.id ? "rgba(45,198,83,.15)" : "transparent", color: tOutFmt === f.id ? "#2DC653" : "rgba(255,255,255,.45)", cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 13, fontWeight: tOutFmt === f.id ? 700 : 400 }}>
                      {f.icon} {f.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input method */}
              <div style={{ display: "flex", gap: 6, marginBottom: 13 }}>
                {[{ id: "text", icon: "✍️", l: "Text" }, { id: "voice", icon: "🎙️", l: "Voice" }, { id: "image", icon: "🖼️", l: "Image" }].map(t => (
                  <button key={t.id} className={`tab-pill ${tMethod === t.id ? "on" : ""}`} onClick={() => { setTMethod(t.id); setTResult(null); }}>{t.icon} {t.l}</button>
                ))}
              </div>

              {tMethod === "text" && (
                <>
                  <textarea rows={5} value={tText} onChange={e => { setTText(e.target.value); setTResult(null); }}
                    placeholder={`${LANGS[tSrcLang]?.native || ""} mein ya Roman mein text yahan likho…`}
                    style={{ width: "100%", resize: "vertical", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 11, color: "rgba(255,255,255,.86)", fontFamily: "Georgia,serif", fontSize: 15, padding: "11px 13px", outline: "none", lineHeight: 1.8 }}
                  />
                  {tErr && <ErrBox msg={tErr} onClose={() => setTErr("")} />}
                  <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
                    <button className="pri-btn" onClick={() => runTranslate(tText, tSrcLang, tTgtLang)} disabled={!tText.trim() || tLoading}>
                      {tLoading ? "⏳ Translating…" : `🌐 Translate → ${tTgtLang}`}
                    </button>
                    {tText && <button className="sec-btn" onClick={() => { setTText(""); setTResult(null); }}>✕</button>}
                  </div>
                </>
              )}

              {tMethod === "voice" && (
                <VoiceInput
                  submitLabel={`🌐 Translate → ${tTgtLang}`}
                  onTextReady={t => { setTText(t); runTranslate(t, tSrcLang, tTgtLang); }}
                />
              )}

              {tMethod === "image" && (
                <ImageInput disabled={tLoading} onExtracted={txt => { setTText(txt); runTranslate(txt, tSrcLang, tTgtLang); }} />
              )}

              <div style={{ marginTop: 16, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 11, color: "rgba(255,255,255,.3)", lineHeight: 1.7 }}>
                <span style={{ color: "#2DC653" }}>✅ MyMemory Free API</span> — No key, No login<br />
                All 10 Indian languages + English supported
              </div>
            </Card>

            {/* RIGHT — Result */}
            <div>
              {tLoading && <Card><Spinner color="#2DC653" label="Translating…" /></Card>}
              {tResult && !tLoading && (
                <Card bc={LANGS[tResult.tgtLang]?.color || "#2DC653"}>
                  <TranslationResult data={tResult} outputFormat={tOutFmt} onChangeFormat={setTOutFmt} />
                </Card>
              )}
              {!tResult && !tLoading && (
                <Card bc="rgba(255,255,255,.08)">
                  <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,.22)", textTransform: "uppercase", marginBottom: 14 }}>How to Use</div>
                  {[
                    { icon: "1️⃣", t: "Source Language Chuno", d: "Jis bhasha mein text hai woh select karo" },
                    { icon: "2️⃣", t: "Target Language Chuno", d: "Hindi ya English — jisme translate karna hai" },
                    { icon: "3️⃣", t: "Output Format Chuno", d: "📝 Text screen pe dikhega  |  🔊 Voice auto-play hogi" },
                    { icon: "4️⃣", t: "Input Method Chuno", d: "✍️ Likho  |  🎙️ Bolo  |  🖼️ Image upload karo" },
                    { icon: "5️⃣", t: "Translate Button Dabao", d: "MyMemory Free API se bilkul free translation!" },
                  ].map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 11, padding: "10px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                      <span style={{ fontSize: 19, flexShrink: 0 }}>{f.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.7)", marginBottom: 2 }}>{f.t}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", lineHeight: 1.6 }}>{f.d}</div>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
              {tResult && <div style={{ textAlign: "center", marginTop: 11 }}><button className="sec-btn" onClick={() => { setTResult(null); setTText(""); }}>↩ Naya Try Karo</button></div>}
            </div>
          </div>
        )}
      </div>

      <footer style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "16px", borderTop: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.17)", fontSize: 11, letterSpacing: 1 }}>
        BharatVāṇī v7.0 · Unicode + Roman Detection · Tesseract.js · Multi-lang Voice · MyMemory Free
        · <span style={{ color: "rgba(45,198,83,.38)" }}>Zero Cost · Final Year Project 2025–26</span>
      </footer>
    </div>
  );
}