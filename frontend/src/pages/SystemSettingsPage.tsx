import { useCallback, useEffect, useState } from 'react';

import { Loader2, RefreshCw, Save, Settings, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { SystemSettingsService } from '@/services/system-settings.service';
import { AISettings } from '@/types/database.types';

export default function SystemSettingsPage() {
  const [aiSettings, setAiSettings] = useState<AISettings>({
    autoApprovalThreshold: 80,
    autoRejectThreshold: 30,
    enableAutoApproval: false,
    enableAutoRejection: true,
    enableContentAnalysis: true,
    enableSmartTags: true,
    confidenceThreshold: 70,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Load AI moderation settings from database
      const aiResponse = await SystemSettingsService.getAIModerationSettings();
      setAiSettings(aiResponse);
    } catch (error) {
      toast.error('Không thể tải cài đặt AI kiểm duyệt');
      console.error('Error loading AI moderation settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      await SystemSettingsService.updateAISettings(aiSettings);
      toast.success('Cài đặt AI kiểm duyệt đã được lưu thành công');
    } catch (error) {
      toast.error('Không thể lưu cài đặt AI kiểm duyệt');
      console.error('Error saving AI moderation settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const initializeDefaults = async () => {
    try {
      setSaving(true);
      await SystemSettingsService.initializeDefaults();
      toast.success('Đã khởi tạo cài đặt AI kiểm duyệt mặc định');
    } catch (error) {
      toast.error('Không thể khởi tạo cài đặt AI kiểm duyệt mặc định');
      console.error('Error initializing AI moderation defaults:', error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleAISettingChange = (
    field: keyof AISettings,
    value: number | boolean,
  ) => {
    // Validation
    if (typeof value === 'number') {
      if (field === 'autoApprovalThreshold' && (value < 50 || value > 100)) {
        toast.error('Ngưỡng phê duyệt phải từ 50% đến 100%');
        return;
      }
      if (field === 'autoRejectThreshold' && (value < 0 || value > 50)) {
        toast.error('Ngưỡng từ chối phải từ 0% đến 50%');
        return;
      }
      if (field === 'confidenceThreshold' && (value < 50 || value > 100)) {
        toast.error('Ngưỡng tin cậy phải từ 50% đến 100%');
        return;
      }
    }

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
              Cài đặt AI Kiểm duyệt
            </h1>
            <p className="text-muted-foreground">
              Quản lý cấu hình AI kiểm duyệt tài liệu
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </Button>
        <Button
          variant="outline"
          onClick={initializeDefaults}
          disabled={saving}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Khởi tạo mặc định
        </Button>
      </div>

      {/* AI Moderation Settings */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Cài đặt AI Kiểm duyệt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto Approval */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Tự động phê duyệt
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Cho phép AI tự động phê duyệt tài liệu dựa trên điểm số
                  </p>
                </div>
                <Switch
                  checked={aiSettings.enableAutoApproval}
                  onCheckedChange={checked =>
                    handleAISettingChange('enableAutoApproval', checked)
                  }
                />
              </div>

              {aiSettings.enableAutoApproval && (
                <div className="space-y-2">
                  <Label htmlFor="approval-threshold">
                    Ngưỡng phê duyệt tự động ({aiSettings.autoApprovalThreshold}
                    %)
                  </Label>
                  <Input
                    id="approval-threshold"
                    type="range"
                    min="50"
                    max="100"
                    value={aiSettings.autoApprovalThreshold}
                    onChange={e =>
                      handleAISettingChange(
                        'autoApprovalThreshold',
                        parseInt(e.target.value, 10),
                      )
                    }
                    className="w-full"
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Auto Rejection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Tự động từ chối
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Cho phép AI tự động từ chối tài liệu dựa trên điểm số
                  </p>
                </div>
                <Switch
                  checked={aiSettings.enableAutoRejection}
                  onCheckedChange={checked =>
                    handleAISettingChange('enableAutoRejection', checked)
                  }
                />
              </div>

              {aiSettings.enableAutoRejection && (
                <div className="space-y-2">
                  <Label htmlFor="rejection-threshold">
                    Ngưỡng từ chối tự động ({aiSettings.autoRejectThreshold}%)
                  </Label>
                  <Input
                    id="rejection-threshold"
                    type="range"
                    min="0"
                    max="50"
                    value={aiSettings.autoRejectThreshold}
                    onChange={e =>
                      handleAISettingChange(
                        'autoRejectThreshold',
                        parseInt(e.target.value, 10),
                      )
                    }
                    className="w-full"
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>0%</span>
                    <span>50%</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Content Analysis */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Phân tích nội dung
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Bật phân tích nội dung AI cho tài liệu
                  </p>
                </div>
                <Switch
                  checked={aiSettings.enableContentAnalysis}
                  onCheckedChange={checked =>
                    handleAISettingChange('enableContentAnalysis', checked)
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Smart Tags */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Thẻ thông minh
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Tự động tạo thẻ cho tài liệu bằng AI
                  </p>
                </div>
                <Switch
                  checked={aiSettings.enableSmartTags}
                  onCheckedChange={checked =>
                    handleAISettingChange('enableSmartTags', checked)
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Confidence Threshold */}
            <div className="space-y-2">
              <Label htmlFor="confidence-threshold">
                Ngưỡng tin cậy ({aiSettings.confidenceThreshold}%)
              </Label>
              <Input
                id="confidence-threshold"
                type="range"
                min="50"
                max="100"
                value={aiSettings.confidenceThreshold}
                onChange={e =>
                  handleAISettingChange(
                    'confidenceThreshold',
                    parseInt(e.target.value, 10),
                  )
                }
                className="w-full"
              />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
