import { Brain, Clock, Target, TrendingUp, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { AIAnalysis } from '@/types';
import { getLanguageName } from '@/utils/language';

interface DocumentAIAnalysisProps {
  analysis: AIAnalysis;
}
export function DocumentAIAnalysis({ analysis }: DocumentAIAnalysisProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500';
      case 'intermediate':
        return 'bg-yellow-500';
      case 'advanced':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Người mới bắt đầu';
      case 'intermediate':
        return 'Trung bình';
      case 'advanced':
        return 'Nâng cao';
      default:
        return 'Không xác định';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score > 0.1) return 'text-green-600';
    if (score < -0.1) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentLabel = (score?: number) => {
    if (!score) return 'Trung lập';
    if (score > 0.1) return 'Tích cực';
    if (score < -0.1) return 'Tiêu cực';
    return 'Trung lập';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Phân tích AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        {analysis.summary && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Tóm tắt</h4>
            <p className="text-muted-foreground text-sm">{analysis.summary}</p>
          </div>
        )}

        {/* Key Points */}
        {analysis.keyPoints.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4" />
              Điểm chính
            </h4>
            <ul className="space-y-2">
              {analysis.keyPoints.map((point, index) => (
                <li
                  key={index}
                  className="text-muted-foreground flex items-start gap-2 text-sm"
                >
                  <span className="text-primary mt-1">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Document Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Độ khó</span>
              <Badge
                className={`${getDifficultyColor(analysis.difficulty)} text-white`}
              >
                {getDifficultyLabel(analysis.difficulty)}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Thời gian đọc</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="text-sm">{analysis.readingTime} min</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Độ tin cậy</span>
              <span
                className={`text-sm font-medium ${getConfidenceColor(analysis.confidence)}`}
              >
                {(analysis.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={analysis.confidence * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cảm xúc</span>
              <span
                className={`text-sm font-medium ${getSentimentColor(analysis.sentimentScore)}`}
              >
                {getSentimentLabel(analysis.sentimentScore)}
              </span>
            </div>
            {analysis.sentimentScore && (
              <Progress
                value={((analysis.sentimentScore + 1) / 2) * 100}
                className="h-2"
              />
            )}
          </div>
        </div>

        <Separator />

        {/* Suggested Tags */}
        {analysis.suggestedTags.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Thẻ đề xuất
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.suggestedTags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Language Detection */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Ngôn ngữ</h4>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {getLanguageName(analysis.language)}
            </Badge>
            <span className="text-muted-foreground text-xs">
              Phát hiện với độ tin cậy {(analysis.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Processing Info */}
        <div className="border-t pt-4">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>
              Được xử lý vào{' '}
              {new Date(analysis.processedAt).toLocaleDateString()}
            </span>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>Được hỗ trợ bởi AI</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
