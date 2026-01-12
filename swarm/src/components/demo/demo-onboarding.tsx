'use client';

import { useState, useEffect } from 'react';
import { useDemoStore } from '@/store/demo-store';
import { 
  Eye, 
  Wallet, 
  Briefcase, 
  Users, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ONBOARDING_STEPS = [
  {
    icon: Wallet,
    title: '50,000 MNEE',
    subtitle: 'Starting balance',
    description: 'Explore the platform with a pre-loaded virtual wallet.',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: Users,
    title: 'Create Swarms',
    subtitle: 'AI agent teams',
    description: 'Register your own swarms and configure their agents.',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    icon: Briefcase,
    title: 'Post Jobs',
    subtitle: 'Simulated marketplace',
    description: 'Create jobs, receive bids and manage the complete workflow.',
    color: 'from-purple-500 to-pink-600',
  },
];

/**
 * Premium Demo Onboarding Modal
 * Shows when user first enters demo mode
 */
export function DemoOnboarding() {
  const { isDemoMode } = useDemoStore();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);

  useEffect(() => {
    // Check if user has seen onboarding
    const seen = localStorage.getItem('swarm-demo-onboarding-seen');
    setHasSeenOnboarding(!!seen);
  }, []);

  useEffect(() => {
    if (isDemoMode && !hasSeenOnboarding) {
      // Small delay for smooth entrance
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isDemoMode, hasSeenOnboarding]);

  const handleComplete = () => {
    localStorage.setItem('swarm-demo-onboarding-seen', 'true');
    setHasSeenOnboarding(true);
    setIsVisible(false);
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleSkip}
      />
      
      {/* Modal */}
      <div className={cn(
        "relative w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl",
        "animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 sm:zoom-in-95 duration-300",
        "max-h-[85vh] sm:max-h-none overflow-hidden"
      )}>
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors z-10"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Header with gradient */}
        <div className={cn(
          "relative h-40 sm:h-48 bg-gradient-to-br overflow-hidden",
          step.color
        )}>
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-white/30 blur-2xl" />
            <div className="absolute bottom-4 right-4 w-32 h-32 rounded-full bg-white/20 blur-3xl" />
          </div>
          
          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-150" />
              <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-6">
                <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-200 animate-pulse" />
            </div>
          </div>

          {/* Demo badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
            <Eye className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Demo Mode</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentStep 
                    ? "w-8 bg-primary" 
                    : index < currentStep 
                      ? "w-4 bg-primary/50"
                      : "w-4 bg-muted"
                )}
              />
            ))}
          </div>

          {/* Text content */}
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground mb-1">{step.subtitle}</p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">{step.title}</h2>
            <p className="text-muted-foreground">{step.description}</p>
          </div>

          {/* Features list for last step */}
          {isLastStep && (
            <div className="space-y-3 mb-8">
              {[
                'Instant simulated transactions',
                'Data persisted locally',
                'No wallet required',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="order-2 sm:order-1 sm:flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={handleNext}
              className={cn(
                "order-1 sm:order-2 sm:flex-1 gap-2",
                "bg-gradient-to-r", step.color, "hover:opacity-90"
              )}
            >
              {isLastStep ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
