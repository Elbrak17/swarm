'use client';

import { Header } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { formatUnits } from 'viem';
import { formatDistanceToNow } from '@/lib/date-utils';
import Link from 'next/link';
import { JobStatus } from '@/lib/constants';
import { PaymentVisualization } from '@/components/swarm';

interface SwarmDetailPageProps {
  params: { id: string };
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${
            i < fullStars
              ? 'text-yellow-400 fill-yellow-400'
              : i === fullStars && hasHalfStar
              ? 'text-yellow-400 fill-yellow-400/50'
              : 'text-gray-300 fill-gray-300'
          }`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-2 text-lg font-medium">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

const roleColors: Record<string, string> = {
  ROUTER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  WORKER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  QA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const statusColors: Record<string, string> = {
  [JobStatus.OPEN]: 'bg-green-100 text-green-800',
  [JobStatus.ASSIGNED]: 'bg-blue-100 text-blue-800',
  [JobStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
  [JobStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
  [JobStatus.DISPUTED]: 'bg-red-100 text-red-800',
};

export default function SwarmDetailPage({ params }: SwarmDetailPageProps) {
  const { id } = params;
  
  const { data: swarm, isLoading, error } = trpc.swarm.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !swarm) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-2">Swarm Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The swarm you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Link href="/marketplace">
              <Button>Back to Marketplace</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const budgetValue = typeof swarm.budget === 'string' 
    ? swarm.budget 
    : swarm.budget.toString();
  const formattedBudget = parseFloat(formatUnits(BigInt(budgetValue), 18)).toFixed(2);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/marketplace" className="hover:text-foreground">
            Marketplace
          </Link>
          <span>/</span>
          <span className="text-foreground">{swarm.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{swarm.name}</h1>
              {!swarm.isActive && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <StarRating rating={swarm.rating} />
            <p className="text-muted-foreground mt-3 max-w-2xl">
              {swarm.description}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {formattedBudget} MNEE
              </div>
              <div className="text-sm text-muted-foreground">Total Budget</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agents */}
            <Card>
              <CardHeader>
                <CardTitle>Agents ({swarm.agents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {swarm.agents.map((agent) => {
                    const earningsValue = typeof agent.earnings === 'string'
                      ? agent.earnings
                      : agent.earnings.toString();
                    const formattedEarnings = parseFloat(
                      formatUnits(BigInt(earningsValue), 18)
                    ).toFixed(2);

                    return (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={roleColors[agent.role]}>
                            {agent.role}
                          </Badge>
                          <span className="font-mono text-sm">
                            {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formattedEarnings} MNEE</div>
                          <div className="text-xs text-muted-foreground">
                            {agent.tasksCompleted} tasks
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Job History */}
            <Card>
              <CardHeader>
                <CardTitle>Job History</CardTitle>
              </CardHeader>
              <CardContent>
                {swarm.jobs && swarm.jobs.length > 0 ? (
                  <div className="space-y-3">
                    {swarm.jobs.map((job) => {
                      const paymentValue = typeof job.payment === 'string'
                        ? job.payment
                        : job.payment.toString();
                      const formattedPayment = parseFloat(
                        formatUnits(BigInt(paymentValue), 18)
                      ).toFixed(2);
                      const createdAt = typeof job.createdAt === 'string'
                        ? new Date(job.createdAt)
                        : job.createdAt;

                      return (
                        <Link key={job.id} href={`/job/${job.id}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{job.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatDistanceToNow(createdAt)}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <Badge className={statusColors[job.status]}>
                                {job.status}
                              </Badge>
                              <span className="font-medium whitespace-nowrap">
                                {formattedPayment} MNEE
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-6">
                    No jobs completed yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Flow Visualization */}
            <Card>
              <CardContent className="pt-6">
                <PaymentVisualization 
                  swarmId={swarm.id} 
                  agents={swarm.agents} 
                />
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Agents</span>
                  <span className="font-medium">{swarm.agents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jobs Completed</span>
                  <span className="font-medium">
                    {swarm.jobs?.filter((j) => j.status === 'COMPLETED').length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Bids</span>
                  <span className="font-medium">
                    {swarm.bids?.filter((b) => !b.isAccepted).length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-medium">{swarm.rating.toFixed(1)} / 5.0</span>
                </div>
              </CardContent>
            </Card>

            {/* Owner Info */}
            <Card>
              <CardHeader>
                <CardTitle>Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-sm break-all">
                  {swarm.owner}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
