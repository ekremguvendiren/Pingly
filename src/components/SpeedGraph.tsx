import { motion } from 'framer-motion';

interface SpeedGraphProps {
    data: number[];
    color: string;
    height?: number;
}

export default function SpeedGraph({ data, color, height = 60 }: SpeedGraphProps) {
    if (data.length < 2) return <div style={{ height }} className="w-full bg-zinc-900/30 rounded-lg" />;

    const max = Math.max(...data, 10);
    const min = 0;
    const normalize = (val: number) => {
        return height - ((val - min) / (max - min)) * height;
    };

    // Create SVG path
    let pathD = `M 0 ${height}`;
    const stepX = 100 / (data.length - 1);

    data.forEach((val, idx) => {
        const x = idx * stepX;
        const y = normalize(val);
        pathD += ` L ${x} ${y}`;
    });

    // Close the area for fill
    const areaD = pathD + ` L 100 ${height} L 0 ${height} Z`;

    return (
        <div className="w-full relative overflow-hidden rounded-lg bg-zinc-900/30" style={{ height }}>
            {/* Area Fill */}
            <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
                <motion.path
                    d={areaD}
                    fill={color}
                    fillOpacity={0.2}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                />
                {/* Stroke Line */}
                <motion.path
                    d={pathD.split(' L 100')[0]} // Remove closing part for stroke
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        </div>
    );
}
