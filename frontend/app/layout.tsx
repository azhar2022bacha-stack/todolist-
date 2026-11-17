import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Daymark — Task workspace',
  description: 'A calmer place to plan your day and keep your work moving.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
