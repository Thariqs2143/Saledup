
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Gem, User, Phone } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { LandingFooter } from '@/components/landing-footer';
import { LandingHeader } from '@/components/landing-header';

type Customer = {
    name: string;
    saledupPoints: number;
};

export default function MyPointsPage() {
    const { toast } = useToast();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [customerData, setCustomerData] = useState<Customer | null>(null);

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length < 10) {
            toast({ title: 'Invalid Phone Number', variant: 'destructive' });
            return;
        }

        setLoading(true);
        setCustomerData(null);
        try {
            const customerDocRef = doc(db, 'customers', phone);
            const docSnap = await getDoc(customerDocRef);
            if (docSnap.exists()) {
                setCustomerData(docSnap.data() as Customer);
            } else {
                toast({
                    title: 'No Account Found',
                    description: 'This phone number is not associated with any Saledup account.',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Could not fetch your points balance.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-muted/30">
            <LandingHeader />
            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <Card className="w-full max-w-md shadow-2xl">
                    <CardHeader className="text-center">
                         <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                            <Gem className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle>My Saledup Points</CardTitle>
                        <CardDescription>Enter your phone number to check your universal rewards balance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!customerData ? (
                            <form onSubmit={handleLookup} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <div className="relative">
                                         <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="Enter your 10-digit number"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                            required
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 animate-spin" /> : <Search className="mr-2" />}
                                    Check My Balance
                                </Button>
                            </form>
                        ) : (
                             <div className="space-y-6 text-center animate-in fade-in-50">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Welcome back,</p>
                                    <p className="text-xl font-bold">{customerData.name}</p>
                                </div>
                                <div className="bg-primary/10 p-6 rounded-lg">
                                    <p className="text-sm font-semibold text-primary">Your Points Balance</p>
                                    <p className="text-6xl font-extrabold text-primary">{customerData.saledupPoints}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">You can redeem these points at any participating Saledup shop!</p>
                                <Button variant="outline" onClick={() => setCustomerData(null)} className="w-full">
                                    Check another number
                                </Button>
                             </div>
                        )}
                    </CardContent>
                </Card>
            </main>
            <LandingFooter />
        </div>
    );
}

    