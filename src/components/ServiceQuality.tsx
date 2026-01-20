import { motion } from 'framer-motion';
import { FaGamepad, FaTv, FaVideo } from 'react-icons/fa';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ServiceQualityProps {
    ping: number;
    download: number; // Mbps
    upload: number; // Mbps
    jitter: number;
    packetLoss: number;
}

type QualityLevel = 'Excellent' | 'Good' | 'Fair' | 'Poor';

interface ServiceRating {
    name: string;
    icon: any;
    status: QualityLevel;
    description: string;
}

function getQualityColor(level: QualityLevel) {
    switch (level) {
        case 'Excellent': return 'text-teal-400 border-teal-500/20 bg-teal-500/10 shadow-[0_0_30px_rgba(45,212,191,0.1)]';
        case 'Good': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_30px_rgba(52,211,153,0.1)]';
        case 'Fair': return 'text-amber-400 border-amber-500/20 bg-amber-500/10 shadow-[0_0_30px_rgba(251,191,36,0.1)]';
        case 'Poor': return 'text-rose-400 border-rose-500/20 bg-rose-500/10 shadow-[0_0_30px_rgba(251,113,133,0.1)]';
    }
}

function evaluateGaming(ping: number, packetLoss: number, jitter: number): ServiceRating {
    let status: QualityLevel = 'Poor';
    let desc = "Unplayable lag";

    if (packetLoss > 2 || ping > 150) {
        status = 'Poor';
        desc = "High packet loss/latency";
    } else if (ping < 20 && jitter < 5 && packetLoss === 0) {
        status = 'Excellent';
        desc = "Perfect for competitive gaming";
    } else if (ping < 50 && jitter < 10 && packetLoss < 0.1) {
        status = 'Good';
        desc = "Smooth experience";
    } else if (ping < 100) {
        status = 'Fair';
        desc = "Playable but may lag";
    }

    return { name: "Online Gaming", icon: FaGamepad, status, description: desc };
}

function evaluateStreaming(download: number, packetLoss: number): ServiceRating {
    let status: QualityLevel = 'Poor';
    let desc = "Buffering likely";

    if (download > 25 && packetLoss < 1) {
        status = 'Excellent';
        desc = "Perfect for 4K HDR";
    } else if (download > 10 && packetLoss < 2) {
        status = 'Good';
        desc = "Good for HD Streaming";
    } else if (download > 5) {
        status = 'Fair';
        desc = "720p/1080p possible";
    } else {
        status = 'Poor';
        desc = "Low bandwidth";
    }

    return { name: "IPTV & Streaming", icon: FaTv, status, description: desc };
}

function evaluateCalls(upload: number, ping: number, jitter: number): ServiceRating {
    let status: QualityLevel = 'Poor';
    let desc = "Robotic audio / drops";

    if (upload > 5 && ping < 30 && jitter < 10) {
        status = 'Excellent';
        desc = "Crystal clear HD calls";
    } else if (upload > 2 && ping < 60 && jitter < 20) {
        status = 'Good';
        desc = "Stable video calls";
    } else if (upload > 1 && ping < 150) {
        status = 'Fair';
        desc = "Audio calls okay";
    } else {
        status = 'Poor';
        desc = "Connection unstable";
    }

    return { name: "Video Calls & VoIP", icon: FaVideo, status, description: desc };
}

export default function ServiceQuality({ ping, download, upload, jitter, packetLoss }: ServiceQualityProps) {
    const ratings = [
        evaluateGaming(ping, packetLoss, jitter),
        evaluateStreaming(download, packetLoss),
        evaluateCalls(upload, ping, jitter),
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
            {ratings.map((rating, idx) => (
                <motion.div
                    key={rating.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 + 0.3 }}
                    className={cn(
                        "p-6 rounded-2xl border backdrop-blur-sm flex flex-col items-center text-center gap-3 transition-all duration-300 hover:scale-[1.02]",
                        getQualityColor(rating.status)
                    )}
                >
                    <div className="text-4xl mb-2 opacity-90 drop-shadow-md">
                        <rating.icon />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white mb-1">{rating.name}</h3>
                        <div className="font-bold text-xl tracking-tight mb-1">{rating.status}</div>
                        <p className="text-sm opacity-80 font-medium">{rating.description}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
