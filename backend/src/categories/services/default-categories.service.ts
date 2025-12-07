import { PrismaService } from '../../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

interface DefaultCategory {
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
  children?: Array<{
    name: string;
    description: string;
    icon: string;
    color: string;
  }>;
}

@Injectable()
export class DefaultCategoriesService {
  private readonly logger = new Logger(DefaultCategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async initializeDefaultCategories(): Promise<void> {
    const existingCount = await this.prisma.category.count();

    if (existingCount > 0) {
      this.logger.log('Categories already exist, skipping initialization');
      return;
    }

    this.logger.log('Initializing default categories...');
    const defaultCategories = this.getDefaultCategories();

    for (const category of defaultCategories) {
      const parent = await this.prisma.category.create({
        data: {
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color,
          sortOrder: category.sortOrder,
          isActive: true,
        },
      });

      if (category.children) {
        let childOrder = 1;
        for (const child of category.children) {
          await this.prisma.category.create({
            data: {
              name: child.name,
              description: child.description,
              icon: child.icon,
              color: child.color,
              parentId: parent.id,
              sortOrder: childOrder++,
              isActive: true,
            },
          });
        }
      }
    }

    this.logger.log('Default categories initialized successfully');
  }

  private getDefaultCategories(): DefaultCategory[] {
    return [
      {
        name: 'Giáo dục',
        description: 'Tài liệu giáo dục, sách giáo khoa, bài giảng',
        icon: '📚',
        color: '#3B82F6',
        sortOrder: 1,
        children: [
          {
            name: 'Toán học',
            description: 'Tài liệu về toán học các cấp',
            icon: '🔢',
            color: '#6366F1',
          },
          {
            name: 'Vật lý',
            description: 'Tài liệu về vật lý',
            icon: '⚛️',
            color: '#8B5CF6',
          },
          {
            name: 'Hóa học',
            description: 'Tài liệu về hóa học',
            icon: '🧪',
            color: '#A855F7',
          },
          {
            name: 'Sinh học',
            description: 'Tài liệu về sinh học',
            icon: '🧬',
            color: '#D946EF',
          },
          {
            name: 'Ngữ văn',
            description: 'Tài liệu ngữ văn, văn học',
            icon: '📖',
            color: '#EC4899',
          },
          {
            name: 'Tiếng Anh',
            description: 'Tài liệu học tiếng Anh',
            icon: '🇬🇧',
            color: '#F43F5E',
          },
          {
            name: 'Lịch sử',
            description: 'Tài liệu về lịch sử',
            icon: '🏛️',
            color: '#EF4444',
          },
          {
            name: 'Địa lý',
            description: 'Tài liệu về địa lý',
            icon: '🌍',
            color: '#F97316',
          },
        ],
      },
      {
        name: 'Công nghệ thông tin',
        description: 'Lập trình, phần mềm, công nghệ',
        icon: '💻',
        color: '#10B981',
        sortOrder: 2,
        children: [
          {
            name: 'Lập trình',
            description: 'Tài liệu lập trình các ngôn ngữ',
            icon: '👨‍💻',
            color: '#14B8A6',
          },
          {
            name: 'Web Development',
            description: 'Phát triển web, frontend, backend',
            icon: '🌐',
            color: '#06B6D4',
          },
          {
            name: 'Mobile Development',
            description: 'Phát triển ứng dụng di động',
            icon: '📱',
            color: '#0EA5E9',
          },
          {
            name: 'Database',
            description: 'Cơ sở dữ liệu, SQL, NoSQL',
            icon: '🗄️',
            color: '#0284C7',
          },
          {
            name: 'AI & Machine Learning',
            description: 'Trí tuệ nhân tạo, học máy',
            icon: '🤖',
            color: '#2563EB',
          },
          {
            name: 'DevOps',
            description: 'DevOps, CI/CD, Cloud',
            icon: '☁️',
            color: '#4F46E5',
          },
          {
            name: 'An ninh mạng',
            description: 'Bảo mật, an toàn thông tin',
            icon: '🔐',
            color: '#7C3AED',
          },
        ],
      },
      {
        name: 'Kinh tế & Kinh doanh',
        description: 'Tài liệu về kinh tế, tài chính, kinh doanh',
        icon: '💼',
        color: '#F59E0B',
        sortOrder: 3,
        children: [
          {
            name: 'Tài chính',
            description: 'Tài chính cá nhân, doanh nghiệp',
            icon: '💰',
            color: '#D97706',
          },
          {
            name: 'Kế toán',
            description: 'Kế toán, kiểm toán',
            icon: '📊',
            color: '#B45309',
          },
          {
            name: 'Marketing',
            description: 'Marketing, quảng cáo',
            icon: '📈',
            color: '#92400E',
          },
          {
            name: 'Quản trị',
            description: 'Quản trị kinh doanh',
            icon: '🎯',
            color: '#78350F',
          },
          {
            name: 'Khởi nghiệp',
            description: 'Startup, khởi nghiệp',
            icon: '🚀',
            color: '#EA580C',
          },
        ],
      },
      {
        name: 'Y tế & Sức khỏe',
        description: 'Tài liệu y học, chăm sóc sức khỏe',
        icon: '🏥',
        color: '#EF4444',
        sortOrder: 4,
        children: [
          {
            name: 'Y học',
            description: 'Tài liệu y học, bệnh học',
            icon: '👨‍⚕️',
            color: '#DC2626',
          },
          {
            name: 'Dược học',
            description: 'Dược phẩm, thuốc',
            icon: '💊',
            color: '#B91C1C',
          },
          {
            name: 'Dinh dưỡng',
            description: 'Dinh dưỡng, chế độ ăn',
            icon: '🥗',
            color: '#991B1B',
          },
          {
            name: 'Thể dục thể thao',
            description: 'Tập luyện, thể thao',
            icon: '🏃',
            color: '#7F1D1D',
          },
        ],
      },
      {
        name: 'Nghệ thuật & Thiết kế',
        description: 'Nghệ thuật, đồ họa, thiết kế',
        icon: '🎨',
        color: '#EC4899',
        sortOrder: 5,
        children: [
          {
            name: 'Đồ họa',
            description: 'Thiết kế đồ họa, UI/UX',
            icon: '🖌️',
            color: '#DB2777',
          },
          {
            name: 'Nhiếp ảnh',
            description: 'Nhiếp ảnh, chỉnh sửa ảnh',
            icon: '📷',
            color: '#BE185D',
          },
          {
            name: 'Video',
            description: 'Sản xuất video, dựng phim',
            icon: '🎬',
            color: '#9D174D',
          },
          {
            name: 'Âm nhạc',
            description: 'Âm nhạc, sản xuất nhạc',
            icon: '🎵',
            color: '#831843',
          },
        ],
      },
      {
        name: 'Luật & Pháp lý',
        description: 'Văn bản pháp luật, tài liệu pháp lý',
        icon: '⚖️',
        color: '#6B7280',
        sortOrder: 6,
      },
      {
        name: 'Khoa học xã hội',
        description: 'Xã hội học, tâm lý học, triết học',
        icon: '🧠',
        color: '#8B5CF6',
        sortOrder: 7,
        children: [
          {
            name: 'Tâm lý học',
            description: 'Tâm lý học, tâm lý trị liệu',
            icon: '🧩',
            color: '#7C3AED',
          },
          {
            name: 'Xã hội học',
            description: 'Nghiên cứu xã hội',
            icon: '👥',
            color: '#6D28D9',
          },
          {
            name: 'Triết học',
            description: 'Triết học, tư tưởng',
            icon: '💭',
            color: '#5B21B6',
          },
        ],
      },
      {
        name: 'Kỹ năng mềm',
        description: 'Kỹ năng giao tiếp, lãnh đạo, phát triển bản thân',
        icon: '🎯',
        color: '#14B8A6',
        sortOrder: 8,
        children: [
          {
            name: 'Giao tiếp',
            description: 'Kỹ năng giao tiếp, thuyết trình',
            icon: '🗣️',
            color: '#0D9488',
          },
          {
            name: 'Lãnh đạo',
            description: 'Kỹ năng lãnh đạo, quản lý',
            icon: '👔',
            color: '#0F766E',
          },
          {
            name: 'Phát triển bản thân',
            description: 'Self-improvement, động lực',
            icon: '🌱',
            color: '#115E59',
          },
        ],
      },
      {
        name: 'Ngôn ngữ',
        description: 'Học ngoại ngữ, từ điển, ngữ pháp',
        icon: '🌏',
        color: '#0EA5E9',
        sortOrder: 9,
        children: [
          {
            name: 'Tiếng Nhật',
            description: 'Học tiếng Nhật',
            icon: '🇯🇵',
            color: '#0284C7',
          },
          {
            name: 'Tiếng Hàn',
            description: 'Học tiếng Hàn',
            icon: '🇰🇷',
            color: '#0369A1',
          },
          {
            name: 'Tiếng Trung',
            description: 'Học tiếng Trung',
            icon: '🇨🇳',
            color: '#075985',
          },
          {
            name: 'Tiếng Pháp',
            description: 'Học tiếng Pháp',
            icon: '🇫🇷',
            color: '#0C4A6E',
          },
        ],
      },
      {
        name: 'Khác',
        description: 'Các tài liệu khác không thuộc danh mục cụ thể',
        icon: '📁',
        color: '#9CA3AF',
        sortOrder: 99,
      },
    ];
  }
}
