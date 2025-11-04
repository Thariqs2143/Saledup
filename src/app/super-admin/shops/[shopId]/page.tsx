
'use client';

import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Building, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User as AppUser } from '@/app/admin/employees/page';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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


type ShopProfile = {
    ownerName?: string;
    shopName?: string;
    businessType?: string;
    address?: string;
    email?: string;
    gstNumber?: string;
    status?: 'active' | 'disabled';
};

type FullProfile = AppUser & ShopProfile;

export default function SuperAdminViewShopPage() {
    const router = useRouter();
    const params = useParams();
    const { shopId } = params as { shopId: string };
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [profile, setProfile] = useState<Partial<FullProfile>>({});
    const [status, setStatus] = useState<'active' | 'disabled'>('active');

    useEffect(() => {
        if (!shopId) return;
        
        const fetchProfileData = async () => {
            setLoading(true);
            try {
                // The shop owner's UID is the same as the shop's ID in our structure
                const userDocRef = doc(db, 'users', shopId);
                const userSnap = await getDoc(userDocRef);
                const userData = userSnap.exists() ? userSnap.data() : {};

                const shopDocRef = doc(db, 'shops', shopId);
                const shopSnap = await getDoc(shopDocRef);
                const shopData = shopSnap.exists() ? shopSnap.data() : {};
                
                setProfile({ ...userData, ...shopData });
                setStatus(shopData.status || 'active');

            } catch (error) {
                toast({ title: "Error", description: "Failed to load shop owner's profile data.", variant: "destructive" });
                 router.replace('/super-admin/shops');
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [shopId, router, toast]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setProfile(prev => ({ ...prev, [id]: value }));
    };
    
    const handleSelectChange = (value: string) => {
        setProfile(prev => ({...prev, businessType: value}));
    };

    const handleSaveChanges = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        try {
            const batch = writeBatch(db);

            // Update user document
            const userDocRef = doc(db, 'users', shopId);
            batch.update(userDocRef, {
                name: profile.name,
                email: profile.email,
            });

            // Update shop document
            const shopDocRef = doc(db, 'shops', shopId);
            batch.update(shopDocRef, {
                shopName: profile.shopName,
                ownerName: profile.name,
                businessType: profile.businessType,
                address: profile.address,
                email: profile.email,
                gstNumber: profile.gstNumber,
            });
            
            await batch.commit();
            toast({ title: "Profile Updated", description: `${profile.shopName}'s details have been saved.`});

        } catch (error) {
             console.error("Error updating profile:", error);
             toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };


    const handleStatusSave = async () => {
        setSaving(true);
        try {
            const shopDocRef = doc(db, 'shops', shopId);
            await updateDoc(shopDocRef, { status: status });
            toast({
                title: "Status Updated",
                description: `${profile.shopName} has been ${status === 'active' ? 'enabled' : 'disabled'}.`
            });
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ title: "Error", description: "Failed to update shop status.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };
    
    const handleDeleteShop = async () => {
        setDeleting(true);
        try {
            // Note: In a production app, this should trigger a backend function 
            // to ensure all subcollections (employees, attendance, etc.) are deleted.
            // A simple client-side delete is not sufficient for cascading deletes.
            const shopDocRef = doc(db, 'shops', shopId);
            await deleteDoc(shopDocRef);

            // Also delete the corresponding user document
            const userDocRef = doc(db, 'users', shopId);
            await deleteDoc(userDocRef);
            
            toast({
                title: "Shop Deleted",
                description: `${profile.shopName} has been permanently removed.`,
            });
            router.push('/super-admin/shops');

        } catch (error) {
            console.error("Error deleting shop:", error);
            toast({ title: "Error", description: "Failed to delete the shop. Please try again.", variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    }
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!profile.shopName) {
        return (
            <div className="text-center">
                 <p className="text-muted-foreground">Could not load profile.</p>
                 <Link href="/super-admin/shops">
                    <Button variant="link">Go Back</Button>
                </Link>
            </div>
        )
    }

  return (
    <div className="flex flex-col items-center justify-start bg-background p-4 sm:p-6 lg:p-8 w-full">
      <div className="w-full max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
            <Link href="/super-admin/shops">
                <Button variant="outline" size="icon" type="button">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div className="text-left">
                <h1 className="text-xl sm:text-3xl font-bold">Viewing Shop Profile</h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    Details for {profile.shopName}.
                </p>
            </div>
        </div>
        
         <form onSubmit={handleSaveChanges}>
            <Card>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-24 w-24 border-2 border-primary">
                            <AvatarImage src={profile.imageUrl ?? undefined} />
                            <AvatarFallback><Building className="h-10 w-10"/></AvatarFallback>
                        </Avatar>
                        <Input 
                            id="shopName"
                            className="text-2xl font-bold text-center h-auto p-2 border-0 focus-visible:ring-2"
                            value={profile.shopName || ''}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Contact Person Name</Label>
                            <Input id="name" value={profile.name || ''} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Contact Phone Number</Label>
                            <Input id="phone" type="tel" value={profile.phone || ''} readOnly disabled />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="businessType">Business Type</Label>
                             <Select onValueChange={handleSelectChange} value={profile.businessType || ''}>
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
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Business Email Address</Label>
                            <Input id="email" type="email" value={profile.email || ''} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="gstNumber">GST Number</Label>
                            <Input id="gstNumber" value={profile.gstNumber || ''} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="address">Full Shop Address</Label>
                        <Textarea id="address" value={profile.address || ''} onChange={handleInputChange} />
                    </div>
                </CardContent>
                <CardContent className="border-t pt-6 flex justify-end">
                     <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile Changes
                    </Button>
                </CardContent>
            </Card>
        </form>

        <Card className="border-amber-500">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="text-amber-500"/>Shop Management</CardTitle>
                <CardDescription>Enable or disable this shop's access to the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="shop-status" className="text-base font-semibold">Shop Status</Label>
                        <p className="text-sm text-muted-foreground">
                            Disabling a shop will prevent the owner and all employees from logging in.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant={status === 'active' ? 'secondary' : 'destructive'}>
                            {status === 'active' ? 'Active' : 'Disabled'}
                        </Badge>
                        <Switch
                            id="shop-status"
                            checked={status === 'active'}
                            onCheckedChange={(checked) => setStatus(checked ? 'active' : 'disabled')}
                            aria-label="Toggle shop status"
                        />
                    </div>
                </div>
            </CardContent>
            <CardContent className="border-t pt-6 flex justify-end">
                <Button onClick={handleStatusSave} disabled={saving || profile.status === status}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Save className="mr-2 h-4 w-4" />
                    Save Status
                </Button>
            </CardContent>
        </Card>
        
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2"><Trash2/>Danger Zone</CardTitle>
                <CardDescription>This action is irreversible and will permanently delete the shop and all its data.</CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                        {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete this Shop
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the shop account for 
                        <span className="font-bold"> {profile.shopName} </span> 
                        and remove all of their data, including employees, attendance, and settings.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteShop} className="bg-destructive hover:bg-destructive/90">Continue Deletion</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
