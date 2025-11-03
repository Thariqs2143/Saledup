'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, Share2, ZoomIn } from 'lucide-react';
import Link from 'next/link';
import { QrCodePlaceholder } from '@/components/qr-code-placeholder';

export default function GenerateQrCodePage() {
  const [isGenerated, setIsGenerated] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  return (
    <div className="p-4 space-y-6 sm:p-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Dashboard</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Generate QR Code</h1>
      </div>

      {!isGenerated ? (
        <Card>
          <CardHeader>
            <CardTitle>Set Attendance Window</CardTitle>
            <CardDescription>
              Select the time window for which this QR code will be valid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <Button
              onClick={() => setIsGenerated(true)}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Generate QR
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center space-y-4">
          <Card className="p-6">
            <QrCodePlaceholder className="w-full h-full max-w-[300px] mx-auto rounded-lg" />
            <p className="mt-4 text-muted-foreground">
              Valid from {startTime} to {endTime}
            </p>
          </Card>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button variant="outline">
              <ZoomIn className="mr-2 h-4 w-4" /> Fullscreen
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>
          <Button onClick={() => setIsGenerated(false)} variant="link">
            Generate new code
          </Button>
        </div>
      )}
    </div>
  );
}
