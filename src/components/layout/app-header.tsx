'use client';

import Link from 'next/link';
import {
  Home,
  PanelLeft,
  Settings,
  PlusCircle,
  Globe,
  LogOut,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { usePathname, useRouter } from 'next/navigation';
import { Icons } from '../icons';
import { cn } from '@/lib/utils';
import { useAuth, useUser } from '@/firebase';

const navItems = [
  { href: '/dashboard', icon: Home, label: '儀表板' },
  { href: '/public', icon: Globe, label: '公開訂單' },
];

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard/orders/new')) return '建立新訂單';
  if (pathname.startsWith('/dashboard/orders/')) return '訂單詳情';
  if (pathname.startsWith('/public')) return '公開訂單';
  if (pathname.startsWith('/dashboard/initiated')) return '我發起的訂單';
  if (pathname.startsWith('/dashboard/participated')) return '我參與的訂單';
  if (pathname.startsWith('/dashboard')) return '我的訂單';
  return 'Lite Go';
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = getPageTitle(pathname);
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
    router.push('/');
  };

  const homeIsActive = pathname === '/dashboard' || pathname.startsWith('/dashboard/orders') || pathname.startsWith('/dashboard/initiated') || pathname.startsWith('/dashboard/participated');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">切換菜單</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Icons.logo className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">Lite Go</span>
            </Link>
            {navItems.map(item => (
               <Link
                key={item.href}
                href={item.href}
                className={cn("flex items-center gap-4 px-2.5", 
                  (item.href === '/dashboard' && homeIsActive) || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <Link
              href="/dashboard/orders/new"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <PlusCircle className="h-5 w-5" />
              新訂單
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex-1">
        <h1 className="font-headline text-xl font-semibold">{pageTitle}</h1>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
            disabled={isUserLoading}
          >
            <Avatar>
              {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />}
              <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user?.displayName || '我的帳戶'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            設定
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            登出
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
