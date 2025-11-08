
'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, type User as AuthUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}


export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const [loading, setLoading] = useState(false);
    const [isNewUser, setIsNewUser] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const otpInputsRef = useRef<HTMLInputElement[]>([]);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

     useEffect(() => {
        const phoneFromQuery = searchParams.get('phone');
        const newUserFlag = searchParams.get('isNewUser');

        if (!phoneFromQuery) {
            router.push('/login');
            return;
        }
        setPhone(phoneFromQuery);
        setIsNewUser(newUserFlag === 'true');

        const setupRecaptcha = () => {
            if (!recaptchaVerifierRef.current && recaptchaContainerRef.current) {
                const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                    'size': 'invisible',
                    'callback': () => {},
                });
                recaptchaVerifierRef.current = verifier;
                verifier.render().then(() => {
                    handleGetOtp(phoneFromQuery, verifier);
                }).catch(error => {
                    console.error("reCAPTCHA render error:", error);
                    toast({ title: "reCAPTCHA Error", description: "Could not initialize reCAPTCHA. Please refresh the page.", variant: "destructive"});
                });
            } else if (recaptchaVerifierRef.current) {
                 handleGetOtp(phoneFromQuery, recaptchaVerifierRef.current);
            }
        };
        
        const timeoutId = setTimeout(setupRecaptcha, 100);

        return () => clearTimeout(timeoutId);
    }, [searchParams, router, toast]);


    const handleGetOtp = async (phoneNum: string, appVerifier: RecaptchaVerifier) => {
        if (!/^\d{10}$/.test(phoneNum)) {
            toast({ title: "Error", description: "Invalid phone number.", variant: "destructive" });
            return;
        }
        setLoading(true);
        
        try {
            const phoneNumber = `+91${phoneNum}`;
            const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(result);
            toast({ title: "OTP Sent!", description: `An OTP has been sent to ${phoneNumber}.` });
        } catch (error) {
            console.error("Error sending OTP:", error);
            toast({ title: "Error", description: "Failed to send OTP. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const handleVerifyAndProceed = async (e: React.FormEvent) => {
        e.preventDefault();
        const enteredOtp = otp.join('');
        if (enteredOtp.length !== 6) {
            toast({ title: "Error", description: "Please enter a valid 6-digit OTP.", variant: "destructive" });
            return;
        }
        if (!confirmationResult) {
            toast({ title: "Error", description: "Confirmation result not found. Please try sending OTP again.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const result = await confirmationResult.confirm(enteredOtp);
            const user = result.user;

            if (isNewUser) {
                // New user logic: create records and redirect to complete profile
                const phoneNumber = `+91${phone}`;
                const batch = writeBatch(db);

                const userDocRef = doc(db, "users", user.uid);
                batch.set(userDocRef, { 
                    uid: user.uid,
                    phone: phoneNumber,
                    role: 'Admin',
                    isProfileComplete: false,
                    joinDate: new Date().toISOString().split('T')[0],
                });

                const shopDocRef = doc(db, "shops", user.uid);
                batch.set(shopDocRef, {
                    ownerId: user.uid,
                    status: 'active',
                });

                const phoneLookupRef = doc(db, 'employee_phone_to_shop_lookup', phoneNumber);
                batch.set(phoneLookupRef, { 
                    shopId: user.uid, 
                    employeeDocId: user.uid, 
                    isAdmin: true, 
                    isProfileComplete: false 
                });

                await batch.commit();
                
                localStorage.setItem('adminUID', user.uid);
                localStorage.setItem('adminPhone', phoneNumber);
                
                toast({ title: "Account Created!", description: "Please complete your shop profile to continue." });
                router.push('/admin/complete-profile');
            } else {
                // Existing user logic: just log them in
                const phoneLookupRef = doc(db, "employee_phone_to_shop_lookup", user.phoneNumber!);
                const phoneLookupSnap = await getDoc(phoneLookupRef);
                const lookupData = phoneLookupSnap.data();

                if (lookupData?.isProfileComplete) {
                    toast({ title: "Login Successful!", description: "Redirecting to dashboard..." });
                    router.push('/admin');
                } else {
                    localStorage.setItem('adminUID', user.uid);
                    localStorage.setItem('adminPhone', user.phoneNumber!);
                    toast({ title: "Welcome Back!", description: "Please complete your shop profile." });
                    router.push('/admin/complete-profile');
                }
            }
        } catch (error) {
            console.error("Error verifying OTP:", error);
            toast({ title: "Error", description: "Invalid OTP. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    const handleOtpChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            otpInputsRef.current[index + 1]?.focus();
        }
    };
    
    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputsRef.current[index - 1]?.focus();
        }
    }
    
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d{6}$/.test(pastedData)) {
            const newOtp = pastedData.split('');
            setOtp(newOtp);
            otpInputsRef.current[5]?.focus();
        }
    };

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <div ref={recaptchaContainerRef} className="hidden"></div>
      
      {/* LEFT SIDE - Desktop Image */}
      <div className="relative hidden md:block">
        <Image
          src="https://res.cloudinary.com/dyov4r11v/image/upload/v1762585069/WhatsApp_Image_2025-11-08_at_12.26.33_9ac0131f_qj21tx.jpg"
          alt="Attendry illustration"
          fill
          className="object-cover"
          priority
        />
      </div>

       {/* RIGHT SIDE - Form Section */}
      <main className="flex flex-col items-center justify-center">
        {/* TOP IMAGE for Mobile */}
        <div className="md:hidden w-full relative">
            <Image
                src="https://res.cloudinary.com/dyov4r11v/image/upload/v1762585069/WhatsApp_Image_2025-11-08_at_12.26.33_9ac0131f_qj21tx.jpg"
                alt="Attendry illustration"
                width={800}
                height={600}
                className="w-full h-auto object-contain"
                priority
            />
        </div>
        
        {/* FORM CARD */}
        <div className="w-full max-w-sm space-y-6 p-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight leading-tight">
                    India’s #1 QR Powered Staff Attendance App
                </h1>
                <div className="flex items-center my-4">
                    <hr className="w-full border-muted-foreground/20" />
                    <span className="px-4 text-muted-foreground font-semibold whitespace-nowrap text-sm">
                    ENTER OTP
                    </span>
                    <hr className="w-full border-muted-foreground/20" />
                </div>
            </div>

            <form className="space-y-6" onSubmit={handleVerifyAndProceed}>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                    {otp.map((digit, index) => (
                        <Input
                            key={index}
                            ref={el => otpInputsRef.current[index] = el!}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-12 h-14 text-center text-2xl font-semibold rounded-lg"
                            required
                        />
                    ))}
                </div>

                <Button type="button" variant="link" size="sm" className="p-0 h-auto text-primary" onClick={() => router.push('/login')}>
                    Use a different phone number
                </Button>

                <Button type="submit" className="w-full !mt-8 bg-[#0C2A6A] hover:bg-[#0C2A6A]/90" disabled={loading}>
                    {loading && <Loader2 className="mr-2 animate-spin" />}
                    Verify OTP
                </Button>
            </form>

            <div className="flex items-center my-8">
                <hr className="w-full" />
                <span className="px-4 text-muted-foreground font-medium">OR</span>
                <hr className="w-full" />
            </div>

            <Link href="/employee/login" className="w-full">
                <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/5">
                    Login as Employee
                </Button>
            </Link>
        </div>
      </main>
    </div>
  );
}
