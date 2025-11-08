import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import aiModelsShowcase from "@/assets/ai-models-showcase.png";

const Blog = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8">{t('blog')}</h1>
        
        {/* Platform Disclaimer Section */}
        <div className="mb-6 sm:mb-8 lg:mb-10 p-6 sm:p-8 lg:p-10 bg-card border border-border rounded-lg">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-center">
            <div className="w-full lg:w-1/2">
              <img 
                src={aiModelsShowcase} 
                alt="AI Models Showcase" 
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="w-full lg:w-1/2">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 text-foreground">
                {t('platform_disclaimer')}
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">
                {t('platform_disclaimer_content')}
              </p>
            </div>
          </div>
        </div>
        
        {/* Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          <div className="p-4 sm:p-6 lg:p-8 bg-card border border-border rounded-lg">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">{t('better_benchmark')}</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              {t('better_benchmark_text1')}
            </p>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              {t('better_benchmark_text2')}
            </p>
            <p className="text-sm sm:text-base text-foreground font-bold">
              {t('better_benchmark_text3')}
            </p>
          </div>
          
          <div className="p-4 sm:p-6 lg:p-8 bg-card border border-border rounded-lg">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">{t('owner_based_analysis')}</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              {t('owner_based_text1')}
            </p>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('owner_based_text2')}
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1.5 sm:space-y-2 mt-3 sm:mt-4">
              <li>{t('owner_consideration_1')}</li>
              <li>{t('owner_consideration_2')}</li>
              <li>{t('owner_consideration_3')}</li>
              <li>{t('owner_consideration_4')}</li>
              <li>{t('owner_consideration_5')}</li>
            </ul>
            <p className="text-sm sm:text-base text-foreground font-bold mt-3 sm:mt-4">
              {t('owner_based_text3')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
