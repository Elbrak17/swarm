'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';
import { parseRevertReason, formatInsufficientBalanceError } from '@/lib/errors';
import { 
  MNEE_CONTRACT_ADDRESS, 
  JOB_ESCROW_ADDRESS, 
  MNEE_DECIMALS,
  MNEE_SYMBOL 
} from '@/lib/constants';

// MNEE ERC20 ABI (minimal for approve and balanceOf)
const MNEE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// JobEscrow ABI (minimal for createJob)
const JOB_ESCROW_ABI = [
  {
    name: 'createJob',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'payment', type: 'uint256' }],
    outputs: [{ name: 'jobId', type: 'uint256' }],
  },
  {
    name: 'nextJobId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// Transaction step enum
type TxStep = 'idle' | 'approving' | 'creating' | 'saving' | 'complete';

// Form field errors
interface FormErrors {
  title?: string;
  description?: string;
  payment?: string;
}

export function CreateJobForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [txStep, setTxStep] = useState<TxStep>('idle');
  
  // tRPC mutation for saving job to database
  const createJobMutation = trpc.job.create.useMutation();

  // Read MNEE balance
  const { data: mneeBalance } = useReadContract({
    address: MNEE_CONTRACT_ADDRESS,
    abi: MNEE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: MNEE_CONTRACT_ADDRESS,
    abi: MNEE_ABI,
    functionName: 'allowance',
    args: address && JOB_ESCROW_ADDRESS ? [address, JOB_ESCROW_ADDRESS] : undefined,
    query: { enabled: !!address && !!JOB_ESCROW_ADDRESS },
  });

  // Read next job ID (to predict the on-chain ID)
  const { data: nextJobId, refetch: refetchNextJobId } = useReadContract({
    address: JOB_ESCROW_ADDRESS,
    abi: JOB_ESCROW_ABI,
    functionName: 'nextJobId',
    query: { enabled: !!JOB_ESCROW_ADDRESS },
  });

  // Approve MNEE spending
  const { 
    writeContract: approveWrite, 
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  // Create job on-chain
  const { 
    writeContract: createJobWrite, 
    data: createJobHash,
    isPending: isCreatePending,
    error: createJobError,
    reset: resetCreateJob,
  } = useWriteContract();

  // Wait for approve transaction
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = 
    useWaitForTransactionReceipt({ hash: approveHash });

  // Wait for create job transaction
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = 
    useWaitForTransactionReceipt({ hash: createJobHash });

  // Calculate payment in wei
  const paymentWei = paymentAmount ? parseUnits(paymentAmount, MNEE_DECIMALS) : BigInt(0);

  // Check if approval is needed
  const needsApproval = currentAllowance !== undefined && paymentWei > currentAllowance;

  // Format balance for display
  const formattedBalance = mneeBalance 
    ? formatUnits(mneeBalance, MNEE_DECIMALS) 
    : '0';

  // Check if user has sufficient balance
  const hasSufficientBalance = mneeBalance !== undefined && paymentWei <= mneeBalance;

  /**
   * Validate form fields
   * Requirements: 12.3 - Highlight invalid fields with specific error messages
   */
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
    
    // Requirements: 3.5 - Validate payment > 0
    if (!paymentAmount) {
      newErrors.payment = 'Payment amount is required';
    } else {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.payment = 'Payment must be greater than zero';
      }
    }
    
    // Requirements: 12.4 - Show current balance and required amount
    if (paymentAmount && !hasSufficientBalance) {
      newErrors.payment = formatInsufficientBalanceError(formattedBalance, paymentAmount, MNEE_SYMBOL);
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
        description: 'Please connect your wallet to post a job.',
        variant: 'destructive',
      });
      return;
    }

    if (!JOB_ESCROW_ADDRESS) {
      toast({
        title: 'Configuration error',
        description: 'Job escrow contract address not configured.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    // Start the transaction flow
    if (needsApproval) {
      setTxStep('approving');
      approveWrite({
        address: MNEE_CONTRACT_ADDRESS,
        abi: MNEE_ABI,
        functionName: 'approve',
        args: [JOB_ESCROW_ADDRESS, paymentWei],
      });
    } else {
      // Skip approval, go directly to job creation
      setTxStep('creating');
      await refetchNextJobId();
      createJobWrite({
        address: JOB_ESCROW_ADDRESS,
        abi: JOB_ESCROW_ABI,
        functionName: 'createJob',
        args: [paymentWei],
      });
    }
  };

  // Handle approval success - proceed to job creation
  useEffect(() => {
    if (isApproveSuccess && txStep === 'approving') {
      setTxStep('creating');
      refetchAllowance();
      refetchNextJobId().then(() => {
        createJobWrite({
          address: JOB_ESCROW_ADDRESS,
          abi: JOB_ESCROW_ABI,
          functionName: 'createJob',
          args: [paymentWei],
        });
      });
    }
  }, [isApproveSuccess, txStep, paymentWei, createJobWrite, refetchAllowance, refetchNextJobId]);

  // Handle job creation success - save to database
  useEffect(() => {
    if (isCreateSuccess && createJobHash && txStep === 'creating') {
      setTxStep('saving');
      
      // Get the on-chain job ID (nextJobId - 1 since it was incremented)
      const onChainId = nextJobId !== undefined ? Number(nextJobId) : 0;
      
      createJobMutation.mutate({
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim() || undefined,
        payment: paymentWei.toString(),
        onChainId,
        clientAddr: address!,
        txHash: createJobHash,
      }, {
        onSuccess: (job) => {
          setTxStep('complete');
          toast({
            title: 'Job posted successfully!',
            description: 'Your job is now live on the marketplace.',
          });
          // Redirect to the job page
          router.push(`/job/${job.id}`);
        },
        onError: (error) => {
          toast({
            title: 'Error saving job',
            description: error.message,
            variant: 'destructive',
          });
          setTxStep('idle');
        },
      });
    }
  }, [isCreateSuccess, createJobHash, txStep, nextJobId, title, description, requirements, paymentWei, address, createJobMutation, toast, router]);

  // Handle approval error
  useEffect(() => {
    if (approveError) {
      toast({
        title: 'Approval failed',
        description: parseRevertReason(approveError),
        variant: 'destructive',
      });
      setTxStep('idle');
      resetApprove();
    }
  }, [approveError, toast, resetApprove]);

  // Handle create job error
  useEffect(() => {
    if (createJobError) {
      toast({
        title: 'Job creation failed',
        description: parseRevertReason(createJobError),
        variant: 'destructive',
      });
      setTxStep('idle');
      resetCreateJob();
    }
  }, [createJobError, toast, resetCreateJob]);

  // Determine button state and text
  const getButtonState = () => {
    if (!isConnected) {
      return { disabled: true, text: 'Connect Wallet' };
    }
    
    switch (txStep) {
      case 'approving':
        if (isApprovePending) return { disabled: true, text: 'Confirm in wallet...' };
        if (isApproveConfirming) return { disabled: true, text: 'Approving MNEE...' };
        return { disabled: true, text: 'Approving...' };
      case 'creating':
        if (isCreatePending) return { disabled: true, text: 'Confirm in wallet...' };
        if (isCreateConfirming) return { disabled: true, text: 'Creating job...' };
        return { disabled: true, text: 'Creating...' };
      case 'saving':
        return { disabled: true, text: 'Saving job...' };
      case 'complete':
        return { disabled: true, text: 'Redirecting...' };
      default:
        if (needsApproval) {
          return { disabled: false, text: `Approve & Post Job` };
        }
        return { disabled: false, text: 'Post Job' };
    }
  };

  const buttonState = getButtonState();
  const isProcessing = txStep !== 'idle' && txStep !== 'complete';

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Post a New Job</CardTitle>
        <CardDescription>
          Create a job for AI swarms to bid on. Payment will be held in escrow until completion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Field */}
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
              disabled={isProcessing}
              className={errors.title ? 'border-destructive' : ''}
              maxLength={200}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className={errors.description ? 'text-destructive' : ''}>
              Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the job in detail. What needs to be done? What are the expected outcomes?"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: undefined });
              }}
              disabled={isProcessing}
              className={errors.description ? 'border-destructive' : ''}
              rows={5}
              maxLength={5000}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {description.length}/5000 characters
            </p>
          </div>

          {/* Requirements Field (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="requirements">
              Requirements (Optional)
            </Label>
            <Textarea
              id="requirements"
              placeholder="Any specific requirements or constraints for the job..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              disabled={isProcessing}
              rows={3}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              {requirements.length}/2000 characters
            </p>
          </div>

          {/* Payment Field */}
          <div className="space-y-2">
            <Label htmlFor="payment" className={errors.payment ? 'text-destructive' : ''}>
              Payment Amount ({MNEE_SYMBOL}) *
            </Label>
            <div className="relative">
              <Input
                id="payment"
                type="number"
                step="0.000001"
                min="0"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  if (errors.payment) setErrors({ ...errors, payment: undefined });
                }}
                disabled={isProcessing}
                className={errors.payment ? 'border-destructive pr-16' : 'pr-16'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {MNEE_SYMBOL}
              </span>
            </div>
            {errors.payment && (
              <p className="text-sm text-destructive">{errors.payment}</p>
            )}
            {isConnected && (
              <p className="text-xs text-muted-foreground">
                Your balance: {formattedBalance} {MNEE_SYMBOL}
              </p>
            )}
          </div>

          {/* Transaction Status */}
          {isProcessing && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <div>
                  <p className="font-medium">
                    {txStep === 'approving' && 'Step 1/2: Approving MNEE spending...'}
                    {txStep === 'creating' && 'Step 2/2: Creating job on blockchain...'}
                    {txStep === 'saving' && 'Saving job details...'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(isApprovePending || isCreatePending) && 'Please confirm the transaction in your wallet.'}
                    {(isApproveConfirming || isCreateConfirming) && 'Waiting for blockchain confirmation...'}
                    {txStep === 'saving' && 'Almost done!'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={buttonState.disabled || isProcessing}
          >
            {buttonState.text}
          </Button>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center">
            By posting a job, you agree to escrow the payment amount in MNEE tokens.
            The payment will be released to the swarm upon successful job completion.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
