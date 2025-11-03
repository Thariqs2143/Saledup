'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function EmployeeHomePage() {
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(
    null
  );
  const [timestamp, setTimestamp] = useState('');

  const handleScan = () => {
    // Simulate scan
    const isSuccess = Math.random() > 0.3; // 70% chance of success
    if (isSuccess) {
      setScanResult('success');
      setTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      setScanResult('error');
    }
    // Reset after a few seconds
    setTimeout(() => setScanResult(null), 4000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-screen space-y-8">
      <div className="relative flex items-center justify-center w-64 h-64 bg-secondary rounded-2xl overflow-hidden">
        <Camera className="w-24 h-24 text-muted-foreground" />
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
          <div className="w-48 h-48 border-4 border-white/50 border-dashed rounded-lg" />
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold">Scan QR Code</h1>
        <p className="text-muted-foreground max-w-xs">
          Point your camera at the shop's QR code to mark your attendance.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <Button
          onClick={handleScan}
          size="lg"
          className="w-full h-16 bg-accent text-accent-foreground hover:bg-accent/90 text-lg"
        >
          <QrCode className="mr-2 h-6 w-6" />
          Scan Code
        </Button>

        {scanResult && (
          <Alert variant={scanResult === 'success' ? 'default' : 'destructive'}>
            {scanResult === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {scanResult === 'success' ? 'Success!' : 'Error!'}
            </AlertTitle>
            <AlertDescription>
              {scanResult === 'success'
                ? `Attendance marked at ${timestamp}`
                : 'Invalid or expired QR code.'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
