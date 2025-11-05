
'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Store, ArrowLeft, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { User } from '@/app/admin/employees/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import Link from 'next/link';
import { useSubscription } from '@/context/SubscriptionContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AddBranchPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [ownerProfile, setOwnerProfile] = useState<Partial<User>>({});
    const [businessType, setBusinessType] = useState('');
    const { hasReachedBranchLimit, canAccessFeature } = useSubscription();
    const [branchCount, setBranchCount] = useState(0);

    const isLocked = !canAccessFeature('MULTI_BRANCH') || hasReachedBranchLimit(branchCount + 1); // +1 to account for the new branch

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAuthUser(user);
                // Fetch owner's main profile to pre-fill some info
                const ownerDocRef = doc(db, 'users', user.uid);
                const ownerSnap = await getDoc(ownerDocRef);
                if (ownerSnap.exists()) {
                    setOwnerProfile(ownerSnap.data());
                }

                // Fetch current branch count
                 const branchesQuery = query(collection(db, "shops"), where("ownerId", "==", user.uid));
                 const branchesSnapshot = await getDocs(branchesQuery);
                 setBranchCount(branchesSnapshot.size);

            } else {
                router.replace('/admin/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isLocked) {
            toast({
                title: "Upgrade Required",
                description: "You have reached your branch limit. Please upgrade your plan to add more.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const shopName = formData.get('shopName') as string;
        const address = formData.get('address') as string;
        const email = formData.get('email') as string;
        const gstNumber = formData.get('gstNumber') as string;

        if (!shopName || !businessType || !address || !authUser) {
             toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
             setLoading(false);
             return;
        }

        try {
            // 1. Create the new shop document in the 'shops' collection first.
            const newShopRef = doc(collection(db, "shops"));
            const newShopData = {
                id: newShopRef.id,
                ownerId: authUser.uid,
                ownerName: ownerProfile.name,
                shopName,
                businessType,
                address,
                email,
                gstNumber,
                status: 'active',
            };
            await setDoc(newShopRef, newShopData);
            
            // 2. Now that the shop exists and ownership is established,
            // add the owner as an employee in this new branch's subcollection.
            const ownerAsEmployeeData = {
                ...ownerProfile,
                uid: authUser.uid, // ensure the auth UID is set
                shopId: newShopRef.id,
                isProfileComplete: true,
                status: 'Active',
                role: 'Admin',
            };
            // Since this is the owner, we can use their UID as the doc ID for consistency.
            const ownerAsEmployeeRef = doc(db, 'shops', newShopRef.id, 'employees', authUser.uid);
            await setDoc(ownerAsEmployeeRef, ownerAsEmployeeData);

            toast({
                title: "Branch Created!",
                description: `${shopName} has been added to your account.`,
            });
            
            router.push('/admin');

        } catch (error) {
            console.error("Error creating new branch:", error);
            toast({ title: "Error", description: "Could not create the new branch. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="w-full max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin">
                    <Button variant="outline" size="icon" type="button">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="text-left">
                    <h1 className="text-3xl font-bold">Add New Branch</h1>
                    <p className="text-muted-foreground mt-1">
                        Enter the details for your new business location.
                    </p>
                </div>
            </div>
            
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="shopName">Branch / Shop Name *</Label>
                        <Input id="shopName" name="shopName" placeholder="e.g., JD Retail - Downtown" required />
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
                        <Label htmlFor="email">Branch Email Address</Label>
                        <Input id="email" name="email" type="email" placeholder="e.g., downtown@jdretail.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gstNumber">Branch GST Number (Optional)</Label>
                        <Input id="gstNumber" name="gstNumber" placeholder="e.g., 29ABCDE1234F1Z6" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Full Branch Address *</Label>
                    <Textarea id="address" name="address" placeholder="e.g., 456 Market Street, City, State, Pincode" required />
                </div>
            </div>
            <div className="flex justify-center pt-4">
                {isLocked ? (
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="submit" size="lg" className="w-full max-w-sm" disabled>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Create Branch
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                               <p>Upgrade your plan to add more branches.</p>
                               <Link href="/admin/settings?tab=subscription">
                                    <Button variant="link" size="sm" className="p-0 h-auto">View Plans</Button>
                                </Link>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    <Button type="submit" size="lg" className="w-full max-w-sm" disabled={loading}>
                        {loading && <Loader2 className="mr-2 animate-spin" />}
                        <Store className="mr-2 h-4 w-4" />
                        Create Branch
                    </Button>
                )}
            </div>
        </form>
      </div>
    </div>
  );
}
