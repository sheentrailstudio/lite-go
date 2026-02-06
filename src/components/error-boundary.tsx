'use client';

import React, { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Industrial-grade Error Boundary with:
 * - Graceful error recovery
 * - Error logging hooks
 * - User-friendly error UI
 * - Animation support
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Here you could send to error tracking service (Sentry, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex min-h-[400px] items-center justify-center p-8"
          >
            <Card className="max-w-md w-full border-destructive/20 shadow-lg">
              <CardHeader className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                  className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center"
                >
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </motion.div>
                <div>
                  <CardTitle className="text-xl">發生錯誤</CardTitle>
                  <CardDescription className="mt-2">
                    抱歉，系統遇到了一個問題。請重試或返回首頁。
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-32"
                  >
                    <p className="text-destructive font-semibold mb-2">
                      {this.state.error.name}: {this.state.error.message}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-muted-foreground whitespace-pre-wrap text-[10px]">
                        {this.state.errorInfo.componentStack.slice(0, 500)}...
                      </pre>
                    )}
                  </motion.div>
                )}
              </CardContent>
              <CardFooter className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard'}
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  返回首頁
                </Button>
                <Button onClick={this.handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  重試
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </AnimatePresence>
      );
    }

    return this.props.children;
  }
}

/**
 * Async Error Boundary Wrapper with Suspense integration
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
