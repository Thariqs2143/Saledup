
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Users, Download, Mail, Tag, Calendar, Phone, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { collection, query, onSnapshot, orderBy, type Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { format, formatDistanceToNow } from 'date-fns';
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
};


export default function AdminCustomersPage() {
    const [allClaims, setAllClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'claimed' | 'redeemed'>('all');
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
            setAllClaims(claimsList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching customers:", error);
            toast({ title: "Error", description: "Could not fetch customer data.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser, toast]);


    const filteredClaims = useMemo(() => {
        return allClaims.filter(claim => {
            const searchMatch = claim.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                claim.offerTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                claim.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase());

            const statusMatch = statusFilter === 'all' || claim.status === statusFilter;

            return searchMatch && statusMatch;
        });
    }, [allClaims, searchTerm, statusFilter]);


    const handleExportPDF = () => {
        if (filteredClaims.length === 0) {
            toast({ title: "No Data", description: "There are no claims to export.", variant: "destructive"});
            return;
        }

        const doc = new jsPDF();
        doc.text("Customer Claims Report", 14, 15);
        doc.autoTable({
            startY: 20,
            head: [['Customer Name', 'Phone', 'Offer Claimed', 'Status', 'Date']],
            body: filteredClaims.map(c => [
                c.customerName,
                c.customerPhone,
                c.offerTitle,
                c.status,
                format(c.claimedAt.toDate(), 'PP'),
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
    

    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Claims</h1>
                    <p className="text-muted-foreground hidden sm:block">A real-time log of all offers claimed by your customers.</p>
                </div>
                 <Button onClick={handleExportPDF} variant="outline">
                    <Download className="mr-2 h-4 w-4"/> Export PDF
                </Button>
            </div>

             <Card>
                <CardHeader>
                     <div className="flex flex-col sm:flex-row gap-4">
                         <div className="relative flex-1">
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
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="claimed">Claimed</SelectItem>
                                <SelectItem value="redeemed">Redeemed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredClaims.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground rounded-lg border bg-muted/20">
                        <Users className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                        <h3 className="text-xl font-semibold">No Claims Found</h3>
                        <p>When customers claim offers, the details will appear here. Try adjusting your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredClaims.map(claim => (
                            <Card key={claim.id} className="flex flex-col border hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-lg">{claim.customerName}</p>
                                         <Badge variant={claim.status === 'claimed' ? 'default' : 'secondary'}>
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
                                        <span>{formatDistanceToNow(claim.claimedAt.toDate(), { addSuffix: true })}</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t pt-4 flex justify-end gap-2">
                                    <Button size="sm" variant={claim.status === 'claimed' ? 'default' : 'secondary'} onClick={() => handleStatusToggle(claim.id, claim.status)}>
                                        {claim.status === 'claimed' ? <CheckCircle className="mr-2 h-4 w-4"/> : <XCircle className="mr-2 h-4 w-4"/> }
                                        {claim.status === 'claimed' ? 'Mark Redeemed' : 'Mark Claimed'}
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
                                                    This will permanently delete this claim for {claim.customerName}. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteClaim(claim.id)} className="bg-destructive hover:bg-destructive/90">Delete Claim</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
    );
}


    