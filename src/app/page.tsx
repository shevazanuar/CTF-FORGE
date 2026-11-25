import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Target, Bot, Compass, Terminal, ChevronRight, Sparkles, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  const pillars = [
    {
      title: 'Validasi Flag Hash & Rate Limit',
      desc: 'Validasi jawaban flag dengan hashing bcrypt di server, pembatasan brute force laju submit, dan perlindungan poin anti-duplikasi.',
      icon: Target,
      color: 'text-cyber-green',
      borderColor: 'border-cyber-green/20',
      bgColor: 'bg-cyber-green/5',
    },
    {
      title: 'AI Tutor & Hint Bertingkat',
      desc: 'Bimbingan Socratic bertingkat (Konsep -> Arah -> Langkah Umum) dilengkapi Security Output Guard anti-bocor flag.',
      icon: Bot,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      bgColor: 'bg-purple-500/5',
    },
    {
      title: 'Jalur Belajar & Progres',
      desc: 'Kurikulum bertahap (Web, Crypto, Forensics, Reverse Engineering) dengan pelacakan progres capaian persentase dan lencana.',
      icon: Compass,
      color: 'text-cyber-blue',
      borderColor: 'border-cyber-blue/20',
      bgColor: 'bg-cyber-blue/5',
    },
    {
      title: 'Lab Terisolasi per Tantangan',
      desc: 'Lingkungan lab praktikum sandbox terisolasi per soal (SQLi, IDOR, XSS, Crypto) dengan batas waktu sesi aktif 15 menit.',
      icon: Terminal,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      bgColor: 'bg-amber-500/5',
    },
  ];

  return (
    <div className="min-h-screen bg-cyber-bg text-gray-200 flex flex-col scanline cyber-grid">
      <Navbar />

      {/* Hero Section */}
      <section className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 flex flex-col items-center justify-center text-center relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl -z-10"></div>
        <div className="absolute top-1/3 left-1/3 w-60 h-60 rounded-full bg-cyber-green/5 blur-3xl -z-10"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-xs font-mono text-purple-400 mb-6 tracking-wide animate-pulse">
          <ShieldCheck className="h-3.5 w-3.5 text-cyber-green glow-green" />
          <span>Tugas Proyek Ethical Hacking — Tema 20: CTF Learning Platform dengan AI Tutor</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-mono font-bold tracking-tight text-white mb-6 max-w-4xl leading-tight">
          Platform Pembelajaran Ethical Hacking dengan{' '}
          <span className="text-cyber-green glow-green block sm:inline">AI Tutor Terbimbing</span>
        </h1>

        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mb-10 leading-relaxed font-mono">
          Tingkatkan keterampilan keamanan siber Anda secara mandiri melalui kurikulum jalur belajar terstruktur,
          simulasi lab terisolasi, serta bimbingan AI Tutor bertingkat tanpa membocorkan kunci flag.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center font-mono">
          <Link
            href="/learning-paths"
            className="flex items-center gap-2 px-8 py-3.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-all border border-purple-500/40 hover:border-cyber-green/50 shadow-lg shadow-purple-500/15"
          >
            Mulai Jalur Belajar (F3)
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/challenges"
            className="flex items-center gap-2 px-8 py-3.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 border border-zinc-800 hover:border-purple-500/30 transition-all text-sm font-semibold backdrop-blur"
          >
            Buka CTF & AI Tutor (F1 & F2)
          </Link>
        </div>

        {/* Feature Grid: 4 Core Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mt-20">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className={`cyber-panel p-6 rounded-xl text-left border ${p.borderColor}`}
              >
                <div className={`p-3 rounded-lg ${p.bgColor} inline-block mb-4`}>
                  <Icon className={`h-6 w-6 ${p.color}`} />
                </div>
                <h3 className="font-mono text-base font-bold text-white mb-2">{p.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">{p.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Identity Footer */}
        <div className="mt-20 pt-8 border-t border-zinc-900 w-full text-center text-xs font-mono text-gray-500">
          <p>Pengembangan Proyek Ethical Hacking — Mahasiswa: Sheva Zanuar Pratama | Dosen Pengampu: Rofiq Fauzi</p>
          <p className="mt-1 text-gray-600">Politeknik Negeri Semarang — Jurusan Teknik Elektro, Prodi D4 Teknik Informatika</p>
        </div>
      </section>
    </div>
  );
}
