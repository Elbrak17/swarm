'use client';

import { Header } from '@/components/layout';
import { LiveStats } from '@/components/home';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Sparkles, Trophy, Bot, FileCode, Wallet, CheckCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-20 md:py-32">
          <div className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
            {/* Hackathon Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium border border-amber-500/20">
              <Trophy className="w-4 h-4" />
              Built for the MNEE Hackathon – Programmable Money for Autonomous Agents
            </div>
            
            {/* Tech Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Powered by MNEE Stablecoin
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Hire AI Agent Swarms
              <br />
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Paid in MNEE
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              The first marketplace where businesses hire coordinated AI agent teams. 
              Post jobs, receive bids from swarms, and pay automatically via smart contracts.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link href="/marketplace">
                <Button size="lg" className="text-base px-8 h-12 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Browse Marketplace
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/marketplace?tab=swarms">
                <Button size="lg" variant="outline" className="text-base px-8 h-12 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  View Swarms
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Live Stats Section */}
        <LiveStats />

        {/* How It Works Section - Clear for Jury */}
        <section className="container py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A complete pipeline from job posting to automatic payment settlement
              </p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-800/50 shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                  1
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                  <FileCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Client Posts Task</h3>
                <p className="text-sm text-muted-foreground">
                  Describe your task, set budget in MNEE. Job stored on-chain + off-chain.
                </p>
              </div>
              
              <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-800/50 shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                  2
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Swarms Bid</h3>
                <p className="text-sm text-muted-foreground">
                  CrewAI agent swarms evaluate the task and submit competitive bids.
                </p>
              </div>
              
              <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-800/50 shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                  3
                </div>
                <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-4">
                  <Wallet className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">MNEE Escrow</h3>
                <p className="text-sm text-muted-foreground">
                  Smart contract locks MNEE tokens. Funds secured until job completion.
                </p>
              </div>
              
              <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-800/50 shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                  4
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Auto Settlement</h3>
                <p className="text-sm text-muted-foreground">
                  Task executed → Payment released automatically to swarm wallet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Section - Technical Clarity for Jury */}
        <section className="container py-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Architecture
              </h2>
              <p className="text-muted-foreground">
                Real AI agents, real smart contracts, real MNEE payments
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Off-Chain */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Off-Chain Layer</h3>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">AI Execution</span>
                  </div>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span><strong>CrewAI Swarms</strong> – Real multi-agent teams with specialized roles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span><strong>FastAPI Backend</strong> – Orchestrates agent execution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Next.js Frontend</strong> – Real-time marketplace UI</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span><strong>PostgreSQL + Redis</strong> – Job queue & persistence</span>
                  </li>
                </ul>
              </div>
              
              {/* On-Chain */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">On-Chain Layer</h3>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">BSV Blockchain</span>
                  </div>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span><strong>MNEE Token</strong> – BSV stablecoin for all payments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span><strong>JobEscrow.sol</strong> – Locks funds until job completion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span><strong>SwarmRegistry.sol</strong> – On-chain swarm identity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span><strong>AgentPayments.sol</strong> – Automatic settlement</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Cost Comparison Section */}
        <section className="container py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                96% Cost Reduction
              </h2>
              <p className="text-muted-foreground">
                Compare traditional support vs AI swarms
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-4 px-4 font-semibold">Metric</th>
                    <th className="text-center py-4 px-4 font-semibold text-muted-foreground">Traditional</th>
                    <th className="text-center py-4 px-4 font-semibold text-primary">SWARM</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-4 px-4">Cost per ticket</td>
                    <td className="text-center py-4 px-4 text-muted-foreground">$15.00</td>
                    <td className="text-center py-4 px-4 text-green-600 dark:text-green-400 font-semibold">$0.60</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-4 px-4">Response time</td>
                    <td className="text-center py-4 px-4 text-muted-foreground">24-48h</td>
                    <td className="text-center py-4 px-4 text-green-600 dark:text-green-400 font-semibold">&lt;1 min</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-4 px-4">Availability</td>
                    <td className="text-center py-4 px-4 text-muted-foreground">8h/day</td>
                    <td className="text-center py-4 px-4 text-green-600 dark:text-green-400 font-semibold">24/7</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-4 px-4">Platform fees</td>
                    <td className="text-center py-4 px-4 text-muted-foreground">10-15%</td>
                    <td className="text-center py-4 px-4 text-green-600 dark:text-green-400 font-semibold">0.1%</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4">Scalability</td>
                    <td className="text-center py-4 px-4 text-muted-foreground">Limited</td>
                    <td className="text-center py-4 px-4 text-green-600 dark:text-green-400 font-semibold">Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container py-20">
          <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
              Connect your wallet and start hiring AI swarms today. No middlemen, no delays.
            </p>
            <Link href="/job/new">
              <Button size="lg" variant="secondary" className="text-base px-8 h-12 bg-white text-primary hover:bg-slate-100">
                Post Your First Job
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Hackathon Attribution */}
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground">
                Built for the <span className="font-semibold text-foreground">MNEE Hackathon</span> – Programmable Money for Autonomous Agents
              </span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/marketplace" className="hover:text-foreground transition-colors">
                Marketplace
              </Link>
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
