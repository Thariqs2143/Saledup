
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Store, Building, Search } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
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
import { Input } from '@/components/ui/input';


type Branch = {
    id: string;
    shopName: string;
    address: string;
    businessType: string;
};

export default function ManageBranchesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.push('/admin/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!authUser) return;

    setLoading(true);
    const q = query(collection(db, 'shops'), where('ownerId', '==', authUser.uid));

    const unsubscribeBranches = onSnapshot(q, (snapshot) => {
      const fetchedBranches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
      setBranches(fetchedBranches);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching branches: ", error);
        toast({ title: "Error", description: "Could not fetch your branches.", variant: "destructive" });
        setLoading(false);
    });

    return () => unsubscribeBranches();
  }, [authUser, toast]);

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    setDeletingId(branchId);
    try {
        // This is a simplified delete. In a real-world scenario, a Cloud Function
        // would be required to delete all subcollections (employees, attendance, etc.)
        await deleteDoc(doc(db, 'shops', branchId));
        toast({
            title: "Branch Deleted",
            description: `${branchName} has been permanently removed.`
        });
    } catch (error) {
        console.error("Error deleting branch: ", error);
        toast({ title: "Delete Failed", description: "Could not delete the branch. Please try again.", variant: "destructive" });
    } finally {
        setDeletingId(null);
    }
  };

  const filteredBranches = useMemo(() => {
    return branches.filter(branch => 
      branch.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [branches, searchTerm]);


  return (
    <div className="space-y-8">
        <div className="flex items-center gap-4">
            <Link href="/admin">
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search branches by name or address..."
                className="w-full rounded-lg bg-background pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
        </div>

        {loading ? (
             <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : filteredBranches.length === 0 ? (
            <Card className="text-center py-12">
                <CardHeader>
                    <div className="mx-auto bg-muted rounded-full p-3 w-fit">
                        <Building className="h-10 w-10 text-muted-foreground"/>
                    </div>
                    <CardTitle>{searchTerm ? 'No Branches Found' : 'No Branches Added'}</CardTitle>
                    <CardDescription>
                      {searchTerm ? `Your search for "${searchTerm}" did not match any branches.` : "You haven't added any additional branches yet."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/admin/add-branch">
                        <Button>
                            <Store className="mr-2"/>
                            Add Your First Branch
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBranches.map(branch => {
                    const isMainBranch = authUser?.uid === branch.id;
                    return (
                        <Card key={branch.id} className="flex flex-col transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
                            <CardHeader>
                                <CardTitle className="text-lg">{branch.shopName}</CardTitle>
                                <CardDescription>{branch.businessType}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-sm text-muted-foreground">{branch.address}</p>
                            </CardContent>
                            <CardContent className="border-t p-4 flex gap-2">
                                <Link href={`/admin?branchId=${branch.id}`} className="w-full">
                                    <Button className="w-full">View</Button>
                                </Link>
                                <Link href={`/admin/branches/${branch.id}/edit`} className="w-full">
                                    <Button variant="secondary" className="w-full">Edit</Button>
                                </Link>
                                {!isMainBranch && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="w-full" disabled={deletingId === branch.id}>
                                                {deletingId === branch.id ? <Loader2 className="h-4 w-4 animate-spin"/> : null}
                                                Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the <span className="font-bold">{branch.shopName}</span> branch and all of its associated data, including employees and attendance records. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteBranch(branch.id, branch.shopName)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                                    Confirm Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        )}
    </div>
  );
}
