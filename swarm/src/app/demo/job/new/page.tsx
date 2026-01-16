'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseUnits, formatUnits } from 'viem';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDemoStore, DEMO_WALLET_ADDRESS } from '@/store/demo-store';
import { MNEE_DECIMALS, MNEE_SYMBOL } from '@/lib/constants';
import { Eye, Sparkles, Wallet } from 'lucide-react';

interface FormErrors {
  title?: string;
  description?: string;
  payment?: string;
}

export default function DemoCreateJobPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { demoBalance, createDemoJob } = useDemoStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentWei = paymentAmount ? parseUnits(paymentAmount, MNEE_DECIMALS) : BigInt(0);
  const formattedBalance = formatUnits(BigInt(demoBalance), MNEE_DECIMALS);
  const hasSufficientBalance = paymentWei <= BigInt(demoBalance);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length > 5000) {
      newErrors.description = 'Description must be 5000 characters or less';
    }
    
    if (!paymentAmount) {
      newErrors.payment = 'Payment amount is required';
    } else {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.payment = 'Payment must be greater than zero';
      } else if (!hasSufficientBalance) {
        newErrors.payment = `Insufficient balance. You have ${parseFloat(formattedBalance).toFixed(0)} ${MNEE_SYMBOL}`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const job = await createDemoJob({
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim() || undefined,
        payment: paymentWei.toString(),
      });
      
      toast({
        title: 'Job created successfully!',
        description: 'Your job is now visible on the demo marketplace.',
      });
      
      router.push(`/demo/job/${job.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creating job',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container py-8">
        {/* Demo indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <Eye className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Demo Environment</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </div>
        </div>

        <Card className="max-w-2xl mx-auto border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle>Post a New Job</CardTitle>
            <CardDescription>
              Create a job for AI swarms to bid on. Payment will be deducted from your demo balance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Demo Wallet Info */}
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Demo Wallet</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{parseFloat(formattedBalance).toLocaleString()} {MNEE_SYMBOL}</div>
                  <code className="text-xs text-muted-foreground">{DEMO_WALLET_ADDRESS.slice(0, 10)}...</code>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className={errors.title ? 'text-destructive' : ''}>
                  Job Title *
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Customer Support Ticket Resolution"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors({ ...errors, title: undefined });
                  }}
                  disabled={isSubmitting}
                  className={errors.title ? 'border-destructive' : ''}
                  maxLength={200}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className={errors.description ? 'text-destructive' : ''}>
                  Description *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the job in detail..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors({ ...errors, description: undefined });
                  }}
                  disabled={isSubmitting}
                  className={errors.description ? 'border-destructive' : ''}
                  rows={5}
                  maxLength={5000}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                <p className="text-xs text-muted-foreground">{description.length}/5000</p>
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements (Optional)</Label>
                <Textarea
                  id="requirements"
                  placeholder="Any specific requirements..."
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  maxLength={2000}
                />
              </div>

              {/* Payment */}
              <div className="space-y-2">
                <Label htmlFor="payment" className={errors.payment ? 'text-destructive' : ''}>
                  Payment Amount ({MNEE_SYMBOL}) *
                </Label>
                <div className="relative">
                  <Input
                    id="payment"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value);
                      if (errors.payment) setErrors({ ...errors, payment: undefined });
                    }}
                    disabled={isSubmitting}
                    className={errors.payment ? 'border-destructive pr-16' : 'pr-16'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {MNEE_SYMBOL}
                  </span>
                </div>
                {errors.payment && <p className="text-sm text-destructive">{errors.payment}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Post Job'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                This is a demo transaction. No real tokens will be used.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
