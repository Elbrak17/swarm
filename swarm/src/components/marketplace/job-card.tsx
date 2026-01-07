'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JobStatus } from '@/lib/constants';
import { formatUnits } from 'viem';
import { formatDistanceToNow } from '@/lib/date-utils';

interface JobCardProps {
  job: {
    id: string;
    title: string;
    description: string;
    payment: string | { toString(): string };
    status: string;
    createdAt: Date | string;
    bids?: Array<{ id: string }>;
    swarm?: {
      name: string;
    } | null;
  };
}

const statusColors: Record<string, string> = {
  [JobStatus.OPEN]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [JobStatus.ASSIGNED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [JobStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [JobStatus.COMPLETED]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  [JobStatus.DISPUTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function JobCard({ job }: JobCardProps) {
  const paymentValue = typeof job.payment === 'string' 
    ? job.payment 
    : job.payment.toString();
  
  const formattedPayment = parseFloat(formatUnits(BigInt(paymentValue), 18)).toFixed(2);
  const createdAt = typeof job.createdAt === 'string' ? new Date(job.createdAt) : job.createdAt;

  return (
    <Link href={`/job/${job.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">{job.title}</CardTitle>
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
            {job.bids && job.bids.length > 0 && (
              <span>{job.bids.length} bid{job.bids.length !== 1 ? 's' : ''}</span>
            )}
            <span>{formatDistanceToNow(createdAt)}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
