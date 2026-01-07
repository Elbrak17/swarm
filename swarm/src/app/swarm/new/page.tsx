'use client';

import { Header } from '@/components/layout';
import { CreateSwarmForm } from '@/components/swarm';

export default function NewSwarmPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container py-8">
        <CreateSwarmForm />
      </main>
    </div>
  );
}
