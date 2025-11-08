
'use client';

import { useState } from 'react';
import { Check, X, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const plans = [
    {
        name: 'Starter',
        priceMonthly: '₹0',
        priceYearly: '₹0',
        description: 'For new businesses testing the waters with digital offers.',
        buttonText: 'Current Plan',
        isCurrent: true,
        features: [
            '1 Active Offer',
            'Up to 500 QR Scans/month',
            'Basic Analytics',
        ],
        featureMap: {
            'Active Offers': '1',
            'QR Code Scans per Month': '500',
            'AI-Powered Offer Descriptions': false,
            'Customer Data Analytics': 'Basic',
            'Remove Saledup Branding': false,
            'Export Customer Data': false,
            'Email & Chat Support': false,
        }
    },
    {
        name: 'Growth',
        priceMonthly: '₹299',
        priceYearly: '₹2,999',
        description: 'For growing businesses ready to scale their customer engagement.',
        buttonText: 'Upgrade to Growth',
        isPopular: true,
        features: [
            '10 Active Offers',
            'Up to 5,000 QR Scans/month',
            'AI Offer Descriptions',
            'Advanced Analytics'
        ],
        featureMap: {
            'Active Offers': '10',
            'QR Code Scans per Month': '5,000',
            'AI-Powered Offer Descriptions': true,
            'Customer Data Analytics': 'Advanced',
            'Remove Saledup Branding': true,
            'Export Customer Data': false,
            'Email & Chat Support': true,
        }
    },
    {
        name: 'Pro',
        priceMonthly: '₹999',
        priceYearly: '₹9,999',
        description: 'For established businesses that require powerful tools and insights.',
        buttonText: 'Upgrade to Pro',
        features: [
            'Unlimited Offers',
            'Unlimited QR Scans',
            'Export Customer Data',
            'Priority Support'
        ],
        featureMap: {
            'Active Offers': 'Unlimited',
            'QR Code Scans per Month': 'Unlimited',
            'AI-Powered Offer Descriptions': true,
            'Customer Data Analytics': 'Advanced',
            'Remove Saledup Branding': true,
            'Export Customer Data': true,
            'Email & Chat Support': true,
        }
    },
];

const allFeatures = [
    { category: 'Core Features', name: 'Active Offers' },
    { category: 'Core Features', name: 'QR Code Scans per Month' },
    { category: 'Core Features', name: 'AI-Powered Offer Descriptions' },
    { category: 'Analytics & Data', name: 'Customer Data Analytics' },
    { category: 'Analytics & Data', name: 'Export Customer Data' },
    { category: 'Branding & Support', name: 'Remove Saledup Branding' },
    { category: 'Branding & Support', name: 'Email & Chat Support' },
];

export default function PricingPageContent() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="space-y-12">
        <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight">Find the Perfect Plan for Your Business</h1>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
                Simple, transparent pricing. Choose the plan that fits your needs and start growing today.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
                <span className={cn("font-medium", !isYearly && "text-primary")}>Monthly</span>
                <Switch
                    checked={isYearly}
                    onCheckedChange={setIsYearly}
                    aria-label="Toggle between monthly and yearly pricing"
                />
                <span className={cn("font-medium", isYearly && "text-primary")}>
                    Yearly <span className="text-green-600 font-semibold"> (Save 15%)</span>
                </span>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {plans.map((plan) => (
                <div key={plan.name} className={cn(
                    "rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                    plan.isPopular && "border-2 border-primary shadow-primary/20 relative"
                )}>
                        {plan.isPopular && (
                        <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                            <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                                Most Popular
                            </div>
                        </div>
                    )}
                    <div className="flex-grow">
                        <h2 className="text-2xl font-bold">{plan.name}</h2>
                        <p className="text-muted-foreground mt-2 h-12">{plan.description}</p>
                        <div className="my-6">
                            <span className="text-4xl font-extrabold">
                                {isYearly ? plan.priceYearly : plan.priceMonthly}
                            </span>
                            <span className="text-muted-foreground">
                                {isYearly ? ' / year' : ' / month'}
                            </span>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground my-6">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <Check className="h-5 w-5 text-primary" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <Button asChild className="w-full mt-auto" variant={plan.isCurrent ? "outline" : "default"} disabled={plan.isCurrent}>
                        <Link href={'/admin/profile?tab=pricing'}>{plan.buttonText}</Link>
                    </Button>
                </div>
            ))}
        </div>

        <div>
            <h2 className="text-2xl font-bold text-center mb-8">Detailed Feature Comparison</h2>
            <div className="overflow-x-auto rounded-lg border shadow-sm">
                <table className="w-full min-w-[600px] text-left">
                    <thead className="bg-muted">
                        <tr>
                            <th className="p-4 w-1/3 font-semibold">Features</th>
                            {plans.map((plan) => (
                                <th key={plan.name} className="p-4 text-center font-semibold">{plan.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {allFeatures.reduce((acc, feature, index) => {
                            const prevCategory = index > 0 ? allFeatures[index - 1].category : null;
                            if (feature.category !== prevCategory) {
                                acc.push(
                                    <tr key={feature.category} className="bg-muted/50">
                                        <td colSpan={plans.length + 1} className="p-3 font-bold text-sm text-foreground">{feature.category}</td>
                                    </tr>
                                );
                            }
                            acc.push(
                                <tr key={feature.name} className="border-t">
                                    <td className="p-4 text-sm font-medium">{feature.name}</td>
                                    {plans.map((plan) => {
                                        const featureValue = plan.featureMap[feature.name as keyof typeof plan.featureMap];
                                        return (
                                            <td key={`${plan.name}-${feature.name}`} className="p-4 text-center">
                                                {typeof featureValue === 'boolean' ? (
                                                    featureValue ? (
                                                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                                                    ) : (
                                                        <Minus className="h-5 w-5 text-muted-foreground mx-auto" />
                                                    )
                                                ) : (
                                                    <span className="text-sm font-medium text-foreground">{featureValue}</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                            return acc;
                        }, [] as JSX.Element[])}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
