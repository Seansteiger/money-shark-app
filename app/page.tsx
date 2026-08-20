'use client';

import dynamic from 'next/dynamic';

// Load the client-side Vite SPA dynamically with SSR disabled to prevent hydration and window/localStorage issues
const App = dynamic(() => import('@/App'), { ssr: false });

export default function Page() {
  return <App />;
}
