import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShoppingCart, Target, Sparkles } from 'lucide-react';

const Highlight = ({ children }: { children: React.ReactNode }) => (
    <span className="relative inline-block px-2 text-primary font-black italic">
        {children}
        <span className="absolute bottom-1 left-0 -z-10 h-3 w-full bg-primary/10 -rotate-1" />
    </span>
);

export default function HomePage() {
  return (
    <div className="relative min-h-screen selection:bg-primary/20 overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] -z-10 h-[50vw] w-[50vw] rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-5%] -z-10 h-[40vw] w-[40vw] rounded-full bg-accent/5 blur-[100px]" />

      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/5 backdrop-blur-2xl">
        <div className="container mx-auto flex h-20 items-center px-6">
          <Link href="/" className="mr-auto flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <Icons.logo className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Lite Go</span>
          </Link>
          <nav className="flex items-center gap-8">
            <Link href="/login" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors hidden md:block">
                登入帳戶
            </Link>
            <Button asChild size="lg" className="rounded-full px-8 shadow-xl shadow-primary/10">
                <Link href="/login" className="font-bold">立刻開始 <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="pt-32">
        {/* Cinematic Hero */}
        <section className="container mx-auto px-6 py-20 md:py-40 text-center">
            <div className="mx-auto max-w-5xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary mb-10">
                    <Sparkles className="h-3 w-3" /> Group Buy Reimagined
                </div>
                <h1 className="mb-10 font-sans text-6xl font-black tracking-[ -0.06em] leading-[0.9] md:text-9xl">
                    團購，從未如此<br />
                    <Highlight>沈浸與優雅</Highlight>
                </h1>
                <p className="mx-auto mb-16 max-w-2xl text-xl font-medium text-muted-foreground leading-relaxed">
                    擺脫混亂的 LINE 訊息。我們用精密技術與沈浸式設計，讓開團與跟團變成一種純粹的享受。
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                    <Button size="lg" asChild className="h-16 rounded-2xl px-12 text-lg font-black shadow-2xl shadow-primary/20">
                        <Link href="/login">發起新的團購</Link>
                    </Button>
                    <Button size="lg" variant="ghost" asChild className="h-16 rounded-2xl px-12 text-lg font-black hover:bg-muted/50 transition-all">
                        <Link href="/public">探索公開活動</Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Feature Bento Section */}
        <section className="container mx-auto px-6 py-40">
             <div className="grid gap-10 md:grid-cols-3">
                <div className="group col-span-2 rounded-[3rem] border border-white/10 bg-white/50 p-12 backdrop-blur-xl transition-all hover:bg-white/80 dark:bg-card/50">
                    <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                        <ShoppingCart className="h-8 w-8" />
                    </div>
                    <h3 className="mb-4 text-4xl font-black tracking-tighter">智慧匯入引擎</h3>
                    <p className="max-w-md text-lg font-medium text-muted-foreground">
                        不論是複雜的菜單圖片，還是多樣的電商網址。我們的 AI 會自動掃描並轉化為清新的選單。
                    </p>
                </div>
                <div className="rounded-[3rem] border border-white/10 bg-primary p-12 shadow-2xl shadow-primary/20 text-white">
                    <Target className="mb-10 h-16 w-16" />
                    <h3 className="mb-4 text-4xl font-black tracking-tighter">精準數據</h3>
                    <p className="text-lg font-medium opacity-80">
                        一鍵生成 Excel 彙整表，自動追蹤付款狀態。讓團主告別手工對帳的噩夢。
                    </p>
                </div>
             </div>
        </section>
      </main>

      <footer className="border-t py-20 opacity-50">
        <div className="container mx-auto px-6 text-center text-xs font-bold uppercase tracking-widest">
          © 2026 Lite Go. A Sheen Trail Original.
        </div>
      </footer>
    </div>
  );
}
