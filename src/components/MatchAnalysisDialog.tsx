import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MatchAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: string | null;
  isLoading: boolean;
  matchInfo: {
    homeTeam: string;
    awayTeam: string;
    league: string;
  };
}

export const MatchAnalysisDialog = ({
  open,
  onOpenChange,
  analysis,
  isLoading,
  matchInfo,
}: MatchAnalysisDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>AI赛事分析</span>
            <Badge variant="outline" className="text-xs">
              {matchInfo.homeTeam} vs {matchInfo.awayTeam}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI正在分析比赛...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {analysis.split('\n').map((paragraph, index) => {
                  if (paragraph.trim() === '') return null;
                  
                  // Check if it's a heading
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    return (
                      <h3 key={index} className="text-lg font-bold text-primary mt-4 mb-2">
                        {paragraph.replace(/\*\*/g, '')}
                      </h3>
                    );
                  }
                  
                  // Check if it's a bullet point
                  if (paragraph.trim().startsWith('-') || paragraph.trim().startsWith('•')) {
                    return (
                      <li key={index} className="ml-4 text-sm leading-relaxed">
                        {paragraph.replace(/^[-•]\s*/, '')}
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
            </div>
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
