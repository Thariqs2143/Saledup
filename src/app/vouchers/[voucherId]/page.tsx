
'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, CheckCircle, XCircle, Clock, Building, User, Calendar, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LandingFooter } from '@/components/landing-footer';
import { LandingHeader } from '@/components/landing-header';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


type Voucher = {
    id: string;
    customerName: string;
    value: number;
    status: 'valid' | 'redeemed' | 'expired';
    createdAt: Timestamp;
    expiresAt: Timestamp;
    redeemedAt?: Timestamp;
    shopId: string;
};

type Shop = {
    shopName: string;
    imageUrl?: string;
};


export default function PublicVoucherViewPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const voucherId = params.voucherId as string;
    const shopId = searchParams.get('shopId');

    const [loading, setLoading] = useState(true);
    const [voucher, setVoucher] = useState<Voucher | null>(null);
    const [shop, setShop] = useState<Shop | null>(null);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        if (!voucherId || !shopId) {
            setError("Invalid voucher link.");
            setLoading(false);
            return;
        }

        const fetchVoucherData = async () => {
            try {
                const voucherDocRef = doc(db, 'shops', shopId, 'vouchers', voucherId);
                const voucherSnap = await getDoc(voucherDocRef);

                if (!voucherSnap.exists()) {
                    throw new Error("This voucher does not exist or is invalid.");
                }
                let voucherData = { id: voucherSnap.id, ...voucherSnap.data() } as Voucher;

                // Client-side expiry check
                const now = new Date();
                if (voucherData.status === 'valid' && voucherData.expiresAt.toDate() < now) {
                    voucherData.status = 'expired';
                }
                setVoucher(voucherData);
                
                // Fetch shop details
                const shopDocRef = doc(db, 'shops', shopId);
                const shopSnap = await getDoc(shopDocRef);
                if (shopSnap.exists()) {
                    setShop(shopSnap.data() as Shop);
                }


            } catch (err: any) {
                setError(err.message || "Could not verify this voucher.");
            } finally {
                setLoading(false);
            }
        };

        fetchVoucherData();

    }, [voucherId, shopId]);
    
    const getStatusVariant = (status: Voucher['status']) => {
        switch(status) {
            case 'valid': return 'secondary';
            case 'redeemed': return 'default';
            case 'expired': return 'destructive';
            default: return 'outline';
        }
    };
    
    const getStatusIcon = (status: Voucher['status']) => {
         switch(status) {
            case 'valid': return <CheckCircle className="h-5 w-5 mr-2 text-green-500"/>;
            case 'redeemed': return <CheckCircle className="h-5 w-5 mr-2"/>;
            case 'expired': return <XCircle className="h-5 w-5 mr-2"/>;
            default: return null;
        }
    }
    
    const MainContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Verifying your voucher...</p>
                </div>
            );
        }

        if (error || !voucher) {
            return (
                 <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                    <XCircle className="h-16 w-16 text-destructive"/>
                    <h2 className="text-2xl font-bold">Verification Failed</h2>
                    <p className="text-muted-foreground">{error || "This voucher could not be verified."}</p>
                </div>
            )
        }
        
        return (
             <Card className="w-full max-w-lg shadow-2xl animate-in fade-in-50 duration-500">
                <CardHeader>
                    {shop && (
                        <div className="flex items-center gap-3 mb-4">
                            <Avatar className="h-12 w-12 border">
                                <AvatarImage src={shop.imageUrl} />
                                <AvatarFallback><Building/></AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm text-muted-foreground">This voucher is valid at</p>
                                <p className="font-bold">{shop.shopName}</p>
                            </div>
                        </div>
                    )}
                    <CardTitle className="flex items-center justify-between">
                        <span>Gift Voucher Details</span>
                         <Badge variant={getStatusVariant(voucher.status)} className="text-base py-1">
                            {getStatusIcon(voucher.status)}
                            {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-primary/10 p-6 rounded-lg text-center">
                        <p className="text-sm text-primary font-semibold">Voucher Value</p>
                        <p className="text-6xl font-extrabold text-primary">₹{voucher.value}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-3">
                            <User className="h-4 w-4 mt-1 text-muted-foreground"/>
                            <div>
                                <p className="text-muted-foreground">Issued to</p>
                                <p className="font-semibold">{voucher.customerName}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Calendar className="h-4 w-4 mt-1 text-muted-foreground"/>
                            <div>
                                <p className="text-muted-foreground">Issued On</p>
                                <p className="font-semibold">{format(voucher.createdAt.toDate(), 'PP')}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Clock className="h-4 w-4 mt-1 text-muted-foreground"/>
                            <div>
                                <p className="text-muted-foreground">Expires On</p>
                                <p className="font-semibold">{format(voucher.expiresAt.toDate(), 'PPpp')}</p>
                            </div>
                        </div>
                         {voucher.redeemedAt && (
                            <div className="flex items-start gap-3">
                                <CheckCircle className="h-4 w-4 mt-1 text-muted-foreground"/>
                                <div>
                                    <p className="text-muted-foreground">Redeemed On</p>
                                    <p className="font-semibold">{format(voucher.redeemedAt.toDate(), 'PPpp')}</p>
                                </div>
                            </div>
                         )}
                    </div>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground text-center w-full">Voucher ID: {voucher.id}</p>
                </CardFooter>
            </Card>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-muted/30">
            <LandingHeader />
            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <MainContent />
            </main>
            <LandingFooter />
        </div>
    )
}
