
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Loader2, Phone, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged, type User as AuthUser } from "firebase/auth";
import { getFunctions, httpsCallable } from 'firebase/functions';

type Tier = {
    name: string;
    price: {
        monthly: string;
        yearly: string;
    };
    description: string;
    features: string[];
    isCurrent?: boolean;
    isPopular?: boolean;
    plan_id: {
        monthly: string;
        yearly: string;
    }
}

const defaultTiers: Tier[] = [
  {
    name: 'Starter',
    price: { monthly: '299', yearly: '2999' },
    description: 'For small teams getting started with the essentials.',
    features: [
        'Up to 10 employees',
        'Basic check-in/out features (QR & mobile)',
        'Daily attendance reports',
        'Email notifications to managers'
    ],
    plan_id: { monthly: 'plan_XXXXXXXXXXXXXX', yearly: 'plan_XXXXXXXXXXXXXX' },
    isCurrent: true,
  },
  {
    name: 'Growth',
    price: { monthly: '899', yearly: '8999' },
    description: 'For growing businesses that need advanced features and exports.',
    features: [
        'Up to 100 employees',
        'Everything in Starter',
        'Weekly and monthly attendance summaries',
        'Export reports to Excel/CSV for payroll',
        'Push notifications & reminders for employees'
    ],
    plan_id: { monthly: 'plan_XXXXXXXXXXXXXX', yearly: 'plan_XXXXXXXXXXXXXX' },
    isCurrent: false,
    isPopular: false,
  },
  {
    name: 'Pro',
    price: { monthly: '999', yearly: '9999' },
    description: 'For scaling businesses that need payroll and analytics.',
    features: [
        'Unlimited employees',
        'Everything in Growth',
        'Payroll integration (manual or automated)',
        'Analytics dashboard with trends',
        'Multi-location support',
        'Priority support'
    ],
    plan_id: { monthly: 'plan_XXXXXXXXXXXXXX', yearly: 'plan_XXXXXXXXXXXXXX' },
    isCurrent: false,
    isPopular: true,
  },
];


export default function SubscriptionPage() {
    const { toast } = useToast();
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [userProfile, setUserProfile] = useState<{name?: string, email?: string, phone?: string}>({});
    const [upgrading, setUpgrading] = useState<string | null>(null);

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
                const fetchUserData = async () => {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userDocRef);
                    if(userSnap.exists()){
                        setUserProfile(userSnap.data());
                    }
                }
                fetchUserData();
            }
        });
        return () => unsubscribe();
    }, []);


    useEffect(() => {
        const fetchTiers = async () => {
            try {
                const configDocRef = doc(db, "platform_config", "subscriptions");
                const docSnap = await getDoc(configDocRef);

                if (docSnap.exists() && docSnap.data().tiers) {
                    const fetchedTiers = docSnap.data().tiers.map((tier: Tier) => ({
                        ...tier,
                        isCurrent: tier.name === 'Starter',
                    }));
                    setTiers(fetchedTiers);
                } else {
                    setTiers(defaultTiers);
                }
            } catch (error) {
                console.error("Error fetching subscription tiers:", error);
                setTiers(defaultTiers);
            } finally {
                setLoading(false);
            }
        };

        fetchTiers();
    }, []);
    
    const handleUpgrade = (tier: Tier) => {
        if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
            toast({ title: "Configuration Error", description: "Razorpay is not configured.", variant: "destructive"});
            return;
        }
        if (!authUser) {
            toast({ title: "Authentication Error", description: "You must be logged in to upgrade.", variant: "destructive"});
            return;
        }

        setUpgrading(tier.name);
        
        const functions = getFunctions();
        const verifyPayment = httpsCallable(functions, 'verifyRazorpaySubscription');

        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            subscription_id: billingCycle === 'monthly' ? tier.plan_id.monthly : tier.plan_id.yearly,
            name: "Attendry Subscription",
            description: `Upgrade to ${tier.name} - ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
            handler: async function (response: any) {
                try {
                    await verifyPayment({
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_subscription_id: response.razorpay_subscription_id,
                        razorpay_signature: response.razorpay_signature,
                        shopId: authUser.uid,
                        planName: tier.name
                    });
                    
                    toast({ title: "Upgrade Successful!", description: `You are now on the ${tier.name} plan.` });

                } catch (error) {
                    console.error("Error updating subscription:", error);
                    toast({ title: "Update Failed", description: "Could not update your subscription in our system.", variant: "destructive" });
                } finally {
                    setUpgrading(null);
                }
            },
            prefill: {
                name: userProfile.name,
                email: userProfile.email,
                contact: userProfile.phone,
            },
            notes: {
                shopId: authUser.uid,
            },
            theme: {
                color: "#1663A9"
            },
            modal: {
                ondismiss: function() {
                    setUpgrading(null);
                }
            }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    }


    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/settings?tab=subscription">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Subscription Plans</h1>
                    <p className="text-muted-foreground">Choose the plan that's right for your business.</p>
                </div>
            </div>
            
            <div className="flex items-center justify-center gap-4">
                <Label htmlFor="billing-cycle" className={cn("font-medium", billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground')}>
                    Monthly
                </Label>
                <Switch 
                    id="billing-cycle"
                    checked={billingCycle === 'yearly'}
                    onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
                />
                <Label htmlFor="billing-cycle" className={cn("font-medium", billingCycle === 'yearly' ? 'text-primary' : 'text-muted-foreground')}>
                    Yearly
                    <span className="text-xs text-green-600 font-semibold ml-2">(Save up to 15%)</span>
                </Label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {tiers.map((tier) => (
                <Card key={tier.name} className={cn("flex flex-col transform-gpu transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl", tier.isPopular ? "border-primary border-2 shadow-primary/20" : "border-border")}>
                    {tier.isPopular && (
                        <div className="py-1 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-t-lg text-center">
                            Best Value
                        </div>
                    )}
                    <CardHeader className="pt-6">
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-6">
                    <div className="text-4xl font-bold">
                        ₹{billingCycle === 'monthly' ? tier.price.monthly : tier.price.yearly}
                        <span className="text-base font-normal text-muted-foreground">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                    </div>
                    <ul className="space-y-3 text-sm">
                        {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                        </li>
                        ))}
                    </ul>
                    </CardContent>
                    <CardFooter>
                      {tier.isCurrent ? (
                         <Button className="w-full" disabled>Current Plan</Button>
                      ) : (
                          <Button className="w-full" onClick={() => handleUpgrade(tier)} disabled={upgrading === tier.name}>
                            {upgrading === tier.name ? <Loader2 className="mr-2 animate-spin"/> : <Zap className="mr-2 h-4 w-4" />}
                            Upgrade to {tier.name}
                          </Button>
                      )}
                    </CardFooter>
                </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Zap className="text-amber-500" /> One-Time Setup Fee</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            For just <span className="font-bold text-primary">₹499</span> per shop, we offer an optional one-time setup fee which includes full account configuration, initial training for your team, and QR code generation for all your employees.
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Discounts & Incentives</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                       <p className="text-muted-foreground">
                           <span className="font-bold text-primary">Annual Plans:</span> Save 10-15% by choosing a yearly subscription.
                        </p>
                         <p className="text-muted-foreground">
                           <span className="font-bold text-primary">Referral Program:</span> Existing users get 1 month free for every new shop they refer to us!
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
