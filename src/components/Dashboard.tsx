import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTachometerAlt, FaHistory, FaTools, FaGamepad, FaCog, FaPlay, FaUserMd, FaNetworkWired, FaServer, FaMapMarkerAlt } from 'react-icons/fa';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateBufferbloatGrade, getSmartDoctorAdvice } from '../utils/grading';
import GamerZone from './GamerZone';
import History, { TestResult } from './History';
import SpeedGraph from './SpeedGraph';
import DnsTools from './DnsTools';
import ServiceQuality from './ServiceQuality';
import Settings from './Settings';

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

export default function Dashboard() {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('Dashboard');

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

    const [graphData, setGraphData] = useState<{ download: number[], upload: number[] }>({ download: [], upload: [] });

    const [currentPhase, setCurrentPhase] = useState<'idle' | 'ping' | 'download' | 'upload' | 'complete'>('idle');
    const [grade, setGrade] = useState<{ grade: string, color: string } | null>(null);
    const [doctorAdvice, setDoctorAdvice] = useState<string | null>(null);

    // Streamer Mode State (Persistent)
    const [streamerMode, setStreamerMode] = useState(() => {
        const stored = localStorage.getItem('pingly_streamer_mode');
        return stored === 'true';
    });

    useEffect(() => {
        localStorage.setItem('pingly_streamer_mode', String(streamerMode));
    }, [streamerMode]);

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
                if (dl > 0) setGraphData(prev => ({ ...prev, download: [...prev.download, dl] }));
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

    function saveToHistory(result: TestResult) {
        const stored = localStorage.getItem('pingly_history');
        const history = stored ? JSON.parse(stored) : [];
        history.push(result);
        localStorage.setItem('pingly_history', JSON.stringify(history));
    }

    async function startTest() {
        setLoading(true);
        setMetrics({ ping: 0, jitter: 0, loss: 0, download: 0, upload: 0, loadedLatency: 0, loadedDown: 0, loadedUp: 0 });
        setGraphData({ download: [], upload: [] });
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

    const navItems = [
        { icon: FaTachometerAlt, label: 'Dashboard' },
        { icon: FaHistory, label: 'History' },
        { icon: FaTools, label: 'DNS Tools' },
        { icon: FaGamepad, label: 'Gamer Zone' },
        { icon: FaCog, label: 'Settings' },
    ];

    return (
        <div className="flex h-screen text-zinc-200 overflow-hidden font-sans selection:bg-blue-500/30">
            <div className="w-64 flex flex-col p-6 bg-zinc-900/50 border-r border-zinc-800">
                <div className="text-xl font-semibold mb-10 px-2 flex items-center gap-3 text-white">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    Pingly
                </div>
                <nav className="flex-1 flex flex-col gap-1">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => setActiveTab(item.label)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
                                activeTab === item.label
                                    ? "bg-zinc-800 text-white"
                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                            )}
                        >
                            <item.icon className={cn("text-lg", activeTab === item.label ? 'text-blue-500' : 'text-zinc-500')} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-auto bg-zinc-950 relative">
                {activeTab === 'Dashboard' && (
                    <div className="p-10 flex flex-col items-center min-h-full">
                        <header className="mb-8 text-center w-full max-w-5xl">
                            <div className="flex justify-between items-end">
                                <div className="text-left">
                                    <h1 className="text-3xl font-semibold text-white mb-1">Speed Test</h1>
                                </div>
                                {/* Connection Card */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <FaMapMarkerAlt /> {streamerMode ? '******' : connInfo.location}
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <FaNetworkWired /> {streamerMode ? '***.***.***.***' : connInfo.ip}
                                    </div>
                                    <div className="flex items-center gap-2 text-white font-medium">
                                        <FaServer className="text-blue-500" /> {streamerMode ? 'Hidden ISP' : connInfo.isp}
                                    </div>
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-4 gap-6 mb-8 w-full max-w-5xl">
                            <MetricCard label="Ping" value={metrics.ping.toFixed(0)} unit="ms" active={currentPhase === 'ping'} />
                            <MetricCard label="Jitter" value={metrics.jitter.toFixed(1)} unit="ms" active={currentPhase === 'ping'} />
                            <MetricCard label="Loss" value={metrics.loss.toFixed(1)} unit="%" active={currentPhase === 'ping'} />
                            <div className={cn(
                                "p-6 rounded-xl border transition-all duration-300 relative group",
                                currentPhase === 'complete' ? "bg-zinc-800/80 border-zinc-700 shadow-lg" : "bg-zinc-900/30 border-zinc-800/50"
                            )}>
                                <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Bufferbloat</div>
                                <div className="flex items-baseline gap-1">
                                    <div className={cn("text-3xl font-mono font-medium", currentPhase === 'complete' ? "text-white" : "text-zinc-300")}>
                                        {metrics.loadedLatency > 0 ? `+${(metrics.loadedLatency - metrics.ping).toFixed(0)}` : '-'}
                                    </div>
                                    <div className="text-zinc-500 text-sm">ms</div>
                                </div>
                                {currentPhase === 'complete' && (
                                    <div className="absolute top-full mt-2 left-0 right-0 bg-black/90 p-3 rounded-lg text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                        <div className="flex justify-between mb-1"><span>Download Load:</span> <span className="text-white">+{Math.max(0, metrics.loadedDown - metrics.ping).toFixed(0)} ms</span></div>
                                        <div className="flex justify-between"><span>Upload Load:</span> <span className="text-white">+{Math.max(0, metrics.loadedUp - metrics.ping).toFixed(0)} ms</span></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-center gap-12 mb-12 w-full max-w-4xl">
                            <div className="flex flex-col items-center gap-4">
                                <SpeedGauge label="Download" value={metrics.download} active={currentPhase === 'download'} />
                            </div>
                            <div className="flex flex-col items-center gap-4">
                                <SpeedGauge label="Upload" value={metrics.upload} active={currentPhase === 'upload'} />
                            </div>
                        </div>

                        {/* Service Quality Analysis */}
                        {currentPhase === 'complete' && (
                            <div className="w-full max-w-4xl mb-10">
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
                                    className="w-full max-w-4xl grid grid-cols-3 gap-6 mb-10"
                                >
                                    <div className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center">
                                        <div className="text-zinc-500 text-sm font-medium uppercase tracking-wider mb-2">Bufferbloat Grade</div>
                                        <div className={cn("text-6xl font-bold mb-2", grade.color)}>{grade.grade}</div>
                                        <div className="text-zinc-400 text-xs text-center">Unloaded: {metrics.ping.toFixed(0)}ms • Loaded: {metrics.loadedLatency.toFixed(0)}ms</div>
                                    </div>

                                    <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-start gap-4">
                                        <div className="bg-blue-500/10 p-3 rounded-full text-blue-500">
                                            <FaUserMd className="text-2xl" />
                                        </div>
                                        <div>
                                            <div className="text-white font-semibold mb-1">Smart Doctor Assessment</div>
                                            <p className="text-zinc-400 text-sm leading-relaxed">
                                                {doctorAdvice}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex justify-center pb-10">
                            <button
                                onClick={startTest}
                                disabled={loading}
                                className={cn(
                                    "px-10 py-4 rounded-full font-medium transition-all duration-200 flex items-center gap-3 text-lg",
                                    loading
                                        ? "bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-95"
                                )}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        <span>Running Test...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaPlay className="text-sm" />
                                        <span>Start Speed Test</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'History' && <History />}
                {activeTab === 'Gamer Zone' && <GamerZone />}
                {activeTab === 'History' && <History />}
                {activeTab === 'Gamer Zone' && <GamerZone />}
                {activeTab === 'DNS Tools' && <DnsTools />}
                {activeTab === 'Settings' && <Settings streamerMode={streamerMode} setStreamerMode={setStreamerMode} />}

                {activeTab !== 'Dashboard' && activeTab !== 'Gamer Zone' && activeTab !== 'History' && activeTab !== 'DNS Tools' && activeTab !== 'Settings' && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <FaTools className="text-4xl mb-4 opacity-20" />
                        <div>Not Implemented Yet</div>
                    </div>
                )}

            </div>
        </div>
    );
}

{/* Service Quality Analysis */ }

{/* Real-time Graph (Disabled for now until backend streams granular updates) */ }
function MetricCard({ label, value, unit, active }: { label: string, value: string, unit: string, active: boolean }) {
    return (
        <div className={cn(
            "p-6 rounded-xl border transition-all duration-300",
            active ? "bg-zinc-800/80 border-zinc-700 shadow-lg" : "bg-zinc-900/30 border-zinc-800/50"
        )}>
            <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">{label}</div>
            <div className="flex items-baseline gap-1">
                <div className={cn("text-3xl font-mono font-medium", active ? "text-white" : "text-zinc-300")}>{value}</div>
                <div className="text-zinc-500 text-sm">{unit}</div>
            </div>
        </div>
    )
}

function SpeedGauge({ label, value, active }: { label: string, value: number, active: boolean }) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center w-64 h-64 rounded-full border-4 transition-all duration-500 relative",
            active ? "border-blue-500 bg-zinc-900 shadow-[0_0_50px_rgba(59,130,246,0.1)]" : "border-zinc-800 bg-zinc-900/30"
        )}>
            {active && (
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin opacity-50"></div>
            )}
            <div className="text-zinc-500 text-sm font-semibold uppercase tracking-wider mb-2">{label}</div>
            <div className="text-6xl font-bold text-white mb-1 font-mono tracking-tight">{value.toFixed(1)}</div>
            <div className="text-zinc-500 text-lg">Mbps</div>
        </div>
    )
}
