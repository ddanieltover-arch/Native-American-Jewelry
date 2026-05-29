import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import MobileMenu from '@/components/layout/MobileMenu';
import CartDrawer from '@/components/store/CartDrawer';
import SearchOverlay from '@/components/store/SearchOverlay';
import SalesNotification from '@/components/store/SalesNotification';
import SmartsuppChat from '@/components/layout/SmartsuppChat';
import BackToTopButton from '@/components/layout/BackToTopButton';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-[var(--header-height)]">{children}</main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <MobileMenu />
      <MobileNav />
      <SalesNotification />
      <SmartsuppChat />
      <BackToTopButton />
    </>
  );
}
