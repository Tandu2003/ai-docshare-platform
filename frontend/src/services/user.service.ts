import { apiClient } from '@/utils/api-client';
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  roleId: string;
  isVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  pointsBalance?: number;
  role: {
    id: string;
    name: string;
    description: string;
  };
  _count?: {
    documents: number;
    ratings: number;
    comments: number;
    bookmarks: number;
    downloads?: number;
    views?: number;
  };
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  roleId: string;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
}

export interface UpdateUserRoleRequest {
  roleId: string;
}

export interface UpdateUserStatusRequest {
  isActive?: boolean;
  isVerified?: boolean;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isDeleted?: boolean;
  sortBy?:
    | 'createdAt'
    | 'updatedAt'
    | 'lastLoginAt'
    | 'email'
    | 'username'
    | 'firstName'
    | 'lastName';
  sortOrder?: 'asc' | 'desc';
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: string;
}

export interface UserStatistics {
  documentCount: number;
  downloadCount: number;
  viewCount: number;
  ratingCount: number;
  commentCount: number;
  bookmarkCount: number;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface UserActivityResponse {
  activities: UserActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class UserService {
  private baseUrl = '/users';

  async getUsers(query: GetUsersQuery = {}): Promise<UsersResponse> {
    const params = new URLSearchParams();

    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.search) params.append('search', query.search);
    if (query.role) params.append('role', query.role);
    if (typeof query.isActive === 'boolean')
      params.append('isActive', query.isActive.toString());
    if (typeof query.isVerified === 'boolean')
      params.append('isVerified', query.isVerified.toString());
    if (typeof query.isDeleted === 'boolean')
      params.append('isDeleted', query.isDeleted.toString());
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);

    const response = await apiClient.get(
      `${this.baseUrl}?${params.toString()}`,
    );
    return response.data as any;
  }

  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data as any;
  }

  async getCurrentUserActivity(
    page: number = 1,
    limit: number = 10,
  ): Promise<UserActivityResponse> {
    // Get user activity from analytics endpoint since users/:id/activity is admin only
    const response = await apiClient.get('/analytics/user-dashboard');
    const dashboardData = response.data as any;

    // Extract user activity from dashboard data
    const activities = dashboardData.userActivity || [];

    return {
      activities: activities.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total: activities.length,
        totalPages: Math.ceil(activities.length / limit),
        hasNext: page * limit < activities.length,
        hasPrev: page > 1,
      },
    };
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data as any;
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}`, data);
    return response.data as any;
  }

  async updateUserRole(id: string, data: UpdateUserRoleRequest): Promise<User> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}/role`, data);
    return response.data as any;
  }

  async updateUserStatus(
    id: string,
    data: UpdateUserStatusRequest,
  ): Promise<User> {
    const response = await apiClient.patch(
      `${this.baseUrl}/${id}/status`,
      data,
    );
    return response.data as any;
  }

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async unDeleteUser(id: string): Promise<void> {
    await apiClient.patch(`${this.baseUrl}/${id}/undelete`);
  }

  async getUserActivity(
    id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<UserActivityResponse> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/activity`, {
      params: { page, limit },
    });
    return response.data as any;
  }

  async getUserStatistics(id: string): Promise<UserStatistics> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/statistics`);
    return response.data as any;
  }

  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get(`${this.baseUrl}/roles/list`);
    return response.data as any;
  }
}

export const userService = new UserService();
