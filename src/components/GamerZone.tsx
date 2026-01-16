import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGamepad, FaGlobeAmericas, FaRedo, FaTrophy, FaExclamationTriangle } from 'react-icons/fa';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface GamePing {
    game: string;
    region: string;
    latency: number;
    jitter: number;
    status: string;
}

export default function GamerZone() {
    const [results, setResults] = useState<GamePing[]>([]);
    const [loading, setLoading] = useState(false);

    // Get unique games
    const games = Array.from(new Set(results.map(r => r.game)));

    async function runTests() {
        if (loading) return;
        setLoading(true);
        setResults([]);

        const unlisten = await listen<GamePing>('game-ping', (event) => {
            setResults(prev => {
                // Check if result for this region already exists (shouldn't really happen with append, but safety)
                const exists = prev.some(r => r.game === event.payload.game && r.region === event.payload.region);
                if (exists) return prev;
                return [...prev, event.payload];
            });
        });

        try {
            await invoke('ping_game_servers');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            unlisten();
        }
    }

    const getLatencyColor = (ms: number, isText = true) => {
        if (ms < 40) return isText ? "text-emerald-400" : "bg-emerald-500";
        if (ms < 70) return isText ? "text-lime-400" : "bg-lime-500";
        if (ms < 120) return isText ? "text-yellow-400" : "bg-yellow-500";
        return isText ? "text-red-400" : "bg-red-500";
    };

    return (
        <div className="p-10 flex flex-col items-center min-h-full w-full">
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3 drop-shadow-lg">
                    <FaGamepad className="text-purple-400" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        Gamer Zone
                    </span>
                </h1>
                <p className="text-zinc-400 font-medium">Global Server Health & Latency</p>
            </header>

            <div className="absolute top-10 right-10">
                <button
                    onClick={runTests}
                    disabled={loading}
                    className="p-3 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-white rounded-xl transition-all border border-white/5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh Data"
                >
                    <FaRedo className={cn("text-lg", loading && "animate-spin")} />
                </button>
            </div>

            {!loading && results.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1">
                    <button
                        onClick={runTests}
                        className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white rounded-2xl font-medium shadow-xl transition-all text-lg flex items-center gap-3 group"
                    >
                        <FaGlobeAmericas className="group-hover:rotate-12 transition-transform duration-500 text-purple-400" />
                        Start Global Scan
                    </button>
                    <div className="flex flex-col items-center mt-6">
                        <p className="text-zinc-500 text-sm max-w-md text-center">
                            Scanning 20+ High-Performance Game Servers (TCP Handshake)
                        </p>
                        <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verified Data
                        </span>
                    </div>
                </div>
            )}

            {(loading || results.length > 0) && (
                <div className="w-full max-w-6xl space-y-8 pb-20">
                    {loading && (
                        <div className="flex items-center justify-center gap-3 text-purple-300 mb-8 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                            <span className="text-sm font-medium tracking-wide">Performing TCP Handshakes & Jitter Analysis...</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {games.map((game) => {
                                const gamePings = results.filter(r => r.game === game);
                                // Sort: Stable first, then by latency
                                gamePings.sort((a, b) => {
                                    if (a.status !== 'stable' && b.status === 'stable') return 1;
                                    if (a.status === 'stable' && b.status !== 'stable') return -1;
                                    return a.latency - b.latency;
                                });

                                const bestPing = gamePings.find(p => p.status === 'stable');

                                return (
                                    <motion.div
                                        layout
                                        key={game}
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ duration: 0.4, type: "spring" }}
                                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
                                    >
                                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5 mx-2 mt-2 rounded-t-2xl">
                                            <h3 className="font-bold text-white tracking-wide flex items-center gap-2">
                                                {game}
                                                {loading && (
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                )}
                                            </h3>
                                            {bestPing ? (
                                                <div className="text-xs bg-black/20 px-2 py-1 rounded-full text-zinc-300 flex items-center gap-1.5 border border-white/5">
                                                    <FaTrophy className="text-yellow-400 text-[10px]" />
                                                    <span className={getLatencyColor(bestPing.latency)}>{bestPing.latency.toFixed(0)}ms</span>
                                                </div>
                                            ) : (
                                                <div className="text-xs bg-red-500/10 px-2 py-1 rounded-full text-red-400 border border-red-500/20">
                                                    All Offline
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3 space-y-2">
                                            {gamePings.map((ping) => (
                                                <motion.div
                                                    key={ping.region}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="flex items-center justify-between p-3 rounded-xl bg-black/20 hover:bg-black/40 transition-colors border border-transparent hover:border-white/5 group"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors">
                                                            {ping.region}
                                                        </span>
                                                        {ping.status === 'stable' && (
                                                            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                                Jitter: <span className={cn(ping.jitter > 5 ? "text-yellow-500" : "text-emerald-500")}>
                                                                    ±{ping.jitter.toFixed(1)}ms
                                                                </span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {ping.status !== 'stable' ? (
                                                            <span className="text-[10px] font-bold text-red-300 bg-red-500/20 px-2 py-1 rounded-md border border-red-500/20 flex items-center gap-1">
                                                                <FaExclamationTriangle /> MAINTENANCE
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-col items-end">
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="flex h-2 w-2 relative mr-1">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                    </span>
                                                                    <span className={cn("text-lg font-mono font-bold tracking-tight", getLatencyColor(ping.latency))}>
                                                                        {ping.latency.toFixed(0)}
                                                                    </span>
                                                                    <span className="text-xs text-zinc-600 font-medium">ms</span>
                                                                </div>
                                                                <div className="flex gap-0.5">
                                                                    <div className={cn("w-1.5 h-1.5 rounded-full", getLatencyColor(ping.latency, false))}></div>
                                                                    <div className={cn("w-1.5 h-1.5 rounded-full", getLatencyColor(ping.latency, false), "opacity-60")}></div>
                                                                    <div className={cn("w-1.5 h-1.5 rounded-full", getLatencyColor(ping.latency, false), "opacity-30")}></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {!loading && (
                        <div className="flex justify-center mt-12">
                            <button
                                onClick={runTests}
                                className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm transition-colors py-3 px-6 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
                            >
                                <FaRedo />
                                Rescan Network
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
