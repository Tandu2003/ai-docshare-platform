export { SimilarityService } from './similarity.service';
export { SimilarityJobService } from './similarity-job.service';
export {
  SimilarityAlgorithmService,
  SimilarityTextExtractionService,
} from './services';
// Controllers
export { SimilarityController } from './controllers/similarity.controller';
// Module
export { SimilarityModule } from './similarity.module';
export type {
  SimilarDocument,
  SimilarityCheckResult,
  SimilarityJobStatus,
  SimilarityJobStatusType,
} from './interfaces';

// Constants
export {
  SIMILARITY_THRESHOLDS,
  DEFAULT_SIMILARITY_THRESHOLD,
  AUTO_REJECT_SIMILARITY_THRESHOLD,
  MAX_SIMILAR_DOCUMENTS,
  SIMILARITY_BATCH_SIZE,
  SIMILARITY_JOB_TIMEOUT_MS,
  SIMILARITY_JOB_RETRY_COUNT,
  SIMILARITY_ERROR_MESSAGES,
} from './constants';
