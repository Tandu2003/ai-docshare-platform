import { useCallback, useEffect, useState } from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AISettings {
  autoApprovalThreshold: number;
  autoRejectThreshold: number;
  enableAutoApproval: boolean;
  enableAutoRejection: boolean;
}

export default function SystemSettingsPage() {
  const [aiSettings, setAiSettings] = useState<AISettings>({
    autoApprovalThreshold: 80,
    autoRejectThreshold: 30,
    enableAutoApproval: false,
    enableAutoRejection: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await SystemSettingsService.getAIModerationSettings();
      // setAiSettings(response);

      // Mock data for now
      setAiSettings({
        autoApprovalThreshold: 80,
        autoRejectThreshold: 30,
        enableAutoApproval: false,
        enableAutoRejection: true,
      });
    } catch (error) {
      toast.error('Không thể tải cài đặt hệ thống');
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      // TODO: Replace with actual API call
      // await SystemSettingsService.updateAISettings(aiSettings);

      toast.success('Cài đặt đã được lưu thành công');
    } catch (error) {
      toast.error('Không thể lưu cài đặt');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleThresholdChange = (field: keyof AISettings, value: number) => {
    setAiSettings(prev => ({
      ...prev,
      [field]: Math.max(0, Math.min(100, value)),
    }));
  };

  const handleToggleChange = (field: keyof AISettings, value: boolean) => {
    setAiSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
            <Settings className="text-primary h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Cài đặt hệ thống
            </h1>
            <p className="text-muted-foreground">
              Quản lý cấu hình AI và kiểm duyệt tự động
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="ai-moderation" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-moderation">AI Kiểm duyệt</TabsTrigger>
          <TabsTrigger value="general">Tổng quát</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-moderation" className="space-y-6">
          {/* AI Moderation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Cài đặt AI Kiểm duyệt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto-approval Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">
                      Tự động duyệt tài liệu
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      Cho phép AI tự động duyệt tài liệu dựa trên điểm đánh giá
                    </p>
                  </div>
                  <Switch
                    checked={aiSettings.enableAutoApproval}
                    onCheckedChange={value =>
                      handleToggleChange('enableAutoApproval', value)
                    }
                  />
                </div>

                {aiSettings.enableAutoApproval && (
                  <div className="ml-6 space-y-4 rounded-lg border p-4">
                    <div className="space-y-2">
                      <Label htmlFor="approval-threshold">
                        Ngưỡng tự động duyệt (0-100)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="approval-threshold"
                          type="number"
                          min="0"
                          max="100"
                          value={aiSettings.autoApprovalThreshold}
                          onChange={e =>
                            handleThresholdChange(
                              'autoApprovalThreshold',
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-24"
                        />
                        <span className="text-muted-foreground text-sm">
                          điểm trở lên
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Tài liệu có điểm AI ≥ {aiSettings.autoApprovalThreshold}{' '}
                        sẽ được tự động duyệt
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Auto-rejection Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">
                      Tự động từ chối tài liệu
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      Cho phép AI tự động từ chối tài liệu có nội dung không phù
                      hợp
                    </p>
                  </div>
                  <Switch
                    checked={aiSettings.enableAutoRejection}
                    onCheckedChange={value =>
                      handleToggleChange('enableAutoRejection', value)
                    }
                  />
                </div>

                {aiSettings.enableAutoRejection && (
                  <div className="ml-6 space-y-4 rounded-lg border p-4">
                    <div className="space-y-2">
                      <Label htmlFor="reject-threshold">
                        Ngưỡng tự động từ chối (0-100)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="reject-threshold"
                          type="number"
                          min="0"
                          max="100"
                          value={aiSettings.autoRejectThreshold}
                          onChange={e =>
                            handleThresholdChange(
                              'autoRejectThreshold',
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-24"
                        />
                        <span className="text-muted-foreground text-sm">
                          điểm trở xuống
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Tài liệu có điểm AI ≤ {aiSettings.autoRejectThreshold}{' '}
                        sẽ bị tự động từ chối
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Current Settings Summary */}
              <div className="space-y-3">
                <h4 className="font-medium">Tóm tắt cài đặt hiện tại:</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Tự động duyệt</p>
                      <p className="text-muted-foreground text-xs">
                        {aiSettings.enableAutoApproval
                          ? `≥ ${aiSettings.autoApprovalThreshold} điểm`
                          : 'Tắt'}
                      </p>
                    </div>
                    <Badge
                      variant={
                        aiSettings.enableAutoApproval ? 'default' : 'secondary'
                      }
                    >
                      {aiSettings.enableAutoApproval ? 'Bật' : 'Tắt'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Tự động từ chối</p>
                      <p className="text-muted-foreground text-xs">
                        {aiSettings.enableAutoRejection
                          ? `≤ ${aiSettings.autoRejectThreshold} điểm`
                          : 'Tắt'}
                      </p>
                    </div>
                    <Badge
                      variant={
                        aiSettings.enableAutoRejection
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {aiSettings.enableAutoRejection ? 'Bật' : 'Tắt'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Lưu cài đặt
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cài đặt tổng quát
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cài đặt tổng quát sẽ được thêm vào đây.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
