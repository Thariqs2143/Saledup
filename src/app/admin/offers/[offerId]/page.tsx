
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Tag, Upload, ArrowLeft, Save, Trash2, Calendar as CalendarIcon, Clock, IndianRupee } from 'lucide-react';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
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
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type Offer = {
    title: string;
    description: string;
    discountType: string;
    discountValue?: string;
    approximateValue?: number;
    terms?: string;
    imageUrl?: string;
    // New scheduling fields
    startDate?: Timestamp;
    endDate?: Timestamp;
    startTime?: string;
    endTime?: string;
};

export default function AdminEditOfferPage() {
    const router = useRouter();
    const params = useParams();
    const offerId = params.offerId as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [offer, setOffer] = useState<Partial<Offer>>({});
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

    useEffect(() => {
        if (!authUser || !offerId) return;

        const offerDocRef = doc(db, 'shops', authUser.uid, 'offers', offerId);
        getDoc(offerDocRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data() as Offer;
                setOffer(data);
                setImageUrl(data.imageUrl || '');
                // Populate scheduling states
                if (data.startDate) setStartDate(data.startDate.toDate());
                if (data.endDate) setEndDate(data.endDate.toDate());
                setStartTime(data.startTime || '');
                setEndTime(data.endTime || '');
            } else {
                toast({ title: "Offer not found", variant: "destructive" });
                router.push('/admin/offers');
            }
        }).catch(err => {
            console.error(err);
            toast({ title: "Error loading offer", variant: "destructive" });
        }).finally(() => {
            setLoading(false);
        });

    }, [authUser, offerId, router, toast]);

    const handleFieldChange = (field: keyof Offer, value: string | number) => {
        setOffer(prev => prev ? { ...prev, [field]: value } : null);
    };

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
            handleFieldChange('imageUrl', data.secure_url);
            toast({ title: "Photo Updated!", description: "Your offer photo has been changed." });

        } catch (error) {
            console.error("Error uploading photo:", error);
            toast({ title: "Upload Failed", description: "Could not upload your photo.", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!authUser || !offer) return;
        setSaving(true);
        
        const offerDocRef = doc(db, "shops", authUser.uid, "offers", offerId);
        try {
            const dataToUpdate = {
                ...offer,
                imageUrl,
                updatedAt: serverTimestamp(),
                startDate: startDate || null,
                endDate: endDate || null,
                startTime: startTime || null,
                endTime: endTime || null,
            };
            await updateDoc(offerDocRef, dataToUpdate);
            toast({ title: "Offer Updated", description: "Your changes have been saved."});
            router.push('/admin/offers');
        } catch (error) {
            toast({ title: "Error", description: "Could not save your changes.", variant: "destructive"});
        } finally {
            setSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!authUser) return;
        setDeleting(true);
        try {
            await deleteDoc(doc(db, "shops", authUser.uid, "offers", offerId));
            toast({ title: "Offer Deleted", description: "The offer has been permanently removed."});
            router.push('/admin/offers');
        } catch(e) {
            toast({ title: "Error", description: "Could not delete the offer.", variant: "destructive" });
            setDeleting(false);
        }
    }

  if (loading || !offer) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Link href="/admin/offers">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Edit Offer</h1>
            </div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting}>
                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this offer.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                         {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>

        <Card>
            <form onSubmit={handleSubmit}>
                <CardContent className="pt-6 space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Offer Title *</Label>
                            <Input id="title" name="title" value={offer.title} onChange={e => handleFieldChange('title', e.target.value)} required />
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
                                Change Photo
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Offer Description *</Label>
                            <Textarea id="description" name="description" value={offer.description} onChange={e => handleFieldChange('description', e.target.value)} required />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="discountType">Discount Type *</Label>
                                <Select name="discountType" value={offer.discountType} onValueChange={value => handleFieldChange('discountType', value)} required>
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
                                <Input id="discountValue" name="discountValue" value={offer.discountValue || ''} onChange={e => handleFieldChange('discountValue', e.target.value)} placeholder="e.g., 20, 100, or 'Buy One Get One Free'" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="approximateValue">Approximate Order Value (₹) (Optional)</Label>
                             <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="approximateValue" name="approximateValue" type="number" value={offer.approximateValue || ''} onChange={e => handleFieldChange('approximateValue', Number(e.target.value))} placeholder="e.g., 500" className="pl-10" />
                            </div>
                            <p className="text-xs text-muted-foreground">Helps us identify your high-spend customers.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="terms">Terms & Conditions (Optional)</Label>
                            <Textarea id="terms" name="terms" value={offer.terms || ''} onChange={e => handleFieldChange('terms', e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="space-y-6 border-t pt-6">
                        <CardHeader className="p-0">
                            <CardTitle>Scheduling (Optional)</CardTitle>
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
                    </div>
                </CardContent>

                 <CardContent className="border-t pt-6 flex justify-end">
                    <Button type="submit" disabled={saving || uploading}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </CardContent>
            </form>
        </Card>
    </div>
  );
}
