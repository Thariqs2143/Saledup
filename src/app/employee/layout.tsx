'use client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

// This layout is now a redirector as the employee-specific app concept has been removed.
export default function EmployeeRedirectLayout() {
  const router = useRouter();

  useEffect(() => {
    // Redirect all traffic from /employee/* to the main login page.
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
