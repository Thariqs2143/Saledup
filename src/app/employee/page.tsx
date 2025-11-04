
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanLine, CheckCircle, XCircle, Loader2, CameraOff, LogIn, LogOut, PartyPopper } from "lucide-react";
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, writeBatch, Timestamp, query, where, getDocs, limit } from 'firebase/firestore';
import type { User as AppUser } from '@/app/admin/employees/page';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addMinutes, startOfDay, endOfDay } from 'date-fns';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'processing';
type AttendanceRecord = {
    id: string;
    checkInTime: Timestamp;
    checkOutTime?: Timestamp;
};


export default function ScanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [activeCheckIn, setActiveCheckIn] = useState<AttendanceRecord | null>(null);
  const [hasCompletedDay, setHasCompletedDay] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentDate, setCurrentDate] = useState('');


  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  const checkAttendanceStatusForToday = useCallback(async (employeeId: string, shopId: string) => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const attendanceQuery = query(
        collection(db, 'shops', shopId, 'attendance'),
        where('userId', '==', employeeId),
        where('checkInTime', '>=', todayStart),
        where('checkInTime', '<=', todayEnd),
        limit(1)
    );
    const snapshot = await getDocs(attendanceQuery);
    if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const record = { id: docSnap.id, ...docSnap.data() } as AttendanceRecord;
        if (record.checkOutTime) {
            // Already checked in and out today
            setHasCompletedDay(true);
            setActiveCheckIn(null);
        } else {
            // Actively checked in
            setActiveCheckIn(record);
            setHasCompletedDay(false);
        }
    } else {
        // No record for today
        setActiveCheckIn(null);
        setHasCompletedDay(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.phoneNumber) {
        setAuthUser(user);
        const phoneLookupRef = doc(db, "employee_phone_to_shop_lookup", user.phoneNumber);
        const phoneLookupSnap = await getDoc(phoneLookupRef);

        if (phoneLookupSnap.exists()) {
            const { shopId, employeeDocId } = phoneLookupSnap.data();
            const employeeDocRef = doc(db, "shops", shopId, "employees", employeeDocId);
            const employeeDocSnap = await getDoc(employeeDocRef);

            if (employeeDocSnap.exists()) {
              const profile = { id: employeeDocSnap.id, ...employeeDocSnap.data() } as AppUser;
              setUserProfile(profile);
              await checkAttendanceStatusForToday(employeeDocId, shopId);
            } else {
                router.push('/employee/login');
            }
        } else {
            router.push('/employee/login');
        }
      } else {
        router.push('/employee/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, checkAttendanceStatusForToday]);


  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);
  
  const handleCheckIn = async (shopId: string) => {
    if (!userProfile?.id) return;
    
    // Check for completed day again right before check-in to prevent race conditions
    await checkAttendanceStatusForToday(userProfile.id, shopId);
    if (hasCompletedDay) {
        toast({ title: 'Already Completed', description: 'You have already checked in and out for today.', variant: 'destructive'});
        setStatus('error');
        return;
    }

    const todayWeekday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
     // Fetch the latest shop settings to ensure accuracy
    const shopDocRef = doc(db, 'shops', shopId);
    const shopSnap = await getDoc(shopDocRef);
    const shopData = shopSnap.exists() ? shopSnap.data() : {};

    const daySettings = shopData.businessHours?.[todayWeekday];
    let attendanceStatus: 'On-time' | 'Late' | 'Half-day' = 'On-time';
    
    if (daySettings?.isOpen) {
        const todayDateStr = new Date().toISOString().split('T')[0];
        const shiftStartTime = new Date(`${todayDateStr}T${daySettings.startTime}`);
        const gracePeriod = shopData.lateGracePeriodMinutes || 0;
        const deadline = addMinutes(shiftStartTime, gracePeriod);
        
        if (new Date() > deadline) {
            attendanceStatus = 'Late';
        }
    }
    
    const pointsChange = attendanceStatus === 'On-time' ? 10 : -5;
    const newStreak = attendanceStatus === 'On-time' ? (userProfile.streak || 0) + 1 : 0;

    const batch = writeBatch(db);
    const newAttendanceRef = doc(collection(db, 'shops', shopId, 'attendance'));
    const newAttendanceRecord = {
        userId: userProfile.id,
        userName: userProfile.name,
        shopId: shopId,
        checkInTime: Timestamp.now(),
        status: attendanceStatus,
        checkOutTime: null,
    };
    batch.set(newAttendanceRef, newAttendanceRecord);
    
    const employeeDocRef = doc(db, 'shops', shopId, 'employees', userProfile.id);
    const newPoints = (userProfile.points || 0) + pointsChange;
    let updateData: any = {
        points: newPoints < 0 ? 0 : newPoints,
        streak: newStreak
    };
    
    if (newStreak > 0 && newStreak % 5 === 0) {
        updateData.points += 50;
        toast({ title: 'Streak Bonus!', description: '+50 bonus points for your 5-day streak!' });
    }

    batch.update(employeeDocRef, updateData);
    await batch.commit();
    
    setActiveCheckIn({ id: newAttendanceRef.id, ...newAttendanceRecord });
    setUserProfile(prev => prev ? {...prev, ...updateData} : null);

    setStatus('success');
    toast({ title: 'Check-in Successful!', description: `You have been marked as ${attendanceStatus}.` });
  };
  
  const handleCheckOut = async () => {
    if (!userProfile?.shopId || !activeCheckIn) return;
    
    const attendanceDocRef = doc(db, 'shops', userProfile.shopId, 'attendance', activeCheckIn.id);
    await updateDoc(attendanceDocRef, {
        checkOutTime: Timestamp.now(),
    });

    setActiveCheckIn(null);
    setHasCompletedDay(true); // Mark day as completed
    setStatus('success');
    toast({ title: 'Check-out Successful!', description: 'Have a great day!' });
  };

  const handleQrCode = useCallback(async (data: string) => {
      setStatus('processing');
      stopCamera();
      
      if (!userProfile?.id || !userProfile?.shopId) {
         toast({ title: 'Error', description: 'Could not identify user.', variant: 'destructive'});
         setStatus('error');
         return;
      }

      try {
        const parts = data.split(';');
        if (parts[0] !== 'attendry-shop-qr' || parts.length < 2) {
            throw new Error('Invalid QR code format.');
        }

        const qrData: {[key: string]: string} = {};
        parts.slice(1).forEach(part => {
            const [key, value] = part.split('=');
            qrData[key] = value;
        });

        if (userProfile.shopId !== qrData.shopId) {
             throw new Error('This QR code does not belong to your assigned shop.');
        }
        
        const shopDocRef = doc(db, 'shops', qrData.shopId);
        const shopSnap = await getDoc(shopDocRef);

        if (!shopSnap.exists()) {
            throw new Error('Shop profile not found. Please contact admin.');
        }
        
        const shopSettings = shopSnap.data();

        // If shop is in dynamic mode, validate timestamp
        if (shopSettings?.qrCodeMode === 'dynamic') {
            if (!qrData.ts) {
                throw new Error('Dynamic QR code expected, but none found. Please use the one displayed on the admin screen.');
            }
            const qrTimestamp = parseInt(qrData.ts, 10);
            const now = Date.now();
            const timeDiffSeconds = (now - qrTimestamp) / 1000;
            
            // Allow a 20-second window (15s refresh + 5s buffer)
            if (timeDiffSeconds > 20) {
                 throw new Error('This QR code has expired. Please scan the current one.');
            }
        }


        if (activeCheckIn) {
            await handleCheckOut();
        } else {
            await handleCheckIn(qrData.shopId);
        }

      } catch (error: any) {
        console.error("Error processing QR code:", error);
        toast({ title: 'Scan Error', description: error.message || 'Could not process QR code.', variant: 'destructive'});
        setStatus('error');
      }

  }, [stopCamera, userProfile, toast, activeCheckIn, handleCheckIn, handleCheckOut]);

  const tick = useCallback(() => {
    if (statusRef.current !== 'scanning' || !videoRef.current?.HAVE_ENOUGH_DATA) {
        if (statusRef.current === 'scanning') {
            animationFrameId.current = requestAnimationFrame(tick);
        }
        return;
    }
    
    if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
            canvas.height = videoRef.current.videoHeight;
            canvas.width = videoRef.current.videoWidth;
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            
            try {
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code?.data) {
                    handleQrCode(code.data);
                    return; // Stop the loop once a code is found and handled
                }
            } catch(e) {
                console.error("jsQR error", e);
            }
        }
    }
    if (statusRef.current === 'scanning') {
      animationFrameId.current = requestAnimationFrame(tick);
    }
  }, [handleQrCode]);

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);


  const startScan = useCallback(async () => {
    setStatus('scanning');
    setHasCameraPermission(null);
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute("playsinline", "true");
            await videoRef.current.play();
            setHasCameraPermission(true);
            animationFrameId.current = requestAnimationFrame(tick);
        }
    } catch (err) {
        console.error("Camera access error:", err);
        setHasCameraPermission(false);
        setStatus('idle');
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to scan the QR code.',
        });
    }
  }, [toast, tick]);


  const renderStatus = () => {
    if (status === 'success' || status === 'error') {
        setTimeout(() => setStatus('idle'), 3000);
    }

    switch(status) {
      case 'success':
        return (
          <div className="flex flex-col items-center gap-4 text-center text-green-600">
            <CheckCircle className="h-20 w-20" />
            <p className="font-bold text-xl">Success!</p>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 text-center text-destructive">
            <XCircle className="h-20 w-20" />
            <p className="font-bold text-xl">Scan Failed</p>
            <p className="text-sm text-muted-foreground">Please try again. Make sure you are scanning the correct QR code.</p>
          </div>
        );
      case 'processing':
          return (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-20 w-20 animate-spin text-primary" />
              <p className="font-bold text-xl">Processing...</p>
              <p className="text-sm text-muted-foreground">Verifying your attendance.</p>
            </div>
          );
      case 'scanning':
        return (
          <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-lg border-4 border-primary shadow-lg">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-[20px] border-black/30 "/>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/2">
                <div className="absolute -top-1 -left-1 h-12 w-12 border-t-4 border-l-4 border-red-500 rounded-tl-lg"/>
                <div className="absolute -top-1 -right-1 h-12 w-12 border-t-4 border-r-4 border-red-500 rounded-tr-lg"/>
                <div className="absolute -bottom-1 -left-1 h-12 w-12 border-b-4 border-l-4 border-red-500 rounded-bl-lg"/>
                <div className="absolute -bottom-1 -right-1 h-12 w-12 border-b-4 border-r-4 border-red-500 rounded-br-lg"/>
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-white bg-black/50 p-2 text-sm">
                Position the QR code inside the frame.
            </p>
          </div>
        );
      case 'idle':
      default:
        if (hasCompletedDay) {
            return (
                <div className="flex flex-col items-center gap-2 text-center">
                    <PartyPopper className="h-20 w-20 text-primary" />
                    <p className="text-lg font-semibold">All Done for Today!</p>
                    <p className="text-sm text-muted-foreground">You have already completed your attendance. See you tomorrow!</p>
                </div>
            )
        }
        if (activeCheckIn) {
            return (
                 <div className="flex flex-col items-center gap-2 text-center">
                     <LogIn className="h-20 w-20 text-green-500" />
                     <p className="text-lg font-semibold">You are checked in!</p>
                     <p className="text-sm text-muted-foreground">Checked in at: {activeCheckIn.checkInTime.toDate().toLocaleTimeString()}</p>
                     <p className="text-sm text-muted-foreground">Scan again to check out.</p>
                 </div>
            )
        }
        return (
          <div className="flex flex-col items-center gap-2 text-center">
             <ScanLine className="h-20 w-20 text-primary" />
             <p className="text-lg font-semibold">Ready to start your day?</p>
             <p className="text-sm text-muted-foreground">Click the button below to scan the attendance QR code to check in.</p>
          </div>
        )
    }
  }


  if (loading || !userProfile) {
     return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome, {userProfile?.name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Scan the QR code to mark your attendance.</p>
      </div>
      <Card className="w-full max-w-lg mx-auto transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
        <CardHeader>
          <CardTitle>Attendance Scanner</CardTitle>
          <CardDescription>{currentDate}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8 min-h-[250px]">
          {renderStatus()}
        </CardContent>
         <CardFooter className="flex-col gap-4 pt-6">
            {hasCameraPermission === false && (
                <Alert variant="destructive">
                    <CameraOff className="h-4 w-4" />
                    <AlertTitle>Camera Permission Denied</AlertTitle>
                    <AlertDescription>
                        You must allow camera access in your browser settings to scan the QR code.
                    </AlertDescription>
                </Alert>
            )}
             {status === 'scanning' ? (
                <Button onClick={stopCamera} size="lg" className="w-full" variant="destructive">
                    Cancel Scan
                </Button>
            ) : (
                <Button onClick={startScan} size="lg" className="w-full" disabled={status === 'processing' || hasCompletedDay}>
                   {activeCheckIn ? (
                        <>
                            <LogOut className="mr-2 h-4 w-4"/> Scan to Check-Out
                        </>
                   ) : (
                        <>
                             <LogIn className="mr-2 h-4 w-4"/> Scan to Check-In
                        </>
                   )}
                </Button>
            )}
        </CardFooter>
      </Card>
      <div className="text-left text-muted-foreground mt-8 py-4">
        <div className="flex flex-col md:flex-row md:gap-x-4">
            <h1 className="text-5xl md:text-6xl font-extrabold">Earn</h1>
            <h1 className="text-5xl md:text-6xl font-extrabold">It Up !</h1>
        </div>
        <p className="text-sm mt-2">Crafted with ❤️ in TamilNadu, India</p>
      </div>
    </div>
  );
}

    