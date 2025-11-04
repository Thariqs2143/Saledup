
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, CheckCircle2, XCircle, Loader2, ArrowLeft, Clock, Clock4 } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, format, parseISO } from 'date-fns';
import { useParams, useRouter } from "next/navigation";
import type { User } from "../../../employees/page";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';

type HistoryRecord = {
    id: string;
    checkInTime: Timestamp;
    checkOutTime?: Timestamp;
    status: 'On-time' | 'Late' | 'Absent' | 'Manual' | 'Half-day';
};

const HistoryList = ({ records, loading }: { records: HistoryRecord[]; loading: boolean; }) => (
  <div className="space-y-4">
    {loading ? (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
    ) : records.length > 0 ? (
        records.map(record => (
        <Card key={record.id} className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
            <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                {record.status === 'On-time' ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                ) : record.status === 'Manual' ? (
                    <Clock className="h-8 w-8 text-blue-500 shrink-0" />
                ) : record.status === 'Half-day' ? (
                    <Clock4 className="h-8 w-8 text-orange-500 shrink-0" />
                ) : (
                    <XCircle className="h-8 w-8 text-destructive shrink-0" />
                )}
                <div className="flex-1">
                <p className="font-semibold text-sm sm:text-base">{format(record.checkInTime.toDate(), 'eeee, MMM d')}</p>
                <div className="text-xs sm:text-sm text-muted-foreground flex flex-col sm:flex-row sm:gap-4">
                    <span>
                        Check In: {format(record.checkInTime.toDate(), 'p')}
                    </span>
                     <span>
                        {record.checkOutTime ? `Check Out: ${format(record.checkOutTime.toDate(), 'p')}` : 'Not checked out'}
                    </span>
                </div>
                </div>
            </div>
            <div className="text-right ml-4">
                <p className={`font-bold text-sm sm:text-base ${
                    record.status === 'On-time' ? 'text-green-600' 
                    : record.status === 'Manual' ? 'text-blue-600'
                    : record.status === 'Half-day' ? 'text-orange-600'
                    : 'text-destructive'
                }`}>
                    {record.status}
                </p>
            </div>
            </CardContent>
        </Card>
        ))
    ) : (
        <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                <p className="font-semibold">No Records Found</p>
                <p className="text-sm">This employee's attendance history for this period will appear here.</p>
            </CardContent>
        </Card>
    )}
  </div>
);

export default function EmployeeHistoryPage() {
    const params = useParams();
    const router = useRouter();
    const { employeeId } = params as { employeeId: string };
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [employee, setEmployee] = useState<User | null>(null);
    const [weeklyHistory, setWeeklyHistory] = useState<HistoryRecord[]>([]);
    const [monthlyHistory, setMonthlyHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

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
        if (!employeeId || !authUser) return;

        const fetchEmployee = async () => {
            const docRef = doc(db, 'shops', authUser.uid, 'employees', employeeId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setEmployee({ id: docSnap.id, ...docSnap.data() } as User);
            } else {
                router.replace('/admin/employees');
            }
        };
        fetchEmployee();
    }, [employeeId, router, authUser]);


    useEffect(() => {
        if (!employeeId || !authUser) return;
        
        setLoading(true);
        const attendanceRef = collection(db, 'shops', authUser.uid, 'attendance');
        const now = new Date();

        // Weekly query
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        const weeklyQuery = query(attendanceRef, 
            where('userId', '==', employeeId), 
            where('checkInTime', '>=', weekStart),
            where('checkInTime', '<=', weekEnd),
            orderBy('checkInTime', 'desc')
        );
        const unsubscribeWeek = onSnapshot(weeklyQuery, (snapshot) => {
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryRecord));
            setWeeklyHistory(records);
            setLoading(false);
        });

        // Monthly query
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const monthlyQuery = query(attendanceRef, 
            where('userId', '==', employeeId), 
            where('checkInTime', '>=', monthStart),
            where('checkInTime', '<=', monthEnd),
             orderBy('checkInTime', 'desc')
        );
        const unsubscribeMonth = onSnapshot(monthlyQuery, (snapshot) => {
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryRecord));
            setMonthlyHistory(records);
        });

        return () => {
            unsubscribeWeek();
            unsubscribeMonth();
        }

    }, [employeeId, authUser]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
         <Link href={`/admin/employees/${employeeId}`}>
            <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
            </Button>
        </Link>
        <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Attendance History for {employee ? employee.name : '...'}
            </h1>
            <p className="text-muted-foreground">Review past check-in and check-out records.</p>
        </div>
      </div>
      <Tabs defaultValue="week" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:max-w-xs">
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>
        <TabsContent value="week" className="mt-6">
          <HistoryList records={weeklyHistory} loading={loading} />
        </TabsContent>
        <TabsContent value="month" className="mt-6">
          <HistoryList records={monthlyHistory} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
