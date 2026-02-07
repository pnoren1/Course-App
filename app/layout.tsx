import "./globals.css";
import type { Metadata } from 'next';
import EnvironmentCheck from './components/EnvironmentCheck';

export const metadata: Metadata = {
  title: 'קורס AWS - פלטפורמת למידה',
  description: 'קורס AWS מקיף - למידה עצמית עם שיעורים מוקלטים',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col">
        <EnvironmentCheck>
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-gray-800 text-white py-4 px-6 text-center text-sm">
            <p>
              © כל הזכויות שמורות לפנינה אורן, אין להעתיק/להוריד/להקליט/לצלם/להעביר בשום צורה ואופן | pnoren1@gmail.com | 0527142050
            </p>
          </footer>
        </EnvironmentCheck>
      </body>
    </html>
  );
}
