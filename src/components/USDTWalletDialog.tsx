import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Copy, Check, QrCode, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { useEffect } from "react";

interface USDTWalletDialogProps {
  trigger?: React.ReactNode;
}

const USDT_WALLET_ADDRESS = "TYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const USDTWalletDialog = ({ trigger }: USDTWalletDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);

  // 生成二维码
  useEffect(() => {
    if (showPaymentInfo && amount) {
      QRCode.toDataURL(USDT_WALLET_ADDRESS, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => {
          setQrCodeUrl(url);
        })
        .catch((err) => {
          console.error('QR Code generation error:', err);
        });
    }
  }, [showPaymentInfo, amount]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(USDT_WALLET_ADDRESS);
      setIsCopied(true);
      toast.success("钱包地址已复制");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("复制失败，请手动复制");
    }
  };

  const handleProceed = () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("请输入有效的充值金额");
      return;
    }
    if (numAmount < 10) {
      toast.error("最低充值金额为 10 USDT");
      return;
    }
    setShowPaymentInfo(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setAmount("");
    setShowPaymentInfo(false);
    setQrCodeUrl("");
  };

  const quickAmounts = [50, 100, 500, 1000];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            USDT钱包
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            USDT 充值
          </DialogTitle>
        </DialogHeader>

        {!showPaymentInfo ? (
          <div className="space-y-6 py-4">
            {/* 充值说明 */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground">
                请输入充值金额，系统将生成收款地址和二维码。请使用 TRC20 网络转账 USDT。
              </p>
            </div>

            {/* 快捷金额 */}
            <div className="space-y-2">
              <Label>快捷金额</Label>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    variant={amount === String(quickAmount) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(String(quickAmount))}
                    className="font-mono"
                  >
                    {quickAmount}
                  </Button>
                ))}
              </div>
            </div>

            {/* 自定义金额 */}
            <div className="space-y-2">
              <Label htmlFor="custom-amount">自定义金额 (USDT)</Label>
              <div className="relative">
                <Input
                  id="custom-amount"
                  type="number"
                  min="10"
                  step="1"
                  placeholder="输入充值金额"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  USDT
                </span>
              </div>
              <p className="text-xs text-muted-foreground">最低充值金额: 10 USDT</p>
            </div>

            {/* 确认按钮 */}
            <Button 
              className="w-full" 
              onClick={handleProceed}
              disabled={!amount || parseFloat(amount) < 10}
            >
              确认金额
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* 充值金额显示 */}
            <div className="text-center bg-primary/10 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">充值金额</p>
              <p className="text-3xl font-bold font-mono text-primary">{amount} USDT</p>
            </div>

            {/* 二维码 */}
            <div className="flex flex-col items-center space-y-3">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="USDT Address QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-lg">
                    <QrCode className="h-12 w-12 text-muted-foreground animate-pulse" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">扫描二维码或复制下方地址</p>
            </div>

            {/* 钱包地址 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                钱包地址 
                <span className="text-xs font-normal px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
                  TRC20
                </span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={USDT_WALLET_ADDRESS}
                  readOnly
                  className="font-mono text-xs bg-muted/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyAddress}
                  className="shrink-0"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 重要提示 */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-destructive">重要提示</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 请确保使用 <strong>TRC20</strong> 网络转账</li>
                <li>• 转账金额需与上方显示金额一致</li>
                <li>• 转账完成后，余额将在 1-10 分钟内到账</li>
                <li>• 如有问题请联系客服</li>
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPaymentInfo(false)}
              >
                返回修改
              </Button>
              <Button
                className="flex-1"
                onClick={handleClose}
              >
                我已完成转账
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default USDTWalletDialog;
