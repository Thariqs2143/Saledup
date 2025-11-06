
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Trophy, LogOut, Save, Loader2, Bell, Edit, Building, Mail, Check, Crown, ArrowRight, CalendarDays, ShieldCheck, Gift, Upload, Copy, Share2, CheckCircle, Users, Briefcase, MapPin, Percent, Phone, User as UserIcon, Settings as SettingsIcon, PlusCircle, Trash2, Clock } from "lucide-react";
import { auth, db, requestForToken, functions } from "@/lib/firebase";
import { signOut, onAuthStateChanged, type User as AuthUser } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, Suspense } from "react";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, onSnapshot, addDoc, deleteDoc } from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { User as AppUser } from '@/app/admin/employees/page';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSubscription } from "@/context/SubscriptionContext";
import { Progress } from "@/components/ui/progress";
import { httpsCallable } from "firebase/functions";
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
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

// Types
export type Shift = {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
};

type DayHours = {
  startTime: string;
  endTime: string;
  isOpen: boolean;
};

type BusinessHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

type Settings = {
  businessHours: BusinessHours;
  lateGracePeriodMinutes: number;
  monthlyPaidLeave: number;
  enableEmployeeReminders: boolean;
  enableLateAlerts: boolean;
  qrCodeMode: 'permanent' | 'dynamic';
};

type ShopProfile = {
    ownerName: string;
    shopName: string;
    email?: string;
    businessType?: string;
    address?: string;
    gstNumber?: string;
    phone?: string;
}

type FullProfile = AppUser & ShopProfile;

declare global {
  interface Window {
    Razorpay: any;
  }
}


// Defaults
const defaultHours: BusinessHours = {
    monday: { startTime: '09:00', endTime: '17:00', isOpen: true },
    tuesday: { startTime: '09:00', endTime: '17:00', isOpen: true },
    wednesday: { startTime: '09:00', endTime: '17:00', isOpen: true },
    thursday: { startTime: '09:00', endTime: '17:00', isOpen: true },
    friday: { startTime: '09:00', endTime: '17:00', isOpen: true },
    saturday: { startTime: '10:00', endTime: '14:00', isOpen: false },
    sunday: { startTime: '10:00', endTime: '14:00', isOpen: false },
};

const defaultSettings: Settings = {
  businessHours: defaultHours,
  lateGracePeriodMinutes: 15,
  monthlyPaidLeave: 4,
  enableEmployeeReminders: true,
  enableLateAlerts: false,
  qrCodeMode: 'permanent',
};

const PricingPlans = ({ profile }: { profile: FullProfile | null }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'threeYearly'>('monthly');
  const [currency, setCurrency] = useState<'inr' | 'usd'>('inr');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [staffCount, setStaffCount] = useState(10);

  const allFeatures = [
    { name: 'QR Code Check-in/out', id: 'qr' },
    { name: 'Manual Attendance Entry', id: 'manual' },
    { name: 'Live Attendance Dashboard', id: 'dashboard' },
    { name: 'Easy Employee Onboarding', id: 'onboarding' },
    { name: 'Advanced Reports & Analytics', id: 'reports' },
    { name: 'Leave Management', id: 'leave' },
    { name: 'Priority Support', id: 'support' },
    { name: 'Multi-branch Dashboard', id: 'multi_branch' },
    { name: 'AI-powered Insights', id: 'ai' },
    { name: 'Custom Branding & Reports', id: 'custom_branding' },
    { name: 'API Access + Integrations', id: 'api' },
  ];

  const plans = [
    {
      id: 'trial',
      name: '14-Day Free Trial',
      price: {
        monthly: { inr: 0, usd: 0 },
        yearly: { inr: 0, usd: 0 },
        threeYearly: { inr: 0, usd: 0 },
      },
      plan_id: {
        monthly: { inr: 'dodo_trial_inr_monthly', usd: 'dodo_trial_usd_monthly' },
        yearly: { inr: 'dodo_trial_inr_yearly', usd: 'dodo_trial_usd_yearly' },
        threeYearly: { inr: 'dodo_trial_inr_3y', usd: 'dodo_trial_usd_3y' },
      },
      note: '',
      cta: 'Start Free Trial',
      employees: 'Up to 5 employees',
      branches: '1 Branch',
      maxEmployees: 5,
      features: new Set(['qr', 'manual', 'dashboard', 'onboarding']),
      highlight: 'Try our core features — absolutely free for 14 days.',
      accent: 'from-gray-500 to-gray-600 dark:from-gray-700 dark:to-gray-800'
    },
    {
      id: 'starter',
      name: 'Starter',
      price: {
        monthly: { inr: 49, usd: 0.99 },
        yearly: { inr: 490, usd: 9.9 },
        threeYearly: { inr: 1199, usd: 24.9 },
      },
      plan_id: {
        monthly: { inr: 'plan_starter_inr_monthly_v3', usd: 'plan_starter_usd_monthly_v3' },
        yearly: { inr: 'plan_starter_inr_yearly_v3', usd: 'plan_starter_usd_yearly_v3' },
        threeYearly: { inr: 'plan_starter_inr_3y_v3', usd: 'plan_starter_usd_3y_v3' },
      },
      note: '/ staff',
      cta: 'Choose Starter',
      employees: 'Up to 20 employees',
      branches: '1 Branch',
      maxEmployees: 20,
      features: new Set(['qr', 'manual', 'dashboard', 'onboarding']),
      highlight: 'For new & small businesses just getting started.',
      accent: 'from-blue-500 to-sky-500'
    },
    {
      id: 'growth',
      name: 'Growth',
      price: {
        monthly: { inr: 79, usd: 1.49 },
        yearly: { inr: 790, usd: 14.9 },
        threeYearly: { inr: 1899, usd: 35.9 },
      },
      plan_id: {
        monthly: { inr: 'plan_growth_inr_monthly_v3', usd: 'plan_growth_usd_monthly_v3' },
        yearly: { inr: 'plan_growth_inr_yearly_v3', usd: 'plan_growth_usd_yearly_v3' },
        threeYearly: { inr: 'plan_growth_inr_3y_v3', usd: 'plan_growth_usd_3y_v3' },
      },
      note: '/ staff',
      cta: 'Upgrade to Growth',
      employees: 'Up to 50 employees',
      branches: 'Up to 5 branches',
      maxEmployees: 50,
      features: new Set(['qr', 'manual', 'dashboard', 'onboarding', 'reports', 'leave', 'support', 'multi_branch']),
      isPopular: true,
      highlight: 'For growing businesses that need more control and scalability.',
      accent: 'from-primary to-blue-500'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: {
        monthly: { inr: 129, usd: 2.49 },
        yearly: { inr: 1290, usd: 24.9 },
        threeYearly: { inr: 2999, usd: 59.9 },
      },
       plan_id: {
        monthly: { inr: 'plan_pro_inr_monthly_v3', usd: 'plan_pro_usd_monthly_v3' },
        yearly: { inr: 'plan_pro_inr_yearly_v3', usd: 'plan_pro_usd_yearly_v3' },
        threeYearly: { inr: 'plan_pro_inr_3y_v3', usd: 'plan_pro_usd_3y_v3' },
      },
      note: '/ staff',
      cta: 'Upgrade to Pro',
      employees: 'Unlimited employees',
      branches: 'Unlimited branches',
      maxEmployees: Infinity,
      features: new Set(['qr', 'manual', 'dashboard', 'onboarding', 'reports', 'leave', 'support', 'multi_branch', 'ai', 'custom_branding', 'api']),
      highlight: 'For large organizations needing enterprise-grade power.',
      accent: 'from-emerald-500 to-teal-500'
    }
  ];

  const handlePayment = async (plan: typeof plans[0]) => {
    if (!profile || !profile.id) {
        toast({ title: "Error", description: "You must be logged in to subscribe.", variant: "destructive" });
        return;
    }
    
    const planId = plan.plan_id[billingCycle][currency];
    if (!planId) {
        toast({ title: "Error", description: "This plan is not available for purchase yet.", variant: "destructive" });
        return;
    }

    setLoadingPlan(plan.id);
    
    const options = {
      key: process.env.NEXT_PUBLIC_DODO_KEY_ID,
      subscription_id: planId,
      quantity: staffCount,
      name: "Attendry Subscription",
      description: `Billing for ${plan.name} - ${billingCycle} (${currency.toUpperCase()})`,
      image: "https://res.cloudinary.com/dnkghymx5/image/upload/v1721992194/logo-sm_scak0f.png",
      handler: async (response: any) => {
          try {
              const verifySubscription = httpsCallable(functions, 'verifySubscriptionPayment');
              await verifySubscription({
                  paymentId: response.dodo_payment_id,
                  subscriptionId: response.dodo_subscription_id,
                  signature: response.dodo_signature,
                  shopId: profile.id,
                  planName: plan.name,
              });

              toast({
                  title: "Subscription Activated!",
                  description: `You are now on the ${plan.name} plan.`,
              });
               router.refresh();
          } catch (error: any) {
              console.error("Verification failed:", error);
              toast({ title: "Verification Failed", description: error.message || "Could not verify your payment. Please contact support.", variant: "destructive" });
          } finally {
              setLoadingPlan(null);
          }
      },
      prefill: {
          name: profile.name,
          email: profile.email,
          contact: profile.phone,
      },
      theme: {
          color: "#0C2A6A"
      }
    };
    
    // This is a placeholder for the actual DodoPay call
    console.log("Initiating DodoPay with options:", options);
    setTimeout(() => {
        toast({ title: "Demo Flow", description: "Payment gateway would open here."});
        setLoadingPlan(null);
    }, 1500);
  }

  const currencySymbol = currency === 'inr' ? '₹' : '$';
  const cycleText = billingCycle === 'monthly' ? '/month' : billingCycle === 'yearly' ? '/year' : '/3-years';
  const CheckIcon = ({ className = 'w-5 h-5' }) => <Check className={cn("text-emerald-500", className)} />;
  const XMark = ({ className = 'w-5 h-5' }) => <X className={cn("text-gray-400 dark:text-gray-600", className)} />;


  return (
    <div className="max-w-7xl mx-auto py-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-background">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Flexible Plans for Every Team</h2>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">Choose your billing cycle and select the number of staff you need.</p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
                <span className={cn(currency === 'inr' ? 'text-primary' : 'text-gray-500 dark:text-gray-400')}>INR (₹)</span>
                 <Switch checked={currency === 'usd'} onCheckedChange={(checked) => setCurrency(checked ? 'usd' : 'inr')} />
                <span className={cn(currency === 'usd' ? 'text-primary' : 'text-gray-500 dark:text-gray-400')}>USD ($)</span>
            </div>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
             <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as any)} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="yearly">Yearly <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">Save 20%</Badge></TabsTrigger>
                    <TabsTrigger value="threeYearly">3-Year <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">Save 40%</Badge></TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
      </div>
      
       <Card className="mb-12">
          <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 space-y-2">
                      <Label htmlFor="staff-slider" className="text-lg font-semibold">How many staff members do you have?</Label>
                      <p className="text-sm text-muted-foreground">Slide to calculate your price. The slider is capped at 200 for Pro.</p>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                      <Slider
                          id="staff-slider"
                          value={[staffCount]}
                          onValueChange={(value) => setStaffCount(value[0])}
                          max={200}
                          min={1}
                          step={1}
                          className="w-full md:w-64"
                      />
                      <div className="flex h-10 w-24 items-center justify-center rounded-md border border-input bg-transparent px-3 text-lg font-bold">
                          {staffCount}
                      </div>
                  </div>
              </div>
          </CardContent>
      </Card>


      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-4 mb-14">
        {plans.map((p) => {
            const pricePerStaff = p.price[billingCycle][currency];
            const isWithinLimit = p.maxEmployees === Infinity || staffCount <= p.maxEmployees;
            const finalPrice = p.id === 'trial' ? 0 : pricePerStaff * staffCount;

            return (
              <div key={p.id} className={`relative rounded-2xl shadow-lg border-2 bg-white dark:bg-gray-800/50 hover:shadow-xl transition-transform hover:-translate-y-1 ${!isWithinLimit ? 'opacity-50' : ''} ${p.isPopular ? 'border-primary' : 'border-gray-200 dark:border-gray-700'}`}>
                {p.isPopular && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10"><div className="px-4 py-1 text-sm font-semibold rounded-full bg-primary text-primary-foreground shadow-md">Most Popular</div></div>}
                <div className={`absolute top-px left-px right-px h-1.5 rounded-t-2xl bg-gradient-to-r ${p.accent}`}></div>
                <div className="p-8 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{p.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 h-10">{p.highlight}</p>
                    </div>
                  </div>

                  <div className="mb-6 h-24">
                    <div className="flex items-baseline gap-x-2">
                        {p.id === 'trial' ? (
                            <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">{currencySymbol}0</span>
                        ): (
                            <>
                               <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">{currencySymbol}{finalPrice.toFixed(2)}</span>
                               <span className="text-sm text-gray-500 dark:text-gray-400">{cycleText}</span>
                            </>
                        )}
                    </div>
                     {p.id !== 'trial' && <p className="text-xs text-muted-foreground mt-1">(billed per employee)</p>}

                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">{p.employees} • {p.branches}</div>
                  </div>

                  <ul className="space-y-3 mb-8 text-sm flex-1">
                    {p.features.size > 0 && allFeatures.filter(f => p.features.has(f.id)).slice(0, 4).map((feature) => (
                        <li key={feature.id} className="flex items-center gap-x-3">
                            <CheckIcon className="w-5 h-5" />
                            <span>{feature.name}</span>
                        </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handlePayment(p)}
                    disabled={loadingPlan === p.id || p.id === 'trial' || !isWithinLimit}
                    className={`w-full mt-auto py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${p.accent} hover:opacity-90 transition-all shadow-md`}
                  >
                      {loadingPlan === p.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                      {!isWithinLimit ? 'Staff limit exceeded' : p.cta}
                  </Button>
                </div>
              </div>
            )
        })}
      </div>
      
       <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 dark:text-gray-200">Feature</th>
              {plans.map((p) => (
                <th key={p.id} className="px-6 py-4 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {allFeatures.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition">
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 w-64">{f.name}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-6 py-4 text-center">
                    {p.features.has(f.id) ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"><CheckIcon className="w-5 h-5" /></span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600"><XMark className="w-5 h-5" /></span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// Main Component
function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<FullProfile | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const defaultTab = searchParams.get('tab') || 'profile';
  const { planDetails } = useSubscription();
  const [employeeCount, setEmployeeCount] = useState(0);
  const [branchCount, setBranchCount] = useState(0);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('');
  const [newShiftEnd, setNewShiftEnd] = useState('');
  const [isAddingShift, setIsAddingShift] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
            router.push('/admin/login');
            return;
        }
        setAuthUser(user);
        setLoading(true);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.exists() ? userSnap.data() as AppUser : {};

            const shopDocRef = doc(db, 'shops', user.uid);
            const shopSnap = await getDoc(shopDocRef);
            const shopData = shopSnap.exists() ? shopSnap.data() as ShopProfile : {};
            
            setUserProfile({ ...userData, ...shopData } as FullProfile);
            
            const employeesSnapshot = await getDocs(collection(db, 'shops', user.uid, 'employees'));
            setEmployeeCount(employeesSnapshot.docs.filter(doc => doc.data().role !== 'Admin').length);

            const branchesQuery = query(collection(db, "shops"), where("ownerId", "==", user.uid));
            const branchesSnapshot = await getDocs(branchesQuery);
            setBranchCount(branchesSnapshot.size);

            const settingsDocRef = doc(db, 'shops', user.uid, 'config', 'main');
            const docSnap = await getDoc(settingsDocRef);
            if (docSnap.exists()) {
                const existingSettings = docSnap.data();
                const newBusinessHours = JSON.parse(JSON.stringify(defaultHours));
                
                if (existingSettings.businessHours) {
                    Object.keys(newBusinessHours).forEach(day => {
                        const key = day as keyof BusinessHours;
                        if (existingSettings.businessHours[key]) {
                            newBusinessHours[key] = { ...newBusinessHours[key], ...existingSettings.businessHours[key] };
                        }
                    });
                }
                const mergedSettings = { ...defaultSettings, ...existingSettings, businessHours: newBusinessHours };
                setSettings(mergedSettings);
            } else {
                setSettings(defaultSettings);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Error", description: "Could not load your settings.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    });

    return () => unsubscribe();
  }, [router, toast]);
  
   useEffect(() => {
    if (!authUser) return;
    const shiftsCollectionRef = collection(db, 'shops', authUser.uid, 'shifts');
    const unsubscribe = onSnapshot(shiftsCollectionRef, (snapshot) => {
        const fetchedShifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift));
        setShifts(fetchedShifts);
    });
    return () => unsubscribe();
  }, [authUser]);

  const handleDaySettingChange = (day: keyof BusinessHours, field: keyof DayHours, value: string | boolean) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      businessHours: { ...prevSettings.businessHours, [day]: { ...prevSettings.businessHours[day], [field]: value } },
    }));
  };

  const handleSaveSettings = async () => {
    if (!authUser) return;
    setSaving(true);
    const settingsDocRef = doc(db, 'shops', authUser.uid, 'config', 'main');
    const shopDocRef = doc(db, 'shops', authUser.uid);
    try {
        await setDoc(settingsDocRef, settings, { merge: true });
        await updateDoc(shopDocRef, {
            businessHours: settings.businessHours,
            lateGracePeriodMinutes: settings.lateGracePeriodMinutes,
            qrCodeMode: settings.qrCodeMode,
        });
        toast({ title: "Settings Saved!", description: "Your new settings have been applied." });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Save Failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!authUser) return;
    setNotifLoading(true);
    try {
      const token = await requestForToken();
      if (token) {
        const userDocRef = doc(db, 'users', authUser.uid);
        await updateDoc(userDocRef, { fcmToken: token });
        toast({ title: "Notifications Enabled!", description: "You will now receive alerts and updates." });
      }
    } catch (error) {
      toast({ title: 'Error Enabling Notifications', variant: 'destructive' });
    } finally {
        setNotifLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out" });
      router.push('/login');
    } catch (error) {
      toast({ title: "Logout Failed", variant: "destructive" });
    }
  };
  
    const handleAddShift = async () => {
    if (!authUser || !newShiftName || !newShiftStart || !newShiftEnd) {
      toast({ title: "Missing Fields", description: "Please provide a name, start time, and end time for the shift.", variant: "destructive" });
      return;
    }
    setIsAddingShift(true);
    try {
      const shiftsCollectionRef = collection(db, 'shops', authUser.uid, 'shifts');
      await addDoc(shiftsCollectionRef, {
        name: newShiftName,
        startTime: newShiftStart,
        endTime: newShiftEnd,
      });
      toast({ title: "Shift Added!", description: `${newShiftName} has been created.` });
      setNewShiftName('');
      setNewShiftStart('');
      setNewShiftEnd('');
    } catch (error) {
      console.error("Error adding shift: ", error);
      toast({ title: "Error", description: "Could not add shift.", variant: "destructive" });
    } finally {
      setIsAddingShift(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!authUser) return;
    const shiftDocRef = doc(db, 'shops', authUser.uid, 'shifts', shiftId);
    try {
      await deleteDoc(shiftDocRef);
      toast({ title: "Shift Deleted", description: "The shift has been removed." });
    } catch (error) {
      console.error("Error deleting shift: ", error);
      toast({ title: "Error", description: "Could not delete shift.", variant: "destructive" });
    }
  };


  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
        <Tabs defaultValue={defaultTab} className="w-full">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and shop preferences.</p>
            </div>
            
            <div className="sticky top-14 md:top-0 z-30 bg-background/80 backdrop-blur-sm -mx-6 px-6 py-4 mb-6 border-b">
                 <TabsList className="grid w-full grid-cols-5 h-auto p-1 border-2 border-border bg-muted">
                    <TabsTrigger value="profile" className="text-xs sm:text-sm py-2 data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md transition-all duration-300">
                        <UserIcon className="h-5 w-5 lg:mr-2" /><span className="hidden lg:inline">Profile</span>
                    </TabsTrigger>
                     <TabsTrigger value="subscription" className="text-xs sm:text-sm py-2 data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md transition-all duration-300">
                        <Trophy className="h-5 w-5 lg:mr-2"/><span className="hidden lg:inline">Subscription</span>
                    </TabsTrigger>
                    <TabsTrigger value="shifts" className="text-xs sm:text-sm py-2 data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md transition-all duration-300">
                        <Clock className="h-5 w-5 lg:mr-2"/><span className="hidden lg:inline">Shifts</span>
                    </TabsTrigger>
                    <TabsTrigger value="business" className="text-xs sm:text-sm py-2 data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md transition-all duration-300">
                        <Building className="h-5 w-5 lg:mr-2"/><span className="hidden lg:inline">Business</span>
                    </TabsTrigger>
                    <TabsTrigger value="general" className="text-xs sm:text-sm py-2 data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md transition-all duration-300">
                        <SettingsIcon className="h-5 w-5 lg:mr-2"/><span className="hidden lg:inline">General</span>
                    </TabsTrigger>
                </TabsList>
            </div>
            
              <div className="lg:col-span-1">
                
                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6 mt-0">
                    {userProfile && (
                        <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-primary">
                            <CardHeader className="flex flex-row justify-between items-start">
                                <div>
                                    <CardTitle>Shop Profile</CardTitle>
                                    <CardDescription>This is how your business appears across the app.</CardDescription>
                                </div>
                                <Link href="/admin/profile">
                                    <Button variant="outline"><Edit className="mr-2 h-4 w-4"/>Edit Profile</Button>
                                </Link>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20 border-2 border-primary">
                                        <AvatarImage src={userProfile.imageUrl} />
                                        <AvatarFallback>{userProfile.fallback}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-2xl font-bold">{userProfile.name}</h2>
                                        <Badge variant="secondary" className="mt-1">Business Owner</Badge>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                        <Building className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Company</p>
                                            <p className="font-semibold">{userProfile.shopName || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Category</p>
                                            <p className="font-semibold">{userProfile.businessType || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                        <MapPin className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Location</p>
                                            <p className="font-semibold">{userProfile.address || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                        <Percent className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">GST Number</p>
                                            <p className="font-semibold">{userProfile.gstNumber || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                        <Phone className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Phone Number</p>
                                            <p className="font-semibold">{userProfile.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                     <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-primary">
                        <CardHeader>
                            <CardTitle>Usage</CardTitle>
                            <CardDescription>Your current plan usage. Upgrade to increase limits.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold">Employees</h4>
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-bold text-foreground">{employeeCount}</span> / {planDetails.maxEmployees === Infinity ? 'Unlimited' : planDetails.maxEmployees}
                                        </p>
                                    </div>
                                    <Progress value={(employeeCount / (planDetails.maxEmployees === Infinity ? employeeCount : planDetails.maxEmployees)) * 100} />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold">Branches</h4>
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-bold text-foreground">{branchCount}</span> / {planDetails.maxBranches === Infinity ? 'Unlimited' : planDetails.maxBranches}
                                        </p>
                                    </div>
                                    <Progress value={(branchCount / (planDetails.maxBranches === Infinity ? branchCount : planDetails.maxBranches)) * 100} />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-start gap-4">
                            <div className="flex flex-col md:flex-row gap-4 w-full">
                                <Link href="/admin/employees" className="flex-1">
                                    <Button variant="outline" className="w-full">Manage Employees</Button>
                                </Link>
                                <Link href="/admin/branches" className="flex-1">
                                    <Button variant="outline" className="w-full">Manage Branches</Button>
                                </Link>
                            </div>
                             <Link href="/admin/settings?tab=subscription" className="w-full">
                                <Button className="w-full">
                                    <Crown className="mr-2 h-4 w-4"/>
                                    Upgrade Plan
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="subscription" className="mt-0">
                    <PricingPlans profile={userProfile} />
                </TabsContent>
                
                <TabsContent value="shifts" className="space-y-6 mt-0">
                    <Card>
                        <CardHeader>
                            <CardTitle>Shift Management</CardTitle>
                            <CardDescription>Define custom work shifts for your employees.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-4 items-end p-4 border rounded-lg">
                                <div className="space-y-1.5">
                                    <Label htmlFor="shift-name">Shift Name</Label>
                                    <Input id="shift-name" placeholder="e.g., Morning Shift" value={newShiftName} onChange={(e) => setNewShiftName(e.target.value)} />
                                </div>
                                 <div className="space-y-1.5">
                                    <Label htmlFor="shift-start">Start Time</Label>
                                    <Input id="shift-start" type="time" value={newShiftStart} onChange={(e) => setNewShiftStart(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="shift-end">End Time</Label>
                                    <Input id="shift-end" type="time" value={newShiftEnd} onChange={(e) => setNewShiftEnd(e.target.value)} />
                                </div>
                                <Button onClick={handleAddShift} disabled={isAddingShift}>
                                    {isAddingShift ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                    Add
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold">Existing Shifts</h4>
                                {shifts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center p-4">No custom shifts created yet.</p>
                                ) : (
                                    shifts.map(shift => (
                                        <div key={shift.id} className="flex items-center justify-between p-3 border rounded-md">
                                            <div>
                                                <p className="font-medium">{shift.name}</p>
                                                <p className="text-sm text-muted-foreground">{shift.startTime} - {shift.endTime}</p>
                                            </div>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the "{shift.name}" shift. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteShift(shift.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                            Delete Shift
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* General Settings Tab */}
                <TabsContent value="general" className="space-y-6 mt-0">
                    <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-primary">
                        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
                        <CardContent><div className="flex items-center justify-between"><Label className="font-medium">Theme</Label><ThemeSwitcher /></div></CardContent>
                    </Card>
                    <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-primary">
                        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border p-4 flex items-center justify-between">
                                <div><h4 className="font-semibold">Enable Browser Notifications</h4><p className="text-xs text-muted-foreground">Click to allow alerts and updates.</p></div>
                                <Button variant="secondary" onClick={handleEnableNotifications} disabled={notifLoading}>{notifLoading ? <Loader2 className="mr-2 animate-spin"/> : <Bell className="mr-2"/>}Enable</Button>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
                                <div><Label htmlFor="employee-reminders" className="font-medium">Employee Reminders</Label><p className="text-xs text-muted-foreground">Remind employees to check in before their shift starts.</p></div>
                                <Switch id="employee-reminders" checked={settings.enableEmployeeReminders} onCheckedChange={(checked) => setSettings({ ...settings, enableEmployeeReminders: checked })}/>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
                                <div><Label htmlFor="late-alerts" className="font-medium">Late/Absent Alerts</Label><p className="text-xs text-muted-foreground">Notify admins about missing attendance.</p></div>
                                <Switch id="late-alerts" checked={settings.enableLateAlerts} onCheckedChange={(checked) => setSettings({ ...settings, enableLateAlerts: checked })}/>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-destructive">
                        <CardHeader><CardTitle className="text-destructive">Account Actions</CardTitle></CardHeader>
                        <CardContent className="flex justify-center">
                            <Button variant="destructive" className="w-full max-w-xs" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4"/>Logout</Button>
                        </CardContent>
                    </Card>
                     <div className="pt-6 flex justify-end">
                        <Button onClick={handleSaveSettings} className="w-full md:w-auto" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save All Settings
                        </Button>
                    </div>
                </TabsContent>

                {/* Business Settings Tab */}
                <TabsContent value="business" className="space-y-6 mt-0">
                    <div>
                        <h3 className="text-lg font-medium">Business Hours</h3>
                        <p className="text-sm text-muted-foreground">Set the working hours for each day.</p>
                    </div>
                    <div className="space-y-4">
                        {Object.keys(settings.businessHours).map((day) => (
                            <div key={day} className="flex flex-col md:flex-row items-center justify-between rounded-lg border p-3 sm:p-4 gap-4 bg-card text-card-foreground shadow-sm transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-primary">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <Switch id={`${day}-is-open`} checked={settings.businessHours[day as keyof BusinessHours].isOpen} onCheckedChange={(checked) => handleDaySettingChange(day as keyof BusinessHours, 'isOpen', checked)} />
                                    <Label htmlFor={`${day}-is-open`} className="capitalize text-lg font-medium flex-1">{day}</Label>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <div className="space-y-1 flex-1"><Label htmlFor={`${day}-start-time`} className="text-xs">Start Time</Label><Input id={`${day}-start-time`} type="time" value={settings.businessHours[day as keyof BusinessHours].startTime} onChange={(e) => handleDaySettingChange(day as keyof BusinessHours, 'startTime', e.target.value)} disabled={!settings.businessHours[day as keyof BusinessHours].isOpen}/></div>
                                    <div className="space-y-1 flex-1"><Label htmlFor={`${day}-end-time`} className="text-xs">End Time</Label><Input id={`${day}-end-time`} type="time" value={settings.businessHours[day as keyof BusinessHours].endTime} onChange={(e) => handleDaySettingChange(day as keyof BusinessHours, 'endTime', e.target.value)} disabled={!settings.businessHours[day as keyof BusinessHours].isOpen}/></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-primary">
                        <CardHeader><CardTitle>Attendance & Leave</CardTitle></CardHeader>
                        <CardContent className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="duration">Late Arrival Grace Period</Label>
                                <Select value={String(settings.lateGracePeriodMinutes)} onValueChange={(value) => setSettings({...settings, lateGracePeriodMinutes: Number(value)})}>
                                    <SelectTrigger id="duration"><SelectValue placeholder="Select duration" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5 minutes</SelectItem>
                                        <SelectItem value="10">10 minutes</SelectItem>
                                        <SelectItem value="15">15 minutes</SelectItem>
                                        <SelectItem value="30">30 minutes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="paidLeave">Monthly Paid Leave Days</Label>
                                <Input id="paidLeave" type="number" value={settings.monthlyPaidLeave} onChange={(e) => setSettings({...settings, monthlyPaidLeave: Number(e.target.value)})} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-primary">
                        <CardHeader><CardTitle>QR Code Security</CardTitle></CardHeader>
                        <CardContent>
                            <RadioGroup value={settings.qrCodeMode} onValueChange={(value: 'permanent' | 'dynamic') => setSettings(prev => ({...prev, qrCodeMode: value}))} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Label htmlFor="permanent-qr" className="flex flex-col gap-2 rounded-lg border p-4 cursor-pointer hover:bg-accent has-[input:checked]:border-primary">
                                    <div className="flex items-center gap-2 font-semibold"><RadioGroupItem value="permanent" id="permanent-qr" />Permanent</div>
                                    <p className="text-xs text-muted-foreground ml-6">A single, unchanging QR code. Easy to print.</p>
                                </Label>
                                <Label htmlFor="dynamic-qr" className="flex flex-col gap-2 rounded-lg border p-4 cursor-pointer hover:bg-accent has-[input:checked]:border-primary">
                                    <div className="flex items-center gap-2 font-semibold"><RadioGroupItem value="dynamic" id="dynamic-qr" />Dynamic</div>
                                    <p className="text-xs text-muted-foreground ml-6">Refreshes every 15 seconds to prevent misuse.</p>
                                </Label>
                            </RadioGroup>
                        </CardContent>
                    </Card>
                     <div className="pt-6 flex justify-end">
                        <Button onClick={handleSaveSettings} className="w-full md:w-auto" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save All Settings
                        </Button>
                    </div>
                </TabsContent>
              </div>
        </Tabs>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
