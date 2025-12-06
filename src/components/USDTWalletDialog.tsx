import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Copy, Check, QrCode, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import usdtIcon from "@/assets/usdt-icon.png";

interface USDTWalletDialogProps {
  trigger?: React.ReactNode;
}

interface DepositRecord {
  id: string;
  amount: number;
  network: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
}

const USDT_WALLET_ADDRESS = "TYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const USDTWalletDialog = ({ trigger }: USDTWalletDialogProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [activeTab, setActiveTab] = useState("deposit");
  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取充值记录
  const fetchDepositRecords = async () => {
    if (!user) return;
    
    setIsLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('deposit_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setDepositRecords(data || []);
    } catch (error) {
      console.error('Error fetching deposit records:', error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // 打开弹窗时获取记录
  useEffect(() => {
    if (isOpen && activeTab === "history") {
      fetchDepositRecords();
    }
  }, [isOpen, activeTab, user]);

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

  // 提交充值记录
  const handleSubmitDeposit = async () => {
    if (!user) {
      toast.error("请先登录");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('deposit_records')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          network: 'TRC20',
          wallet_address: USDT_WALLET_ADDRESS,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("充值请求已提交，请完成转账");
      handleClose();
      // 刷新记录
      fetchDepositRecords();
    } catch (error) {
      console.error('Error submitting deposit:', error);
      toast.error("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setAmount("");
    setShowPaymentInfo(false);
    setQrCodeUrl("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
            <CheckCircle2 className="h-3 w-3" />
            已确认
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            待确认
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
            <XCircle className="h-3 w-3" />
            失败
          </span>
        );
      default:
        return null;
    }
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
            <img src={usdtIcon} alt="USDT" className="w-4 h-4" />
            USDT钱包
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={usdtIcon} alt="USDT" className="w-6 h-6" />
            USDT 钱包
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit" className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              充值
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              记录
            </TabsTrigger>
          </TabsList>

          {/* 充值 Tab */}
          <TabsContent value="deposit" className="mt-4">
            {!showPaymentInfo ? (
              <div className="space-y-6">
                {/* 充值说明 */}
                <div className="bg-muted/50 rounded-lg p-4 text-sm flex items-start gap-3">
                  <img src={usdtIcon} alt="USDT" className="w-8 h-8 shrink-0" />
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
                    <img src={usdtIcon} alt="USDT" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
                    <Input
                      id="custom-amount"
                      type="number"
                      min="10"
                      step="1"
                      placeholder="输入充值金额"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10 pr-16 font-mono"
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
              <div className="space-y-6">
                {/* 充值金额显示 */}
                <div className="text-center bg-primary/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">充值金额</p>
                  <div className="flex items-center justify-center gap-2">
                    <img src={usdtIcon} alt="USDT" className="w-8 h-8" />
                    <p className="text-3xl font-bold font-mono text-primary">{amount} USDT</p>
                  </div>
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
                    onClick={handleSubmitDeposit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      "我已完成转账"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 历史记录 Tab */}
          <TabsContent value="history" className="mt-4">
            <div className="space-y-4">
              {isLoadingRecords ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : depositRecords.length === 0 ? (
                <div className="text-center py-12">
                  <img src={usdtIcon} alt="USDT" className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground">暂无充值记录</p>
                  <p className="text-xs text-muted-foreground mt-1">您的充值记录将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {depositRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-muted/30 rounded-lg p-4 border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <img src={usdtIcon} alt="USDT" className="w-5 h-5" />
                          <span className="font-mono font-bold text-foreground">
                            {record.amount} USDT
                          </span>
                        </div>
                        {getStatusBadge(record.status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{record.network} 网络</span>
                        <span>{format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}</span>
                      </div>
                      {record.confirmed_at && (
                        <p className="text-xs text-success mt-1">
                          确认时间: {format(new Date(record.confirmed_at), 'yyyy-MM-dd HH:mm')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 刷新按钮 */}
              {depositRecords.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={fetchDepositRecords}
                  disabled={isLoadingRecords}
                >
                  {isLoadingRecords ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  刷新记录
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default USDTWalletDialog;
