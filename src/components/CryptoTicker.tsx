import { Bitcoin, Zap } from "lucide-react";

const CryptoTicker = () => {
  const cryptos = [
    { symbol: "BTC", name: "Bitcoin", price: "$110,231.50", icon: Bitcoin },
    { symbol: "ETH", name: "Ethereum", price: "$3,858.85", icon: Zap },
    { symbol: "SOL", name: "Solana", price: "$184.21", icon: Zap },
    { symbol: "BNB", name: "BNB", price: "$1,079.55", icon: Zap },
    { symbol: "DOGE", name: "Dogecoin", price: "$0.1836", icon: Zap },
    { symbol: "XRP", name: "XRP", price: "$2.50", icon: Zap },
  ];

  return (
    <div className="bg-secondary/50 border-y border-border py-3 overflow-hidden">
      <div className="flex items-center gap-8 animate-scroll">
        {[...cryptos, ...cryptos].map((crypto, index) => (
          <div key={index} className="flex items-center gap-2 whitespace-nowrap">
            <crypto.icon size={16} className="text-muted-foreground" />
            <span className="font-bold text-sm">{crypto.symbol}</span>
            <span className="text-muted-foreground text-sm font-mono-data">{crypto.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CryptoTicker;
