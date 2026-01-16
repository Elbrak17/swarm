'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HelpCircle, Eye, Sparkles, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDemoStore, DEMO_WALLET_ADDRESS } from '@/store/demo-store';
import { AgentRole } from '@/lib/constants';

const AGENT_ROLE_DESCRIPTIONS = {
  [AgentRole.ROUTER]: {
    name: 'Router',
    description: 'Analyzes incoming tasks and routes them to the appropriate Worker agents.',
  },
  [AgentRole.WORKER]: {
    name: 'Worker', 
    description: 'Executes the actual tasks. Specialized agents that perform specific work.',
  },
  [AgentRole.QA]: {
    name: 'QA',
    description: 'Quality Assurance agent that validates and reviews the work produced.',
  },
};

interface AgentInput {
  address: string;
  role: AgentRole;
}

interface FormErrors {
  name?: string;
  description?: string;
  agents?: string;
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export default function DemoCreateSwarmPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createDemoSwarm } = useDemoStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agents, setAgents] = useState<AgentInput[]>([
    { address: '', role: AgentRole.ROUTER },
  ]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAgent = () => {
    setAgents([...agents, { address: '', role: AgentRole.WORKER }]);
  };

  const removeAgent = (index: number) => {
    if (agents.length > 1) {
      setAgents(agents.filter((_, i) => i !== index));
    }
  };

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
    
    const validAgents = agents.filter(a => a.address.trim() !== '');
    if (validAgents.length === 0) {
      newErrors.agents = 'At least one agent address is required';
    } else {
      const invalidAddresses = validAgents.filter(a => !isValidAddress(a.address));
      if (invalidAddresses.length > 0) {
        newErrors.agents = 'One or more agent addresses are invalid';
      }
      
      const addresses = validAgents.map(a => a.address.toLowerCase());
      const uniqueAddresses = new Set(addresses);
      if (uniqueAddresses.size !== addresses.length) {
        newErrors.agents = 'Duplicate agent addresses are not allowed';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const validAgents = agents.filter(a => a.address.trim() !== '');
    setIsSubmitting(true);
    
    try {
      const swarm = await createDemoSwarm({
        name: name.trim(),
        description: description.trim(),
        agents: validAgents.map(a => ({
          address: a.address,
          role: a.role as 'ROUTER' | 'WORKER' | 'QA',
        })),
      });
      
      toast({
        title: 'Swarm registered successfully!',
        description: 'Your swarm can now bid on jobs.',
      });
      
      router.push(`/demo/swarm/${swarm.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error registering swarm',
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
            <CardTitle>Register a New Swarm</CardTitle>
            <CardDescription>
              Create an AI agent swarm to bid on jobs in the demo marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Demo Wallet Info */}
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Demo Wallet</span>
                <code className="text-xs text-muted-foreground ml-auto">{DEMO_WALLET_ADDRESS.slice(0, 10)}...</code>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
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
                  disabled={isSubmitting}
                  className={errors.name ? 'border-destructive' : ''}
                  maxLength={100}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              {/* Description */}
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
                  disabled={isSubmitting}
                  className={errors.description ? 'border-destructive' : ''}
                  rows={4}
                  maxLength={1000}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                <p className="text-xs text-muted-foreground">{description.length}/1000</p>
              </div>

              {/* Agents */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className={errors.agents ? 'text-destructive' : ''}>Agents *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" className="w-80">
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
                  <Button type="button" variant="outline" size="sm" onClick={addAgent} disabled={isSubmitting}>
                    + Add Agent
                  </Button>
                </div>
                
                {errors.agents && <p className="text-sm text-destructive">{errors.agents}</p>}

                <div className="space-y-3">
                  {agents.map((agent, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="0x... (Agent wallet address)"
                          value={agent.address}
                          onChange={(e) => updateAgent(index, 'address', e.target.value)}
                          disabled={isSubmitting}
                          className={agent.address && !isValidAddress(agent.address) ? 'border-destructive' : ''}
                        />
                        {agent.address && !isValidAddress(agent.address) && (
                          <p className="text-xs text-destructive mt-1">Invalid address format</p>
                        )}
                      </div>
                      <select
                        value={agent.role}
                        onChange={(e) => updateAgent(index, 'role', e.target.value)}
                        disabled={isSubmitting}
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
                          disabled={isSubmitting}
                          className="h-10 px-2 text-muted-foreground hover:text-destructive"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Registering...
                  </>
                ) : (
                  'Register Swarm'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                This is a demo registration. No blockchain transaction required.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
