'use client';

import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsSkeleton, CardSkeleton } from '@/components/ui/loading';
import { AnimatedContainer, StaggerList, StaggerItem } from '@/components/ui/page-transition';
import { trpc } from '@/lib/trpc';
import { formatUnits } from 'viem';
import { MNEE_DECIMALS } from '@/lib/constants';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

/**
 * Format MNEE amount from wei to human-readable
 */
function formatMnee(weiAmount: string): string {
  try {
    const formatted = formatUnits(BigInt(weiAmount), MNEE_DECIMALS);
    const num = parseFloat(formatted);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toFixed(2);
  } catch {
    return '0';
  }
}

/**
 * Metric Card Component
 */
function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Cost Reduction Highlight Card
 */
function CostReductionCard({ percent }: { percent: number }) {
  return (
    <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      <CardHeader>
        <CardTitle className="text-white">Cost Reduction</CardTitle>
        <CardDescription className="text-indigo-100">
          vs Traditional Support
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-5xl font-bold">{percent}%</div>
        <p className="text-sm text-indigo-100 mt-2">
          AI swarms cost ~$0.60/ticket vs ~$15/ticket for traditional support
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Earnings Chart Component
 */
function EarningsChart({ data }: { data: Array<{ date: string; earnings: string }> }) {
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    earnings: parseFloat(formatUnits(BigInt(item.earnings), MNEE_DECIMALS)),
  }));

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Earnings Over Time</CardTitle>
        <CardDescription>MNEE earned from completed jobs (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value} MNEE`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)} MNEE`, 'Earnings']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="earnings" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Job Stats Chart Component
 */
function JobStatsChart({ data }: { data: Array<{ status: string; count: number }> }) {
  const statusColors: Record<string, string> = {
    OPEN: '#3b82f6',
    ASSIGNED: '#f59e0b',
    IN_PROGRESS: '#8b5cf6',
    COMPLETED: '#22c55e',
    DISPUTED: '#ef4444',
  };

  const chartData = data.map((item) => ({
    status: item.status.replace('_', ' '),
    count: item.count,
    fill: statusColors[item.status] || '#6b7280',
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jobs by Status</CardTitle>
        <CardDescription>Distribution of job statuses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="status" 
                tick={{ fontSize: 12 }}
                width={100}
              />
              <Tooltip 
                formatter={(value: number) => [value, 'Jobs']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Top Swarms Table Component
 */
function TopSwarmsTable({ 
  swarms 
}: { 
  swarms: Array<{
    id: string;
    name: string;
    rating: number;
    completedJobs: number;
    agentCount: number;
    totalEarnings: string;
  }> 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Swarms</CardTitle>
        <CardDescription>Ranked by rating</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {swarms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No swarms yet
            </p>
          ) : (
            swarms.map((swarm, index) => (
              <div 
                key={swarm.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{swarm.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {swarm.agentCount} agents · {swarm.completedJobs} jobs completed
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{swarm.rating.toFixed(1)} ⭐</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMnee(swarm.totalEarnings)} MNEE
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Completion Rate Display Component
 * Shows job completion rate with a visual progress indicator
 */
function CompletionRateDisplay({ 
  completionRate, 
  completedJobs, 
  totalJobs 
}: { 
  completionRate: number;
  completedJobs: number;
  totalJobs: number;
}) {
  // Calculate the stroke dasharray for the circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Completion Rate</CardTitle>
        <CardDescription>Successfully completed jobs</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="hsl(var(--muted))"
              strokeWidth="10"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold">{completionRate}%</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          {completedJobs} of {totalJobs} jobs completed
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Average Completion Time Display Component
 * Shows average time to complete jobs with breakdown
 */
function AvgCompletionTimeDisplay({ 
  avgTime,
  totalCompleted 
}: { 
  avgTime: number;
  totalCompleted: number;
}) {
  // Format time display
  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    }
    if (hours < 24) {
      return `${hours.toFixed(1)} hrs`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours.toFixed(0)}h`;
  };

  // Determine performance indicator
  const getPerformanceIndicator = (hours: number) => {
    if (hours === 0) return { label: 'No data', color: 'text-muted-foreground' };
    if (hours < 1) return { label: 'Excellent', color: 'text-green-600' };
    if (hours < 4) return { label: 'Good', color: 'text-blue-600' };
    if (hours < 24) return { label: 'Average', color: 'text-yellow-600' };
    return { label: 'Slow', color: 'text-red-600' };
  };

  const performance = getPerformanceIndicator(avgTime);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Average Completion Time</CardTitle>
        <CardDescription>Time from job creation to completion</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="text-center">
          <div className="text-4xl font-bold">
            {avgTime > 0 ? formatTime(avgTime) : '—'}
          </div>
          <p className={`text-sm font-medium mt-2 ${performance.color}`}>
            {performance.label}
          </p>
        </div>
        <div className="w-full mt-6 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Jobs analyzed</span>
            <span className="font-medium">{totalCompleted}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard Page
 */
export default function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = trpc.analytics.getDashboardMetrics.useQuery();
  const { data: earningsData, isLoading: earningsLoading } = trpc.analytics.getEarningsOverTime.useQuery({ days: 30 });
  const { data: jobStats, isLoading: jobStatsLoading } = trpc.analytics.getJobStats.useQuery();
  const { data: topSwarms, isLoading: topSwarmsLoading } = trpc.analytics.getTopSwarms.useQuery({ limit: 5 });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        {/* Page Header */}
        <AnimatedContainer variant="slideUp">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Platform metrics and performance insights
            </p>
          </div>
        </AnimatedContainer>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricsLoading ? (
            <>
              <StatsSkeleton />
              <StatsSkeleton />
              <StatsSkeleton />
              <StatsSkeleton />
            </>
          ) : (
            <StaggerList className="contents">
              <StaggerItem>
                <MetricCard
                  title="Total Jobs"
                  value={metrics?.totalJobs || 0}
                  description={`${metrics?.completedJobs || 0} completed`}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  }
                />
              </StaggerItem>
              <StaggerItem>
                <MetricCard
                  title="MNEE Volume"
                  value={`${formatMnee(metrics?.totalMneeVolume || '0')} MNEE`}
                  description="Total transacted"
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </StaggerItem>
              <StaggerItem>
                <MetricCard
                  title="Active Swarms"
                  value={metrics?.activeSwarms || 0}
                  description={`${metrics?.totalAgents || 0} total agents`}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                />
              </StaggerItem>
              <StaggerItem>
                <MetricCard
                  title="Completion Rate"
                  value={`${metrics?.completionRate || 0}%`}
                  description={`Avg ${metrics?.avgCompletionTime || 0}h to complete`}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </StaggerItem>
            </StaggerList>
          )}
        </div>

        {/* Cost Reduction Highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {metricsLoading ? (
            <CardSkeleton className="h-48" />
          ) : (
            <AnimatedContainer variant="scale" delay={0.2}>
              <CostReductionCard percent={metrics?.costReductionPercent || 96} />
            </AnimatedContainer>
          )}
          
          {/* Job Stats Chart */}
          {jobStatsLoading ? (
            <CardSkeleton className="h-48 lg:col-span-2" />
          ) : (
            <AnimatedContainer variant="fade" delay={0.3} className="lg:col-span-2">
              <JobStatsChart data={jobStats || []} />
            </AnimatedContainer>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {earningsLoading ? (
            <CardSkeleton className="h-[380px] col-span-full lg:col-span-2" lines={0} />
          ) : (
            <AnimatedContainer variant="slideUp" delay={0.4}>
              <EarningsChart data={earningsData || []} />
            </AnimatedContainer>
          )}
          
          {/* Top Swarms */}
          {topSwarmsLoading ? (
            <CardSkeleton className="h-[380px]" lines={5} />
          ) : (
            <AnimatedContainer variant="slideRight" delay={0.5}>
              <TopSwarmsTable swarms={topSwarms || []} />
            </AnimatedContainer>
          )}
        </div>

        {/* Performance Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metricsLoading ? (
            <>
              <CardSkeleton className="h-[280px]" />
              <CardSkeleton className="h-[280px]" />
            </>
          ) : (
            <>
              <AnimatedContainer variant="slideUp" delay={0.6}>
                <CompletionRateDisplay 
                  completionRate={metrics?.completionRate || 0}
                  completedJobs={metrics?.completedJobs || 0}
                  totalJobs={metrics?.totalJobs || 0}
                />
              </AnimatedContainer>
              <AnimatedContainer variant="slideUp" delay={0.7}>
                <AvgCompletionTimeDisplay 
                  avgTime={metrics?.avgCompletionTime || 0}
                  totalCompleted={metrics?.completedJobs || 0}
                />
              </AnimatedContainer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
