import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function IndianFlagIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 24" // Standard flag aspect ratio, adjust if needed
      className={cn("h-4 w-6", className)} // Default size, can be overridden
      {...props}
    >
      <rect width="36" height="24" fill="#FFF" />
      <rect width="36" height="8" fill="#FF9933" /> {/* Saffron */}
      <rect y="16" width="36" height="8" fill="#138808" /> {/* Green */}
      <circle cx="18" cy="12" r="3" fill="#000080" /> {/* Ashoka Chakra - Navy Blue */}
      <circle cx="18" cy="12" r="2.6" fill="#FFF" /> {/* Inner white circle for Chakra */}
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="18"
          y1="12"
          x2={18 + 2.5 * Math.cos((i * 15 * Math.PI) / 180)}
          y2={12 + 2.5 * Math.sin((i * 15 * Math.PI) / 180)}
          stroke="#000080"
          strokeWidth="0.4" // Thinner spokes
        />
      ))}
      <circle cx="18" cy="12" r="0.7" fill="#000080"/> {/* Hub of the Chakra */}
    </svg>
  );
}
