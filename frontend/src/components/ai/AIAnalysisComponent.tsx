import { AlertCircle, CheckCircle, Loader2, Sparkles } from 'lucide-react';

import React, { useState } from 'react';

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
      setError('No files selected for analysis');
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
      setError(error instanceof Error ? error.message : 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={className}>
      <Card className="border-2 border-dashed !py-0 border-gray-200 hover:border-gray-300 transition-colors">
        <CardContent className="p-4">
          <div className="text-center space-y-3">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-1 justify-center">
                <Sparkles className="h-4 w-4 text-gray-600" />
                <h3 className="font-semibold text-lg">AI-Powered Document Analysis</h3>
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Documents...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </div>

            {hasAnalyzed && !isAnalyzing && (
              <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-md">
                <p className="text-sm flex items-center gap-1 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Analysis applied to document
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
