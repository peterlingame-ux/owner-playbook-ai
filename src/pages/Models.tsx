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
      <div className="pt-[50px] sm:pt-[70px] flex-1">
      <main className="container mx-auto px-2 sm:px-4 py-4 safe-area-padding">
        <MatchCenter />
      </main>
      </div>
      
      {/* Footer - hidden on mobile */}
      {!isMobile && <Footer />}
      
      {/* Mobile Footer */}
      {isMobile && <MobileFooter />}
      
      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNav />}
    </div>
  );
}
