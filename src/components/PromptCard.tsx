import { useState, useEffect } from 'react';
import { Copy, Edit, Trash2, ChevronDown, ChevronUp, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Prompt } from '@/types';
import { promptsApi } from '@/lib/api';

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
  forceExpanded?: boolean; // 모든 카드의 펼침/접기 상태를 외부에서 제어하기 위한 prop
}

export function PromptCard({ prompt, onEdit, onDelete, forceExpanded }: PromptCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { addToast } = useToast();
  
  // forceExpanded 값이 변경되면 그에 따라 isExpanded를 업데이트
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  const handleCopy = async () => {
    try {
      // 1. 클립보드에 복사 수행
      await navigator.clipboard.writeText(prompt.content);
      
      // 2. 복사 즉시 토스트 메시지 표시
      addToast('프롬프트가 클립보드에 복사되었습니다.', 'success');
      
      // 3. 복사 횟수 증가 및 마지막 사용 시간 업데이트 (비동기로 처리, 응답 대기 안 함)
      promptsApi.incrementCopyCount(prompt.id)
        .catch(apiError => {
          console.error('복사 횟수 업데이트 실패:', apiError);
        });
      // 비동기 처리로 복사 후 정렬 즉시 갱신 방지
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      addToast('클립보드 복사에 실패했습니다.', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="w-full transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full text-left group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md p-1 -m-1"
              aria-expanded={isExpanded}
              aria-controls={`prompt-content-${prompt.id}`}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                  {prompt.title}
                </h3>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </button>
            <div className="flex flex-wrap gap-1 mt-2">
              {prompt.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-1 ml-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(prompt)}
              className="h-8 w-8"
              aria-label={`${prompt.title} 프롬프트 편집`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(prompt.id)}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label={`${prompt.title} 프롬프트 삭제`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent 
          id={`prompt-content-${prompt.id}`}
          className="pt-0 animate-accordion-down"
        >
          <div className="relative">
            <div className="bg-muted/50 rounded-md p-4 pr-12">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {prompt.content}
              </pre>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="absolute top-2 right-2 h-8 w-8"
              aria-label="프롬프트 복사"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> 
              생성: {formatDate(prompt.createdAt)}
              {prompt.updatedAt !== prompt.createdAt && (
                <span className="ml-2">
                  수정: {formatDate(prompt.updatedAt)}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                복사: {prompt.copiedCount || 0}회
              </div>
              
              {prompt.lastUsedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  마지막 사용: {formatDate(prompt.lastUsedAt)}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
