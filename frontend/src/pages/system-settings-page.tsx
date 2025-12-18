import { useCallback, useEffect, useState, type ReactElement } from 'react';

import {
  Coins,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  PointsSettings,
  SimilaritySettings,
  SystemSettingsService,
} from '@/services/system-settings.service';
import { AISettings } from '@/types/database.types';

export function SystemSettingsPage(): ReactElement {
  const [aiSettings, setAiSettings] = useState<AISettings>({
    autoApprovalThreshold: 80,
    autoRejectThreshold: 30,
    enableAutoApproval: false,
    enableAutoRejection: true,
    enableContentAnalysis: true,
    enableSmartTags: true,
    confidenceThreshold: 70,
    // Similarity settings - separate toggles
    enableSimilarityAutoReject: true,
    enableSimilarityManualReview: true,
    similarityAutoRejectThreshold: 90,
    similarityManualReviewThreshold: 70,
  });

  const [pointsSettings, setPointsSettings] = useState<PointsSettings>({
    uploadReward: 5,
    downloadCost: 1,
    dailyEarnLimit: 0,
  });

  const [similaritySettings, setSimilaritySettings] =
    useState<SimilaritySettings>({
      similarityDetection: 0.85,
      embeddingMatch: 0.75,
      hashMatch: 0.95,
      hashInclude: 0.6,
      hashWeight: 0.4,
      textWeight: 0.3,
      embeddingWeight: 0.3,
      jaccardWeight: 0.6,
      levenshteinWeight: 0.4,
    });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Load AI moderation settings from database
      const aiResponse = await SystemSettingsService.getAIModerationSettings();
      setAiSettings(aiResponse);

      // Load points settings from database
      const pointsResponse = await SystemSettingsService.getPointsSettings();
      setPointsSettings(pointsResponse);

      // Load similarity settings from database
      try {
        const similarityResponse =
          await SystemSettingsService.getSimilaritySettings();
        setSimilaritySettings(similarityResponse);
      } catch {
        // Use defaults if similarity settings not available
      }
    } catch {
      toast.error('Không thể tải cài đặt hệ thống');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      await SystemSettingsService.updateAISettings(aiSettings);
      await SystemSettingsService.updatePointsSettings(pointsSettings);
      await SystemSettingsService.updateSimilaritySettings(similaritySettings);
      toast.success('Cài đặt hệ thống đã được lưu thành công');
    } catch {
      toast.error('Không thể lưu cài đặt hệ thống');
    } finally {
      setSaving(false);
    }
  };

  const initializeDefaults = async () => {
    try {
      setSaving(true);
      await SystemSettingsService.initializeDefaults();
      await loadSettings();
      toast.success('Đã khởi tạo cài đặt hệ thống mặc định');
    } catch {
      toast.error('Không thể khởi tạo cài đặt hệ thống mặc định');
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

  const handlePointsSettingChange = (
    field: keyof PointsSettings,
    value: number,
  ) => {
    // Validation
    if (field === 'uploadReward' && (value < 0 || value > 100)) {
      toast.error('Điểm thưởng upload phải từ 0 đến 100');
      return;
    }
    if (field === 'downloadCost' && (value < 0 || value > 50)) {
      toast.error('Chi phí tải xuống phải từ 0 đến 50');
      return;
    }
    if (field === 'dailyEarnLimit' && value < 0) {
      toast.error('Giới hạn điểm trong ngày phải >= 0 (0 = không giới hạn)');
      return;
    }

    setPointsSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSimilaritySettingChange = (
    field: keyof SimilaritySettings,
    value: number,
  ) => {
    // Validation - all values must be between 0 and 1
    if (value < 0 || value > 1) {
      toast.error('Giá trị phải từ 0 đến 1');
      return;
    }

    setSimilaritySettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Validate weights sum to 1.0
  const validateWeights = () => {
    const combinedSum =
      similaritySettings.hashWeight +
      similaritySettings.textWeight +
      similaritySettings.embeddingWeight;
    const textSum =
      similaritySettings.jaccardWeight + similaritySettings.levenshteinWeight;

    if (Math.abs(combinedSum - 1.0) > 0.01) {
      return 'Tổng trọng số kết hợp (Hash + Text + Embedding) phải bằng 1.0';
    }
    if (Math.abs(textSum - 1.0) > 0.01) {
      return 'Tổng trọng số văn bản (Jaccard + Levenshtein) phải bằng 1.0';
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
            <Settings className="text-primary h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Cài đặt Hệ thống
            </h1>
            <p className="text-muted-foreground">
              Quản lý cấu hình hệ thống: AI kiểm duyệt, điểm thưởng, v.v.
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

            <Separator />

            {/* Similarity Check Settings - Separate toggles for each checkpoint */}
            <div className="space-y-6">
              {/* Auto Reject Similarity Check */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      Tự động từ chối tài liệu tương đồng
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      Tự động từ chối tài liệu có độ tương đồng cao với tài liệu
                      đã có
                    </p>
                  </div>
                  <Switch
                    checked={aiSettings.enableSimilarityAutoReject}
                    onCheckedChange={checked =>
                      handleAISettingChange(
                        'enableSimilarityAutoReject',
                        checked,
                      )
                    }
                  />
                </div>

                {aiSettings.enableSimilarityAutoReject && (
                  <div className="border-muted space-y-2 border-l-2 pl-4">
                    <Label htmlFor="similarity-reject-threshold">
                      Ngưỡng tự động từ chối (
                      {aiSettings.similarityAutoRejectThreshold}%)
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Tài liệu có độ tương đồng ≥ ngưỡng này sẽ bị tự động từ
                      chối
                    </p>
                    <Input
                      id="similarity-reject-threshold"
                      type="range"
                      min="50"
                      max="100"
                      value={aiSettings.similarityAutoRejectThreshold}
                      onChange={e =>
                        handleAISettingChange(
                          'similarityAutoRejectThreshold',
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

              {/* Manual Review Similarity Check */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      Xem xét thủ công tài liệu tương đồng
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      Yêu cầu xem xét thủ công cho tài liệu có độ tương đồng cao
                      (không tự động duyệt)
                    </p>
                  </div>
                  <Switch
                    checked={aiSettings.enableSimilarityManualReview}
                    onCheckedChange={checked =>
                      handleAISettingChange(
                        'enableSimilarityManualReview',
                        checked,
                      )
                    }
                  />
                </div>

                {aiSettings.enableSimilarityManualReview && (
                  <div className="border-muted space-y-2 border-l-2 pl-4">
                    <Label htmlFor="similarity-review-threshold">
                      Ngưỡng xem xét thủ công (
                      {aiSettings.similarityManualReviewThreshold}%)
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Tài liệu có độ tương đồng ≥ ngưỡng này sẽ cần xem xét thủ
                      công (không tự động duyệt)
                    </p>
                    <Input
                      id="similarity-review-threshold"
                      type="range"
                      min="30"
                      max={aiSettings.similarityAutoRejectThreshold - 1}
                      value={aiSettings.similarityManualReviewThreshold}
                      onChange={e =>
                        handleAISettingChange(
                          'similarityManualReviewThreshold',
                          parseInt(e.target.value, 10),
                        )
                      }
                      className="w-full"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>30%</span>
                      <span>
                        {aiSettings.similarityAutoRejectThreshold - 1}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Points System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Cài đặt Hệ thống Điểm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Reward */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-base font-medium">
                  Điểm thưởng khi tải lên
                </Label>
                <p className="text-muted-foreground text-sm">
                  Số điểm người dùng nhận được khi tải lên tài liệu
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={pointsSettings.uploadReward}
                    onChange={e =>
                      handlePointsSettingChange(
                        'uploadReward',
                        parseInt(e.target.value, 10) || 0,
                      )
                    }
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-sm">điểm</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Khuyến nghị: 5-10 điểm
                </p>
              </div>
            </div>

            <Separator />

            {/* Download Cost */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-base font-medium">
                  Chi phí tải xuống (mặc định)
                </Label>
                <p className="text-muted-foreground text-sm">
                  Số điểm mặc định khi tải tài liệu. Người tải trả bao nhiêu =
                  Uploader nhận bấy nhiêu.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={pointsSettings.downloadCost}
                    onChange={e =>
                      handlePointsSettingChange(
                        'downloadCost',
                        parseInt(e.target.value, 10) || 0,
                      )
                    }
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-sm">điểm</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Khuyến nghị: 1-5 điểm. Uploader có thể đặt giá riêng cho từng
                  tài liệu.
                </p>
              </div>
            </div>

            <Separator />

            {/* Daily Earn Limit */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-base font-medium">
                  Giới hạn điểm kiếm được trong ngày
                </Label>
                <p className="text-muted-foreground text-sm">
                  Số điểm tối đa một người dùng có thể kiếm được trong 1 ngày (0
                  = không giới hạn)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="0"
                    value={pointsSettings.dailyEarnLimit}
                    onChange={e =>
                      handlePointsSettingChange(
                        'dailyEarnLimit',
                        parseInt(e.target.value, 10) || 0,
                      )
                    }
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-sm">
                    điểm/ngày (0 = không giới hạn)
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Giúp ngăn chặn spam để kiếm điểm. Đặt 0 để tắt giới hạn.
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="mb-2 font-medium">ℹ️ Cách thức hoạt động</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>
                  • <strong>Điểm thưởng upload:</strong> Người dùng nhận điểm
                  khi tải lên tài liệu mới
                </li>
                <li>
                  • <strong>Chi phí tải xuống = Điểm uploader nhận:</strong>{' '}
                  Người tải trả bao nhiêu điểm thì người upload nhận bấy nhiêu
                </li>
                <li>
                  • <strong>Giới hạn điểm trong ngày:</strong> Ngăn chặn spam để
                  kiếm điểm. Chỉ tính các giao dịch EARN (kiếm điểm), không tính
                  SPEND (tiêu điểm)
                </li>
                <li>
                  • <strong>Tải lại miễn phí:</strong> Sau khi đã tải thành
                  công, các lần tải sau không mất điểm
                </li>
                <li>
                  • <strong>Uploader tùy chỉnh:</strong> Uploader có thể đặt giá
                  riêng cho tài liệu của mình
                </li>
                <li>
                  • <strong>Tính chính xác:</strong> Chỉ tính điểm khi file được
                  tải hoàn tất thực sự
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Similarity Algorithm Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Cài đặt Thuật toán Tương đồng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Weight validation warning */}
            {validateWeights() && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                ⚠️ {validateWeights()}
              </div>
            )}

            {/* Thresholds Section */}
            <div className="space-y-4">
              <h4 className="font-medium">Ngưỡng phát hiện</h4>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Ngưỡng phát hiện tương đồng (
                    {Math.round(similaritySettings.similarityDetection * 100)}%)
                  </Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(
                      similaritySettings.similarityDetection * 100,
                    )}
                    onChange={e =>
                      handleSimilaritySettingChange(
                        'similarityDetection',
                        parseInt(e.target.value, 10) / 100,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Ngưỡng embedding (
                    {Math.round(similaritySettings.embeddingMatch * 100)}%)
                  </Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(similaritySettings.embeddingMatch * 100)}
                    onChange={e =>
                      handleSimilaritySettingChange(
                        'embeddingMatch',
                        parseInt(e.target.value, 10) / 100,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Ngưỡng hash (
                    {Math.round(similaritySettings.hashMatch * 100)}%)
                  </Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(similaritySettings.hashMatch * 100)}
                    onChange={e =>
                      handleSimilaritySettingChange(
                        'hashMatch',
                        parseInt(e.target.value, 10) / 100,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Ngưỡng hash include (
                    {Math.round(similaritySettings.hashInclude * 100)}%)
                  </Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(similaritySettings.hashInclude * 100)}
                    onChange={e =>
                      handleSimilaritySettingChange(
                        'hashInclude',
                        parseInt(e.target.value, 10) / 100,
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Combined Weights Section */}
            <div className="space-y-4">
              <h4 className="font-medium">
                Trọng số kết hợp (tổng = 1.0, hiện tại:{' '}
                {(
                  similaritySettings.hashWeight +
                  similaritySettings.textWeight +
                  similaritySettings.embeddingWeight
                ).toFixed(2)}
                )
              </h4>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>
                    Hash ({Math.round(similaritySettings.hashWeight * 100)}%)
                  </Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(similaritySettings.hashWeight * 100)}
                    onChange={e =>
                      handleSimilaritySettingChange(
                        'hashWeight',
                        parseInt(e.target.value, 10) / 100,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Text ({Math.round(similaritySettings.textWeight * 100)}%)
                  </Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(similaritySettings.textWeight * 100)}
                    onChange={e =>
                      handleSimilaritySettingChange(
                        'textWeight',
                        parseInt(e.target.value, 10) / 100,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Embedding (
                    {Math.round(similaritySettings.embeddingWeight * 100)}%)
                  </Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(similaritySettings.embeddingWeight * 100)}
                    onChange={e =>
                      handleSimilaritySettingChange(
                        'embeddingWeight',
                        parseInt(e.target.value, 10) / 100,
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Text Weights Section */}
            <div className="space-y-4">
              <h4 className="font-medium">
                Trọng số văn bản (tổng = 1.0, hiện tại:{' '}
                {(
                  similaritySettings.jaccardWeight +
                  similaritySettings.levenshteinWeight
                ).toFixed(2)}
                )
              </h4>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Jaccard (
                    {Math.round(similaritySettings.jaccardWeight * 100)}
                    %)
                  </Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(similaritySettings.jaccardWeight * 100)}
                    onChange={e =>
                      handleSimilaritySettingChange(
                        'jaccardWeight',
                        parseInt(e.target.value, 10) / 100,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Levenshtein (
                    {Math.round(similaritySettings.levenshteinWeight * 100)}%)
                  </Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(
                      similaritySettings.levenshteinWeight * 100,
                    )}
                    onChange={e =>
                      handleSimilaritySettingChange(
                        'levenshteinWeight',
                        parseInt(e.target.value, 10) / 100,
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="mb-2 font-medium">ℹ️ Giải thích</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>
                  • <strong>Ngưỡng phát hiện:</strong> Điểm tương đồng tối thiểu
                  để coi là trùng lặp
                </li>
                <li>
                  • <strong>Trọng số kết hợp:</strong> Tỷ lệ đóng góp của từng
                  phương pháp vào điểm cuối cùng
                </li>
                <li>
                  • <strong>Hash:</strong> So sánh file hash (nhanh, chính xác
                  cho file giống hệt)
                </li>
                <li>
                  • <strong>Text:</strong> So sánh nội dung văn bản (Jaccard +
                  Levenshtein)
                </li>
                <li>
                  • <strong>Embedding:</strong> So sánh ngữ nghĩa bằng AI
                  (cosine similarity)
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
