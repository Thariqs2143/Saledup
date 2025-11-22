
'use client';

import { useEffect, useState } from 'react';

type AnimatedCounterProps = {
  from?: number;
  to: number;
  duration?: number;
};

export function AnimatedCounter({ from = 0, to, duration = 1000 }: AnimatedCounterProps) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const finalTo = !isNaN(Number(to)) ? Number(to) : 0;
    const finalFrom = !isNaN(Number(from)) ? Number(from) : 0;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * (finalTo - finalFrom) + finalFrom));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [from, to, duration]);

  return <span>{count}</span>;
}
