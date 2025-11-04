
'use client';

import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Store, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import Link from 'next/link';

type ShopProfile = {
    shopName: string;
    businessType: string;
    address: string;
    email: string;
    gstNumber: string;
};


export default function EditBranchPage() {
    const router = useRouter();
    const params = useParams();
    const { branchId } = params as { branchId: string };
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<Partial<ShopProfile>>({});

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAuthUser(user);
            } else {
                router.replace('/admin/login');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!authUser || !branchId) return;

        const fetchBranch = async () => {
            setLoading(true);
            const shopDocRef = doc(db, 'shops', branchId);
            const shopSnap = await getDoc(shopDocRef);

            if (shopSnap.exists() && shopSnap.data().ownerId === authUser.uid) {
                setProfile(shopSnap.data());
            } else {
                toast({ title: "Not Found", description: "This branch either does not exist or you do not have permission to edit it.", variant: "destructive"});
                router.replace('/admin/branches');
            }
            setLoading(false);
        };
        
        fetchBranch();
    }, [authUser, branchId, router, toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setProfile(prev => ({ ...prev, [id]: value }));
    };
    
    const handleSelectChange = (value: string) => {
        setProfile(prev => ({...prev, businessType: value}));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!profile.shopName || !profile.businessType || !profile.address) {
             toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
             return;
        }

        setSaving(true);
        const shopDocRef = doc(db, 'shops', branchId);
        try {
            await updateDoc(shopDocRef, {
                shopName: profile.shopName,
                businessType: profile.businessType,
                address: profile.address,
                email: profile.email || '',
                gstNumber: profile.gstNumber || '',
            });

            toast({
                title: "Branch Updated!",
                description: `${profile.shopName} has been successfully updated.`,
            });
            router.push('/admin/branches');

        } catch (error) {
            console.error("Error updating branch:", error);
            toast({ title: "Error", description: "Could not update the branch. Please try again.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="w-full max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/branches">
                    <Button variant="outline" size="icon" type="button">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="text-left">
                    <h1 className="text-3xl font-bold">Edit Branch Details</h1>
                    <p className="text-muted-foreground mt-1">
                        Update the information for {profile.shopName}.
                    </p>
                </div>
            </div>
            
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="shopName">Branch / Shop Name *</Label>
                        <Input id="shopName" name="shopName" value={profile.shopName || ''} onChange={handleInputChange} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type *</Label>
                        <Select onValueChange={handleSelectChange} value={profile.businessType || ''} required>
                            <SelectTrigger id="businessType">
                                <SelectValue placeholder="Select business type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Retail">Retail</SelectItem>
                                <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                                <SelectItem value="Service">Service</SelectItem>
                                <SelectItem value="MSME">MSME</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Branch Email Address</Label>
                        <Input id="email" name="email" type="email" value={profile.email || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gstNumber">Branch GST Number (Optional)</Label>
                        <Input id="gstNumber" name="gstNumber" value={profile.gstNumber || ''} onChange={handleInputChange} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Full Branch Address *</Label>
                    <Textarea id="address" name="address" value={profile.address || ''} onChange={handleInputChange} required />
                </div>
            </div>
            <div className="flex justify-center pt-4">
                <Button type="submit" size="lg" className="w-full max-w-sm" disabled={saving}>
                    {saving && <Loader2 className="mr-2 animate-spin" />}
                    <Store className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
