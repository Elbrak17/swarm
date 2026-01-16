'use client';

import { redirect } from 'next/navigation';

/**
 * Demo root redirects to demo marketplace
 */
export default function DemoPage() {
  redirect('/demo/marketplace');
}
