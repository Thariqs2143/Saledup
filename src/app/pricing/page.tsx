
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
        description: 'Perfect for individuals and small businesses just getting started.',
        buttonText: 'Start for Free',
        features: {
            'QR Code Offers': true,
            'Customer Engagement Analytics': true,
            'AI Offer Descriptions': false,
            'Remove Saledup Branding': false,
            'Export Customer Data': false,
            'Priority Support': false,
        }
    },
    {
        name: 'Growth',
        priceMonthly: '₹299',
        priceYearly: '₹2,999',
        description: 'For growing businesses looking to scale their marketing efforts.',
        buttonText: 'Choose Growth',
        isPopular: true,
        features: {
            'QR Code Offers': true,
            'Customer Engagement Analytics': true,
            'AI Offer Descriptions': true,
            'Remove Saledup Branding': true,
            'Export Customer Data': false,
            'Priority Support': false,
        }
    },
    {
        name: 'Pro',
        priceMonthly: '₹999',
        priceYearly: '₹9,999',
        description: 'For established businesses that need advanced tools and support.',
        buttonText: 'Choose Pro',
        features: {
            'QR Code Offers': true,
            'Customer Engagement Analytics': true,
            'AI Offer Descriptions': true,
            'Remove Saledup Branding': true,
            'Export Customer Data': true,
            'Priority Support': true,
        }
    },
    {
        name: 'Enterprise',
        priceMonthly: 'Custom',
        priceYearly: '',
        description: 'For large organizations with custom needs and dedicated support.',
        buttonText: 'Contact Sales',
        features: {
            'QR Code Offers': true,
            'Customer Engagement Analytics': true,
            'AI Offer Descriptions': true,
            'Remove Saledup Branding': true,
            'Export Customer Data': true,
            'Priority Support': true,
        }
    }
];

const allFeatures = [
    'QR Code Offers',
    'Customer Engagement Analytics',
    'AI Offer Descriptions',
    'Remove Saledup Branding',
    'Export Customer Data',
    'Priority Support'
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {plans.map((plan) => (
                        <div key={plan.name} className={cn(
                            "rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col p-6",
                            plan.isPopular && "border-2 border-primary shadow-primary/20 relative"
                        )}>
                             {plan.isPopular && (
                                <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                                        Most Popular
                                    </div>
                                </div>
                            )}
                            <h2 className="text-2xl font-bold">{plan.name}</h2>
                            <p className="text-muted-foreground mt-2 flex-grow">{plan.description}</p>
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
                            <Button asChild className="w-full" variant={plan.isPopular ? 'default' : 'outline'}>
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 border-b w-1/3">Features</th>
                                {plans.map((plan) => (
                                    <th key={plan.name} className="p-4 border-b text-center">{plan.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {allFeatures.map((feature) => (
                                <tr key={feature}>
                                    <td className="p-4 border-b font-medium">{feature}</td>
                                    {plans.map((plan) => (
                                        <td key={`${plan.name}-${feature}`} className="p-4 border-b text-center">
                                            {plan.features[feature as keyof typeof plan.features] ? (
                                                <Check className="h-6 w-6 text-green-500 mx-auto" />
                                            ) : (
                                                <Minus className="h-6 w-6 text-muted-foreground mx-auto" />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
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
