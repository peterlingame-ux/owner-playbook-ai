import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, QrCode, Clock, CheckCircle2, XCircle, Loader2, ArrowUpRight, ArrowDownLeft, Target, MessageCircle, Gift, Gamepad2, FileText } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import usdtIcon from "@/assets/usdt-icon.png";
import hunterCoinIcon from "@/assets/hunter-coin-icon.png";

interface USDTWalletDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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

const USDTWalletDialog = ({ trigger, open: controlledOpen, onOpenChange }: USDTWalletDialogProps) => {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // 支持受控和非受控模式
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
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

        {/* 余额显示 - 参考雷速体育风格 */}
        <div className="relative bg-gradient-to-br from-destructive/90 via-destructive/80 to-destructive/70 rounded-xl p-4 overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute right-0 bottom-0 opacity-20">
            <img src={hunterCoinIcon} alt="" className="w-24 h-24 translate-x-4 translate-y-4" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white/80">猎人币余额</p>
              <span className="text-[10px] px-2 py-0.5 bg-amber-400/90 text-amber-900 rounded font-medium">
                充值及赠送的猎人币不可提现或退款
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white font-mono">{Math.floor(usdtBalance)}</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit" className="flex items-center gap-1.5">
              <ArrowDownLeft className="h-4 w-4" />
              充值
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              明细
            </TabsTrigger>
          </TabsList>

          {/* 充值 Tab */}
          <TabsContent value="deposit" className="mt-4">
            {!showPaymentInfo ? (
              <div className="space-y-5">
                {/* 快捷金额选择 - 网格样式 */}
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => setAmount(String(quickAmount))}
                      className={`relative rounded-lg border-2 p-3 transition-all ${
                        amount === String(quickAmount) 
                          ? 'border-destructive bg-destructive/5' 
                          : 'border-border hover:border-destructive/50'
                      }`}
                    >
                      <div className="text-center">
                        <p className={`text-lg font-bold font-mono ${amount === String(quickAmount) ? 'text-destructive' : 'text-foreground'}`}>
                          {quickAmount}
                        </p>
                        <p className="text-[10px] text-muted-foreground">猎人币</p>
                      </div>
                      <p className={`text-xs mt-1 ${amount === String(quickAmount) ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {quickAmount} PTS
                      </p>
                    </button>
                  ))}
                </div>

                {/* 自定义金额 */}
                <div className="space-y-2">
                  <Label htmlFor="custom-amount" className="text-sm">自定义金额</Label>
                  <div className="relative">
                    <img src={hunterCoinIcon} alt="猎人币" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
                    <Input
                      id="custom-amount"
                      type="number"
                      min="10"
                      step="1"
                      placeholder="输入充值金额"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10 pr-20 font-mono text-lg h-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      猎人币
                    </span>
                  </div>
                </div>

                {/* 立即充值按钮 */}
                <Button 
                  className="w-full h-12 text-lg font-bold bg-destructive hover:bg-destructive/90 text-white rounded-full" 
                  onClick={handleProceed}
                  disabled={!amount || parseFloat(amount) < 10}
                >
                  立即充值
                </Button>

                {/* 提示说明 */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">提示:</p>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li>1. HUNSOCCER是<span className="text-destructive font-medium">AI足球预测平台</span>，猎人币一经充值成功，不支持提现、退款操作。</li>
                    <li>2. 使用本充值服务前，需确认您已<span className="text-destructive font-medium">年满18周岁</span>，若您为未成年人，你使用本服务的行为将被视为已获得监护人认可。</li>
                  </ul>
                </div>

                {/* 充值猎人币可购买内容 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">充值猎人币可购买以下内容</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-destructive" />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center">订阅预测</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Target className="h-6 w-6 text-destructive" />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center">AI分析</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Gift className="h-6 w-6 text-destructive" />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center">VIP特权</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Gamepad2 className="h-6 w-6 text-destructive" />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center">预测竞猜</span>
                    </div>
                  </div>
                </div>
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