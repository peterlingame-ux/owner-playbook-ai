import { TrendingUp } from "lucide-react";

const CryptoTicker = () => {
  const sportsSponsors = [
    { name: "BET365", tagline: "The World's Favourite Online Sports Betting Company" },
    { name: "开云体育", tagline: "亚洲领先体育平台" },
    { name: "EA SPORTS", tagline: "It's In The Game" },
    { name: "SPORTYBET", tagline: "Africa's Best Sports Betting Platform" },
    { name: "1XBET", tagline: "Best Odds & Live Betting" },
    { name: "BETWAY", tagline: "Bet With The Best" },
    { name: "PINNACLE", tagline: "High Limits, Low Margins" },
    { name: "FUN88", tagline: "亚洲顶级体育竞技平台" }
  ];

  return (
    <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-y border-primary/30 overflow-hidden">
      <div className="flex items-center gap-12 animate-scroll whitespace-nowrap py-3">
        {[...sportsSponsors, ...sportsSponsors, ...sportsSponsors].map((sponsor, index) => (
          <div key={index} className="flex items-center gap-3 px-6">
            <TrendingUp size={16} className="text-primary flex-shrink-0" />
            <span className="font-bold text-lg text-foreground tracking-wide">{sponsor.name}</span>
            <span className="text-muted-foreground text-sm">|</span>
            <span className="text-muted-foreground text-sm italic">{sponsor.tagline}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CryptoTicker;
