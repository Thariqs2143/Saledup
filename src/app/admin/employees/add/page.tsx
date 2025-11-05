
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus, Loader2, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, addDoc, query, where, getDocs, doc, setDoc, writeBatch, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { onAuthStateChanged, type User as AuthUser } from "firebase/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { IndianFlagIcon } from "@/components/ui/indian-flag-icon";

type Branch = {
    id: string;
    shopName: string;
    ownerId: string;
};

export default function AddEmployeePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [openBranchSelector, setOpenBranchSelector] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAuthUser(user);
                
                // Fetch branches
                const branchesQuery = query(collection(db, "shops"), where("ownerId", "==", user.uid));
                const branchesSnapshot = await getDocs(branchesQuery);
                const fetchedBranches = branchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
                setBranches(fetchedBranches);
                if (fetchedBranches.length > 0) {
                    setSelectedBranch(fetchedBranches[0]);
                }
            } else {
                router.push('/admin/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleAddEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!authUser || !selectedBranch) {
             toast({ title: "Authentication or Branch Error", description: "You must be logged in and have a branch selected.", variant: "destructive" });
             return;
        }

        setLoading(true);
        const formData = new FormData(event.currentTarget);
        const name = formData.get('name') as string;
        const employeeId = formData.get('employeeId') as string;
        const role = formData.get('role') as string;
        const phone = formData.get('phone') as string;
        const baseSalary = formData.get('baseSalary') as string;
        
        if (!name || !phone || !role || !employeeId) {
            toast({
                title: "Error",
                description: "Please fill out all required fields.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }
        
        const fullPhoneNumber = `+91${phone}`;

        // Check if employee with this phone number already exists globally
        const phoneLookupRef = doc(db, 'employee_phone_to_shop_lookup', fullPhoneNumber);
        const phoneLookupSnap = await getDoc(phoneLookupRef);

        if (phoneLookupSnap.exists()) {
             toast({
                title: "Employee Exists",
                description: "An employee with this phone number is already registered in another shop.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        const newEmployeeInvitation = {
            name,
            phone: fullPhoneNumber,
            role,
            employeeId,
            status: 'Pending Onboarding',
            fallback: name.split(' ').map(n => n[0]).join(''),
            shopId: selectedBranch.id,
            points: 0,
            streak: 0,
            joinDate: new Date().toISOString().split('T')[0],
            baseSalary: Number(baseSalary) || 0,
        };

        try {
            const batch = writeBatch(db);

            // 1. Add employee to the selected shop's subcollection
            const newEmployeeDocRef = doc(collection(db, 'shops', selectedBranch.id, 'employees'));
            batch.set(newEmployeeDocRef, newEmployeeInvitation);

            // 2. Add to the phone number lookup table
            batch.set(phoneLookupRef, { shopId: selectedBranch.id, employeeDocId: newEmployeeDocRef.id });

            await batch.commit();

            toast({
                title: "Invitation Sent!",
                description: `${name} has been invited to join ${selectedBranch.shopName}. They need to log in to complete their profile.`,
            });
            router.push('/admin/employees');
        } catch (error) {
            console.error("Error adding employee invitation:", error);
            toast({
                title: "Error",
                description: "Could not create invitation. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-8">
             <div className="flex items-center gap-4">
                <Link href="/admin/employees">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Invite New Employee</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Enter the employee's details to invite them to join a shop.</p>
                </div>
            </div>
            <form onSubmit={handleAddEmployee} className="w-full max-w-2xl mx-auto space-y-8">
                <fieldset disabled={loading} className="group">
                    <div className="space-y-2">
                        <Label>Branch *</Label>
                         <Popover open={openBranchSelector} onOpenChange={setOpenBranchSelector}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openBranchSelector}
                                    className="w-full justify-between"
                                    disabled={branches.length === 0}
                                >
                                    {selectedBranch ? selectedBranch.shopName : "Select a branch..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                                <Command>
                                    <CommandInput placeholder="Search branch..." />
                                    <CommandEmpty>No branches found. <Link href="/admin/add-branch" className="text-primary underline">Add one now</Link>.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandList>
                                        {branches.map((branch) => (
                                            <CommandItem
                                                key={branch.id}
                                                value={branch.id}
                                                onSelect={(currentValue) => {
                                                    const branch = branches.find(b => b.id === currentValue);
                                                    setSelectedBranch(branch || null);
                                                    setOpenBranchSelector(false);
                                                }}
                                            >
                                                {branch.shopName}
                                            </CommandItem>
                                        ))}
                                        </CommandList>
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <fieldset disabled={!selectedBranch} className="group">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name *</Label>
                                <Input id="name" name="name" placeholder="e.g., John Doe" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="employeeId">Employee ID *</Label>
                                <Input id="employeeId" name="employeeId" placeholder="e.g., EMP-001" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role / Designation *</Label>
                                <Input id="role" name="role" placeholder="e.g., Cashier" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number *</Label>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-10 items-center rounded-md border border-input bg-transparent px-3">
                                        <IndianFlagIcon />
                                        <span className="ml-2 text-sm font-medium text-muted-foreground">+91</span>
                                    </div>
                                    <Input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="10-digit mobile number" required className="flex-1" pattern="\d{10}" title="Phone number must be 10 digits" maxLength={10} />
                                </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="baseSalary">Base Monthly Salary (₹)</Label>
                                <Input id="baseSalary" name="baseSalary" type="number" placeholder="e.g., 25000" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">The employee will use this phone number to log in and complete their profile by adding their Aadhaar number.</p>
                        <div className="flex justify-center mt-8">
                            <Button type="submit" size="lg" className="w-full max-w-xs" disabled={!selectedBranch || loading}>
                                {loading && <Loader2 className="mr-2 animate-spin" />}
                                <UserPlus className="mr-2"/>
                                Send Invitation
                            </Button>
                        </div>
                    </fieldset>
                </fieldset>
            </form>
        </div>
    );
}
