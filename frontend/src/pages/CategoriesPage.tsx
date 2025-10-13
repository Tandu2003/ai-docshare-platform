import { Download, Edit, Eye, FolderOpen, Plus, Trash2 } from 'lucide-react';

import { useCallback, useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  createCategory as createCategoryApi,
  deleteCategory as deleteCategoryApi,
  fetchCategories as fetchCategoriesApi,
  updateCategory as updateCategoryApi,
} from '@/services/category.service';
import type { CategoryWithStats } from '@/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📁',
    color: '#3b82f6',
    parentId: '',
    sortOrder: 0,
  });

  const sortCategories = useCallback(
    (items: CategoryWithStats[]) =>
      [...items].sort((a, b) =>
        a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.name.localeCompare(b.name)
      ),
    []
  );

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategoriesApi();
      setCategories(sortCategories(data));
    } catch (fetchError) {
      console.error('Failed to fetch categories:', fetchError);
      const message =
        fetchError instanceof Error ? fetchError.message : 'Không thể tải danh mục';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [sortCategories]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '📁',
      color: '#3b82f6',
      parentId: '',
      sortOrder: 0,
    });
  };

  const handleCreateCategory = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const category = await createCategoryApi({
        name: formData.name,
        description: formData.description || undefined,
        icon: formData.icon,
        color: formData.color,
        parentId: formData.parentId ? formData.parentId : null,
        sortOrder: formData.sortOrder,
        isActive: true,
      });

      setCategories((prev) => sortCategories([...prev, category]));
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (createError) {
      console.error('Failed to create category:', createError);
      const message =
        createError instanceof Error ? createError.message : 'Không thể tạo danh mục mới';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateCategoryApi(editingCategory.id, {
        name: formData.name,
        description: formData.description || undefined,
        icon: formData.icon,
        color: formData.color,
        parentId: formData.parentId ? formData.parentId : null,
        sortOrder: formData.sortOrder,
      });

      setCategories((prev) =>
        sortCategories(prev.map((cat) => (cat.id === updated.id ? updated : cat)))
      );
      setEditingCategory(null);
      setIsEditDialogOpen(false);
      resetForm();
    } catch (updateError) {
      console.error('Failed to update category:', updateError);
      const message =
        updateError instanceof Error ? updateError.message : 'Không thể cập nhật danh mục';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setDeletingId(categoryId);
    setError(null);
    try {
      await deleteCategoryApi(categoryId);
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
    } catch (deleteError) {
      console.error(`Failed to delete category ${categoryId}:`, deleteError);
      const message =
        deleteError instanceof Error ? deleteError.message : 'Không thể xóa danh mục';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const openEditDialog = (category: CategoryWithStats) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '📁',
      color: category.color || '#3b82f6',
      parentId: category.parentId || '',
      sortOrder: category.sortOrder,
    });
    setIsEditDialogOpen(true);
  };

  const getParentCategory = (parentId: string) => {
    return categories.find((cat) => cat.id === parentId);
  };

  const iconOptions = ['📁', '📄', '📊', '📈', '📋', '📝', '📚', '🔬', '💻', '🎨', '📱', '🌐'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Danh mục</h1>
            <p className="text-muted-foreground">Quản lý danh mục tài liệu</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="animate-pulse space-y-3">
                <Skeleton className="h-20 w-full" />
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Danh mục</h1>
          <p className="text-muted-foreground">Quản lý danh mục tài liệu và tổ chức của chúng</p>
        </div>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tạo danh mục
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo danh mục mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Tên</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Tên danh mục"
                />
              </div>
              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Mô tả danh mục"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="icon">Biểu tượng</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon} {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="color">Màu sắc</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="parent">Danh mục cha</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, parentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục cha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Không có danh mục cha</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {(category.icon ?? '📁')} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sortOrder">Thứ tự sắp xếp</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsCreateDialogOpen(false);
                  }}
                  disabled={submitting}
                >
                  Hủy
                </Button>
                <Button
                  onClick={() => void handleCreateCategory()}
                  disabled={!formData.name.trim() || submitting}
                >
                  {submitting ? 'Đang lưu...' : 'Tạo danh mục'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Đã xảy ra lỗi</AlertTitle>
          <AlertDescription className="flex flex-col space-y-2">
            <span>{error}</span>
            {categories.length === 0 && (
              <Button
                variant="secondary"
                onClick={() => void loadCategories()}
                disabled={loading}
              >
                Thử lại
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Categories Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const parentCategory = category.parentId ? getParentCategory(category.parentId) : null;
          const categoryColor = category.color ?? '#3b82f6';
          const categoryIcon = category.icon ?? '📁';

          return (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{categoryIcon}</span>
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      {parentCategory && (
                        <p className="text-sm text-muted-foreground">
                          Cha: {(parentCategory.icon ?? '📁')} {parentCategory.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xóa danh mục</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa "{category.name}"? Hành động này không thể hoàn tác.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deletingId === category.id}>
                            Hủy
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleDeleteCategory(category.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deletingId === category.id}
                          >
                            {deletingId === category.id ? 'Đang xóa...' : 'Xóa'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.description && (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                )}

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <FolderOpen className="h-4 w-4" />
                    <span>{category.documentCount} tài liệu</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Download className="h-4 w-4" />
                    <span>{category.totalDownloads} lượt tải</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{category.totalViews} lượt xem</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${categoryColor}20`,
                      color: categoryColor,
                    }}
                  >
                    Sắp xếp: {category.sortOrder}
                  </Badge>
                  <Badge variant={category.isActive ? 'default' : 'secondary'}>
                    {category.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Tên</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Tên danh mục"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Mô tả</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả danh mục"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-icon">Biểu tượng</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon} {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-color">Màu sắc</Label>
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-parent">Danh mục cha</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, parentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục cha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Không có danh mục cha</SelectItem>
                  {categories
                    .filter((cat) => cat.id !== editingCategory?.id)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {(category.icon ?? '📁')} {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-sortOrder">Thứ tự sắp xếp</Label>
              <Input
                id="edit-sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
                }
                placeholder="0"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingCategory(null);
                  resetForm();
                }}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button
                onClick={() => void handleEditCategory()}
                disabled={!formData.name.trim() || submitting}
              >
                {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
