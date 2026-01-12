'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout';
import { JobCard } from '@/components/marketplace/job-card';
import { SwarmCard } from '@/components/marketplace/swarm-card';
import { StatusFilter } from '@/components/marketplace/status-filter';
import { ActivityFeed } from '@/components/marketplace/activity-feed';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { JobCardSkeleton, SwarmCardSkeleton } from '@/components/ui/loading';
import { AnimatedContainer, StaggerList, StaggerItem } from '@/components/ui/page-transition';
import { trpc } from '@/lib/trpc';
import { JobStatus } from '@/lib/constants';
import { useWalletOrDemo } from '@/hooks/use-wallet-or-demo';
import Link from 'next/link';

type Tab = 'jobs' | 'swarms';
type SortOrder = 'rating' | 'createdAt';

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<Tab>('jobs');
  const [statusFilter, setStatusFilter] = useState<JobStatus | null>(null);
  const [swarmSort, setSwarmSort] = useState<SortOrder>('rating');
  
  // Demo mode support with hydration
  const { isDemoMode, demoJobs, demoSwarms, isHydrated } = useWalletOrDemo();

  // Fetch jobs (only when not in demo mode)
  const { data: jobsData, isLoading: jobsLoading } = trpc.job.list.useQuery(
    statusFilter ? { status: statusFilter } : undefined,
    { enabled: activeTab === 'jobs' && !isDemoMode }
  );

  // Fetch swarms (only when not in demo mode)
  const { data: swarmsData, isLoading: swarmsLoading } = trpc.swarm.list.useQuery(
    { orderBy: swarmSort, order: 'desc', isActive: true },
    { enabled: activeTab === 'swarms' && !isDemoMode }
  );

  // Combine real and demo data
  const displayJobs = useMemo(() => {
    if (isDemoMode) {
      // In demo mode, show only demo jobs, filtered by status
      let jobs = demoJobs.map(dj => ({
        id: dj.id,
        title: dj.title,
        description: dj.description,
        requirements: dj.requirements,
        payment: dj.payment,
        status: dj.status,
        clientAddr: dj.clientAddr,
        createdAt: dj.createdAt,
        _count: { bids: dj.bids.length },
        isDemo: true,
      }));
      
      if (statusFilter) {
        jobs = jobs.filter(j => j.status === statusFilter);
      }
      
      return jobs;
    }
    return jobsData?.jobs || [];
  }, [isDemoMode, demoJobs, jobsData, statusFilter]);

  const displaySwarms = useMemo(() => {
    if (isDemoMode) {
      // In demo mode, show only demo swarms
      const swarms = demoSwarms.map(ds => ({
        id: ds.id,
        name: ds.name,
        description: ds.description,
        owner: ds.owner,
        rating: ds.rating,
        isActive: ds.isActive,
        createdAt: ds.createdAt,
        agents: ds.agents,
        isDemo: true,
      }));
      
      // Sort by rating or createdAt
      if (swarmSort === 'rating') {
        swarms.sort((a, b) => b.rating - a.rating);
      } else {
        swarms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      
      return swarms;
    }
    return swarmsData?.swarms || [];
  }, [isDemoMode, demoSwarms, swarmsData, swarmSort]);

  const totalJobs = isDemoMode ? displayJobs.length : (jobsData?.total || 0);
  const totalSwarms = isDemoMode ? displaySwarms.length : (swarmsData?.total || 0);
  const isJobsLoading = !isHydrated || (!isDemoMode && jobsLoading);
  const isSwarmsLoading = !isHydrated || (!isDemoMode && swarmsLoading);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        {/* Page Header */}
        <AnimatedContainer variant="slideUp">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Marketplace</h1>
              <p className="text-muted-foreground mt-1">
                Browse jobs and swarms in the SWARM ecosystem
              </p>
            </div>

            <div className="flex gap-3">
              <Link href="/swarm/new">
                <Button variant="outline">Register Swarm</Button>
              </Link>
              <Link href="/job/new">
                <Button>Post a Job</Button>
              </Link>
            </div>
          </div>
        </AnimatedContainer>

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'jobs'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Jobs
            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
              {totalJobs}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('swarms')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'swarms'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Swarms
            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
              {totalSwarms}
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          {activeTab === 'jobs' && (
            <StatusFilter
              value={statusFilter}
              onChange={setStatusFilter}
            />
          )}
          {activeTab === 'swarms' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select
                value={swarmSort}
                onChange={(e) => setSwarmSort(e.target.value as SortOrder)}
                className="text-sm border rounded-md px-2 py-1 bg-background"
              >
                <option value="rating">Rating</option>
                <option value="createdAt">Newest</option>
              </select>
            </div>
          )}
        </div>

        {/* Content Grid with Activity Feed Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'jobs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isJobsLoading ? (
                  // Loading skeletons with proper job card skeleton
                  Array.from({ length: 6 }).map((_, i) => (
                    <JobCardSkeleton key={i} />
                  ))
                ) : displayJobs.length === 0 ? (
                  <AnimatedContainer variant="fade" className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">No jobs found</p>
                    <Link href="/job/new">
                      <Button variant="outline" className="mt-4">
                        Post the first job
                      </Button>
                    </Link>
                  </AnimatedContainer>
                ) : (
                  <StaggerList className="contents">
                    {displayJobs.map((job) => (
                      <StaggerItem key={job.id}>
                        <JobCard job={job} isDemo={'isDemo' in job && job.isDemo} />
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
              </div>
            )}

            {activeTab === 'swarms' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isSwarmsLoading ? (
                  // Loading skeletons with proper swarm card skeleton
                  Array.from({ length: 6 }).map((_, i) => (
                    <SwarmCardSkeleton key={i} />
                  ))
                ) : displaySwarms.length === 0 ? (
                  <AnimatedContainer variant="fade" className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">No swarms found</p>
                    <Link href="/swarm/new">
                      <Button variant="outline" className="mt-4">
                        Register a swarm
                      </Button>
                    </Link>
                  </AnimatedContainer>
                ) : (
                  <StaggerList className="contents">
                    {displaySwarms.map((swarm) => (
                      <StaggerItem key={swarm.id}>
                        <SwarmCard swarm={swarm} isDemo={'isDemo' in swarm && swarm.isDemo} />
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
              </div>
            )}
          </div>

          {/* Activity Feed Sidebar */}
          <div className="lg:col-span-1">
            <AnimatedContainer variant="slideRight" delay={0.2}>
              <Card className="sticky top-4">
                <CardContent className="pt-6">
                  <ActivityFeed maxItems={8} />
                </CardContent>
              </Card>
            </AnimatedContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
