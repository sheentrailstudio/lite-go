'use client';

import { useRouter } from 'next/navigation';
import { signInAnonymously } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';
import { User as UserIcon } from 'lucide-react';
import { useEffect } from 'react';

export function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);


  const handleAnonymousSignIn = async () => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "錯誤",
            description: "Firebase 驗證服務未初始化。",
        });
        return;
    }
    try {
      await signInAnonymously(auth);
      toast({
        title: '登入成功',
        description: '歡迎！正在將您導向儀表板...',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Anonymous sign-in error:", error);
      toast({
        variant: "destructive",
        title: "登入失敗",
        description: error.message || "無法匿名登入，請稍後再試。",
      });
    }
  };

  return (
    <div className="grid gap-4">
      <Button onClick={handleAnonymousSignIn} className="w-full">
        <UserIcon className="mr-2 h-5 w-5" />
        匿名登入以繼續
      </Button>
       <p className="text-center text-sm text-muted-foreground">
        或以訪客身份繼續...
      </p>
       <Button variant="link" className="p-0 h-auto" type="button" onClick={() => router.push('/public')}>
          瀏覽公開訂單
        </Button>
    </div>
  );
}
