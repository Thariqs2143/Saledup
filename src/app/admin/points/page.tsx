
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Gem, Download, User as UserIcon, Phone, MinusCircle, PlusCircle, History, Mail, Trash2, Edit, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { collection, query, onSnapshot, orderBy, type Timestamp, doc, updateDoc, writeBatch, collectionGroup, addDoc, deleteDoc, increment } from "firebase/firestore";
import { db, auth } from '@/lib/firebase';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';


type Customer = {
    id: string;
    name: string;
    phone: string;
    email?: string;
    saledupPoints: number;
    lastActivity: Timestamp;
};

type RedemptionLog = {
    id: string;
    customerName: string;
    customerPhone: string;
    pointsRedeemed?: number;
    pointsAdjusted?: number;
    reason?: string;
    redeemedAt: Timestamp;
    redeemedBy: string; 
};

export default function AdminPointsPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [redemptionLogs, setRedemptionLogs] = useState<RedemptionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    
    // Dialog state
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
    const [isRedeeming, setIsRedeeming] = useState(false);
    
    const [pointsToAdjust, setPointsToAdjust] = useState<number>(0);
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [isAdjusting, setIsAdjusting] = useState(false);


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
        setLoading(true);

        const customersQuery = query(collection(db, 'shops', authUser.uid, 'customers'), orderBy('lastActivity', 'desc'));
        const unsubscribeCustomers = onSnapshot(customersQuery, (snapshot) => {
            const customersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setCustomers(customersList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching customers:", error);
            toast({ title: "Error", description: "Could not fetch customer points data.", variant: "destructive" });
            setLoading(false);
        });
        
        const logsQuery = query(collection(db, 'shops', authUser.uid, 'points_redemptions'), orderBy('redeemedAt', 'desc'));
        const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
            const logsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedemptionLog));
            setRedemptionLogs(logsList);
        }, (error) => {
             console.error("Error fetching redemption logs:", error);
        });

        return () => {
            unsubscribeCustomers();
            unsubscribeLogs();
        }
    }, [authUser, toast]);
    
    const filteredCustomers = useMemo(() => {
        return customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.includes(searchTerm)
        );
    }, [customers, searchTerm]);

    const handleRedeem = async () => {
        if (!selectedCustomer || !authUser) return;
        if (pointsToRedeem <= 0 || pointsToRedeem > selectedCustomer.saledupPoints) {
            toast({title: "Invalid Points", description: "Please enter a valid number of points to redeem.", variant: "destructive"});
            return;
        }

        setIsRedeeming(true);
        try {
            const batch = writeBatch(db);
            const shopCustomerRef = doc(db, 'shops', authUser.uid, 'customers', selectedCustomer.phone);
            batch.update(shopCustomerRef, { saledupPoints: increment(-pointsToRedeem) });

            const logRef = doc(collection(db, 'shops', authUser.uid, 'points_redemptions'));
            batch.set(logRef, {
                customerName: selectedCustomer.name,
                customerPhone: selectedCustomer.phone,
                pointsRedeemed: pointsToRedeem,
                redeemedAt: new Date(),
                redeemedBy: authUser.uid, 
            });

            await batch.commit();
            
            toast({title: "Success!", description: `${pointsToRedeem} points redeemed for ${selectedCustomer.name}.`});
            setSelectedCustomer(null);
            setPointsToRedeem(0);

        } catch (error) {
            console.error(error);
            toast({title: "Error", description: "Failed to redeem points.", variant: "destructive"});
        } finally {
            setIsRedeeming(false);
        }
    };
    
    const handleAdjustPoints = async () => {
        if (!selectedCustomer || !authUser) return;
        if (pointsToAdjust === 0) {
            toast({title: "No Change", description: "Please enter a non-zero value to adjust points.", variant: "destructive"});
            return;
        }
        if ((selectedCustomer.saledupPoints + pointsToAdjust) < 0) {
             toast({title: "Invalid Adjustment", description: "Customer points cannot go below zero.", variant: "destructive"});
            return;
        }

        setIsAdjusting(true);
        try {
            const batch = writeBatch(db);
            const shopCustomerRef = doc(db, 'shops', authUser.uid, 'customers', selectedCustomer.phone);
            batch.update(shopCustomerRef, { saledupPoints: increment(pointsToAdjust) });

            const logRef = doc(collection(db, 'shops', authUser.uid, 'points_redemptions'));
            batch.set(logRef, {
                customerName: selectedCustomer.name,
                customerPhone: selectedCustomer.phone,
                pointsAdjusted: pointsToAdjust,
                reason: adjustmentReason || 'Manual adjustment',
                redeemedAt: new Date(),
                redeemedBy: authUser.uid,
            });

            await batch.commit();
            toast({title: "Points Adjusted!", description: `${selectedCustomer.name}'s balance has been updated.`});
            setSelectedCustomer(null);
            setPointsToAdjust(0);
            setAdjustmentReason('');

        } catch (error) {
            console.error(error);
            toast({title: "Error", description: "Failed to adjust points.", variant: "destructive"});
        } finally {
            setIsAdjusting(false);
        }
    };
    
    const handleDeleteCustomer = async (customerId: string) => {
        if (!authUser) return;
        
        try {
            const customerDocRef = doc(db, 'shops', authUser.uid, 'customers', customerId);
            await deleteDoc(customerDocRef);
            toast({title: "Customer Deleted", description: "The customer's points card has been removed."});
        } catch (error) {
            console.error("Error deleting customer:", error);
            toast({title: "Error", description: "Could not delete the customer record.", variant: "destructive"});
        }
    };


    return (
        <Dialog>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Points & Rewards</h1>
                        <p className="text-muted-foreground hidden sm:block">Manage your customer loyalty points and view redemption history.</p>
                    </div>
                </div>

                <Tabs defaultValue="customers">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <TabsList className="grid w-full sm:w-auto grid-cols-2">
                            <TabsTrigger value="customers"><UserIcon className="mr-2 h-4 w-4"/> Points Balances</TabsTrigger>
                            <TabsTrigger value="log"><History className="mr-2 h-4 w-4"/> Activity Log</TabsTrigger>
                        </TabsList>
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name or phone..."
                                className="w-full rounded-lg bg-background pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <TabsContent value="customers" className="mt-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : filteredCustomers.length === 0 ? (
                            <Card className="text-center py-20 text-muted-foreground">
                                <Gem className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                                <h3 className="text-xl font-semibold">No Customers with Points</h3>
                                <p>When customers claim offers, their points will appear here.</p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredCustomers.map(customer => (
                                    <Card key={customer.id} className="p-4 flex flex-col gap-4 border-border hover:border-primary transition-all shadow-sm hover:shadow-md">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-bold text-base">{customer.name}</p>
                                                <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                                {customer.email && <p className="text-xs text-muted-foreground truncate">{customer.email}</p>}
                                            </div>
                                             <div className="text-right shrink-0">
                                                <p className="font-bold text-2xl flex items-center gap-1.5 text-amber-500">
                                                    <Gem className="h-5 w-5"/>{customer.saledupPoints || 0}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Points</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" className="w-full" onClick={() => setSelectedCustomer(customer)}>Adjust</Button>
                                            </DialogTrigger>
                                            <DialogTrigger asChild>
                                                <Button size="sm" className="w-full" onClick={() => setSelectedCustomer(customer)}>Redeem</Button>
                                            </DialogTrigger>
                                            <a href={`tel:${customer.phone}`} className="w-full">
                                                <Button size="sm" variant="outline" className="w-full"><Phone className="h-4 w-4"/></Button>
                                            </a>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the points card for {customer.name}. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                    
                    <TabsContent value="log" className="mt-6">
                        <Card>
                             <CardHeader>
                                <CardTitle>Points Activity Log</CardTitle>
                                <CardDescription>A log of all point redemptions and manual adjustments.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : redemptionLogs.length === 0 ? (
                                    <div className="text-center py-20 text-muted-foreground">
                                        <History className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                                        <h3 className="text-xl font-semibold">No Activity Yet</h3>
                                        <p>When points are redeemed or adjusted, the transactions will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {redemptionLogs.map(log => {
                                            const isRedemption = !!log.pointsRedeemed;
                                            const isPositiveAdjustment = log.pointsAdjusted && log.pointsAdjusted > 0;
                                            const isNegativeAdjustment = log.pointsAdjusted && log.pointsAdjusted < 0;
                                            const points = log.pointsRedeemed || log.pointsAdjusted || 0;

                                            return (
                                                <Card key={log.id} className="p-4 flex items-center gap-4">
                                                    <div className="p-3 rounded-full bg-muted">
                                                        {isRedemption || isNegativeAdjustment ? (
                                                            <ArrowDownRight className="h-6 w-6 text-destructive" />
                                                        ) : (
                                                            <ArrowUpRight className="h-6 w-6 text-green-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold">{log.customerName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {isRedemption 
                                                                ? 'Redeemed points' 
                                                                : `Manual adjustment ${isPositiveAdjustment ? '(Credit)' : '(Debit)'}`
                                                            }
                                                        </p>
                                                        <p className="text-xs text-muted-foreground/80 mt-1">
                                                            {formatDistanceToNow(log.redeemedAt.toDate(), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-bold text-lg ${isRedemption || isNegativeAdjustment ? 'text-destructive' : 'text-green-500'}`}>
                                                            {isRedemption || isNegativeAdjustment ? '-' : '+'}{Math.abs(points)}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">Points</p>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                
                <DialogContent>
                    {selectedCustomer && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Adjust or Redeem Points</DialogTitle>
                            <DialogDescription>
                                For {selectedCustomer.name} (Current Balance: <span className="font-bold text-primary">{selectedCustomer.saledupPoints || 0}</span> points)
                            </DialogDescription>
                        </DialogHeader>
                        <Tabs defaultValue="redeem" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="redeem">Redeem Points</TabsTrigger>
                                <TabsTrigger value="adjust">Adjust Points</TabsTrigger>
                            </TabsList>
                            <TabsContent value="redeem" className="pt-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="points-to-redeem">Points to Redeem</Label>
                                        <Input 
                                            id="points-to-redeem" 
                                            type="number" 
                                            value={pointsToRedeem > 0 ? pointsToRedeem : ''}
                                            onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                                            max={selectedCustomer.saledupPoints}
                                            min={1}
                                            placeholder="e.g., 50"
                                        />
                                    </div>
                                    <Button onClick={handleRedeem} disabled={isRedeeming} className="w-full">
                                        {isRedeeming && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Confirm Redemption
                                    </Button>
                                </div>
                            </TabsContent>
                             <TabsContent value="adjust" className="pt-4">
                                 <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="points-to-adjust">Points to Add/Subtract</Label>
                                        <Input 
                                            id="points-to-adjust" 
                                            type="number" 
                                            value={pointsToAdjust !== 0 ? pointsToAdjust : ''}
                                            onChange={(e) => setPointsToAdjust(Number(e.target.value))}
                                            placeholder="e.g., 50 or -20"
                                        />
                                        <p className="text-xs text-muted-foreground">Use a negative number to subtract points.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="adjustment-reason">Reason (Optional)</Label>
                                        <Textarea
                                            id="adjustment-reason"
                                            value={adjustmentReason}
                                            onChange={(e) => setAdjustmentReason(e.target.value)}
                                            placeholder="e.g., Bonus for large purchase"
                                        />
                                    </div>
                                    <Button onClick={handleAdjustPoints} disabled={isAdjusting} className="w-full">
                                        {isAdjusting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Confirm Adjustment
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" onClick={() => setSelectedCustomer(null)}>Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </>
                    )}
                </DialogContent>
            </div>
        </Dialog>
    );
}
