import { AlertTriangle, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
interface UnauthorizedMessageProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'card' | 'alert';
}

export const UnauthorizedMessage: React.FC<UnauthorizedMessageProps> = ({
  title = 'Không có quyền truy cập',
  description = 'Bạn không có quyền để thực hiện hành động này. Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.',
  action,
  variant = 'default',
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <div className="bg-muted rounded-full p-3">
        <Lock className="text-muted-foreground h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );

  switch (variant) {
    case 'card':
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {action && (
              <Button onClick={action.onClick} variant="outline">
                {action.label}
              </Button>
            )}
          </CardContent>
        </Card>
      );
    case 'alert':
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>
      );
    default:
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          {content}
        </div>
      );
  }
};
