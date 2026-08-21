"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sidebar } from "../corporate-customers/[id]/_components/Sidebar";
import MaxGreeting from "@/components/MaxGreeting";
import { TRAINING_CONTENT } from "./trainingData";
import {
  GraduationCap,
  Shield,
  Sparkles,
  Play,
  BookOpen,
  Clock,
  BadgeCheck,
  Layers,
  ArrowRight,
  ChevronRight,
  Volume2,
  VolumeX,
  X,
  MessageCircle,
  Award,
  Target,
  Building2,
  HeartPulse,
  Plane,
  ClipboardCheck,
  Search,
  Send,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Users,
  FileText,
  Zap,
  ArrowLeft,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Derived course data (mirrors original HTML logic)
// ---------------------------------------------------------------------------
const CHAPTERS = (TRAINING_CONTENT as any).chapters as any[];
const MID_CASE = (TRAINING_CONTENT as any).midCase;
const FINAL_CASE = (TRAINING_CONTENT as any).finalCase;
const FINAL_ROUNDS = (TRAINING_CONTENT as any).finalRounds;
const SOURCES = (TRAINING_CONTENT as any).sources || [];
const SOURCE_NOTE = (TRAINING_CONTENT as any).sourceNote || "";
const QA = (TRAINING_CONTENT as any).qa || [];

type ModuleKey = "why" | "how" | "software" | "policy";

const MODULES: Record<ModuleKey, { kicker: string; title: string; copy: string; format: string; time: string; next: string; action: string; icon: any; accent: string }> = {
  why: {
    kicker: "Guided learning",
    title: "Why Sell Corporate Private Health",
    copy: "The business case for corporate private health, and how to spot a client worth approaching.",
    format: "Learn → remember → check",
    time: "10–12 min",
    next: "Three short chapters, then a quick check.",
    action: "Coming soon",
    icon: Target,
    accent: "from-emerald-500 to-teal-600",
  },
  how: {
    kicker: "Guided certification",
    title: "How to Sell Corporate Private Health",
    copy: "The complete program — eligibility, clinics, testing, treatment, travel, pre-existing conditions and pricing — plus the objections brokers hear most.",
    format: "Learn → remember → check → apply",
    time: "20–25 min core",
    next: "Ten chapters, then an optional live-style executive case with Cloey.",
    action: "Enter guided training",
    icon: Award,
    accent: "from-[#1b2a57] to-[#2a4a8a]",
  },
  software: {
    kicker: "Guided learning",
    title: "Software Training / TPA Product Guide",
    copy: "Run a corporate case on the platform: onboard the client, configure the policy, send it and track it.",
    format: "Follow along",
    time: "20–25 min",
    next: "A walkthrough of one complete case, from beginning to end.",
    action: "Coming soon",
    icon: Layers,
    accent: "from-indigo-500 to-violet-600",
  },
  policy: {
    kicker: "On demand",
    title: "Policy Explorer",
    copy: "Ask which policy fits a client, compare two policies, or check a detail during a meeting.",
    format: "Text chat",
    time: "Any time",
    next: "No lesson and no chapters — just ask a policy question in your own words.",
    action: "Open Policy Explorer",
    icon: Search,
    accent: "from-amber-500 to-orange-500",
  },
};

// Build COURSE like original: overview + beats + remembers + mcq/text + mid/final
const COURSE: any[] = [{ kind: "overview", chapter: -1 }];
CHAPTERS.forEach((chapter: any, chapterIndex: number) => {
  chapter.beats.forEach((beat: any, beatIndex: number) => COURSE.push({ kind: "beat", chapter: chapterIndex, beatIndex, ...beat }));
  COURSE.push({ kind: "remember", chapter: chapterIndex, items: chapter.remember });
  if (chapter.mcq) COURSE.push({ kind: "mcq", chapter: chapterIndex, ...chapter.mcq });
  if (chapter.text) COURSE.push({ kind: "text", chapter: chapterIndex, ...chapter.text });
  if (chapterIndex === 4) COURSE.push(MID_CASE);
  if (chapterIndex === CHAPTERS.length - 1) COURSE.push(FINAL_CASE);
});

// Quick questions for Cloey
const CLOEY_QUICK = [
  { id: "01", label: "What does the annual assessment include?", q: "What does the annual executive assessment include?" },
  { id: "02", label: "How does clinic choice affect services?", q: "How does clinic choice affect the services?" },
  { id: "03", label: "What expedited diagnostics are available?", q: "What expedited diagnostic imaging is available?" },
  { id: "04", label: "How does Global Medical Benefit work?", q: "How does the Global Medical Benefit work?" },
  { id: "05", label: "What are the pre-existing rules?", q: "What must I explain about pre-existing conditions?" },
  { id: "06", label: "What are the plans and monthly prices?", q: "What are the plan structures and monthly prices?" },
];

function normalizeQuestion(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function answerQuestion(question: string) {
  const normalized = normalizeQuestion(question);
  let best: any = null;
  let bestScore = 0;
  for (const item of QA) {
    const score = item.terms.reduce((b: number, term: string) => {
      const nt = normalizeQuestion(term);
      return normalized.includes(nt) ? Math.max(b, nt.length) : b;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  if (best && bestScore > 0) return best;
  return {
    answer: "I can answer predefined questions about positioning, ideal clients, eligibility, coverage maximums, assessments, travel, pre-existing conditions, objections and next steps. Try one of the suggested questions or rephrase.",
    source: "Group Benefitz predefined Q&A map",
  };
}

export default function TrainingCenterPage() {
  // Landing state — default to first card (01) as requested
  const [selectedModule, setSelectedModule] = useState<ModuleKey>("why");
  const [toast, setToast] = useState<string | null>(null);

  // Training state
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [stateMap, setStateMap] = useState<Map<number, any>>(new Map());
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [cloeyAnswer, setCloeyAnswer] = useState<{ answer: string; source: string }>({
    answer: "Select one of the questions above, or ask something specific below.",
    source: "Group Benefitz training map",
  });
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);
  const [cloeyInput, setCloeyInput] = useState("");
  const [textValue, setTextValue] = useState("");

  // Simulation (final rounds) state
  const [inSimulation, setInSimulation] = useState(false);
  const [finalRound, setFinalRound] = useState(0);
  const [finalOptionSel, setFinalOptionSel] = useState<number | null>(null);
  const [finalText, setFinalText] = useState("");
  const [finalFeedback, setFinalFeedback] = useState<{ correct: boolean; msg: string; extra?: string } | null>(null);
  const [finalTextRevealed, setFinalTextRevealed] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);

  const stageScrollRef = useRef<HTMLDivElement>(null);
  const speechTimerRef = useRef<any>(0);
  const cloeySideRef = useRef<HTMLDivElement>(null);

  const currentItem = inSimulation || showDebrief ? null : COURSE[current];

  // Toast helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Module selection
  const moduleData = MODULES[selectedModule];

  // Speech helpers
  const stopVoice = useCallback(() => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = 0;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const pickVoice = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v: any) => /Samantha|Ava|Victoria|Karen|Zira|Aria|Jenny/i.test(v.name) && /^en/i.test(v.lang)) ||
      voices.find((v: any) => /^en-CA/i.test(v.lang)) ||
      voices.find((v: any) => /^en/i.test(v.lang)) ||
      null
    );
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (muted || typeof window === "undefined" || !(window as any).SpeechSynthesisUtterance) return;
      stopVoice();
      const utter = new (window as any).SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ""));
      const v = pickVoice();
      if (v) utter.voice = v;
      utter.rate = 0.96;
      utter.pitch = 1.02;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [muted, pickVoice, stopVoice]
  );

  const queueSpeech = useCallback(
    (text: string) => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(() => {
        speechTimerRef.current = 0;
        speak(text);
      }, 100);
    },
    [speak]
  );

  const itemSpeech = (item: any) => {
    if (!item) return "";
    if (item.kind === "overview") return "In this training, you will learn who the program is for, how to discuss pre-existing conditions, how clinics and benefits work, how to answer objections, and how to make one clear recommendation. Ask me a question at any time.";
    if (item.kind === "beat") return item.voice || "";
    if (item.kind === "remember") return `Remember three things. ${item.items.join(" ")}`;
    if (item.kind === "mcq" || item.kind === "case") return `${item.q} Choose the best answer.`;
    if (item.kind === "text") return `${item.q} Write your answer, then compare it with the given answer.`;
    return "Optional real-time brochure case. Answer using the supplied GroupBenefitz content, then compare your response with the given answer.";
  };

  // Open / close training
  const openTraining = () => {
    setIsTrainingOpen(true);
    setCurrent(0);
    setStateMap(new Map());
    setInSimulation(false);
    setShowDebrief(false);
    setFinalRound(0);
    setFinalOptionSel(null);
    setFinalFeedback(null);
    setFinalText("");
    setFinalTextRevealed(false);
    setTextValue("");
    // lock scroll
    document.body.style.overflow = "hidden";
  };
  const closeTraining = () => {
    stopVoice();
    setIsTrainingOpen(false);
    setInSimulation(false);
    setShowDebrief(false);
    document.body.style.overflow = "";
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Auto-open guided training when opened in new tab via ?guided=1 (client-only check, no Suspense needed)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("guided") === "1") {
        setSelectedModule("how");
        const t = setTimeout(() => openTraining(), 80);
        return () => clearTimeout(t);
      }
    }
  }, []);

  // Handle preview action — 2nd card opens guided training in new tab
  const handlePreviewAction = () => {
    if (selectedModule === "how") {
      // open in new tab as requested
      const url = `${window.location.pathname}?guided=1`;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    } else if (selectedModule === "policy") {
      showToast("Policy Explorer — chat preview ready");
    } else {
      showToast("Experience preview ready — coming soon");
    }
  };

  // Chapter progress
  const chapterProgress = (chapterIndex: number) => {
    const chapterItems = COURSE.map((it, idx) => ({ it, idx })).filter((e) => e.it.chapter === chapterIndex);
    const completed = chapterItems.filter((e) => e.idx < current).length;
    return chapterItems.length ? Math.min(100, (completed / chapterItems.length) * 100) : 0;
  };

  // Sync speech on change
  useEffect(() => {
    if (!isTrainingOpen || inSimulation || showDebrief) return;
    const it = COURSE[current];
    if (it) queueSpeech(itemSpeech(it));
  }, [current, isTrainingOpen, inSimulation, showDebrief]);

  // Scroll to top on stage change
  useEffect(() => {
    if (stageScrollRef.current) stageScrollRef.current.scrollTop = 0;
  }, [current, inSimulation, finalRound, showDebrief]);

  // Check voice availability
  useEffect(() => {
    if (typeof window !== "undefined" && (!window.speechSynthesis || !(window as any).SpeechSynthesisUtterance)) {
      setMuted(true);
    }
  }, []);

  // Handle Cloey ask
  const askCloey = (question: string) => {
    const clean = question.trim();
    if (!clean) return;
    const result = answerQuestion(clean);
    setCloeyAnswer({ answer: result.answer, source: result.source });
    setCloeyInput("");
    speak(result.answer);
  };

  // Stage navigation helpers
  const canGoNext = useMemo(() => {
    if (inSimulation) {
      const r = FINAL_ROUNDS[finalRound];
      if (r.type === "single") return finalOptionSel !== null;
      if (r.type === "text") return finalTextRevealed;
      return false;
    }
    if (showDebrief) return true;
    const it = COURSE[current];
    if (!it) return false;
    if (["mcq", "case", "text"].includes(it.kind)) {
      return !!stateMap.get(current)?.complete;
    }
    if (it.kind === "practice") return false;
    return true;
  }, [current, stateMap, inSimulation, finalRound, finalOptionSel, finalTextRevealed, showDebrief]);

  const handleNext = () => {
    if (showDebrief) {
      closeTraining();
      return;
    }
    if (inSimulation) {
      if (finalRound < FINAL_ROUNDS.length - 1) {
        setFinalRound((x) => x + 1);
        setFinalOptionSel(null);
        setFinalFeedback(null);
        setFinalText("");
        setFinalTextRevealed(false);
      } else {
        setShowDebrief(true);
        setInSimulation(false);
        queueSpeech("Brochure case complete. You applied eligibility, clinic choice, pre-existing wording and the matching plan structure.");
      }
      return;
    }
    const it = COURSE[current];
    if (it?.kind === "practice") return; // gate handled separately
    if (current === COURSE.length - 1) {
      closeTraining();
      return;
    }
    setCurrent((c) => Math.min(c + 1, COURSE.length - 1));
  };
  const handleBack = () => {
    if (inSimulation) {
      if (finalRound > 0) {
        setFinalRound((x) => x - 1);
        setFinalOptionSel(null);
        setFinalFeedback(null);
        setFinalText("");
        setFinalTextRevealed(false);
      } else {
        setInSimulation(false);
      }
      return;
    }
    if (showDebrief) {
      setShowDebrief(false);
      setInSimulation(true);
      setFinalRound(FINAL_ROUNDS.length - 1);
      return;
    }
    setCurrent((c) => Math.max(0, c - 1));
  };

  // Handle chapter jump
  const jumpToChapter = (idx: number) => {
    if (inSimulation || showDebrief) {
      setInSimulation(false);
      setShowDebrief(false);
    }
    const target = COURSE.findIndex((it) => it.chapter === idx);
    if (target >= 0) setCurrent(target);
  };

  // Handle MCQ selection
  const handleOptionSelect = (item: any, optionIndex: number) => {
    const option = item.options[optionIndex];
    const prev = stateMap.get(current) || {};
    const attempts = (prev.attempts || 0) + 1;
    const correctIndex = item.options.findIndex((o: any) => o[2]);
    const isCorrect = !!option[2];

    if (isCorrect) {
      setStateMap((m) => {
        const nm = new Map(m);
        nm.set(current, { complete: true, option: optionIndex, attempts });
        return nm;
      });
      speak(option[3]);
    } else {
      if (attempts >= 2) {
        // reveal
        setStateMap((m) => {
          const nm = new Map(m);
          nm.set(current, { complete: true, option: optionIndex, attempts, revealed: true, correctIndex });
          return nm;
        });
        const correct = item.options[correctIndex];
        speak(`${correct[1]} ${correct[3]}`);
      } else {
        setStateMap((m) => {
          const nm = new Map(m);
          nm.set(current, { complete: false, option: optionIndex, attempts });
          return nm;
        });
        speak(option[3]);
      }
    }
  };

  // Handle text reveal
  const handleTextReveal = (item: any) => {
    if (!textValue.trim()) return;
    setStateMap((m) => {
      const nm = new Map(m);
      nm.set(current, { complete: true, response: textValue, revealed: true });
      return nm;
    });
    speak(`Compare your response with this given answer. ${item.model}`);
  };

  // Hydrate text value when moving stages
  useEffect(() => {
    const it = COURSE[current];
    if (it?.kind === "text") {
      setTextValue(stateMap.get(current)?.response || "");
    }
  }, [current]);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTrainingOpen) closeTraining();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isTrainingOpen]);

  const progressPct = useMemo(() => ((current + 1) / COURSE.length) * 100, [current]);

  // Render helpers for stage
  const renderStage = () => {
    if (showDebrief) {
      return (
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-500">Real-time brochure case complete</p>
              <h2 className="mt-2 text-[28px] md:text-[36px] font-black tracking-tight leading-none text-slate-900">You completed the Complete Executive Care case.</h2>
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 self-start sm:self-auto">{FINAL_ROUNDS.length} exchanges complete</span>
          </div>

          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <aside className="rounded-2xl bg-[#0a1e3b] text-white p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 blur-[30px] rounded-full -mr-10 -mt-10" />
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-blue-200">What you applied</p>
              <h3 className="mt-2 text-xl font-bold leading-tight">Use the product facts in the right order.</h3>
              <div className="mt-5 space-y-3">
                {[
                  "You explained the program.",
                  "You matched a RegenaLife option.",
                  "You handled a pre-existing question.",
                  "You selected Executive Flex.",
                  "You advanced to a decision.",
                ].map((f, i) => (
                  <div key={i} className="py-3 border-t border-white/10 text-sm text-blue-100/90 font-medium flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 grid place-items-center text-xs font-bold">{i + 1}</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </aside>

            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
              <p className="text-[11px] font-bold tracking-widest uppercase text-[#1b2a57]">Case debrief</p>
              <h3 className="mt-2 text-[24px] font-bold tracking-tight text-slate-900 leading-tight">Keep these five actions in the real meeting.</h3>
              <div className="mt-6 space-y-3">
                {[
                  "Confirm the eligible executives and priority.",
                  "Match the clinic and diagnostic pathway.",
                  "Apply pre-existing wording without adjudicating the condition.",
                  "Use the exact structure, tier, premium and deductible.",
                  "Agree a specific decision conversation.",
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700">
                    <span className="w-8 h-8 rounded-full bg-emerald-500 text-white grid place-items-center text-sm font-bold">{i + 1}</span>
                    {t}
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Sources used for this training</p>
                <ol className="mt-2 space-y-1 list-decimal list-inside text-xs text-slate-600 font-medium">
                  {SOURCES.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{SOURCE_NOTE}</p>
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (inSimulation) {
      const round: any = FINAL_ROUNDS[finalRound];
      const facts = FINAL_CASE.facts as string[];
      return (
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-500">{FINAL_CASE.clientTitle}</p>
              <h2 className="mt-1 text-[28px] md:text-[36px] font-black tracking-tight text-slate-900 leading-none">{FINAL_CASE.clientName}</h2>
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-slate-900 text-white self-start sm:self-auto">Exchange {finalRound + 1} of {FINAL_ROUNDS.length}</span>
          </div>

          <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
            <aside className="rounded-2xl bg-[#0a1e3b] text-white p-6 shadow-xl sticky top-0">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-blue-200">Client brief</p>
              <h3 className="mt-2 text-xl font-bold leading-tight">Client trust and continuity are concentrated.</h3>
              <div className="mt-5 grid gap-2">
                {facts.map((f: string, i: number) => (
                  <div key={i} className="py-2.5 border-t border-white/10 text-[13px] leading-snug text-blue-100/90 font-medium">
                    {f}
                  </div>
                ))}
              </div>
            </aside>

            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
              <div className="flex gap-1.5 mb-5">
                {FINAL_ROUNDS.map((_: any, idx: number) => (
                  <div key={idx} className={`h-1.5 flex-1 rounded-full transition-all ${idx < finalRound ? "bg-emerald-500" : idx === finalRound ? "bg-[#1b2a57]" : "bg-slate-200"}`} />
                ))}
              </div>

              <p className="text-[11px] font-bold tracking-widest uppercase text-[#5b7eb0]">{round.label}</p>
              <h3 className="mt-2 text-[22px] md:text-[28px] font-bold tracking-tight leading-tight text-slate-900">{round.q}</h3>

              {round.type === "single" && (
                <div className="mt-6 space-y-3">
                  {round.options.map((opt: any, idx: number) => {
                    const isSelected = finalOptionSel === idx;
                    const isCorrect = !!opt[2];
                    let cls = "w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ";
                    if (isSelected) cls += isCorrect ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200 " : "bg-red-50 border-red-300 ring-2 ring-red-200 ";
                    else cls += "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm ";
                    return (
                      <button key={idx} onClick={() => {
                        const correct = round.options.find((c: any) => c[2]);
                        const correctIdx = round.options.findIndex((c: any) => c[2]);
                        setFinalOptionSel(idx);
                        if (isCorrect) {
                          setFinalFeedback({ correct: true, msg: opt[3] });
                          speak(opt[3]);
                        } else {
                          setFinalFeedback({ correct: false, msg: opt[3], extra: `${correct[0]}. ${correct[1]}` });
                          speak(`${opt[3]} The given answer is ${correct[1]}`);
                        }
                      }} disabled={finalOptionSel !== null} className={cls}>
                        <span className={`w-8 h-8 shrink-0 rounded-lg border grid place-items-center text-xs font-bold ${isSelected ? (isCorrect ? "bg-emerald-600 text-white border-emerald-600" : "bg-red-600 text-white border-red-600") : "bg-slate-50 text-slate-600 border-slate-200"}`}>{opt[0]}</span>
                        <span className="text-[14px] font-semibold leading-snug text-slate-900 pt-1">{opt[1]}</span>
                      </button>
                    );
                  })}

                  {finalFeedback && (
                    <div className={`mt-4 p-4 rounded-xl border text-sm leading-relaxed ${finalFeedback.correct ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
                      <p className="font-bold text-xs tracking-widest uppercase mb-1">{finalFeedback.correct ? "Right" : "Not the best response"}</p>
                      <span>{finalFeedback.msg}</span>
                      {finalFeedback.extra && <span className="block mt-2 font-semibold">Given answer: {finalFeedback.extra}</span>}
                    </div>
                  )}
                </div>
              )}

              {round.type === "text" && (
                <div className="mt-6">
                  <textarea
                    value={finalText}
                    onChange={(e) => setFinalText(e.target.value)}
                    placeholder="Write what you would say…"
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 bg-white p-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b2a57]/20 focus:border-[#1b2a57] resize-y"
                  />
                  {!finalTextRevealed ? (
                    <button
                      onClick={() => {
                        if (!finalText.trim()) return;
                        setFinalTextRevealed(true);
                        speak(`The given answer is ${round.model}`);
                      }}
                      className="mt-3 px-5 py-2.5 rounded-xl bg-[#0a1e3b] text-white text-sm font-bold shadow hover:shadow-md transition-all"
                    >
                      See the given answer
                    </button>
                  ) : (
                    <div className="mt-3 p-4 rounded-xl bg-white border border-slate-200 text-sm leading-relaxed">
                      <p className="font-bold text-[10px] tracking-widest uppercase text-[#5b7eb0] mb-2">Given answer</p>
                      <span className="text-slate-700">{round.model}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">Practice only — there is no pass or fail.</span>
              </div>
            </section>
          </div>
        </div>
      );
    }

    const item = COURSE[current];
    if (!item) return null;

    if (item.kind === "overview") {
      return (
        <div>
          <div className="mb-8">
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-500">Course overview · 20–25 minutes</p>
            <h2 className="mt-3 max-w-2xl text-[36px] md:text-[48px] font-black tracking-tighter leading-none text-slate-900">Learn Complete Executive Care from the supplied material.</h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 font-medium">Five outcomes organize product knowledge and the sales conversation together.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { n: "01", t: "Find the fit", d: "Identify the leaders the business depends on and confirm eligibility." },
              { n: "02", t: "Protect trust", d: "Explain pre-existing conditions early, clearly and without overpromising." },
              { n: "03", t: "Match access", d: "Choose the clinic, assessment and diagnostic pathway that fits the need." },
              { n: "04", t: "Explain value", d: "Separate planned treatment, travel protection and year-round wellness." },
              { n: "05", t: "Move forward", d: "Handle eight objections and make one verified recommendation." },
            ].map((s) => (
              <div key={s.n} className="relative bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all">
                <span className="w-8 h-8 rounded-full bg-[#3b5a7d] text-white grid place-items-center text-[10px] font-bold shadow">{s.n}</span>
                <h3 className="mt-5 text-[18px] font-bold tracking-tight text-slate-900 leading-tight">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600 font-medium">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-[#3b5a7d]/5 border border-[#3b5a7d]/15 text-sm text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span><b className="font-bold text-[#3b5a7d]">Cloey stays beside you.</b> Ask her about a clinic, benefit, plan rule or client question at any time.</span>
          </div>
        </div>
      );
    }

    if (item.kind === "beat") {
      const savedKnow = item.know as string;
      return (
        <div>
          <div className="mb-6">
            <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">{CHAPTERS[item.chapter].nav} · Concept {item.beatIndex + 1}</p>
            <h2 className="mt-2 max-w-3xl text-[32px] md:text-[40px] font-black tracking-tighter leading-none text-slate-900">{item.title}</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Know card */}
            <section className={`relative overflow-hidden rounded-2xl border p-6 md:p-7 shadow-md backdrop-blur-xl ${item.dont ? "bg-[#fdf2f2]/90 border-red-200" : "bg-white/90 border-slate-200/80"}`}>
              <div className={`absolute top-0 left-0 h-1 w-full ${item.dont ? "bg-red-500" : "bg-[#3b5a7d]"}`} />
              <span className="absolute top-5 right-6 text-[10px] font-bold tracking-widest text-slate-400">01</span>
              <p className={`text-[10px] font-bold tracking-[0.12em] uppercase ${item.dont ? "text-red-600" : "text-[#3b5a7d]"}`}>{item.dont ? "What not to do" : "What to know"}</p>
              <div className="mt-4 text-[14px] leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: savedKnow }} />
              <div className="mt-5 pt-4 border-t border-slate-200/70">
                <p className="text-[11px] leading-snug text-slate-500">
                  <b className="font-bold tracking-widest uppercase text-slate-600">Source</b> · {item.source}
                </p>
              </div>
            </section>

            {/* Sell card */}
            <section className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-amber-50/80 backdrop-blur-xl p-6 md:p-7 shadow-md">
              <div className="absolute top-0 left-0 h-1 w-full bg-amber-500" />
              <span className="absolute top-5 right-6 text-[10px] font-bold tracking-widest text-amber-700/60">02</span>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-amber-700">{item.dont ? "Do this instead" : "How to sell it"}</p>
              <blockquote className="mt-4 text-[18px] md:text-[20px] font-serif font-medium leading-snug text-slate-900">“{item.sell.replace(/^“|”$/g, "")}”</blockquote>
              <div className="mt-5 rounded-xl bg-white/90 backdrop-blur border border-amber-200/70 p-4 shadow-sm">
                <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-amber-700 mb-1.5">{item.dont ? "Why it fails" : "Broker guidance"}</p>
                <p className="text-[13px] leading-relaxed text-slate-700 font-medium">{item.coach}</p>
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (item.kind === "remember") {
      return (
        <div>
          <div className="mb-6">
            <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">{CHAPTERS[item.chapter].nav} · Key points</p>
            <h2 className="mt-2 text-[32px] md:text-[40px] font-black tracking-tighter leading-none text-slate-900">Remember three things.</h2>
          </div>
          <section className="rounded-2xl bg-gradient-to-br from-[#0a1e3b] to-[#3b5a7d] text-white p-7 md:p-10 shadow-xl shadow-blue-900/20 relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[40px] rounded-full -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/15 blur-[50px] rounded-full -ml-20 -mb-20" />
            <p className="relative text-[10px] font-bold tracking-[0.14em] uppercase text-blue-200">Take this into the meeting</p>
            <div className="relative mt-6 space-y-5">
              {item.items.map((text: string, i: number) => (
                <div key={i} className="flex gap-4 items-start">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/15 grid place-items-center text-xs font-mono font-bold text-blue-200 backdrop-blur">0{i + 1}</span>
                  <span className="text-[18px] md:text-[22px] font-serif font-medium leading-tight text-white">{text}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (item.kind === "mcq" || item.kind === "case") {
      const isCase = item.kind === "case";
      const saved = stateMap.get(current);
      const selected = saved?.option;
      const revealed = !!saved?.revealed;
      const correctIdx = item.options.findIndex((o: any) => o[2]);
      return (
        <div>
          {isCase && (
            <section className="mb-6 rounded-2xl bg-[#0a1e3b] text-white p-6 flex flex-col md:flex-row gap-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/15 blur-[30px] rounded-full" />
              <div className="relative shrink-0">
                <p className="text-[10px] font-bold tracking-widest uppercase text-blue-200">Mid-course case</p>
                <h3 className="mt-2 text-[22px] font-bold leading-tight max-w-[18ch]">{item.title}</h3>
              </div>
              <p className="relative flex-1 text-sm leading-relaxed text-blue-100/90 font-medium">{item.scenario}</p>
            </section>
          )}

          <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">{isCase ? "Case decision" : "Check · choose one"}</p>
          <p className="mt-3 max-w-3xl text-[24px] md:text-[30px] font-bold tracking-tight leading-tight text-slate-900">{item.q}</p>

          <div className="mt-6 space-y-3 max-w-3xl">
            {item.options.map((opt: any, idx: number) => {
              const isSel = selected === idx;
              const isCorr = !!opt[2];
              const showAsCorrect = revealed && idx === correctIdx;
              let cls = "w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ";
              if (isSel) {
                if (revealed) {
                  cls += idx === correctIdx ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200 " : "bg-red-50 border-red-300 ";
                } else {
                  cls += isCorr ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200 " : "bg-red-50 border-red-300 ";
                }
              } else if (showAsCorrect) {
                cls += "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200 ";
              } else {
                cls += "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm ";
              }
              const disabled = !!saved?.complete;
              return (
                <button key={idx} onClick={() => !disabled && handleOptionSelect(item, idx)} disabled={disabled} className={cls}>
                  <span className={`w-8 h-8 shrink-0 rounded-lg border grid place-items-center text-xs font-bold ${isSel || showAsCorrect ? (isCorr || showAsCorrect ? "bg-emerald-600 text-white border-emerald-600" : "bg-red-600 text-white border-red-600") : "bg-slate-50 text-slate-600 border-slate-200"}`}>{opt[0]}</span>
                  <span className="text-[14px] font-semibold leading-snug text-slate-900 pt-0.5">{opt[1]}</span>
                </button>
              );
            })}
          </div>

          {saved && (
            <div className={`mt-4 max-w-3xl p-4 rounded-xl border text-sm leading-relaxed ${saved.complete && item.options[selected]?.[2] ? "bg-emerald-50 border-emerald-200 text-emerald-800" : saved.revealed ? "bg-white border-slate-300 text-slate-900" : !saved.complete ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200"}`}>
              {saved.revealed ? (
                <>
                  <p className="font-bold text-xs tracking-widest uppercase mb-1">Here’s the answer</p>
                  <span>
                    <b>{item.options[correctIdx][0]}.</b> {item.options[correctIdx][1]} {item.options[correctIdx][3]}
                  </span>
                </>
              ) : saved.complete ? (
                <>
                  <p className="font-bold text-xs tracking-widest uppercase mb-1">Correct</p>
                  <span>{item.options[selected][3]}</span>
                </>
              ) : (
                <>
                  <p className="font-bold text-xs tracking-widest uppercase mb-1">Try once more</p>
                  <span>{item.options[selected][3]}</span>
                </>
              )}
            </div>
          )}
        </div>
      );
    }

    if (item.kind === "text") {
      const saved = stateMap.get(current);
      return (
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Check · in your own words</p>
          <p className="mt-3 text-[24px] md:text-[30px] font-bold tracking-tight leading-tight text-slate-900">{item.q}</p>

          <div className="mt-6">
            <textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Type your answer…"
              rows={5}
              className="w-full rounded-xl border border-slate-300 bg-white p-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0a1e3b]/20 focus:border-[#0a1e3b] resize-y"
            />
            {!saved?.revealed ? (
              <button onClick={() => handleTextReveal(item)} className="mt-3 px-5 py-2.5 rounded-xl bg-[#0a1e3b] text-white text-sm font-bold shadow hover:shadow-md transition-all">
                Compare with the given answer
              </button>
            ) : (
              <div className="mt-3 p-4 rounded-xl bg-white border border-slate-200">
                <p className="font-bold text-[10px] tracking-widest uppercase text-[#5b7eb0] mb-2">Given answer</p>
                <span className="text-sm leading-relaxed text-slate-700">{item.model}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (item.kind === "practice") {
      return (
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Core training complete</p>
              <h2 className="mt-2 text-[28px] md:text-[36px] font-black tracking-tight leading-none text-slate-900">Try a real-time brochure case.</h2>
            </div>
            <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-slate-900 text-white self-start sm:self-auto">{FINAL_CASE.duration}</span>
          </div>

          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <aside className="rounded-2xl bg-[#0a1e3b] text-white p-6 shadow-xl">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-blue-200">Use the supplied facts</p>
              <h3 className="mt-2 text-xl font-bold leading-tight">Match the client to Complete Executive Care.</h3>
              <div className="mt-5 space-y-2">
                {[
                  "Confirm eligibility and the client priority.",
                  "Explain clinic and diagnostic options.",
                  "Apply the pre-existing clause correctly.",
                  "Recommend the funding structure and tier.",
                  "Agree a specific decision conversation.",
                ].map((f, i) => (
                  <div key={i} className="py-2.5 border-t border-white/10 text-[13px] text-blue-100/90 font-medium">{f}</div>
                ))}
              </div>
            </aside>

            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
              <p className="text-[11px] font-bold tracking-widest uppercase text-[#1b2a57]">Real-time brochure case</p>
              <h3 className="mt-2 text-[22px] font-bold tracking-tight text-slate-900 leading-tight">Work through a Complete Executive Care conversation.</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600 font-medium">You answer as the broker, then compare your response with the given answer. Five short exchanges use the supplied product facts. This is practice, not a pass-or-fail test — if a choice is weaker, the given answer appears immediately and you continue.</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setInSimulation(true);
                    setFinalRound(0);
                    setFinalOptionSel(null);
                    setFinalFeedback(null);
                    setFinalText("");
                    setFinalTextRevealed(false);
                  }}
                  className="px-6 py-3 rounded-xl bg-[#0a1e3b] text-white text-sm font-bold shadow hover:shadow-lg transition-all"
                >
                  Enter case study
                </button>
                <button onClick={closeTraining} className="px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all">
                  Finish core training
                </button>
              </div>

              <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Sources used for this training</p>
                <ol className="mt-2 space-y-1 list-decimal list-inside text-xs text-slate-600 font-medium">
                  {SOURCES.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{SOURCE_NOTE}</p>
              </div>
            </section>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-tr from-slate-200 via-indigo-50 to-blue-100 font-sans selection:bg-blue-600/10">
      <MaxGreeting />
      <Sidebar />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[90] bg-slate-900 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 text-sm font-bold animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-300" />
          {toast}
        </div>
      )}

      {/* Main content (hidden when training overlay open) */}
      <main className={`flex-1 md:ml-64 relative flex flex-col min-h-screen transition-opacity ${isTrainingOpen ? "opacity-0 pointer-events-none select-none" : "opacity-100"}`}>
        {/* Background accents */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-8%] left-[-5%] w-[520px] h-[520px] bg-blue-400/10 rounded-full blur-[90px]" />
          <div className="absolute top-[10%] right-[-6%] w-[520px] h-[520px] bg-indigo-400/10 rounded-full blur-[90px]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #0a1e3b 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        </div>

        {/* Header — matches app-wide pattern (Dashboard/Settings) */}
        <header className="relative z-20 flex min-h-[5rem] md:h-20 flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 border-b border-slate-200/60 bg-white/70 backdrop-blur-md px-4 md:px-8 pt-24 md:pt-0 pb-4 md:pb-0">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Training Center</h1>
            <p className="text-xs text-slate-500 font-medium">Broker capability centre · Learn, remember, check, apply</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full md:w-auto mt-4 md:mt-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              20–25 min core · optional case study
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-sm hidden md:block">
              <img src="/image.png" alt="profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Landing hero */}
        <div className="relative z-10 flex-1">
          <div className="max-w-[1180px] mx-auto px-4 md:px-8 py-5 md:py-6">
            {/* Hero — eyebrow removed, content moved up */}
            <section className="mb-6">
              <h1 className="text-[28px] md:text-[36px] lg:text-[40px] font-bold tracking-tight leading-tight text-slate-900 max-w-2xl">
                Private health, <span className="text-[#3b5a7d]">made clear.</span>
              </h1>
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-500 font-medium">
                Four guided experiences for working brokers — not an LMS. Choose a path and start learning with Cloey, your AI insurance coach, beside you.
              </p>
            </section>

            {/* Grid — centered alignment */}
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 md:gap-8 items-center">
              {/* Left: modules */}
              <div className="space-y-6">
                <div>
                  <p className="flex items-center gap-3 text-[11px] font-bold tracking-[0.12em] uppercase text-slate-500 mb-3">
                    Guided learning
                    <span className="h-px flex-1 bg-slate-200" />
                  </p>
                  <div className="space-y-3">
                    {(["why", "how", "software"] as ModuleKey[]).map((key, idx) => {
                      const m = MODULES[key];
                      const active = selectedModule === key;
                      const num = `0${idx + 1}`;
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedModule(key)}
                          className={`group w-full text-left relative overflow-hidden rounded-2xl border transition-all duration-300 flex items-center gap-4 p-4 md:p-5 ${active ? "bg-white border-[#0a1e3b] shadow-[0_8px_30px_rgba(10,30,59,0.12)] ring-1 ring-[#0a1e3b]" : "bg-white/80 backdrop-blur border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"}`}
                        >
                          <div className={`w-11 h-11 shrink-0 rounded-xl grid place-items-center text-sm font-bold border ${active ? "bg-[#0a1e3b] text-white border-[#0a1e3b]" : "bg-slate-50 text-slate-600 border-slate-200 group-hover:bg-white"}`}>{num}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] md:text-[15px] font-bold tracking-tight text-slate-900 leading-tight">{m.title}</p>
                            <p className="mt-1 text-[12.5px] leading-snug text-slate-500 font-medium line-clamp-2">{m.copy.includes("—") ? m.copy.split("—")[0].trim() : m.copy}</p>
                          </div>
                          <span className={`w-8 h-8 shrink-0 rounded-full grid place-items-center border transition-colors ${active ? "bg-[#0a1e3b] text-white border-[#0a1e3b]" : "bg-white text-slate-400 border-slate-200 group-hover:text-[#0a1e3b] group-hover:border-[#0a1e3b]/20"}`}>
                            <ChevronRight className="w-4 h-4" />
                          </span>
                          {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0a1e3b]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="flex items-center gap-3 text-[11px] font-bold tracking-[0.12em] uppercase text-slate-500 mb-3">
                    On demand
                    <span className="h-px flex-1 bg-slate-200 border-t border-dashed" />
                  </p>
                  <button
                    onClick={() => setSelectedModule("policy")}
                    className={`group w-full text-left relative overflow-hidden rounded-2xl border-2 border-dashed transition-all flex items-center gap-4 p-4 md:p-5 ${selectedModule === "policy" ? "bg-white border-[#0a1e3b] shadow-md" : "bg-white/60 backdrop-blur border-slate-300 hover:border-slate-400 hover:bg-white"}`}
                  >
                    <div className={`w-11 h-11 shrink-0 rounded-xl grid place-items-center font-bold border-2 border-dashed ${selectedModule === "policy" ? "bg-[#0a1e3b] text-white border-[#0a1e3b]" : "bg-amber-50 text-amber-700 border-amber-200"}`}>04</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        {MODULES.policy.title}
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                          <MessageCircle className="w-3 h-3" />
                          Text chat
                        </span>
                      </p>
                      <p className="mt-1 text-[12.5px] leading-snug text-slate-500 font-medium">Ask a policy question in your own words</p>
                    </div>
                    <span className={`w-8 h-8 shrink-0 rounded-full grid place-items-center border ${selectedModule === "policy" ? "bg-[#0a1e3b] text-white border-[#0a1e3b]" : "bg-white text-slate-400 border-slate-200"}`}>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { k: "10", v: "Chapters", icon: BookOpen },
                    { k: "43", v: "Lessons", icon: Layers },
                    { k: "4.9", v: "Broker rating", icon: BadgeCheck },
                  ].map((s) => (
                    <div key={s.v} className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-sm">
                      <s.icon className="w-4 h-4 mx-auto text-[#5b7eb0] mb-1" />
                      <p className="text-lg font-black tracking-tight text-slate-900 leading-none">{s.k}</p>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: preview — vertically centered with left 4 cards */}
              <aside className="self-center w-full my-auto rounded-[20px] bg-[#0a1e3b] text-white p-7 md:p-8 shadow-[0_20px_60px_rgba(10,30,59,0.35)] relative overflow-hidden flex flex-col justify-center">
                {/* glow */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 blur-[50px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-12 w-80 h-80 bg-indigo-500/15 blur-[50px] rounded-full pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "18px 18px" }} />

                <div className="relative">
                  <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-blue-200 bg-white/10 border border-white/10 px-3 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    {moduleData.kicker}
                  </p>
                  <h2 className="mt-4 text-[30px] md:text-[36px] font-black tracking-tight leading-none">{moduleData.title}</h2>
                  <p className="mt-3 text-[14px] leading-relaxed text-blue-100/80 font-medium">{moduleData.copy}</p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.07] border border-white/10 p-4 backdrop-blur">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-blue-200">Format</p>
                      <p className="mt-1 text-[13px] font-bold leading-tight text-white">{moduleData.format}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.07] border border-white/10 p-4 backdrop-blur">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-blue-200">Time</p>
                      <p className="mt-1 text-[13px] font-bold leading-tight text-white">{moduleData.time}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-white/10">
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-blue-200">What happens next</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-blue-100/80 font-medium">{moduleData.next}</p>
                  </div>

                  <button
                    onClick={handlePreviewAction}
                    className="mt-7 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-[14px] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-white text-[#0a1e3b] hover:bg-blue-50"
                  >
                    {selectedModule === "how" ? (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        {moduleData.action}
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4" />
                        {moduleData.action}
                      </>
                    )}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>

                  {selectedModule === "how" && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-blue-200/70">
                      <Shield className="w-3.5 h-3.5" />
                      Certified · Learn with Cloey · Optional case study
                    </div>
                  )}
                </div>
              </aside>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200/70 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Designed for working brokers — not an LMS.
              </span>
              <span className="font-bold tracking-tight text-slate-600">GroupBenefitz · Cloey learning agent</span>
            </div>
          </div>
        </div>
      </main>

      {/* Full training overlay — premium theme-matched */}
      {isTrainingOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-gradient-to-tr from-slate-200 via-indigo-50 to-blue-100 animate-fade-in overflow-hidden">
          {/* Theme background accents */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-[-8%] left-[-5%] w-[520px] h-[520px] bg-blue-400/10 rounded-full blur-[90px]" />
            <div className="absolute top-[12%] right-[-6%] w-[480px] h-[480px] bg-indigo-400/10 rounded-full blur-[90px]" />
            <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #0a1e3b 1px, transparent 0)", backgroundSize: "22px 22px" }} />
          </div>

          {/* Top bar — matches app header (white/70 + backdrop-blur) */}
          <header className="relative h-[56px] md:h-[4.75rem] shrink-0 flex items-center gap-4 px-4 md:px-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0a1e3b] text-white grid place-items-center shadow">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-[14px] font-black tracking-tight text-slate-900">GroupBenefitz <span className="font-medium text-slate-500">Private Health</span></span>
            </div>
            <div className="hidden md:flex items-center gap-3 ml-auto text-xs">
              <span className="font-bold tracking-tight text-slate-900">How to Sell Corporate Private Health</span>
              <span className="hidden lg:inline text-[11px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#3b5a7d] text-white shadow-md">20–25 min core</span>
            </div>
            <button onClick={closeTraining} className="ml-auto md:ml-4 w-8 h-8 rounded-full bg-white border border-slate-200 grid place-items-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm" aria-label="Close training">
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Chapter nav — glass + pill active matching sidebar */}
          <nav className="relative shrink-0 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
            <div className="flex items-stretch gap-1.5 md:gap-2 px-2 md:px-4 overflow-x-auto scrollbar-none py-2.5" style={{ scrollbarWidth: "none" }}>
              {CHAPTERS.map((c: any, idx: number) => {
                const active = !inSimulation && !showDebrief && COURSE[current].chapter === idx;
                const complete = !inSimulation && !showDebrief && idx < (COURSE[current].chapter ?? -1);
                const pct = complete ? 100 : chapterProgress(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => jumpToChapter(idx)}
                    className={`group relative shrink-0 min-w-[84px] md:min-w-0 md:flex-1 h-[42px] rounded-xl grid place-items-center px-2.5 text-center transition-all text-[10px] font-bold tracking-widest uppercase whitespace-nowrap border ${active ? "bg-[#3b5a7d] text-white border-[#3b5a7d] shadow-md shadow-blue-900/20" : complete ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                  >
                    {c.nav}
                    {/* subtle progress bar at bottom */}
                    <span className="absolute left-2 right-2 -bottom-1 h-[3px] bg-slate-200/70 overflow-hidden rounded-full hidden md:block">
                      <i className="block h-full bg-[#3b5a7d] transition-all duration-300" style={{ width: `${pct}%`, opacity: active ? 1 : 0.9 }} />
                    </span>
                    {complete && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white shadow" />}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Shell — uses same gradient as app, premium glass cards */}
          <div className="relative flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-3 md:gap-4 p-3 md:p-4 overflow-hidden">
            {/* Main course — glass white */}
            <main className="order-2 lg:order-1 min-h-0 flex flex-col bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden">
              <div ref={stageScrollRef} className="flex-1 min-h-0 overflow-y-auto">
                <div className="w-full max-w-[980px] mx-auto px-4 md:px-8 py-6 md:py-8">
                  {/* render stage */}
                  <div className="animate-fade-in">{renderStage()}</div>
                </div>
              </div>

              {/* Player rail — premium */}
              <footer className="shrink-0 h-[66px] border-t border-slate-200/70 bg-white/80 backdrop-blur-xl flex items-center gap-3 px-4 md:px-6">
                <span className="hidden sm:block text-[11px] font-bold tracking-widest uppercase text-slate-500 whitespace-nowrap">
                  {inSimulation ? `Exchange ${finalRound + 1} of ${FINAL_ROUNDS.length}` : showDebrief ? "Case complete" : `${current + 1} of ${COURSE.length}`}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-200/70 overflow-hidden hidden sm:block">
                  <div className="h-full bg-[#3b5a7d] rounded-full transition-all duration-300 shadow-sm" style={{ width: inSimulation ? `${((finalRound + 1) / FINAL_ROUNDS.length) * 100}%` : showDebrief ? "100%" : `${progressPct}%` }} />
                </div>
                <div className="sm:hidden flex-1 text-[11px] font-bold tracking-widest uppercase text-slate-500">
                  {inSimulation ? `${finalRound + 1}/${FINAL_ROUNDS.length}` : `${current + 1}/${COURSE.length}`}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={handleBack} disabled={current === 0 && !inSimulation && !showDebrief} className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-sm">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canGoNext && COURSE[current]?.kind !== "practice" && !showDebrief && !inSimulation}
                    className="px-5 py-2.5 rounded-xl bg-[#0a1e3b] text-white text-xs font-bold shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 transition-all flex items-center gap-1.5"
                  >
                    {inSimulation ? (finalRound === FINAL_ROUNDS.length - 1 ? "Finish case study" : "Continue") : showDebrief ? "Return to modules" : current === COURSE.length - 1 ? "Return to modules" : COURSE[current]?.kind === "overview" ? "Continue to Program" : "Continue"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </footer>
            </main>

            {/* Cloey side — glass premium */}
            <aside ref={cloeySideRef} className={`order-1 lg:order-2 min-h-0 flex flex-col bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden ${speaking ? "ring-2 ring-blue-300/50 shadow-blue-200/40" : ""}`}>
              <div className="shrink-0 flex items-center gap-3 p-4 bg-white/80 backdrop-blur border-b border-slate-200/70">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#d9c5a3] to-[#b89a6a] border-2 border-white shadow">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://i.pravatar.cc/200?img=5" alt="Cloey" className="w-full h-full object-cover" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-black tracking-tight text-slate-900 leading-none flex items-center gap-1.5">
                    Cloey
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-slate-500">
                    <span className="flex gap-0.5">
                      <i className={`w-0.5 h-3 rounded-full bg-[#3b5a7d] ${speaking ? "animate-[bars_0.6s_ease-in-out_infinite]" : "opacity-30"}`} />
                      <i className={`w-0.5 h-3 rounded-full bg-[#3b5a7d] ${speaking ? "animate-[bars_0.6s_ease-in-out_0.12s_infinite]" : "opacity-30"}`} />
                      <i className={`w-0.5 h-3 rounded-full bg-[#3b5a7d] ${speaking ? "animate-[bars_0.6s_ease-in-out_0.24s_infinite]" : "opacity-30"}`} />
                    </span>
                    <span>{speaking ? "Cloey is speaking" : muted ? "Voice is muted" : "Guidance running"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (muted) setMuted(false);
                      const it = COURSE[current];
                      speak(itemSpeech(it));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#3b5a7d] text-white text-[11px] font-bold flex items-center gap-1.5 hover:bg-[#2f4a68] transition-colors shadow-md"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Hear
                  </button>
                  <button
                    onClick={() => {
                      const next = !muted;
                      setMuted(next);
                      if (next) stopVoice();
                    }}
                    className={`w-8 h-8 rounded-lg border grid place-items-center transition-colors shadow-sm ${muted ? "bg-[#3b5a7d] text-white border-[#3b5a7d]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                    aria-pressed={muted}
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="mx-3 mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1">Cloey</p>
                <p className="text-[13px] leading-relaxed text-slate-700 font-medium">
                  {inSimulation
                    ? "You’re in the brochure case. Use the client facts on the left and the exact product wording you just learned."
                    : showDebrief
                    ? "Nice work — you completed the brochure case. Keep those five actions in your next client meeting."
                    : current === 0
                    ? "I’m beside you throughout the training. Choose a common broker question or ask me in your own words."
                    : (COURSE[current]?.kind === "beat" ? "Supplied brochure facts on the left. Clear broker wording on the right." : COURSE[current]?.kind === "remember" ? "Pause and retain the three brochure points before testing." : "The teaching is complete. This screen checks the supplied content only.")}
                </p>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-500 px-1">Common broker questions</p>
                <div className="space-y-2">
                  {CLOEY_QUICK.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setSelectedQuick(q.id);
                        askCloey(q.q);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedQuick === q.id ? "bg-[#3b5a7d]/5 border-[#3b5a7d] shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
                    >
                      <span className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-[11px] font-bold ${selectedQuick === q.id ? "bg-[#3b5a7d] text-white shadow" : "bg-slate-100 text-slate-600"}`}>{q.id}</span>
                      <span className="flex-1 text-[13px] font-semibold leading-tight text-slate-800">{q.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-[#f0f5fa] border border-[#d7e1ec] border-l-4 border-l-[#3b5a7d]">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[#3b5a7d] mb-1">Cloey’s answer</p>
                  <p className="text-[13px] leading-relaxed text-slate-800 font-medium">{cloeyAnswer.answer}</p>
                  <p className="mt-2 text-[10px] tracking-wide uppercase font-semibold text-slate-500">{cloeyAnswer.source}</p>
                </div>
              </div>

              <div className="shrink-0 p-3 bg-white/80 backdrop-blur border-t border-slate-200/70">
                <p className="text-[10px] leading-snug text-slate-500 mb-2">Answers use a predefined Q&A map. Verify exact coverage against current approved policy wording.</p>
                <div className="flex gap-2">
                  <input
                    value={cloeyInput}
                    onChange={(e) => setCloeyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSelectedQuick(null);
                        askCloey(cloeyInput);
                      }
                    }}
                    placeholder="Type your question…"
                    className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-[13px] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b5a7d]/15 focus:border-[#3b5a7d] focus:bg-white"
                  />
                  <button onClick={() => { setSelectedQuick(null); askCloey(cloeyInput); }} className="px-4 rounded-xl bg-[#3b5a7d] text-white text-sm font-bold hover:bg-[#2f4a68] transition-colors flex items-center gap-1.5 shadow-md">
                    <Send className="w-4 h-4" />
                    Ask
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800;900&display=swap');
        .font-serif { font-family: "Newsreader", Georgia, serif; }
        .font-mono { font-family: "IBM Plex Mono", monospace; }
        @keyframes bars { 0%,100% { height: 6px; } 50% { height: 14px; } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out both; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        /* package grid from original know content */
        .package-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin: 8px 0; }
        .package-grid span { display: block; min-height: 110px; padding: 10px; border: 1px solid #d8e1ec; border-radius: 9px; background: #f7f9fc; font-size: 11px; line-height: 1.5; color: #334155; }
        .package-grid b { display: block; margin-bottom: 6px; color: #0a1e3b; font-family: "IBM Plex Mono", monospace; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; }
        .package-note { display: block; color: #64748b; font-size: 11px; line-height: 1.5; margin-top: 6px; }
        @media (max-width: 640px) { .package-grid { grid-template-columns: 1fr; } .package-grid span { min-height: auto; } }
      `}</style>
    </div>
  );
}
