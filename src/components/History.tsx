import { useState, useEffect } from 'react';
import { FaHistory, FaCalendarAlt, FaDownload, FaUpload } from 'react-icons/fa';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export interface TestResult {
    id: string;
    date: string; // ISO string
    download: number;
    upload: number;
    ping: number;
    jitter: number;
    loss: number;
    loadedLatency: number;
    grade: string;
}

export default function History() {
    const [history, setHistory] = useState<TestResult[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('pingly_history');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Sort by date desc
                parsed.sort((a: TestResult, b: TestResult) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setHistory(parsed);
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, []);

    const clearHistory = () => {
        if (confirm("Are you sure you want to clear your history?")) {
            localStorage.removeItem('pingly_history');
            setHistory([]);
        }
    };

    return (
        <div className="p-10 flex flex-col items-center min-h-full w-full max-w-[1600px] mx-auto">
            <header className="mb-10 text-center w-full max-w-4xl flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-semibold text-white mb-2 flex items-center gap-3">
                        <FaHistory className="text-blue-500" />
                        Test History
                    </h1>
                    <p className="text-zinc-500 text-left">Track your network performance over time</p>
                </div>
                {history.length > 0 && (
                    <button onClick={clearHistory} className="text-xs font-medium text-zinc-500 hover:text-red-400 transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-red-400/30">
                        Clear History
                    </button>
                )}
            </header>

            {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-zinc-600">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                        <FaHistory className="text-4xl text-zinc-700" />
                    </div>
                    <div className="text-lg font-medium text-zinc-500">No test history found</div>
                    <div className="text-sm">Run a speed test to see results here.</div>
                </div>
            ) : (
                <div className="w-full max-w-4xl space-y-4">
                    {history.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass-panel p-5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all group"
                        >
                            <div className="flex flex-col gap-1 w-32">
                                <div className="text-white font-medium flex items-center gap-2">
                                    <FaCalendarAlt className="text-zinc-500 group-hover:text-blue-400 transition-colors text-xs" />
                                    {new Date(item.date).toLocaleDateString()}
                                </div>
                                <div className="text-zinc-500 text-xs">
                                    {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div className="flex items-center gap-10">
                                <div className="flex flex-col items-end w-24">
                                    <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1 font-medium bg-black/20 px-2 py-0.5 rounded-md">
                                        <FaDownload className="text-blue-500" /> Download
                                    </div>
                                    <div className="text-white font-mono font-bold text-xl">{item.download.toFixed(1)}</div>
                                </div>

                                <div className="flex flex-col items-end w-24">
                                    <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1 font-medium bg-black/20 px-2 py-0.5 rounded-md">
                                        <FaUpload className="text-purple-500" /> Upload
                                    </div>
                                    <div className="text-white font-mono font-bold text-xl">{item.upload.toFixed(1)}</div>
                                </div>

                                <div className="flex flex-col items-end w-16">
                                    <div className="text-zinc-500 text-xs mb-1">Ping</div>
                                    <div className="text-zinc-300 font-mono font-bold">{item.ping.toFixed(0)} <span className="text-xs font-normal text-zinc-600">ms</span></div>
                                </div>

                                <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex flex-col items-center w-20">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Grade</div>
                                    <div className={cn("font-bold text-2xl leading-none mt-1",
                                        item.grade.startsWith('A') ? 'text-emerald-400' :
                                            item.grade === 'B' ? 'text-lime-400' :
                                                item.grade === 'C' ? 'text-yellow-400' : 'text-red-400'
                                    )}>{item.grade}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
