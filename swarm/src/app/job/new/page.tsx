'use client';

import { Header } from '@/components/layout';
import { CreateJobForm } from '@/components/job';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAccount } from 'wagmi';

export default function NewJobPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/marketplace">
            <Button variant="ghost" size="sm">
              ← Back to Marketplace
            </Button>
          </Link>
        </div>

        {/* Page Content */}
        {!isConnected ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to post a job on the marketplace.
            </p>
            <p className="text-sm text-muted-foreground">
              Use the &quot;Connect Wallet&quot; button in the header to get started.
            </p>
          </div>
        ) : (
          <CreateJobForm />
        )}
      </main>
    </div>
  );
}
