
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Trash2, QrCode, Gift, User, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { doc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

export default function AdminVoucherViewPage() {
    const router = useRouter();
    const params = useParams();
    const voucherId = params.voucherId as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [voucher, setVoucher] = useState<Voucher | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
             if (!user) {
                router.replace('/login');
            } else {
                setAuthUser(user);
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!authUser || !voucherId) return;

        const voucherDocRef = doc(db, 'shops', authUser.uid, 'vouchers', voucherId);
        getDoc(voucherDocRef).then(docSnap => {
            if (docSnap.exists()) {
                setVoucher({ id: docSnap.id, ...docSnap.data() } as Voucher);
            } else {
                toast({ title: "Voucher not found", variant: "destructive" });
                router.push('/admin/vouchers');
            }
        }).catch(err => {
            console.error(err);
            toast({ title: "Error loading voucher data", variant: "destructive" });
        }).finally(() => {
            setLoading(false);
        });

    }, [authUser, voucherId, router, toast]);

    const handleDelete = async () => {
        if (!authUser || !voucher) return;
        setDeleting(true);
        try {
            await deleteDoc(doc(db, "shops", authUser.uid, "vouchers", voucher.id));
            toast({ title: "Voucher Deleted", description: "The voucher has been permanently removed."});
            router.push('/admin/vouchers');
        } catch(e) {
            toast({ title: "Error", description: "Could not delete the voucher.", variant: "destructive" });
            setDeleting(false);
        }
    };
    
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
            case 'valid': return <CheckCircle className="h-4 w-4 mr-2 text-green-500"/>;
            case 'redeemed': return <CheckCircle className="h-4 w-4 mr-2"/>;
            case 'expired': return <XCircle className="h-4 w-4 mr-2"/>;
            default: return null;
        }
    }

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
    }

    if (!voucher) {
        return <div className="flex h-full w-full items-center justify-center">Voucher not found.</div>
    }
    
    const publicVerificationUrl = `${window.location.origin}/vouchers/${voucher.id}?shopId=${voucher.shopId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicVerificationUrl)}`;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/vouchers">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back</span>
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Voucher Details</h1>
                        <p className="text-muted-foreground font-mono text-xs">{voucher.id}</p>
                    </div>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={deleting}>
                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this voucher.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Gift Voucher</span>
                        <Badge variant={getStatusVariant(voucher.status)} className="text-base">
                            {getStatusIcon(voucher.status)}
                            {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-primary/10 p-6 rounded-lg text-center">
                            <p className="text-sm text-primary font-semibold">Voucher Value</p>
                            <p className="text-6xl font-extrabold text-primary">₹{voucher.value}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
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
                                <Calendar className="h-4 w-4 mt-1 text-muted-foreground"/>
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
                    </div>
                     <div className="flex flex-col items-center justify-center gap-4 bg-muted/50 p-6 rounded-lg">
                        <h3 className="font-semibold text-center">Redemption QR Code</h3>
                        <div className="p-2 bg-white rounded-lg border shadow-sm">
                           <Image src={qrCodeUrl} alt="Voucher QR Code" width={150} height={150} />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Staff can scan this to redeem the voucher.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
