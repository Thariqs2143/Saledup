'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const googleProvider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const shopDocRef = doc(db, 'shops', user.uid);
      const shopDocSnap = await getDoc(shopDocRef);

      if (shopDocSnap.exists()) {
        // Existing shop owner, redirect to dashboard
        toast({ title: "Login Successful!", description: "Welcome back!" });
        router.push('/admin');
      } else {
        // New shop owner, redirect to complete profile
        await setDoc(shopDocRef, {
            ownerId: user.uid,
            ownerName: user.displayName,
            ownerEmail: user.email,
            createdAt: new Date()
        }, { merge: true });

        toast({ title: "Account Created!", description: "Please complete your shop profile to continue." });
        router.push('/admin/complete-profile');
      }

    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Error during Google Sign-In:", error);
        toast({
          title: "Error",
          description: "Something went wrong during sign-in. Please try again.",
          variant: "destructive",
        });
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      {/* LEFT SIDE - Form Section */}
      <div className="flex flex-col items-center justify-center w-full p-6">
        <div className="w-full max-w-sm space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight leading-tight">
                    Empower Your Local Business with Saledup
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Sign in to connect with customers and grow your sales.
                </p>
            </div>

            <Button
                onClick={handleGoogleSignIn}
                className="w-full bg-[#0C2A6A] hover:bg-[#0C2A6A]/90 h-12 text-base"
                disabled={loading}
            >
                {loading ? (
                    <Loader2 className="mr-2 animate-spin" />
                ) : (
                    <svg role="img" viewBox="0 0 24 24" className="mr-2 h-5 w-5"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.17-2.83-6.17-6.23s2.77-6.23 6.17-6.23c1.87 0 3.13.78 3.88 1.48l2.34-2.34C18.37 1.9 15.48 0 12.48 0 5.88 0 .02 5.88.02 12.48s5.86 12.48 12.46 12.48c3.32 0 6.03-1.14 8.04-3.21 2.07-2.07 2.72-5.04 2.72-7.76v-2.1H12.48z"></path></svg>
                )}
                Continue with Google
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
        </div>
      </div>
      
      {/* RIGHT SIDE - Desktop Image */}
      <div className="relative hidden md:block">
        <Image
          src="https://res.cloudinary.com/dyov4r11v/image/upload/v1762585069/WhatsApp_Image_2025-11-08_at_12.26.33_9ac0131f_qj21tx.jpg"
          alt="Saledup illustration of a local shop thriving"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
