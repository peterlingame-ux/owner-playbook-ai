import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import aiModelsShowcase from "@/assets/ai-models-showcase.png";
import { Shield, Sparkles, TrendingUp, Users } from "lucide-react";

const Blog = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      {/* Hero Section with Image Background */}
      <div className="relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl animate-pulse delay-150" />
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          {/* Main Content Card */}
          <div className="max-w-7xl mx-auto">
            {/* Platform Disclaimer - Hero Style */}
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-2xl opacity-30 animate-pulse" />
              
              <div className="relative bg-gradient-to-br from-card/90 via-card/80 to-card/90 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden">
                {/* Top Accent Bar */}
                <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
                
                <div className="p-8 sm:p-12 lg:p-16">
                  <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left Content */}
                    <div className="space-y-8 order-2 lg:order-1">
                      {/* Icon Badge */}
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="text-sm font-semibold text-primary tracking-wider">
                          {t('platform_disclaimer')}
                        </span>
                      </div>

                      {/* Main Text */}
                      <div className="space-y-6">
                        <p className="text-lg sm:text-xl lg:text-2xl text-foreground/90 leading-relaxed font-light">
                          {t('platform_disclaimer_content')}
                        </p>
                      </div>

                      {/* Feature Pills */}
                      <div className="flex flex-wrap gap-3 pt-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-background/50 border border-border/50 rounded-xl hover:border-primary/30 transition-colors">
                          <span className="text-sm font-medium">{t('owner_sentiment_analysis')}</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-background/50 border border-border/50 rounded-xl hover:border-primary/30 transition-colors">
                          <span className="text-sm font-medium">{t('player_technical_breakdown')}</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-background/50 border border-border/50 rounded-xl hover:border-primary/30 transition-colors">
                          <span className="text-sm font-medium">{t('odds_anomaly_monitoring')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Image */}
                    <div className="order-1 lg:order-2 relative group">
                      {/* Image Glow */}
                      <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative overflow-hidden rounded-2xl border-2 border-border/30 shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-500">
                        <img 
                          src={aiModelsShowcase} 
                          alt="AI Models Showcase" 
                          className="w-full h-auto"
                        />
                        {/* Image Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Accent */}
                <div className="h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
