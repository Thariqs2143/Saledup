
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * A client component that listens for Firestore permission errors
 * and displays them as toasts during development. This component
 * should be rendered in the root layout.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      if (FirestorePermissionError.isFirestorePermissionError(error)) {
        console.error(error); // Log the full error for debugging
        
        toast({
          variant: "destructive",
          title: "Firestore Security Error",
          description: (
            <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
              <code className="text-white">{error.message}</code>
            </pre>
          ),
          duration: 30000, // Show for longer
        });
        
        // This makes the error show up in the Next.js error overlay
        throw error;
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null; // This component does not render anything
}

    