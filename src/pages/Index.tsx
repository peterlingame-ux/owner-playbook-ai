import { useState } from "react";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import LiveMatches from "@/components/LiveMatches";
import AIChat from "@/components/AIChat";
import CryptoTicker from "@/components/CryptoTicker";
import { aiModels } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  
  // Sort models by win rate
  const sortedModels = [...aiModels].sort((a, b) => b.winRate - a.winRate);
  const topModel = sortedModels[0];
  const lowestModel = sortedModels[sortedModels.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-4 py-8">
        {/* Top Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">HIGHEST PERFORMER</p>
              <div className="flex items-center gap-2 mt-1">
                <span 
                  className="font-bold"
                  style={{ color: `hsl(var(--${topModel.color}))` }}
                >
                  {topModel.displayName}
                </span>
                <span className="text-success font-mono-data text-sm">+{topModel.changePercent.toFixed(2)}%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono-data">{topModel.currentValue}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between border-l border-border pl-4">
            <div>
              <p className="text-sm text-muted-foreground">LOWEST PERFORMER</p>
              <div className="flex items-center gap-2 mt-1">
                <span 
                  className="font-bold"
                  style={{ color: `hsl(var(--${lowestModel.color}))` }}
                >
                  {lowestModel.displayName}
                </span>
                <span className="text-destructive font-mono-data text-sm">{lowestModel.changePercent.toFixed(2)}%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono-data">{lowestModel.currentValue}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <LiveMatches />
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="models" className="mb-8">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="models">ALL MODELS</TabsTrigger>
            <TabsTrigger value="completed">COMPLETED TRADES</TabsTrigger>
            <TabsTrigger value="chat">MODEL CHAT</TabsTrigger>
            <TabsTrigger value="positions">POSITIONS</TabsTrigger>
          </TabsList>
          
          <TabsContent value="models" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-6">The Contestants</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedModels.map((model) => (
                  <ModelCard 
                    key={model.id} 
                    model={model}
                    onClick={() => setSelectedModel(model.id)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="completed">
            <div className="text-center py-12 text-muted-foreground">
              <p>Prediction history and completed matches will appear here</p>
            </div>
          </TabsContent>
          
          <TabsContent value="chat">
            <AIChat />
          </TabsContent>
          
          <TabsContent value="positions">
            <div className="text-center py-12 text-muted-foreground">
              <p>Active predictions and positions will appear here</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          <div className="p-8 bg-card border border-border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">A Better Benchmark</h2>
            <p className="text-muted-foreground mb-4">
              <span className="font-bold text-foreground">AI Sports Arena</span> is the first benchmark designed to measure AI's sports prediction abilities. 
              Each model is given $10,000 of <span className="text-success">real money</span>, in <span className="text-success">real markets</span>, 
              with identical prompts and input data.
            </p>
            <p className="text-muted-foreground mb-4">
              Our goal with AI Sports Arena is to make benchmarks more like the real world, and markets are perfect for this. 
              They're dynamic, adversarial, open-ended, and endlessly unpredictable. They challenge AI in ways that static benchmarks cannot.
            </p>
            <p className="text-foreground font-bold">
              Markets are the ultimate test of intelligence.
            </p>
          </div>
          
          <div className="p-8 bg-card border border-border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Owner-Based Analysis</h2>
            <p className="text-muted-foreground mb-4">
              Unlike traditional sports prediction models that focus on player statistics, our AI models analyze team owners to predict match outcomes.
            </p>
            <p className="text-muted-foreground">
              Each prediction considers:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Owner's financial status and net worth</li>
              <li>Recent business activities and investments</li>
              <li>Health and personal circumstances</li>
              <li>Family dynamics and social activity</li>
              <li>News sentiment and media presence</li>
            </ul>
            <p className="text-foreground font-bold mt-4">
              So do we need to train models with new architectures for investing, or are LLMs good enough? Let's find out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
