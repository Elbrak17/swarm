/**
 * JobProgress Component
 * 
 * Displays real-time job execution progress with:
 * - Progress bar
 * - Stage indicator
 * - Current agent activity
 */

'use client';

import { useJobProgress } from '@/hooks/use-job-progress';
import { cn } from '@/lib/utils';

interface JobProgressProps {
  jobId: string;
  className?: string;
}

/**
 * Stage configuration with labels and colors
 */
const STAGES = {
  routing: {
    label: 'Routing',
    description: 'Analyzing request and routing to appropriate agent',
    color: 'bg-blue-500',
    icon: '🔀',
  },
  processing: {
    label: 'Processing',
    description: 'Worker agent processing the task',
    color: 'bg-yellow-500',
    icon: '⚙️',
  },
  qa: {
    label: 'Quality Assurance',
    description: 'QA agent reviewing the output',
    color: 'bg-purple-500',
    icon: '✅',
  },
  complete: {
    label: 'Complete',
    description: 'Job completed successfully',
    color: 'bg-green-500',
    icon: '🎉',
  },
} as const;

type Stage = keyof typeof STAGES;

/**
 * Progress bar component
 */
function ProgressBar({ progress, stage }: { progress: number; stage: Stage }) {
  const stageConfig = STAGES[stage];
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            stageConfig.color
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Stage indicator component
 */
function StageIndicator({ currentStage }: { currentStage: Stage }) {
  const stages: Stage[] = ['routing', 'processing', 'qa', 'complete'];
  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="flex items-center justify-between">
      {stages.map((stage, index) => {
        const config = STAGES[stage];
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        
        return (
          <div key={stage} className="flex items-center">
            {/* Stage circle */}
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                isActive && 'border-primary bg-primary/10 scale-110',
                isCompleted && 'border-green-500 bg-green-500/10',
                !isActive && !isCompleted && 'border-muted bg-muted/50'
              )}
            >
              <span className="text-lg">{config.icon}</span>
            </div>
            
            {/* Connector line */}
            {index < stages.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8 mx-1 transition-colors',
                  isCompleted ? 'bg-green-500' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Agent activity display
 */
function AgentActivity({ 
  agentId, 
  message, 
  stage 
}: { 
  agentId: string; 
  message: string; 
  stage: Stage;
}) {
  const config = STAGES[stage];
  
  return (
    <div className="bg-secondary/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{config.icon}</span>
        <span className="font-medium">{config.label}</span>
        {stage !== 'complete' && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="animate-pulse">●</span>
            In Progress
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-2">{config.description}</p>
      {message && (
        <div className="bg-background rounded p-2 text-sm">
          <span className="text-muted-foreground">Status: </span>
          {message}
        </div>
      )}
      {agentId && (
        <div className="mt-2 text-xs text-muted-foreground">
          Agent: <code className="bg-muted px-1 rounded">{agentId}</code>
        </div>
      )}
    </div>
  );
}

/**
 * Connection status indicator
 */
function ConnectionStatus({ 
  isConnected, 
  error 
}: { 
  isConnected: boolean; 
  error: string | null;
}) {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <span className="w-2 h-2 rounded-full bg-destructive" />
        Connection error: {error}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span 
        className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
        )} 
      />
      {isConnected ? 'Connected' : 'Connecting...'}
    </div>
  );
}

/**
 * Main JobProgress component
 */
export function JobProgress({ jobId, className }: JobProgressProps) {
  const { progress, isConnected, connectionError } = useJobProgress(jobId);

  // If no progress data yet, show waiting state
  if (!progress) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Job Progress</h3>
          <ConnectionStatus isConnected={isConnected} error={connectionError} />
        </div>
        <div className="bg-secondary/50 rounded-lg p-6 text-center">
          <div className="animate-pulse text-4xl mb-2">⏳</div>
          <p className="text-muted-foreground">Waiting for job to start...</p>
          <p className="text-sm text-muted-foreground mt-1">
            Progress updates will appear here once execution begins
          </p>
        </div>
      </div>
    );
  }

  const stage = progress.stage as Stage;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Job Progress</h3>
        <ConnectionStatus isConnected={isConnected} error={connectionError} />
      </div>

      {/* Progress bar */}
      <ProgressBar progress={progress.progress} stage={stage} />

      {/* Stage indicator */}
      <div>
        <p className="text-sm text-muted-foreground mb-3">Execution Stage</p>
        <StageIndicator currentStage={stage} />
      </div>

      {/* Current agent activity */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Current Activity</p>
        <AgentActivity 
          agentId={progress.agentId} 
          message={progress.message} 
          stage={stage}
        />
      </div>
    </div>
  );
}

export default JobProgress;
