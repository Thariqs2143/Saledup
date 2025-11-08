'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { QrCode, Loader2, Download, Link as LinkIcon, Copy } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';

export default function GenerateQrPage() {
    const { toast } = useToast();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [shopData, setShopData] = useState<{ shopName?: string, id?: string }>({});
    const [qrUrl, setQrUrl] = useState('');
    const [publicUrl, setPublicUrl] = useState('');
    const [loading, setLoading] = useState(true);

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
                        
                        // Define the public URL for the shop's offer page
                        const shopPublicUrl = `${window.location.origin}/shops/${shopSnap.id}`;
                        setPublicUrl(shopPublicUrl);

                        // Generate QR code data pointing to the public shop page
                        const qrData = encodeURIComponent(shopPublicUrl);
                        const generatedUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrData}`;
                        setQrUrl(generatedUrl);
                        
                        // Save the permanent QR URL to the shop document for reference if needed
                        await setDoc(doc(db, 'shops', user.uid), {
                            permanentQrUrl: generatedUrl,
                            publicUrl: shopPublicUrl
                        }, { merge: true });

                    }
                } catch (e) {
                    console.error("Error fetching shop data", e);
                    toast({ title: "Error", description: "Could not load your shop details.", variant: "destructive" });
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
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
                <p className="text-muted-foreground">Print this code and display it in your shop for customers to scan.</p>
            </div>
            <Card className="w-full max-w-lg mx-auto transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
                <CardHeader>
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
        </div>
    );
}
