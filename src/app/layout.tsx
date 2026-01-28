import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Smart Detection - DVS Web',
  description: 'Application de prospection automatisée pour DVS Web',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <nav className="border-b bg-white">
            <div className="container mx-auto px-4">
              <div className="flex h-16 items-center justify-between">
                <div className="flex items-center gap-8">
                  <Link href="/" className="font-bold text-xl">
                    Smart Detection
                  </Link>
                  <div className="hidden md:flex items-center gap-6">
                    <Link
                      href="/"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/import"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Import CSV
                    </Link>
                    <Link
                      href="/search"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Recherche Google
                    </Link>
                    <Link
                      href="/suivi"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Suivi
                    </Link>
                    <Link
                      href="/settings"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Paramètres
                    </Link>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  DVS Web
                </div>
              </div>
            </div>
          </nav>
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
