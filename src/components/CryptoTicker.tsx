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
    <div className="relative overflow-hidden py-6 bg-gradient-to-b from-background via-card/20 to-background">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      {/* Sponsors scroll */}
      <div className="relative">
        <div className="flex items-center gap-6 animate-scroll whitespace-nowrap group hover:[animation-play-state:paused]">
          {[...sportsSponsors, ...sportsSponsors, ...sportsSponsors].map((sponsor, index) => (
            <a 
              key={index}
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/sponsor relative"
            >
              {/* Sponsor Card */}
              <div className="relative min-w-[280px] p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/60 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover/sponsor:from-primary/5 group-hover/sponsor:via-transparent group-hover/sponsor:to-primary/5 transition-all duration-300" />
                
                <div className="relative flex items-center gap-4">
                  {/* Logo container */}
                  <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0 rounded-lg bg-background/50 border border-border/30 p-2 group-hover/sponsor:border-primary/20 transition-colors">
                    {sponsor.logo ? (
                      <img 
                        src={sponsor.logo} 
                        alt={sponsor.name}
                        className="max-h-full max-w-full w-auto h-auto object-contain filter brightness-90 contrast-110 group-hover/sponsor:brightness-100 group-hover/sponsor:scale-110 transition-all duration-300"
                      />
                    ) : (
                      <TrendingUp size={24} className="text-primary/60" />
                    )}
                    
                    {/* Logo glow */}
                    <div className="absolute inset-0 rounded-lg bg-primary/0 group-hover/sponsor:bg-primary/10 blur-xl transition-all duration-300" />
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm text-foreground tracking-wide truncate group-hover/sponsor:text-primary transition-colors">
                        {sponsor.name}
                      </h3>
                      <ExternalLink 
                        size={12} 
                        className="text-muted-foreground/40 group-hover/sponsor:text-primary/60 transition-colors flex-shrink-0" 
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
                      {sponsor.tagline}
                    </p>
                  </div>
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover/sponsor:via-primary/40 transition-all duration-300" />
              </div>
            </a>
          ))}
        </div>

        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
      </div>
    </div>
  );
};

export default CryptoTicker;
