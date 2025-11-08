
'use client';

import { Building2, Goal, Users, Heart, Lightbulb, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LandingFooter } from '@/components/landing-footer';
import { LandingHeader } from '@/components/landing-header';
import placeholderImages from '@/lib/placeholder-images.json';

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

const values = [
    {
        icon: Zap,
        title: 'Simplicity',
        description: 'We build powerful tools that are intuitive and easy to use. Technology should empower, not complicate.'
    },
    {
        icon: Heart,
        title: 'Community First',
        description: 'Local businesses are the backbone of our communities. Their success is our primary measure of success.'
    },
    {
        icon: Lightbulb,
        title: 'Constant Innovation',
        description: 'We are always exploring new ways to level the playing field and bring cutting-edge digital tools to Main Street.'
    }
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 bg-muted/30">
            <div className="absolute inset-0">
                <Image 
                    src={placeholderImages.about.hero.src}
                    alt={placeholderImages.about.hero.alt}
                    data-ai-hint={placeholderImages.about.hero.hint}
                    fill
                    className="object-cover opacity-10"
                />
            </div>
            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">We're Championing Local Commerce</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Saledup is on a mission to empower local businesses and strengthen community connections by making digital marketing simple, accessible, and effective.
                </p>
            </div>
        </section>

        {/* Our Story Section */}
        <section className="py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
                    <div className="order-2 md:order-1">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-semibold py-1 px-3 rounded-full text-sm mb-4">
                            <Building2 className="h-4 w-4" />
                            Our Story
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-4">From a Local Problem to a Global Solution</h2>
                        <p className="text-muted-foreground space-y-4">
                            Saledup was born from a simple observation: local shop owners are the heart of our communities, but they often lack the easy-to-use digital tools that large corporations have. We saw incredible deals and unique products that weren't reaching customers simply because there was no simple, direct way to announce them.
                            <br/><br/>
                            We decided to build a bridge. A simple, elegant solution that connects brick-and-mortar stores with the smartphone in every customer's pocket—without the friction of app downloads or complicated loyalty programs. Our goal was to level the playing field, one QR code at a time, empowering entrepreneurs to thrive in the digital age.
                        </p>
                    </div>
                    <div className="order-1 md:order-2">
                         <Image 
                            src={placeholderImages.about.story.src}
                            alt={placeholderImages.about.story.alt}
                            data-ai-hint={placeholderImages.about.story.hint}
                            width={600}
                            height={450}
                            className="rounded-lg shadow-lg w-full aspect-[4/3] object-cover"
                        />
                    </div>
                </div>
            </div>
        </section>
        
        {/* Our Mission Section */}
        <section className="py-20 sm:py-24 bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
                     <div>
                         <Image 
                            src={placeholderImages.about.mission.src}
                            alt={placeholderImages.about.mission.alt}
                            data-ai-hint={placeholderImages.about.mission.hint}
                            width={600}
                            height={450}
                            className="rounded-lg shadow-lg w-full aspect-[4/3] object-cover"
                        />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-semibold py-1 px-3 rounded-full text-sm mb-4">
                            <Goal className="h-4 w-4" />
                            Our Mission
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-4">To Make Local Thrive</h2>
                        <p className="text-muted-foreground space-y-4">
                            Our mission is to provide simple, powerful, and affordable digital marketing tools that help local businesses attract customers, increase sales, and build lasting loyalty. We believe that when local businesses succeed, our communities become more vibrant, diverse, and connected. We are committed to championing the local economy by creating a platform where every shop, no matter the size, has a fair chance to shine.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* Our Values Section */}
        <section className="py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl font-bold tracking-tight mb-4">The Principles That Guide Us</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Our values are the foundation of our product and our company.
                </p>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {values.map((value) => (
                         <div key={value.title} className="bg-background rounded-xl p-8 text-center border border-border shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary">
                            <div className="p-4 bg-primary/10 rounded-full inline-block mb-6 shadow-md">
                                <value.icon className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold">{value.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground">{value.description}</p>
                        </div>
                    ))}
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
                    We're a passionate team of technologists, designers, and small business advocates dedicated to your success.
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
