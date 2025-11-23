
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Users, Download, Mail, Tag, Calendar, Phone, CheckCircle, XCircle, Trash2, Filter, IndianRupee, Percent, User as UserIcon, Repeat, Star, Award, Eye } from "lucide-react";
import { collection, query, onSnapshot, orderBy, type Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


// Extend jsPDF with autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

type Claim = {
    id: string;
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    offerTitle: string;
    offerId: string;
    claimedAt: Timestamp;
    status: 'claimed' | 'redeemed';
    approximateValue?: number;
    discountType?: 'percentage' | 'fixed' | 'freebie' | 'other';
    discountValue?: string;
};

// This type will hold aggregated data about each customer
type CustomerStats = {
    totalClaims: number;
    totalSpend: number;
    isCouponHunter: boolean;
    lastClaimDate: Date;
};

const HIGH_SPENDER_THRESHOLD = 2000; // Total spend > 2000 INR
const COUPON_HUNTER_DISCOUNT_PERCENTAGE = 40; // Offer discount >= 40%
const COUPON_HUNTER_RATIO = 0.75; // >= 75% of claims are high-discount

const customerSegments = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'repeat', label: 'Repeat' },
    { value: 'loyal', label: 'Loyal (5+ claims)'},
    { value: 'high-spenders', label: 'High Spenders' },
    { value: 'coupon-hunters', label: 'Coupon Hunters' },
    { value: 'recent-7d', label: 'Active in 7 days'},
    { value: 'inactive-30d', label: 'Inactive (30d)'},
];

export default function AdminCustomersPage() {
    const [allClaims, setAllClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'claimed' | 'redeemed'>('all');
    const [segmentFilter, setSegmentFilter] = useState<'all' | 'new' | 'repeat' | 'high-spenders' | 'coupon-hunters' | 'loyal' | 'recent-7d' | 'inactive-30d'>('all');
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    const [broadcastMessage, setBroadcastMessage] = useState('');

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!authUser) return;

        const claimsQuery = query(collection(db, 'shops', authUser.uid, 'claims'), orderBy('claimedAt', 'desc'));
        
        const unsubscribe = onSnapshot(claimsQuery, (snapshot) => {
            const claimsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim));
            setAllClaims(claimsList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching claims:", error);
            toast({ title: "Error", description: "Could not fetch customer data.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser, toast]);
    
    // Memoize the calculation of stats for each customer
    const customerStatsMap = useMemo(() => {
        const customerMap = new Map<string, { claims: Claim[], totalSpend: number }>();
        allClaims.forEach(claim => {
            const existing = customerMap.get(claim.customerPhone);
            const claimValue = claim.approximateValue || 0;

            if (existing) {
                existing.claims.push(claim);
                existing.totalSpend += claimValue;
            } else {
                customerMap.set(claim.customerPhone, {
                    claims: [claim],
                    totalSpend: claimValue,
                });
            }
        });

        const statsMap = new Map<string, CustomerStats>();
        customerMap.forEach((data, phone) => {
            const sortedClaims = data.claims.sort((a, b) => b.claimedAt.toMillis() - a.claimedAt.toMillis());
            
            let highDiscountClaims = 0;
            sortedClaims.forEach(c => {
                 if(c.discountType === 'percentage' && parseFloat(c.discountValue || '0') >= COUPON_HUNTER_DISCOUNT_PERCENTAGE) {
                    highDiscountClaims++;
                 }
            });
            const isCouponHunter = sortedClaims.length > 2 && (highDiscountClaims / sortedClaims.length) >= COUPON_HUNTER_RATIO;
            
            statsMap.set(phone, {
                totalClaims: sortedClaims.length,
                totalSpend: data.totalSpend,
                isCouponHunter: isCouponHunter,
                lastClaimDate: sortedClaims[0].claimedAt.toDate(),
            });
        });

        return statsMap;
    }, [allClaims]);

    const filteredClaims = useMemo(() => {
        return allClaims.filter(claim => {
            const searchMatch = claim.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                claim.offerTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                claim.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase());

            const statusMatch = statusFilter === 'all' || claim.status === statusFilter;
            
            // Get the stats for the customer who made this claim
            const customerStats = customerStatsMap.get(claim.customerPhone);
            if (!customerStats) return false; // Should not happen if map is built correctly

            const thirtyDaysAgo = subDays(new Date(), 30);
            const sevenDaysAgo = subDays(new Date(), 7);

            const segmentMatch = segmentFilter === 'all' ||
                (segmentFilter === 'new' && customerStats.totalClaims === 1) ||
                (segmentFilter === 'repeat' && customerStats.totalClaims > 1) ||
                (segmentFilter === 'loyal' && customerStats.totalClaims >= 5) ||
                (segmentFilter === 'high-spenders' && customerStats.totalSpend > HIGH_SPENDER_THRESHOLD) ||
                (segmentFilter === 'coupon-hunters' && customerStats.isCouponHunter) ||
                (segmentFilter === 'recent-7d' && customerStats.lastClaimDate >= sevenDaysAgo) ||
                (segmentFilter === 'inactive-30d' && customerStats.lastClaimDate < thirtyDaysAgo);

            return searchMatch && statusMatch && segmentMatch;
        });
    }, [allClaims, customerStatsMap, searchTerm, statusFilter, segmentFilter]);


    const handleExportPDF = () => {
        if (filteredClaims.length === 0) {
            toast({ title: "No Data", description: "There are no claims to export.", variant: "destructive"});
            return;
        }

        const doc = new jsPDF();
        doc.text("Claims Report", 14, 15);
        doc.autoTable({
            startY: 20,
            head: [['Customer Name', 'Phone', 'Offer Claimed', 'Claimed At', 'Status']],
            body: filteredClaims.map(c => [
                c.customerName,
                c.customerPhone,
                c.offerTitle,
                format(c.claimedAt.toDate(), 'PPpp'),
                c.status,
            ]),
        });
        doc.save(`claims_report.pdf`);
        toast({ title: "Export Successful", description: "Claims data has been downloaded as a PDF." });
    };

    const handleStatusToggle = async (claimId: string, currentStatus: 'claimed' | 'redeemed') => {
        if (!authUser) return;
        const newStatus = currentStatus === 'claimed' ? 'redeemed' : 'claimed';
        const claimDocRef = doc(db, 'shops', authUser.uid, 'claims', claimId);
        try {
            await updateDoc(claimDocRef, { status: newStatus });
            toast({ title: "Status Updated", description: `Claim marked as ${newStatus}.`});
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not update claim status.", variant: "destructive" });
        }
    };
    
    const handleDeleteClaim = async (claimId: string) => {
        if (!authUser) return;
        const claimDocRef = doc(db, 'shops', authUser.uid, 'claims', claimId);
        try {
            await deleteDoc(claimDocRef);
            toast({ title: "Claim Deleted", description: "The customer claim has been removed."});
        } catch (error) {
            console.error(error);
             toast({ title: "Error", description: "Could not delete the claim.", variant: "destructive" });
        }
    };
    
    const handleSendBroadcast = () => {
        if (!broadcastMessage) {
            toast({title: "Empty Message", description: "Please write a message to send.", variant: "destructive"});
            return;
        }
        const encodedMessage = encodeURIComponent(broadcastMessage);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        toast({title: "Message Ready!", description: "Your broadcast message is ready to be forwarded on WhatsApp."});
    };


    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Claims</h1>
                    <p className="text-muted-foreground hidden sm:block">A real-time log of all offers claimed by your customers.</p>
                </div>
            </div>

            <Tabs value={segmentFilter} onValueChange={(value) => setSegmentFilter(value as any)}>
                <div className="space-y-4">
                     <div className="flex flex-row items-center gap-2">
                         <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={`Search by customer, offer, or phone...`}
                                className="w-full rounded-lg bg-background pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                            <SelectTrigger className="w-auto">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="claimed">Claimed</SelectItem>
                                <SelectItem value="redeemed">Redeemed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-2 overflow-x-auto scrollbar-hide">
                        <TabsList className="bg-transparent p-0 m-0 border-none inline-flex gap-2">
                            {customerSegments.map((segment) => (
                                <TabsTrigger
                                    key={segment.value}
                                    value={segment.value}
                                    className="
                                    px-4 py-2 text-sm font-semibold rounded-full border-2 border-border bg-card
                                    data-[state=active]:bg-primary data-[state=active]:text-primary-foreground 
                                    data-[state=active]:border-primary 
                                    shrink-0 basis-1/3 sm:basis-auto
                                  " >
                                    {segment.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                     <div className="flex gap-2 w-full md:hidden">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="flex-1">
                                    <Mail className="mr-2 h-4 w-4"/> Broadcast
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Send WhatsApp Broadcast</DialogTitle>
                                    <DialogDescription>
                                        Compose a message to send to your customers. This will open WhatsApp with the message ready to be forwarded. You can send it to individuals or broadcast lists you've created in WhatsApp.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="broadcast-message-mobile">Message</Label>
                                        <Textarea
                                            id="broadcast-message-mobile"
                                            placeholder="E.g., Hi! Don't miss our weekend special: 20% off all coffee. Come visit us!"
                                            value={broadcastMessage}
                                            onChange={(e) => setBroadcastMessage(e.target.value)}
                                            rows={5}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleSendBroadcast}>
                                        Send Message via WhatsApp
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button onClick={handleExportPDF} variant="outline" className="flex-1">
                            <Download className="mr-2 h-4 w-4"/> Export
                        </Button>
                    </div>
                </div>

                <div className="mt-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredClaims.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground rounded-lg border bg-muted/20">
                        <Users className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                        <h3 className="text-xl font-semibold">No Claims Found</h3>
                        <p>When customers claim offers, the claims will appear here. Try adjusting your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredClaims.map(claim => (
                                <Card key={claim.id} className="flex flex-col border-2 border-border hover:border-primary transition-all">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-lg">{claim.customerName}</p>
                                            <Badge variant={claim.status === 'claimed' ? 'default' : 'secondary'} className="whitespace-nowrap">
                                                {claim.status}
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-sm">
                                            Claimed "{claim.offerTitle}"
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm text-muted-foreground flex-1">
                                        <div className="flex items-center gap-3">
                                            <Phone className="h-4 w-4 shrink-0" />
                                            <span>{claim.customerPhone}</span>
                                        </div>
                                         <div className="flex items-center gap-3">
                                            <Mail className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{claim.customerEmail || 'No email'}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-4 w-4 shrink-0" />
                                            <span>Last active: {formatDistanceToNow(claim.claimedAt.toDate(), { addSuffix: true })}</span>
                                        </div>
                                        <div className="flex items-center gap-3 font-medium">
                                            <Users className="h-4 w-4 shrink-0" />
                                            <span>Total claims: {customerStatsMap.get(claim.customerPhone)?.totalClaims || 0}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="border-t pt-4 flex-col gap-2">
                                        <Button 
                                            size="sm" 
                                            variant={claim.status === 'claimed' ? 'default' : 'secondary'} 
                                            onClick={() => handleStatusToggle(claim.id, claim.status)}
                                            className="w-full"
                                        >
                                            {claim.status === 'claimed' ? <CheckCircle className="mr-2 h-4 w-4"/> : <XCircle className="mr-2 h-4 w-4"/> }
                                            {claim.status === 'claimed' ? 'Mark Redeemed' : 'Mark Claimed'}
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="sm" variant="destructive" className="w-full">
                                                    <Trash2 className="mr-2 h-4 w-4"/>
                                                    Delete
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete this claim?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will remove the claim for "{claim.offerTitle}". It cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteClaim(claim.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardFooter>
                                </Card>
                        ))}
                    </div>
                )}
                </div>
            </Tabs>
        </div>
    );
}

