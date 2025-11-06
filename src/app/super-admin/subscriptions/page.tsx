
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from "@/lib/utils";
import { Check, Edit, Loader2, Save } from "lucide-react";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

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

const initialTiers: Tier[] = [
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
    plan_id: { monthly: 'plan_starter_inr_monthly', yearly: 'plan_starter_inr_yearly' },
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
    plan_id: { monthly: 'plan_growth_inr_monthly', yearly: 'plan_growth_inr_yearly' },
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
    plan_id: { monthly: 'plan_pro_inr_monthly', yearly: 'plan_pro_inr_yearly' },
    isPopular: true,
  },
];


export default function SuperAdminSubscriptionsPage() {
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTier, setEditingTier] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchTiers = async () => {
            setLoading(true);
            try {
                const configDocRef = doc(db, "platform_config", "subscriptions");
                const docSnap = await getDoc(configDocRef);

                if (docSnap.exists() && docSnap.data().tiers) {
                    setTiers(docSnap.data().tiers);
                } else {
                    setTiers(initialTiers);
                }
            } catch (error) {
                console.error("Error fetching subscription tiers:", error);
                setTiers(initialTiers);
                toast({
                    title: "Error",
                    description: "Could not fetch subscription plans.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchTiers();
    }, [toast]);

    const handleEdit = (tierName: string) => {
        setEditingTier(tierName);
    };

    const handleSave = async (tierName: string) => {
        setSaving(true);
        try {
            const configDocRef = doc(db, "platform_config", "subscriptions");
            await setDoc(configDocRef, { tiers });
            toast({
                title: "Plans Updated!",
                description: "The subscription plans have been saved.",
            });
            setEditingTier(null);
        } catch (error) {
            console.error("Error saving subscription tiers:", error);
            toast({
                title: "Save Failed",
                description: "Could not save the subscription plans.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTierChange = (tierName: string, field: keyof Tier | 'price.monthly' | 'price.yearly' | 'plan_id.monthly' | 'plan_id.yearly', value: string | string[] | boolean) => {
        setTiers(prevTiers => prevTiers.map(tier => {
            if (tier.name === tierName) {
                const newTier = { ...tier };
                if (field === 'price.monthly') {
                    newTier.price.monthly = String(value);
                } else if (field === 'price.yearly') {
                    newTier.price.yearly = String(value);
                } else if (field === 'plan_id.monthly') {
                    newTier.plan_id.monthly = String(value);
                } else if (field === 'plan_id.yearly') {
                    newTier.plan_id.yearly = String(value);
                } else if (field === 'features') {
                    newTier.features = Array.isArray(value) ? value : String(value).split('\n');
                } else if (field !== 'price' && field !== 'plan_id') {
                    (newTier as any)[field] = value;
                }
                return newTier;
            }
            return tier;
        }));
    };
    
    if (loading) {
        return (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Subscription Tiers</h1>
                <p className="text-muted-foreground">Manage the subscription plans offered on the platform.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {tiers.map((tier) => {
                    const isEditing = editingTier === tier.name;
                    return (
                        <Card key={tier.name} className={cn("flex flex-col transform-gpu transition-all duration-300 ease-out hover:shadow-xl", tier.isPopular ? "border-primary border-2 shadow-primary/20" : "border-border", isEditing && "ring-2 ring-primary")}>
                            {tier.isPopular && !isEditing && (
                                <div className="py-1 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-t-lg text-center">
                                    Best Value
                                </div>
                            )}
                            <CardHeader className="pt-6">
                                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                                {isEditing ? (
                                     <Textarea 
                                        value={tier.description}
                                        onChange={(e) => handleTierChange(tier.name, 'description', e.target.value)}
                                        className="text-sm"
                                    />
                                ) : (
                                    <CardDescription>{tier.description}</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-6">
                                <div className="space-y-2">
                                    {isEditing ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                 <Label htmlFor={`${tier.name}-monthly`} className="text-sm">Monthly (₹)</Label>
                                                 <Input
                                                    id={`${tier.name}-monthly`}
                                                    type="number"
                                                    value={tier.price.monthly}
                                                    onChange={(e) => handleTierChange(tier.name, 'price.monthly', e.target.value)}
                                                    className="font-bold p-1 border-input h-auto text-base"
                                                />
                                            </div>
                                             <div className="flex items-center gap-2">
                                                 <Label htmlFor={`${tier.name}-yearly`} className="text-sm">Yearly (₹)</Label>
                                                 <Input
                                                    id={`${tier.name}-yearly`}
                                                    type="number"
                                                    value={tier.price.yearly}
                                                    onChange={(e) => handleTierChange(tier.name, 'price.yearly', e.target.value)}
                                                    className="font-bold p-1 border-input h-auto text-base"
                                                />
                                            </div>
                                             <div className="space-y-1 mt-4">
                                                 <Label htmlFor={`${tier.name}-plan-monthly`} className="text-xs">Dodo Payments Plan ID (Monthly)</Label>
                                                 <Input
                                                    id={`${tier.name}-plan-monthly`}
                                                    value={tier.plan_id.monthly}
                                                    onChange={(e) => handleTierChange(tier.name, 'plan_id.monthly', e.target.value)}
                                                />
                                            </div>
                                             <div className="space-y-1">
                                                 <Label htmlFor={`${tier.name}-plan-yearly`} className="text-xs">Dodo Payments Plan ID (Yearly)</Label>
                                                 <Input
                                                    id={`${tier.name}-plan-yearly`}
                                                    value={tier.plan_id.yearly}
                                                    onChange={(e) => handleTierChange(tier.name, 'plan_id.yearly', e.target.value)}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-4xl font-bold">
                                            ₹{tier.price.monthly}
                                            <span className="text-base font-normal text-muted-foreground">/month</span>
                                        </div>
                                    )}
                                </div>
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Label>Features (one per line)</Label>
                                        <Textarea 
                                            value={tier.features.join('\n')}
                                            onChange={(e) => handleTierChange(tier.name, 'features', e.target.value.split('\n'))}
                                            rows={tier.features.length}
                                        />
                                    </div>
                                ) : (
                                    <ul className="space-y-3 text-sm">
                                        {tier.features.map((feature) => (
                                            <li key={feature} className="flex items-center gap-2">
                                                <Check className="h-4 w-4 text-green-500" />
                                                <span className="text-muted-foreground">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                            <CardFooter>
                               {isEditing ? (
                                    <Button className="w-full" onClick={() => handleSave(tier.name)} disabled={saving}>
                                        {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2"/>}
                                        Save Plan
                                    </Button>
                               ) : (
                                    <Button className="w-full" variant="outline" onClick={() => handleEdit(tier.name)}>
                                        <Edit className="mr-2"/>
                                        Edit Plan
                                    </Button>
                               )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
