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
import { Eye } from 'lucide-react';

interface DemoJobDetailPageProps {
  params: { id: string };
}

const statusColors: Record<string, string> = {
  [JobStatus.OPEN]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [JobStatus.ASSIGNED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [JobStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [JobStatus.COMPLETED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  [JobStatus.DISPUTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
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
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Mode Démo Requis</h1>
            <p className="text-muted-foreground mb-6">
              Cette page est uniquement disponible en mode démo.
            </p>
            <Link href="/marketplace">
              <Button>Retour au Marketplace</Button>
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
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Job Non Trouvé</h1>
            <p className="text-muted-foreground mb-6">Ce job démo n&apos;existe pas.</p>
            <Link href="/marketplace">
              <Button>Retour au Marketplace</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const paymentMnee = formatUnits(BigInt(job.payment), MNEE_DECIMALS);
  const isJobOwner = address && job.clientAddr.toLowerCase() === address.toLowerCase();

  const handleAcceptBid = async (bidId: string) => {
    setAcceptingBid(bidId);
    try {
      await acceptDemoBid(job.id, bidId);
      toast({ 
        title: 'Enchère acceptée! (Démo)', 
        description: 'Le swarm a été assigné à ce job.' 
      });
      forceUpdate({});
    } catch (error) {
      toast({ 
        title: 'Erreur', 
        description: error instanceof Error ? error.message : 'Erreur', 
        variant: 'destructive' 
      });
    } finally {
      setAcceptingBid(null);
    }
  };

  const handleStartExecution = async () => {
    try {
      await startDemoJobExecution(job.id);
      toast({ title: 'Exécution démarrée! (Démo)' });
      forceUpdate({});
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleCompleteJob = async () => {
    try {
      await completeDemoJob(job.id);
      toast({ title: 'Job terminé! (Démo)', description: 'Le paiement a été libéré.' });
      forceUpdate({});
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  // Re-fetch job after state changes
  const currentJob = getDemoJob(id) || job;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Demo indicator */}
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Job Démo</span>
          </div>

          {/* Job Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{currentJob.title}</h1>
              <div className="flex items-center gap-3">
                <Badge className={statusColors[currentJob.status] || 'bg-gray-100 text-gray-800'}>
                  {currentJob.status}
                </Badge>
                <span className="text-muted-foreground">
                  Posté {formatDistanceToNow(new Date(currentJob.createdAt))}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{paymentMnee} MNEE</div>
              <div className="text-sm text-muted-foreground">Paiement</div>
            </div>
          </div>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{currentJob.description}</p>
              {currentJob.requirements && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Exigences</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{currentJob.requirements}</p>
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
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Intéressé par ce job?</h3>
                        <p className="text-sm text-muted-foreground">
                          Soumettez une enchère avec votre swarm.
                        </p>
                      </div>
                      <Button onClick={() => setShowBidForm(true)}>
                        Placer une Enchère
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Assigned Swarm */}
          {currentJob.swarmId && (
            <Card>
              <CardHeader>
                <CardTitle>Swarm Assigné</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{currentJob.swarmName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getDemoSwarm(currentJob.swarmId)?.agents.length || 0} agents
                    </p>
                  </div>
                  {isJobOwner && currentJob.status === 'ASSIGNED' && (
                    <Button onClick={handleStartExecution}>
                      Démarrer l&apos;Exécution
                    </Button>
                  )}
                  {isJobOwner && currentJob.status === 'IN_PROGRESS' && (
                    <Button onClick={handleCompleteJob}>
                      Marquer comme Terminé
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Execution Progress */}
          {currentJob.status === 'IN_PROGRESS' && (
            <Card>
              <CardHeader>
                <CardTitle>Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                    <span>Le job est en cours d&apos;exécution par le swarm...</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed */}
          {currentJob.status === 'COMPLETED' && (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="text-green-600">Job Terminé!</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Le paiement a été libéré au swarm. Hash du résultat: {currentJob.resultHash}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Bids Section */}
          <Card>
            <CardHeader>
              <CardTitle>Enchères ({currentJob.bids.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {currentJob.bids.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Pas encore d&apos;enchères.
                </p>
              ) : (
                <div className="space-y-4">
                  {currentJob.bids.map((bid) => (
                    <div
                      key={bid.id}
                      className={`p-4 rounded-lg border ${bid.isAccepted ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{bid.swarmName}</span>
                            {bid.isAccepted && (
                              <Badge className="bg-green-100 text-green-800">Acceptée</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Est. {bid.estimatedTime}h</span>
                          </div>
                          {bid.message && (
                            <p className="mt-2 text-sm">{bid.message}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-lg">
                            {formatUnits(BigInt(bid.price), MNEE_DECIMALS)} MNEE
                          </div>
                          {isJobOwner && currentJob.status === 'OPEN' && !bid.isAccepted && (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => handleAcceptBid(bid.id)}
                              disabled={acceptingBid === bid.id}
                            >
                              {acceptingBid === bid.id ? 'Acceptation...' : 'Accepter'}
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
              <Button variant="outline">← Retour au Marketplace</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
