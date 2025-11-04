
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, CheckCircle2, XCircle, Loader2, Clock, Clock4 } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, Timestamp, getDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as AuthUser } from "firebase/auth";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, format } from 'date-fns';
import type { User as AppUser } from '@/app/admin/employees/page';
import { useRouter } from "next/navigation";

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
                <p className="text-sm">Your attendance history for this period will appear here.</p>
            </CardContent>
        </Card>
    )}
  </div>
);

export default function HistoryPage() {
    const router = useRouter();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [userProfile, setUserProfile] = useState<AppUser | null>(null);
    const [weeklyHistory, setWeeklyHistory] = useState<HistoryRecord[]>([]);
    const [monthlyHistory, setMonthlyHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user && user.phoneNumber) {
                setAuthUser(user);
                try {
                    const phoneLookupRef = doc(db, "employee_phone_to_shop_lookup", user.phoneNumber);
                    const phoneLookupSnap = await getDoc(phoneLookupRef);

                    if (phoneLookupSnap.exists()) {
                        const { shopId, employeeDocId } = phoneLookupSnap.data();
                        const employeeDocRef = doc(db, "shops", shopId, "employees", employeeDocId);
                        const employeeDocSnap = await getDoc(employeeDocRef);

                        if (employeeDocSnap.exists()) {
                             setUserProfile({ id: employeeDocSnap.id, ...employeeDocSnap.data() } as AppUser);
                        } else {
                            router.push('/employee/login');
                        }
                    } else {
                        router.push('/employee/login');
                    }
                } catch (e) {
                    console.error("Error fetching user profile:", e);
                    router.push('/employee/login');
                }
            } else {
                setLoading(false);
                router.push('/employee/login');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!userProfile?.id || !userProfile?.shopId) {
            setLoading(false);
            return;
        };
        
        setLoading(true);
        const attendanceRef = collection(db, 'shops', userProfile.shopId, 'attendance');
        const now = new Date();

        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        const weeklyQuery = query(attendanceRef, 
            where('userId', '==', userProfile.id), 
            where('checkInTime', '>=', weekStart),
            where('checkInTime', '<=', weekEnd),
            orderBy('checkInTime', 'desc')
        );
        const unsubscribeWeek = onSnapshot(weeklyQuery, (snapshot) => {
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryRecord));
            setWeeklyHistory(records);
            setLoading(false);
        }, () => setLoading(false));

        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const monthlyQuery = query(attendanceRef, 
            where('userId', '==', userProfile.id), 
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

    }, [userProfile]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance History</h1>
        <p className="text-muted-foreground">Review your past check-in and check-out records.</p>
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

    