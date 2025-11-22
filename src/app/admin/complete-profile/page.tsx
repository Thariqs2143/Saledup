
'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Store, Upload } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressInput } from '@/components/address-input';
import Image from 'next/image';


export default function AdminCompleteProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [address, setAddress] = useState('');
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
             if (user) {
                setAuthUser(user);
                setOwnerName(user.displayName || '');
                setOwnerEmail(user.email || '');
                setPhone(user.phoneNumber || '');
            } else {
                toast({ title: "Error", description: "You must be logged in to complete your profile.", variant: "destructive"});
                router.replace('/login');
            }
        });
        return () => unsubscribe();
    }, [router, toast]);
    
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        if (type === 'logo') setUploadingLogo(true);
        else setUploadingCover(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'saledup');

        try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dyov4r11v/image/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');
            
            const data = await response.json();

            if (type === 'logo') {
                setImageUrl(data.secure_url);
                toast({ title: "Logo Uploaded!", description: "Your shop logo has been set." });
            } else {
                setCoverImageUrl(data.secure_url);
                toast({ title: "Cover Photo Uploaded!", description: "Your shop cover photo has been set." });
            }

        } catch (error) {
            console.error("Error uploading photo:", error);
            toast({ title: "Upload Failed", description: "Could not upload your photo.", variant: "destructive" });
        } finally {
             if (type === 'logo') setUploadingLogo(false);
             else setUploadingCover(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!authUser) {
            toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
            return;
        }
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const shopName = formData.get('shopName') as string;
        const gstNumber = formData.get('gstNumber') as string;
        const shopPhone = formData.get('phone') as string;
        const formOwnerName = formData.get('ownerName') as string;

        if (!shopName || !address || !businessType || !shopPhone || !formOwnerName || !location) {
             toast({ title: "Error", description: "Please fill out all required fields, including a valid address.", variant: "destructive" });
             setLoading(false);
             return;
        }
        
        const fallback = shopName.split(' ').map(n => n[0]).join('');

        const shopData = {
            ownerId: authUser.uid,
            ownerName: formOwnerName,
            ownerEmail: ownerEmail,
            ownerImageUrl: authUser.photoURL || '',
            shopName,
            phone: shopPhone,
            address,
            businessType,
            gstNumber,
            lat: location.lat,
            lng: location.lng,
            status: 'active',
            imageUrl: imageUrl || `https://placehold.co/400x300.png?text=${fallback}`,
            coverImageUrl: coverImageUrl || `https://placehold.co/1200x400.png?text=${fallback}`,
            createdAt: new Date(),
        };

        const shopDocRef = doc(db, "shops", authUser.uid);
        
        setDoc(shopDocRef, shopData, { merge: true })
            .then(() => {
                toast({
                    title: "Profile Complete!",
                    description: "Welcome! Your shop profile has been created.",
                });
                router.push('/admin');
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: shopDocRef.path,
                  operation: 'create',
                  requestResourceData: shopData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setLoading(false);
            });
    };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="w-full max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Setup Your Shop Profile</h1>
                <p className="text-muted-foreground mt-2">
                    This is your business's public presence on Saledup.
                </p>
            </div>
            
            <div className="space-y-6">
                 <div className="space-y-2">
                     <Label>Shop Cover Photo</Label>
                     <div className="relative w-full aspect-[16/6] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                        {coverImageUrl ? (
                            <Image src={coverImageUrl} alt="Cover preview" layout="fill" objectFit="cover" />
                        ) : (
                            <p className="text-sm text-muted-foreground">Recommended: 1200x400</p>
                        )}
                         <input type="file" ref={coverInputRef} onChange={(e) => handlePhotoUpload(e, 'cover')} accept="image/*" className="hidden" />
                     </div>
                     <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
                      {uploadingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                      Upload Cover Photo
                    </Button>
                 </div>

                 <div className="flex flex-col items-start gap-4">
                    <Label>Shop Logo</Label>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-24 w-24 border-2 border-primary">
                            <AvatarImage src={imageUrl ?? undefined} />
                            <AvatarFallback><Store className="h-10 w-10"/></AvatarFallback>
                        </Avatar>
                        <input type="file" ref={logoInputRef} onChange={(e) => handlePhotoUpload(e, 'logo')} accept="image/*" className="hidden" />
                        <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                        {uploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                        Upload Logo
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="ownerName">Owner Name *</Label>
                        <Input id="ownerName" name="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ownerEmail">Owner Email</Label>
                        <Input id="ownerEmail" name="ownerEmail" value={ownerEmail} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="shopName">Shop / Business Name *</Label>
                        <Input id="shopName" name="shopName" placeholder="e.g. The Daily Grind Café" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">Shop Contact Number *</Label>
                        <Input id="phone" name="phone" type="tel" placeholder="e.g. 9876543210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type / Category *</Label>
                         <Select onValueChange={setBusinessType} required>
                            <SelectTrigger id="businessType">
                                <SelectValue placeholder="Select a category" />
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
                        <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                        <Input id="gstNumber" name="gstNumber" placeholder="e.g. 29ABCDE1234F1Z5" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Full Shop Address *</Label>
                    <AddressInput 
                        value={address} 
                        onValueChange={setAddress}
                        onLocationSelect={(loc) => setLocation(loc ? { lat: loc.y, lng: loc.x } : null)}
                    />
                </div>
            </div>
            <div className="flex justify-center pt-4">
                <Button type="submit" size="lg" className="w-full max-w-sm" disabled={loading || uploadingLogo || uploadingCover}>
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

    
