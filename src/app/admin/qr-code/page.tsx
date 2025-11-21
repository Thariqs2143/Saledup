
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { QrCode, Loader2, Download, Copy, Activity } from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, orderBy, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

type Claim = {
    id:string;
    customerName: string;
    customerEmail: string;
    offerId: string;
    offerTitle: string;
    claimedAt: Timestamp;
};

export default function GenerateQrPage() {
    const { toast } = useToast();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [shopData, setShopData] = useState<{ shopName?: string, id?: string }>({});
    const [qrUrl, setQrUrl] = useState('');
    const [publicUrl, setPublicUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loadingClaims, setLoadingClaims] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAuthUser(user);
                try {
                    const shopDocRef = doc(db, 'shops', user.uid);
                    const shopSnap = await getDoc(shopDocRef);
                    if (shopSnap.exists()) {
                        const data = shopSnap.data();
                        setShopData({ shopName: data.shopName, id: shopSnap.id });
                        
                        const shopPublicUrl = `${window.location.origin}/shops/${shopSnap.id}`;
                        setPublicUrl(shopPublicUrl);

                        // If publicUrl exists in DB, use it, otherwise generate and save it
                        if (data.publicUrl) {
                            setPublicUrl(data.publicUrl);
                            setQrUrl(data.permanentQrUrl);
                        } else {
                            const qrData = encodeURIComponent(shopPublicUrl);
                            const generatedUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrData}`;
                            setQrUrl(generatedUrl);
                            
                            await setDoc(doc(db, 'shops', user.uid), {
                                permanentQrUrl: generatedUrl,
                                publicUrl: shopPublicUrl
                            }, { merge: true });
                        }

                    }
                } catch (e) {
                    console.error("Error fetching shop data", e);
                    toast({ title: "Error", description: "Could not load your shop details.", variant: "destructive" });
                } finally {
                    setLoading(false);
                }

                // Setup claims listener
                const claimsQuery = query(collection(db, 'shops', user.uid, 'claims'), orderBy('claimedAt', 'desc'));
                const unsubscribeClaims = onSnapshot(claimsQuery, (snapshot) => {
                    const claimsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim));
                    setClaims(claimsList);
                    setLoadingClaims(false);
                }, (error) => {
                    console.error("Error fetching claims:", error);
                    toast({ title: "Error", description: "Could not fetch customer claims.", variant: "destructive"});
                    setLoadingClaims(false);
                });
                
                return () => unsubscribeClaims();

            } else {
                setLoading(false);
                setLoadingClaims(false);
            }
        });
        return () => unsubscribe();
    }, [toast]);

    const handleDownload = () => {
        if (!qrUrl) return;
        fetch(qrUrl).then(response => response.blob()).then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `saledup_qr_${shopData.shopName?.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        }).catch(console.error);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        toast({ title: "Link Copied!", description: "The public URL for your shop has been copied." });
    }

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Shop QR Code</h1>
                <p className="text-muted-foreground hidden md:block">Print this code and display it in your shop for customers to scan.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <Card className="w-full transition-all duration-300 ease-out hover:shadow-lg">
                    <CardHeader className="hidden lg:block">
                        <CardTitle className="flex items-center gap-2"><QrCode /> Permanent Shop QR Code</CardTitle>
                        <CardDescription>
                            This single QR code links customers directly to your shop's offer page.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-8 gap-4">
                        {loading ? <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            : qrUrl ? (
                                <div className="flex flex-col items-center justify-center gap-4 transition-all animate-in fade-in-50 duration-500">
                                    <div className="relative w-64 h-64 border p-2 rounded-lg bg-white">
                                        <Image src={qrUrl} alt="Saledup Shop QR Code" width={256} height={256} className="rounded-md"/>
                                    </div>
                                    <p className="font-semibold text-lg text-center">{shopData.shopName}</p>
                                </div>
                            ) : <p className="text-muted-foreground">Could not generate QR code. Please ensure your shop profile is complete.</p>
                        }
                    </CardContent>
                    <CardFooter className="flex-col gap-4 pt-6">
                        <Button onClick={handleDownload} className="w-full" disabled={loading || !qrUrl}>
                            <Download className="mr-2 h-4 w-4"/>Download for Print
                        </Button>
                        <div className="w-full flex items-center space-x-2">
                            <div className="grid flex-1 gap-2">
                                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground truncate">{publicUrl}</span>
                            </div>
                            <Button type="button" size="sm" className="px-3" onClick={handleCopyLink} disabled={!publicUrl}>
                                <span className="sr-only">Copy</span>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>

                 <Card className="transform-gpu transition-all duration-300 ease-out hover:shadow-lg">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                        <Activity className="h-6 w-6 text-primary"/>
                        <CardTitle>Recent Claims</CardTitle>
                        </div>
                        <CardDescription>A real-time log of the latest offer claims.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingClaims ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : claims.length > 0 ? (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {claims.map((claim) => (
                                <div key={claim.id} className="flex items-start gap-4">
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarFallback>{claim.customerName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-sm">
                                        <p>
                                            <span className="font-semibold">{claim.customerName}</span>
                                            {' '}claimed the offer "{claim.offerTitle}".
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(claim.claimedAt.toDate(), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground space-y-2">
                                <p className="font-bold">No claims yet.</p>
                                <p className="text-sm">When customers claim an offer, it will appear here in real-time.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
