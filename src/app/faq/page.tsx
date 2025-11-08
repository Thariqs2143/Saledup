
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LandingFooter } from '@/components/landing-footer';
import { LandingHeader } from '@/components/landing-header';
import { Mail } from 'lucide-react';
import Link from 'next/link';

const faqSections = {
  "General": [
    {
      "question": "What is Saledup and how does it work?",
      "answer": "Saledup is a platform that allows local businesses to create and manage real-time offers through a single, permanent QR code. Customers scan the code with their phone to see your latest deals—no app needed. You create an offer in your dashboard, and it's instantly live."
    },
    {
      "question": "Do my customers need to download an app?",
      "answer": "No, and that's the beauty of it! Customers can use their phone's built-in camera to scan your QR code. It opens a simple, fast-loading webpage with your offers. This frictionless experience means more customers will engage with your deals."
    },
    {
        "question": "Is Saledup suitable for my type of business?",
        "answer": "Saledup is designed for any local business that has foot traffic. This includes cafes, restaurants, retail stores, boutiques, salons, bakeries, and more. If you have customers walking in or by your shop, Saledup can help you engage them."
    },
  ],
  "Pricing & Plans": [
    {
      "question": "How does the pricing work?",
      "answer": "We offer a range of plans, including a free Starter plan. Paid plans are available on a monthly or yearly subscription basis. Yearly plans come with a discount. You can upgrade, downgrade, or cancel your plan at any time from your account settings."
    },
    {
      "question": "Is there a free trial for paid plans?",
      "answer": "We offer a completely free 'Starter' plan that includes basic features, so you can try Saledup for as long as you like. This allows you to get your QR code, create offers, and see how it works before committing to a paid plan with more advanced features."
    },
     {
      "question": "What happens if I cancel my subscription?",
      "answer": "If you cancel a paid subscription, you will be able to use the premium features until the end of your billing cycle. After that, your account will be downgraded to the free Starter plan. Your QR code and existing offers will remain, but you will lose access to premium features."
    }
  ],
  "Features & Usage": [
    {
      "question": "Can I see how many people are scanning my code?",
      "answer": "Yes! Your Saledup dashboard includes simple analytics that show you how many times your QR code has been scanned and how many customers have claimed each offer. This helps you understand what's working and what's not."
    },
    {
      "question": "What is 'AI-Powered Descriptions'?",
      "answer": "This is a premium feature where our AI helps you write compelling marketing text for your offers. You just upload a photo of your product or describe the deal, and our AI will generate catchy titles and descriptions to attract more customers, saving you time and effort."
    },
    {
      "question": "How do I get my permanent QR code?",
      "answer": "Once you sign up and complete your shop profile, your unique and permanent QR code is automatically generated. You can download it directly from your dashboard in a high-resolution format, ready for printing and display in your shop."
    }
  ],
};

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-1">
        {/* FAQ Hero */}
        <section className="py-20 text-center bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Frequently Asked Questions</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Have a question? We're here to help.
                </p>
            </div>
        </section>

        {/* FAQ Accordion */}
        <section className="py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                {Object.entries(faqSections).map(([category, faqs]) => (
                    <div key={category} className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">{category}</h2>
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq, index) => (
                                <AccordionItem key={index} value={`item-${category}-${index}`}>
                                    <AccordionTrigger className="text-base text-left font-semibold hover:no-underline">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                ))}
            </div>
        </section>
        
        {/* Contact CTA */}
        <section className="py-20 bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                 <div className="p-4 bg-primary/10 rounded-full inline-block mb-6 shadow-md">
                    <Mail className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">Still have questions?</h2>
                <p className="mt-2 text-muted-foreground text-lg max-w-xl mx-auto">
                    Can't find the answer you're looking for? Don't hesitate to reach out to our friendly support team.
                </p>
                <div className="mt-6">
                    <Button asChild>
                        <Link href="/contact">Contact Us</Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
