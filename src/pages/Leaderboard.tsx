import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import { useTranslation } from "react-i18next";

const Leaderboard = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">{t('leaderboard.title').toUpperCase()}</h1>
        <LeaderboardTable />
      </div>
    </div>
  );
};

export default Leaderboard;
