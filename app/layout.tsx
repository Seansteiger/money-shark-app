import './globals.css';

export const metadata = {
  title: 'Money Shark - Comments',
  description: 'Server action comment form',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );