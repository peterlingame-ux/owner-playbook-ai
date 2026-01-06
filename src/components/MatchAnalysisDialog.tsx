import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type ModelAnalysis = {
  id: string;
  displayName: string;
  model: string;
  analysis?: string;
  error?: string;
  latencyMs?: number;
};

interface MatchAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: string | null;
  analyses: ModelAnalysis[];
  isLoading: boolean;
  matchInfo: {
    homeTeam: string;
    awayTeam: string;
    league: string;
  };
}

const renderAnalysisContent = (content: string) => (
  <div className="prose prose-sm dark:prose-invert max-w-none">
    {content.split("\n").map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (trimmed === "") return null;

      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        return (
          <h3
            key={index}
            className="text-lg font-bold text-primary mt-4 mb-2 leading-tight"
          >
            {trimmed.replace(/\*\*/g, "")}
          </h3>
        );
      }

      if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
        return (
          <li key={index} className="ml-4 text-sm leading-relaxed">
            {trimmed.replace(/^[-•]\s*/, "")}
          </li>
        );
      }

      return (
        <p key={index} className="text-sm leading-relaxed mb-3">
          {paragraph}
        </p>
      );
    })}
  </div>
);

export const MatchAnalysisDialog = ({
  open,
  onOpenChange,
  analysis,
  analyses,
  isLoading,
  matchInfo,
}: MatchAnalysisDialogProps) => {
  const firstAvailableId = useMemo(() => {
    const available = analyses.find((item) => item.analysis)?.id;
    return available || analyses[0]?.id;
  }, [analyses]);

  const [activeModelId, setActiveModelId] = useState<string | undefined>(
    firstAvailableId,
  );

  useEffect(() => {
    setActiveModelId(firstAvailableId);
  }, [firstAvailableId]);

  const hasMultiModels = analyses.length > 0;
  const fallbackAnalysis = analysis && !hasMultiModels;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>AI赛事分析</span>
            <Badge variant="outline" className="text-xs">
              {matchInfo.homeTeam} vs {matchInfo.awayTeam}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2 sm:pr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI正在分析比赛...</p>
            </div>
          ) : hasMultiModels && activeModelId ? (
            <div className="space-y-4">
              {analyses
                .filter((model) => model.id === activeModelId)
                .map((model) => (
                  <div key={model.id}>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>{model.model}</span>
                      {typeof model.latencyMs === "number" && (
                        <span>耗时 {(model.latencyMs / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                    {model.analysis ? (
                      renderAnalysisContent(model.analysis)
                    ) : (
                      <div className="rounded-md border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                        {model.error || "该模型未返回分析结果"}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : fallbackAnalysis ? (
            renderAnalysisContent(analysis)
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              暂无分析数据
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
