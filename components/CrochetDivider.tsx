'use client'
import { motion } from 'framer-motion';

export default function CrochetDivider() {
  // Simple wavy yarn line matching the reference image
  const points = Array.from({ length: 12 }).map((_, i) => {
    const x = (i / 11) * 100;
    return { x, y: i % 2 === 0 ? 35 : 65 };
  });

  // Build a smooth cubic bezier path through the points
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpx = (curr.x + next.x) / 2;
    d += ` C ${cpx} ${curr.y}, ${cpx} ${next.y}, ${next.x} ${next.y}`;
  }

  return (
    <div className="w-full py-8 flex items-center justify-center overflow-hidden px-6">
      <svg
        viewBox="0 0 100 100"
        className="w-full max-w-5xl h-6"
        preserveAspectRatio="none"
        fill="none"
      >
        <motion.path
          d={d}
          stroke="hsl(var(--accent))"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.7 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}
