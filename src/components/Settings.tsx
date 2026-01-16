import { motion } from 'framer-motion';
import { FaUserSecret, FaSync, FaCheckCircle, FaExclamationTriangle, FaDownload } from 'react-icons/fa';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface SettingsProps {
    streamerMode: boolean;
    setStreamerMode: (enabled: boolean) => void;
}

export default function Settings({ streamerMode, setStreamerMode }: SettingsProps) {
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const [checking, setChecking] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<any>(null); // Using any for simplicity with the plugin's Update type
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'downloading' | 'installing' | 'ready'>('idle');

    useEffect(() => {
        getVersion().then(setCurrentVersion);
    }, []);

    const checkForUpdates = async () => {
        setChecking(true);
        setError(null);
        try {
            const update = await check();
            if (update) {
                console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`);
                setUpdateAvailable(true);
                setUpdateInfo(update);
            } else {
                setUpdateAvailable(false);
            }
        } catch (e: any) {
            console.error(e);
            setError(e.toString());
        } finally {
            setChecking(false);
        }
    };

    const installUpdate = async () => {
        if (!updateInfo) return;
        setStatus('downloading');
        try {
            let downloaded = 0;
            let contentLength = 0;
            await updateInfo.downloadAndInstall((event: any) => {
                switch (event.event) {
                    case 'Started':
                        contentLength = event.data.contentLength || 0;
                        console.log(`started downloading ${contentLength} bytes`);
                        break;
                    case 'Progress':
                        downloaded += event.data.chunkLength;
                        console.log(`downloaded ${downloaded} from ${contentLength}`);
                        break;
                    case 'Finished':
                        console.log('download finished');
                        break;
                }
            });
            setStatus('ready');
            // Ask user to relaunch
            await relaunch();
        } catch (e: any) {
            console.error(e);
            setError("Failed to install update: " + e.toString());
            setStatus('idle');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center p-10 w-full max-w-4xl mx-auto"
        >
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                    <FaUserSecret className="text-emerald-400" />
                    Settings
                </h1>
                <p className="text-zinc-400 font-medium">Customize Your Pingly Experience</p>
                <p className="text-zinc-600 text-sm mt-2">Version {currentVersion}</p>
            </header>

            <div className="w-full bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 space-y-8">
                {/* Privacy Section */}
                <section>
                    <h2 className="text-xl font-semibold text-white mb-6 border-b border-zinc-800 pb-2">Privacy & Security</h2>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex flex-col gap-1">
                            <span className="text-white font-medium text-lg flex items-center gap-2">
                                Streamer Mode {streamerMode && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Active</span>}
                            </span>
                            <span className="text-zinc-400 text-sm">
                                Hide sensitive information (IP, Location, ISP) from the dashboard.
                            </span>
                        </div>

                        <button
                            onClick={() => setStreamerMode(!streamerMode)}
                            className={cn(
                                "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900",
                                streamerMode ? "bg-emerald-500" : "bg-zinc-700"
                            )}
                        >
                            <span
                                className={cn(
                                    "inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg",
                                    streamerMode ? "translate-x-7" : "translate-x-1"
                                )}
                            />
                        </button>
                    </div>
                </section>

                {/* Updates Section */}
                <section>
                    <h2 className="text-xl font-semibold text-white mb-6 border-b border-zinc-800 pb-2">Software Updates</h2>
                    <div className="flex flex-col gap-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-white font-medium text-lg flex items-center gap-2">
                                    Release Channel
                                </span>
                                <span className="text-zinc-400 text-sm">
                                    You are on the <span className="text-emerald-400 font-semibold">Stable</span> channel.
                                </span>
                            </div>
                            <button
                                onClick={checkForUpdates}
                                disabled={checking || status !== 'idle'}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaSync className={cn("text-emerald-400", checking && "animate-spin")} />
                                {checking ? "Checking..." : "Check for Updates"}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-2 text-sm">
                                <FaExclamationTriangle />
                                {error}
                            </div>
                        )}

                        {updateAvailable && updateInfo && (
                            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-emerald-400 font-bold text-lg flex items-center gap-2">
                                            <FaCheckCircle /> Update Available: {updateInfo.version}
                                        </h3>
                                        <p className="text-zinc-300 text-sm mt-1">
                                            {updateInfo.body || "No release notes available."}
                                        </p>
                                    </div>
                                    <button
                                        onClick={installUpdate}
                                        disabled={status !== 'idle'}
                                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105"
                                    >
                                        <FaDownload />
                                        {status === 'downloading' ? "Downloading..." : "Download & Install"}
                                    </button>
                                </div>
                                {status === 'downloading' && (
                                    <div className="w-full bg-zinc-700 h-2 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-emerald-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {!checking && !updateAvailable && !error && (
                            <div className="mt-2 text-zinc-500 text-sm flex items-center gap-2">
                                <FaCheckCircle /> Pingly is up to date (v{currentVersion})
                            </div>
                        )}
                    </div>
                </section>

                {/* Appearance Placeholder */}
                <section className="opacity-50 pointer-events-none grayscale">
                    <h2 className="text-xl font-semibold text-white mb-6 border-b border-zinc-800 pb-2">Appearance (Coming Soon)</h2>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                        <div className="flex flex-col gap-1">
                            <span className="text-white font-medium text-lg">Theme</span>
                            <span className="text-zinc-400 text-sm">Customize application colors.</span>
                        </div>
                        <span className="text-zinc-600 text-sm">Default</span>
                    </div>
                </section>
            </div>
        </motion.div>
    );
}
