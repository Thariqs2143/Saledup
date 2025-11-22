
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Gift, CheckCircle, Clock, Search, IndianRupee, Trash2, User, Calendar } from "lucide-react";
import Link from 'next/link';
import { collection, onSnapshot, query, where, Timestamp, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AnimatedCounter } from '@/components/animated-counter';
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
} from "@/components/ui/alert-dialog"

type Voucher = {
    id: string;
    customerName: string;
    value: number;
    status: 'valid' | 'redeemed' | 'expired';
    createdAt: Timestamp;
    expiresAt: Timestamp | Date; // Can be either
    redeemedAt?: Timestamp;
};

export default function AdminVouchersPage() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!authUser) return;

        const vouchersQuery = query(collection(db, 'shops', authUser.uid, 'vouchers'), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(vouchersQuery, (snapshot) => {
            const now = new Date();
            const vouchersList = snapshot.docs.map(doc => {
                const data = doc.data();
                const voucher = { id: doc.id, ...data } as Voucher;

                // Ensure expiresAt is a Date object for comparison
                const expiryDate = voucher.expiresAt instanceof Timestamp 
                    ? voucher.expiresAt.toDate() 
                    : voucher.expiresAt;

                // Check for expiry client-side if status isn't already expired
                if (voucher.status === 'valid' && expiryDate < now) {
                    voucher.status = 'expired';
                }
                return voucher;
            });
            setVouchers(vouchersList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching vouchers: ", error);
            toast({ title: "Permission Denied", description: "You don't have permission to view vouchers.", variant: "destructive"});
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser, toast]);

    const stats = useMemo(() => {
        const totalIssued = vouchers.length;
        const totalRedeemed = vouchers.filter(v => v.status === 'redeemed').length;
        const pending = vouchers.filter(v => v.status === 'valid').length;
        const totalValueRedeemed = vouchers
            .filter(v => v.status === 'redeemed')
            .reduce((sum, v) => sum + v.value, 0);

        return { totalIssued, totalRedeemed, pending, totalValueRedeemed };
    }, [vouchers]);
    
    const filteredVouchers = vouchers.filter(v => 
        v.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusVariant = (status: Voucher['status']) => {
        switch(status) {
            case 'valid': return 'secondary';
            case 'redeemed': return 'default';
            case 'expired': return 'destructive';
            default: return 'outline';
        }
    };
    
    const handleDeleteAll = async () => {
        if (!authUser || vouchers.length === 0) return;
        setDeleting(true);
        try {
            const vouchersCollectionRef = collection(db, 'shops', authUser.uid, 'vouchers');
            const vouchersSnapshot = await getDocs(vouchersCollectionRef);
            
            if (vouchersSnapshot.empty) {
                 toast({ title: "No Vouchers to Delete", description: "There are no vouchers to delete." });
                 setDeleting(false);
                 return;
            }

            const batch = writeBatch(db);
            vouchersSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            toast({ title: "All Vouchers Deleted", description: "All voucher records have been permanently removed." });

        } catch (error) {
            console.error("Error deleting all vouchers:", error);
            toast({ title: "Deletion Failed", description: "Could not delete all vouchers.", variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gift Vouchers</h1>
                    <p className="text-muted-foreground font-semibold">Create, manage, and track corporate and individual gift vouchers.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                 <Card className="transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 border-blue-200 dark:border-blue-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold">Total Issued</CardTitle>
                        <Gift className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><AnimatedCounter from={0} to={stats.totalIssued} /></div>
                    </CardContent>
                </Card>
                 <Card className="transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 border-green-200 dark:border-green-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold">Total Redeemed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-300" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><AnimatedCounter from={0} to={stats.totalRedeemed} /></div>
                    </CardContent>
                </Card>
                 <Card className="transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 border-amber-200 dark:border-amber-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold">Pending Vouchers</CardTitle>
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><AnimatedCounter from={0} to={stats.pending} /></div>
                    </CardContent>
                </Card>
                 <Card className="transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/50 dark:to-rose-900/50 border-red-200 dark:border-red-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold">Value Redeemed</CardTitle>
                        <IndianRupee className="h-4 w-4 text-red-600 dark:text-red-300" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><AnimatedCounter from={0} to={stats.totalValueRedeemed} /></div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                        <h2 className="text-2xl font-bold tracking-tight">Voucher History</h2>
                        <p className="text-muted-foreground font-semibold">A complete log of all generated gift vouchers.</p>
                    </div>
                 </div>

                <div className="space-y-4">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by name or ID..."
                            className="w-full rounded-lg bg-background pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 w-full">
                        <Button asChild className="flex-1">
                            <Link href="/admin/vouchers/add">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                <span className="font-bold">Generate Vouchers</span>
                            </Link>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={vouchers.length === 0 || deleting} className="flex-1">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span className="font-bold">Delete All</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete all {vouchers.length} vouchers. This action cannot be undone and the data cannot be recovered.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAll} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                                        {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Yes, Delete Everything
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>


                 {vouchers.length === 0 ? (
                     <div className="text-center py-20 text-muted-foreground rounded-lg border bg-muted/20">
                        <Gift className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                        <h3 className="text-xl font-semibold">No Vouchers Yet</h3>
                        <p>Click "Generate Vouchers" to create your first gift voucher.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVouchers.map(voucher => (
                            <Card key={voucher.id} className="flex flex-col border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-lg">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-bold">₹{voucher.value} Voucher</CardTitle>
                                        <Badge variant={getStatusVariant(voucher.status)}>{voucher.status}</Badge>
                                    </div>
                                    <CardDescription className="text-xs font-mono pt-1">{voucher.id}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-semibold">{voucher.customerName}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>Issued {formatDistanceToNow(voucher.createdAt.toDate(), { addSuffix: true })}</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t pt-4">
                                     <Link href={`/admin/vouchers/${voucher.id}`} passHref className="w-full">
                                        <Button variant="outline" size="sm" className="w-full font-bold">View Details</Button>
                                     </Link>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                 )}
            </div>
        </div>
    );
}
