
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { CheckCircle, Expand, QrCode, Loader2, History, Download, X, UserPlus, Calendar as CalendarIcon, Save, Clock4, ShieldCheck, RefreshCw } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { doc, getDoc, addDoc, collection, onSnapshot, query, orderBy, Timestamp, where, getDocs, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { format, setHours, setMinutes, setSeconds } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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


const PermanentQrTab = () => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isGenerated, setIsGenerated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [shopName, setShopName] = useState('');
    const { toast } = useToast();

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAuthUser(user);
                 try {
                    const shopDocRef = doc(db, 'shops', user.uid);
                    const shopSnap = await getDoc(shopDocRef);
                    if (shopSnap.exists()) {
                        setShopName(shopSnap.data().shopName);
                        // Fetch the permanent QR if it exists
                         const qrHistoryRef = doc(db, 'shops', user.uid, 'qr-history', 'permanent-qr');
                         const qrSnap = await getDoc(qrHistoryRef);
                         if (qrSnap.exists()) {
                             setQrCodeUrl(qrSnap.data().qrCodeUrl);
                             setIsGenerated(true);
                         }
                    }
                } catch(e) {
                    console.error("Error fetching initial data", e);
                } finally {
                    setLoading(false);
                }
            }
        });
        return () => unsubscribe();
    }, []);
    
    const handleGenerate = async () => {
        if (!authUser || !shopName) {
            toast({
                title: "Error",
                description: "Shop information not found.",
                variant: "destructive"
            });
            return;
        }
        setLoading(true);

        const data = encodeURIComponent(`attendry-shop-qr;shopId=${authUser.uid};shopName=${shopName}`);
        const generatedUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${data}`;
        setQrCodeUrl(generatedUrl);
        setIsGenerated(true);
    
        try {
            await setDoc(doc(db, 'shops', authUser.uid, 'qr-history', 'permanent-qr'), {
                shopId: authUser.uid,
                generatedAt: Timestamp.now(),
                qrCodeUrl: generatedUrl
            }, { merge: true });
        } catch (error) {
            console.error("Error saving QR code to history:", error);
            toast({ title: "Error", description: "Could not save QR code history.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    const handleDownload = () => {
        if (!qrCodeUrl) return;
        fetch(qrCodeUrl)
          .then(response => response.blob())
          .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `shop-attendance-qr.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
          })
          .catch(console.error);
    };

    return (
        <Card className="w-full max-w-lg mx-auto transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
            <CardHeader>
            <CardTitle>Permanent QR Code</CardTitle>
            <CardDescription>
                This is your permanent attendance QR code for your shop. Print it and place it in your store for employees to scan.
            </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-8">
            {loading ? (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : isGenerated ? (
                <div className="flex flex-col items-center justify-center gap-4 transition-all animate-in fade-in-50 duration-500">
                    <div className="relative w-64 h-64 border p-2 rounded-lg bg-white">
                        {qrCodeUrl && <Image src={qrCodeUrl} alt="Generated QR Code" width={256} height={256} className="rounded-md"/>}
                    </div>
                </div>
            ) : (
                <p className="text-muted-foreground">Click the button below to generate your QR code.</p>
            )}
            </CardContent>
            <CardFooter className="flex-col gap-2 pt-6">
                {isGenerated ? (
                    <div className="w-full space-y-2">
                        <Button onClick={handleGenerate} className="w-full" disabled={loading}>
                            <QrCode className="mr-2 h-4 w-4"/>
                            Re-generate QR Code
                        </Button>
                        <Button variant="secondary" onClick={handleDownload} className="w-full">
                            <Download className="mr-2 h-4 w-4"/>
                            Download for Print
                        </Button>
                    </div>
                ) : (
                    <Button onClick={handleGenerate} className="w-full" disabled={loading}>
                        <QrCode className="mr-2 h-4 w-4"/>
                        Generate QR Code
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

const AdvancedQrTab = () => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [timeLeft, setTimeLeft] = useState(15);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [shopName, setShopName] = useState('');

    const generateDynamicQr = useCallback(() => {
        if (!authUser || !shopName) return;
        
        const timestamp = Date.now();
        const data = encodeURIComponent(`attendry-shop-qr;shopId=${authUser.uid};shopName=${shopName};ts=${timestamp}`);
        const generatedUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${data}`;
        setQrCodeUrl(generatedUrl);
        setTimeLeft(15);
    }, [authUser, shopName]);
    
     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAuthUser(user);
                const shopDocRef = doc(db, 'shops', user.uid);
                const shopSnap = await getDoc(shopDocRef);
                if (shopSnap.exists()) {
                    setShopName(shopSnap.data().shopName);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (authUser && shopName) {
            generateDynamicQr(); // Initial generation
            const interval = setInterval(generateDynamicQr, 15000);
            return () => clearInterval(interval);
        }
    }, [authUser, shopName, generateDynamicQr]);

    useEffect(() => {
        if (!timeLeft || !qrCodeUrl) return;
        const countdownInterval = setInterval(() => {
            setTimeLeft(prevTime => prevTime > 0 ? prevTime - 1 : 0);
        }, 1000);
        return () => clearInterval(countdownInterval);
    }, [timeLeft, qrCodeUrl]);

    return (
        <Card className="w-full max-w-lg mx-auto transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
            <CardHeader>
                <CardTitle>Advanced QR Code (Dynamic)</CardTitle>
                <CardDescription>This QR code automatically refreshes to prevent screenshot misuse. Display this on a tablet or screen in your store.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-8 gap-6">
                {qrCodeUrl ? (
                    <>
                        <div className="relative w-64 h-64 border p-2 rounded-lg bg-white">
                            <Image src={qrCodeUrl} alt="Dynamic QR Code" width={256} height={256} className="rounded-md"/>
                        </div>
                        <div className="w-full space-y-2 text-center">
                            <div className="flex items-center justify-center gap-2 font-semibold text-primary">
                                <RefreshCw className="h-4 w-4 animate-spin"/>
                                <span>Refreshes in {timeLeft}s</span>
                            </div>
                            <Progress value={(timeLeft / 15) * 100} className="w-full h-2" />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full">
                            <Expand className="mr-2 h-4 w-4"/>
                            Full Screen
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-screen h-screen max-w-full p-4 bg-white flex flex-col items-center justify-center gap-8">
                            <DialogHeader>
                            <DialogTitle className="sr-only">Full Screen QR Code</DialogTitle>
                        </DialogHeader>
                        {qrCodeUrl && <Image src={qrCodeUrl.replace('size=400x400', 'size=800x800')} alt="Full Screen QR Code" width={800} height={800} className="rounded-lg max-w-[90vw] max-h-[80vh] object-contain"/>}
                        <DialogClose asChild>
                            <Button size="lg" className="w-full max-w-xs">
                                <X className="mr-2 h-4 w-4"/>
                                Close
                            </Button>
                        </DialogClose>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    );
};

const ManualEntryTab = () => {
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
            toast({
                title: "Missing Fields",
                description: "Please select an employee, date, status, and check-in time.",
                variant: "destructive",
            });
            setLoading(false);
            return;
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
                userId: selectedEmployeeId,
                userName: employee?.name || 'Unknown',
                shopId: authUser.uid,
                checkInTime: Timestamp.fromDate(finalCheckIn),
                checkOutTime: finalCheckOut ? Timestamp.fromDate(finalCheckOut) : null,
                status: status,
                reason: reason,
            });

            toast({
                title: "Record Added!",
                description: `Attendance for ${employee?.name} has been saved.`,
            });
            
            setSelectedEmployeeId('');
            setDate(new Date());
            setCheckInTime('');
            setCheckOutTime('');
            setStatus('Manual');
            setReason('');

        } catch (error) {
            console.error("Error adding attendance record:", error);
            toast({
                title: "Error",
                description: "Could not save the record. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Card className="w-full max-w-2xl mx-auto transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary" id="manual-entry">
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Create New Record</CardTitle>
                    <CardDescription>Fill in the details below to create a new attendance entry for your shop.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {employees.length > 0 ? (
                            <div className="space-y-2">
                            <Label htmlFor="employee">Employee *</Label>
                            <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId} required>
                                <SelectTrigger id="employee">
                                    <SelectValue placeholder="Select an employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id!}>{emp.name} ({emp.employeeId})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="text-center p-4 border rounded-md">
                            <p className="text-muted-foreground text-sm">No active employees found in your shop.</p>
                            <Link href="/admin/employees">
                                <Button variant="link" className="mt-2">
                                    <UserPlus className="mr-2"/>
                                    Manage Employees
                                </Button>
                            </Link>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                            <Label htmlFor="date">Date *</Label>
                            <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="checkInTime">Check-in Time *</Label>
                            <Input id="checkInTime" type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} required />
                        </div>
                            <div className="space-y-2">
                            <Label htmlFor="checkOutTime">Check-out Time</Label>
                            <Input id="checkOutTime" type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} />
                        </div>
                    </div>

                        <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
                        <Select onValueChange={(value) => setStatus(value as any)} value={status} required>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Manual">Manual</SelectItem>
                                <SelectItem value="On-time">On-time</SelectItem>
                                <SelectItem value="Late">Late</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem>
                                <SelectItem value="Half-day">Half-day</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason (Optional)</Label>
                        <Textarea id="reason" placeholder="e.g., Forgot phone, technical issue, etc." value={reason} onChange={e => setReason(e.target.value)}/>
                    </div>
                </CardContent>
                <CardContent className="flex justify-center border-t pt-6">
                        <Button type="submit" size="lg" className="w-full max-w-sm" disabled={loading || employees.length === 0}>
                        {loading && <Loader2 className="mr-2 animate-spin" />}
                        <Save className="mr-2"/>
                        Save Record
                    </Button>
                </CardContent>
                </form>
        </Card>
    );
};

const QrCodeTabs = () => {
    return (
         <Tabs defaultValue="permanent" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="permanent" className="flex items-center gap-2">
                    <QrCode className="h-4 w-4"/> Permanent
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4"/> Advanced
                </TabsTrigger>
            </TabsList>
            <TabsContent value="permanent" className="mt-6">
                <PermanentQrTab />
            </TabsContent>
            <TabsContent value="advanced" className="mt-6">
                <AdvancedQrTab />
            </TabsContent>
        </Tabs>
    );
}


export default function GenerateAndEntryPage() {
  return (
    <div className="flex flex-col gap-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">QR & Manual Entry</h1>
        <p className="text-muted-foreground">Generate QR codes for attendance or manually enter records.</p>
       </div>
        <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:max-w-md">
                <TabsTrigger value="generate">QR Code</TabsTrigger>
                <TabsTrigger value="manual" id="manual-entry-trigger">Manual Entry</TabsTrigger>
            </TabsList>
            <TabsContent value="generate" className="mt-6">
                <QrCodeTabs />
            </TabsContent>
            <TabsContent value="manual" className="mt-6">
                <ManualEntryTab />
            </TabsContent>
        </Tabs>
    </div>
  );
}

    

    
