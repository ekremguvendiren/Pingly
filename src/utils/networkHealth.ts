export type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor';

export interface NetworkHealth {
    status: HealthStatus;
    color: string;
    label: string;
    description: string;
}

export function analyzeLatency(latencyMs: number): NetworkHealth {
    if (latencyMs < 30) {
        return {
            status: 'excellent',
            color: 'text-green-400',
            label: 'Excellent',
            description: 'Perfect for competitive gaming',
        };
    } else if (latencyMs < 60) {
        return {
            status: 'good',
            color: 'text-lime-400',
            label: 'Good',
            description: 'Great for streaming and gaming',
        };
    } else if (latencyMs < 100) {
        return {
            status: 'fair',
            color: 'text-yellow-400',
            label: 'Fair',
            description: 'Playable, but may feel laggy',
        };
    } else {
        return {
            status: 'poor',
            color: 'text-red-500',
            label: 'Poor',
            description: 'Significant lag expected',
        };
    }
}
