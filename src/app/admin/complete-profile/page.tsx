
'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
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


export default function AdminCompleteProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [businessType, setBusinessType] = useState('');


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
    
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploading(true);

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
            setImageUrl(data.secure_url);
            toast({ title: "Photo Uploaded!", description: "Your shop photo has been updated." });

        } catch (error) {
            console.error("Error uploading photo:", error);
            toast({ title: "Upload Failed", description: "Could not upload your photo.", variant: "destructive" });
        } finally {
            setUploading(false);
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
        const address = formData.get('address') as string;
        const gstNumber = formData.get('gstNumber') as string;
        const shopPhone = formData.get('phone') as string;

        if (!shopName || !address || !businessType || !shopPhone) {
             toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
             setLoading(false);
             return;
        }
        
        const fallback = shopName.split(' ').map(n => n[0]).join('');

        const shopData = {
            ownerId: authUser.uid,
            ownerName: ownerName,
            ownerEmail: ownerEmail,
            ownerImageUrl: authUser.photoURL || '',
            shopName,
            phone: shopPhone,
            address,
            businessType,
            gstNumber,
            status: 'active',
            imageUrl: imageUrl || `https://placehold.co/400x300.png?text=${fallback}`,
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
                 <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                        <AvatarImage src={imageUrl ?? undefined} />
                        <AvatarFallback><Store className="h-10 w-10"/></AvatarFallback>
                    </Avatar>
                     <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                      Upload Shop Photo
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="ownerName">Owner Name</Label>
                        <Input id="ownerName" name="ownerName" value={ownerName} readOnly disabled />
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
                        <Input id="phone" name="phone" type="tel" placeholder="e.g. 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
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
                    <Textarea id="address" name="address" placeholder="e.g. 123 Main Street, Anytown, State, 12345" required />
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
