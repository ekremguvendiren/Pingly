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
        <div className="p-10 flex flex-col items-center min-h-full w-full">
            <header className="mb-10 text-center w-full max-w-4xl flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-semibold text-white mb-2 flex items-center gap-3">
                        <FaHistory className="text-blue-500" />
                        Test History
                    </h1>
                    <p className="text-zinc-500 text-left">Track your network performance over time</p>
                </div>
                {history.length > 0 && (
                    <button onClick={clearHistory} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                        Clear History
                    </button>
                )}
            </header>

            {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-zinc-600">
                    <FaHistory className="text-5xl mb-4 opacity-20" />
                    <div>No test history found. Run a speed test to see results here.</div>
                </div>
            ) : (
                <div className="w-full max-w-4xl space-y-4">
                    {history.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between hover:border-zinc-700 transition-all"
                        >
                            <div className="flex flex-col gap-1 w-32">
                                <div className="text-white font-medium flex items-center gap-2">
                                    <FaCalendarAlt className="text-zinc-600 text-xs" />
                                    {new Date(item.date).toLocaleDateString()}
                                </div>
                                <div className="text-zinc-500 text-xs">
                                    {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="flex flex-col items-end w-24">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                                        <FaDownload /> Download
                                    </div>
                                    <div className="text-white font-mono font-bold text-lg">{item.download.toFixed(1)}</div>
                                </div>

                                <div className="flex flex-col items-end w-24">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                                        <FaUpload /> Upload
                                    </div>
                                    <div className="text-white font-mono font-bold text-lg">{item.upload.toFixed(1)}</div>
                                </div>

                                <div className="flex flex-col items-end w-16">
                                    <div className="text-zinc-400 text-xs mb-1">Ping</div>
                                    <div className="text-white font-mono font-bold">{item.ping.toFixed(0)} <span className="text-xs font-normal text-zinc-600">ms</span></div>
                                </div>

                                <div className="bg-zinc-800 rounded-lg px-3 py-2 flex flex-col items-center w-16">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Grade</div>
                                    <div className={cn("font-bold text-lg leading-none",
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
