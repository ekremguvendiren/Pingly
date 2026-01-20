import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaUserMd, FaNetworkWired, FaServer, FaMapMarkerAlt, FaMicrochip } from 'react-icons/fa';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateBufferbloatGrade, getSmartDoctorAdvice } from '../utils/grading';
import ServiceQuality from './ServiceQuality';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface SpeedTestPayload {
    phase: string;
    ping_avg?: number;
    jitter?: number;
    packet_loss?: number;
    download_speed?: number;
    upload_speed?: number;
    progress: number;
    loaded_latency?: number;
    loaded_latency_download?: number;
    loaded_latency_upload?: number;
    client_ip?: string;
    client_isp?: string;
    location?: string;
}

interface DashboardProps {
    streamerMode: boolean;
}

export default function Dashboard({ streamerMode }: DashboardProps) {
    const [loading, setLoading] = useState(false);

    // Speed Test State
    const [metrics, setMetrics] = useState({
        ping: 0,
        jitter: 0,
        loss: 0,
        download: 0,
        upload: 0,
        loadedLatency: 0,
        loadedDown: 0,
        loadedUp: 0,
    });

    const [connInfo, setConnInfo] = useState({
        ip: '...',
        isp: 'Detecting...',
        location: '...'
    });

    const [currentPhase, setCurrentPhase] = useState<'idle' | 'ping' | 'download' | 'upload' | 'complete'>('idle');
    const [grade, setGrade] = useState<{ grade: string, color: string } | null>(null);
    const [doctorAdvice, setDoctorAdvice] = useState<string | null>(null);

    useEffect(() => {
        const unlisten = listen<SpeedTestPayload>('speed-update', (event) => {
            const p = event.payload;

            // Update connection info if available
            if (p.client_ip) {
                setConnInfo({
                    ip: p.client_ip,
                    isp: p.client_isp || 'Unknown ISP',
                    location: p.location || 'Unknown'
                });
            }

            if (p.phase === 'ping') {
                setCurrentPhase('ping');
            } else if (p.phase === 'download_start') {
                setCurrentPhase('download');
                setMetrics(prev => ({
                    ...prev,
                    ping: p.ping_avg || prev.ping,
                    jitter: p.jitter || prev.jitter,
                    loss: p.packet_loss || prev.loss
                }));
            } else if (p.phase === 'download_result') {
                const dl = p.download_speed || 0;
                setMetrics(prev => ({ ...prev, download: dl }));
                setCurrentPhase('upload');

            } else if (p.phase === 'complete') {
                const finalUp = p.upload_speed || 0;
                const loaded = p.loaded_latency || 0;
                const loadedD = p.loaded_latency_download || 0;
                const loadedU = p.loaded_latency_upload || 0;
                const currentPing = metrics.ping;

                setMetrics(prev => ({
                    ...prev,
                    upload: finalUp,
                    loadedLatency: loaded,
                    loadedDown: loadedD,
                    loadedUp: loadedU
                }));
                setCurrentPhase('complete');
                setLoading(false);

                // Calculate Analysis
                const gradeRes = calculateBufferbloatGrade(currentPing, loaded);
                const advice = getSmartDoctorAdvice({
                    download: metrics.download,
                    upload: finalUp,
                    ping: currentPing,
                    jitter: metrics.jitter,
                    loss: metrics.loss,
                    bufferbloatGrade: gradeRes.grade
                });

                setGrade(gradeRes);
                setDoctorAdvice(advice);

                saveToHistory({
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    download: metrics.download,
                    upload: finalUp,
                    ping: currentPing,
                    jitter: metrics.jitter,
                    loss: metrics.loss,
                    loadedLatency: loaded,
                    grade: gradeRes.grade
                });
            }
        });

        return () => {
            unlisten.then(f => f());
        };
    }, [metrics.download, metrics.loss, metrics.ping, metrics.jitter]);

    function saveToHistory(result: any) {
        const stored = localStorage.getItem('pingly_history');
        const history = stored ? JSON.parse(stored) : [];
        history.push(result);
        localStorage.setItem('pingly_history', JSON.stringify(history));
    }

    async function startTest() {
        setLoading(true);
        setMetrics({ ping: 0, jitter: 0, loss: 0, download: 0, upload: 0, loadedLatency: 0, loadedDown: 0, loadedUp: 0 });
        setGrade(null);
        setDoctorAdvice(null);
        setConnInfo({ ip: '...', isp: 'Detecting...', location: '...' });
        setCurrentPhase('ping');
        try {
            await invoke('run_full_speed_test');
        } catch (error) {
            console.error(error);
            setLoading(false);
            setCurrentPhase('idle');
        }
    }

    return (
        <div className="p-8 pb-32 flex flex-col items-center min-h-full max-w-[1600px] mx-auto">
            <header className="mb-10 text-center w-full">
                <div className="flex justify-between items-end border-b border-white/5 pb-6">
                    <div className="text-left">
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Speed Test</h1>
                        <p className="text-zinc-400 text-sm">Measure your connection performance</p>
                    </div>
                    {/* Connection Card */}
                    <div className="glass-panel px-5 py-3 rounded-full flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <FaMapMarkerAlt className="text-blue-400" /> {streamerMode ? '******' : connInfo.location}
                        </div>
                        <div className="w-px h-4 bg-white/10"></div>
                        <div className="flex items-center gap-2 text-zinc-400">
                            <FaNetworkWired className="text-purple-400" /> {streamerMode ? '***.***.***.***' : connInfo.ip}
                        </div>
                        <div className="w-px h-4 bg-white/10"></div>
                        <div className="flex items-center gap-2 text-white font-medium">
                            <FaServer className="text-emerald-400" /> {streamerMode ? 'Hidden ISP' : connInfo.isp}
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-4 gap-6 mb-12 w-full">
                <MetricCard label="Ping" value={metrics.ping.toFixed(0)} unit="ms" active={currentPhase === 'ping'} />
                <MetricCard label="Jitter" value={metrics.jitter.toFixed(1)} unit="ms" active={currentPhase === 'ping'} />
                <MetricCard label="Loss" value={metrics.loss.toFixed(1)} unit="%" active={currentPhase === 'ping'} />

                {/* Bufferbloat Card */}
                <div className={cn(
                    "relative overflow-hidden p-6 rounded-2xl border transition-all duration-500",
                    currentPhase === 'complete'
                        ? "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30"
                        : "bg-zinc-900/40 border-white/5"
                )}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Bufferbloat</div>
                        <FaMicrochip className="text-indigo-400 opacity-50" />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <div className={cn("text-4xl font-mono font-medium tracking-tight", currentPhase === 'complete' ? "text-white" : "text-zinc-500")}>
                            {metrics.loadedLatency > 0 ? `+${(metrics.loadedLatency - metrics.ping).toFixed(0)}` : '-'}
                        </div>
                        <div className="text-zinc-500 text-sm font-medium">ms</div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-16 mb-16 w-full">
                <SpeedGauge label="Download" value={metrics.download} active={currentPhase === 'download'} color="blue" />
                <SpeedGauge label="Upload" value={metrics.upload} active={currentPhase === 'upload'} color="purple" />
            </div>

            {/* Service Quality Analysis */}
            {currentPhase === 'complete' && (
                <div className="w-full mb-10">
                    <ServiceQuality
                        ping={metrics.ping}
                        download={metrics.download}
                        upload={metrics.upload}
                        jitter={metrics.jitter}
                        packetLoss={metrics.loss}
                    />
                </div>
            )}

            <AnimatePresence>
                {!loading && grade && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full grid grid-cols-3 gap-6 mb-10"
                    >
                        <div className="glass-panel col-span-1 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                            <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">Bufferbloat Grade</div>
                            <div className={cn("text-7xl font-bold mb-2 tracking-tighter drop-shadow-2xl", grade.color)}>{grade.grade}</div>
                            <div className="text-zinc-400 text-xs text-center border px-3 py-1 rounded-full border-white/5 bg-black/20">
                                Unloaded: {metrics.ping.toFixed(0)}ms • Loaded: {metrics.loadedLatency.toFixed(0)}ms
                            </div>
                        </div>

                        <div className="glass-panel col-span-2 rounded-2xl p-8 flex items-start gap-6">
                            <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-400 shadow-inner ring-1 ring-blue-500/20">
                                <FaUserMd className="text-3xl" />
                            </div>
                            <div>
                                <div className="text-white text-lg font-semibold mb-2">Smart Doctor Assessment</div>
                                <p className="text-zinc-400 leading-relaxed text-sm">
                                    {doctorAdvice}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex justify-center">
                <button
                    onClick={startTest}
                    disabled={loading}
                    className={cn(
                        "group relative px-12 py-5 rounded-full font-bold transition-all duration-300 flex items-center gap-4 text-lg overflow-hidden",
                        loading
                            ? "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
                            : "bg-white text-black hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    )}
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>Running Test...</span>
                        </>
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <FaPlay className="text-sm" />
                            <span>Start Speed Test</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

function MetricCard({ label, value, unit, active }: { label: string, value: string, unit: string, active: boolean }) {
    return (
        <div className={cn(
            "p-6 rounded-2xl border transition-all duration-300 backdrop-blur-sm",
            active
                ? "bg-zinc-800/80 border-white/20 shadow-xl scale-[1.02]"
                : "bg-zinc-900/40 border-white/5"
        )}>
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">{label}</div>
            <div className="flex items-baseline gap-1">
                <div className={cn("text-4xl font-mono font-medium tracking-tight", active ? "text-white" : "text-zinc-500")}>{value}</div>
                <div className="text-zinc-500 text-sm">{unit}</div>
            </div>
        </div>
    )
}

function SpeedGauge({ label, value, active, color }: { label: string, value: number, active: boolean, color: 'blue' | 'purple' }) {
    const isBlue = color === 'blue';
    return (
        <div className={cn(
            "flex flex-col items-center justify-center w-72 h-72 rounded-full border-4 transition-all duration-500 relative bg-black/40 backdrop-blur-xl",
            active
                ? (isBlue ? "border-blue-500 shadow-[0_0_60px_rgba(59,130,246,0.2)]" : "border-purple-500 shadow-[0_0_60px_rgba(168,85,247,0.2)]")
                : "border-white/5"
        )}>
            {active && (
                <div className={cn(
                    "absolute inset-0 rounded-full border-4 border-t-transparent animate-spin opacity-50",
                    isBlue ? "border-blue-400" : "border-purple-400"
                )}></div>
            )}
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">{label}</div>
            <div className="text-7xl font-bold text-white mb-2 font-mono tracking-tighter drop-shadow-lg">{value.toFixed(1)}</div>
            <div className={cn("text-lg font-medium", isBlue ? "text-blue-400" : "text-purple-400")}>Mbps</div>
        </div>
    )
}
