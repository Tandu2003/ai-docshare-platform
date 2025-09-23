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
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      default:
        return 'Unknown';
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
    if (!score) return 'Neutral';
    if (score > 0.1) return 'Positive';
    if (score < -0.1) return 'Negative';
    return 'Neutral';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        {analysis.summary && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Summary</h4>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </div>
        )}

        {/* Key Points */}
        {analysis.keyPoints.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Key Points
            </h4>
            <ul className="space-y-2">
              {analysis.keyPoints.map((point, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
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
              <span className="text-sm font-medium">Difficulty</span>
              <Badge className={`${getDifficultyColor(analysis.difficulty)} text-white`}>
                {getDifficultyLabel(analysis.difficulty)}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Reading Time</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="text-sm">{analysis.readingTime} min</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence</span>
              <span className={`text-sm font-medium ${getConfidenceColor(analysis.confidence)}`}>
                {(analysis.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={analysis.confidence * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sentiment</span>
              <span className={`text-sm font-medium ${getSentimentColor(analysis.sentimentScore)}`}>
                {getSentimentLabel(analysis.sentimentScore)}
              </span>
            </div>
            {analysis.sentimentScore && (
              <Progress value={((analysis.sentimentScore + 1) / 2) * 100} className="h-2" />
            )}
          </div>
        </div>

        <Separator />

        {/* Suggested Tags */}
        {analysis.suggestedTags.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Suggested Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.suggestedTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Language Detection */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Language</h4>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{getLanguageName(analysis.language)}</Badge>
            <span className="text-xs text-muted-foreground">
              Detected with {(analysis.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>

        {/* Processing Info */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Processed on {new Date(analysis.processedAt).toLocaleDateString()}</span>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>AI Powered</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
