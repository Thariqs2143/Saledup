
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Gift, CheckCircle, Clock, Search, IndianRupee } from "lucide-react";
import Link from 'next/link';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AnimatedCounter } from '@/components/animated-counter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Voucher = {
    id: string;
    customerName: string;
    value: number;
    status: 'valid' | 'redeemed' | 'expired';
    createdAt: Timestamp;
    expiresAt: Timestamp;
    redeemedAt?: Timestamp;
};

export default function AdminVouchersPage() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
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

        const vouchersQuery = query(collection(db, 'vouchers'), where('shopId', '==', authUser.uid));
        
        const unsubscribe = onSnapshot(vouchersQuery, (snapshot) => {
            const now = new Date();
            const vouchersList = snapshot.docs.map(doc => {
                const data = doc.data();
                const voucher = { id: doc.id, ...data } as Voucher;
                // Check for expiry client-side if status isn't already expired
                if (voucher.status === 'valid' && voucher.expiresAt.toDate() < now) {
                    voucher.status = 'expired';
                }
                return voucher;
            });
            vouchersList.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gift Vouchers</h1>
                    <p className="text-muted-foreground">Create, manage, and track corporate and individual gift vouchers.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/vouchers/add">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Generate Vouchers
                    </Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Issued</CardTitle>
                        <Gift className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><AnimatedCounter from={0} to={stats.totalIssued} /></div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Redeemed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><AnimatedCounter from={0} to={stats.totalRedeemed} /></div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Vouchers</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><AnimatedCounter from={0} to={stats.pending} /></div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Value Redeemed</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><AnimatedCounter from={0} to={stats.totalValueRedeemed} /></div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Voucher History</CardTitle>
                    <CardDescription>A complete log of all generated gift vouchers.</CardDescription>
                     <div className="relative pt-4 sm:max-w-xs">
                        <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by name or ID..."
                            className="w-full rounded-lg bg-background pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                 {vouchers.length === 0 ? (
                     <div className="text-center py-20 text-muted-foreground rounded-lg border bg-muted/20">
                        <Gift className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                        <h3 className="text-xl font-semibold">No Vouchers Yet</h3>
                        <p>Click "Generate Vouchers" to create your first gift voucher.</p>
                    </div>
                 ) : (
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Issued</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredVouchers.map(voucher => (
                                    <TableRow key={voucher.id}>
                                        <TableCell className="font-medium">
                                            <p className="font-bold">{voucher.customerName}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{voucher.id}</p>
                                        </TableCell>
                                        <TableCell>₹{voucher.value}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(voucher.status)}>{voucher.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDistanceToNow(voucher.createdAt.toDate(), { addSuffix: true })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <Link href={`/admin/vouchers/${voucher.id}`} passHref>
                                                <Button variant="outline" size="sm">View</Button>
                                             </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                 )}
                </CardContent>
            </Card>
        </div>
    );
}
