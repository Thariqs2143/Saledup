
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LandingFooter } from "@/components/landing-footer";
import { LandingHeader } from "@/components/landing-header";
import { Building, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React from "react";

export default function ContactPage() {
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "Message Sent!",
            description: "Thanks for reaching out. We'll get back to you shortly.",
        });
        // In a real app, you would handle form submission here.
        (e.target as HTMLFormElement).reset();
    };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-1">
        {/* Contact Hero */}
        <section className="py-20 text-center bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Get in Touch</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    We'd love to hear from you. Whether you have a question about features, pricing, or anything else, our team is ready to answer all your questions.
                </p>
            </div>
        </section>
        
        {/* Contact Form and Info */}
        <section className="py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-12 lg:gap-24">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold">Contact Information</h2>
                            <p className="text-muted-foreground mt-1">Find us at our office or drop us a line via email or phone.</p>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                    <Building className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Our Office</h3>
                                    <p className="text-muted-foreground">123 Business Rd, Commerce City, 12345</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Email Us</h3>
                                    <p className="text-muted-foreground">support@saledup.com</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                    <Phone className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Call Us</h3>
                                    <p className="text-muted-foreground">+91 12345 67890</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div>
                         <div>
                            <h2 className="text-2xl font-bold">Send us a Message</h2>
                            <p className="text-muted-foreground mt-1">Fill out the form and we'll get back to you.</p>
                        </div>
                        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" required />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea id="message" required rows={5} />
                            </div>
                            <div>
                                <Button type="submit" className="w-full sm:w-auto">Send Message</Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
