
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
      router.push('/role-selection');
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 animate-in fade-in duration-1000">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-primary mt-6">Attendry</h1>
      </div>
    </main>
  );
}
