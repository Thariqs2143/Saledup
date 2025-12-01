
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, Timestamp, setDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ScanLine, Ticket, User as UserIcon, CheckCircle, XCircle, CameraOff, Gem, Gift } from 'lucide-react';
import jsQR from 'jsqr';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

// Offer Claim Type
type OfferClaim = {
    id: string;
    customerName: string;
    customerPhone: string;
    offerTitle: string;
    status: 'claimed' | 'redeemed';
    claimedAt: Timestamp;
};

// Gift Voucher Type
type GiftVoucher = {
    id: string;
    customerName: string;
    value: number;
    status: 'valid' | 'redeemed' | 'expired';
    expiresAt: Timestamp;
};


export default function RedeemOfferPage() {
    const { toast } = useToast();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // State for Dialogs
    const [scannedOffer, setScannedOffer] = useState<OfferClaim | null>(null);
    const [scannedVoucher, setScannedVoucher] = useState<GiftVoucher | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [activeTab, setActiveTab] = useState('offers');

    const isDialogOpen = !!scannedOffer || !!scannedVoucher;

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

        if(hasCameraPermission && !isDialogOpen && videoRef.current){
            animationFrameId = requestAnimationFrame(tick);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [hasCameraPermission, isDialogOpen, isProcessing, activeTab]);
    
    const handleQrCodeScanned = async (scannedData: string) => {
        if (!authUser || isProcessing) return;
        setIsProcessing(true);

        let entityId = scannedData;

        // --- Robust ID Parsing ---
        try {
            // If the scanned data is a full URL, try to extract the ID from the pathname.
            if (scannedData.startsWith('http')) {
                const url = new URL(scannedData);
                const pathParts = url.pathname.split('/').filter(part => part); // filter out empty strings
                if (pathParts.length > 0) {
                    entityId = pathParts[pathParts.length - 1]; // Assume the ID is the last part of the path
                }
            }
        } catch (e) {
            // Not a valid URL, treat the whole string as the potential ID.
            entityId = scannedData;
        }

        if (!entityId || entityId.includes('/')) {
            toast({ variant: 'destructive', title: 'Invalid QR Code', description: 'The scanned code is not in a valid format.' });
            setIsProcessing(false);
            return;
        }

        try {
            if (activeTab === 'offers') {
                 const claimDocRef = doc(db, 'shops', authUser.uid, 'claims', entityId);
                 const claimSnap = await getDoc(claimDocRef);
                 if (claimSnap.exists()) {
                     setScannedOffer({ id: claimSnap.id, ...claimSnap.data() } as OfferClaim);
                 } else {
                      toast({ variant: 'destructive', title: 'Invalid Offer QR', description: 'This QR code is not a valid offer claim for your shop.' });
                 }
            } else if (activeTab === 'vouchers') {
                const voucherDocRef = doc(db, 'shops', authUser.uid, 'vouchers', entityId);
                const voucherSnap = await getDoc(voucherDocRef);

                if (voucherSnap.exists()) {
                    let voucherData = { id: voucherSnap.id, ...voucherSnap.data() } as GiftVoucher;
                    const expiresAt = voucherData.expiresAt.toDate();
                    if (voucherData.status === 'valid' && expiresAt < new Date()) {
                        voucherData.status = 'expired';
                    }
                    setScannedVoucher(voucherData);
                } else {
                    toast({ variant: 'destructive', title: 'Voucher Not Found', description: 'The scanned voucher does not exist or is not for this shop.' });
                }
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not verify the QR code. Please ensure it is valid.' });
            console.error("QR Scan Error:", error);
        } finally {
            // Only set isProcessing to false if no dialog is opened
            if (!scannedOffer && !scannedVoucher) {
                setTimeout(() => setIsProcessing(false), 1000); // Add a small delay to prevent rapid re-scans of invalid codes
            }
        }
    };


    const handleRedeemOffer = async () => {
        if (!scannedOffer || !authUser || scannedOffer.status === 'redeemed') return;
        setIsProcessing(true);

        try {
            const claimDocRef = doc(db, 'shops', authUser.uid, 'claims', scannedOffer.id);
            await updateDoc(claimDocRef, { status: 'redeemed' });

            toast({
                title: 'Success!',
                description: `Offer redeemed for ${scannedOffer.customerName}.`,
                className: "bg-green-500 text-white",
            });
            setScannedOffer(prev => prev ? { ...prev, status: 'redeemed' } : null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Redemption Failed', description: 'Could not update the claim status.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRedeemVoucher = async () => {
        if (!scannedVoucher || !authUser || scannedVoucher.status !== 'valid') return;
        setIsProcessing(true);

        try {
            const voucherDocRef = doc(db, 'shops', authUser.uid, 'vouchers', scannedVoucher.id);
            await updateDoc(voucherDocRef, { 
                status: 'redeemed',
                redeemedAt: serverTimestamp(),
                redeemedBy: authUser.uid // Track which staff member redeemed
            });

            toast({
                title: 'Voucher Redeemed!',
                description: `₹${scannedVoucher.value} voucher for ${scannedVoucher.customerName} has been redeemed.`,
                className: "bg-green-500 text-white",
            });
            setScannedVoucher(prev => prev ? { ...prev, status: 'redeemed' } : null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Voucher Redemption Failed', description: 'Could not update the voucher status.' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const closeDialog = () => {
        setScannedOffer(null);
        setScannedVoucher(null);
        setIsProcessing(false);
    };

    return (
        <div className="space-y-6">
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="offers" className="font-bold"><Gift className="mr-2 h-4 w-4"/> Redeem Offer</TabsTrigger>
                    <TabsTrigger value="vouchers" className="font-bold"><Ticket className="mr-2 h-4 w-4"/> Redeem Voucher</TabsTrigger>
                </TabsList>
            </Tabs>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-bold"><ScanLine /> QR Code Scanner</CardTitle>
                    <CardDescription className="font-semibold">Position the customer's {activeTab === 'offers' ? 'offer' : 'voucher'} QR code within the frame.</CardDescription>
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
                <DialogContent className="max-w-md">
                    {scannedOffer && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Confirm Offer Redemption</DialogTitle>
                                <DialogDescription>Verify the details below before completing.</DialogDescription>
                            </DialogHeader>
                             <div className="py-4 space-y-4">
                                {scannedOffer.status === 'redeemed' ? (
                                    <Alert variant="destructive">
                                        <XCircle className="h-4 w-4"/>
                                        <AlertTitle>Offer Already Redeemed</AlertTitle>
                                        <AlertDescription>
                                            This offer was already used on {scannedOffer.claimedAt.toDate().toLocaleDateString()}.
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
                                        <span className="font-semibold">{scannedOffer.customerName}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Ticket className="h-4 w-4 text-muted-foreground"/>
                                        <span>{scannedOffer.offerTitle}</span>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="flex-col gap-2">
                                <Button 
                                    type="button" 
                                    onClick={handleRedeemOffer} 
                                    disabled={isProcessing || scannedOffer.status === 'redeemed'}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Confirm Offer Redemption
                                </Button>
                                 <Button type="button" variant="outline" onClick={closeDialog} className="w-full">Done & Close</Button>
                            </DialogFooter>
                        </>
                    )}
                    {scannedVoucher && (
                         <>
                            <DialogHeader>
                                <DialogTitle>Confirm Voucher Redemption</DialogTitle>
                                <DialogDescription>Verify the voucher details before redeeming.</DialogDescription>
                            </DialogHeader>
                             <div className="py-4 space-y-4">
                                {scannedVoucher.status === 'redeemed' ? (
                                     <Alert variant="destructive">
                                        <XCircle className="h-4 w-4"/>
                                        <AlertTitle>Voucher Already Redeemed</AlertTitle>
                                    </Alert>
                                ) : scannedVoucher.status === 'expired' ? (
                                    <Alert variant="destructive">
                                        <XCircle className="h-4 w-4"/>
                                        <AlertTitle>Voucher Expired</AlertTitle>
                                        <AlertDescription>This voucher expired on {format(scannedVoucher.expiresAt.toDate(), 'PP')}.</AlertDescription>
                                    </Alert>
                                ) : (
                                     <Alert>
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <AlertTitle>Valid Voucher!</AlertTitle>
                                    </Alert>
                                )}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-sm">
                                        <UserIcon className="h-4 w-4 text-muted-foreground"/>
                                        <span className="font-semibold">{scannedVoucher.customerName}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-lg">
                                        <Gift className="h-5 w-5 text-muted-foreground"/>
                                        <span className="font-bold">Value: ₹{scannedVoucher.value}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Ticket className="h-4 w-4 text-muted-foreground"/>
                                        <span>Expires on: {format(scannedVoucher.expiresAt.toDate(), 'PPpp')}</span>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="flex-col gap-2">
                                <Button 
                                    type="button" 
                                    onClick={handleRedeemVoucher} 
                                    disabled={isProcessing || scannedVoucher.status !== 'valid'}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Redeem Voucher (₹{scannedVoucher.value})
                                </Button>
                                 <Button type="button" variant="outline" onClick={closeDialog} className="w-full">Done & Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}
