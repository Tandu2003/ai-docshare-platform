# AI DocShare Platform - Frontend

A comprehensive document sharing platform with AI capabilities, built with React, TypeScript, and modern web technologies.

## 🚀 Features

### Core Functionality
- **Document Management**: Upload, organize, and share documents
- **AI Analysis**: Automatic document analysis with AI-powered insights
- **User Management**: Complete user authentication and profile system
- **Categories**: Hierarchical document categorization
- **Search & Filtering**: Advanced search with multiple filters
- **Comments & Ratings**: Interactive document feedback system
- **Bookmarks**: Save and organize favorite documents
- **Notifications**: Real-time activity notifications

### Admin Features
- **Admin Dashboard**: Comprehensive system overview
- **User Management**: Manage users, roles, and permissions
- **Document Moderation**: Approve/reject document submissions
- **System Analytics**: Track platform usage and performance
- **Category Management**: Create and organize document categories

### User Experience
- **Responsive Design**: Mobile-first, fully responsive interface
- **Dark/Light Mode**: Theme switching support
- **Accessibility**: WCAG compliant components
- **Performance**: Optimized loading and rendering
- **Real-time Updates**: Live data synchronization

## 🛠️ Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: Redux Toolkit
- **UI Components**: Shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Build Tool**: Vite

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── common/          # Common utility components
│   ├── layout/          # Layout components (sidebar, header)
│   ├── auth/            # Authentication components
│   ├── documents/       # Document-related components
│   └── dashboard/       # Dashboard-specific components
├── pages/               # Page components
├── hooks/               # Custom React hooks
├── services/            # API services and mock data
├── store/               # Redux store configuration
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── lib/                 # Library configurations
└── router/              # Routing configuration
```

## 🎨 Component Architecture

### Layout Components
- **MainLayout**: Main application layout with sidebar and header
- **Sidebar**: Navigation sidebar with user info and menu items
- **ProtectedRoute**: Route protection based on authentication

### Document Components
- **DocumentGrid**: Grid layout for document listings
- **DocumentCard**: Individual document card component
- **DocumentFilters**: Advanced filtering interface
- **DocumentSearch**: Search functionality with sorting
- **DocumentDetailHeader**: Document detail page header
- **DocumentComments**: Comment system with replies
- **DocumentAIAnalysis**: AI analysis display component

### Dashboard Components
- **StatsCards**: Statistics display cards
- **RecentDocuments**: Recent documents list
- **PopularCategories**: Popular categories with progress bars
- **ActivityFeed**: User activity timeline

### Common Components
- **LoadingSpinner**: Reusable loading indicator
- **EmptyState**: Empty state placeholder
- **PageHeader**: Standardized page headers
- **DataTable**: Generic data table component
- **StatusBadge**: Status indicator badges

## 🔧 Configuration

### Environment Variables
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=AI DocShare Platform
```

### Tailwind Configuration
The project uses Tailwind CSS with custom configuration for:
- Design system colors
- Component-specific utilities
- Responsive breakpoints
- Dark mode support

## 📱 Responsive Design

The application is built with a mobile-first approach:
- **Mobile**: Single column layout with collapsible sidebar
- **Tablet**: Two-column layout with sidebar
- **Desktop**: Full layout with persistent sidebar

## 🎯 Key Features Implementation

### Authentication System
- JWT-based authentication
- Role-based access control (RBAC)
- Protected routes and components
- User session management

### Document Management
- File upload with progress tracking
- Document categorization and tagging
- Approval workflow for moderators
- Download tracking and analytics

### AI Integration
- Document analysis and summarization
- Automatic tag suggestions
- Difficulty level detection
- Sentiment analysis
- Reading time estimation

### Search & Discovery
- Full-text search across documents
- Advanced filtering by category, tags, rating
- Sorting by relevance, date, popularity
- Search history tracking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend API running on port 3000

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development
```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test
```

## 📊 Mock Data

The application includes comprehensive mock data for development:
- **Users**: 50+ mock users with different roles
- **Documents**: 100+ documents across various categories
- **Categories**: 20+ hierarchical categories
- **Comments**: 200+ comments and replies
- **Activity**: 200+ activity logs
- **Notifications**: 50+ notifications

## 🎨 Design System

### Colors
- **Primary**: Blue (#3b82f6)
- **Secondary**: Gray (#6b7280)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)

### Typography
- **Headings**: Inter font family
- **Body**: System font stack
- **Code**: JetBrains Mono

### Spacing
- Consistent 4px base unit
- Responsive spacing scales
- Component-specific spacing tokens

## 🔒 Security Features

- **XSS Protection**: Input sanitization
- **CSRF Protection**: Token-based requests
- **Content Security Policy**: Strict CSP headers
- **Secure Headers**: Security-focused HTTP headers

## 📈 Performance Optimizations

- **Code Splitting**: Route-based code splitting
- **Lazy Loading**: Component lazy loading
- **Memoization**: React.memo and useMemo
- **Bundle Optimization**: Tree shaking and minification
- **Image Optimization**: Responsive images and lazy loading

## 🧪 Testing Strategy

- **Unit Tests**: Component testing with React Testing Library
- **Integration Tests**: API integration testing
- **E2E Tests**: End-to-end user flow testing
- **Accessibility Tests**: WCAG compliance testing

## 📚 Documentation

- **Component Documentation**: Storybook integration
- **API Documentation**: OpenAPI/Swagger specs
- **User Guides**: Interactive tutorials
- **Developer Docs**: Technical documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Contact the development team

---

Built with ❤️ using modern web technologies