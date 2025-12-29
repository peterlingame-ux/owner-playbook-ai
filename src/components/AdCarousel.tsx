import prizeBannerGreen from "@/assets/prize-banner-green.png";
import { Apple, Play } from "lucide-react";

const AdCarousel = () => {
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-card/50 border border-border/50">
      {/* Static Banner Image */}
      <div className="relative aspect-[21/9] sm:aspect-[3/1] lg:aspect-[4/1] overflow-hidden">
        <img
          src={prizeBannerGreen}
          alt="Prize Banner"
          className="w-full h-full object-cover"
        />
      </div>

      {/* App Download Buttons */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 py-4 px-4 bg-background/80 backdrop-blur-sm border-t border-border/30">
        {/* Google Play Button */}
        <a 
          href="https://play.google.com/store/apps/hunsoccer" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-black rounded-lg border border-white/20 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-7 sm:h-7">
              <path fill="#EA4335" d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92z"/>
              <path fill="#FBBC04" d="M16.247 15.055L13.792 12l2.455-3.055 2.78 1.6a1 1 0 0 1 0 1.71l-2.78 1.8z"/>
              <path fill="#4285F4" d="M3.609 1.814L14.31 8.5 16.247 5.945l-9.866-5.69a1 1 0 0 0-2.772 1.559z"/>
              <path fill="#34A853" d="M14.31 15.5L3.609 22.186a1 1 0 0 0 2.772 1.559l9.866-5.69-2.037-2.555z"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[10px] text-white/80 leading-tight uppercase tracking-wide">GET IT ON</span>
            <span className="text-xs sm:text-base font-medium text-white leading-tight">Google Play</span>
          </div>
        </a>

        {/* App Store Button */}
        <a 
          href="https://apps.apple.com/app/hunsoccer" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-black rounded-lg border border-white/20 hover:bg-zinc-900 transition-colors"
        >
          <Apple className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[10px] text-white/80 leading-tight">Available on the</span>
            <span className="text-xs sm:text-base font-medium text-white leading-tight">App Store</span>
          </div>
        </a>
      </div>
    </div>
  );
};

export default AdCarousel;
