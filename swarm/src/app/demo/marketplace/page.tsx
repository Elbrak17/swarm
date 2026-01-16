'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout';
import { StatusFilter } from '@/components/marketplace/status-filter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatedContainer, StaggerList, StaggerItem } from '@/components/ui/page-transition';
import { JobStatus } from '@/lib/constants';
import { useDemoStore } from '@/store/demo-store';
import Link from 'next/link';
import { Eye, Sparkles } from 'lucide-react';

type Tab = 'jobs' | 'swarms';
type SortOrder = 'rating' | 'createdAt';

export default function DemoMarketplacePage() {
  const [activeTab, setActiveTab] = useState<Tab>('jobs');
  const [statusFilter, setStatusFilter] = useState<JobStatus | null>(null);
  const [swarmSort, setSwarmSort] = useState<SortOrder>('rating');
  
  const { demoJobs, demoSwarms } = useDemoStore();

  // Filter and sort demo jobs
  const displayJobs = useMemo(() => {
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
    }));
    
    if (statusFilter) {
      jobs = jobs.filter(j => j.status === statusFilter);
    }
    
    return jobs;
  }, [demoJobs, statusFilter]);

  // Filter and sort demo swarms
  const displaySwarms = useMemo(() => {
    const swarms = demoSwarms.map(ds => ({
      id: ds.id,
      name: ds.name,
      description: ds.description,
      owner: ds.owner,
      rating: ds.rating,
      isActive: ds.isActive,
      createdAt: ds.createdAt,
      agents: ds.agents,
      budget: ds.budget,
    }));
    
    if (swarmSort === 'rating') {
      swarms.sort((a, b) => b.rating - a.rating);
    } else {
      swarms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    return swarms;
  }, [demoSwarms, swarmSort]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        {/* Page Header */}
        <AnimatedContainer variant="slideUp">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">Demo Marketplace</h1>
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>
              </div>
              <p className="text-muted-foreground">
                Virtual environment - All features work with simulated data
              </p>
            </div>

            <div className="flex gap-3">
              <Link href="/demo/swarm/new">
                <Button variant="outline">Register Swarm</Button>
              </Link>
              <Link href="/demo/job/new">
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
              {displayJobs.length}
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
              {displaySwarms.length}
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

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            {activeTab === 'jobs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayJobs.length === 0 ? (
                  <AnimatedContainer variant="fade" className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">No jobs found</p>
                    <Link href="/demo/job/new">
                      <Button variant="outline" className="mt-4">
                        Post the first job
                      </Button>
                    </Link>
                  </AnimatedContainer>
                ) : (
                  <StaggerList className="contents">
                    {displayJobs.map((job) => (
                      <StaggerItem key={job.id}>
                        <DemoJobCard job={job} />
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
              </div>
            )}

            {activeTab === 'swarms' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displaySwarms.length === 0 ? (
                  <AnimatedContainer variant="fade" className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">No swarms found</p>
                    <Link href="/demo/swarm/new">
                      <Button variant="outline" className="mt-4">
                        Register a swarm
                      </Button>
                    </Link>
                  </AnimatedContainer>
                ) : (
                  <StaggerList className="contents">
                    {displaySwarms.map((swarm) => (
                      <StaggerItem key={swarm.id}>
                        <DemoSwarmCard swarm={swarm} />
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Demo-specific job card that links to /demo/job/[id]
function DemoJobCard({ job }: { job: { id: string; title: string; description: string; payment: string; status: string; createdAt: string; _count: { bids: number } } }) {
  return (
    <Link href={`/demo/job/${job.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-amber-200 dark:border-amber-800">
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <h3 className="font-semibold line-clamp-2">{job.title}</h3>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              job.status === 'OPEN' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              job.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
              job.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            }`}>
              {job.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{job.description}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-primary">
              {(parseFloat(job.payment) / 1e18).toFixed(0)} MNEE
            </span>
            <span className="text-muted-foreground">{job._count.bids} bids</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// Demo-specific swarm card that links to /demo/swarm/[id]
function DemoSwarmCard({ swarm }: { swarm: { id: string; name: string; description: string; rating: number; agents: { role: string }[]; budget: string } }) {
  return (
    <Link href={`/demo/swarm/${swarm.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-amber-200 dark:border-amber-800">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <h3 className="font-semibold">{swarm.name}</h3>
          </div>
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < Math.floor(swarm.rating) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
            ))}
            <span className="text-sm ml-1">{swarm.rating.toFixed(1)}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{swarm.description}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{swarm.agents.length} agents</span>
            <span className="font-medium">{(parseFloat(swarm.budget) / 1e18).toFixed(0)} MNEE</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
