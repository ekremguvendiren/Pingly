import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGlobe, FaPlay, FaServer } from 'react-icons/fa';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface DnsResult {
    provider: string;
    ip: string;
    latency: number;
}

export default function DnsTools() {
    const [results, setResults] = useState<DnsResult[]>([]);
    const [loading, setLoading] = useState(false);

    async function runBenchmark() {
        if (loading) return;
        setLoading(true);
        setResults([]); // Clear previous

        // Listen for updates
        const unlisten = await listen<DnsResult>('dns-update', (event) => {
            setResults(prev => {
                const newRes = [...prev, event.payload];
                // Keep sorted by latency
                return newRes.sort((a, b) => a.latency - b.latency);
            });
        });

        try {
            await invoke('run_dns_benchmark');
        } catch (err) {
            console.error(err);
        } finally {
            // Wait a tiny bit to show full list before "stopping" loading state technically, 
            // but invoke returns when all done in backend now.
            setLoading(false);
            unlisten();
        }
    }

    return (
        <div className="p-10 flex flex-col items-center min-h-full w-full">
            <header className="mb-12 text-center">
                <h1 className="text-3xl font-semibold text-white mb-2 flex items-center justify-center gap-3">
                    <FaGlobe className="text-teal-500" />
                    DNS Benchmark
                </h1>
                <p className="text-zinc-500">Compare your DNS performance against top providers</p>
            </header>

            {!loading && results.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1">
                    <button
                        onClick={runBenchmark}
                        className="px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium shadow-lg shadow-teal-900/20 active:scale-95 transition-all text-lg flex items-center gap-3"
                    >
                        <FaPlay />
                        Start Benchmark
                    </button>
                </div>
            )}

            {(loading || results.length > 0) && (
                <div className="w-full max-w-3xl space-y-4 pb-10">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-zinc-400 text-sm">
                            {loading ? "Benchmarking in progress..." : "Benchmark Complete"}
                        </span>
                        {loading && <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>}
                    </div>

                    <AnimatePresence mode="popLayout">
                        {results.map((res, idx) => (
                            <motion.div
                                layout
                                key={res.ip} // Layout animation needs unique key
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className={cn(
                                    "p-5 rounded-xl border flex items-center justify-between relative overflow-hidden",
                                    idx === 0
                                        ? "bg-teal-500/10 border-teal-500/50"
                                        : "bg-zinc-900 border-zinc-800"
                                )}
                            >
                                <div className="flex items-center gap-4 z-10">
                                    <div className={cn(
                                        "p-3 rounded-lg flex items-center justify-center shadow-lg",
                                        idx === 0 ? "bg-teal-500 text-white" : "bg-zinc-800 text-zinc-400"
                                    )}>
                                        {idx === 0 ? <span className="font-bold text-lg">#{idx + 1}</span> : <FaServer />}
                                    </div>
                                    <div>
                                        <div className="text-white font-medium text-lg">{res.provider}</div>
                                        <div className="text-zinc-500 text-sm mono">{res.ip}</div>
                                    </div>
                                </div>

                                <div className="flex items-baseline gap-1 z-10">
                                    {res.latency >= 900 ? (
                                        <span className="text-red-500 font-bold text-sm bg-red-500/10 px-2 py-1 rounded">TIMEOUT</span>
                                    ) : (
                                        <>
                                            <span className={cn(
                                                "text-2xl font-mono font-bold",
                                                idx === 0 ? "text-teal-400" : "text-zinc-300"
                                            )}>{res.latency.toFixed(1)}</span>
                                            <span className="text-zinc-500 text-sm">ms</span>
                                        </>
                                    )}
                                </div>

                                {idx === 0 && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/5 to-transparent pointer-events-none"></div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {!loading && results.length > 0 && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={runBenchmark}
                                className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm transition-colors py-2 px-4 rounded-lg hover:bg-zinc-900"
                            >
                                <FaPlay className="text-xs" />
                                Run Again
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
