import React, { useState } from 'react';

import { AlertCircle, CheckCircle, Loader2, Sparkles } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AIService, DocumentAnalysisResult } from '@/services/ai.service';

interface AIAnalysisComponentProps {
  fileIds: string[];
  onAnalysisComplete: (analysis: DocumentAnalysisResult) => void;
  disabled?: boolean;
  className?: string;
}

export const AIAnalysisComponent: React.FC<AIAnalysisComponentProps> = ({
  fileIds,
  onAnalysisComplete,
  disabled = false,
  className = '',
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    if (!fileIds.length) {
      setError('Chưa chọn tệp nào để phân tích');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setHasAnalyzed(false);

    try {
      const response = await AIService.analyzeDocument({ fileIds });
      if (response.data) {
        onAnalysisComplete(response.data);
      }
      setHasAnalyzed(true);
    } catch (error) {
      console.error('AI analysis error:', error);
      setError(
        error instanceof Error ? error.message : 'Không thể phân tích tài liệu',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={className}>
      <Card className="border-2 border-dashed border-gray-200 !py-0 transition-colors hover:border-gray-300">
        <CardContent className="p-4">
          <div className="space-y-3 text-center">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4 text-gray-600" />
                <h3 className="text-lg font-semibold">
                  Phân tích tài liệu bằng AI
                </h3>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={disabled || isAnalyzing || !fileIds.length}
                variant="default"
                size="lg"
                className="bg-gray-900 hover:bg-gray-800"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Documents...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </div>

            {hasAnalyzed && !isAnalyzing && (
              <div className="mt-2 rounded-md border border-green-100 bg-green-50 p-2">
                <p className="flex items-center gap-1 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Phân tích đã được áp dụng cho tài liệu
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
