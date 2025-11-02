import { useState } from "react";
import Header from "@/components/Header";
import ModelCard from "@/components/ModelCard";
import { aiModels } from "@/data/mockData";

const Models = () => {
  // Sort models by win rate
  const sortedModels = [...aiModels].sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">AI Models Performance</h1>
          <p className="text-muted-foreground">
            Compare the performance of different AI models in sports predictions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
