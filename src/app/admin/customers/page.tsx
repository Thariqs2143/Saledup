
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={`Search ${customers.length} customers...`}
                        className="w-full rounded-lg bg-background pl-10 h-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <Button onClick={handleExportPDF} variant="outline" size="sm" className="w-full sm:w-auto h-12">
                    <Download className="mr-2"/>Export PDF
                </Button>
            </div>
            
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground rounded-lg border bg-background">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                    <h3 className="text-xl font-semibold">No Customers Found</h3>
                    <p>When customers claim offers, they will appear here.</p>
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredCustomers.map(customer => (
                        <Card key={customer.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-lg">{customer.customerName}</p>
                                    <Badge variant={customer.status === 'redeemed' ? 'secondary' : 'outline'} className="whitespace-nowrap">
                                        {customer.status === 'redeemed' ? <CheckCircle className="mr-1.5 h-3 w-3" /> : <Tag className="mr-1.5 h-3 w-3" />}
                                        {customer.status === 'redeemed' ? 'Redeemed' : 'Claimed'}
                                    </Badge>
                                </div>
                                <CardDescription className="text-sm">
                                    Claimed "{customer.offerTitle}"
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground flex-1">
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 shrink-0" />
                                    <span>{customer.customerPhone}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{customer.customerEmail || 'No email'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4 shrink-0" />
                                    <span>{format(customer.claimedAt.toDate(), 'PP')}</span>
                                </div>
                            </CardContent>
                            <CardContent className="border-t pt-4 flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleStatusToggle(customer.id, customer.status)}>
                                    {customer.status === 'claimed' ? 'Mark as Redeemed' : 'Mark as Claimed'}
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive">
                                            <Trash2 className="h-4 w-4 mr-2"/> Delete
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
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

    

    

    