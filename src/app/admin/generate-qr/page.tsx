
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { CheckCircle, Expand, QrCode, Loader2, History, Download, X, UserPlus, Calendar as CalendarIcon, Save, Clock4, ShieldCheck, RefreshCw, Activity } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { doc, getDoc, addDoc, collection, onSnapshot, query, orderBy, Timestamp, where, getDocs, setDoc, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { format, setHours, setMinutes, setSeconds, formatDistanceToNow } from 'date-fns';
import type { User } from '../employees/page';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';


type ActivityRecord = {
    id: string;
    userId: string;
    userName: string;
    checkInTime: Timestamp;
    checkOutTime?: Timestamp;
    status: 'On-time' | 'Late' | 'Manual' | 'Absent' | 'Half-day';
    userFallback?: string;
    userImageUrl?: string;
};

type QrHistoryRecord = {
    id: string;
    generatedAt: Timestamp;
    qrCodeUrl: string;
    type: 'permanent' | 'dynamic';
};


const QrGeneratorCard = () => {
    const { toast } = useToast();
    const [qrMode, setQrMode] = useState<'permanent' | 'dynamic'>('permanent');
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [shopName, setShopName] = useState('');
    
    // State for permanent QR
    const [permanentQrUrl, setPermanentQrUrl] = useState('');
    const [isPermanentGenerated, setIsPermanentGenerated] = useState(false);
    const [permanentLoading, setPermanentLoading] = useState(true);

    // State for dynamic QR
    const [dynamicQrUrl, setDynamicQrUrl] = useState('');
    const [timeLeft, setTimeLeft] = useState(15);
    
    // Fetch initial data
     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAuthUser(user);
                 try {
                    const shopDocRef = doc(db, 'shops', user.uid);
                    const shopSnap = await getDoc(shopDocRef);
                    if (shopSnap.exists()) {
                        setShopName(shopSnap.data().shopName);
                         const qrHistoryRef = doc(db, 'shops', user.uid, 'qr-history', 'permanent-qr');
                         const qrSnap = await getDoc(qrHistoryRef);
                         if (qrSnap.exists()) {
                             setPermanentQrUrl(qrSnap.data().qrCodeUrl);
                             setIsPermanentGenerated(true);
                         }
                    }
                } catch(e) {
                    console.error("Error fetching initial data", e);
                } finally {
                    setPermanentLoading(false);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // --- PERMANENT QR LOGIC ---
    const handleGeneratePermanent = async () => {
        if (!authUser || !shopName) return;
        setPermanentLoading(true);
        const data = encodeURIComponent(`attendry-shop-qr;shopId=${authUser.uid};shopName=${shopName}`);
        const generatedUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${data}`;
        setPermanentQrUrl(generatedUrl);
        setIsPermanentGenerated(true);
        try {
            await setDoc(doc(db, 'shops', authUser.uid, 'qr-history', 'permanent-qr'), {
                shopId: authUser.uid, generatedAt: Timestamp.now(), qrCodeUrl: generatedUrl, type: 'permanent'
            }, { merge: true });
        } catch (error) {
            toast({ title: "Error", description: "Could not save QR code history.", variant: "destructive" });
        } finally {
            setPermanentLoading(false);
        }
    };
     const handleDownloadPermanent = () => {
        if (!permanentQrUrl) return;
        fetch(permanentQrUrl).then(response => response.blob()).then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `shop-attendance-qr.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        }).catch(console.error);
    };
    
    // --- DYNAMIC QR LOGIC ---
     const generateDynamicQr = useCallback(async () => {
        if (!authUser || !shopName) return;
        const timestamp = Date.now();
        const data = encodeURIComponent(`attendry-shop-qr;shopId=${authUser.uid};shopName=${shopName};ts=${timestamp}`);
        const generatedUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${data}`;
        setDynamicQrUrl(generatedUrl);
        setTimeLeft(15);
        try {
             await addDoc(collection(db, 'shops', authUser.uid, 'qr-history'), {
                shopId: authUser.uid, generatedAt: Timestamp.fromMillis(timestamp), qrCodeUrl: generatedUrl, type: 'dynamic'
            });
        } catch(error) {
            console.error("Error saving dynamic QR to history:", error);
        }
    }, [authUser, shopName]);

    // Effect for dynamic QR generation interval
    useEffect(() => {
        let genInterval: NodeJS.Timeout | undefined;
        if (qrMode === 'dynamic' && authUser && shopName) {
            generateDynamicQr(); // Initial generation
            genInterval = setInterval(generateDynamicQr, 15000);
        }
        return () => clearInterval(genInterval);
    }, [qrMode, authUser, shopName, generateDynamicQr]);

    // Effect for dynamic QR countdown timer
    useEffect(() => {
        if (qrMode !== 'dynamic' || !timeLeft || !dynamicQrUrl) return;
        const countdownInterval = setInterval(() => {
            setTimeLeft(prevTime => prevTime > 0 ? prevTime - 1 : 0);
        }, 1000);
        return () => clearInterval(countdownInterval);
    }, [qrMode, timeLeft, dynamicQrUrl]);


    const renderQrContent = () => {
        if (qrMode === 'permanent') {
            return (
                <>
                    <CardContent className="flex items-center justify-center p-8">
                        {permanentLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            : isPermanentGenerated ? (
                                <div className="flex flex-col items-center justify-center gap-4 transition-all animate-in fade-in-50 duration-500">
                                    <div className="relative w-64 h-64 border p-2 rounded-lg bg-white">
                                        {permanentQrUrl && <Image src={permanentQrUrl} alt="Generated QR Code" width={256} height={256} className="rounded-md"/>}
                                    </div>
                                </div>
                            ) : <p className="text-muted-foreground">Click the button below to generate your QR code.</p>
                        }
                    </CardContent>
                    <CardFooter className="flex-col gap-2 pt-6">
                        <Button onClick={handleGeneratePermanent} className="w-full" disabled={permanentLoading}>{isPermanentGenerated ? 'Re-generate QR Code' : 'Generate QR Code'}</Button>
                        {isPermanentGenerated && <Button variant="secondary" onClick={handleDownloadPermanent} className="w-full"><Download className="mr-2 h-4 w-4"/>Download for Print</Button>}
                    </CardFooter>
                </>
            )
        }
        
        if (qrMode === 'dynamic') {
             return (
                <>
                    <CardContent className="flex flex-col items-center justify-center p-8 gap-6">
                        {dynamicQrUrl ? (
                            <>
                                <div className="relative w-64 h-64 border p-2 rounded-lg bg-white">
                                    <Image src={dynamicQrUrl} alt="Dynamic QR Code" width={256} height={256} className="rounded-md"/>
                                </div>
                                <div className="w-full space-y-2 text-center">
                                    <div className="flex items-center justify-center gap-2 font-semibold text-primary"><RefreshCw className="h-4 w-4 animate-spin"/><span>Refreshes in {timeLeft}s</span></div>
                                    <Progress value={(timeLeft / 15) * 100} className="w-full h-2" />
                                </div>
                            </>
                        ) : <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                    </CardContent>
                    <CardFooter>
                        <Dialog>
                            <DialogTrigger asChild><Button className="w-full"><Expand className="mr-2 h-4 w-4"/>Full Screen</Button></DialogTrigger>
                            <DialogContent className="w-screen h-screen max-w-full p-4 bg-white flex flex-col items-center justify-center gap-8">
                                <DialogHeader><DialogTitle className="sr-only">Full Screen QR Code</DialogTitle></DialogHeader>
                                {dynamicQrUrl && <Image src={dynamicQrUrl.replace('size=400x400', 'size=800x800')} alt="Full Screen QR Code" width={800} height={800} className="rounded-lg max-w-[90vw] max-h-[80vh] object-contain"/>}
                                <DialogClose asChild><Button size="lg" className="w-full max-w-xs"><X className="mr-2 h-4 w-4"/>Close</Button></DialogClose>
                            </DialogContent>
                        </Dialog>
                    </CardFooter>
                </>
             )
        }
    }


    return (
        <Card className="w-full transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
            <CardHeader className="relative">
                <CardTitle>QR Code Generator</CardTitle>
                <div className="absolute top-4 right-4 hidden md:flex items-center space-x-2">
                    <Switch id="qr-mode-switch-desktop" checked={qrMode === 'dynamic'} onCheckedChange={(checked) => setQrMode(checked ? 'dynamic' : 'permanent')}/>
                    <Label htmlFor="qr-mode-switch-desktop" className={cn("font-semibold", qrMode === 'dynamic' && 'text-primary')}>
                        Dynamic QR
                    </Label>
                </div>
            </CardHeader>
            <CardContent>
                <CardDescription>
                    {qrMode === 'permanent' ? 'Print and place this in your store for employees.' : 'This refreshes to prevent misuse. Display on a tablet.'}
                </CardDescription>
                <div className="mt-4 flex justify-center md:hidden items-center space-x-2">
                    <Switch id="qr-mode-switch-mobile" checked={qrMode === 'dynamic'} onCheckedChange={(checked) => setQrMode(checked ? 'dynamic' : 'permanent')}/>
                    <Label htmlFor="qr-mode-switch-mobile" className={cn("font-semibold", qrMode === 'dynamic' && 'text-primary')}>
                        Use Dynamic QR
                    </Label>
                </div>
            </CardContent>
            {renderQrContent()}
        </Card>
    )
}


const ManualEntry = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<User[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [checkInTime, setCheckInTime] = useState('');
    const [checkOutTime, setCheckOutTime] = useState('');
    const [status, setStatus] = useState<'On-time' | 'Late' | 'Absent' | 'Manual' | 'Half-day'>('Manual');
    const [reason, setReason] = useState('');
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if(user) {
                setAuthUser(user);
                const fetchEmployees = async () => {
                    const employeesCollectionRef = collection(db, 'shops', user.uid, 'employees');
                    const q = query(employeesCollectionRef, where('status', '==', 'Active'));
                    const querySnapshot = await getDocs(q);
                    const employeeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                    setEmployees(employeeList);
                };
                fetchEmployees();
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);

        if (!selectedEmployeeId || !date || !checkInTime || !status || !authUser) {
            toast({ title: "Missing Fields", description: "Please select an employee, date, status, and check-in time.", variant: "destructive" }); setLoading(false); return;
        }

        try {
            const [checkInHours, checkInMinutes] = checkInTime.split(':').map(Number);
            let finalCheckIn = setSeconds(setMinutes(setHours(date, checkInHours), checkInMinutes), 0);
            let finalCheckOut = null;
            if (checkOutTime) {
                const [checkOutHours, checkOutMinutes] = checkOutTime.split(':').map(Number);
                finalCheckOut = setSeconds(setMinutes(setHours(date, checkOutHours), checkOutMinutes), 0);
            }
            const employee = employees.find(e => e.id === selectedEmployeeId);

            await addDoc(collection(db, 'shops', authUser.uid, 'attendance'), {
                userId: selectedEmployeeId, userName: employee?.name || 'Unknown', shopId: authUser.uid,
                checkInTime: Timestamp.fromDate(finalCheckIn), checkOutTime: finalCheckOut ? Timestamp.fromDate(finalCheckOut) : null,
                status: status, reason: reason,
            });

            toast({ title: "Record Added!", description: `Attendance for ${employee?.name} has been saved.` });
            setSelectedEmployeeId(''); setDate(new Date()); setCheckInTime(''); setCheckOutTime(''); setStatus('Manual'); setReason('');
        } catch (error) {
            toast({ title: "Error", description: "Could not save the record. Please try again.", variant: "destructive" });
        } finally { setLoading(false); }
    };
    
    return (
        <Dialog>
            <Card className="w-full transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
                <CardHeader>
                    <CardTitle>Manual Attendance Entry</CardTitle>
                    <CardDescription>If a QR scan fails, you can create a record here.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-24">
                     <DialogTrigger asChild>
                        <Button className="w-full max-w-xs"><UserPlus className="mr-2"/>Create Record</Button>
                    </DialogTrigger>
                </CardContent>
            </Card>

            <DialogContent className="sm:max-w-[425px]">
                 <DialogHeader>
                    <DialogTitle>Manual Attendance</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {employees.length > 0 ? (
                        <div className="space-y-2">
                            <Label htmlFor="employee">Employee *</Label>
                            <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId} required>
                                <SelectTrigger id="employee"><SelectValue placeholder="Select an employee" /></SelectTrigger>
                                <SelectContent>{employees.map(emp => (<SelectItem key={emp.id} value={emp.id!}>{emp.name} ({emp.employeeId})</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="text-center p-4 border rounded-md">
                            <p className="text-muted-foreground text-sm">No active employees found.</p>
                            <Link href="/admin/employees"><Button variant="link" className="mt-2"><UserPlus className="mr-2"/>Manage Employees</Button></Link>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="checkInTime">Check-in *</Label><Input id="checkInTime" type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="checkOutTime">Check-out</Label><Input id="checkOutTime" type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} /></div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
                        <Select onValueChange={(value) => setStatus(value as any)} value={status} required>
                            <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Manual">Manual</SelectItem><SelectItem value="On-time">On-time</SelectItem><SelectItem value="Late">Late</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem><SelectItem value="Half-day">Half-day</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2"><Label htmlFor="reason">Reason (Optional)</Label><Textarea id="reason" placeholder="e.g., Forgot phone, technical issue, etc." value={reason} onChange={e => setReason(e.target.value)}/></div>

                     <DialogClose asChild>
                        <Button type="submit" className="w-full" disabled={loading || employees.length === 0}>
                            {loading && <Loader2 className="mr-2 animate-spin" />}<Save className="mr-2"/>Save Record
                        </Button>
                    </DialogClose>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const RecentActivity = () => {
    const [activities, setActivities] = useState<ActivityRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [allEmployees, setAllEmployees] = useState<User[]>([]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAuthUser(user);
                const employeesRef = collection(db, 'shops', user.uid, 'employees');
                const empSnapshot = await getDocs(employeesRef);
                const employeesData = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setAllEmployees(employeesData);
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!authUser) return;
        if (allEmployees.length === 0 && authUser) { setLoading(false); return; }
        setLoading(true);
        const attendanceRef = collection(db, 'shops', authUser.uid, 'attendance');
        const q = query(attendanceRef, orderBy('checkInTime', 'desc'), limit(5));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedActivities = snapshot.docs.map(doc => {
                const data = doc.data() as ActivityRecord;
                const employee = allEmployees.find(e => e.id === data.userId);
                return { ...data, id: doc.id, userFallback: employee?.fallback, userImageUrl: employee?.imageUrl };
            });
            setActivities(fetchedActivities);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [authUser, allEmployees]);

    return (
         <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Recent Activity</CardTitle><CardDescription>A live log of the most recent attendance scans.</CardDescription></CardHeader>
            <CardContent>
                {loading ? <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    : activities.length > 0 ? (
                        <div className="space-y-4">
                            {activities.map((item) => (
                                <div key={item.id} className="flex items-start gap-4">
                                    <Avatar className="h-9 w-9 border"><AvatarImage src={item.userImageUrl} /><AvatarFallback>{item.userFallback || '?'}</AvatarFallback></Avatar>
                                    <div className="flex-1 text-sm">
                                        <p><span className="font-semibold">{item.userName}</span>{item.checkOutTime ? ' checked out.' : ` checked in (${item.status}).`}</p>
                                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(item.checkOutTime?.toDate() || item.checkInTime.toDate(), { addSuffix: true })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">No attendance activity yet.</p>
                }
            </CardContent>
        </Card>
    )
}

const QrHistory = () => {
    const [history, setHistory] = useState<QrHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => { if (user) setAuthUser(user); });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!authUser) return;
        setLoading(true);
        const historyRef = collection(db, 'shops', authUser.uid, 'qr-history');
        const q = query(historyRef, orderBy('generatedAt', 'desc'), limit(5));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QrHistoryRecord));
            setHistory(fetchedHistory);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [authUser]);

    return (
        <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Generation History</CardTitle><CardDescription>A log of the most recently generated QR codes.</CardDescription></CardHeader>
            <CardContent>
                {loading ? <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    : history.length > 0 ? (
                        <div className="space-y-3">
                            {history.map(item => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2"><QrCode className="h-4 w-4 text-muted-foreground" /><span className="font-semibold capitalize">{item.type}</span></div>
                                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(item.generatedAt.toDate(), { addSuffix: true })}</p>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">No QR codes generated yet.</p>
                }
            </CardContent>
        </Card>
    );
};


export default function GenerateAndEntryPage() {
  return (
    <div className="flex flex-col gap-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">QR &amp; Manual Entry</h1>
        <p className="text-muted-foreground">Generate QR codes for attendance or manually enter records.</p>
       </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <QrGeneratorCard />
            </div>
            <div className="space-y-8 lg:col-span-1">
                <ManualEntry />
                <RecentActivity />
                <QrHistory />
            </div>
        </div>
    </div>
  );
}
