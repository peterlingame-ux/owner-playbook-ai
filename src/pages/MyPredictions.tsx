import MyPredictionsComponent from "@/components/MyPredictions";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import MobileFooter from "@/components/MobileFooter";
import { useIsMobile } from "@/hooks/use-mobile";

const MyPredictions = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-[50px] sm:pt-[70px]">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl pb-4 sm:pb-20">
        <MyPredictionsComponent />
      </div>
      </div>
      {/* Mobile Footer */}
      {isMobile && <MobileFooter />}
      
      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNav />}
    </div>
  );
};

export default MyPredictions;
