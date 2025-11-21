
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Users, Download, Mail, Tag, Calendar, Phone, CheckCircle, XCircle, Trash2, Filter, IndianRupee, Percent, User as UserIcon, Repeat, Star, Award } from "lucide-react";
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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
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

type CustomerData = {
    phone: string;
    name: string;
    lastClaim: Claim;
    totalClaims: number;
    totalSpend: number;
    isCouponHunter: boolean;
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
    
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    // Drag-to-scroll (pointer events) for touch + mouse
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onPointerDown = (e: PointerEvent) => {
            isDown.current = true;
            try { el.setPointerCapture(e.pointerId); } catch {}
            startX.current = e.clientX - el.getBoundingClientRect().left;
            scrollLeft.current = el.scrollLeft;
            el.classList.add("dragging");
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDown.current) return;
            const x = e.clientX - el.getBoundingClientRect().left;
            const walk = (x - startX.current) * 1; // adjust multiplier for speed
            el.scrollLeft = scrollLeft.current - walk;
        };

        const onPointerUp = (e: PointerEvent) => {
            isDown.current = false;
            try { el.releasePointerCapture(e.pointerId); } catch {}
            el.classList.remove("dragging");
        };

        el.addEventListener("pointerdown", onPointerDown);
        el.addEventListener("pointermove", onPointerMove);
        el.addEventListener("pointerup", onPointerUp);

        return () => {
            el.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };
    }, []);

    // Auto-center the selected chip in the scroll container
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const active = el.querySelector<HTMLElement>("[data-state='active']");
        if (!active) return;

        const offset = active.offsetLeft + active.offsetWidth / 2 - el.clientWidth / 2;
        el.scrollTo({ left: offset, behavior: "smooth" });
    }, [segmentFilter]);

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
            console.error("Error fetching customers:", error);
            toast({ title: "Error", description: "Could not fetch customer data.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser, toast]);
    
    const uniqueCustomers = useMemo(() => {
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

        const processedCustomers: CustomerData[] = [];
        customerMap.forEach((data, phone) => {
            const sortedClaims = data.claims.sort((a, b) => b.claimedAt.toMillis() - a.claimedAt.toMillis());
            const lastClaim = sortedClaims[0];

            // Coupon Hunter Logic
            let highDiscountClaims = 0;
            sortedClaims.forEach(c => {
                 if(c.discountType === 'percentage' && parseFloat(c.discountValue || '0') >= COUPON_HUNTER_DISCOUNT_PERCENTAGE) {
                    highDiscountClaims++;
                 }
            });
            const isCouponHunter = sortedClaims.length > 2 && (highDiscountClaims / sortedClaims.length) >= COUPON_HUNTER_RATIO;
            
            processedCustomers.push({
                phone,
                name: lastClaim.customerName,
                lastClaim: lastClaim,
                totalClaims: sortedClaims.length,
                totalSpend: data.totalSpend,
                isCouponHunter: isCouponHunter,
            });
        });

        return processedCustomers;
    }, [allClaims]);

    const filteredCustomers = useMemo(() => {
        return uniqueCustomers.filter(customer => {
            const searchMatch = customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.lastClaim.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());

            const statusMatch = statusFilter === 'all' || customer.lastClaim.status === statusFilter;
            
            const thirtyDaysAgo = subDays(new Date(), 30);
            const sevenDaysAgo = subDays(new Date(), 7);

            const segmentMatch = segmentFilter === 'all' ||
                (segmentFilter === 'new' && customer.totalClaims === 1) ||
                (segmentFilter === 'repeat' && customer.totalClaims > 1) ||
                (segmentFilter === 'loyal' && customer.totalClaims >= 5) ||
                (segmentFilter === 'high-spenders' && customer.totalSpend > HIGH_SPENDER_THRESHOLD) ||
                (segmentFilter === 'coupon-hunters' && customer.isCouponHunter) ||
                (segmentFilter === 'recent-7d' && customer.lastClaim.claimedAt.toDate() >= sevenDaysAgo) ||
                (segmentFilter === 'inactive-30d' && customer.lastClaim.claimedAt.toDate() < thirtyDaysAgo);

            return searchMatch && statusMatch && segmentMatch;
        });
    }, [uniqueCustomers, searchTerm, statusFilter, segmentFilter]);


    const handleExportPDF = () => {
        if (filteredCustomers.length === 0) {
            toast({ title: "No Data", description: "There are no customers to export.", variant: "destructive"});
            return;
        }

        const doc = new jsPDF();
        doc.text("Customer Report", 14, 15);
        doc.autoTable({
            startY: 20,
            head: [['Customer Name', 'Phone', 'Last Offer Claimed', 'Last Active', 'Total Claims', 'Total Spend (₹)']],
            body: filteredCustomers.map(c => [
                c.lastClaim.customerName,
                c.lastClaim.customerPhone,
                c.lastClaim.offerTitle,
                format(c.lastClaim.claimedAt.toDate(), 'PP'),
                c.totalClaims,
                c.totalSpend.toFixed(2),
            ]),
        });
        doc.save(`customer_report.pdf`);
        toast({ title: "Export Successful", description: "Customer data has been downloaded as a PDF." });
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
                    <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                    <p className="text-muted-foreground hidden sm:block">View, segment, and engage with your customer base.</p>
                </div>
            </div>

            <Tabs value={segmentFilter} onValueChange={(value) => setSegmentFilter(value as any)}>
                <div className="space-y-4">
                     <div className="flex flex-row items-center gap-2">
                         <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={`Search customers...`}
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

                    <div className="relative w-full">
                        <div className="pointer-events-none absolute left-0 top-0 h-full w-4 bg-gradient-to-r from-background to-transparent z-10" />
                        <div className="pointer-events-none absolute right-0 top-0 h-full w-4 bg-gradient-to-l from-background to-transparent z-10" />
                        
                        <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
                            <TabsList className="relative bg-transparent p-0 m-0 border-none w-max">
                                <div className="inline-flex gap-3 whitespace-nowrap px-1">
                                    {customerSegments.map((segment) => (
                                        <TabsTrigger
                                            key={segment.value}
                                            value={segment.value}
                                            className="text-sm py-2 px-4 rounded-full transition-all duration-300 border shadow-sm shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg bg-background/60 backdrop-blur-sm hover:scale-[1.02]"
                                        >
                                            {segment.label}
                                        </TabsTrigger>
                                    ))}
                                </div>
                            </TabsList>
                        </div>
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
                ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground rounded-lg border bg-muted/20">
                        <Users className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                        <h3 className="text-xl font-semibold">No Customers Found</h3>
                        <p>When customers claim offers, they will appear here. Try adjusting your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCustomers.map(customer => {
                            const isNew = customer.totalClaims === 1;
                            const isHighSpender = customer.totalSpend > HIGH_SPENDER_THRESHOLD;
                            return (
                            <Card key={customer.phone} className="flex flex-col border-2 border-border hover:border-primary transition-all">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-lg">{customer.name}</p>
                                        <div className="flex gap-1.5">
                                            <Badge variant={isNew ? 'outline' : 'default'} className="whitespace-nowrap">
                                                {isNew ? 'New' : 'Repeat'}
                                            </Badge>
                                            {customer.isCouponHunter && (
                                                <Badge variant="secondary" className="whitespace-nowrap">
                                                    <Tag className="mr-1 h-3 w-3"/> Hunter
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <CardDescription className="text-sm">
                                        Last claimed "{customer.lastClaim.offerTitle}"
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-muted-foreground flex-1">
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 shrink-0" />
                                        <span>{customer.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{customer.lastClaim.customerEmail || 'No email'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 shrink-0" />
                                        <span>Last active: {formatDistanceToNow(customer.lastClaim.claimedAt.toDate(), { addSuffix: true })}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Users className="h-4 w-4 shrink-0" />
                                        <span>Total claims: {customer.totalClaims}</span>
                                    </div>
                                    <div className="flex items-center gap-3 font-medium">
                                        <IndianRupee className="h-4 w-4 shrink-0" />
                                        <span className={isHighSpender ? 'text-primary' : ''}>Total spend: ₹{customer.totalSpend.toFixed(2)}</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t pt-4 flex justify-end gap-2">
                                    <Button size="sm" variant={customer.lastClaim.status === 'claimed' ? 'default' : 'secondary'} onClick={() => handleStatusToggle(customer.lastClaim.id, customer.lastClaim.status)}>
                                        {customer.lastClaim.status === 'claimed' ? <CheckCircle className="mr-2 h-4 w-4"/> : <XCircle className="mr-2 h-4 w-4"/> }
                                        {customer.lastClaim.status === 'claimed' ? 'Mark Redeemed' : 'Mark Claimed'}
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive" className="h-9 w-9 p-0">
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the latest claim for {customer.name}. This cannot be undone. To delete all data for this customer, contact support.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteClaim(customer.lastClaim.id)} className="bg-destructive hover:bg-destructive/90">Delete Claim</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        )})}
                    </div>
                )}
                </div>
            </Tabs>
        </div>
    );
}
