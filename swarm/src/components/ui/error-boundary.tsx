'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/errors';

// ===========================================
// Error Boundary Props and State
// ===========================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback component to render when an error occurs */
  fallback?: ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show a retry button */
  showRetry?: boolean;
  /** Custom retry handler */
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ===========================================
// Error Fallback Component
// ===========================================

interface ErrorFallbackProps {
  error: Error | null;
  onRetry?: () => void;
  showRetry?: boolean;
}

/**
 * Default error fallback UI
 * Requirements: 12.1, 12.2 - Display user-friendly error messages with retry options
 */
function ErrorFallback({ error, onRetry, showRetry = true }: ErrorFallbackProps) {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Something went wrong
          </CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}
          {showRetry && onRetry && (
            <Button onClick={onRetry} className="w-full">
              Try Again
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================
// Error Boundary Component
// ===========================================

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 * 
 * Requirements: 12.1, 12.2
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error
    logError(error, 'ErrorBoundary');
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Render default fallback
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          showRetry={this.props.showRetry}
        />
      );
    }

    return this.props.children;
  }
}

// ===========================================
// Hook for Error Boundary Reset
// ===========================================

/**
 * Custom hook to reset error boundary from child components
 * Usage: const resetError = useErrorBoundaryReset();
 */
export function useErrorBoundaryReset(): () => void {
  return () => {
    // This is a placeholder - in a real implementation,
    // you would use a context to communicate with the ErrorBoundary
    window.location.reload();
  };
}

// ===========================================
// Async Error Boundary Wrapper
// ===========================================

interface AsyncBoundaryProps {
  children: ReactNode;
  /** Loading component to show while loading */
  loading?: ReactNode;
  /** Error component to show on error */
  error?: ReactNode;
}

/**
 * Async Boundary Component
 * 
 * Combines ErrorBoundary with Suspense for async components.
 * Use this for components that fetch data or use lazy loading.
 */
export function AsyncBoundary({ children, loading, error }: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={error}>
      <React.Suspense fallback={loading || <DefaultLoadingFallback />}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

/**
 * Default loading fallback
 */
function DefaultLoadingFallback() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>Loading...</span>
      </div>
    </div>
  );
}

export default ErrorBoundary;
