import { motion } from 'framer-motion';
import { FaUserSecret } from 'react-icons/fa';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface SettingsProps {
    streamerMode: boolean;
    setStreamerMode: (enabled: boolean) => void;
}

export default function Settings({ streamerMode, setStreamerMode }: SettingsProps) {
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

                {/* Placeholder for future settings */}
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
