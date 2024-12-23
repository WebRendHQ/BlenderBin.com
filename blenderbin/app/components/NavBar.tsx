'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../lib/firebase-client';
import { User } from 'firebase/auth';
import { loadStripe } from '@stripe/stripe-js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import '../css/navbar.css'; // Make sure to create this file in the same directory

interface SubscriptionStatus {
  isSubscribed: boolean;
  priceId?: string;
}

export default function NavBar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        // Check subscription status
        const response = await fetch(`/api/subscription/status?userId=${user.uid}`);
        const data = await response.json();
        setSubscriptionStatus(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      await fetch('/api/auth/session', { method: 'DELETE' });
      router.refresh();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCheckout = async () => {
    try {
      if (!user?.uid) {
        console.error('No user ID found');
        return;
      }
  
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || '',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (!data.sessionId) {
        throw new Error('No session ID returned');
      }
  
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }
  
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });
  
      if (error) {
        console.error('Stripe redirect error:', error);
      }
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  const handleRedownload = () => {
    window.location.href = `/api/download?userId=${user?.uid}`;
  };

  if (loading) {
    return <div className="navbar-loading">Loading...</div>;
  }

  return (
    <>
      <div className="navbar-spacer"></div>
      
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-content">
            <div className="navbar-left">
              <Link href="/" className="navbar-logo">
                BlenderBin
              </Link>
              <Link
                href="/library"
                className="navbar-link"
              >
                Addon Library
              </Link>
            </div>
          </div>
          
        </div>
        <div className="navbar-right">
          {user ? (
            <>
              {/* <span className="navbar-email">{user.email}</span> */}
              {subscriptionStatus.isSubscribed ? (
                <button
                  onClick={handleRedownload}
                  className="navbar-button navbar-button-green"
                >
                  Re-download
                </button>
              ) : (
                <button
                  onClick={() => setModalOpen(true)}
                  className="navbar-button navbar-button-blue"
                >
                  Get Started
                </button>
              )}
              <button
                onClick={handleLogout}
                className="navbar-button navbar-button-red"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="navbar-button navbar-button-indigo"
            >
              Sign In / Sign Up
            </Link>
          )}
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Subscribe to Our Product</DialogTitle>
              <DialogDescription>
                Get access to our premium boilerplate and start building amazing applications today!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-gray-500">
                <h3 className="font-medium text-gray-900">What is included:</h3>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                  <li>Complete Next.js 14 boilerplate with App Router</li>
                  <li>Firebase Authentication integration</li>
                  <li>Stripe subscription setup</li>
                  <li>Tailwind CSS and shadcn/ui components</li>
                  <li>TypeScript configuration</li>
                  <li>Free updates and support</li>
                </ul>
              </div>
              <div className="text-lg font-semibold">
                Price: $49.99/one-time
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  handleCheckout();
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Purchase Now
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </nav>
    </>
  );
}