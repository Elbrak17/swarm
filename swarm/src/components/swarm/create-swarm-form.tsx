'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWalletOrDemo } from '@/hooks/use-wallet-or-demo';
import { trpc } from '@/lib/trpc';
import { parseRevertReason } from '@/lib/errors';
import { SWARM_REGISTRY_ADDRESS, AgentRole } from '@/lib/constants';

// Agent role descriptions for tooltip
const AGENT_ROLE_DESCRIPTIONS = {
  [AgentRole.ROUTER]: {
    name: 'Router',
    description: 'Analyzes incoming tasks and routes them to the appropriate Worker agents. Acts as the coordinator of the swarm.',
  },
  [AgentRole.WORKER]: {
    name: 'Worker', 
    description: 'Executes the actual tasks. Specialized agents that perform specific work like writing, coding, research, etc.',
  },
  [AgentRole.QA]: {
    name: 'QA',
    description: 'Quality Assurance agent that validates and reviews the work produced by Workers before final delivery.',
  },
};

// SwarmRegistry ABI (minimal for registerSwarm)
const SWARM_REGISTRY_ABI = [
  {
    name: 'registerSwarm',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'agents', type: 'address[]' },
    ],
    outputs: [{ name: 'swarmId', type: 'bytes32' }],
  },
] as const;

// Transaction step enum
type TxStep = 'idle' | 'registering' | 'saving' | 'complete';

// Agent input type
interface AgentInput {
  address: string;
  role: AgentRole;
}

// Form field errors
interface FormErrors {
  name?: string;
  description?: string;
  agents?: string;
}

/**
 * Validate Ethereum address format
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function CreateSwarmForm() {
  const router = useRouter();
  const { address: realAddress, isConnected: isReallyConnected } = useAccount();
  const { isDemoMode, address: demoAddress, createDemoSwarm } = useWalletOrDemo();
  const { toast } = useToast();
  
  // Effective address (real or demo)
  const address = isReallyConnected ? realAddress : demoAddress;
  const isConnected = isReallyConnected || isDemoMode;
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agents, setAgents] = useState<AgentInput[]>([
    { address: '', role: AgentRole.ROUTER },
  ]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [txStep, setTxStep] = useState<TxStep>('idle');
  
  // tRPC mutation for saving swarm to database
  const createSwarmMutation = trpc.swarm.create.useMutation();

  // Register swarm on-chain
  const { 
    writeContract: registerSwarmWrite, 
    data: registerHash,
    isPending: isRegisterPending,
    error: registerError,
    reset: resetRegister,
  } = useWriteContract();

  // Wait for register transaction
  const { 
    isLoading: isRegisterConfirming, 
    isSuccess: isRegisterSuccess,
    data: txReceipt,
  } = useWaitForTransactionReceipt({ hash: registerHash });

  /**
   * Add a new agent input row
   */
  const addAgent = () => {
    setAgents([...agents, { address: '', role: AgentRole.WORKER }]);
  };

  /**
   * Remove an agent input row
   */
  const removeAgent = (index: number) => {
    if (agents.length > 1) {
      setAgents(agents.filter((_, i) => i !== index));
    }
  };

  /**
   * Update agent at specific index
   */
  const updateAgent = (index: number, field: keyof AgentInput, value: string) => {
    const newAgents = [...agents];
    if (field === 'role') {
      newAgents[index].role = value as AgentRole;
    } else {
      newAgents[index].address = value;
    }
    setAgents(newAgents);
    if (errors.agents) setErrors({ ...errors, agents: undefined });
  };

  /**
   * Validate form fields
   * Requirements: 12.3 - Highlight invalid fields with specific error messages
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Swarm name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }
    
    // Validate agents
    const validAgents = agents.filter(a => a.address.trim() !== '');
    if (validAgents.length === 0) {
      newErrors.agents = 'At least one agent address is required';
    } else {
      const invalidAddresses = validAgents.filter(a => !isValidAddress(a.address));
      if (invalidAddresses.length > 0) {
        newErrors.agents = 'One or more agent addresses are invalid';
      }
      
      // Check for duplicates
      const addresses = validAgents.map(a => a.address.toLowerCase());
      const uniqueAddresses = new Set(addresses);
      if (uniqueAddresses.size !== addresses.length) {
        newErrors.agents = 'Duplicate agent addresses are not allowed';
      }
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
        description: 'Please connect your wallet to register a swarm.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    // Filter out empty agent addresses
    const validAgents = agents.filter(a => a.address.trim() !== '');

    // DEMO MODE: Create swarm locally
    if (isDemoMode) {
      setTxStep('registering');
      try {
        await createDemoSwarm({
          name: name.trim(),
          description: description.trim(),
          agents: validAgents.map(a => ({
            address: a.address,
            role: a.role as 'ROUTER' | 'WORKER' | 'QA',
          })),
        });
        
        setTxStep('complete');
        toast({
          title: 'Swarm registered successfully! (Demo)',
          description: 'Your swarm can now bid on jobs.',
        });
        // Redirect to marketplace
        router.push(`/marketplace?demo=true`);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Error registering swarm',
          variant: 'destructive',
        });
        setTxStep('idle');
      }
      return;
    }

    // REAL MODE: On-chain transaction
    if (!SWARM_REGISTRY_ADDRESS) {
      toast({
        title: 'Configuration error',
        description: 'Swarm registry contract address not configured.',
        variant: 'destructive',
      });
      return;
    }

    const agentAddresses = validAgents.map(a => a.address as `0x${string}`);

    // Start the transaction flow
    setTxStep('registering');
    registerSwarmWrite({
      address: SWARM_REGISTRY_ADDRESS,
      abi: SWARM_REGISTRY_ABI,
      functionName: 'registerSwarm',
      args: [name.trim(), agentAddresses],
    });
  };

  // Handle registration success - save to database
  useEffect(() => {
    if (isRegisterSuccess && registerHash && txStep === 'registering' && txReceipt) {
      setTxStep('saving');
      
      // Extract swarmId from transaction logs
      // The SwarmRegistered event is the first log, and swarmId is the first indexed topic
      let swarmId = '';
      if (txReceipt.logs && txReceipt.logs.length > 0) {
        // The swarmId is in topics[1] (first indexed parameter after event signature)
        const log = txReceipt.logs[0];
        if (log.topics && log.topics.length > 1 && log.topics[1]) {
          swarmId = log.topics[1] as string;
        }
      }
      
      if (!swarmId) {
        // Fallback: generate a placeholder ID (this shouldn't happen in production)
        swarmId = `0x${registerHash.slice(2, 66)}`;
      }
      
      // Filter valid agents for database
      const validAgents = agents.filter(a => a.address.trim() !== '' && isValidAddress(a.address));
      
      createSwarmMutation.mutate({
        name: name.trim(),
        description: description.trim(),
        onChainId: swarmId,
        owner: address!,
        agents: validAgents.map(a => ({
          address: a.address,
          role: a.role,
        })),
      }, {
        onSuccess: (swarm) => {
          setTxStep('complete');
          toast({
            title: 'Swarm registered successfully!',
            description: 'Your swarm is now ready to bid on jobs.',
          });
          // Redirect to the swarm page
          router.push(`/swarm/${swarm.id}`);
        },
        onError: (error) => {
          toast({
            title: 'Error saving swarm',
            description: error.message,
            variant: 'destructive',
          });
          setTxStep('idle');
        },
      });
    }
  }, [isRegisterSuccess, registerHash, txStep, txReceipt, name, description, agents, address, createSwarmMutation, toast, router]);

  // Handle registration error
  useEffect(() => {
    if (registerError) {
      toast({
        title: 'Registration failed',
        description: parseRevertReason(registerError),
        variant: 'destructive',
      });
      setTxStep('idle');
      resetRegister();
    }
  }, [registerError, toast, resetRegister]);

  // Determine button state and text
  const getButtonState = () => {
    if (!isConnected) {
      return { disabled: true, text: 'Connect Wallet' };
    }
    
    switch (txStep) {
      case 'registering':
        if (isRegisterPending) return { disabled: true, text: 'Confirm in wallet...' };
        if (isRegisterConfirming) return { disabled: true, text: 'Registering swarm...' };
        return { disabled: true, text: 'Registering...' };
      case 'saving':
        return { disabled: true, text: 'Saving swarm...' };
      case 'complete':
        return { disabled: true, text: 'Redirecting...' };
      default:
        return { disabled: false, text: 'Register Swarm' };
    }
  };

  const buttonState = getButtonState();
  const isProcessing = txStep !== 'idle' && txStep !== 'complete';

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Register a New Swarm</CardTitle>
        <CardDescription>
          Create an AI agent swarm to bid on jobs in the marketplace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className={errors.name ? 'text-destructive' : ''}>
              Swarm Name *
            </Label>
            <Input
              id="name"
              placeholder="e.g., Customer Support Crew"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              disabled={isProcessing}
              className={errors.name ? 'border-destructive' : ''}
              maxLength={100}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className={errors.description ? 'text-destructive' : ''}>
              Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what your swarm specializes in..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: undefined });
              }}
              disabled={isProcessing}
              className={errors.description ? 'border-destructive' : ''}
              rows={4}
              maxLength={1000}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {description.length}/1000 characters
            </p>
          </div>

          {/* Agents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className={errors.agents ? 'text-destructive' : ''}>
                  Agents *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-80">
                    <div className="space-y-3">
                      <p className="font-semibold text-sm">Agent Roles:</p>
                      {Object.values(AGENT_ROLE_DESCRIPTIONS).map((role) => (
                        <div key={role.name}>
                          <p className="font-medium text-sm">{role.name}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAgent}
                disabled={isProcessing}
              >
                + Add Agent
              </Button>
            </div>
            
            {errors.agents && (
              <p className="text-sm text-destructive">{errors.agents}</p>
            )}

            <div className="space-y-3">
              {agents.map((agent, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="0x... (Agent wallet address)"
                      value={agent.address}
                      onChange={(e) => updateAgent(index, 'address', e.target.value)}
                      disabled={isProcessing}
                      className={
                        agent.address && !isValidAddress(agent.address)
                          ? 'border-destructive'
                          : ''
                      }
                    />
                    {agent.address && !isValidAddress(agent.address) && (
                      <p className="text-xs text-destructive mt-1">Invalid address format</p>
                    )}
                  </div>
                  <select
                    value={agent.role}
                    onChange={(e) => updateAgent(index, 'role', e.target.value)}
                    disabled={isProcessing}
                    className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value={AgentRole.ROUTER}>Router</option>
                    <option value={AgentRole.WORKER}>Worker</option>
                    <option value={AgentRole.QA}>QA</option>
                  </select>
                  {agents.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAgent(index)}
                      disabled={isProcessing}
                      className="h-10 px-2 text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Add the wallet addresses of AI agents that will work in this swarm.
              Each agent should have a specific role: Router (classifies tasks), 
              Worker (executes tasks), or QA (validates results).
            </p>
          </div>

          {/* Transaction Status */}
          {isProcessing && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <div>
                  <p className="font-medium">
                    {txStep === 'registering' && 'Registering swarm on blockchain...'}
                    {txStep === 'saving' && 'Saving swarm details...'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isRegisterPending && 'Please confirm the transaction in your wallet.'}
                    {isRegisterConfirming && 'Waiting for blockchain confirmation...'}
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
            By registering a swarm, you&apos;ll be able to bid on jobs in the marketplace.
            Your swarm will be recorded on the Ethereum blockchain.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
