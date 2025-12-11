import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, QrCode, Clock, CheckCircle2, XCircle, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import usdtIcon from "@/assets/usdt-icon.png";
import hunterCoinIcon from "@/assets/hunter-coin-icon.png";

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

interface WithdrawalRecord {
  id: string;
  amount: number;
  network: string;
  wallet_address: string;
  status: string;
  created_at: string;
  processed_at: string | null;
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
  const [withdrawalRecords, setWithdrawalRecords] = useState<WithdrawalRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Withdrawal states
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [usdtBalance, setUsdtBalance] = useState(0);

  // 获取USDT余额
  const fetchUsdtBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('usdt_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setUsdtBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching USDT balance:', error);
    }
  };

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

  // 获取提款记录
  const fetchWithdrawalRecords = async () => {
    if (!user) return;
    
    setIsLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('withdrawal_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setWithdrawalRecords(data || []);
    } catch (error) {
      console.error('Error fetching withdrawal records:', error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // 打开弹窗时获取数据
  useEffect(() => {
    if (isOpen) {
      fetchUsdtBalance();
      if (activeTab === "history") {
        fetchDepositRecords();
        fetchWithdrawalRecords();
      }
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
      fetchDepositRecords();
    } catch (error) {
      console.error('Error submitting deposit:', error);
      toast.error("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 提交提款请求
  const handleSubmitWithdrawal = async () => {
    if (!user) {
      toast.error("请先登录");
      return;
    }

    const numAmount = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("请输入有效的提款金额");
      return;
    }
    if (numAmount < 10) {
      toast.error("最低提款金额为 10 USDT");
      return;
    }
    if (numAmount > usdtBalance) {
      toast.error("余额不足");
      return;
    }
    if (!withdrawAddress || withdrawAddress.length < 20) {
      toast.error("请输入有效的钱包地址");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('request_withdrawal', {
        p_user_id: user.id,
        p_amount: numAmount,
        p_wallet_address: withdrawAddress,
        p_network: 'TRC20'
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; new_balance?: number };
      
      if (!result.success) {
        toast.error(result.error || "提款失败");
        return;
      }

      toast.success("提款请求已提交，请等待处理");
      setWithdrawAmount("");
      setWithdrawAddress("");
      setUsdtBalance(result.new_balance || 0);
      fetchWithdrawalRecords();
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
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
    setWithdrawAmount("");
    setWithdrawAddress("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
            <CheckCircle2 className="h-3 w-3" />
            已完成
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            待处理
          </span>
        );
      case 'failed':
      case 'rejected':
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
  const withdrawQuickAmounts = [10, 50, 100, 500];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <img src={hunterCoinIcon} alt="猎人币" className="w-5 h-5" />
            猎人币钱包
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={hunterCoinIcon} alt="猎人币" className="w-6 h-6" />
            猎人币钱包
          </DialogTitle>
        </DialogHeader>

        {/* 余额显示 */}
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-lg p-4 border border-amber-500/20">
          <p className="text-xs text-muted-foreground mb-1">猎人币余额</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-500 font-mono">{usdtBalance.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">猎人币</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit" className="flex items-center gap-1.5">
              <ArrowDownLeft className="h-4 w-4" />
              充值
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4" />
              提款
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
                    请输入充值金额，使用 TRC20 网络转账 USDT，到账后自动兑换为猎人币（1:1）。
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

          {/* 提款 Tab */}
          <TabsContent value="withdraw" className="mt-4">
            <div className="space-y-6">
              {/* 提款说明 */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm flex items-start gap-3">
                <ArrowUpRight className="h-8 w-8 text-muted-foreground shrink-0" />
                <p className="text-muted-foreground">
                  猎人币提款将自动兑换为 USDT（1:1）转入您的钱包，24 小时内处理。
                </p>
              </div>

              {/* 快捷金额 */}
              <div className="space-y-2">
                <Label>快捷金额</Label>
                <div className="grid grid-cols-4 gap-2">
                  {withdrawQuickAmounts.map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      variant={withdrawAmount === String(quickAmount) ? "default" : "outline"}
                      size="sm"
                      onClick={() => setWithdrawAmount(String(quickAmount))}
                      className="font-mono"
                      disabled={quickAmount > usdtBalance}
                    >
                      {quickAmount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 提款金额 */}
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">提款金额 (猎人币)</Label>
                <div className="relative">
                  <img src={hunterCoinIcon} alt="猎人币" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
                  <Input
                    id="withdraw-amount"
                    type="number"
                    min="10"
                    max={usdtBalance}
                    step="1"
                    placeholder="输入提款金额"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="pl-10 pr-16 font-mono"
                  />
                  <button
                    onClick={() => setWithdrawAmount(String(usdtBalance))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary hover:underline"
                  >
                    全部
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  可用余额: <span className="text-amber-500 font-mono">{usdtBalance.toFixed(2)}</span> 猎人币 · 最低提款: 10 猎人币
                </p>
              </div>

              {/* 收款地址 */}
              <div className="space-y-2">
                <Label htmlFor="withdraw-address" className="flex items-center gap-2">
                  收款钱包地址
                  <span className="text-xs font-normal px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
                    TRC20
                  </span>
                </Label>
                <textarea
                  id="withdraw-address"
                  placeholder="请输入您的 TRC20 钱包地址 (以 T 开头)"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="w-full min-h-[60px] px-4 py-3 font-mono text-sm bg-background border-2 border-input rounded-md focus:border-[#26A17B] focus:outline-none focus:ring-1 focus:ring-[#26A17B] transition-colors resize-none placeholder:text-muted-foreground"
                  autoComplete="off"
                  spellCheck={false}
                  rows={2}
                />
                {withdrawAddress && withdrawAddress.length > 0 && (
                  <p className={`text-xs ${withdrawAddress.length >= 34 ? 'text-success' : 'text-muted-foreground'}`}>
                    已输入 {withdrawAddress.length} 个字符 {withdrawAddress.length >= 34 ? '✓' : '(TRC20地址通常为34个字符)'}
                  </p>
                )}
              </div>

              {/* 重要提示 */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">注意事项</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 请确保输入正确的 <strong>TRC20</strong> 钱包地址</li>
                  <li>• 提款将在 24 小时内处理</li>
                  <li>• 地址错误导致的损失无法找回</li>
                </ul>
              </div>

              {/* 提款按钮 */}
              <Button 
                className="w-full bg-[#26A17B] hover:bg-[#26A17B]/90" 
                onClick={handleSubmitWithdrawal}
                disabled={
                  isSubmitting || 
                  !withdrawAmount || 
                  parseFloat(withdrawAmount) < 10 || 
                  parseFloat(withdrawAmount) > usdtBalance ||
                  !withdrawAddress ||
                  withdrawAddress.length < 20
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  "确认提款"
                )}
              </Button>
            </div>
          </TabsContent>

          {/* 历史记录 Tab */}
          <TabsContent value="history" className="mt-4">
            <div className="space-y-4">
              {isLoadingRecords ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (depositRecords.length === 0 && withdrawalRecords.length === 0) ? (
                <div className="text-center py-12">
                  <img src={hunterCoinIcon} alt="猎人币" className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground">暂无交易记录</p>
                  <p className="text-xs text-muted-foreground mt-1">您的充值和提款记录将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {/* 合并并排序记录 */}
                  {[
                    ...depositRecords.map(r => ({ ...r, type: 'deposit' as const })),
                    ...withdrawalRecords.map(r => ({ ...r, type: 'withdrawal' as const }))
                  ]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((record) => (
                      <div
                        key={record.id}
                        className="bg-muted/30 rounded-lg p-4 border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {record.type === 'deposit' ? (
                              <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                                <ArrowDownLeft className="h-3.5 w-3.5 text-success" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                              </div>
                            )}
                            <div>
                              <span className="font-mono font-bold text-foreground">
                                {record.type === 'deposit' ? '+' : '-'}{record.amount} 猎人币
                              </span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {record.type === 'deposit' ? '充值' : '提款'}
                              </span>
                            </div>
                          </div>
                          {getStatusBadge(record.status)}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{record.network} 网络</span>
                          <span>{format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}</span>
                        </div>
                        {record.type === 'withdrawal' && 'wallet_address' in record && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            收款地址: {record.wallet_address}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* 刷新按钮 */}
              {(depositRecords.length > 0 || withdrawalRecords.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    fetchDepositRecords();
                    fetchWithdrawalRecords();
                  }}
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