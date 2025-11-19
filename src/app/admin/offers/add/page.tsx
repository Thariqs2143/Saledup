
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Tag, Upload, ArrowLeft, Calendar as CalendarIcon, Clock, IndianRupee } from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export default function AdminAddOfferPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // New state for scheduling
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
             if (!user) {
                router.replace('/login');
            } else {
                setAuthUser(user);
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'saledup'); // Your Cloudinary upload preset

        try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dyov4r11v/image/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');
            
            const data = await response.json();
            setImageUrl(data.secure_url);
            toast({ title: "Photo Uploaded!", description: "Your offer photo has been added." });

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
            toast({ title: "Not Authenticated", variant: "destructive" });
            return;
        }

        const formData = new FormData(e.currentTarget);
        const offerData = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            discountType: formData.get('discountType') as string,
            discountValue: formData.get('discountValue') as string,
            approximateValue: Number(formData.get('approximateValue')) || 0,
            terms: formData.get('terms') as string,
            imageUrl: imageUrl || `https://placehold.co/600x400?text=${(formData.get('title') as string).replace(/\s/g, '+')}`,
            isActive: true,
            claimCount: 0,
            viewCount: 0,
            createdAt: serverTimestamp(),
            // New scheduling fields
            startDate: startDate || null,
            endDate: endDate || null,
            startTime: startTime || null,
            endTime: endTime || null,
        };

        if (!offerData.title || !offerData.description || !offerData.discountType) {
            toast({ title: "Missing Fields", description: "Please fill out all required fields.", variant: "destructive" });
            return;
        }

        setLoading(true);

        const offersCollectionRef = collection(db, "shops", authUser.uid, "offers");
        addDoc(offersCollectionRef, offerData)
            .then(() => {
                toast({
                    title: "Offer Created!",
                    description: "Your new offer is now live for customers.",
                });
                router.push('/admin/offers');
            })
            .catch(async (serverError) => {
                 const permissionError = new FirestorePermissionError({
                  path: offersCollectionRef.path,
                  operation: 'create',
                  requestResourceData: offerData,
                });
                errorEmitter.emit('permission-error', permissionError);
                 toast({ title: "Permission Denied", description: "You don't have permission to create offers.", variant: "destructive" });
            })
            .finally(() => {
                setLoading(false);
            });
    };

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Link href="/admin/offers">
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Create a New Offer</h1>
                <p className="text-muted-foreground">This will be displayed to customers who scan your QR code.</p>
            </div>
        </div>

        <Card>
            <form onSubmit={handleSubmit}>
                <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Offer Title *</Label>
                        <Input id="title" name="title" placeholder="e.g., 20% Off All Coffee" required />
                        <p className="text-xs text-muted-foreground">A short, catchy title for your deal.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Offer Image</Label>
                        <div className="flex items-center gap-4">
                             {imageUrl && (
                                <Image
                                    src={imageUrl}
                                    alt="Offer preview"
                                    width={100}
                                    height={100}
                                    className="rounded-md aspect-square object-cover"
                                />
                             )}
                            <Input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                            Upload Photo
                            </Button>
                        </div>
                         <p className="text-xs text-muted-foreground">Upload an attractive image of your product or service.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Offer Description *</Label>
                        <Textarea id="description" name="description" placeholder="Describe the offer in more detail. What makes it special?" required />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="discountType">Discount Type *</Label>
                            <Select name="discountType" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select discount type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage">Percentage Off (%)</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount Off (₹)</SelectItem>
                                    <SelectItem value="freebie">Free Item / BOGO</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discountValue">Discount Value</Label>
                            <Input id="discountValue" name="discountValue" placeholder="e.g., 20, 100, or 'Buy One Get One Free'" />
                             <p className="text-xs text-muted-foreground">Enter a number or a short text description.</p>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="approximateValue">Approximate Order Value (₹) (Optional)</Label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="approximateValue" name="approximateValue" type="number" placeholder="e.g., 500" className="pl-10" />
                        </div>
                        <p className="text-xs text-muted-foreground">Helps us identify your high-spend customers. Enter the average amount a customer spends with this offer.</p>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="terms">Terms & Conditions (Optional)</Label>
                        <Textarea id="terms" name="terms" placeholder="e.g., Valid on weekdays only. Cannot be combined with other offers." />
                    </div>

                </CardContent>
                
                 <CardContent>
                    <CardHeader className="p-0 mb-4 -ml-6">
                        <CardTitle>Scheduling (Optional)</CardTitle>
                        <CardDescription>Set a specific time frame for this offer. Leave blank for the offer to be always active.</CardDescription>
                    </CardHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="startTime">Start Time</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="pl-10" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endTime">End Time</Label>
                             <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="pl-10" />
                            </div>
                        </div>
                    </div>
                </CardContent>

                 <CardContent className="border-t pt-6 flex justify-end">
                    <Button type="submit" disabled={loading || uploading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Tag className="mr-2 h-4 w-4" />
                        Create Offer
                    </Button>
                </CardContent>
            </form>
        </Card>
    </div>
  );
}
