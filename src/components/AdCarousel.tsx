import prizeBannerGreen from "@/assets/prize-banner-green.png";
import { Apple, Smartphone } from "lucide-react";

const AdCarousel = () => {
  // Simple placeholder QR codes using a free QR API
  const iosQRUrl = "https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://apps.apple.com/app/hunsoccer&bgcolor=1a1a1a&color=ffffff";
  const androidQRUrl = "https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://play.google.com/store/apps/hunsoccer&bgcolor=1a1a1a&color=ffffff";

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

      {/* App Download QR Codes */}
      <div className="flex items-center justify-center gap-6 sm:gap-10 py-4 px-4 bg-background/80 backdrop-blur-sm border-t border-border/30">
        {/* iOS Download */}
        <div className="flex items-center gap-3">
          <div className="relative p-2 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-lg border border-border/50">
            <img src={iosQRUrl} alt="iOS Download" className="w-16 h-16 sm:w-20 sm:h-20 rounded" />
          </div>
          <div className="hidden sm:flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-foreground">
              <Apple className="w-4 h-4" />
              <span className="text-sm font-medium">iOS 下载</span>
            </div>
            <span className="text-xs text-muted-foreground">扫码下载 App Store</span>
          </div>
          <div className="flex sm:hidden items-center gap-1 text-foreground">
            <Apple className="w-3.5 h-3.5" />
            <span className="text-xs">iOS</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-border/50" />

        {/* Android Download */}
        <div className="flex items-center gap-3">
          <div className="relative p-2 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-lg border border-border/50">
            <img src={androidQRUrl} alt="Android Download" className="w-16 h-16 sm:w-20 sm:h-20 rounded" />
          </div>
          <div className="hidden sm:flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-foreground">
              <Smartphone className="w-4 h-4" />
              <span className="text-sm font-medium">Android 下载</span>
            </div>
            <span className="text-xs text-muted-foreground">扫码下载 APK</span>
          </div>
          <div className="flex sm:hidden items-center gap-1 text-foreground">
            <Smartphone className="w-3.5 h-3.5" />
            <span className="text-xs">Android</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdCarousel;
