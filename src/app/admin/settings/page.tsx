
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Trophy, LogOut, Save, Loader2, Bell, Edit, Building, Mail, Check, Crown, ArrowRight, CalendarDays, ShieldCheck, Gift, Upload, Copy, Share2, CheckCircle, Users, Briefcase, MapPin, Percent, Phone, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { auth, db, requestForToken } from "@/lib/firebase";
import { signOut, onAuthStateChanged, type User as AuthUser } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef, Suspense } from "react";
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { User as AppUser } from '@/app/admin/employees/page';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Types
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
    subscriptionPlan?: string;
    businessType?: string;
    address?: string;
    gstNumber?: string;
    phone?: string
}

type Referral = {
    id: string;
    referredShopName: string;
    status: 'Joined' | 'Pending';
    date: string;
};

type FullProfile = AppUser & ShopProfile;


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
  const [referralCode, setReferralCode] = useState('');
  const [fullReferralCode, setFullReferralCode] = useState('');
  const [referralHistory, setReferralHistory] = useState<Referral[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const defaultTab = searchParams.get('tab') || 'profile';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
            router.push('/admin/login');
            return;
        }
        setAuthUser(user);
        setReferralCode(user.uid.substring(0, 8).toUpperCase());
        setFullReferralCode(user.uid);
        setLoading(true);
        setLoadingReferrals(true);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.exists() ? userSnap.data() as AppUser : {};

            const shopDocRef = doc(db, 'shops', user.uid);
            const shopSnap = await getDoc(shopDocRef);
            const shopData = shopSnap.exists() ? shopSnap.data() as ShopProfile : {};
            
            setUserProfile({ ...userData, ...shopData } as FullProfile);

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

        const referralsRef = collection(db, 'shops', user.uid, 'referrals');
        const q = query(referralsRef, orderBy('date', 'desc'));
        const unsubscribeHistory = onSnapshot(q, (snapshot) => {
            const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
            setReferralHistory(history);
            setLoadingReferrals(false);
        }, () => setLoadingReferrals(false));

        return () => unsubscribeHistory();
    });

    return () => unsubscribe();
  }, [router, toast]);

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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullReferralCode);
    toast({ title: "Copied!" });
  };
    
  const shareOnWhatsApp = () => {
    const message = `Hey! I'm using Attendry to manage my staff attendance. Sign up using my referral code and get a special discount: ${fullReferralCode}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
        <Tabs defaultValue={defaultTab} className="w-full">
            <div className="md:hidden">
              <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="profile"><UserIcon className="h-5 w-5"/></TabsTrigger>
                  <TabsTrigger value="subscription"><Crown className="h-5 w-5"/></TabsTrigger>
                  <TabsTrigger value="general"><SettingsIcon className="h-5 w-5"/></TabsTrigger>
                  <TabsTrigger value="business"><Building className="h-5 w-5"/></TabsTrigger>
              </TabsList>
            </div>
            
            <div className="hidden md:block">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and shop preferences.</p>
            </div>
            
            <div className="w-full md:grid md:grid-cols-[220px_1fr] md:gap-8">
                <aside className="hidden md:flex md:flex-col md:sticky md:top-0 h-screen">
                    <TabsList className="flex-col h-auto items-start gap-2 bg-transparent p-0">
                        <TabsTrigger value="profile" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-base font-semibold py-3 px-4 rounded-lg border-2 border-foreground/20 hover:bg-muted/50 hover:border-primary">
                            Profile
                        </TabsTrigger>
                        <TabsTrigger value="subscription" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-base font-semibold py-3 px-4 rounded-lg border-2 border-foreground/20 hover:bg-muted/50 hover:border-primary">
                            Subscription
                        </TabsTrigger>
                        <TabsTrigger value="general" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-base font-semibold py-3 px-4 rounded-lg border-2 border-foreground/20 hover:bg-muted/50 hover:border-primary">
                            General
                        </TabsTrigger>
                        <TabsTrigger value="business" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-base font-semibold py-3 px-4 rounded-lg border-2 border-foreground/20 hover:bg-muted/50 hover:border-primary">
                            Business
                        </TabsTrigger>
                        <Button onClick={handleSaveSettings} className="w-full mt-4" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save All Settings
                        </Button>
                    </TabsList>
                </aside>
            
              <div className="mt-8 md:mt-0">
                {/* Profile Tab */}
                <TabsContent value="profile">
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
                </TabsContent>

                {/* Subscription & Referrals Tab */}
                <TabsContent value="subscription" className="space-y-6">
                    <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-primary">
                        <CardHeader>
                            <CardTitle>Current Subscription</CardTitle>
                            <CardDescription>You are on the <span className="font-semibold text-primary">{userProfile?.subscriptionPlan || 'Free'} Plan</span>.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/admin/subscription"><Button className="w-full sm:w-auto"><ArrowRight className="mr-2 h-4 w-4" />View & Upgrade Subscription</Button></Link>
                        </CardContent>
                    </Card>
                    <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-primary">
                        <CardHeader><CardTitle>Referral Program</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="border-2 border-dashed border-primary/50 bg-primary/5 p-4 rounded-lg flex items-center justify-center">
                                <p className="text-2xl md:text-4xl font-bold tracking-widest text-primary text-center">{referralCode}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button onClick={copyToClipboard} className="w-full"><Copy className="mr-2 h-4 w-4"/> Copy Code</Button>
                                <Button onClick={shareOnWhatsApp} variant="secondary" className="w-full"><Share2 className="mr-2 h-4 w-4"/> Share on WhatsApp</Button>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/20 hover:border-primary">
                        <CardHeader><CardTitle>Referral History</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {loadingReferrals ? (
                                <div className="flex justify-center items-center h-24">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : referralHistory.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                                    <p>You haven't referred anyone yet.</p>
                                    <p className="text-xs mt-1">Share your code above to get started!</p>
                                </div>
                            ) : (
                            referralHistory.map((referral) => (
                                    <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/40">
                                        <div>
                                            <p className="font-semibold">{referral.referredShopName}</p>
                                            <p className="text-xs text-muted-foreground">Referred on: {new Date(referral.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className={`flex items-center text-sm font-medium ${referral.status === 'Joined' ? 'text-green-600' : 'text-amber-600'}`}>
                                            {referral.status === 'Joined' ? <CheckCircle className="mr-2 h-4 w-4" /> : <Users className="mr-2 h-4 w-4" />}
                                            {referral.status}
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                {/* General Settings Tab */}
                <TabsContent value="general" className="space-y-6">
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
                    <Card className="border-destructive transition-all duration-300 ease-out hover:shadow-lg hover:border-primary">
                        <CardHeader><CardTitle className="text-destructive">Account Actions</CardTitle></CardHeader>
                        <CardContent className="flex justify-center">
                            <Button variant="destructive" className="w-full max-w-xs" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4"/>Logout</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Business Settings Tab */}
                <TabsContent value="business" className="space-y-6">
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
                </TabsContent>
              </div>
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
