'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (isUserLoading || !user || !firestore) {
      return;
    }

    const userRef = doc(firestore, 'users', user.uid);

    getDoc(userRef).then(userSnap => {
      if (!userSnap.exists()) {
        const newUserProfile = {
          id: user.uid,
          name: user.displayName || '新用戶',
          email: user.email,
          avatarUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
          createdAt: new Date().toISOString(),
        };
        // Use non-blocking write to create user profile in the background
        setDocumentNonBlocking(userRef, newUserProfile, {});
      }
    }).catch(error => {
      console.error("Error checking for user profile:", error);
    });

  }, [user, isUserLoading, firestore]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <AppHeader />
        <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
