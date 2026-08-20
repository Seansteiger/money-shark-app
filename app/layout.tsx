import type { Metadata } from 'next';
import ConvexClientProvider from './ConvexClientProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Money Shark - Capital Management',
  description: 'Professional loan tracking and capital management system for private lenders.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                darkMode: 'class',
                theme: {
                  extend: {
                    colors: {
                      shark: {
                        950: '#020617',
                        900: '#0f172a',
                        800: '#1e293b',
                        700: '#334155',
                        600: '#475569',
                      },
                      money: {
                        500: '#10b981',
                        600: '#059669',
                      }
                    }
                  }
                }
              }
            `,
          }}
        />
      </head>
      <body>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}