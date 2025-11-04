
'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building, Loader2, Store, Upload } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { doc, setDoc, writeBatch, collection, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/app/admin/employees/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function AdminCompleteProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState('');
    const [uid, setUid] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const adminUID = localStorage.getItem('adminUID');
        const adminPhone = localStorage.getItem('adminPhone');
        if (adminUID && adminPhone) {
            setUid(adminUID);
            setPhone(adminPhone);
        } else {
            toast({ title: "Error", description: "Could not find admin information. Please log in again.", variant: "destructive"});
            router.replace('/admin/login');
        }
    }, [router, toast]);
    
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'attendry_uploads');

        try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dkek6cset/image/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Cloudinary upload error:", errorText);
                throw new Error(`Upload failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.secure_url) {
                setImageUrl(data.secure_url);
                toast({ title: "Photo Uploaded!", description: "Your profile photo has been updated." });
            } else {
                console.error("Cloudinary upload failed:", data);
                throw new Error('Image URL not found in response');
            }
        } catch (error) {
            console.error("Error uploading photo to Cloudinary:", error);
            toast({ title: "Upload Failed", description: "Could not upload your photo.", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const shopName = formData.get('shopName') as string;
        const address = formData.get('address') as string;
        const email = formData.get('email') as string;
        const gstNumber = formData.get('gstNumber') as string;


        if (!name || !shopName || !businessType || !address) {
             toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
             setLoading(false);
             return;
        }
        
        const fallback = shopName.split(' ').map(n => n[0]).join('');

        // The owner is an employee of their own shop
        const userAsEmployeeProfile: Partial<User> = {
            name,
            email,
            phone,
            role: 'Admin',
            status: 'Active',
            isProfileComplete: true,
            fallback,
            joinDate: new Date().toISOString().split('T')[0],
            imageUrl: imageUrl || `https://placehold.co/100x100.png?text=${fallback}`,
        };

        const newShopRef = doc(db, "shops", uid); // The first shop's ID is the owner's UID

        const shopProfile = {
            id: newShopRef.id,
            ownerName: name,
            ownerId: uid,
            shopName,
            businessType,
            address,
            email,
            gstNumber,
            status: 'active',
        };

        try {
            const batch = writeBatch(db);

            // 1. Set the user document in 'users' collection (this is the owner's main profile)
            const userDocRef = doc(db, "users", uid);
            // This profile is slightly different; it holds main contact info
             const mainUserProfile = {
                ...userAsEmployeeProfile,
                shopId: newShopRef.id, // Link to their main shop
             };
            batch.set(userDocRef, mainUserProfile, { merge: true });

            // 2. Set the main shop document in 'shops' collection
            batch.set(newShopRef, shopProfile, { merge: true });

            // 3. Create the owner as the first employee in the new shop's subcollection
            const ownerAsEmployeeRef = doc(db, 'shops', newShopRef.id, 'employees', uid);
            batch.set(ownerAsEmployeeRef, { ...userAsEmployeeProfile, shopId: newShopRef.id });

            // 4. Create a lookup for the admin phone
            const phoneLookupRef = doc(db, 'employee_phone_to_shop_lookup', phone);
            batch.set(phoneLookupRef, { shopId: newShopRef.id, employeeDocId: uid, isAdmin: true, isProfileComplete: true }, { merge: true });

            // 5. Handle referral if it exists
            const shopDocSnap = await getDoc(newShopRef);
            const referredBy = shopDocSnap.data()?.referredBy;
            if (referredBy) {
                const referrerShopRef = doc(db, 'shops', referredBy);
                const referrerShopSnap = await getDoc(referrerShopRef);
                if (referrerShopSnap.exists()) {
                    const newReferralRef = doc(collection(db, 'shops', referredBy, 'referrals'));
                    batch.set(newReferralRef, {
                        referredShopId: uid,
                        referredShopName: shopName,
                        status: 'Joined',
                        date: new Date().toISOString(),
                    });
                }
            }

            await batch.commit();


            toast({
                title: "Profile Complete!",
                description: "Welcome! Your shop profile has been created.",
            });
            
            localStorage.removeItem('adminUID');
            localStorage.removeItem('adminPhone');
            
            router.push('/admin');

        } catch (error) {
            console.error("Error creating admin profile:", error);
            toast({ title: "Error", description: "Could not save your profile. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="w-full max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                    <Building className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Setup Your Shop Profile</h1>
                <p className="text-muted-foreground mt-2">
                    Please provide your business details to get started.
                </p>
            </div>
            
            <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                        <AvatarImage src={imageUrl ?? undefined} />
                        <AvatarFallback><Building className="h-10 w-10"/></AvatarFallback>
                    </Avatar>
                     <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                      Upload Photo
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Contact Person Name *</Label>
                        <Input id="name" name="name" placeholder="e.g. John Doe" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Contact Phone Number</Label>
                        <Input id="phone" name="phone" type="tel" value={phone} required readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="shopName">Shop / Business Name *</Label>
                        <Input id="shopName" name="shopName" placeholder="e.g. JD Retail Store" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type *</Label>
                        <Select onValueChange={setBusinessType} required>
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
                        <Label htmlFor="email">Business Email Address</Label>
                        <Input id="email" name="email" type="email" placeholder="e.g. contact@jdretail.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                        <Input id="gstNumber" name="gstNumber" placeholder="e.g. 29ABCDE1234F1Z5" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Full Shop Address *</Label>
                    <Textarea id="address" name="address" placeholder="e.g. 123 Main Street, City, State, Pincode" required />
                </div>
            </div>
            <div className="flex justify-center pt-4">
                <Button type="submit" size="lg" className="w-full max-w-sm" disabled={loading || uploading}>
                    {loading && <Loader2 className="mr-2 animate-spin" />}
                    <Store className="mr-2 h-4 w-4" />
                    Complete Setup
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
