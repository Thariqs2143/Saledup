
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ScanLine, Ticket, User as UserIcon, CheckCircle, XCircle, CameraOff } from 'lucide-react';
import jsQR from 'jsqr';

type Claim = {
    id: string;
    customerName: string;
    offerTitle: string;
    status: 'claimed' | 'redeemed';
    claimedAt: Timestamp;
};

export default function RedeemOfferPage() {
    const { toast } = useToast();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scannedClaim, setScannedClaim] = useState<Claim | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => setAuthUser(user));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const getCameraPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
            }
        };
        getCameraPermission();

        // Cleanup function to stop the camera stream when component unmounts
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        let animationFrameId: number;
        
        const tick = () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d', { willReadFrequently: true });
                
                if (context) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code && !isDialogOpen && !isProcessing) {
                        handleQrCodeScanned(code.data);
                    }
                }
            }
            animationFrameId = requestAnimationFrame(tick);
        };

        if(hasCameraPermission && !isDialogOpen){
            animationFrameId = requestAnimationFrame(tick);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [hasCameraPermission, isDialogOpen, isProcessing]);
    
    const handleQrCodeScanned = async (claimId: string) => {
        if (!authUser) return;
        setIsProcessing(true);

        try {
            const claimDocRef = doc(db, 'shops', authUser.uid, 'claims', claimId);
            const claimSnap = await getDoc(claimDocRef);

            if (claimSnap.exists()) {
                const claimData = { id: claimSnap.id, ...claimSnap.data() } as Claim;
                setScannedClaim(claimData);
                setIsDialogOpen(true);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Invalid QR Code',
                    description: 'This QR code is not a valid offer claim for your shop.',
                });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not verify the QR code.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRedeem = async () => {
        if (!scannedClaim || !authUser || scannedClaim.status === 'redeemed') return;
        setIsProcessing(true);

        try {
            const claimDocRef = doc(db, 'shops', authUser.uid, 'claims', scannedClaim.id);
            await updateDoc(claimDocRef, { status: 'redeemed' });

            toast({
                title: 'Success!',
                description: `Offer redeemed for ${scannedClaim.customerName}.`,
                className: "bg-green-500 text-white",
            });
            closeDialog();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Redemption Failed', description: 'Could not update the claim status.' });
            setIsProcessing(false);
        }
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setScannedClaim(null);
        setIsProcessing(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Redeem Offer</h1>
                <p className="text-muted-foreground">Scan a customer's claimed offer QR code to validate it.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ScanLine /> QR Code Scanner</CardTitle>
                    <CardDescription>Position the customer's QR code within the frame.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="aspect-square max-w-md mx-auto bg-muted rounded-lg overflow-hidden relative">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-0 border-[10px] border-black/20 rounded-lg" />
                        <div className="absolute inset-8 border-4 border-dashed border-white/50 rounded-lg" />
                        
                        {hasCameraPermission === false && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-4">
                                <CameraOff className="h-12 w-12 mb-4" />
                                <h3 className="text-lg font-bold">Camera Access Denied</h3>
                                <p className="text-center text-sm">Please enable camera permissions in your browser settings to use the scanner.</p>
                            </div>
                        )}
                        {hasCameraPermission === null && (
                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white">
                                <Loader2 className="h-10 w-10 animate-spin" />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
                <DialogContent>
                    {scannedClaim && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Confirm Redemption</DialogTitle>
                                <DialogDescription>
                                    Verify the details below before completing the redemption.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                {scannedClaim.status === 'redeemed' ? (
                                     <Alert variant="destructive">
                                        <XCircle className="h-4 w-4"/>
                                        <AlertTitle>Offer Already Redeemed</AlertTitle>
                                        <AlertDescription>
                                            This offer was already redeemed on {scannedClaim.claimedAt.toDate().toLocaleDateString()}.
                                        </AlertDescription>
                                    </Alert>
                                ): (
                                    <Alert>
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <AlertTitle>Valid Claim!</AlertTitle>
                                    </Alert>
                                )}
                               
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-sm">
                                        <UserIcon className="h-4 w-4 text-muted-foreground"/>
                                        <span className="font-semibold">{scannedClaim.customerName}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Ticket className="h-4 w-4 text-muted-foreground"/>
                                        <span>{scannedClaim.offerTitle}</span>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                                <Button 
                                    type="button" 
                                    onClick={handleRedeem} 
                                    disabled={isProcessing || scannedClaim.status === 'redeemed'}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Confirm Redemption
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}
