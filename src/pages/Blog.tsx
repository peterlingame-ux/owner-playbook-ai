import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";

const Blog = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">{t('blog')}</h1>
        
        {/* Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-8 bg-card border border-border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">{t('better_benchmark')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('better_benchmark_text1')}
            </p>
            <p className="text-muted-foreground mb-4">
              {t('better_benchmark_text2')}
            </p>
            <p className="text-foreground font-bold">
              {t('better_benchmark_text3')}
            </p>
          </div>
          
          <div className="p-8 bg-card border border-border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">{t('owner_based_analysis')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('owner_based_text1')}
            </p>
            <p className="text-muted-foreground">
              {t('owner_based_text2')}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>{t('owner_consideration_1')}</li>
              <li>{t('owner_consideration_2')}</li>
              <li>{t('owner_consideration_3')}</li>
              <li>{t('owner_consideration_4')}</li>
              <li>{t('owner_consideration_5')}</li>
            </ul>
            <p className="text-foreground font-bold mt-4">
              {t('owner_based_text3')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
