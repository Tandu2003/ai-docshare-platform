import { useState } from 'react';

import {
  Heart,
  MessageSquare,
  MoreHorizontal,
  Reply,
  Send,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { Comment } from '@/types';

interface DocumentCommentsProps {
  comments: Comment[];
  onAddComment: (content: string, parentId?: string) => void;
  onLikeComment: (commentId: string) => void;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  currentUserId?: string;
}

export function DocumentComments({
  comments,
  onAddComment,
  onLikeComment,
  onEditComment,
  onDeleteComment,
  currentUserId,
}: DocumentCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handleSubmitReply = (parentId: string) => {
    if (replyContent.trim()) {
      onAddComment(replyContent.trim(), parentId);
      setReplyContent('');
      setReplyingTo(null);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (editingComment && editContent.trim()) {
      onEditComment(editingComment, editContent.trim());
      setEditingComment(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = currentUserId === comment.userId;
    const isEditing = editingComment === comment.id;

    return (
      <div key={comment.id} className={`space-y-3 ${isReply ? 'ml-8' : ''}`}>
        <div className="flex items-start space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {comment.user.firstName.charAt(0)}
              {comment.user.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {comment.user.firstName} {comment.user.lastName}
                </span>
                {comment.isEdited && (
                  <Badge variant="outline" className="text-xs">
                    đã chỉnh sửa
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground text-xs">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => handleEditComment(comment)}
                      >
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteComment(comment.id)}
                        className="text-red-600"
                      >
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="Chỉnh sửa bình luận của bạn..."
                  rows={3}
                />
                <div className="flex items-center space-x-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    Lưu
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm">{comment.content}</p>
            )}

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLikeComment(comment.id)}
                className="flex items-center space-x-1"
              >
                <Heart className="h-3 w-3" />
                <span>{comment.likesCount}</span>
              </Button>
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(comment.id)}
                  className="flex items-center space-x-1"
                >
                  <Reply className="h-3 w-3" />
                  <span>Trả lời</span>
                </Button>
              )}
            </div>

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Viết trả lời..."
                  rows={2}
                />
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment.id)}
                  >
                    <Send className="mr-1 h-3 w-3" />
                    Trả lời
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}

        {!isReply && <Separator />}
      </div>
    );
  };

  const topLevelComments = comments.filter(comment => !comment.parentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Bình luận ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Comment Form */}
        <div className="space-y-3">
          <Textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Chia sẻ suy nghĩ của bạn về tài liệu này..."
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
              <Send className="mr-2 h-4 w-4" />
              Đăng bình luận
            </Button>
          </div>
        </div>

        <Separator />

        {/* Comments List */}
        <div className="space-y-4">
          {topLevelComments.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>
                Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ suy nghĩ
                của bạn!
              </p>
            </div>
          ) : (
            topLevelComments.map(comment => renderComment(comment))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
