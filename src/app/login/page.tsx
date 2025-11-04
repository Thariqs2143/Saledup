'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { IndianFlagIcon } from "@/components/ui/indian-flag-icon";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).recaptchaVerifier && recaptchaContainerRef.current) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
        callback: () => {},
      });
    }
  }, []);

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
      toast({ title: "Error", description: "Please enter a valid 10-digit phone number.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const phoneNumber = `+91${phone}`;
      const phoneLookupRef = doc(db, 'employee_phone_to_shop_lookup', phoneNumber);
      const phoneLookupSnap = await getDoc(phoneLookupRef);

      if (phoneLookupSnap.exists() && phoneLookupSnap.data()?.isAdmin) {
        router.push(`/admin/login?phone=${phone}`);
      } else if (phoneLookupSnap.exists() && !phoneLookupSnap.data()?.isAdmin) {
        toast({
          title: "Employee Account",
          description: "This number is registered as an employee. Please use the 'Login as Employee' button.",
          variant: "destructive",
        });
      } else {
        router.push(`/admin/signup?phone=${phone}`);
      }
    } catch (error) {
      console.error("Error during owner check:", error);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background">
      {/* LEFT SIDE — Image */}
      <div className="relative hidden md:block">
        <Image
          src="https://res.cloudinary.com/dnkghymx5/image/upload/v1762241011/Generated_Image_November_04_2025_-_12_50PM_1_hslend.png"
          alt="Attendry illustration"
          fill
          className="object-cover object-center"
          priority
        />
      </div>
  
      {/* RIGHT SIDE — Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          {/* For mobile, show image on top */}
          <div className="md:hidden mb-8">
            <Image
              src="https://res.cloudinary.com/dnkghymx5/image/upload/v1762241011/Generated_Image_November_04_2025_-_12_50PM_1_hslend.png"
              alt="Attendry illustration"
              width={600}
              height={400}
              className="w-full h-auto object-contain"
            />
          </div>
  
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              India’s #1 QR Powered Staff Attendance App
            </h1>
            <div className="flex items-center my-4">
              <hr className="w-full border-muted-foreground/20" />
              <span className="px-4 text-muted-foreground font-semibold whitespace-nowrap text-sm">
                LOG IN OR SIGN UP
              </span>
              <hr className="w-full border-muted-foreground/20" />
            </div>
          </div>
  
          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleOwnerLogin}>
            <div className="flex items-center gap-2 border border-input rounded-md px-3 bg-transparent">
              <IndianFlagIcon />
              <span className="text-sm font-medium text-muted-foreground">+91</span>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                required
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                pattern="\d{10}"
                title="Please enter a 10-digit phone number"
              />
            </div>
  
            <Button
              type="submit"
              className="w-full bg-[#0C2A6A] hover:bg-[#0C2A6A]/90"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 animate-spin" />}
              Continue
            </Button>
          </form>
  
          <div className="flex items-center my-8">
            <hr className="w-full" />
            <span className="px-4 text-muted-foreground font-medium">OR</span>
            <hr className="w-full" />
          </div>
  
          <Link href="/employee/login" className="w-full">
            <Button variant="outline" className="w-full">
              Login as Employee
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
  
}
