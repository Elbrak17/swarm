'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JobStatus } from '@/lib/constants';
import { formatUnits } from 'viem';
import { formatDistanceToNow } from '@/lib/date-utils';
import { Eye } from 'lucide-react';

interface JobCardProps {
  job: {
    id: string;
    title: string;
    description: string;
    payment: string | { toString(): string };
    status: string;
    createdAt: Date | string;
    bids?: Array<{ id: string }>;
    _count?: { bids: number };
    swarm?: {
      name: string;
    } | null;
  };
  isDemo?: boolean;
}

const statusColors: Record<string, string> = {
  [JobStatus.OPEN]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [JobStatus.ASSIGNED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [JobStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [JobStatus.COMPLETED]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  [JobStatus.DISPUTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function JobCard({ job, isDemo }: JobCardProps) {
  const paymentValue = typeof job.payment === 'string' 
    ? job.payment 
    : job.payment.toString();
  
  const formattedPayment = parseFloat(formatUnits(BigInt(paymentValue), 18)).toFixed(2);
  const createdAt = typeof job.createdAt === 'string' ? new Date(job.createdAt) : job.createdAt;
  const bidCount = job._count?.bids ?? job.bids?.length ?? 0;

  // For demo jobs, link to a special demo job page or handle differently
  const href = isDemo ? `/job/demo/${job.id}` : `/job/${job.id}`;

  return (
    <Link href={href}>
      <Card className={`h-full hover:shadow-md transition-shadow cursor-pointer ${isDemo ? 'border-amber-300 dark:border-amber-700' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {isDemo && (
                <Eye className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
              <CardTitle className="text-lg line-clamp-2">{job.title}</CardTitle>
            </div>
            <Badge className={statusColors[job.status] || 'bg-gray-100'}>
              {job.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {job.description}
          </p>
        </CardContent>
        
        <CardFooter className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
              {formattedPayment}
            </span>
            <span className="text-sm text-muted-foreground">MNEE</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {bidCount > 0 && (
              <span>{bidCount} bid{bidCount !== 1 ? 's' : ''}</span>
            )}
            <span>{formatDistanceToNow(createdAt)}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
