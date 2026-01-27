import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { ArrowRight } from 'lucide-react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Icons.logo className="h-6 w-6 text-primary" />
            <span className="font-bold">Lite Go</span>
          </Link>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center">
              <Button variant="ghost" asChild>
                  <Link href="/login">登入</Link>
              </Button>
              <Button asChild>
                  <Link href="/login">開始使用 <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto flex-1 items-start gap-4 p-4 sm:px-6 sm:py-8 md:gap-8">
          {children}
      </main>
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2024 Lite Go. 讓團購更簡單。
        </div>
      </footer>
    </div>
  );
}
