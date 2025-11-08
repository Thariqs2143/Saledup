
'use client';

import { Building2, Goal, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LandingFooter } from '@/components/landing-footer';
import { LandingHeader } from '@/components/landing-header';

const teamMembers = [
  {
    name: 'Aarav Sharma',
    role: 'Founder & CEO',
    avatar: 'https://picsum.photos/seed/aarav/100/100',
    hint: 'man portrait suit',
  },
  {
    name: 'Diya Patel',
    role: 'Head of Product',
    avatar: 'https://picsum.photos/seed/diya/100/100',
    hint: 'woman portrait glasses',
  },
  {
    name: 'Rohan Joshi',
    role: 'Lead Engineer',
    avatar: 'https://picsum.photos/seed/rohan/100/100',
    hint: 'man smiling',
  },
  {
    name: 'Isha Nair',
    role: 'Marketing Lead',
    avatar: 'https://picsum.photos/seed/isha/100/100',
    hint: 'woman smiling',
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">About Saledup</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    We're on a mission to empower local businesses and strengthen community commerce.
                </p>
            </div>
        </section>

        {/* Our Story & Mission Section */}
        <section className="py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-semibold py-1 px-3 rounded-full text-sm mb-4">
                            <Building2 className="h-4 w-4" />
                            Our Story
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-4">From a Local Problem to a Global Solution</h2>
                        <p className="text-muted-foreground space-y-4">
                            <span>Saledup was born from a simple observation: local shop owners are the heart of our communities, but they often lack the easy-to-use digital tools that large corporations have. We saw incredible deals and unique products that weren't reaching customers simply because there was no simple, direct way to announce them.</span>
                            <span>We decided to build a bridge. A simple, elegant solution that connects brick-and-mortar stores with the smartphone in every customer's pocket—without the friction of app downloads or complicated loyalty programs. Our goal was to level the playing field, one QR code at a time.</span>
                        </p>
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-semibold py-1 px-3 rounded-full text-sm mb-4">
                            <Goal className="h-4 w-4" />
                            Our Mission
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-4">To Make Local Thrive</h2>
                        <p className="text-muted-foreground space-y-4">
                            Our mission is to provide simple, powerful, and affordable digital marketing tools that help local businesses attract customers, increase sales, and build lasting loyalty. We believe that when local businesses succeed, our communities become more vibrant and connected. We are committed to championing the local economy in the digital age.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* Our Team Section */}
        <section className="bg-muted/30 py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-semibold py-1 px-3 rounded-full text-sm mb-4">
                    <Users className="h-4 w-4" />
                    Our Team
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">The People Behind the Platform</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    We're a passionate team of technologists, designers, and small business advocates.
                </p>
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {teamMembers.map((member) => (
                        <div key={member.name} className="text-center">
                            <Avatar className="h-24 w-24 mx-auto mb-4 border-2 border-primary/50">
                                <AvatarImage src={member.avatar} alt={member.name} data-ai-hint={member.hint} />
                                <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <h3 className="font-bold text-lg">{member.name}</h3>
                            <p className="text-muted-foreground">{member.role}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

         {/* Join Us CTA */}
        <section className="py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Join Our Growing Community</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Be part of a movement that's revitalizing local economies across the country.
                </p>
                <div className="mt-8">
                    <Button asChild size="lg">
                        <Link href="/pricing">View Plans & Get Started</Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
