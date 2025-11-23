
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Gem, Download, User as UserIcon, Phone, MinusCircle, PlusCircle, History } from "lucide-react";
import { collection, query, onSnapshot, orderBy, type Timestamp, doc, updateDoc, writeBatch, collectionGroup, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { format } from 'date-fns';
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


type Customer = {
    id: string;
    name: string;
    phone: string;
    saledupPoints: number;
    lastActivity: Timestamp;
};

type RedemptionLog = {
    id: string;
    customerName: string;
    customerPhone: string;
    pointsRedeemed: number;
    redeemedAt: Timestamp;
    redeemedBy: string; // Staff member UID
};

export default function AdminPointsPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [redemptionLogs, setRedemptionLogs] = useState<RedemptionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    
    // Redeem dialog state
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
    const [isRedeeming, setIsRedeeming] = useState(false);


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
            if (loading) setLoading(false);
        }, (error) => {
            console.error("Error fetching customers:", error);
            toast({ title: "Error", description: "Could not fetch customer points data.", variant: "destructive" });
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

            // 1. Update the customer's points balance in the shop's subcollection
            const shopCustomerRef = doc(db, 'shops', authUser.uid, 'customers', selectedCustomer.phone);
            batch.update(shopCustomerRef, { saledupPoints: selectedCustomer.saledupPoints - pointsToRedeem });

            // 2. Create a redemption log entry
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
                            <TabsTrigger value="customers"><UserIcon className="mr-2 h-4 w-4"/> Customer Balances</TabsTrigger>
                            <TabsTrigger value="log"><History className="mr-2 h-4 w-4"/> Redemption Log</TabsTrigger>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredCustomers.map(customer => (
                                    <Card key={customer.id} className="flex flex-col">
                                        <CardHeader>
                                            <CardTitle>{customer.name}</CardTitle>
                                            <CardDescription className="flex items-center gap-2">
                                                <Phone className="h-3 w-3"/>
                                                {customer.phone}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex flex-col items-center justify-center text-center">
                                             <Badge variant="secondary" className="text-2xl font-bold p-4">
                                                <Gem className="mr-2 h-6 w-6 text-amber-500"/>
                                                {customer.saledupPoints || 0}
                                            </Badge>
                                            <p className="text-sm text-muted-foreground mt-2">Points</p>
                                        </CardContent>
                                        <CardFooter>
                                            <DialogTrigger asChild>
                                                <Button className="w-full" onClick={() => setSelectedCustomer(customer)}>Redeem</Button>
                                            </DialogTrigger>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                    
                    <TabsContent value="log" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Redemption History</CardTitle>
                                <CardDescription>A log of all points redeemed at your shop.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : redemptionLogs.length === 0 ? (
                                    <div className="text-center py-20 text-muted-foreground">
                                        <History className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                                        <h3 className="text-xl font-semibold">No Redemptions Yet</h3>
                                        <p>When points are redeemed, the transactions will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Customer</TableHead>
                                                    <TableHead>Points Redeemed</TableHead>
                                                    <TableHead>Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {redemptionLogs.map(log => (
                                                    <TableRow key={log.id}>
                                                        <TableCell>{log.customerName}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="destructive">-{log.pointsRedeemed}</Badge>
                                                        </TableCell>
                                                        <TableCell>{format(log.redeemedAt.toDate(), 'PPpp')}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Redeem Points for {selectedCustomer?.name}</DialogTitle>
                        <DialogDescription>
                            Current Balance: <span className="font-bold text-primary">{selectedCustomer?.saledupPoints || 0}</span> points.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="points-to-redeem">Points to Redeem</Label>
                            <Input 
                                id="points-to-redeem" 
                                type="number" 
                                value={pointsToRedeem}
                                onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                                max={selectedCustomer?.saledupPoints}
                                min={1}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                            <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                            </DialogClose>
                        <Button onClick={handleRedeem} disabled={isRedeeming}>
                            {isRedeeming && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Confirm Redemption
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </div>
        </Dialog>
    );
}
