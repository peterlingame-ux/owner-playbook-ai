import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import ModelCard from "@/components/ModelCard";
import { aiModels } from "@/data/mockData";

const Models = () => {
  const { t } = useTranslation();
  // Sort models by win rate
  const sortedModels = [...aiModels].sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-foreground">{t('models_performance')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('compare_performance')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sortedModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Models;
