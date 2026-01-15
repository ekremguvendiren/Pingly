export interface GradeResult {
    grade: string; // A+, A, B, C, D, F
    color: string; // text-emerald-500, etc.
    score: number; // 0-100
}

export function calculateBufferbloatGrade(unloaded: number, loaded: number): GradeResult {
    const diff = loaded - unloaded;

    if (diff <= 5) return { grade: 'A+', color: 'text-emerald-400', score: 100 };
    if (diff <= 30) return { grade: 'A', color: 'text-emerald-500', score: 90 };
    if (diff <= 60) return { grade: 'B', color: 'text-lime-500', score: 80 };
    if (diff <= 200) return { grade: 'C', color: 'text-yellow-500', score: 70 };
    if (diff <= 400) return { grade: 'D', color: 'text-orange-500', score: 60 };
    return { grade: 'F', color: 'text-red-500', score: 50 };
}

export function getSmartDoctorAdvice(metrics: {
    download: number,
    upload: number,
    ping: number,
    jitter: number,
    loss: number,
    bufferbloatGrade: string
}): string {
    const tips = [];

    // Speed
    if (metrics.download > 100) tips.push("Excellent download speed for 4K streaming.");
    else if (metrics.download < 25) tips.push("Download speed might struggle with 4K content.");

    // Latency / Jitter
    if (metrics.ping < 20 && metrics.jitter < 5) tips.push("Perfect for competitive gaming.");
    else if (metrics.jitter > 30) tips.push("High jitter may cause lag spikes in games.");

    // Loss
    if (metrics.loss > 1) tips.push("Packet loss detected! Check your ethernet cable or Wi-Fi signal.");

    // Bufferbloat
    if (['A+', 'A', 'B'].includes(metrics.bufferbloatGrade)) {
        tips.push("Network is stable under load.");
    } else {
        tips.push("High bufferbloat detected. Enable QoS on your router if possible.");
    }

    if (tips.length === 0) return "Connection looks good.";
    return tips.join(" ");
}
