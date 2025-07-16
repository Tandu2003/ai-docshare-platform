# Common Response Utilities

This module provides standardized response helpers for the AI DocShare Platform backend.

## Structure

```
src/common/
├── constants/
│   └── http.constants.ts       # HTTP status codes and messages
├── errors/
│   ├── app.error.ts           # Base error class
│   ├── auth.error.ts          # Authentication & authorization errors
│   ├── http.error.ts          # HTTP-related errors
│   ├── service.error.ts       # Service & database errors
│   ├── validation.error.ts    # Validation errors
│   └── index.ts               # Error exports
├── filters/
│   └── global-exception.filter.ts # Global exception filter
├── helpers/
│   ├── response.helper.ts      # Main response helper class
│   └── http-error.helper.ts    # HTTP error response helpers
├── interfaces/
│   └── api-response.interface.ts # API response interfaces
├── utils/
│   └── error.utils.ts         # Error utility functions
└── index.ts                    # Barrel exports
```

## Usage

### Basic Import

```typescript
import { ResponseHelper, HttpErrorHelper } from '@/common';
// or
import { success, created, notFound, badRequest } from '@/common';
```

### Success Responses

```typescript
// Basic success
return ResponseHelper.success(res, data, 'Operation successful');

// Created resource
return ResponseHelper.created(res, newUser, 'User created successfully');

// Updated resource
return ResponseHelper.updated(res, updatedUser);

// Deleted resource
return ResponseHelper.deleted(res, 'User deleted successfully');

// Paginated data
return ResponseHelper.paginated(res, users, page, limit, total);
```

### Error Responses

```typescript
// Bad request
return HttpErrorHelper.badRequest(res, 'Invalid input data');

// Not found
return HttpErrorHelper.notFound(res, 'User not found');

// Validation error
return HttpErrorHelper.validationError(res, validationErrors);

// Internal server error
return HttpErrorHelper.internalError(res, 'Something went wrong');
```

### Convenient Direct Exports

```typescript
import { success, created, notFound } from '@/common';

// Use directly without class name
return success(res, data);
return created(res, newResource);
return notFound(res, 'Resource not found');
```

## Response Format

All responses follow this standardized format:

```typescript
{
  success: boolean;
  message: string;
  data?: any;
  error?: any;        // Only in development mode
  meta: {
    timestamp: string;
    page?: number;      // For paginated responses
    limit?: number;     // For paginated responses
    total?: number;     // For paginated responses
    totalPages?: number; // For paginated responses
  };
}
```

## Best Practices

1. **Use constants**: Always use `HTTP_STATUS` and `HTTP_MESSAGES` constants
2. **Consistent messaging**: Use predefined messages or provide clear custom ones
3. **Error handling**: Never expose sensitive error details in production
4. **Pagination**: Always include pagination meta for list endpoints
5. **TypeScript**: Leverage generic types for type-safe responses

## Examples

### Controller Usage

```typescript
import { Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { success, created, notFound } from '@/common';

@Controller('users')
export class UsersController {
  @Get()
  async findAll(@Res() res: Response) {
    const users = await this.usersService.findAll();
    return success(res, users, 'Users retrieved successfully');
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    const user = await this.usersService.create(createUserDto);
    return created(res, user, 'User created successfully');
  }
}
```

## Error Handling

### Custom Error Classes

```typescript
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  ConflictError,
} from '@/common';

// Throw custom errors
throw new NotFoundError('User not found');
throw new ValidationError('Invalid data', validationErrors);
throw new AuthenticationError('Invalid credentials');
throw new ConflictError('Email already exists');
```

### Error Handling in Services

```typescript
import { Injectable } from '@nestjs/common';
import { NotFoundError, ValidationError } from '@/common';

@Injectable()
export class UsersService {
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(data: CreateUserDto) {
    // Validation
    if (!data.email) {
      throw new ValidationError('Email is required');
    }

    // Business logic validation
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    return this.prisma.user.create({ data });
  }
}
```

### Global Exception Filter

The `GlobalExceptionFilter` automatically handles all errors:

```typescript
// In main.ts or app.module.ts
import { GlobalExceptionFilter } from '@/common';

app.useGlobalFilters(new GlobalExceptionFilter());
```

### Error Utils

```typescript
import { ErrorUtils } from '@/common';

// Check if error is operational
const isOperational = ErrorUtils.isOperationalError(error);

// Get safe error message
const message = ErrorUtils.getErrorMessage(error);

// Get status code
const statusCode = ErrorUtils.getStatusCode(error);

// Normalize any error to AppError
const normalizedError = ErrorUtils.normalizeError(error);
```
