'use client';

import Link from 'next/link';
import {
  Home,
  PlusCircle,
  Globe,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Icons } from '../icons';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

const navItems = [
  { href: '/dashboard', icon: Home, label: '儀表板' },
  { href: '/public', icon: Globe, label: '公開訂單' },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const homeIsActive = pathname === '/dashboard' || pathname.startsWith('/dashboard/orders') || pathname.startsWith('/dashboard/initiated') || pathname.startsWith('/dashboard/participated');

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-card sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/dashboard"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Icons.logo className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">Lite Go</span>
          </Link>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                    (item.href === '/dashboard' && homeIsActive) || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                      ? 'bg-accent text-accent-foreground'
                      : ''
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href="/dashboard/orders/new">
                        <Button size="icon" className="h-9 w-9 md:h-8 md:w-8 bg-accent text-accent-foreground hover:bg-accent/90">
                            <PlusCircle className="h-5 w-5" />
                            <span className="sr-only">新訂單</span>
                        </Button>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">新訂單</TooltipContent>
            </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
