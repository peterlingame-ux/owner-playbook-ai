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
      
      <main className="container mx-auto px-4 py-8 max-w-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground font-pixel tracking-wider">{t('models_performance')}</h1>
          <div className="w-full h-px bg-border mb-8"></div>
        </div>

        <div className="space-y-3">
          {sortedModels.slice(1).map((model) => (
            <div
              key={model.id}
              className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors cursor-pointer rounded-lg border border-transparent hover:border-border"
              onClick={() => window.location.href = `/model/${model.id}`}
            >
              <img 
                src={model.icon} 
                alt={model.name}
                className="w-8 h-8 object-contain"
              />
              <span className="text-lg font-medium text-foreground font-mono tracking-wide">
                {model.name}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Models;
