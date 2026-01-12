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
import { 
  Eye, 
  Star, 
  Users, 
  Briefcase, 
  CheckCircle2, 
  ArrowLeft,
  Sparkles,
  Wallet,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoSwarmDetailPageProps {
  params: { id: string };
}

const roleConfig: Record<string, { color: string; label: string; description: string }> = {
  ROUTER: { 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', 
    label: 'Router',
    description: 'Coordinates and distributes tasks'
  },
  WORKER: { 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', 
    label: 'Worker',
    description: 'Executes assigned tasks'
  },
  QA: { 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', 
    label: 'QA',
    description: 'Validates work quality'
  },
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

  if (!swarm) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Swarm Not Found</h1>
            <p className="text-muted-foreground mb-6">This demo swarm doesn&apos;t exist.</p>
            <Link href="/marketplace">
              <Button>Back to Marketplace</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isOwner = address && swarm.owner.toLowerCase() === address.toLowerCase();
  const budgetMnee = formatUnits(BigInt(swarm.budget), MNEE_DECIMALS);
  const formattedBudget = parseFloat(budgetMnee).toLocaleString('en-US', { maximumFractionDigits: 0 });
  
  // Get jobs assigned to this swarm
  const assignedJobs = demoJobs.filter(j => j.swarmId === swarm.id);
  const completedJobs = assignedJobs.filter(j => j.status === 'COMPLETED');
  const inProgressJobs = assignedJobs.filter(j => j.status === 'IN_PROGRESS');

  // Count agents by role
  const agentsByRole = swarm.agents.reduce((acc, agent) => {
    acc[agent.role] = (acc[agent.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Back button */}
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Marketplace
          </Link>

          {/* Demo Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Demo Swarm</span>
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            </div>
            {isOwner && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                Your Swarm
              </Badge>
            )}
          </div>

          {/* Swarm Header Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold">{swarm.name}</h1>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={cn(
                                "w-4 h-4",
                                i < Math.floor(swarm.rating) 
                                  ? "text-yellow-400 fill-yellow-400" 
                                  : "text-gray-300"
                              )} 
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{swarm.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  {!swarm.isActive && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-xl border">
                  <Wallet className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">{formattedBudget}</div>
                    <div className="text-xs text-muted-foreground">MNEE Budget</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="text-center">
              <CardContent className="pt-4 sm:pt-6 pb-3 sm:pb-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold">{swarm.agents.length}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Agents</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 sm:pt-6 pb-3 sm:pb-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold">{inProgressJobs.length}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">In Progress</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 sm:pt-6 pb-3 sm:pb-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold">{completedJobs.length}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Completed</div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{swarm.description}</p>
            </CardContent>
          </Card>

          {/* Agents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Agents ({swarm.agents.length})
                </span>
                <div className="flex gap-1">
                  {Object.entries(agentsByRole).map(([role, count]) => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {count} {role.toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {swarm.agents.map((agent) => {
                  const roleInfo = roleConfig[agent.role] || roleConfig.WORKER;
                  return (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge className={cn("flex-shrink-0", roleInfo.color)}>
                          {roleInfo.label}
                        </Badge>
                        <div className="min-w-0">
                          <code className="text-xs sm:text-sm font-mono text-muted-foreground truncate block">
                            {agent.address.slice(0, 10)}...{agent.address.slice(-8)}
                          </code>
                          <p className="text-[10px] text-muted-foreground hidden sm:block">{roleInfo.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Jobs */}
          {assignedJobs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Recent Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assignedJobs.slice(0, 5).map((job) => (
                    <Link
                      key={job.id}
                      href={`/job/demo/${job.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate">{job.title}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(job.createdAt))}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2 flex-shrink-0">
                        {job.status === 'COMPLETED' ? 'Completed' : 
                         job.status === 'IN_PROGRESS' ? 'In Progress' : 
                         job.status === 'ASSIGNED' ? 'Assigned' : job.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">ID On-Chain</span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {swarm.onChainId.slice(0, 18)}...
                </code>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Owner</span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {swarm.owner.slice(0, 6)}...{swarm.owner.slice(-4)}
                </code>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="flex items-center gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(swarm.createdAt))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
