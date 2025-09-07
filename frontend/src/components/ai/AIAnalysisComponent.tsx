import {
    AlertCircle, Brain, CheckCircle, Clock, FileText, Globe, Lightbulb, Loader2, Sparkles, Tags,
    Target
} from 'lucide-react'
import React, { useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AIService, DocumentAnalysisResult } from '@/services/ai.service'

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
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!fileIds.length) {
      setError('No files selected for analysis');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await AIService.analyzeDocument({ fileIds });
      
      // AIService.analyzeDocument now returns AIAnalysisResponse directly
      setAnalysis(response.data);
      setProcessingTime(response.processingTime);
      onAnalysisComplete(response.data);
    } catch (error) {
      console.error('AI analysis error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplySuggestions = () => {
    if (analysis) {
      onAnalysisComplete(analysis);
    }
  };

  const renderAnalysisResult = () => {
    if (!analysis) return null;

    const formattedAnalysis = AIService.formatAnalysisForDisplay(analysis);
    const isHighConfidence = AIService.isHighConfidenceAnalysis(analysis);

    return (
      <Card className="mt-4 border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            AI Analysis Complete
            <Badge 
              variant={isHighConfidence ? 'default' : 'secondary'} 
              className={`ml-auto ${isHighConfidence ? 'bg-green-100 text-green-800' : ''}`}
            >
              {formattedAnalysis.confidence} confidence
            </Badge>
          </CardTitle>
          {processingTime && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Processed in {(processingTime / 1000).toFixed(1)}s
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          {formattedAnalysis.title && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm">Suggested Title</span>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border-l-4 border-blue-400">
                <p className="text-sm font-medium text-blue-900">{formattedAnalysis.title}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {formattedAnalysis.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-sm">Suggested Description</span>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border-l-4 border-green-400">
                <p className="text-sm text-green-900">{formattedAnalysis.description}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {formattedAnalysis.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-sm">Suggested Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {formattedAnalysis.tags.map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {formattedAnalysis.summary && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-sm">Summary</span>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border-l-4 border-purple-400">
                <p className="text-sm text-purple-900">{formattedAnalysis.summary}</p>
              </div>
            </div>
          )}

          {/* Key Points */}
          {formattedAnalysis.keyPoints.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" />
                <span className="font-semibold text-sm">Key Points</span>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-3 rounded-lg border-l-4 border-indigo-400">
                <ul className="text-sm space-y-2">
                  {formattedAnalysis.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-indigo-600 mt-1 flex-shrink-0" />
                      <span className="text-indigo-900">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Metadata Row */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Language:</span>
              <Badge variant="outline" className="text-xs">
                {formattedAnalysis.language.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Difficulty:</span>
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  formattedAnalysis.difficulty === 'beginner' ? 'text-green-700 border-green-200' :
                  formattedAnalysis.difficulty === 'intermediate' ? 'text-yellow-700 border-yellow-200' :
                  'text-red-700 border-red-200'
                }`}
              >
                {formattedAnalysis.difficulty}
              </Badge>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={handleApplySuggestions}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Apply AI Suggestions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={className}>
      {/* Analyze Button */}
      <Card className="border-2 border-dashed border-purple-200 hover:border-purple-300 transition-colors">
        <CardContent className="p-4">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center">
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">AI-Powered Document Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Let AI analyze your documents to automatically generate metadata
              </p>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={disabled || isAnalyzing || !fileIds.length}
              variant="default"
              size="lg"
              className="w-full bg-purple-600 hover:bg-purple-700"
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
            
            {/* Progress Bar for Analysis */}
            {isAnalyzing && (
              <div className="space-y-2">
                <Progress value={66} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  Processing {fileIds.length} file{fileIds.length > 1 ? 's' : ''}...
                </p>
              </div>
            )}
            
            {!analysis && !isAnalyzing && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>✨ Auto-generate titles and descriptions</p>
                <p>🏷️ Extract relevant tags and keywords</p>
                <p>📊 Analyze content difficulty and language</p>
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

      {/* Analysis Results */}
      {renderAnalysisResult()}
    </div>
  );
};
