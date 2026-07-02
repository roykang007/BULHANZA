import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface Leaf {
  id: number;
  x: number; // Starting percentage (0 to 100)
  size: number; // Width/height in pixels
  delay: number; // delay in seconds before falling
  duration: number; // duration of fall in seconds
  swayAmplitude: number; // horizontal sway distance in pixels
  swayDuration: number; // speed of horizontal sway in seconds
  rotationStart: number; // starting angle
  rotationSpeed: number; // speed of spin during fall (degrees)
  colorClass: string; // Tailwind color class or hex values
  shapeIndex: number; // Which leaf shape to render
}

// 3 Highly-polished vector leaf shapes: Tea leaf, Ginkgo leaf, Birch leaf
const LEAF_SHAPES = [
  // 1. Sleek Tea Leaf (pointed ellipse)
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12 2C12 2 4 9 4 14C4 18.42 7.58 22 12 22C16.42 22 20 18.42 20 14C20 9 12 2 12 2ZM12 20C12 20 12 11 12 10C12 9 13.5 11 13.5 14C13.5 17 12 20 12 20Z" />
  </svg>,
  // 2. Artistic Birch/Elm Leaf (ribbed serrated oval)
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12,2 C12,2 6,6 5,12 C4,16.5 8,21 12,22 C16,21 20,16.5 19,12 C18,6 12,2 12,2 Z M12,20 C11.5,17 10,14 8,12 M12,18 C12.5,15 14,13 16,11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>,
  // 3. Delicate Ginkgo Leaf (fan shape)
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12,21 C12,21 10,13 3,11 C2,10.5 2,9 3,8.5 C8,8.5 11,11 12,13 C13,11 16,8.5 21,8.5 C22,9 22,10.5 21,11 C14,13 12,21 12,21 Z" />
  </svg>
];

const LEAF_COLORS = [
  'text-emerald-800/15 dark:text-emerald-400/10',    // Muted Tea Green
  'text-amber-800/15 dark:text-amber-400/10',        // Warm Ochre/Gold
  'text-stone-700/15 dark:text-stone-400/10',        // Delicate Ash/Beige
  'text-[#c4a47a]/20 dark:text-[#c4a47a]/15',        // Soft Sand-Gilded
  'text-olive-700/20 dark:text-olive-300/15'         // Olive/Sage Green
];

export const FallingLeaves: React.FC = () => {
  const [leaves, setLeaves] = useState<Leaf[]>([]);

  useEffect(() => {
    // Generate an initial pool of 30 beautifully randomized leaves
    const initialLeaves: Leaf[] = Array.from({ length: 32 }).map((_, idx) => {
      return {
        id: idx,
        x: Math.random() * 100, // random horizontal start point (0% - 100%)
        size: Math.random() * 14 + 10, // 10px to 24px wide
        delay: Math.random() * -18, // Negative delay so some leaves are already falling when mounted
        duration: Math.random() * 12 + 14, // 14s to 26s for very slow, cinematic, snowy movement
        swayAmplitude: Math.random() * 45 + 25, // 25px to 70px horizontal drift
        swayDuration: Math.random() * 4 + 4, // 4s to 8s sway cycle
        rotationStart: Math.random() * 360,
        rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 240 + 120), // 120 to 360 deg spin
        colorClass: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
        shapeIndex: Math.floor(Math.random() * LEAF_SHAPES.length)
      };
    });
    setLeaves(initialLeaves);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
      {leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          className={`absolute ${leaf.colorClass}`}
          style={{
            width: leaf.size,
            height: leaf.size,
            left: `${leaf.x}%`,
            top: '-5%',
          }}
          initial={{
            y: '-5%',
            x: 0,
            rotate: leaf.rotationStart,
            opacity: 0
          }}
          animate={{
            y: '105%',
            x: [
              -leaf.swayAmplitude,
              leaf.swayAmplitude,
              -leaf.swayAmplitude * 0.8,
              leaf.swayAmplitude * 0.6,
              -leaf.swayAmplitude * 0.3,
              0
            ],
            rotate: leaf.rotationStart + leaf.rotationSpeed,
            opacity: [0, 0.7, 0.8, 0.8, 0.4, 0] // Fade in initially, remain visible, fade out at the very bottom
          }}
          transition={{
            // Overall falling transition
            y: {
              duration: leaf.duration,
              repeat: Infinity,
              ease: 'linear',
              delay: leaf.delay,
            },
            // Swaying transition
            x: {
              duration: leaf.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: leaf.delay,
            },
            // Spin transition
            rotate: {
              duration: leaf.duration,
              repeat: Infinity,
              ease: 'linear',
              delay: leaf.delay,
            },
            // Opacity fade transition matching the fall
            opacity: {
              duration: leaf.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: leaf.delay,
            }
          }}
        >
          {LEAF_SHAPES[leaf.shapeIndex]}
        </motion.div>
      ))}
    </div>
  );
};
