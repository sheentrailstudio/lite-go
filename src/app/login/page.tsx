import { LoginForm } from '@/components/auth/login-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Icons } from '@/components/icons';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Link href="/" className="flex items-center space-x-2">
          <Icons.logo className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">Lite Go</span>
        </Link>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">開始使用</CardTitle>
          <CardDescription>登入以發起或加入團購。</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
