export interface DocumentResponse {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  filePath: string;
  thumbnailPath?: string;
  uploader: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  category: {
    id: string;
    name: string;
    description?: string;
  };
  downloadCount: number;
  viewCount: number;
  averageRating: number;
  totalRatings: number;
  tags: string[];
  isPublic: boolean;
  isPremium: boolean;
  isApproved: boolean;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  aiAnalysis?: AIAnalysisResponse;
  userRating?: {
    rating: number;
    createdAt: Date;
  };
  isBookmarked?: boolean;
  canDownload?: boolean;
  canEdit?: boolean;
}

export interface AIAnalysisResponse {
  id: string;
  summary?: string;
  keyPoints: string[];
  suggestedTags: string[];
  difficulty: string;
  readingTime: number;
  language: string;
  confidence: number;
  sentimentScore?: number;
  topicModeling?: any;
  namedEntities?: any;
  processedAt: Date;
}

export interface SearchResponse {
  items: DocumentResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    categories: { id: string; name: string }[];
    tags: string[];
    uploaders: any[];
  };
}

export interface PopularDocumentResponse extends DocumentResponse {
  popularityScore: number;
}

export interface TrendingDocumentResponse extends DocumentResponse {
  trendingScore: number;
  growthRate: number;
}
