
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gift, ArrowLeft, Download, IndianRupee, FileText, Bot } from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from 'date-fns';

export default function AdminAddVoucherPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [shopName, setShopName] = useState('');

    // State for live preview
    const [previewValue, setPreviewValue] = useState('500');
    const [previewCustomerName, setPreviewCustomerName] = useState('Corporate Client Name');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
             if (!user) {
                router.replace('/login');
            } else {
                setAuthUser(user);
                const shopDocRef = doc(db, 'shops', user.uid);
                const shopDoc = await getDoc(shopDocRef);
                if (shopDoc.exists()) {
                    setShopName(shopDoc.data().shopName || "Your Shop Name");
                }
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    const generateVoucherPDF = (vouchers: any[]) => {
        const doc = new jsPDF();
        const vouchersPerPage = 4;
        let voucherCount = 0;

        vouchers.forEach((voucher, index) => {
            if (index > 0 && index % vouchersPerPage === 0) {
                doc.addPage();
            }

            const yPos = (index % vouchersPerPage) * 70 + 15;

            // Voucher border
            doc.setDrawColor(200);
            doc.roundedRect(10, yPos, 190, 60, 3, 3);
            
            // Shop Name
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(shopName || "Your Shop", 15, yPos + 10);
            
            // Title
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text("Corporate Gift Voucher", 15, yPos + 18);

            // Value
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text(`₹${voucher.value}`, 15, yPos + 35);
            
            // Details
            doc.setFontSize(8);
            doc.text(`Issued to: ${voucher.customerName}`, 15, yPos + 45);
            doc.text(`Expires: ${format(voucher.expiresAt.toDate(), 'PP')}`, 15, yPos + 50);
            
            const publicVerificationUrl = `${window.location.origin}/vouchers/${voucher.id}?shopId=${authUser?.uid}`;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicVerificationUrl)}`;
            
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = qrCodeUrl;
            img.onload = () => {
                doc.addImage(img, 'PNG', 145, yPos + 10, 45, 45);
                voucherCount++;
                if (voucherCount === vouchers.length) {
                    doc.save(`vouchers_${voucher.customerName.replace(/\s+/g, '_')}.pdf`);
                }
            }
             // Fallback for image loading issue
            if(index === vouchers.length - 1 && voucherCount < vouchers.length) {
                setTimeout(() => {
                     if (voucherCount >= vouchers.length -1) { // be a bit lenient
                        doc.save(`vouchers_${voucher.customerName.replace(/\s+/g, '_')}.pdf`);
                     }
                }, 1000 * vouchers.length);
            }
        });
    };


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!authUser) return;

        const formData = new FormData(e.currentTarget);
        const quantity = parseInt(formData.get('quantity') as string, 10);
        const value = parseInt(formData.get('value') as string, 10);
        const customerName = formData.get('customerName') as string;

        if (isNaN(quantity) || quantity <= 0 || isNaN(value) || value <= 0 || !customerName) {
            toast({ title: "Invalid Input", description: "Please provide a valid quantity, value, and customer/company name.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const batch = writeBatch(db);
            const vouchersForPDF = [];
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 6);

            const vouchersCollectionRef = collection(db, 'shops', authUser.uid, 'vouchers');

            for (let i = 0; i < quantity; i++) {
                const voucherRef = doc(vouchersCollectionRef);
                const voucherData = {
                    customerName,
                    value,
                    status: 'valid' as const,
                    createdAt: serverTimestamp(),
                    expiresAt: expiresAt,
                    shopId: authUser.uid,
                };
                batch.set(voucherRef, voucherData);
                vouchersForPDF.push({ id: voucherRef.id, ...voucherData });
            }

            await batch.commit();
            
            toast({
                title: "Vouchers Generated!",
                description: `${quantity} vouchers have been created. Preparing PDF for download.`,
            });
            
            generateVoucherPDF(vouchersForPDF);

            router.push('/admin/vouchers');
        } catch (error) {
            console.error("Error generating vouchers:", error);
            toast({ title: "Generation Failed", description: "Could not create the vouchers.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/vouchers">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Generate Gift Vouchers</h1>
                    <p className="text-muted-foreground">Create a batch of unique corporate or individual gift vouchers.</p>
                </div>
            </div>

            <Card>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Bulk Voucher Generation</CardTitle>
                        <CardDescription>
                            This tool will generate a set of unique vouchers and provide a printable PDF.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="quantity">Number of Vouchers</Label>
                                <Input id="quantity" name="quantity" type="number" placeholder="e.g., 100" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="value">Voucher Value (in ₹)</Label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="value" 
                                        name="value" 
                                        type="number" 
                                        placeholder="e.g., 500" 
                                        className="pl-10" 
                                        required 
                                        onChange={(e) => setPreviewValue(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customerName">Customer / Company Name</Label>
                            <Input 
                                id="customerName" 
                                name="customerName" 
                                placeholder="e.g., TechSolutions Inc." 
                                required 
                                onChange={(e) => setPreviewCustomerName(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">This name will be printed on all vouchers in this batch.</p>
                        </div>
                    </CardContent>
                    
                    <CardFooter className="border-t pt-6 flex justify-end">
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                            Generate & Download PDF
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
        
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Voucher Preview</CardTitle>
                    <CardDescription>This is how each voucher will look in the generated PDF.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg p-6 space-y-4 shadow-md bg-background">
                         <h3 className="text-xl font-bold text-primary">{shopName}</h3>
                         <p className="text-muted-foreground">Official Gift Voucher</p>
                         <div className="bg-primary/10 p-4 rounded-lg text-center">
                             <p className="text-sm text-primary font-semibold">Voucher Value</p>
                             <p className="text-5xl font-extrabold text-primary">₹{previewValue || '0'}</p>
                         </div>
                         <div className="space-y-1 text-sm">
                             <p><span className="font-semibold">Issued to:</span> {previewCustomerName || '...'}</p>
                             <p><span className="font-semibold">Expires:</span> 6 months from issue date</p>
                             <p><span className="font-semibold">Status:</span> VALID</p>
                         </div>
                     </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
