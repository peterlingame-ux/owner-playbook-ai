import { TrendingUp, ExternalLink } from "lucide-react";
import sponsorKaiyun from "@/assets/sponsor-kaiyun.png";
import sponsorEA from "@/assets/sponsor-ea-sports.jpg";
import sponsorSportyBet from "@/assets/sponsor-sportybet.png";
import sponsorBet365 from "@/assets/bet365-logo.png";
import sponsor1xbet from "@/assets/sponsor-1xbet.jpg";

const CryptoTicker = () => {
  const sportsSponsors = [
    { 
      name: "SPORTYBET", 
      tagline: "Africa's Best Sports Betting Platform",
      logo: sponsorSportyBet,
      url: "https://www.sportybet.com"
    },
    { 
      name: "EA SPORTS", 
      tagline: "It's In The Game",
      logo: sponsorEA,
      url: "https://www.ea.com/sports"
    },
    { 
      name: "KAIYUN", 
      tagline: "亚洲领先体育平台",
      logo: sponsorKaiyun,
      url: "https://www.kaiyun.com"
    },
    { 
      name: "BET365", 
      tagline: "The World's Favourite Online Sports Betting Company",
      logo: sponsorBet365,
      url: "https://www.bet365.com"
    },
    { 
      name: "1XBET", 
      tagline: "Best Odds & Live Betting",
      logo: sponsor1xbet,
      url: "https://www.1xbet.com"
    },
    { 
      name: "BETWAY", 
      tagline: "Bet With The Best",
      url: "https://www.betway.com"
    },
  ];

  return (
    <div className="bg-card/50 border-y-2 border-border overflow-hidden group relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"></div>
      <div className="flex items-center gap-8 animate-scroll whitespace-nowrap py-6 group-hover:[animation-play-state:paused] relative">
        {[...sportsSponsors, ...sportsSponsors, ...sportsSponsors].map((sponsor, index) => (
          <a 
            key={index}
            href={sponsor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 min-w-[200px] px-6 py-4 rounded-lg bg-background/60 backdrop-blur-sm border-2 border-border hover:border-primary/50 transition-all duration-300 cursor-pointer group/item hover:scale-105 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="w-24 h-16 flex items-center justify-center">
              {sponsor.logo ? (
                <img 
                  src={sponsor.logo} 
                  alt={sponsor.name}
                  className="max-h-16 max-w-24 w-auto h-auto object-contain filter brightness-90 group-hover/item:brightness-100 transition-all"
                />
              ) : (
                <TrendingUp size={28} className="text-primary" />
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-sm text-foreground tracking-wider font-pixel">
                {sponsor.name}
              </span>
              <span className="text-[10px] text-muted-foreground text-center line-clamp-1 font-mono">
                {sponsor.tagline}
              </span>
            </div>
            <ExternalLink 
              size={14} 
              className="text-primary/60 group-hover/item:text-primary transition-colors absolute top-2 right-2" 
            />
          </a>
        ))}
      </div>
    </div>
  );
};

export default CryptoTicker;
