'use client';

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import {
  Target,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Lock,
  Unlock,
  Eye,
  Sparkle,
  Bot,
  Send,
  Shield,
  ShieldAlert,
  Play,
  Square,
  Clock,
  Terminal,
  Cpu,
  Layers,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  point: number;
  hint: string | null;
  hintLevel1?: string | null;
  hintLevel2?: string | null;
  hintLevel3?: string | null;
  unlockedLevels?: number[];
  solved: boolean;
  solution: string | null;
}

interface UserDraft {
  id: string;
  generatedTitle: string;
  category: string;
  difficulty: string;
  status: string;
  promptInput: string;
}

interface GeneratedDraft extends UserDraft {
  generatedPoint: number;
  plainFlag: string;
  generatedDescription: string;
  generatedHint: string;
  generatedSolution: string;
}

interface TutorMessage {
  id?: string;
  role: 'USER' | 'TUTOR' | 'SYSTEM';
  content: string;
  flagged?: boolean;
}

function ChallengesContent() {
  const { user, refetchUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultTab = searchParams?.get('tab') || 'challenges';
  const defaultChallengeId = searchParams?.get('id') || null;

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Submission
  const [flagInput, setFlagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ text: string; success: boolean } | null>(null);

  // AI Tutor & Progressive Hint Ladder (F2)
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([]);
  const [hintTexts, setHintTexts] = useState<Record<number, string>>({});
  const [requestingHintLevel, setRequestingHintLevel] = useState<number | null>(null);
  const [tutorActiveTab, setTutorActiveTab] = useState<'hints' | 'chat'>('hints');

  // Interactive AI Tutor Chat (F2)
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorSending, setTutorSending] = useState(false);
  const [tutorProvider, setTutorProvider] = useState<string>('socratic-engine');
  const [guardAlert, setGuardAlert] = useState<string | null>(null);

  // Isolated Lab Container Manager (F4)
  const [labRunning, setLabRunning] = useState(false);
  const [labRemainingSeconds, setLabRemainingSeconds] = useState(0);
  const [labActionLoading, setLabActionLoading] = useState(false);

  // Solution unlock state
  const [solutionUnlocked, setSolutionUnlocked] = useState(false);

  // Copy state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Generator form state (CTFForge authoring)
  const [prompt, setPrompt] = useState('');
  const [genCategory, setGenCategory] = useState('WEB');
  const [genDifficulty, setGenDifficulty] = useState('EASY');
  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null);
  const [userDrafts, setUserDrafts] = useState<UserDraft[]>([]);

  // Interactive Lab state: SQLi
  const [sqliUsername, setSqliUsername] = useState('');
  const [sqliPassword, setSqliPassword] = useState('');
  const [sqliResult, setSqliResult] = useState<{ success: boolean; flag?: string; msg: string } | null>(null);

  // Interactive Lab state: IDOR
  const [idorId, setIdorId] = useState('3');
  const [idorResult, setIdorResult] = useState<{ success: boolean; flag?: string; content: string } | null>(null);

  // Interactive Lab state: XSS
  const [xssComment, setXssComment] = useState('');
  const [xssFeed, setXssFeed] = useState<string[]>(['Situs yang sangat menarik!', 'Halo admin, tolong cek akun saya.']);
  const [xssAlertTriggered, setXssAlertTriggered] = useState<{ success: boolean; flag?: string; cookieVal?: string } | null>(null);

  // Interactive Lab state: Caesar Cipher
  const [caesarInput, setCaesarInput] = useState('Fwi{f43s4r_c1ph3r_ghc0g3g}');
  const [caesarShift, setCaesarShift] = useState(23); // Shift -3 is +23
  const [caesarOutput, setCaesarOutput] = useState('');

  // Fetch challenges
  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch('/api/challenges');
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges);

        if (defaultChallengeId) {
          const matched = data.challenges.find((c: Challenge) => c.id === defaultChallengeId);
          if (matched) setSelectedChallenge(matched);
        }
      }
    } catch (err) {
      console.error('Error fetching challenges:', err);
    }
  }, [defaultChallengeId]);

  // Fetch drafts
  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch('/api/generate');
      if (res.ok) {
        const data = await res.json();
        setUserDrafts(data.drafts || []);
      }
    } catch (err) {
      console.error('Error fetching drafts:', err);
    }
  }, []);

  // Fetch tutor message history
  const fetchTutorHistory = useCallback(async (challengeId: string) => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/tutor`);
      if (res.ok) {
        const data = await res.json();
        setTutorMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching tutor messages:', err);
    }
  }, []);

  // Fetch unlocked hints
  const fetchUnlockedHints = useCallback(async (challengeId: string) => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/hint`);
      if (res.ok) {
        const data = await res.json();
        setUnlockedLevels(data.unlockedLevels || []);
      }
    } catch (err) {
      console.error('Error fetching unlocked hints:', err);
    }
  }, []);

  // Fetch lab status
  const fetchLabStatus = useCallback(async (challengeId: string) => {
    try {
      const res = await fetch(`/api/labs?challengeId=${challengeId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.active) {
          setLabRunning(true);
          setLabRemainingSeconds(data.remainingSeconds);
        } else {
          setLabRunning(false);
          setLabRemainingSeconds(0);
        }
      }
    } catch (err) {
      console.error('Error fetching lab status:', err);
    }
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      await Promise.all([fetchChallenges(), fetchDrafts()]);
    }
    loadInitialData();
  }, [fetchChallenges, fetchDrafts]);

  // When selected challenge changes, load tutor and lab states
  useEffect(() => {
    if (selectedChallenge) {
      fetchUnlockedHints(selectedChallenge.id);
      fetchTutorHistory(selectedChallenge.id);
      fetchLabStatus(selectedChallenge.id);
      setSolutionUnlocked(false);
      setSubmitMessage(null);
      setGuardAlert(null);
    }
  }, [selectedChallenge, fetchUnlockedHints, fetchTutorHistory, fetchLabStatus]);

  // Lab countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (labRunning && labRemainingSeconds > 0) {
      timer = setInterval(() => {
        setLabRemainingSeconds((prev) => {
          if (prev <= 1) {
            setLabRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [labRunning, labRemainingSeconds]);

  const handleSelectChallenge = (ch: Challenge) => {
    setSelectedChallenge(ch);
    setFlagInput('');
    setSubmitMessage(null);
    setGuardAlert(null);

    // Reset mini-labs
    setSqliUsername('');
    setSqliPassword('');
    setSqliResult(null);
    setIdorId('3');
    setIdorResult(null);
    setXssComment('');
    setXssAlertTriggered(null);
  };

  // Lab start/stop handler (Feature F4)
  const handleToggleLab = async () => {
    if (!selectedChallenge) return;
    setLabActionLoading(true);

    try {
      const action = labRunning ? 'stop' : 'start';
      const res = await fetch('/api/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: selectedChallenge.id, action }),
      });

      if (res.ok) {
        const data = await res.json();
        if (action === 'start') {
          setLabRunning(true);
          setLabRemainingSeconds(15 * 60);
        } else {
          setLabRunning(false);
          setLabRemainingSeconds(0);
        }
      }
    } catch (err) {
      console.error('Error toggling lab:', err);
    } finally {
      setLabActionLoading(false);
    }
  };

  // Progressive Hint request handler (Feature F2)
  const handleRequestHint = async (level: number) => {
    if (!selectedChallenge) return;
    setRequestingHintLevel(level);
    setGuardAlert(null);

    try {
      const res = await fetch(`/api/challenges/${selectedChallenge.id}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });

      const data = await res.json();

      if (res.ok) {
        setHintTexts((prev) => ({ ...prev, [level]: data.hint }));
        setUnlockedLevels(data.unlockedLevels || []);
        if (data.guardTriggered) {
          setGuardAlert('Output Guard aktif: Hint disaring untuk mencegah kebocoran flag.');
        }
      } else {
        alert(data.error || 'Gagal meminta hint.');
      }
    } catch (err) {
      console.error('Error requesting hint:', err);
      alert('Gagal menghubungi AI Tutor server.');
    } finally {
      setRequestingHintLevel(null);
    }
  };

  // Conversational AI Tutor Chat handler (Feature F2)
  const handleSendTutorChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge || !tutorInput.trim() || tutorSending) return;

    const userMsg = tutorInput.trim();
    setTutorInput('');
    setTutorSending(true);
    setGuardAlert(null);

    // Optimistic user message append
    setTutorMessages((prev) => [...prev, { role: 'USER', content: userMsg }]);

    try {
      const res = await fetch(`/api/challenges/${selectedChallenge.id}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await res.json();

      if (res.ok) {
        setTutorMessages((prev) => [
          ...prev,
          { role: 'TUTOR', content: data.reply, flagged: data.flagged },
        ]);
        setTutorProvider(data.provider);
        if (data.guardTriggered) {
          setGuardAlert('Peringatan: Upaya meminta flag langsung atau bypass dicegah oleh Security Guardrail.');
        }
      } else {
        setTutorMessages((prev) => [
          ...prev,
          { role: 'TUTOR', content: `[Galat]: ${data.error || 'Gagal memproses pesan.'}`, flagged: true },
        ]);
      }
    } catch {
      setTutorMessages((prev) => [
        ...prev,
        { role: 'TUTOR', content: '[Galat Jaringan]: Gagal menghubungi server tutor.', flagged: true },
      ]);
    } finally {
      setTutorSending(false);
    }
  };

  // Flag submission handler (Feature F1)
  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge || !flagInput.trim()) return;
    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch(`/api/challenges/${selectedChallenge.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: flagInput.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.status === 'CORRECT') {
          setSubmitMessage({ text: data.message, success: true });
          await fetchChallenges();
          setSelectedChallenge((prev) => (prev ? { ...prev, solved: true } : null));
          await refetchUser();

          if (data.badgeAwarded) {
            alert(`🏆 SELAMAT! Anda memperoleh lencana baru: "${data.badgeAwarded.name}" - ${data.badgeAwarded.description}`);
          }
        } else {
          setSubmitMessage({ text: data.message, success: false });
        }
      } else {
        setSubmitMessage({ text: data.error || 'Terjadi kesalahan.', success: false });
      }
    } catch {
      setSubmitMessage({ text: 'Gagal menghubungi server.', success: false });
    } finally {
      setSubmitting(false);
    }
  };

  // Mini-Labs Handlers (Feature F4)
  const runSqliLab = (e: React.FormEvent) => {
    e.preventDefault();
    const userLower = sqliUsername.toLowerCase();
    const containsSqli =
      userLower.includes("'") &&
      (userLower.includes('or') || userLower.includes('--') || userLower.includes('#'));

    if (containsSqli || userLower === 'admin') {
      setSqliResult({
        success: true,
        flag: 'CTF{sqli_l0g1n_byp4ss_succ3ss}',
        msg: "Query dieksekusi: SELECT * FROM admin_users WHERE username = 'admin' OR '1'='1' AND password = ''. Otentikasi BERHASIL sebagai Administrator!",
      });
    } else {
      setSqliResult({
        success: false,
        msg: `Query dieksekusi: SELECT * FROM admin_users WHERE username = '${sqliUsername}' AND password = '${sqliPassword}'. Otentikasi GAGAL. Password tidak valid.`,
      });
    }
  };

  const runIdorLab = () => {
    const idNum = parseInt(idorId);
    if (idNum === 1) {
      setIdorResult({
        success: true,
        flag: 'CTF{id0r_f1l3_4cc3ss_n30n}',
        content:
          'SLIP GAJI ADMINISTRATOR UTAMA (CONFIDENTIAL). Nama: Administrator, Jabatan: Chief Security Officer, Gaji Bersih: Rp 75.000.000, Catatan Khusus: Gunakan flag ini untuk submit tantangan.',
      });
    } else if (idNum === 3) {
      setIdorResult({
        success: false,
        content:
          'SLIP GAJI AGEN-3. Nama: Cyber Cadet, Jabatan: Security Analyst Intern, Gaji Bersih: Rp 5.000.000, Catatan: Tidak ada dokumen rahasia di slip gaji Anda.',
      });
    } else {
      setIdorResult({
        success: false,
        content: `Error 404: Dokumen ID ${idorId} tidak ditemukan. (ID slip gaji yang valid adalah 1 dan 3).`,
      });
    }
  };

  const runXssLab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!xssComment.trim()) return;

    setXssFeed((prev) => [...prev, xssComment]);

    // Check if contains script execution
    const lower = xssComment.toLowerCase();
    if (
      lower.includes('<script>') ||
      lower.includes('alert') ||
      lower.includes('document.cookie') ||
      lower.includes('onerror=') ||
      lower.includes('onload=')
    ) {
      setXssAlertTriggered({
        success: true,
        cookieVal: 'admin_session_token=secret_admin_hash_998',
        flag: 'CTF{st0r3d_xss_g3stb00k_c00k13_st3al}',
      });
    } else {
      setXssAlertTriggered(null);
    }
    setXssComment('');
  };

  // Generator submit (CTFForge)
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setGeneratedDraft(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, category: genCategory, difficulty: genDifficulty }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedDraft(data.draft);
        fetchDrafts();
        setPrompt('');
      } else {
        const errData = await res.json();
        alert(errData.error || 'Gagal generate draft.');
      }
    } catch (err) {
      console.error('Error generating challenge:', err);
    } finally {
      setGenerating(false);
    }
  };

  const filteredChallenges = challenges.filter((ch) =>
    categoryFilter === 'ALL' ? true : ch.category === categoryFilter
  );

  return (
    <div className="min-h-screen bg-cyber-bg text-gray-200 flex flex-col scanline cyber-grid pb-12">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full flex-1 flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-900 mb-8 font-mono text-sm gap-2">
          <button
            onClick={() => {
              setActiveTab('challenges');
              router.push('/challenges?tab=challenges');
            }}
            className={`pb-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'challenges'
                ? 'border-cyber-green text-cyber-green glow-green'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            <Target className="h-4 w-4" />
            CTF Challenges & AI Tutor
          </button>
          <button
            onClick={() => {
              setActiveTab('generator');
              router.push('/challenges?tab=generator');
            }}
            className={`pb-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'generator'
                ? 'border-cyber-purple text-cyber-purple glow-purple'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Challenge Forge (Draf Generator)
          </button>
        </div>

        {/* Tab 1: CTF CHALLENGES & AI TUTOR */}
        {activeTab === 'challenges' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
            {/* LEFT COLUMN: Challenge List & Filter (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                {['ALL', 'WEB', 'CRYPTO', 'FORENSICS', 'REV', 'OSINT'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1.5 rounded transition-all cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-purple-500/20 text-cyber-green border border-purple-500/40 font-bold'
                        : 'bg-zinc-950 text-gray-500 border border-zinc-900 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Challenge List Box */}
              <div className="cyber-panel p-3.5 rounded-xl border border-purple-500/15 max-h-[70vh] overflow-y-auto space-y-2">
                {filteredChallenges.length > 0 ? (
                  filteredChallenges.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChallenge(ch)}
                      className={`w-full text-left p-3 rounded-lg border font-mono transition-all flex justify-between items-center cursor-pointer ${
                        selectedChallenge?.id === ch.id
                          ? 'bg-purple-500/10 text-cyber-green border-purple-500/35 glow-green'
                          : 'bg-zinc-950/30 text-gray-400 hover:text-white border-zinc-900/60 hover:border-zinc-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs truncate max-w-[170px] sm:max-w-xs">{ch.title}</div>
                        <div className="flex gap-2 items-center mt-1 text-[9px] text-gray-500">
                          <span className="text-purple-400 uppercase">{ch.category}</span>
                          <span>•</span>
                          <span
                            className={`font-bold ${
                              ch.difficulty === 'EASY'
                                ? 'text-cyber-green'
                                : ch.difficulty === 'MEDIUM'
                                ? 'text-amber-500'
                                : 'text-cyber-red'
                            }`}
                          >
                            {ch.difficulty}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs font-bold text-cyber-green">{ch.point} pts</span>
                        {ch.solved && <CheckCircle2 className="h-4 w-4 text-cyber-green" />}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-xs text-gray-500 font-mono">
                    Tidak ada tantangan dalam kategori ini.
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Challenge Workspace & AI Tutor (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {selectedChallenge ? (
                <div className="space-y-6">
                  {/* Challenge Header & Description Panel */}
                  <div className="cyber-panel p-6 rounded-2xl border border-purple-500/15 space-y-4">
                    <div className="flex justify-between items-start border-b border-zinc-900 pb-3">
                      <div>
                        <h2 className="font-mono text-lg font-bold text-white">{selectedChallenge.title}</h2>
                        <div className="flex gap-2 items-center text-[10px] font-mono mt-1 text-gray-400">
                          <span className="uppercase text-purple-400 font-bold">{selectedChallenge.category}</span>
                          <span>•</span>
                          <span
                            className={`font-bold ${
                              selectedChallenge.difficulty === 'EASY'
                                ? 'text-cyber-green'
                                : selectedChallenge.difficulty === 'MEDIUM'
                                ? 'text-amber-500'
                                : 'text-cyber-red'
                            }`}
                          >
                            {selectedChallenge.difficulty}
                          </span>
                          <span>•</span>
                          <span>Skor Maksimal: {selectedChallenge.point} pts</span>
                        </div>
                      </div>

                      {selectedChallenge.solved && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-cyber-green font-bold bg-cyber-green/10 px-2.5 py-1 rounded border border-cyber-green/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          SOLVED
                        </span>
                      )}
                    </div>

                    {/* Challenge Description */}
                    <div className="prose prose-invert max-w-none text-xs font-mono leading-relaxed text-gray-300">
                      {selectedChallenge.description.split('\n').map((line, idx) => {
                        if (line.startsWith('### '))
                          return (
                            <h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1.5">
                              {line.replace('### ', '')}
                            </h3>
                          );
                        if (line.startsWith('```')) return null;
                        if (line.startsWith('Fwi{'))
                          return (
                            <pre key={idx} className="bg-zinc-950 p-2 rounded border border-zinc-900 my-1 text-cyber-purple">
                              {line}
                            </pre>
                          );
                        const cleanLine = line
                          .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
                          .replace(
                            /`([^`]+)`/g,
                            '<code class="bg-zinc-950 px-1 py-0.5 rounded text-cyber-green text-[10px] border border-zinc-900">$1</code>'
                          );
                        return <p key={idx} className="my-1" dangerouslySetInnerHTML={{ __html: cleanLine }} />;
                      })}
                    </div>

                    {/* Feature F4: Isolated Lab Container Status Bar */}
                    <div className="mt-4 p-3 bg-zinc-950 rounded-xl border border-zinc-900 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            labRunning ? 'bg-cyber-green animate-ping' : 'bg-gray-600'
                          }`}
                        ></div>
                        <span className="text-gray-400">Status Lab Terisolasi:</span>
                        <span className={`font-bold ${labRunning ? 'text-cyber-green' : 'text-gray-500'}`}>
                          {labRunning ? 'RUNNING (Aktif)' : 'STOPPED'}
                        </span>
                        {labRunning && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            {Math.floor(labRemainingSeconds / 60)}:
                            {String(labRemainingSeconds % 60).padStart(2, '0')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleToggleLab}
                          disabled={labActionLoading}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            labRunning
                              ? 'bg-cyber-red/20 text-cyber-red border border-cyber-red/30 hover:bg-cyber-red/30'
                              : 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30 hover:bg-cyber-green/30'
                          }`}
                        >
                          {labRunning ? (
                            <>
                              <Square className="h-3 w-3" /> Hentikan Lab
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" /> Mulai Lab Terisolasi
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* INTERACTIVE PLAYGROUND LAB BOX (F4) */}
                  <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-900 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div className="flex items-center gap-1.5 text-cyber-green font-mono text-[10px] font-bold tracking-wider uppercase">
                        <Terminal className="h-3.5 w-3.5 animate-pulse" />
                        Interactive Lab Playground (Sandbox Simulasi)
                      </div>
                      <span className="text-[9px] font-mono text-gray-500">Lingkungan Terisolasi</span>
                    </div>

                    {/* SQL Injection Lab form */}
                    {selectedChallenge.title === 'SQL Injection: Login Bypass' && (
                      <form onSubmit={runSqliLab} className="space-y-3 font-mono text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-gray-500 block mb-1">Username</label>
                            <input
                              type="text"
                              value={sqliUsername}
                              onChange={(e) => setSqliUsername(e.target.value)}
                              placeholder="admin' OR '1'='1"
                              className="w-full bg-cyber-bg border border-zinc-800 rounded p-2 text-white focus:border-cyber-green/40"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-gray-500 block mb-1">Password</label>
                            <input
                              type="text"
                              value={sqliPassword}
                              onChange={(e) => setSqliPassword(e.target.value)}
                              placeholder="apapun"
                              className="w-full bg-cyber-bg border border-zinc-800 rounded p-2 text-white focus:border-cyber-green/40"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all text-[10px] cursor-pointer"
                        >
                          Kirim Payload Login
                        </button>

                        {sqliResult && (
                          <div
                            className={`p-3 rounded border font-mono text-[10px] mt-3 ${
                              sqliResult.success
                                ? 'bg-cyber-green/10 border-cyber-green/20 text-cyber-green'
                                : 'bg-cyber-red/10 border-cyber-red/20 text-cyber-red'
                            }`}
                          >
                            <p className="leading-relaxed">{sqliResult.msg}</p>
                            {sqliResult.success && sqliResult.flag && (
                              <div className="mt-2 p-2 bg-zinc-950 rounded border border-cyber-green/40 font-bold select-all flex justify-between items-center">
                                <span>FLAG: {sqliResult.flag}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(sqliResult.flag || '')}
                                  className="text-[8px] text-cyber-green hover:text-white bg-cyber-green/10 hover:bg-cyber-green/20 px-2 py-1 rounded border border-cyber-green/30 uppercase cursor-pointer transition-all"
                                >
                                  {copiedText === sqliResult.flag ? 'Tersalin!' : 'Salin Flag'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </form>
                    )}

                    {/* IDOR Lab form */}
                    {selectedChallenge.title === 'Insecure Direct Object Reference (IDOR)' && (
                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex gap-2 items-center flex-wrap">
                          <span className="text-gray-500 font-bold">GET</span>
                          <span className="bg-zinc-900 px-2 py-1 rounded text-gray-400">
                            /api/invoice/download?id=
                          </span>
                          <input
                            type="number"
                            value={idorId}
                            onChange={(e) => setIdorId(e.target.value)}
                            className="bg-cyber-bg border border-zinc-800 rounded p-1.5 w-16 text-white text-center focus:border-cyber-green/40"
                            min={0}
                            required
                          />
                          <button
                            onClick={runIdorLab}
                            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all text-[10px] cursor-pointer"
                          >
                            Kirim Permintaan
                          </button>
                        </div>

                        {idorResult && (
                          <div className="p-3 bg-zinc-950 rounded border border-zinc-900 text-[10px] space-y-2 leading-relaxed">
                            <p className={idorResult.success ? 'text-cyber-green' : 'text-gray-400'}>
                              {idorResult.content}
                            </p>
                            {idorResult.success && idorResult.flag && (
                              <div className="mt-2 p-2 bg-zinc-950 rounded border border-cyber-green/40 font-bold select-all flex justify-between items-center text-cyber-green">
                                <span>FLAG: {idorResult.flag}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(idorResult.flag || '')}
                                  className="text-[8px] text-cyber-green hover:text-white bg-cyber-green/10 hover:bg-cyber-green/20 px-2 py-1 rounded border border-cyber-green/30 uppercase cursor-pointer transition-all"
                                >
                                  {copiedText === idorResult.flag ? 'Tersalin!' : 'Salin Flag'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* XSS Lab form */}
                    {selectedChallenge.title === 'Cross-Site Scripting (XSS): Guestbook' && (
                      <div className="space-y-3 font-mono text-xs">
                        <form onSubmit={runXssLab} className="space-y-2">
                          <label className="text-gray-500 block text-[10px]">Kirim Komentar ke Buku Tamu:</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={xssComment}
                              onChange={(e) => setXssComment(e.target.value)}
                              placeholder="<script>alert(document.cookie)</script>"
                              className="flex-1 bg-cyber-bg border border-zinc-800 rounded p-2 text-white text-xs focus:border-cyber-green/40"
                              required
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all text-[10px] cursor-pointer"
                            >
                              Kirim
                            </button>
                          </div>
                        </form>

                        {/* Guestbook preview */}
                        <div className="p-2.5 bg-zinc-950 rounded border border-zinc-900 space-y-1 text-[10px] max-h-24 overflow-y-auto">
                          <div className="text-gray-500 font-bold mb-1">Daftar Komentar Tersimpan:</div>
                          {xssFeed.map((item, idx) => (
                            <div key={idx} className="text-gray-300 border-b border-zinc-900/50 pb-1">
                              • {item}
                            </div>
                          ))}
                        </div>

                        {xssAlertTriggered && (
                          <div className="p-3 bg-cyber-green/10 border border-cyber-green/30 text-cyber-green rounded text-[10px] space-y-2">
                            <div className="font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4" />
                              Bot Administrator Membuka Halaman Guestbook & Script Berhasil Dijalankan!
                            </div>
                            <div>Nilai Cookie Terekstrak: {xssAlertTriggered.cookieVal}</div>
                            <div className="mt-2 p-2 bg-zinc-950 rounded border border-cyber-green/40 font-bold select-all flex justify-between items-center">
                              <span>FLAG: {xssAlertTriggered.flag}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(xssAlertTriggered.flag || '')}
                                className="text-[8px] text-cyber-green hover:text-white bg-cyber-green/10 hover:bg-cyber-green/20 px-2 py-1 rounded border border-cyber-green/30 uppercase cursor-pointer transition-all"
                              >
                                {copiedText === xssAlertTriggered.flag ? 'Tersalin!' : 'Salin Flag'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Caesar Cipher Decoder Workbench */}
                    {selectedChallenge.title === 'Caesar Cipher: Secret Scroll' && (
                      <div className="space-y-3 font-mono text-xs">
                        <div>
                          <label className="text-gray-500 block mb-1">Ciphertext Target:</label>
                          <div className="p-2 bg-zinc-950 rounded border border-zinc-800 text-purple-400 select-all">
                            Fwi{'{'}f43s4r_c1ph3r_ghc0g3g{'}'}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-gray-500 text-[10px]">Rotasi Caesar (Shift):</label>
                          <input
                            type="range"
                            min={0}
                            max={25}
                            value={caesarShift}
                            onChange={(e) => {
                              const s = parseInt(e.target.value);
                              setCaesarShift(s);
                              // Calculate rotation
                              const out = caesarInput
                                .split('')
                                .map((ch) => {
                                  const c = ch.charCodeAt(0);
                                  if (c >= 65 && c <= 90) return String.fromCharCode(((c - 65 + s) % 26) + 65);
                                  if (c >= 97 && c <= 122) return String.fromCharCode(((c - 97 + s) % 26) + 97);
                                  return ch;
                                })
                                .join('');
                              setCaesarOutput(out);
                            }}
                            className="flex-1 accent-purple-500"
                          />
                          <span className="text-cyber-green font-bold text-xs">{caesarShift} (atau -{26 - caesarShift})</span>
                        </div>

                        <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 text-xs">
                          <span className="text-gray-500 block text-[9px] mb-1">HASIL ROTASI REAL-TIME:</span>
                          <span className="text-cyber-green font-bold select-all">
                            {caesarOutput || 'Geser slider di atas untuk mendekripsi pesan kuno.'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submission Form (Feature F1) */}
                  <form onSubmit={handleFlagSubmit} className="cyber-panel p-5 rounded-xl border border-zinc-900 space-y-3 font-mono text-xs">
                    <label className="text-gray-400 uppercase tracking-wider block font-bold">
                      Kirim Jawaban Flag (Validasi Hash)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={flagInput}
                        onChange={(e) => setFlagInput(e.target.value)}
                        placeholder="CTF{format_bendera_disini}"
                        className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 focus:border-cyber-green/50 text-white placeholder-gray-700 transition-all text-xs"
                        required
                        disabled={submitting || selectedChallenge.solved}
                      />
                      <button
                        type="submit"
                        className="px-6 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all border border-purple-500/40 hover:border-cyber-green/50 disabled:bg-zinc-900 disabled:text-gray-600 disabled:border-transparent cursor-pointer"
                        disabled={submitting || selectedChallenge.solved}
                      >
                        {submitting ? 'Verifying...' : 'Kirim Flag'}
                      </button>
                    </div>

                    {submitMessage && (
                      <div
                        className={`p-3 rounded-lg border font-bold ${
                          submitMessage.success
                            ? 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green'
                            : 'bg-cyber-red/10 border-cyber-red/30 text-cyber-red'
                        }`}
                      >
                        {submitMessage.text}
                      </div>
                    )}
                  </form>

                  {/* FEATURE F2: AI TUTOR PANEL WITH HINT LADDER & SOCRATIC CHAT */}
                  <div className="cyber-panel p-6 rounded-2xl border border-purple-500/20 space-y-4 font-mono">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                          <Bot className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-1.5">
                            ForgeTutor AI Assistant
                            <span className="text-[9px] bg-cyber-green/15 text-cyber-green px-1.5 py-0.5 rounded border border-cyber-green/20">
                              Active Guardrail
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Bimbingan Socratic bertingkat tanpa membocorkan flag
                          </div>
                        </div>
                      </div>

                      {/* Mode Switcher */}
                      <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800 text-[10px]">
                        <button
                          onClick={() => setTutorActiveTab('hints')}
                          className={`px-3 py-1 rounded transition-all cursor-pointer ${
                            tutorActiveTab === 'hints'
                              ? 'bg-purple-600 text-white font-bold'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Tangga Hint (L1-L3)
                        </button>
                        <button
                          onClick={() => setTutorActiveTab('chat')}
                          className={`px-3 py-1 rounded transition-all cursor-pointer ${
                            tutorActiveTab === 'chat'
                              ? 'bg-purple-600 text-white font-bold'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Tanya AI Tutor
                        </button>
                      </div>
                    </div>

                    {/* Guard Alert Notification */}
                    {guardAlert && (
                      <div className="p-3 bg-cyber-red/10 border border-cyber-red/30 rounded-lg text-cyber-red text-xs flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                        <span>{guardAlert}</span>
                      </div>
                    )}

                    {/* TAB A: 3-TIER PROGRESSIVE HINT LADDER */}
                    {tutorActiveTab === 'hints' && (
                      <div className="space-y-3">
                        <div className="text-[10px] text-gray-400 leading-relaxed">
                          Petunjuk dirancang bertahap (Socratic Ladder). Anda harus membuka Level 1 terlebih dahulu
                          sebelum Level 2 dan 3 untuk memastikan proses belajar berjalan optimal.
                        </div>

                        {/* Hint Level 1 */}
                        <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-900 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-cyber-green font-bold text-xs">LEVEL 1:</span>
                              <span className="text-white font-bold">Konsep & Teori Dasar</span>
                              <span className="text-[9px] text-gray-500">(-5 Pts)</span>
                            </div>

                            {unlockedLevels.includes(1) ? (
                              <span className="text-[9px] text-cyber-green font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Terbuka
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRequestHint(1)}
                                disabled={requestingHintLevel === 1}
                                className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                              >
                                {requestingHintLevel === 1 ? 'Membuka...' : 'Buka Hint Level 1'}
                              </button>
                            )}
                          </div>

                          {(unlockedLevels.includes(1) || hintTexts[1]) && (
                            <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 text-gray-300 leading-relaxed text-[11px] mt-2">
                              {hintTexts[1] || selectedChallenge.hintLevel1 || selectedChallenge.hint}
                            </div>
                          )}
                        </div>

                        {/* Hint Level 2 */}
                        <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-900 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-500 font-bold text-xs">LEVEL 2:</span>
                              <span className="text-white font-bold">Arah Pengamatan</span>
                              <span className="text-[9px] text-gray-500">(-15 Pts)</span>
                            </div>

                            {unlockedLevels.includes(2) ? (
                              <span className="text-[9px] text-cyber-green font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Terbuka
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRequestHint(2)}
                                disabled={!unlockedLevels.includes(1) || requestingHintLevel === 2}
                                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                                  unlockedLevels.includes(1)
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                                    : 'bg-zinc-900 text-gray-600 border border-zinc-800 cursor-not-allowed'
                                }`}
                              >
                                {requestingHintLevel === 2
                                  ? 'Membuka...'
                                  : unlockedLevels.includes(1)
                                  ? 'Buka Hint Level 2'
                                  : 'Terkunci (Buka L1 Dahulu)'}
                              </button>
                            )}
                          </div>

                          {(unlockedLevels.includes(2) || hintTexts[2]) && (
                            <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 text-gray-300 leading-relaxed text-[11px] mt-2">
                              {hintTexts[2] || selectedChallenge.hintLevel2 || 'Periksa parameter URL atau query form.'}
                            </div>
                          )}
                        </div>

                        {/* Hint Level 3 */}
                        <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-900 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-cyber-red font-bold text-xs">LEVEL 3:</span>
                              <span className="text-white font-bold">Langkah Umum & Metodologi</span>
                              <span className="text-[9px] text-gray-500">(-30 Pts)</span>
                            </div>

                            {unlockedLevels.includes(3) ? (
                              <span className="text-[9px] text-cyber-green font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Terbuka
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRequestHint(3)}
                                disabled={
                                  !unlockedLevels.includes(1) ||
                                  !unlockedLevels.includes(2) ||
                                  requestingHintLevel === 3
                                }
                                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                                  unlockedLevels.includes(1) && unlockedLevels.includes(2)
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                                    : 'bg-zinc-900 text-gray-600 border border-zinc-800 cursor-not-allowed'
                                }`}
                              >
                                {requestingHintLevel === 3
                                  ? 'Membuka...'
                                  : unlockedLevels.includes(1) && unlockedLevels.includes(2)
                                  ? 'Buka Hint Level 3'
                                  : 'Terkunci (Buka L1 & L2)'}
                              </button>
                            )}
                          </div>

                          {(unlockedLevels.includes(3) || hintTexts[3]) && (
                            <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 text-gray-300 leading-relaxed text-[11px] mt-2">
                              {hintTexts[3] || selectedChallenge.hintLevel3 || 'Gunakan alur pengujian metodologis.'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB B: INTERACTIVE SOCRATIC CHAT */}
                    {tutorActiveTab === 'chat' && (
                      <div className="space-y-3">
                        {/* Chat history display */}
                        <div className="bg-zinc-950/90 rounded-xl border border-zinc-900 p-3 h-56 overflow-y-auto space-y-2 text-xs">
                          {tutorMessages.length > 0 ? (
                            tutorMessages.map((msg, i) => (
                              <div
                                key={i}
                                className={`p-2.5 rounded-lg leading-relaxed ${
                                  msg.role === 'USER'
                                    ? 'bg-purple-500/10 text-white border border-purple-500/20 ml-6 text-right'
                                    : msg.flagged
                                    ? 'bg-cyber-red/10 border border-cyber-red/30 text-cyber-red mr-6'
                                    : 'bg-zinc-900/80 text-gray-200 border border-zinc-800 mr-6'
                                }`}
                              >
                                <div className="text-[9px] font-bold uppercase mb-0.5 text-gray-500">
                                  {msg.role === 'USER' ? 'Anda' : 'ForgeTutor'}
                                </div>
                                <div className="whitespace-pre-wrap text-[11px]">{msg.content}</div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-10 text-gray-500 text-xs">
                              Belum ada percakapan. Tanyakan seputar konsep atau arah investigasi soal ini.
                            </div>
                          )}
                        </div>

                        {/* Quick Prompts */}
                        <div className="flex gap-2 flex-wrap text-[10px]">
                          <button
                            type="button"
                            onClick={() => setTutorInput('Jelaskan konsep dasar kerentanan ini secara sederhana.')}
                            className="px-2 py-1 bg-zinc-950 rounded border border-zinc-800 text-gray-400 hover:text-white cursor-pointer"
                          >
                            Apa konsep dasarnya?
                          </button>
                          <button
                            type="button"
                            onClick={() => setTutorInput('Parameter atau input mana yang perlu saya periksa?')}
                            className="px-2 py-1 bg-zinc-950 rounded border border-zinc-800 text-gray-400 hover:text-white cursor-pointer"
                          >
                            Bagian mana yang diamati?
                          </button>
                          <button
                            type="button"
                            onClick={() => setTutorInput('Tools apa yang direkomendasikan untuk tantangan ini?')}
                            className="px-2 py-1 bg-zinc-950 rounded border border-zinc-800 text-gray-400 hover:text-white cursor-pointer"
                          >
                            Tools yang dipakai?
                          </button>
                        </div>

                        {/* Chat input form */}
                        <form onSubmit={handleSendTutorChat} className="flex gap-2">
                          <input
                            type="text"
                            value={tutorInput}
                            onChange={(e) => setTutorInput(e.target.value)}
                            placeholder="Tanya konsep atau petunjuk pada AI Tutor..."
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:border-purple-500/50"
                            disabled={tutorSending}
                          />
                          <button
                            type="submit"
                            disabled={tutorSending || !tutorInput.trim()}
                            className="px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Solution Writeup Drawer (Unlocked after solve or admin) */}
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 font-mono text-xs">
                    {selectedChallenge.solved || user?.role === 'ADMIN' ? (
                      solutionUnlocked ? (
                        <div className="space-y-2">
                          <div className="text-cyber-green font-bold">Writeup Resmi & Pembahasan Lengkap:</div>
                          <div className="p-3 bg-zinc-900/60 rounded border border-zinc-800 text-gray-300 whitespace-pre-wrap text-[11px] leading-relaxed">
                            {selectedChallenge.solution || 'Belum ada pembahasan yang dimasukkan.'}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSolutionUnlocked(true)}
                          className="w-full text-left flex items-center justify-between text-gray-400 hover:text-white cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 text-cyber-green font-bold">
                            <Eye className="h-4 w-4" /> Buka Pembahasan / Official Writeup
                          </span>
                          <Unlock className="h-3.5 w-3.5" />
                        </button>
                      )
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-600 text-[11px]">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Selesaikan tantangan untuk membuka Pembahasan / Writeup resmi.</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="cyber-panel p-12 rounded-2xl border border-purple-500/15 text-center text-gray-500 font-mono text-xs py-24">
                  Pilih tantangan pada daftar di sebelah kiri untuk membuka sandbox lab dan berinteraksi dengan AI Tutor.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: CHALLENGE GENERATOR (CTFFORGE) */}
        {activeTab === 'generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
            {/* Form Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="cyber-panel p-6 rounded-2xl border border-purple-500/20 space-y-4">
                <h3 className="font-mono text-sm font-bold text-white flex items-center gap-1.5 border-b border-zinc-900 pb-2.5">
                  <Sparkle className="h-4 w-4 text-cyber-purple animate-pulse" />
                  Forge Challenge Assistant
                </h3>
                <p className="text-xs text-gray-400 font-mono leading-relaxed">
                  Gunakan template-driven AI Generator kami untuk merancang draf soal latihan baru secara instan.
                  Draf yang digenerate akan disimpan ke antrean review Admin sebelum dipublikasikan secara live.
                </p>

                <form onSubmit={handleGenerate} className="space-y-4 font-mono text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-500 block">Kategori</label>
                    <select
                      value={genCategory}
                      onChange={(e) => setGenCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-cyber-purple/40"
                    >
                      <option value="WEB">WEB EXPLOITATION</option>
                      <option value="CRYPTO">CRYPTOGRAPHY</option>
                      <option value="FORENSICS">FORENSICS</option>
                      <option value="OSINT">OSINT</option>
                      <option value="MISC">MISCELLANEOUS</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 block">Tingkat Kesulitan</label>
                    <select
                      value={genDifficulty}
                      onChange={(e) => setGenDifficulty(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-cyber-purple/40"
                    >
                      <option value="EASY">EASY (50 Pts)</option>
                      <option value="MEDIUM">MEDIUM (150 Pts)</option>
                      <option value="HARD">HARD (300 Pts)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 block">Instruksi / Prompt Pembuatan</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Contoh: 'SQL Injection auth bypass basic' atau 'Caesar Cipher shift 5 klasik'"
                      rows={3}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white placeholder-gray-700 focus:border-cyber-purple/40 resize-none"
                      required
                      disabled={generating}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded bg-cyber-purple text-white font-bold transition-all border border-purple-500/40 hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer glow-purple"
                    disabled={generating}
                  >
                    {generating ? 'Generating Draft...' : 'Generate Challenge Draft'}
                  </button>
                </form>
              </div>

              {/* Drafts List */}
              <div className="cyber-panel p-6 rounded-2xl border border-purple-500/15 space-y-4">
                <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-zinc-900 pb-2">
                  Antrean Draf Anda ({userDrafts.length})
                </h3>

                <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-[10px]">
                  {userDrafts.length > 0 ? (
                    userDrafts.map((d) => (
                      <div key={d.id} className="p-2.5 rounded bg-zinc-950 border border-zinc-900 flex justify-between items-center">
                        <div>
                          <div className="text-white font-bold">{d.generatedTitle}</div>
                          <div className="text-gray-500 mt-0.5">Prompt: &quot;{d.promptInput}&quot;</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[8px] ${
                            d.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                              : d.status === 'APPROVED'
                              ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20'
                              : 'bg-cyber-red/10 text-cyber-red border border-cyber-red/20'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 font-mono">Belum ada draf diajukan.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Draft Output Preview */}
            <div className="lg:col-span-7">
              {generatedDraft ? (
                <div className="cyber-panel p-6 rounded-2xl border border-purple-500/30 space-y-4 font-mono text-xs">
                  <div className="p-3 bg-cyber-green/10 border border-cyber-green/30 text-cyber-green rounded-lg flex gap-2.5 items-start">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Draf Berhasil Dibuat & Dikirim!</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Permintaan draf tantangan Anda telah didaftarkan ke antrean review Admin.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="border-b border-zinc-900 pb-2">
                      <div className="text-gray-500 text-[10px]">JUDUL SOAL</div>
                      <div className="text-sm font-bold text-white mt-0.5">{generatedDraft.generatedTitle}</div>
                    </div>

                    <div className="p-3 rounded bg-zinc-950 border border-cyber-green/30 text-cyber-green flex justify-between items-center">
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold mb-1">
                          BENDERA FLAG (PLAIN TEXT - HANYA DITAMPILKAN SEKALI)
                        </div>
                        <span className="text-sm font-bold select-all">{generatedDraft.plainFlag}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(generatedDraft.plainFlag)}
                        className="text-[8px] text-cyber-green hover:text-white bg-cyber-green/10 hover:bg-cyber-green/20 px-2 py-1 rounded border border-cyber-green/30 uppercase cursor-pointer"
                      >
                        {copiedText === generatedDraft.plainFlag ? 'Tersalin!' : 'Salin Flag'}
                      </button>
                    </div>

                    <div>
                      <div className="text-gray-500 text-[10px] mb-1">DESKRIPSI TANTANGAN</div>
                      <div className="p-3 rounded bg-zinc-950 border border-zinc-900 text-gray-400 max-h-36 overflow-y-auto leading-relaxed">
                        {generatedDraft.generatedDescription.split('\n').map((line, i) => (
                          <p key={i} className="my-0.5">{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cyber-panel p-8 rounded-2xl border border-purple-500/15 text-center text-gray-500 font-mono text-xs py-16">
                  Buat draf tantangan baru di formulir sebelah kiri untuk melihat hasil generate draf secara detail.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ChallengesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cyber-bg text-gray-200 flex flex-col scanline cyber-grid">
          <Navbar />
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyber-green"></div>
          </div>
        </div>
      }
    >
      <ChallengesContent />
    </Suspense>
  );
}
