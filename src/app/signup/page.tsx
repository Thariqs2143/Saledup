
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const googleProvider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const shopDocRef = doc(db, 'shops', user.uid);
      const shopDocSnap = await getDoc(shopDocRef);

      if (shopDocSnap.exists()) {
        toast({ title: 'Login Successful!', description: 'Welcome back!' });
        router.push('/admin');
      } else {
        await setDoc(
          shopDocRef,
          {
            ownerId: user.uid,
            ownerName: user.displayName,
            ownerEmail: user.email,
            ownerImageUrl: user.photoURL,
            createdAt: new Date(),
          },
          { merge: true }
        );
        toast({
          title: 'Account Created!',
          description: 'Please complete your shop profile to continue.',
        });
        router.push('/admin/complete-profile');
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Error during Google Sign-In:', error);
        toast({
          title: 'Error',
          description: 'Something went wrong during sign-in. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const repeatPassword = formData.get('repeat-password') as string;

    if (password !== repeatPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      
      const ownerName = email.split('@')[0];
      await updateProfile(user, { displayName: ownerName });

      const shopDocRef = doc(db, 'shops', user.uid);
      await setDoc(
        shopDocRef,
        {
          ownerId: user.uid,
          ownerName: ownerName,
          ownerEmail: user.email,
          createdAt: new Date(),
        },
        { merge: true }
      );
      
      toast({
        title: 'Account Created!',
        description: 'Please complete your shop profile to continue.',
      });
      router.push('/admin/complete-profile');

    } catch (error: any) {
      console.error('Email sign up error:', error);
      let description = 'An unexpected error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'This email is already in use. Please log in instead.';
      } else if (error.code === 'auth/weak-password') {
        description = 'Password should be at least 6 characters long.';
      }
      toast({
        title: 'Sign Up Failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
       <div className="flex items-center justify-center p-6 py-12 lg:p-10">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Sign Up</h1>
            <p className="text-balance text-muted-foreground">
              Enter your information to create an account
            </p>
          </div>
          <form onSubmit={handleEmailSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
               <div className="relative">
                <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="pr-10"
                />
                <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                >
                {showPassword ? (
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <Eye className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="sr-only">
                    {showPassword ? 'Hide password' : 'Show password'}
                </span>
                </Button>
            </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repeat-password">Repeat Password</Label>
              <div className="relative">
                <Input
                id="repeat-password"
                name="repeat-password"
                type={showRepeatPassword ? 'text' : 'password'}
                required
                className="pr-10"
                />
                <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-0 h-full px-3"
                onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                >
                {showRepeatPassword ? (
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <Eye className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="sr-only">
                    {showRepeatPassword ? 'Hide password' : 'Show password'}
                </span>
                </Button>
            </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                {loading && <Loader2 className="mr-2 animate-spin" />}
              Sign Up
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading || googleLoading}>
              {googleLoading ? (
                  <Loader2 className="mr-2 animate-spin" />
              ) : (
                  <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                      <path
                      fill="currentColor"
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.17-2.83-6.17-6.23s2.77-6.23 6.17-6.23c1.87 0 3.13.78 3.88 1.48l2.34-2.34C18.37 1.9 15.48 0 12.48 0 5.88 0 .02 5.88.02 12.48s5.86 12.48 12.46 12.48c3.32 0 6.03-1.14 8.04-3.21 2.07-2.07 2.72-5.04 2.72-7.76v-2.1H12.48z"
                      ></path>
                  </svg>
              )}
              Sign up with Google
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </div>
      </div>
       <div className="hidden bg-muted lg:block">
        <Image
          src="https://res.cloudinary.com/dyov4r11v/image/upload/v1762585069/WhatsApp_Image_2025-11-08_at_12.26.33_9ac0131f_qj21tx.jpg"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
