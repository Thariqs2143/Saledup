
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Users, Download, Mail, Tag, Calendar, Phone, CheckCircle, XCircle, Edit, Trash2, RefreshCcw } from "lucide-react";
import { collection, query, onSnapshot, orderBy, type Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { format } from 'date-fns';
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
    claimedAt: Timestamp;
    status: 'claimed' | 'redeemed';
};

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();
    const { toast } = useToast();

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
            setCustomers(claimsList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching customers:", error);
            toast({ title: "Error", description: "Could not fetch customer data.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser, toast]);
    
    const filteredCustomers = customers.filter(customer =>
        customer.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.offerTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportPDF = () => {
        if (filteredCustomers.length === 0) {
            toast({ title: "No Data", description: "There are no customers to export.", variant: "destructive"});
            return;
        }

        const doc = new jsPDF();
        doc.text("Customer Claims Report", 14, 15);
        doc.autoTable({
            startY: 20,
            head: [['Customer Name', 'Phone', 'Offer Claimed', 'Status', 'Date']],
            body: filteredCustomers.map(c => [
                c.customerName,
                c.customerPhone,
                c.offerTitle,
                c.status === 'redeemed' ? 'Redeemed' : 'Claimed',
                format(c.claimedAt.toDate(), 'PPpp')
            ]),
        });
        doc.save(`customer_claims_report.pdf`);
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


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                <p className="text-muted-foreground">A list of all customers who have claimed your offers.</p>
            </div>
            <Card>
                <CardHeader>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
                            <CardDescription>A log of every customer interaction.</CardDescription>
                        </div>
                        <Button onClick={handleExportPDF} variant="outline" size="sm">
                            <Download className="mr-2"/>Export PDF
                        </Button>
                    </div>
                    <div className="relative pt-4 sm:max-w-xs">
                        <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by name, phone, or offer..."
                            className="w-full rounded-lg bg-background pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No customers have claimed offers yet.</p>
                        </div>
                    ) : (
                         <>
                            {/* Mobile View */}
                            <div className="grid gap-4 md:hidden">
                                {filteredCustomers.map(customer => (
                                    <Card key={customer.id} className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold">{customer.customerName}</p>
                                            <Badge variant={customer.status === 'redeemed' ? 'secondary' : 'outline'}>
                                                {customer.status === 'redeemed' ? <CheckCircle className="mr-1.5 h-3 w-3" /> : <Tag className="mr-1.5 h-3 w-3" />}
                                                {customer.status === 'redeemed' ? 'Redeemed' : 'Claimed'}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2 text-sm text-muted-foreground">
                                             <div className="flex items-center gap-2 font-medium">
                                                <span>Claimed "{customer.offerTitle}"</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3 shrink-0" />
                                                <span>{customer.customerPhone}</span>
                                            </div>
                                             <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 shrink-0" />
                                                <span>{customer.customerEmail || 'No email'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 shrink-0" />
                                                <span>{format(customer.claimedAt.toDate(), 'PP')}</span>
                                            </div>
                                        </div>
                                         <div className="flex justify-end gap-2 pt-2 border-t">
                                            <Button size="sm" variant="outline" onClick={() => handleStatusToggle(customer.id, customer.status)}>
                                                <RefreshCcw className="h-3 w-3 mr-1.5"/> Toggle Status
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="destructive">
                                                        <Trash2 className="h-3 w-3 mr-1.5"/> Delete
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the claim for {customer.customerName}. This cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteClaim(customer.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Desktop View */}
                            <div className="hidden md:block rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Offer Claimed</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date Claimed</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCustomers.map(customer => (
                                            <TableRow key={customer.id}>
                                                <TableCell className="font-medium">
                                                    <div>{customer.customerName}</div>
                                                    <div className="text-xs text-muted-foreground">{customer.customerPhone}</div>
                                                </TableCell>
                                                <TableCell>{customer.offerTitle}</TableCell>
                                                <TableCell>
                                                    <Badge variant={customer.status === 'redeemed' ? 'secondary' : 'outline'}>
                                                        {customer.status === 'redeemed' ? <CheckCircle className="mr-1.5 h-3 w-3" /> : <Tag className="mr-1.5 h-3 w-3" />}
                                                        {customer.status === 'redeemed' ? 'Redeemed' : 'Claimed'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{format(customer.claimedAt.toDate(), 'PPpp')}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button size="sm" variant="ghost" onClick={() => handleStatusToggle(customer.id, customer.status)}>
                                                         <RefreshCcw className="h-4 w-4"/>
                                                    </Button>
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                                                <Trash2 className="h-4 w-4"/>
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently delete the claim for {customer.customerName}. This cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteClaim(customer.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    