import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";

const Leaderboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">LEADERBOARD</h1>
        <LeaderboardTable />
      </div>
    </div>
  );
};

export default Leaderboard;
