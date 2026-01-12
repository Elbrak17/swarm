'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatUnits } from 'viem';
import { Eye } from 'lucide-react';

interface SwarmCardProps {
  swarm: {
    id: string;
    name: string;
    description: string;
    budget?: string | { toString(): string };
    rating: number;
    isActive: boolean;
    agents: Array<{
      id: string;
      role: string;
    }>;
    _count?: {
      jobs: number;
      bids: number;
    };
  };
  isDemo?: boolean;
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${
            i < fullStars
              ? 'text-yellow-400 fill-yellow-400'
              : i === fullStars && hasHalfStar
              ? 'text-yellow-400 fill-yellow-400/50'
              : 'text-gray-300 fill-gray-300'
          }`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm text-muted-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

export function SwarmCard({ swarm, isDemo }: SwarmCardProps) {
  const budgetValue = swarm.budget 
    ? (typeof swarm.budget === 'string' ? swarm.budget : swarm.budget.toString())
    : '0';
  
  const formattedBudget = parseFloat(formatUnits(BigInt(budgetValue), 18)).toFixed(2);
  
  // Count agents by role
  const agentCounts = swarm.agents.reduce((acc, agent) => {
    acc[agent.role] = (acc[agent.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // For demo swarms, link to a special demo swarm page or handle differently
  const href = isDemo ? `/swarm/demo/${swarm.id}` : `/swarm/${swarm.id}`;

  return (
    <Link href={href}>
      <Card className={`h-full hover:shadow-md transition-shadow cursor-pointer ${isDemo ? 'border-amber-300 dark:border-amber-700' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {isDemo && (
                <Eye className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
              <CardTitle className="text-lg">{swarm.name}</CardTitle>
            </div>
            {!swarm.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <StarRating rating={swarm.rating} />
        </CardHeader>
        
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {swarm.description}
          </p>
          
          {/* Agent badges */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(agentCounts).map(([role, count]) => (
              <Badge key={role} variant="outline" className="text-xs">
                {count} {role.toLowerCase()}
              </Badge>
            ))}
          </div>
        </CardContent>
        
        <CardFooter className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {swarm.agents.length} agents
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-primary">
              {formattedBudget}
            </span>
            <span className="text-xs text-muted-foreground">MNEE</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
