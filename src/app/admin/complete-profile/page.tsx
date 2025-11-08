'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building, Loader2, Store, Upload } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
             if (user) {
                setAuthUser(user);
                setOwnerName(user.displayName || '');
                setOwnerEmail(user.email || '');
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
        formData.append('upload_preset', 'attendry_uploads'); // Replace with your Cloudinary upload preset

        try {
            const response = await fetch('https://api.cloudinary.com/v1_1/YOUR_CLOUDINARY_CLOUD_NAME/image/upload', { // Replace with your Cloudinary URL
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

        if (!shopName || !address) {
             toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
             setLoading(false);
             return;
        }
        
        const fallback = shopName.split(' ').map(n => n[0]).join('');

        try {
            const shopDocRef = doc(db, "shops", authUser.uid);
            await setDoc(shopDocRef, {
                ownerId: authUser.uid,
                ownerName: ownerName,
                ownerEmail: ownerEmail,
                ownerImageUrl: authUser.photoURL || '',
                shopName,
                address,
                imageUrl: imageUrl || `https://placehold.co/400x300.png?text=${fallback}`,
                createdAt: new Date(),
            }, { merge: true });

            toast({
                title: "Profile Complete!",
                description: "Welcome! Your shop profile has been created.",
            });
            
            router.push('/admin');

        } catch (error) {
            console.error("Error creating shop profile:", error);
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
                    This is your business's public presence on Saledup.
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
