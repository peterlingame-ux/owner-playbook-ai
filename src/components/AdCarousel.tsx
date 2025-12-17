import prizeBannerGreen from "@/assets/prize-banner-green.png";
import { Apple, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

const AdCarousel = () => {
  const [iosQR, setIosQR] = useState<string>("");
  const [androidQR, setAndroidQR] = useState<string>("");

  useEffect(() => {
    // Generate QR codes for app download links
    const generateQRCodes = async () => {
      try {
        const iosCode = await QRCode.toDataURL("https://apps.apple.com/app/hunsoccer", {
          width: 120,
          margin: 1,
          color: {
            dark: "#ffffff",
            light: "#00000000",
          },
        });
        const androidCode = await QRCode.toDataURL("https://play.google.com/store/apps/hunsoccer", {
          width: 120,
          margin: 1,
          color: {
            dark: "#ffffff",
            light: "#00000000",
          },
        });
        setIosQR(iosCode);
        setAndroidQR(androidCode);
      } catch (err) {
        console.error("QR generation error:", err);
      }
    };
    generateQRCodes();
  }, []);

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
            {iosQR ? (
              <img src={iosQR} alt="iOS Download" className="w-16 h-16 sm:w-20 sm:h-20" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/20 rounded animate-pulse" />
            )}
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
            {androidQR ? (
              <img src={androidQR} alt="Android Download" className="w-16 h-16 sm:w-20 sm:h-20" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/20 rounded animate-pulse" />
            )}
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
