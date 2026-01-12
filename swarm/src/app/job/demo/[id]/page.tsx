'use client';

import { useState } from 'react';
import { Header } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUnits } from 'viem';
import { formatDistanceToNow } from '@/lib/date-utils';
import Link from 'next/link';
import { JobStatus, MNEE_DECIMALS } from '@/lib/constants';
import { useWalletOrDemo } from '@/hooks/use-wallet-or-demo';
import { useToast } from '@/hooks/use-toast';
import { SubmitBidForm } from '@/components/bid';
import { 
  Eye, 
  Clock, 
  Wallet, 
  Users, 
  CheckCircle2, 
  Play, 
  ArrowLeft,
  Sparkles,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoJobDetailPageProps {
  params: { id: string };
}

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  [JobStatus.OPEN]: { 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800', 
    icon: Clock,
    label: 'Open'
  },
  [JobStatus.ASSIGNED]: { 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800', 
    icon: Users,
    label: 'Assigned'
  },
  [JobStatus.IN_PROGRESS]: { 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800', 
    icon: Play,
    label: 'In Progress'
  },
  [JobStatus.COMPLETED]: { 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800', 
    icon: CheckCircle2,
    label: 'Completed'
  },
};

export default function DemoJobDetailPage({ params }: DemoJobDetailPageProps) {
  const { id } = params;
  const { toast } = useToast();
  const [showBidForm, setShowBidForm] = useState(false);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);
  const [, forceUpdate] = useState({});
  
  const { 
    isDemoMode, 
    address, 
    getDemoJob, 
    getDemoSwarm,
    acceptDemoBid,
    startDemoJobExecution,
    completeDemoJob,
  } = useWalletOrDemo();

  const job = getDemoJob(id);

  if (!isDemoMode) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Eye className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Demo Mode Required</h1>
            <p className="text-muted-foreground mb-6">
              Enable demo mode to access this page.
            </p>
            <Link href="/marketplace">
              <Button>Back to Marketplace</Button>
            </Link>
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
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
            <p className="text-muted-foreground mb-6">This demo job doesn&apos;t exist.</p>
            <Link href="/marketplace">
              <Button>Back to Marketplace</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const paymentMnee = formatUnits(BigInt(job.payment), MNEE_DECIMALS);
  const formattedPayment = parseFloat(paymentMnee).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const isJobOwner = address && job.clientAddr.toLowerCase() === address.toLowerCase();
  const statusInfo = statusConfig[job.status] || statusConfig[JobStatus.OPEN];
  const StatusIcon = statusInfo.icon;

  const handleAcceptBid = async (bidId: string) => {
    setAcceptingBid(bidId);
    try {
      await acceptDemoBid(job.id, bidId);
      toast({ 
        title: '✅ Bid accepted!', 
        description: 'The swarm has been assigned to this job.' 
      });
      forceUpdate({});
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error', 
        variant: 'destructive' 
      });
    } finally {
      setAcceptingBid(null);
    }
  };

  const handleStartExecution = async () => {
    try {
      await startDemoJobExecution(job.id);
      toast({ title: '🚀 Execution started!' });
      forceUpdate({});
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleCompleteJob = async () => {
    try {
      await completeDemoJob(job.id);
      toast({ title: '🎉 Job completed!', description: 'Payment has been released.' });
      forceUpdate({});
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Re-fetch job after state changes
  const currentJob = getDemoJob(id) || job;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24 sm:pb-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Back button - Mobile */}
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Marketplace
          </Link>

          {/* Demo Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Demo Job</span>
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            </div>
          </div>

          {/* Job Header Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2">
                  <Badge className={cn("gap-1.5", statusInfo.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </Badge>
                  <h1 className="text-xl sm:text-2xl font-bold">{currentJob.title}</h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Posted {formatDistanceToNow(new Date(currentJob.createdAt))}
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-xl border">
                  <Wallet className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-primary tabular-nums">{formattedPayment}</div>
                    <div className="text-xs text-muted-foreground">MNEE</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{currentJob.description}</p>
              {currentJob.requirements && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Requirements</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentJob.requirements}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bid Submission Section */}
          {currentJob.status === 'OPEN' && !isJobOwner && (
            <>
              {showBidForm ? (
                <SubmitBidForm
                  jobId={id}
                  jobPayment={currentJob.payment}
                  isDemoJob={true}
                  onSuccess={() => {
                    setShowBidForm(false);
                    forceUpdate({});
                  }}
                  onCancel={() => setShowBidForm(false)}
                />
              ) : (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="py-4 sm:py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">Interested in this job?</h3>
                        <p className="text-sm text-muted-foreground">
                          Submit a bid with your swarm.
                        </p>
                      </div>
                      <Button onClick={() => setShowBidForm(true)} className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Place Bid
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Assigned Swarm */}
          {currentJob.swarmId && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Assigned Swarm
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{currentJob.swarmName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getDemoSwarm(currentJob.swarmId)?.agents.length || 0} agents
                    </p>
                  </div>
                  {isJobOwner && currentJob.status === 'ASSIGNED' && (
                    <Button onClick={handleStartExecution} className="gap-2">
                      <Play className="w-4 h-4" />
                      Start
                    </Button>
                  )}
                  {isJobOwner && currentJob.status === 'IN_PROGRESS' && (
                    <Button onClick={handleCompleteJob} className="gap-2 bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Execution Progress */}
          {currentJob.status === 'IN_PROGRESS' && (
            <Card className="border-yellow-200 dark:border-yellow-800 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 animate-pulse" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="w-4 h-4 text-yellow-500" />
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-sm">The swarm is processing your request...</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-yellow-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed */}
          {currentJob.status === 'COMPLETED' && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  Job Completed!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Payment has been released to the swarm.
                </p>
                {currentJob.resultHash && (
                  <code className="mt-2 block text-xs bg-muted p-2 rounded overflow-x-auto">
                    {currentJob.resultHash}
                  </code>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bids Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Bids ({currentJob.bids.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentJob.bids.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    No bids yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentJob.bids.map((bid) => (
                    <div
                      key={bid.id}
                      className={cn(
                        "p-3 sm:p-4 rounded-lg border transition-all",
                        bid.isAccepted 
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/50' 
                          : 'border-border hover:border-primary/30'
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate">{bid.swarmName}</span>
                            {bid.isAccepted && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Accepted
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {bid.estimatedTime}h
                            </span>
                          </div>
                          {bid.message && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{bid.message}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                          <div className="text-right">
                            <div className="font-bold text-lg tabular-nums">
                              {parseFloat(formatUnits(BigInt(bid.price), MNEE_DECIMALS)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-muted-foreground">MNEE</div>
                          </div>
                          {isJobOwner && currentJob.status === 'OPEN' && !bid.isAccepted && (
                            <Button
                              size="sm"
                              onClick={() => handleAcceptBid(bid.id)}
                              disabled={acceptingBid === bid.id}
                              className="gap-1.5"
                            >
                              {acceptingBid === bid.id ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Accept
                                </>
                              )}
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
        </div>
      </main>

      {/* Mobile Fixed Bottom Action */}
      {currentJob.status === 'OPEN' && !isJobOwner && !showBidForm && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur border-t sm:hidden">
          <Button onClick={() => setShowBidForm(true)} className="w-full gap-2">
            <TrendingUp className="w-4 h-4" />
            Place Bid
          </Button>
        </div>
      )}
    </div>
  );
}
