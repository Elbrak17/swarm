'use client';

import { useState, useEffect } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDemoStore, DEMO_WALLET_ADDRESS } from '@/store/demo-store';
import { MNEE_DECIMALS, MNEE_SYMBOL } from '@/lib/constants';
import Link from 'next/link';

interface DemoSubmitBidFormProps {
  jobId: string;
  jobPayment: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormErrors {
  swarmId?: string;
  price?: string;
  estimatedTime?: string;
  message?: string;
}

export function DemoSubmitBidForm({ jobId, jobPayment, onSuccess, onCancel }: DemoSubmitBidFormProps) {
  const { toast } = useToast();
  const { createDemoBid, getDemoSwarmsByOwner } = useDemoStore();
  
  const [selectedSwarmId, setSelectedSwarmId] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user's demo swarms
  const userSwarms = getDemoSwarmsByOwner(DEMO_WALLET_ADDRESS);
  const formattedJobPayment = formatUnits(BigInt(jobPayment), MNEE_DECIMALS);

  // Auto-select first swarm
  useEffect(() => {
    if (userSwarms.length > 0 && !selectedSwarmId) {
      setSelectedSwarmId(userSwarms[0].id);
    }
  }, [userSwarms, selectedSwarmId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    const priceWei = parseUnits(priceAmount, MNEE_DECIMALS);

    try {
      await createDemoBid({
        jobId,
        swarmId: selectedSwarmId,
        price: priceWei.toString(),
        estimatedTime: parseInt(estimatedTime, 10),
        message: message.trim() || undefined,
      });
      
      toast({
        title: 'Bid submitted!',
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
  };

  // No swarms - prompt to create one
  if (userSwarms.length === 0) {
    return (
      <Card className="border-amber-200 dark:border-amber-800">
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
            <Link href="/demo/swarm/new">
              <Button>Register a Swarm</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle>Submit a Bid</CardTitle>
        <CardDescription>
          Bid on this job with one of your swarms. Job payment: {parseFloat(formattedJobPayment).toFixed(0)} {MNEE_SYMBOL}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Swarm Selection */}
          <div className="space-y-2">
            <Label htmlFor="swarm" className={errors.swarmId ? 'text-destructive' : ''}>
              Select Swarm *
            </Label>
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
              {userSwarms.map((swarm) => (
                <option key={swarm.id} value={swarm.id}>
                  {swarm.name} ({swarm.agents.length} agents, ★{swarm.rating.toFixed(1)})
                </option>
              ))}
            </select>
            {errors.swarmId && <p className="text-sm text-destructive">{errors.swarmId}</p>}
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
                step="1"
                min="0"
                placeholder="0"
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
            {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
            <p className="text-xs text-muted-foreground">
              Job budget: {parseFloat(formattedJobPayment).toFixed(0)} {MNEE_SYMBOL}
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
            {errors.estimatedTime && <p className="text-sm text-destructive">{errors.estimatedTime}</p>}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message explaining why your swarm is a good fit..."
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
            {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
            <p className="text-xs text-muted-foreground">{message.length}/1000</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
                Cancel
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Bid'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
