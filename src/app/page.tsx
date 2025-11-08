
'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, X, Store, ShoppingBag, Users, QrCode, TrendingUp, BarChart3, Shield, HeartHandshake, Coffee, Utensils, Shirt, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LandingFooter } from '@/components/landing-footer';
import placeholderImages from '@/lib/placeholder-images.json';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { LandingHeader } from '@/components/landing-header';
import Autoplay from "embla-carousel-autoplay";


export default function LandingPage() {
  const features = [
    {
        icon: QrCode,
        title: 'One QR, Endless Offers',
        description: 'A single, permanent QR code for your shop. Update offers anytime without reprinting.',
    },
    {
        icon: Store,
        title: 'Instant Customer Access',
        description: 'Customers scan and see your latest deals instantly. No app installation required.',
    },
    {
        icon: Sparkles,
        title: 'AI-Powered Descriptions',
        description: 'Upload an offer image and let our AI generate compelling marketing copy for you.',
    },
    {
        icon: Users,
        title: 'Boost Customer Loyalty',
        description: "Reward your regulars and attract new faces with timely, exciting offers they can't resist.",
    },
    {
        icon: BarChart3,
        title: 'Track Your Growth',
        description: 'Get simple, actionable insights. See how many customers scan your code and claim your offers.',
    },
    {
        icon: Shield,
        title: 'Simple & Secure',
        description: 'An easy-to-use platform for shop owners and a safe, private experience for customers.',
    },
];

const targetCustomers = [
    {
        icon: Coffee,
        title: "Cafes & Bakeries",
        description: "Promote your morning coffee deals or afternoon pastry specials."
    },
    {
        icon: Utensils,
        title: "Restaurants",
        description: "Fill empty tables during off-peak hours with exclusive dining offers."
    },
    {
        icon: Shirt,
        title: "Retail & Boutiques",
        description: "Announce flash sales or clear old inventory with instant discounts."
    }
]

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <LandingHeader />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col items-start text-left">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                    Turn Foot Traffic into Loyal Customers.
                </h1>
                <p className="mt-6 text-base md:text-lg text-muted-foreground">
                    Saledup is the ultimate tool for local businesses to thrive in the digital age. Connect with customers through a simple QR code, launch real-time offers, track engagement, and watch your business grow—no app downloads required.
                </p>
                <div className="mt-8 flex gap-4">
                    <Link href="/login" passHref>
                        <Button size="lg" className="h-12 px-8 text-base">
                            Claim Your Free Account <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                     <Link href="/contact" passHref>
                        <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                            Contact Sales
                        </Button>
                    </Link>
                </div>
            </div>
             <div className="hidden md:block">
                 <Image
                    src="https://res.cloudinary.com/dyov4r11v/image/upload/v1762585069/WhatsApp_Image_2025-11-08_at_12.26.33_9ac0131f_qj21tx.jpg"
                    alt="Saledup engagement illustration"
                    width={1200}
                    height={785}
                    className="rounded-lg"
                />
            </div>
        </section>

        {/* Visualize Your Growth Section */}
        <section className="bg-muted/30 py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-block bg-primary/10 text-primary font-semibold py-1 px-4 rounded-full text-sm mb-4">
                    From Empty to Extraordinary
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Visualize Your Growth
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-muted-foreground text-lg">
                    See the tangible impact Saledup can have on your business, transforming quiet moments into bustling opportunities.
                </p>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Without Saledup Card */}
                     <div className="bg-background/50 rounded-xl p-8 text-center border border-slate-300 dark:border-slate-700 transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1">
                        <style jsx>{`
                            @keyframes fly-around-1 {
                                0% { transform: translate(0, 0) rotate(0deg); opacity: 0.8; }
                                25% { transform: translate(20px, -30px) rotate(90deg); opacity: 1; }
                                50% { transform: translate(-20px, 20px) rotate(-180deg); opacity: 0.7; }
                                75% { transform: translate(10px, 10px) rotate(45deg); opacity: 0.9; }
                                100% { transform: translate(0, 0) rotate(0deg); opacity: 0.8; }
                            }
                            @keyframes fly-around-2 {
                                0% { transform: translate(0, 0) rotate(0deg); opacity: 0.7; }
                                25% { transform: translate(-25px, 25px) rotate(-45deg); opacity: 0.9; }
                                50% { transform: translate(15px, -15px) rotate(120deg); opacity: 1; }
                                75% { transform: translate(-10px, -20px) rotate(270deg); opacity: 0.8; }
                                100% { transform: translate(0, 0) rotate(0deg); opacity: 0.7; }
                            }
                             @keyframes fly-around-3 {
                                0% { transform: translate(0, 0) rotate(0deg); opacity: 0.9; }
                                25% { transform: translate(10px, 30px) rotate(180deg); opacity: 0.8; }
                                50% { transform: translate(-30px, -10px) rotate(0deg); opacity: 1; }
                                75% { transform: translate(20px, -20px) rotate(-90deg); opacity: 0.7; }
                                100% { transform: translate(0, 0) rotate(0deg); opacity: 0.9; }
                            }
                            .fly {
                                position: absolute;
                                width: 4px;
                                height: 4px;
                                background-color: #333;
                                border-radius: 50%;
                                will-change: transform;
                            }
                            .fly-1 { animation: fly-around-1 4s infinite ease-in-out; }
                            .fly-2 { animation: fly-around-2 5s infinite ease-in-out; }
                            .fly-3 { animation: fly-around-3 6s infinite ease-in-out; }
                        `}</style>
                        <h3 className="text-xl font-bold text-muted-foreground">Without Saledup</h3>
                        <div className="my-8 flex items-center justify-center h-32 relative">
                           <div className="p-6 bg-muted rounded-full">
                                <Store className="h-16 w-16 text-muted-foreground/60" />
                           </div>
                           <div className="fly fly-1" style={{ top: '40%', left: '40%' }}></div>
                           <div className="fly fly-2" style={{ top: '60%', left: '60%' }}></div>
                           <div className="fly fly-3" style={{ top: '50%', left: '30%' }}></div>
                        </div>
                        <p className="text-muted-foreground">
                            Waiting for customers and relying on traditional marketing.
                        </p>
                    </div>

                    {/* With Saledup Card */}
                    <div className="border-2 border-primary/50 bg-primary/5 rounded-xl p-8 text-center shadow-lg shadow-primary/10 relative overflow-hidden">
                        <h3 className="text-xl font-bold text-primary">With Saledup</h3>
                         <div className="my-8 flex items-center justify-center h-32 relative">
                            <style jsx>{`
                                @keyframes attract {
                                    0% { transform: translate(var(--start-x), var(--start-y)) scale(0.8); opacity: 0; }
                                    50% { opacity: 1; }
                                    100% { transform: translate(0, 0) scale(1); opacity: 0; }
                                }
                                .attractor {
                                    position: absolute;
                                    animation: attract 3s ease-out infinite;
                                }
                            `}</style>
                            <div className="absolute bg-primary/10 rounded-full h-40 w-40 animate-pulse"></div>
                            <div className="absolute bg-primary/20 rounded-full h-32 w-32"></div>
                            
                            <div className="relative p-6 bg-primary text-primary-foreground rounded-full shadow-md">
                                <ShoppingBag className="h-16 w-16" />
                            </div>

                            <div className="attractor" style={{ '--start-x': '-80px', '--start-y': '-60px', animationDelay: '0s' } as React.CSSProperties}><Users className="h-5 w-5 text-primary" /></div>
                            <div className="attractor" style={{ '--start-x': '80px', '--start-y': '-50px', animationDelay: '0.5s' } as React.CSSProperties}><TrendingUp className="h-5 w-5 text-primary" /></div>
                            <div className="attractor" style={{ '--start-x': '-70px', '--start-y': '60px', animationDelay: '1s' } as React.CSSProperties}><QrCode className="h-5 w-5 text-primary" /></div>
                            <div className="attractor" style={{ '--start-x': '90px', '--start-y': '40px', animationDelay: '1.5s' } as React.CSSProperties}><Users className="h-5 w-5 text-primary" /></div>
                        </div>
                        <p className="text-foreground font-medium">
                            Attracting new customers, rewarding loyal ones, and boosting sales effortlessly.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* Key Features Section */}
        <section className="py-20 sm:py-24">
             <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                 <div className="inline-block bg-primary/10 text-primary font-semibold py-1 px-4 rounded-full text-sm mb-4">
                    Key Features
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Bridge the Digital-Physical Gap
                </h2>
                <p className="mt-4 max-w-3xl mx-auto text-muted-foreground text-lg">
                    Engage customers the moment they walk by. Our platform is designed for simplicity and speed, for both you and your customers.
                </p>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div key={index}
                             className={cn(
                                'bg-background rounded-xl p-6 text-left border border-border shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary'
                             )}>
                            <div className="p-3 bg-primary/10 rounded-lg inline-block mb-4">
                                <feature.icon className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold">{feature.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Who It's For Section */}
        <section className="bg-muted/30 py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-block bg-primary/10 text-primary font-semibold py-1 px-4 rounded-full text-sm mb-4">
                    Who It's For
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Perfect For Every Local Business
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-muted-foreground text-lg">
                    Whether you're selling coffee, clothing, or croissants, Saledup is designed to help your business grow.
                </p>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {targetCustomers.map((customer, index) => (
                         <div key={index}
                             className={cn(
                                'bg-background rounded-xl p-8 text-center border border-border shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary'
                             )}>
                            <div className="p-4 bg-primary/10 rounded-lg inline-block mb-6 shadow-md">
                                <customer.icon className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold">{customer.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground">{customer.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-background py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-block bg-primary/10 text-primary font-semibold py-1 px-4 rounded-full text-sm mb-4">
                    How It Works
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Three Simple Steps
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-muted-foreground text-lg">
                    Go from setup to serving customers in just a few clicks.
                </p>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                    {placeholderImages.howItWorks.map((step, index) => (
                        <div key={index} className="flex flex-col items-center">
                            <div className="relative">
                                <div className="absolute -top-5 -right-5 bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center font-bold text-xl">
                                    {index + 1}
                                </div>
                                <Image
                                    src={step.src}
                                    alt={step.alt}
                                    data-ai-hint={step.hint}
                                    width={600}
                                    height={400}
                                    className="rounded-lg shadow-lg w-full aspect-[3/2] object-cover"
                                />
                            </div>
                            <h3 className="mt-6 text-xl font-bold">{step.title}</h3>
                            <p className="mt-2 text-muted-foreground">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Testimonials Section */}
        <section className="bg-muted/30 py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-block bg-primary/10 text-primary font-semibold py-1 px-4 rounded-full text-sm mb-4">
                    Testimonials
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Loved by Shops and Customers
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-muted-foreground text-lg">
                    Here's what people are saying about Saledup.
                </p>
                <Carousel
                  plugins={[
                    Autoplay({
                      delay: 3000,
                      stopOnInteraction: true,
                      stopOnMouseEnter: true,
                    }),
                  ]}
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full max-w-5xl mx-auto mt-12"
                >
                  <CarouselContent>
                    {placeholderImages.testimonials.map((testimonial, index) => (
                      <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                        <div className="p-1 h-full">
                          <Card className="h-full flex flex-col justify-between border-border shadow-sm hover:border-primary transition-all group">
                             <CardContent className="flex flex-col justify-between items-start gap-6 p-6">
                                <blockquote className="text-muted-foreground italic text-left">
                                    "{testimonial.quote}"
                                </blockquote>
                                <div className="flex items-center">
                                    <Avatar className="h-12 w-12 mr-4">
                                        <AvatarImage src={testimonial.src} alt={testimonial.name} data-ai-hint={testimonial.hint} />
                                        <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-left">{testimonial.name}</p>
                                        <p className="text-sm text-muted-foreground text-left">{testimonial.role}</p>
                                    </div>
                                </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden md:flex" />
                  <CarouselNext className="hidden md:flex" />
                </Carousel>
            </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-background py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
                <div className="inline-block bg-primary/10 text-primary font-semibold py-1 px-4 rounded-full text-sm mb-4">
                    Everything you need to know
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Frequently Asked Questions
                </h2>
                <p className="mt-4 mx-auto text-muted-foreground text-lg">
                    Got questions? We've got answers. If you can't find what you're looking for, feel free to contact us.
                </p>
                
                <Accordion type="single" collapsible className="w-full mt-12 text-left">
                    {placeholderImages.faqs.map((faq, index) => (
                         <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="text-base font-semibold hover:no-underline">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>

                <div className="mt-12">
                     <Link href="/faq" passHref>
                        <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                            View All FAQs <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>

        {/* Final CTA Section */}
        <section className="bg-primary/5 py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Ready to Boost Your Business?
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-muted-foreground text-lg">
                    Join hundreds of local shops that are already seeing growth with Saledup. Get started for free today and see the difference.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                    <Link href="/login" passHref>
                        <Button size="lg" className="h-12 px-8 text-base">
                            Claim Your Free Account <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/contact" passHref>
                        <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                            Contact Sales
                        </Button>
                    </Link>
                </div>
            </div>
        </section>


      </main>
      <LandingFooter />
    </div>
  );
}
