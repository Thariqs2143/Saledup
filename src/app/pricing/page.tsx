
'use client';

import { useState } from 'react';
import { Check, X, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';

const plans = [
    {
        name: 'Starter',
        priceMonthly: '₹0',
        priceYearly: '₹0',
        description: 'For new businesses testing the waters with digital offers.',
        buttonText: 'Start for Free',
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
            'Dedicated Account Manager': false,
        }
    },
    {
        name: 'Growth',
        priceMonthly: '₹299',
        priceYearly: '₹2,999',
        description: 'For growing businesses ready to scale their customer engagement.',
        buttonText: 'Choose Growth',
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
            'Dedicated Account Manager': false,
        }
    },
    {
        name: 'Pro',
        priceMonthly: '₹999',
        priceYearly: '₹9,999',
        description: 'For established businesses that require powerful tools and insights.',
        buttonText: 'Choose Pro',
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
            'Dedicated Account Manager': false,
        }
    },
    {
        name: 'Enterprise',
        priceMonthly: 'Custom',
        priceYearly: '',
        description: 'For large organizations needing custom solutions and dedicated support.',
        buttonText: 'Contact Sales',
        features: [
            'Custom Integrations',
            'Dedicated Account Manager',
            'API Access',
            'Custom SLAs'
        ],
        featureMap: {
            'Active Offers': 'Unlimited',
            'QR Code Scans per Month': 'Unlimited',
            'AI-Powered Offer Descriptions': true,
            'Customer Data Analytics': 'Advanced',
            'Remove Saledup Branding': true,
            'Export Customer Data': true,
            'Email & Chat Support': true,
            'Dedicated Account Manager': true,
        }
    }
];

const allFeatures = [
    { category: 'Core Features', name: 'Active Offers' },
    { category: 'Core Features', name: 'QR Code Scans per Month' },
    { category: 'Core Features', name: 'AI-Powered Offer Descriptions' },
    { category: 'Analytics & Data', name: 'Customer Data Analytics' },
    { category: 'Analytics & Data', name: 'Export Customer Data' },
    { category: 'Branding & Support', name: 'Remove Saledup Branding' },
    { category: 'Branding & Support', name: 'Email & Chat Support' },
    { category: 'Branding & Support', name: 'Dedicated Account Manager' },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-1">
        {/* Pricing Hero */}
        <section className="py-20 text-center bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Find the Perfect Plan for Your Business</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Simple, transparent pricing. Choose the plan that fits your needs and start growing today.
                </p>
                <div className="mt-8 flex items-center justify-center gap-4">
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
        </section>

        {/* Pricing Tiers */}
        <section className="py-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
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
                                <p className="text-muted-foreground mt-2 mb-8">{plan.description}</p>
                                <div className="my-8">
                                    <span className="text-4xl font-extrabold">
                                        {isYearly ? plan.priceYearly : plan.priceMonthly}
                                    </span>
                                    {plan.name !== 'Enterprise' && (
                                    <span className="text-muted-foreground">
                                        {isYearly ? ' / year' : ' / month'}
                                    </span>
                                    )}
                                </div>
                                <ul className="space-y-3 text-sm text-muted-foreground my-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <Check className="h-5 w-5 text-primary" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Button asChild className="w-full mt-auto" variant={plan.isPopular ? 'default' : 'outline'}>
                                <Link href={plan.name === 'Enterprise' ? '/contact' : '/login'}>{plan.buttonText}</Link>
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-20 bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-center mb-12">Detailed Feature Comparison</h2>
                <div className="overflow-x-auto rounded-lg border shadow-sm">
                    <table className="w-full min-w-[800px] text-left">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-4 w-1/3 font-semibold text-lg">Features</th>
                                {plans.map((plan) => (
                                    <th key={plan.name} className="p-4 text-center font-semibold text-lg">{plan.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {allFeatures.reduce((acc, feature, index) => {
                                const prevCategory = index > 0 ? allFeatures[index - 1].category : null;
                                if (feature.category !== prevCategory) {
                                    acc.push(
                                        <tr key={feature.category} className="bg-muted/50">
                                            <td colSpan={plans.length + 1} className="p-3 font-bold text-base text-foreground">{feature.category}</td>
                                        </tr>
                                    );
                                }
                                acc.push(
                                    <tr key={feature.name} className="border-t">
                                        <td className="p-4 font-medium">{feature.name}</td>
                                        {plans.map((plan) => {
                                            const featureValue = plan.featureMap[feature.name as keyof typeof plan.featureMap];
                                            return (
                                                <td key={`${plan.name}-${feature.name}`} className="p-4 text-center">
                                                    {typeof featureValue === 'boolean' ? (
                                                        featureValue ? (
                                                            <Check className="h-6 w-6 text-green-500 mx-auto" />
                                                        ) : (
                                                            <Minus className="h-6 w-6 text-muted-foreground mx-auto" />
                                                        )
                                                    ) : (
                                                        <span className="font-medium text-foreground">{featureValue}</span>
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
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
