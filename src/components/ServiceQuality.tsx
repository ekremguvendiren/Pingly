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
        case 'Excellent': return 'text-teal-400 border-teal-500/30 bg-teal-500/10';
        case 'Good': return 'text-green-400 border-green-500/30 bg-green-500/10';
        case 'Fair': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
        case 'Poor': return 'text-red-400 border-red-500/30 bg-red-500/10';
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-8">
            {ratings.map((rating, idx) => (
                <motion.div
                    key={rating.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 + 0.5 }} // Delay appearing after main results
                    className={cn(
                        "p-4 rounded-xl border flex flex-col items-center text-center gap-2",
                        getQualityColor(rating.status)
                    )}
                >
                    <div className="text-3xl mb-1 opacity-80">
                        <rating.icon />
                    </div>
                    <h3 className="font-semibold text-lg text-white">{rating.name}</h3>
                    <div className="font-bold text-lg">{rating.status}</div>
                    <p className="text-xs opacity-70">{rating.description}</p>
                </motion.div>
            ))}
        </div>
    );
}
