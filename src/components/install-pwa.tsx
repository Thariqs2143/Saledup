
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Define the event type for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if the prompt has been dismissed before
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
          setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast({ title: "App Installed!", description: "Attendry has been added to your home screen." });
    }
    setDeferredPrompt(null);
    setIsVisible(false);
  };
  
  const handleDismiss = () => {
      setIsVisible(false);
      // Remember dismissal for a day
      localStorage.setItem('pwa_install_dismissed', 'true');
      setTimeout(() => localStorage.removeItem('pwa_install_dismissed'), 24 * 60 * 60 * 1000);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-background border-2 border-primary rounded-lg shadow-2xl p-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="font-semibold text-foreground">Install Attendry App</p>
          <p className="text-sm text-muted-foreground">Get a faster, native app experience.</p>
        </div>
        <Button onClick={handleInstallClick} size="sm">
          <Download className="mr-2 h-4 w-4" />
          Install
        </Button>
         <Button onClick={handleDismiss} variant="ghost" size="icon" className="h-8 w-8">
            <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
