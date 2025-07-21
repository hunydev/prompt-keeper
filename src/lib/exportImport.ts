import { Prompt } from '@/types';

export interface ExportPrompt {
  title: string;
  content: string;
  tags: string[];
}

export interface ImportPrompt extends ExportPrompt {
  id?: string;
  session_id?: string;
  createdAt?: string;
  updatedAt?: string;
  copiedCount?: number;
  lastUsedAt?: string;
}

// 프롬프트 데이터를 JSON 파일로 내보내기
export const exportPrompts = (prompts: Prompt[]): void => {
  const exportData: ExportPrompt[] = prompts.map(prompt => ({
    title: prompt.title,
    content: prompt.content,
    tags: prompt.tags
  }));

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ai-prompts-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// JSON 파일에서 프롬프트 데이터 가져오기
export const importPrompts = (): Promise<ImportPrompt[]> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('파일이 선택되지 않았습니다.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // 데이터 유효성 검사
          if (!Array.isArray(data)) {
            throw new Error('올바른 형식의 JSON 파일이 아닙니다.');
          }
          
          const validPrompts: ImportPrompt[] = data.filter((item: any) => {
            return (
              typeof item === 'object' &&
              typeof item.title === 'string' &&
              typeof item.content === 'string' &&
              Array.isArray(item.tags) &&
              item.tags.every((tag: any) => typeof tag === 'string')
            );
          });
          
          if (validPrompts.length === 0) {
            throw new Error('유효한 프롬프트 데이터가 없습니다.');
          }
          
          resolve(validPrompts);
        } catch (error) {
          reject(new Error(`파일 읽기 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('파일 읽기에 실패했습니다.'));
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  });
};

// 가져온 프롬프트 데이터를 Prompt 형식으로 변환
export const convertImportToPrompt = (importPrompt: ImportPrompt, sessionId: string): Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    title: importPrompt.title,
    content: importPrompt.content,
    tags: importPrompt.tags,
    session_id: sessionId,
    copiedCount: 0,
    lastUsedAt: null
  };
};
