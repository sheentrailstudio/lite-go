'use client';

import { useState, useTransition } from 'react';
import type { Order } from '@/lib/definitions';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { generateSummaryAction, type SummaryGenerationState } from '@/lib/actions';
import { Bot, Loader2, ServerCrash } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export default function SummaryView({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<SummaryGenerationState>();

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateSummaryAction(order);
      setState(result);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 訂單摘要</CardTitle>
        <CardDescription>
          產生此訂單的 Excel 風格摘要，包含每位參與者的項目數量與費用。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!state && (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed border-border bg-card p-8 text-center">
            <Bot className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">準備好產生訂單摘要。</p>
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在產生...
                </>
              ) : (
                '產生摘要'
              )}
            </Button>
          </div>
        )}

        {isPending && !state && (
             <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
        )}

        {state?.error && (
            <Alert variant="destructive">
                <ServerCrash className="h-4 w-4" />
                <AlertTitle>產生失敗</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
        )}

        {state?.summary && (
            <div className="prose prose-sm max-w-none rounded-lg bg-muted/50 p-4 font-mono text-foreground">
                <pre className="whitespace-pre-wrap bg-transparent p-0 m-0">
                    <code>{state.summary}</code>
                </pre>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
