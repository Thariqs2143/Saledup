
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Send, CalendarOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, query, where, onSnapshot, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import type { User as AppUser } from '@/app/admin/employees/page';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

const leaveFormSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date().optional(),
  }),
  isPartialDay: z.boolean().default(false),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().min(10, { message: "Reason must be at least 10 characters." }).max(200, { message: "Reason cannot exceed 200 characters." }),
}).refine(data => {
    if (data.isPartialDay) {
        return !!data.startTime && !!data.endTime;
    }
    return true;
}, {
    message: "Start and end times are required for partial day leave.",
    path: ["startTime"], // You can point this to a more appropriate field if you like
});


type LeaveFormValues = z.infer<typeof leaveFormSchema>;

export type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
};

export default function LeavePage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      reason: '',
      isPartialDay: false,
    },
  });

  const isPartialDay = form.watch('isPartialDay');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
       if (user && user.phoneNumber) {
        setAuthUser(user);
        const phoneLookupRef = doc(db, "employee_phone_to_shop_lookup", user.phoneNumber);
        const phoneLookupSnap = await getDoc(phoneLookupRef);
        if (phoneLookupSnap.exists()) {
          const { shopId, employeeDocId } = phoneLookupSnap.data();
          const employeeDocRef = doc(db, "shops", shopId, "employees", employeeDocId);
          const employeeDocSnap = await getDoc(employeeDocRef);
          if (employeeDocSnap.exists()) {
            setUserProfile({ id: employeeDocSnap.id, ...employeeDocSnap.data() } as AppUser);
          }
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userProfile?.id || !userProfile?.shopId) return;

    setLoadingHistory(true);
    const q = query(
      collection(db, 'shops', userProfile.shopId, 'leaveRequests'),
      where('userId', '==', userProfile.id),
      orderBy('requestedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
      setLeaveHistory(history);
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const onSubmit = async (data: LeaveFormValues) => {
    if (!userProfile || !userProfile.shopId || !userProfile.id) {
      toast({ title: "Error", description: "You must be logged in to submit a request.", variant: "destructive" });
      return;
    }
    
    // If it's a partial day, the end date is the same as the start date
    const endDate = data.isPartialDay ? data.dateRange.from : data.dateRange.to;
    if (!endDate) {
         toast({ title: "Error", description: "Please select an end date for multi-day leave.", variant: "destructive" });
         return;
    }

    try {
      await addDoc(collection(db, 'shops', userProfile.shopId, 'leaveRequests'), {
        userId: userProfile.id,
        userName: userProfile.name,
        shopId: userProfile.shopId,
        startDate: format(data.dateRange.from, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        startTime: data.isPartialDay ? data.startTime : null,
        endTime: data.isPartialDay ? data.endTime : null,
        reason: data.reason,
        status: 'pending',
        requestedAt: Timestamp.now(),
      });
      toast({
        title: "Request Submitted!",
        description: "Your leave request has been sent for approval.",
      });
      form.reset();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast({
        title: "Submission Failed",
        description: "Could not submit your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved': return 'secondary';
      case 'denied': return 'destructive';
      case 'pending':
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leave of Absence</h1>
        <p className="text-muted-foreground">Request time off and view your request history.</p>
      </div>

      <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
        <CardHeader>
          <CardTitle>Submit a New Request</CardTitle>
          <CardDescription>Select the dates and provide a reason for your absence.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="isPartialDay"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">Request for a few hours?</FormLabel>
                            <FormDescription>
                                Enable this for partial-day leave requests.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Leave Date(s) *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value?.from && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value?.from ? (
                              isPartialDay || !field.value.to ? (
                                format(field.value.from, "LLL dd, y")
                              ) : (
                                <>
                                  {format(field.value.from, "LLL dd, y")} -{" "}
                                  {format(field.value.to, "LLL dd, y")}
                                </>
                              )
                            ) : (
                              <span>Pick a date range</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode={isPartialDay ? 'single' : 'range'}
                          defaultMonth={field.value?.from}
                          selected={isPartialDay ? field.value?.from : { from: field.value?.from, to: field.value?.to }}
                          onSelect={isPartialDay ? (day) => field.onChange({from: day, to: day}) : field.onChange}
                          numberOfMonths={isPartialDay ? 1 : 2}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isPartialDay && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in-50">
                     <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Time *</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>End Time *</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Leave *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide a brief reason for your leave request (e.g., family event, vacation, etc.)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-center">
                 <Button type="submit" size="lg" className="w-full max-w-sm" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2"/>}
                    Submit Request
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>The status of your past leave requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : leaveHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-50"/>
              <p>You haven't submitted any leave requests yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
                {leaveHistory.map(req => (
                    <div key={req.id} className="p-3 rounded-lg border bg-muted/50 flex justify-between items-center">
                        <div>
                             <p className="font-semibold">
                                {req.startTime && req.endTime
                                    ? `${format(new Date(req.startDate), 'MMM d, yyyy')} from ${req.startTime} to ${req.endTime}`
                                    : `${format(new Date(req.startDate), 'MMM d')} - ${format(new Date(req.endDate), 'MMM d, yyyy')}`}
                            </p>
                            <p className="text-xs text-muted-foreground">{req.reason}</p>
                        </div>
                        <Badge variant={getStatusVariant(req.status)}>{req.status}</Badge>
                    </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
