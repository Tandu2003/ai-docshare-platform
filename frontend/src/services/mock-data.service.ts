import { faker } from '@faker-js/faker';

import type {
  ActivityLog,
  AIAnalysis,
  Bookmark,
  BookmarkFolder,
  Category,
  Comment,
  DashboardStats,
  Document,
  Notification,
  Rating,
  RecommendationEngine,
  SearchHistory,
  SystemSetting,
  User,
} from '@/types';

// Mock data generators
export const generateMockUser = (): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  username: faker.internet.username(),
  password: 'hashed_password',
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  avatar: faker.image.avatar(),
  bio: faker.person.bio(),
  roleId: 'user',
  isVerified: faker.datatype.boolean(),
  isActive: true,
  lastLoginAt: faker.date.recent(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  role: {
    id: 'user',
    name: 'User',
    description: 'Regular user',
    permissions: [
      { action: 'read', subject: 'Document' },
      { action: 'upload', subject: 'Document' },
    ],
    isActive: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  },
});

export const generateMockCategory = (): Category => ({
  id: faker.string.uuid(),
  name: faker.word.noun(),
  description: faker.lorem.sentence(),
  icon: faker.helpers.arrayElement(['📄', '📊', '📈', '📋', '📝', '📚']),
  color: faker.color.rgb(),
  parentId: faker.datatype.boolean() ? faker.string.uuid() : undefined,
  isActive: true,
  documentCount: faker.number.int({ min: 0, max: 100 }),
  sortOrder: faker.number.int({ min: 0, max: 10 }),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
});

export const generateMockDocument = (
  uploader?: User,
  category?: Category,
): Document => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  description: faker.lorem.paragraph(),
  uploaderId: uploader?.id || faker.string.uuid(),
  categoryId: category?.id || faker.string.uuid(),
  downloadCount: faker.number.int({ min: 0, max: 1000 }),
  viewCount: faker.number.int({ min: 0, max: 5000 }),
  averageRating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
  totalRatings: faker.number.int({ min: 0, max: 100 }),
  isPublic: faker.datatype.boolean(),
  isPremium: faker.datatype.boolean(),
  isApproved: faker.datatype.boolean(),
  isDraft: faker.datatype.boolean(),
  moderationStatus: faker.helpers.arrayElement([
    'PENDING',
    'APPROVED',
    'REJECTED',
  ]),
  tags: faker.helpers.arrayElements(
    [
      'javascript',
      'react',
      'typescript',
      'nodejs',
      'python',
      'ai',
      'machine-learning',
      'data-science',
    ],
    { min: 1, max: 5 },
  ),
  language: faker.helpers.arrayElement(['en', 'vi', 'fr', 'de', 'es']),
  zipFileUrl: faker.datatype.boolean() ? faker.internet.url() : undefined,
  zipFileCreatedAt: faker.datatype.boolean() ? faker.date.recent() : undefined,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  uploader: uploader || generateMockUser(),
  category: category || generateMockCategory(),
});

export const generateMockComment = (
  userId?: string,
  documentId?: string,
): Comment => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  documentId: documentId || faker.string.uuid(),
  parentId: faker.datatype.boolean() ? faker.string.uuid() : undefined,
  content: faker.lorem.paragraph(),
  isEdited: faker.datatype.boolean(),
  isDeleted: false,
  likesCount: faker.number.int({ min: 0, max: 50 }),
  editedAt: faker.datatype.boolean() ? faker.date.recent() : undefined,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  user: generateMockUser(),
  document: generateMockDocument(),
});

export const generateMockRating = (
  userId?: string,
  documentId?: string,
): Rating => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  documentId: documentId || faker.string.uuid(),
  rating: faker.number.int({ min: 1, max: 5 }),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  user: generateMockUser(),
  document: generateMockDocument(),
});

export const generateMockNotification = (userId?: string): Notification => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  type: faker.helpers.arrayElement([
    'comment',
    'rating',
    'system',
    'document_approved',
    'collaboration',
  ]),
  title: faker.lorem.sentence(),
  message: faker.lorem.paragraph(),
  data: {},
  isRead: faker.datatype.boolean(),
  readAt: faker.datatype.boolean() ? faker.date.recent() : undefined,
  createdAt: faker.date.past(),
  user: generateMockUser(),
});

export const generateMockBookmark = (
  userId?: string,
  documentId?: string,
): Bookmark => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  documentId: documentId || faker.string.uuid(),
  folderId: faker.datatype.boolean() ? faker.string.uuid() : undefined,
  notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
  createdAt: faker.date.past(),
  user: generateMockUser(),
  document: generateMockDocument(),
});

export const generateMockBookmarkFolder = (
  userId?: string,
): BookmarkFolder => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  name: faker.word.noun(),
  description: faker.lorem.sentence(),
  isDefault: faker.datatype.boolean(),
  sortOrder: faker.number.int({ min: 0, max: 10 }),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  user: generateMockUser(),
});

export const generateMockActivityLog = (userId?: string): ActivityLog => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  action: faker.helpers.arrayElement([
    'login',
    'upload',
    'download',
    'search',
    'view',
    'comment',
    'rate',
  ]),
  resourceType: faker.helpers.arrayElement(['document', 'user', 'category']),
  resourceId: faker.string.uuid(),
  ipAddress: faker.internet.ip(),
  userAgent: faker.internet.userAgent(),
  metadata: {},
  createdAt: faker.date.past(),
  user: generateMockUser(),
});

export const generateMockSearchHistory = (userId?: string): SearchHistory => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  query: faker.lorem.words(3),
  filters: {},
  resultsCount: faker.number.int({ min: 0, max: 100 }),
  clickedDocumentId: faker.datatype.boolean() ? faker.string.uuid() : undefined,
  sessionId: faker.string.uuid(),
  ipAddress: faker.internet.ip(),
  userAgent: faker.internet.userAgent(),
  searchedAt: faker.date.past(),
  user: generateMockUser(),
  clickedDocument: faker.datatype.boolean()
    ? generateMockDocument()
    : undefined,
});

export const generateMockRecommendation = (
  userId?: string,
  documentId?: string,
): RecommendationEngine => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  documentId: documentId || faker.string.uuid(),
  score: faker.number.float({ min: 0, max: 1, fractionDigits: 3 }),
  reason: faker.helpers.arrayElement([
    'similar_content',
    'popular_in_category',
    'user_behavior',
  ]),
  algorithm: faker.helpers.arrayElement([
    'collaborative_filtering',
    'content_based',
    'hybrid',
  ]),
  metadata: {},
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  user: generateMockUser(),
  document: generateMockDocument(),
});

export const generateMockSystemSetting = (): SystemSetting => ({
  id: faker.string.uuid(),
  key: faker.lorem.word(),
  value: faker.lorem.word(),
  type: faker.helpers.arrayElement(['string', 'number', 'boolean', 'json']),
  description: faker.lorem.sentence(),
  isPublic: faker.datatype.boolean(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
});

export const generateMockAIAnalysis = (documentId: string): AIAnalysis => ({
  id: faker.string.uuid(),
  documentId,
  summary: faker.lorem.paragraph(),
  keyPoints: faker.helpers.arrayElements(
    [
      'Key concept introduction',
      'Detailed explanation of methodology',
      'Practical applications and examples',
      'Common challenges and solutions',
      'Best practices and recommendations',
      'Future trends and developments',
    ],
    { min: 3, max: 6 },
  ),
  suggestedTags: faker.helpers.arrayElements(
    [
      'javascript',
      'react',
      'typescript',
      'nodejs',
      'python',
      'ai',
      'machine-learning',
      'data-science',
      'web-development',
      'frontend',
      'backend',
      'database',
      'api',
      'testing',
      'deployment',
    ],
    { min: 2, max: 5 },
  ),
  difficulty: faker.helpers.arrayElement([
    'beginner',
    'intermediate',
    'advanced',
  ]),
  readingTime: faker.number.int({ min: 5, max: 60 }),
  language: faker.helpers.arrayElement(['en', 'vi', 'fr', 'de', 'es']),
  confidence: faker.number.float({ min: 0.7, max: 1, fractionDigits: 2 }),
  sentimentScore: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
  topicModeling: {
    topics: faker.helpers.arrayElements(
      [
        'Web Development',
        'Data Science',
        'Machine Learning',
        'Software Engineering',
        'Database Design',
        'API Development',
        'Testing Strategies',
        'DevOps Practices',
      ],
      { min: 2, max: 4 },
    ),
    weights: faker.helpers.arrayElements([0.3, 0.4, 0.2, 0.1], {
      min: 2,
      max: 4,
    }),
  },
  namedEntities: {
    persons: faker.helpers.arrayElements(
      ['John Doe', 'Jane Smith', 'Mike Johnson'],
      {
        min: 1,
        max: 3,
      },
    ),
    organizations: faker.helpers.arrayElements(
      ['Google', 'Microsoft', 'Amazon', 'Facebook'],
      {
        min: 1,
        max: 3,
      },
    ),
    locations: faker.helpers.arrayElements(
      ['San Francisco', 'New York', 'London', 'Tokyo'],
      {
        min: 1,
        max: 2,
      },
    ),
  },
  processedAt: faker.date.recent(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  document: generateMockDocument(),
});

// Mock data collections
export const mockUsers: User[] = Array.from({ length: 50 }, generateMockUser);
export const mockCategories: Category[] = Array.from(
  { length: 20 },
  generateMockCategory,
);
export const mockDocuments: Document[] = Array.from({ length: 100 }, () => {
  const uploader = faker.helpers.arrayElement(mockUsers);
  const category = faker.helpers.arrayElement(mockCategories);
  return generateMockDocument(uploader, category);
});
export const mockComments: Comment[] = Array.from({ length: 200 }, () => {
  const document = faker.helpers.arrayElement(mockDocuments);
  const user = faker.helpers.arrayElement(mockUsers);
  return generateMockComment(user.id, document.id);
});
export const mockRatings: Rating[] = Array.from({ length: 150 }, () => {
  const document = faker.helpers.arrayElement(mockDocuments);
  const user = faker.helpers.arrayElement(mockUsers);
  return generateMockRating(user.id, document.id);
});
export const mockNotifications: Notification[] = Array.from(
  { length: 50 },
  () => {
    const user = faker.helpers.arrayElement(mockUsers);
    return generateMockNotification(user.id);
  },
);
export const mockBookmarks: Bookmark[] = Array.from({ length: 100 }, () => {
  const user = faker.helpers.arrayElement(mockUsers);
  const document = faker.helpers.arrayElement(mockDocuments);
  return generateMockBookmark(user.id, document.id);
});
export const mockBookmarkFolders: BookmarkFolder[] = Array.from(
  { length: 30 },
  () => {
    const user = faker.helpers.arrayElement(mockUsers);
    return generateMockBookmarkFolder(user.id);
  },
);
export const mockActivityLogs: ActivityLog[] = Array.from(
  { length: 200 },
  () => {
    const user = faker.helpers.arrayElement(mockUsers);
    return generateMockActivityLog(user.id);
  },
);
export const mockSearchHistory: SearchHistory[] = Array.from(
  { length: 100 },
  () => {
    const user = faker.helpers.arrayElement(mockUsers);
    return generateMockSearchHistory(user.id);
  },
);
export const mockRecommendations: RecommendationEngine[] = Array.from(
  { length: 50 },
  () => {
    const user = faker.helpers.arrayElement(mockUsers);
    const document = faker.helpers.arrayElement(mockDocuments);
    return generateMockRecommendation(user.id, document.id);
  },
);
export const mockSystemSettings: SystemSetting[] = Array.from(
  { length: 20 },
  generateMockSystemSetting,
);

// Dashboard stats generator
export const generateDashboardStats = (userId?: string): DashboardStats => {
  const userNotifications = mockNotifications.filter(
    notif => notif.userId === userId,
  );
  const userActivity = mockActivityLogs.filter(
    activity => activity.userId === userId,
  );

  return {
    totalDocuments: mockDocuments.length,
    totalUsers: mockUsers.length,
    totalDownloads: mockDocuments.reduce(
      (sum, doc) => sum + doc.downloadCount,
      0,
    ),
    totalViews: mockDocuments.reduce((sum, doc) => sum + doc.viewCount, 0),
    recentDocuments: mockDocuments
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10),
    popularCategories: mockCategories
      .map(cat => ({
        ...cat,
        documentCount: mockDocuments.filter(doc => doc.categoryId === cat.id)
          .length,
        totalDownloads: mockDocuments
          .filter(doc => doc.categoryId === cat.id)
          .reduce((sum, doc) => sum + doc.downloadCount, 0),
        totalViews: mockDocuments
          .filter(doc => doc.categoryId === cat.id)
          .reduce((sum, doc) => sum + doc.viewCount, 0),
      }))
      .sort((a, b) => b.documentCount - a.documentCount)
      .slice(0, 5),
    userActivity: userActivity.slice(0, 10),
    recentNotifications: userNotifications
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5),
  };
};

// Mock API responses
export const mockApiResponses = {
  getUsers: () => ({
    success: true,
    message: 'Users retrieved successfully',
    data: mockUsers,
    meta: {
      timestamp: new Date().toISOString(),
      page: 1,
      limit: 50,
      total: mockUsers.length,
      totalPages: 1,
    },
  }),

  getDocuments: (page = 1, limit = 20) => ({
    success: true,
    message: 'Documents retrieved successfully',
    data: mockDocuments.slice((page - 1) * limit, page * limit),
    meta: {
      timestamp: new Date().toISOString(),
      page,
      limit,
      total: mockDocuments.length,
      totalPages: Math.ceil(mockDocuments.length / limit),
    },
  }),

  getCategories: () => ({
    success: true,
    message: 'Categories retrieved successfully',
    data: mockCategories,
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),

  getDashboardStats: (userId?: string) => ({
    success: true,
    message: 'Dashboard stats retrieved successfully',
    data: generateDashboardStats(userId),
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),

  getNotifications: (userId?: string) => ({
    success: true,
    message: 'Notifications retrieved successfully',
    data: mockNotifications.filter(notif => !userId || notif.userId === userId),
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),

  getBookmarks: (userId?: string) => ({
    success: true,
    message: 'Bookmarks retrieved successfully',
    data: mockBookmarks.filter(
      bookmark => !userId || bookmark.userId === userId,
    ),
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),
};
