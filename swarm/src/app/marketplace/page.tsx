'use client';

import { useState } from 'react';
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
import Link from 'next/link';

type Tab = 'jobs' | 'swarms';
type SortOrder = 'rating' | 'createdAt';

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<Tab>('jobs');
  const [statusFilter, setStatusFilter] = useState<JobStatus | null>(null);
  const [swarmSort, setSwarmSort] = useState<SortOrder>('rating');

  // Fetch jobs
  const { data: jobsData, isLoading: jobsLoading } = trpc.job.list.useQuery(
    statusFilter ? { status: statusFilter } : undefined,
    { enabled: activeTab === 'jobs' }
  );

  // Fetch swarms
  const { data: swarmsData, isLoading: swarmsLoading } = trpc.swarm.list.useQuery(
    { orderBy: swarmSort, order: 'desc', isActive: true },
    { enabled: activeTab === 'swarms' }
  );

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
            {jobsData && (
              <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                {jobsData.total}
              </span>
            )}
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
            {swarmsData && (
              <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                {swarmsData.total}
              </span>
            )}
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
                {jobsLoading ? (
                  // Loading skeletons with proper job card skeleton
                  Array.from({ length: 6 }).map((_, i) => (
                    <JobCardSkeleton key={i} />
                  ))
                ) : jobsData?.jobs.length === 0 ? (
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
                    {jobsData?.jobs.map((job) => (
                      <StaggerItem key={job.id}>
                        <JobCard job={job} />
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
              </div>
            )}

            {activeTab === 'swarms' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {swarmsLoading ? (
                  // Loading skeletons with proper swarm card skeleton
                  Array.from({ length: 6 }).map((_, i) => (
                    <SwarmCardSkeleton key={i} />
                  ))
                ) : swarmsData?.swarms.length === 0 ? (
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
                    {swarmsData?.swarms.map((swarm) => (
                      <StaggerItem key={swarm.id}>
                        <SwarmCard swarm={swarm} />
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
