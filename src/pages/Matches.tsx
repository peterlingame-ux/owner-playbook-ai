import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import MatchCenter from "@/components/MatchCenter";
import Disclaimer from "@/components/Disclaimer";
import { useTranslation } from "react-i18next";

const Matches = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 safe-area-padding">
        {/* Title */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-center text-foreground tracking-wide uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {t('match_center')}
          </h1>
          <p className="text-center text-sm sm:text-base text-muted-foreground mt-2">
            {t('choose_match_to_predict')}
          </p>
        </div>

        {/* Match Center */}
        <MatchCenter />

        {/* Disclaimer */}
        <div className="mt-6 sm:mt-8">
          <Disclaimer />
        </div>
      </div>
    </div>
  );
};

export default Matches;
