import { FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="mx-auto max-w-md text-center">
        <FileQuestion className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Không tìm thấy trang
        </h1>
        <p className="mb-6 text-gray-600">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <div className="space-y-2">
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Về trang chủ
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full"
          >
            Quay lại
          </Button>
        </div>
      </div>
    </div>
  );
};
