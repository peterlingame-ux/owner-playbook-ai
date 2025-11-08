import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import aiModelsShowcase from "@/assets/ai-models-showcase.png";
import { Info } from "lucide-react";

const Blog = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 lg:py-12 max-w-7xl">
        {/* Page Title with gradient */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent tracking-tight">
            {t('blog')}
          </h1>
          <div className="w-20 sm:w-24 lg:w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto rounded-full" />
        </div>
        
        {/* Platform Disclaimer Section - Enhanced */}
        <div className="relative mb-6 sm:mb-8 lg:mb-10">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl blur-xl" />
          
          <div className="relative p-6 sm:p-8 lg:p-12 bg-card/80 backdrop-blur-sm border-2 border-border/50 rounded-2xl shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:border-primary/30">
            {/* Icon decoration */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 opacity-10">
              <Info className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-primary" />
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
              {/* Image section with enhanced styling */}
              <div className="w-full lg:w-1/2 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300" />
                <div className="relative">
                  <img 
                    src={aiModelsShowcase} 
                    alt="AI Models Showcase" 
                    className="w-full h-auto rounded-xl shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
              </div>
              
              {/* Content section */}
              <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-8 sm:h-10 lg:h-12 bg-gradient-to-b from-primary to-accent rounded-full" />
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                    {t('platform_disclaimer')}
                  </h2>
                </div>
                
                <div className="pl-4 sm:pl-6 border-l-2 border-border/50">
                  <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed sm:leading-loose">
                    {t('platform_disclaimer_content')}
                  </p>
                </div>
                
                {/* Decorative accent */}
                <div className="flex gap-2 pt-4">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
