import prizeBannerGreen from "@/assets/prize-banner-green.png";

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
          className="group flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-black rounded-lg border border-white/20 transition-all duration-300 hover:bg-zinc-900 hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.4),0_0_40px_rgba(34,197,94,0.2)]"
        >
          <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <svg viewBox="0 0 512 512" className="w-6 h-6 sm:w-7 sm:h-7">
              <path fill="#2196F3" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z"/>
              <path fill="#4CAF50" d="M325.3 277.7l-256.5 256c13 6.8 29.7 6.8 42.7 0L399.1 399.1l-73.8-121.4z"/>
              <path fill="#FFC107" d="M486.7 247.2c-7-10.5-17.5-14-31.5-7l-130.9 75.5 73.8 121.4 88.6-51.1c14-8.8 14-21 0-29.8l-88.6-51.1 88.6-51.1c14-7.9 14-20.1 0-28.8z"/>
              <path fill="#F44336" d="M104.6 499L385.4 337.8l-60.1-60.1L47 512c13 6.8 29.7 6.8 42.7 0l14.9-13z"/>
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
          className="group flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-black rounded-lg border border-white/20 transition-all duration-300 hover:bg-zinc-900 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.4),0_0_40px_rgba(59,130,246,0.2)]"
        >
          <svg viewBox="0 0 384 512" className="w-5 h-5 sm:w-6 sm:h-6 text-white transition-transform duration-300 group-hover:scale-110" fill="currentColor">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
          </svg>
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
