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
    <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-y border-primary/30 overflow-hidden group">
      <div className="flex items-center gap-16 animate-scroll whitespace-nowrap py-4 group-hover:[animation-play-state:paused]">
        {[...sportsSponsors, ...sportsSponsors, ...sportsSponsors].map((sponsor, index) => (
          <a 
            key={index}
            href={sponsor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 min-w-[280px] justify-start hover:opacity-80 transition-all cursor-pointer group/item hover:scale-105"
          >
            <div className="w-16 h-12 flex items-center justify-center flex-shrink-0">
              {sponsor.logo ? (
                <img 
                  src={sponsor.logo} 
                  alt={sponsor.name}
                  className="max-h-12 max-w-16 w-auto h-auto object-contain"
                />
              ) : (
                <TrendingUp size={20} className="text-primary" />
              )}
            </div>
            <span className="font-bold text-xl text-foreground tracking-wide">{sponsor.name}</span>
            <ExternalLink size={16} className="text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity ml-auto" />
          </a>
        ))}
      </div>
    </div>
  );
};

export default CryptoTicker;
