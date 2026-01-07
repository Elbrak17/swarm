'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

// ===========================================
// Spinner Component
// ===========================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Animated spinner for loading states
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={cn(
        'rounded-full border-primary border-t-transparent animate-spin',
        sizeClasses[size],
        className
      )}
    />
  );
}

// ===========================================
// Loading Button Content
// ===========================================

interface LoadingButtonContentProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

/**
 * Button content with loading state
 * Use inside Button component for consistent loading states
 */
export function LoadingButtonContent({
  isLoading,
  loadingText,
  children,
}: LoadingButtonContentProps) {
  if (isLoading) {
    return (
      <span className="flex items-center gap-2">
        <Spinner size="sm" />
        {loadingText && <span>{loadingText}</span>}
      </span>
    );
  }
  return <>{children}</>;
}

// ===========================================
// Card Skeleton
// ===========================================

interface CardSkeletonProps {
  className?: string;
  showImage?: boolean;
  lines?: number;
}

/**
 * Skeleton loader for card components
 */
export function CardSkeleton({ className, showImage = false, lines = 3 }: CardSkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-4', className)}>
      {showImage && <Skeleton className="h-40 w-full rounded-md" />}
      <Skeleton className="h-6 w-3/4" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-4', i === lines - 1 ? 'w-1/2' : 'w-full')}
          />
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Job Card Skeleton
// ===========================================

/**
 * Skeleton loader specifically for job cards
 */
export function JobCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

// ===========================================
// Swarm Card Skeleton
// ===========================================

/**
 * Skeleton loader specifically for swarm cards
 */
export function SwarmCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="flex items-center gap-4 pt-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

// ===========================================
// Table Skeleton
// ===========================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * Skeleton loader for table components
 */
export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="border-b bg-muted/50 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b last:border-0 p-4">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================
// Stats Skeleton
// ===========================================

/**
 * Skeleton loader for stats/metrics cards
 */
export function StatsSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-2">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

// ===========================================
// Page Loading
// ===========================================

interface PageLoadingProps {
  message?: string;
}

/**
 * Full page loading state
 */
export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

// ===========================================
// Inline Loading
// ===========================================

interface InlineLoadingProps {
  message?: string;
  className?: string;
}

/**
 * Inline loading indicator
 */
export function InlineLoading({ message, className }: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
      <Spinner size="sm" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

// ===========================================
// Marketplace Grid Skeleton
// ===========================================

interface MarketplaceGridSkeletonProps {
  count?: number;
  type?: 'job' | 'swarm';
}

/**
 * Skeleton loader for marketplace grid
 */
export function MarketplaceGridSkeleton({ count = 6, type = 'job' }: MarketplaceGridSkeletonProps) {
  const SkeletonComponent = type === 'job' ? JobCardSkeleton : SwarmCardSkeleton;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  );
}

// ===========================================
// Dashboard Skeleton
// ===========================================

/**
 * Skeleton loader for dashboard page
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsSkeleton key={i} />
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
