'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import {
  Compass,
  CheckCircle2,
  Lock,
  ArrowRight,
  BookOpen,
  Target,
  Sparkles,
  Trophy,
  Award,
  Zap,
} from 'lucide-react';

interface PathItem {
  id: string;
  orderIndex: number;
  type: 'CHALLENGE' | 'LESSON';
  title: string;
  targetId: string;
  point: number;
  difficulty: string;
  completed: boolean;
}

interface LearningPath {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  totalItems: number;
  completedItems: number;
  percentage: number;
  items: PathItem[];
}

export default function LearningPathsPage() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);

  useEffect(() => {
    async function fetchPaths() {
      try {
        const res = await fetch('/api/learning-paths');
        if (res.ok) {
          const data = await res.json();
          setPaths(data.paths || []);
          if (data.paths && data.paths.length > 0) {
            setSelectedPath(data.paths[0]);
          }
        }
      } catch (err) {
        console.error('Error loading paths:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPaths();
  }, []);

  return (
    <div className="min-h-screen bg-cyber-bg text-gray-200 flex flex-col scanline cyber-grid pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full flex-1 flex flex-col">
        {/* Header Hero */}
        <div className="mb-8 border-b border-zinc-900 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyber-green uppercase tracking-wider mb-2">
                <Compass className="h-4 w-4" />
                <span>Feature F3: Structured Learning Curriculum</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-wide">
                Jalur Belajar Ethical Hacking
              </h1>
              <p className="text-sm font-mono text-gray-400 mt-1 max-w-2xl">
                Kurikulum terstruktur bertahap dari pemahaman konsep materi dasar hingga pemecahan
                tantangan CTF nyata di lingkungan lab.
              </p>
            </div>

            {user && (
              <div className="flex items-center gap-4 bg-zinc-950/80 border border-purple-500/20 p-3.5 rounded-xl font-mono text-xs">
                <div>
                  <div className="text-gray-500 text-[10px]">TOTAL SKOR ANDA</div>
                  <div className="text-cyber-green font-bold text-sm">{user.totalPoint} Poin</div>
                </div>
                <div className="h-6 w-px bg-zinc-800"></div>
                <div>
                  <div className="text-gray-500 text-[10px]">STATUS SISWA</div>
                  <div className="text-purple-400 font-bold text-sm">{user.role}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyber-green"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Track Selector (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest px-1">
                Pilih Jalur Spesialisasi ({paths.length})
              </h2>

              <div className="space-y-3">
                {paths.map((path) => {
                  const isSelected = selectedPath?.id === path.id;
                  return (
                    <button
                      key={path.id}
                      onClick={() => setSelectedPath(path)}
                      className={`w-full text-left p-4 rounded-xl border font-mono transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500/40 glow-purple shadow-lg'
                          : 'bg-zinc-950/40 border-zinc-900/80 hover:border-zinc-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{path.icon}</span>
                          <div>
                            <div className="font-bold text-sm text-white">{path.title}</div>
                            <div className="text-[10px] text-purple-400 uppercase tracking-wider">
                              {path.category}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-cyber-green">
                            {path.percentage}%
                          </span>
                          <div className="text-[9px] text-gray-500">
                            {path.completedItems}/{path.totalItems} Selesai
                          </div>
                        </div>
                      </div>

                      {/* Mini progress bar */}
                      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-3">
                        <div
                          className="bg-cyber-green h-full transition-all duration-500 rounded-full glow-green"
                          style={{ width: `${path.percentage}%` }}
                        ></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: Selected Path Ladder & Roadmap (7 cols) */}
            <div className="lg:col-span-7">
              {selectedPath ? (
                <div className="cyber-panel p-6 rounded-2xl border border-purple-500/20 space-y-6">
                  {/* Path Header */}
                  <div className="border-b border-zinc-900 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{selectedPath.icon}</span>
                      <div>
                        <h2 className="text-lg font-bold font-mono text-white">
                          {selectedPath.title}
                        </h2>
                        <p className="text-xs font-mono text-gray-400 mt-1 leading-relaxed">
                          {selectedPath.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-900/60 font-mono text-xs">
                      <div>
                        <span className="text-gray-500 text-[10px] block">TOTAL MODUL</span>
                        <span className="text-white font-bold">{selectedPath.totalItems} Modul & Lab</span>
                      </div>
                      <div className="h-4 w-px bg-zinc-800"></div>
                      <div>
                        <span className="text-gray-500 text-[10px] block">PROGRES BELAJAR</span>
                        <span className="text-cyber-green font-bold">
                          {selectedPath.completedItems} dari {selectedPath.totalItems} Selesai ({selectedPath.percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step by step timeline ladder */}
                  <div className="space-y-3 font-mono">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Urutan Belajar Bertahap
                    </h3>

                    {selectedPath.items.map((item, index) => {
                      const isNext =
                        !item.completed &&
                        (index === 0 || selectedPath.items[index - 1].completed);

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                            item.completed
                              ? 'bg-cyber-green/5 border-cyber-green/20'
                              : isNext
                              ? 'bg-purple-500/10 border-purple-500/35 glow-purple ring-1 ring-purple-500/30'
                              : 'bg-zinc-950/40 border-zinc-900 opacity-80'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Step index / status icon */}
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                item.completed
                                  ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/40'
                                  : isNext
                                  ? 'bg-purple-600 text-white animate-pulse'
                                  : 'bg-zinc-900 text-gray-500 border border-zinc-800'
                              }`}
                            >
                              {item.completed ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                index + 1
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                    item.type === 'CHALLENGE'
                                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  }`}
                                >
                                  {item.type === 'CHALLENGE' ? 'Tantangan CTF' : 'Pelajaran Teori'}
                                </span>

                                {item.type === 'CHALLENGE' && (
                                  <span className="text-[9px] text-cyber-green font-bold">
                                    +{item.point} pts
                                  </span>
                                )}

                                {isNext && (
                                  <span className="text-[9px] bg-cyber-green/20 text-cyber-green px-1.5 py-0.5 rounded font-bold">
                                    REKOMENDASI BERIKUTNYA
                                  </span>
                                )}
                              </div>

                              <div className="text-xs sm:text-sm font-bold text-white mt-1">
                                {item.title}
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div>
                            {item.type === 'CHALLENGE' ? (
                              <Link
                                href={`/challenges?tab=challenges&id=${item.targetId}`}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  item.completed
                                    ? 'bg-zinc-900 text-gray-400 hover:text-white border border-zinc-800'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20'
                                }`}
                              >
                                {item.completed ? 'Buka Ulang' : 'Mulai Lab'}
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            ) : (
                              <Link
                                href={`/courses`}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-gray-300 border border-zinc-800 transition-all flex items-center gap-1"
                              >
                                Baca Teori
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
