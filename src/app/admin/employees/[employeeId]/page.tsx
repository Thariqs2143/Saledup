
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import type { User } from '../page';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { differenceInMonths, differenceInYears } from 'date-fns';
import { ArrowLeft, Trash2, Loader2, History, Save, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, deleteDoc, updateDoc, writeBatch, collection, getDocs, where, query } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type Branch = {
    id: string;
    shopName: string;
};

const calculateTenure = (joinDate: string) => {
    if (!joinDate) return 'N/A';
    const startDate = new Date(joinDate);
    const endDate = new Date();
    
    const years = differenceInYears(endDate, startDate);
    const months = differenceInMonths(endDate, startDate) % 12;

    if (years === 0 && months === 0) {
        return 'New Joiner';
    }

    let tenureString = '';
    if (years > 0) {
        tenureString += `${years} year${years > 1 ? 's' : ''}`;
    }
    if (months > 0) {
        if (tenureString.length > 0) tenureString += ', ';
        tenureString += `${months} month${months > 1 ? 's' : ''}`;
    }
    
    return tenureString || 'Less than a month';
};

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [employee, setEmployee] = useState<User | null>(null);
  const [editableEmployee, setEditableEmployee] = useState<Partial<User>>({});
  const [tenure, setTenure] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const { employeeId } = params as { employeeId: string };
  const branchId = searchParams.get('branchId');
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        
        const fetchBranches = async () => {
            const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            const fetchedBranches = querySnapshot.docs
                .map(doc => ({ id: doc.id, shopName: doc.data().shopName }))
                .filter(b => b.id !== branchId); // Exclude current branch
            setBranches(fetchedBranches);
        };
        fetchBranches();

      } else {
        router.push('/admin/login');
      }
    });
    return () => unsubscribe();
  }, [router, branchId]);
  
  useEffect(() => {
    
    if (!employeeId || !branchId) return;

    const fetchEmployee = async () => {
        setLoading(true);
        try {
            const userDocRef = doc(db, 'shops', branchId, 'employees', employeeId);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const fetchedEmployee = { id: docSnap.id, ...docSnap.data() } as User;
                 setEmployee(fetchedEmployee);
                 setEditableEmployee(fetchedEmployee);
                 setTenure(calculateTenure(fetchedEmployee.joinDate));
            } else {
                 toast({ title: "Error", description: "Employee not found in this branch.", variant: 'destructive' });
                 router.replace('/admin/employees');
            }
        } catch (error) {
            console.error("Error fetching employee:", error);
            toast({ title: "Error", description: "Failed to fetch employee details.", variant: 'destructive' });
            router.replace('/admin/employees');
        } finally {
            setLoading(false);
        }
    };
    
    fetchEmployee();
  }, [employeeId, branchId, router, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditableEmployee(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (!employee?.id || !branchId) return;
    setSaving(true);
    const userDocRef = doc(db, 'shops', branchId, 'employees', employee.id);
    
    try {
        await updateDoc(userDocRef, {
            name: editableEmployee.name,
            email: editableEmployee.email || '',
            role: editableEmployee.role,
            aadhaar: editableEmployee.aadhaar || '',
            baseSalary: Number(editableEmployee.baseSalary) || 0,
        });
        toast({
            title: "Employee Updated",
            description: `${editableEmployee.name}'s details have been updated.`,
        });
        setEmployee(prev => ({...prev!, ...editableEmployee}));
    } catch (error) {
        console.error("Error updating document: ", error);
        toast({
            title: "Update Failed",
            description: "Could not update employee details. Please try again.",
            variant: "destructive",
        });
    } finally {
        setSaving(false);
    }
  }


  const handleDeleteEmployee = async () => {
    if (!employee?.id || !branchId) return;
    setDeleting(true);
    
    try {
        const batch = writeBatch(db);
        const userDocRef = doc(db, 'shops', branchId, 'employees', employee.id);
        batch.delete(userDocRef);

        // Also delete the global phone lookup to free up the phone number
        if(employee.phone) {
            const phoneLookupRef = doc(db, 'employee_phone_to_shop_lookup', employee.phone);
            batch.delete(phoneLookupRef);
        }

        await batch.commit();

        toast({
            title: "Employee Deleted",
            description: `${employee.name} has been removed from the system.`,
        });
        router.push('/admin/employees');
    } catch (error) {
        console.error("Error deleting document: ", error);
        toast({
            title: "Delete Failed",
            description: "Could not delete the employee. Please try again.",
            variant: "destructive",
        });
    } finally {
        setDeleting(false);
    }
  }
  
  const handleTransferEmployee = async () => {
      if (!employee || !branchId || !selectedBranch || !employee.phone) {
           toast({ title: "Error", description: "Please select a destination branch.", variant: 'destructive'});
           return;
      }
      setTransferring(true);

      const sourceRef = doc(db, 'shops', branchId, 'employees', employee.id);
      const destinationCollectionRef = collection(db, 'shops', selectedBranch, 'employees');
      const phoneLookupRef = doc(db, 'employee_phone_to_shop_lookup', employee.phone);

      try {
        const batch = writeBatch(db);
        
        // 1. Create a new employee document in the destination branch
        const newEmployeeDocRef = doc(destinationCollectionRef);
        const newEmployeeData = { ...employee, shopId: selectedBranch, id: newEmployeeDocRef.id };
        delete newEmployeeData.id; // Firestore generates its own ID
        batch.set(newEmployeeDocRef, newEmployeeData);

        // 2. Update the phone lookup to point to the new shop and new doc ID
        batch.update(phoneLookupRef, { shopId: selectedBranch, employeeDocId: newEmployeeDocRef.id });

        // 3. Delete the original employee document
        batch.delete(sourceRef);

        await batch.commit();

        toast({ title: "Transfer Successful!", description: `${employee.name} has been moved to the new branch.`});
        router.push('/admin/employees');
        
      } catch (error) {
        console.error("Error transferring employee: ", error);
        toast({ title: "Transfer Failed", description: "Could not transfer employee. Please try again.", variant: 'destructive'});
      } finally {
        setTransferring(false);
      }
  }


  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading employee details...</p>
        </div>
    );
  }

  if (!employee) {
    return null; // Or some other placeholder
  }

  return (
    <div className="space-y-8">
        <div className="flex items-center gap-4">
            <Link href="/admin/employees">
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Employee Profile</h1>
                <p className="text-muted-foreground">Viewing details for {employee.name}.</p>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Link href={`/admin/employees/${employeeId}/history`} className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <History className="mr-2 h-4 w-4" />
                View History
              </Button>
            </Link>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <GitBranch className="mr-2 h-4 w-4"/>
                        Transfer Employee
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transfer Employee to another Branch</DialogTitle>
                        <DialogDescription>
                            Select a destination branch for {employee.name}. This will move their profile and future attendance records to the new branch.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="branch-select">Destination Branch</Label>
                        <Select onValueChange={setSelectedBranch}>
                            <SelectTrigger id="branch-select">
                                <SelectValue placeholder="Select a branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.shopName}</SelectItem>
                                ))}
                                {branches.length === 0 && <p className="p-4 text-sm text-muted-foreground">No other branches available.</p>}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleTransferEmployee} disabled={transferring || !selectedBranch}>
                            {transferring ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Confirm Transfer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        <Separator/>
        <Card className="w-full max-w-3xl mx-auto transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
            <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary">
                  <AvatarImage src={employee.imageUrl} alt={employee.name} />
                  <AvatarFallback>{employee.fallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl sm:text-2xl font-bold">{employee.name}</h2>
                    <p className="text-muted-foreground">{employee.employeeId}</p>
                    <p className="text-sm text-primary font-medium mt-1">Tenure: {tenure}</p>
                </div>
            </div>
            </CardContent>
        </Card>

      <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Update the employee's details below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={editableEmployee.name || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input id="employeeId" value={editableEmployee.employeeId || ''} readOnly disabled />
            </div>
             <div className="space-y-2">
              <Label htmlFor="role">Role / Designation</Label>
              <Input id="role" value={editableEmployee.role || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={editableEmployee.email || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={editableEmployee.phone || ''} readOnly disabled />
            </div>
             <div className="space-y-2">
              <Label htmlFor="aadhaar">Aadhaar Number</Label>
              <Input id="aadhaar" value={editableEmployee.aadhaar || ''} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="baseSalary">Base Monthly Salary (₹)</Label>
                <Input id="baseSalary" type="number" value={editableEmployee.baseSalary || ''} onChange={handleInputChange} />
             </div>
            <div className="space-y-2">
                <Label htmlFor="joinDate">Date Joined</Label>
                <Input id="joinDate" type="date" value={editableEmployee.joinDate || ''} readOnly disabled/>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 justify-start">
            <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
            </Button>
        </CardFooter>
      </Card>
      
      <Card className="border-destructive transition-all duration-300 ease-out hover:shadow-lg">
        <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>This action is irreversible. Please proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete Employee
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the employee's
                    account and remove all of their associated data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

    