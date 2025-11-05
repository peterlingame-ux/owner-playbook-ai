import { TrendingUp, ExternalLink } from "lucide-react";
import sponsorKaiyun from "@/assets/sponsor-kaiyun.png";
import sponsorEA from "@/assets/sponsor-ea-sports.png";
import sponsorSportyBet from "@/assets/sponsor-sportybet.png";
import sponsorBet365 from "@/assets/bet365-logo.png";

const CryptoTicker = () => {
  const sportsSponsors = [
    { 
      name: "开云体育", 
      tagline: "亚洲领先体育平台",
      logo: sponsorKaiyun,
      url: "https://www.kaiyun.com"
    },
    { 
      name: "EA SPORTS", 
      tagline: "It's In The Game",
      logo: sponsorEA,
      url: "https://www.ea.com/sports"
    },
    { 
      name: "SPORTYBET", 
      tagline: "Africa's Best Sports Betting Platform",
      logo: sponsorSportyBet,
      url: "https://www.sportybet.com"
    },
    { 
      name: "BET365", 
      tagline: "The World's Favourite Online Sports Betting Company",
      logo: sponsorBet365,
      url: "https://www.bet365.com",
      logoOnly: true
    },
    { 
      name: "1XBET", 
      tagline: "Best Odds & Live Betting",
      url: "https://www.1xbet.com"
    },
    { 
      name: "BETWAY", 
      tagline: "Bet With The Best",
      url: "https://www.betway.com"
    },
  ];

  return (
    <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-y border-primary/30 overflow-hidden">
      <div className="flex items-center gap-12 animate-scroll whitespace-nowrap py-3">
        {[...sportsSponsors, ...sportsSponsors, ...sportsSponsors].map((sponsor, index) => (
          <a 
            key={index}
            href={sponsor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 hover:opacity-80 transition-opacity cursor-pointer group"
          >
            {sponsor.logo ? (
              <img 
                src={sponsor.logo} 
                alt={sponsor.name}
                className="h-8 w-auto object-contain flex-shrink-0"
              />
            ) : (
              <TrendingUp size={16} className="text-primary flex-shrink-0" />
            )}
            {!sponsor.logoOnly && (
              <>
                <span className="font-bold text-lg text-foreground tracking-wide">{sponsor.name}</span>
                <span className="text-muted-foreground text-sm">|</span>
                <span className="text-muted-foreground text-sm italic">{sponsor.tagline}</span>
              </>
            )}
            <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  );
};

export default CryptoTicker;
