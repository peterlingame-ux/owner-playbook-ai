import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import MobileFooter from "@/components/MobileFooter";
import MatchCenter from "@/components/MatchCenter";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Models() {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-2 sm:px-4 py-4 safe-area-padding flex-1">
        <MatchCenter />
      </main>
      
      {/* Footer - hidden on mobile */}
      {!isMobile && <Footer />}
      
      {/* Mobile Footer */}
      {isMobile && <MobileFooter />}
      
      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNav />}
    </div>
  );
}
