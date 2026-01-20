import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTachometerAlt, FaHistory, FaTools, FaGamepad, FaCog, FaSignOutAlt } from 'react-icons/fa';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
    const navItems = [
        { icon: FaTachometerAlt, label: 'Dashboard' },
        { icon: FaHistory, label: 'History' },
        { icon: FaTools, label: 'DNS Tools' },
        { icon: FaGamepad, label: 'Gamer Zone' },
        { icon: FaCog, label: 'Settings' },
    ];

    return (
        <div className="flex h-screen w-full text-zinc-200 overflow-hidden font-sans selection:bg-blue-500/30">
            {/* Sidebar */}
            <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-[280px] flex flex-col p-6 bg-black/20 backdrop-blur-xl border-r border-white/5 relative z-20"
            >
                {/* Brand */}
                <div className="mb-12 px-2 flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                        <span className="font-bold text-white text-lg">P</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-wide">Pingly</h1>
                        <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Pro</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col gap-2">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.label;
                        return (
                            <button
                                key={item.label}
                                onClick={() => onTabChange(item.label)}
                                className={cn(
                                    "relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group overflow-hidden",
                                    isActive
                                        ? "text-white shadow-lg shadow-blue-900/10"
                                        : "text-zinc-500 hover:text-zinc-200"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabBg"
                                        className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                <item.icon className={cn(
                                    "text-lg z-10 transition-colors duration-300",
                                    isActive ? "text-blue-400 drop-shadow-md" : "text-zinc-500 group-hover:text-zinc-300"
                                )} />
                                <span className="z-10 font-medium tracking-wide text-sm">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Footer / Status */}
                <div className="mt-auto pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3 px-2 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
                        <span className="text-xs font-medium text-zinc-400">System Operational</span>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="min-h-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
