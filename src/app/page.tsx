import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, PenSquare, Users, Plus } from 'lucide-react';

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {icon}
        </div>
        <h3 className="mb-2 text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
    </div>
);

export default function HomePage() {

  return (
    <div className="w-full bg-background">
      {/* Header */}
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

      <main className="container mx-auto px-4">
        {/* Hero Section */}
        <section className="py-20 text-center md:py-32">
            <div className="mx-auto max-w-4xl">
                <h1 className="mb-4 font-headline text-4xl font-bold tracking-tight md:text-6xl">
                    輕鬆開團購
                    <br />
                    <span className="text-muted-foreground">像點餐一樣簡單</span>
                </h1>
                <p className="mb-8 text-lg text-muted-foreground md:text-xl">
                    直覺、快速、自動化的團購工具
                </p>
                <div className="flex justify-center gap-4">
                    <Button size="lg" asChild>
                    <Link href="/login">
                        <Plus className="mr-2 h-5 w-5" />
                        發起團購
                    </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                    <Link href="/public">
                        <Users className="mr-2 h-5 w-5" />
                        瀏覽團購
                    </Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-24">
             <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">強大功能，輕鬆上手</h2>
              <p className="mb-12 text-lg text-muted-foreground">
                我們設計了一系列強大的功能，讓您告別混亂的訊息和試算表。
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
                <FeatureCard 
                    icon={<PenSquare className="h-6 w-6" />}
                    title="多種建單方式"
                    description="手動新增、圖片菜單轉換（OCR）、網頁連結擷取，選擇最適合你的方式。"
                />
                <FeatureCard 
                    icon={<Clock className="h-6 w-6" />}
                    title="彈性收單條件"
                    description="依時間或金額自動收單，讓團購進度一目了然。"
                />
                <FeatureCard 
                    icon={<Users className="h-6 w-6" />}
                    title="自動統計彙整"
                    description="收單後自動產生統計表，清楚列出每位參與者的明細。"
                />
            </div>
        </section>
      </main>

       {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2024 Lite Go. 讓團購更簡單。
        </div>
      </footer>
    </div>
  );
}
