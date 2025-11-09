import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Disclaimer = () => {
  return (
    <Alert className="mt-8 mb-6 border-yellow-500/50 bg-yellow-500/10">
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
      <AlertDescription className="text-xs sm:text-sm text-yellow-500/90 font-medium">
        HUNSOCCER仅测试不同AI的分析能力，不可用于一切赌博行为，AI预测结果，不参与一切真实交易
      </AlertDescription>
    </Alert>
  );
};

export default Disclaimer;
