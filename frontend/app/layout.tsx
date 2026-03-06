import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MeetSense Live - AI Meeting Agent',
  description: 'Next-Generation Multimodal AI Meeting Agent with real-time transcription, summaries, and insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

