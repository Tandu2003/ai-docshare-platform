import { FileQuestion } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <FileQuestion className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy trang</h1>
        <p className="text-gray-600 mb-6">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <div className="space-y-2">
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Về trang chủ
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
            Quay lại
          </Button>
        </div>
      </div>
    </div>
  );
};
