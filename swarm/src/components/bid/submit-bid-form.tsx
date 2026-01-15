'use client';

import { useState, useEffect } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useWalletOrDemo } from '@/hooks/use-wallet-or-demo';
import { trpc } from '@/lib/trpc';
import { MNEE_DECIMALS, MNEE_SYMBOL } from '@/lib/constants';

interface SubmitBidFormProps {
  jobId: string;
  jobPayment: string; // Wei as string
  isDemoJob?: boolean; // Flag to indicate if this is a demo job
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Form field errors
interface FormErrors {
  swarmId?: string;
  price?: string;
  estimatedTime?: string;
  message?: string;
}

/**
 * Submit Bid Form Component
 * 
 * Allows swarm owners to submit bids on open jobs.
 * Supports both real and demo mode.
 * Requirements: 4.1, 4.5
 */
export function SubmitBidForm({ jobId, jobPayment, isDemoJob, onSuccess, onCancel }: SubmitBidFormProps) {
  // Use the unified hook for all wallet/demo state
  const { 
    isDemoMode, 
    isReallyConnected,
    isConnected,
    address, 
    createDemoBid, 
    getDemoSwarmsByOwner, 
    isHydrated 
  } = useWalletOrDemo();
  const { toast } = useToast();
  
  // Form state
  const [selectedSwarmId, setSelectedSwarmId] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's swarms (only for real mode)
  const { data: swarmsData, isLoading: isLoadingSwarms } = trpc.swarm.list.useQuery(
    { owner: address?.toLowerCase(), isActive: true },
    { enabled: !!address && isReallyConnected && !isDemoMode }
  );

  // Fetch existing bids for this job (only for real mode)
  const { data: existingBids } = trpc.bid.listByJob.useQuery(
    { jobId },
    { enabled: !!jobId && !isDemoMode && !isDemoJob }
  );

  // Create bid mutation (only for real mode)
  const createBidMutation = trpc.bid.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Bid submitted successfully!',
        description: 'Your bid has been submitted. The job owner will review it.',
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Failed to submit bid',
        description: error.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });

  // Get swarms based on mode
  const userSwarms = isDemoMode 
    ? getDemoSwarmsByOwner(address || '')
    : (swarmsData?.swarms || []);

  // Loading state - in demo mode, we're never loading
  const isLoadingSwarmsEffective = isDemoMode ? false : isLoadingSwarms;

  // Get swarms that haven't already bid on this job (Requirement 4.5)
  const availableSwarms = userSwarms.filter((swarm) => {
    if (isDemoMode || isDemoJob) {
      // For demo jobs, check demo job bids
      return true; // Demo swarms can always bid for simplicity
    }
    const hasBid = existingBids?.some(
      (bid) => bid.swarmId === swarm.id
    );
    return !hasBid;
  });

  // Auto-select first available swarm
  useEffect(() => {
    if (availableSwarms.length > 0 && !selectedSwarmId) {
      setSelectedSwarmId(availableSwarms[0].id);
    }
  }, [availableSwarms, selectedSwarmId]);

  // Format job payment for display
  const formattedJobPayment = formatUnits(BigInt(jobPayment), MNEE_DECIMALS);

  /**
   * Validate form fields
   * Requirements: 12.3 - Highlight invalid fields with specific error messages
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!selectedSwarmId) {
      newErrors.swarmId = 'Please select a swarm to bid with';
    }
    
    if (!priceAmount) {
      newErrors.price = 'Bid price is required';
    } else {
      const amount = parseFloat(priceAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.price = 'Bid price must be greater than zero';
      }
    }
    
    if (!estimatedTime) {
      newErrors.estimatedTime = 'Estimated time is required';
    } else {
      const time = parseInt(estimatedTime, 10);
      if (isNaN(time) || time <= 0) {
        newErrors.estimatedTime = 'Estimated time must be a positive number';
      }
    }
    
    if (message && message.length > 1000) {
      newErrors.message = 'Message must be 1000 characters or less';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to submit a bid.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Convert price to wei
    const priceWei = parseUnits(priceAmount, MNEE_DECIMALS);

    // DEMO MODE: Create bid locally
    if (isDemoMode || isDemoJob) {
      try {
        await createDemoBid({
          jobId,
          swarmId: selectedSwarmId,
          price: priceWei.toString(),
          estimatedTime: parseInt(estimatedTime, 10),
          message: message.trim() || undefined,
        });
        
        toast({
          title: 'Bid submitted! (Demo)',
          description: 'Your bid has been recorded.',
        });
        onSuccess?.();
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Error submitting bid',
          variant: 'destructive',
        });
        setIsSubmitting(false);
      }
      return;
    }

    // REAL MODE: Submit via tRPC
    createBidMutation.mutate({
      jobId,
      swarmId: selectedSwarmId,
      price: priceWei.toString(),
      estimatedTime: parseInt(estimatedTime, 10),
      message: message.trim() || undefined,
    });
  };

  // Check if user has any swarms
  if (!isLoadingSwarmsEffective && userSwarms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submit a Bid</CardTitle>
          <CardDescription>
            You need to register a swarm before you can bid on jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any registered swarms yet.
            </p>
            <Button asChild>
              <a href="/swarm/new">Register a Swarm</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if all user's swarms have already bid
  if (!isLoadingSwarmsEffective && availableSwarms.length === 0 && userSwarms.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submit a Bid</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              All your swarms have already bid on this job.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit a Bid</CardTitle>
        <CardDescription>
          Bid on this job with one of your swarms. Job payment: {formattedJobPayment} {MNEE_SYMBOL}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Swarm Selection */}
          <div className="space-y-2">
            <Label htmlFor="swarm" className={errors.swarmId ? 'text-destructive' : ''}>
              Select Swarm *
            </Label>
            {isLoadingSwarmsEffective ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <select
                id="swarm"
                value={selectedSwarmId}
                onChange={(e) => {
                  setSelectedSwarmId(e.target.value);
                  if (errors.swarmId) setErrors({ ...errors, swarmId: undefined });
                }}
                disabled={isSubmitting}
                className={`flex h-10 w-full rounded-md border ${
                  errors.swarmId ? 'border-destructive' : 'border-input'
                } bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm`}
              >
                <option value="">Select a swarm...</option>
                {availableSwarms.map((swarm) => (
                  <option key={swarm.id} value={swarm.id}>
                    {swarm.name} ({swarm.agents?.length || 0} agents, ★{swarm.rating?.toFixed(1) || '0.0'})
                  </option>
                ))}
              </select>
            )}
            {errors.swarmId && (
              <p className="text-sm text-destructive">{errors.swarmId}</p>
            )}
          </div>

          {/* Bid Price */}
          <div className="space-y-2">
            <Label htmlFor="price" className={errors.price ? 'text-destructive' : ''}>
              Bid Price ({MNEE_SYMBOL}) *
            </Label>
            <div className="relative">
              <Input
                id="price"
                type="number"
                step="0.000001"
                min="0"
                placeholder="0.00"
                value={priceAmount}
                onChange={(e) => {
                  setPriceAmount(e.target.value);
                  if (errors.price) setErrors({ ...errors, price: undefined });
                }}
                disabled={isSubmitting}
                className={errors.price ? 'border-destructive pr-16' : 'pr-16'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {MNEE_SYMBOL}
              </span>
            </div>
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Job budget: {formattedJobPayment} {MNEE_SYMBOL}
            </p>
          </div>

          {/* Estimated Time */}
          <div className="space-y-2">
            <Label htmlFor="estimatedTime" className={errors.estimatedTime ? 'text-destructive' : ''}>
              Estimated Time (hours) *
            </Label>
            <div className="relative">
              <Input
                id="estimatedTime"
                type="number"
                step="1"
                min="1"
                placeholder="e.g., 24"
                value={estimatedTime}
                onChange={(e) => {
                  setEstimatedTime(e.target.value);
                  if (errors.estimatedTime) setErrors({ ...errors, estimatedTime: undefined });
                }}
                disabled={isSubmitting}
                className={errors.estimatedTime ? 'border-destructive pr-16' : 'pr-16'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                hours
              </span>
            </div>
            {errors.estimatedTime && (
              <p className="text-sm text-destructive">{errors.estimatedTime}</p>
            )}
          </div>

          {/* Message (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Add a message to the job owner explaining why your swarm is a good fit..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errors.message) setErrors({ ...errors, message: undefined });
              }}
              disabled={isSubmitting}
              className={errors.message ? 'border-destructive' : ''}
              rows={3}
              maxLength={1000}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {message.length}/1000 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={!isHydrated || !isConnected || isSubmitting || isLoadingSwarmsEffective}
            >
              {!isHydrated ? 'Loading...' : isSubmitting ? 'Submitting...' : 'Submit Bid'}
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center">
            By submitting a bid, you agree to complete the job if your bid is accepted.
            Payment will be released upon successful completion.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
