'use client';

import { Header } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUnits } from 'viem';
import { formatDistanceToNow } from '@/lib/date-utils';
import Link from 'next/link';
import { MNEE_DECIMALS } from '@/lib/constants';
import { useWalletOrDemo } from '@/hooks/use-wallet-or-demo';
import { Eye, Star } from 'lucide-react';

interface DemoSwarmDetailPageProps {
  params: { id: string };
}

const roleColors: Record<string, string> = {
  ROUTER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  WORKER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  QA: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function DemoSwarmDetailPage({ params }: DemoSwarmDetailPageProps) {
  const { id } = params;
  const { isDemoMode, address, getDemoSwarm, demoJobs } = useWalletOrDemo();

  const swarm = getDemoSwarm(id);

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

  if (!swarm) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Swarm Non Trouvé</h1>
            <p className="text-muted-foreground mb-6">Ce swarm démo n&apos;existe pas.</p>
            <Link href="/marketplace">
              <Button>Retour au Marketplace</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isOwner = address && swarm.owner.toLowerCase() === address.toLowerCase();
  const budgetMnee = formatUnits(BigInt(swarm.budget), MNEE_DECIMALS);
  
  // Get jobs assigned to this swarm
  const assignedJobs = demoJobs.filter(j => j.swarmId === swarm.id);
  const completedJobs = assignedJobs.filter(j => j.status === 'COMPLETED');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Demo indicator */}
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Swarm Démo</span>
          </div>

          {/* Swarm Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{swarm.name}</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-medium">{swarm.rating.toFixed(1)}</span>
                </div>
                {!swarm.isActive && (
                  <Badge variant="secondary">Inactif</Badge>
                )}
                {isOwner && (
                  <Badge className="bg-primary/10 text-primary">Votre Swarm</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{budgetMnee} MNEE</div>
              <div className="text-sm text-muted-foreground">Budget</div>
            </div>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{swarm.description}</p>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold">{swarm.agents.length}</div>
                <div className="text-sm text-muted-foreground">Agents</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold">{assignedJobs.length}</div>
                <div className="text-sm text-muted-foreground">Jobs Assignés</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold">{completedJobs.length}</div>
                <div className="text-sm text-muted-foreground">Jobs Terminés</div>
              </CardContent>
            </Card>
          </div>

          {/* Agents */}
          <Card>
            <CardHeader>
              <CardTitle>Agents ({swarm.agents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {swarm.agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={roleColors[agent.role] || 'bg-gray-100'}>
                        {agent.role}
                      </Badge>
                      <code className="text-sm font-mono text-muted-foreground">
                        {agent.address.slice(0, 10)}...{agent.address.slice(-8)}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Jobs */}
          {assignedJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Jobs Récents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assignedJobs.slice(0, 5).map((job) => (
                    <Link
                      key={job.id}
                      href={`/job/demo/${job.id}`}
                      className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{job.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(job.createdAt))}
                          </p>
                        </div>
                        <Badge>{job.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID On-Chain</span>
                <code className="font-mono">{swarm.onChainId.slice(0, 18)}...</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Propriétaire</span>
                <code className="font-mono">{swarm.owner.slice(0, 10)}...{swarm.owner.slice(-8)}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créé</span>
                <span>{formatDistanceToNow(new Date(swarm.createdAt))}</span>
              </div>
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
