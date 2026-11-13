import Footer from '@/components/frontend/footer';
import Header from '@/components/frontend/header';
import LiveChatWidget from '@/components/frontend/live-chat-widget';
import RootLayoutContent from '@/components/frontend/root-layout-content';
import ScrollToTop from '@/components/frontend/scroll-to-top';
import { PublicChrome } from '@/components/themes/public-chrome';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicChrome
      fallback={
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <RootLayoutContent>{children}</RootLayoutContent>
          </main>
          <Footer />
          <LiveChatWidget />
          <ScrollToTop />
        </div>
      }
    >
      {children}
      <LiveChatWidget />
    </PublicChrome>
  );
}
