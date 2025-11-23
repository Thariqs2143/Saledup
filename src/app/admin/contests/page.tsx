
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trophy, Edit, Trash2, Calendar as CalendarIcon, Hash, Award, CheckCircle, Clock } from "lucide-react";
import Link from 'next/link';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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

type Contest = {
    id: string;
    title: string;
    description: string;
    hashtag: string;
    prize: string;
    startDate: Timestamp;
    endDate: Timestamp;
    status: 'active' | 'upcoming' | 'completed';
    createdAt: Timestamp;
};

export default function AdminContestsPage() {
    const [contests, setContests] = useState<Contest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [hashtag, setHashtag] = useState('');
    const [prize, setPrize] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) setAuthUser(user);
            else router.push('/login');
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!authUser) return;
        const contestsQuery = query(collection(db, 'shops', authUser.uid, 'contests'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(contestsQuery, (snapshot) => {
            const now = new Date();
            const contestsList = snapshot.docs.map(doc => {
                const data = doc.data();
                let status: Contest['status'] = 'upcoming';
                if (data.startDate.toDate() <= now && data.endDate.toDate() >= now) {
                    status = 'active';
                } else if (data.endDate.toDate() < now) {
                    status = 'completed';
                }
                return { id: doc.id, ...data, status } as Contest;
            });
            setContests(contestsList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching contests: ", error);
            toast({ title: "Error", description: "Could not fetch contests.", variant: "destructive" });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [authUser, toast]);

    const handleCreateContest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authUser || !title || !description || !hashtag || !prize || !startDate || !endDate) {
            toast({ title: "Missing Fields", description: "Please fill out all required fields.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'shops', authUser.uid, 'contests'), {
                title,
                description,
                hashtag,
                prize,
                startDate,
                endDate,
                createdAt: serverTimestamp(),
            });
            toast({ title: "Contest Created!", description: "Your new contest is ready to go." });
            // Reset form
            setTitle(''); setDescription(''); setHashtag(''); setPrize(''); setStartDate(undefined); setEndDate(undefined);
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error creating contest: ", error);
            toast({ title: "Error", description: "Could not create the contest.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteContest = async (contestId: string) => {
        if (!authUser) return;
        try {
            await deleteDoc(doc(db, 'shops', authUser.uid, 'contests', contestId));
            toast({ title: "Contest Deleted", description: "The contest has been removed." });
        } catch (error) {
            toast({ title: "Error", description: "Could not delete the contest.", variant: "destructive" });
        }
    };

    const getStatusVariant = (status: Contest['status']) => {
        switch(status) {
            case 'active': return 'secondary';
            case 'completed': return 'outline';
            case 'upcoming': return 'default';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Social Contests</h1>
                    <p className="text-muted-foreground">Boost your marketing with user-generated content campaigns.</p>
                </div>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create New Contest
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>New Contest</DialogTitle>
                            <DialogDescription>
                                Set up the details for your new marketing contest.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateContest}>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Contest Title</Label>
                                    <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Fashion Icon of the Month" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Rules / Description</Label>
                                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="How customers can participate..." required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hashtag">Official Hashtag</Label>
                                    <Input id="hashtag" value={hashtag} onChange={e => setHashtag(e.target.value)} placeholder="e.g., #MyBoutiqueStyle" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="prize">Prize</Label>
                                    <Input id="prize" value={prize} onChange={e => setPrize(e.target.value)} placeholder="e.g., ₹5000 Gift Voucher" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
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
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Create Contest
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : contests.length === 0 ? (
                <Card className="text-center py-20">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                            <Trophy className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="mt-4">No Contests Yet</CardTitle>
                        <CardDescription>Click "Create New Contest" to launch your first marketing campaign.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contests.map(contest => (
                        <Card key={contest.id} className="flex flex-col border-2 border-border hover:border-primary transition-all">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg font-bold">{contest.title}</CardTitle>
                                    <Badge variant={getStatusVariant(contest.status)}>{contest.status}</Badge>
                                </div>
                                <CardDescription className="text-xs pt-1">
                                    Created {formatDistanceToNow(contest.createdAt.toDate(), { addSuffix: true })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <Hash className="h-4 w-4 text-muted-foreground"/>
                                    <span className="font-semibold text-primary">{contest.hashtag}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Award className="h-4 w-4 text-muted-foreground"/>
                                    <span>Prize: <span className="font-semibold">{contest.prize}</span></span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground"/>
                                    <span>
                                        {format(contest.startDate.toDate(), 'MMM d')} - {format(contest.endDate.toDate(), 'MMM d, yyyy')}
                                    </span>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t pt-4 flex justify-end gap-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete the "{contest.title}" contest. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteContest(contest.id)} className="bg-destructive hover:bg-destructive/90">
                                                Delete Contest
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button variant="outline" size="sm" disabled>
                                    <Edit className="h-4 w-4 mr-2"/> Edit
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
