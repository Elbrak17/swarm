'use client';

import { useState } from 'react';
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
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { SubmitBidForm } from '@/components/bid';

interface JobDetailPageProps {
  params: { id: string };
}

const statusColors: Record<string, string> = {
  [JobStatus.OPEN]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [JobStatus.ASSIGNED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [JobStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [JobStatus.COMPLETED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  [JobStatus.DISPUTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = params;
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);
  const [showBidForm, setShowBidForm] = useState(false);

  const { data: job, isLoading, refetch } = trpc.job.getById.useQuery({ id });
  const acceptBidMutation = trpc.job.acceptBid.useMutation({
    onSuccess: () => {
      toast({ title: 'Bid accepted', description: 'The swarm has been assigned to this job.' });
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleAcceptBid = async (bidId: string) => {
    if (!address) {
      toast({ title: 'Error', description: 'Please connect your wallet first', variant: 'destructive' });
      return;
    }
    setAcceptingBid(bidId);
    try {
      await acceptBidMutation.mutateAsync({ jobId: id, bidId, clientAddr: address });
    } finally {
      setAcceptingBid(null);
    }
  };

  const isJobOwner = address && job?.clientAddr?.toLowerCase() === address.toLowerCase();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
            <p className="text-muted-foreground mb-6">The job you&apos;re looking for doesn&apos;t exist.</p>
            <Link href="/marketplace">
              <Button>Back to Marketplace</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const paymentMnee = formatUnits(BigInt(job.payment.toString()), 18);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Job Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
              <div className="flex items-center gap-3">
                <Badge className={statusColors[job.status] || 'bg-gray-100 text-gray-800'}>
                  {job.status}
                </Badge>
                <span className="text-muted-foreground">
                  Posted {formatDistanceToNow(new Date(job.createdAt))}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{paymentMnee} MNEE</div>
              <div className="text-sm text-muted-foreground">Payment</div>
            </div>
          </div>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{job.description}</p>
              {job.requirements && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Requirements</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bid Submission Section */}
          {job.status === JobStatus.OPEN && isConnected && !isJobOwner && (
            <>
              {showBidForm ? (
                <SubmitBidForm
                  jobId={id}
                  jobPayment={job.payment.toString()}
                  onSuccess={() => {
                    setShowBidForm(false);
                    refetch();
                  }}
                  onCancel={() => setShowBidForm(false)}
                />
              ) : (
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Interested in this job?</h3>
                        <p className="text-sm text-muted-foreground">
                          Submit a bid with your swarm to compete for this work.
                        </p>
                      </div>
                      <Button onClick={() => setShowBidForm(true)}>
                        Place Bid
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Prompt to connect wallet */}
          {job.status === JobStatus.OPEN && !isConnected && (
            <Card>
              <CardContent className="py-6">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Connect your wallet to place a bid on this job.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assigned Swarm */}
          {job.swarm && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Swarm</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/swarm/${job.swarm.id}`} className="block hover:bg-muted/50 rounded-lg p-4 -m-4 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{job.swarm.name}</h3>
                      <p className="text-sm text-muted-foreground">{job.swarm.agents?.length || 0} agents</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span>{job.swarm.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Execution Progress */}
          {job.status === JobStatus.IN_PROGRESS && (
            <Card>
              <CardHeader>
                <CardTitle>Execution Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                    <span>Job is being executed by the swarm...</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Real-time progress updates will appear here when connected to Pusher.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bids Section */}
          <Card>
            <CardHeader>
              <CardTitle>Bids ({job.bids?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!job.bids || job.bids.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No bids yet. Swarms can bid on this job while it&apos;s open.
                </p>
              ) : (
                <div className="space-y-4">
                  {job.bids.map((bid) => (
                    <div
                      key={bid.id}
                      className={`p-4 rounded-lg border ${bid.isAccepted ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/swarm/${bid.swarm?.id}`} className="font-semibold hover:underline">
                              {bid.swarm?.name || 'Unknown Swarm'}
                            </Link>
                            {bid.isAccepted && (
                              <Badge className="bg-green-100 text-green-800">Accepted</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="text-yellow-500">★</span>
                              {bid.swarm?.rating?.toFixed(1) || '0.0'}
                            </span>
                            <span>{bid.swarm?.agents?.length || 0} agents</span>
                            <span>Est. {bid.estimatedTime}h</span>
                          </div>
                          {bid.message && (
                            <p className="mt-2 text-sm">{bid.message}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-lg">
                            {formatUnits(BigInt(bid.price.toString()), 18)} MNEE
                          </div>
                          {isJobOwner && job.status === JobStatus.OPEN && !bid.isAccepted && (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => handleAcceptBid(bid.id)}
                              disabled={acceptingBid === bid.id}
                            >
                              {acceptingBid === bid.id ? 'Accepting...' : 'Accept Bid'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Back Link */}
          <div className="pt-4">
            <Link href="/marketplace">
              <Button variant="outline">← Back to Marketplace</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
