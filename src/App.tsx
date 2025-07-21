import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Moon, Sun, Loader2, SortAsc, SortDesc, Clock, CheckCircle2, CalendarDays, ChevronDown, ChevronUp, Download, Upload, LogOut, User } from 'lucide-react';
import { exportPrompts, importPrompts, convertImportToPrompt } from '@/lib/exportImport';
import { getSessionId, getSavedUsername, clearUserCredentials } from '@/lib/session';
import { SessionDialog } from '@/components/SessionDialog';
import { SessionIndicator } from '@/components/SessionIndicator';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PromptCard } from '@/components/PromptCard';
import { PromptForm } from '@/components/PromptForm';
import { TagFilter } from '@/components/TagFilter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { Prompt } from '@/types';
import { promptsApi, sessionApi, ApiError } from '@/lib/api';

// 정렬 타입 정의
type SortType = 'created' | 'used' | 'copied';

function AppContent() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | undefined>();
  const [sortType, setSortType] = useState<SortType>('created'); // 정렬 유형 (기본: 최근 추가순)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // 정렬 방향 (기본: 내림차순)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
             (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();
  const [sessionReady, setSessionReady] = useState(() => !!getSessionId());
  const [showSessionDialog, setShowSessionDialog] = useState(!sessionReady);
  const [expandAll, setExpandAll] = useState(false); // 모든 카드 펼침/접기 상태
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 선택된 태그 목록

  // 모든 태그 추출 (중복 제거)
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    prompts.forEach(prompt => {
      prompt.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [prompts]);

  // 검색 필터링 및 정렬
  const filteredPrompts = useMemo(() => {
    // 1. 검색 필터링
    let filtered = !searchQuery.trim() ? prompts : prompts.filter(prompt => {
      const query = searchQuery.toLowerCase();
      return prompt.title.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(query));
    });
    
    // 2. 태그 필터링
    // 선택된 태그가 있으면 해당 태그를 포함하는 프롬프트만 표시
    if (selectedTags.length > 0) {
      filtered = filtered.filter(prompt => 
        selectedTags.some(selectedTag => prompt.tags.includes(selectedTag))
      );
    }
    
    // 3. 정렬 적용
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch(sortType) {
        case 'created': // 추가 시간 기준
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'used': // 마지막 사용 시간 기준
          // 사용한 적이 없는 아이템은 가장 마지막으로 정렬
          if (!a.lastUsedAt && !b.lastUsedAt) comparison = 0;
          else if (!a.lastUsedAt) comparison = 1;
          else if (!b.lastUsedAt) comparison = -1;
          else comparison = new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime();
          break;
        case 'copied': // 복사 횟수 기준
          comparison = (a.copiedCount || 0) - (b.copiedCount || 0);
          break;
      }
      
      // 정렬 방향 적용
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [prompts, searchQuery, sortType, sortDirection, selectedTags]);
  
  // 정렬 유형 변경 함수
  const handleChangeSortType = (newSortType: SortType) => {
    if (sortType === newSortType) {
      // 같은 정렬 유형을 클릭하면 오름차순/내림차순 토글
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 정렬 유형으로 변경시
      setSortType(newSortType);
      // '최근 추가순'과 '마지막 사용순'은 기본적으로 내림차순, '많이 사용한 순서'는 내림차순
      setSortDirection('desc');
    }
  };

  // 앱 로드 시 세션 유효성 검증
  useEffect(() => {
    const validateSession = async () => {
      const sessionId = getSessionId();
      
      if (sessionId) {
        try {
          // 백엔드에서 세션 존재 여부 확인
          const sessionExists = await sessionApi.checkSession(sessionId);
          
          if (!sessionExists) {
            // 세션이 존재하지 않으면 쿠키와 로컬스토리지 클리어
            console.warn('Invalid session detected, clearing credentials');
            clearUserCredentials();
            setSessionReady(false);
            setShowSessionDialog(true);
            addToast('세션이 유효하지 않습니다. 다시 로그인해주세요.', 'error');
          } else {
            // 세션이 유효하면 준비 상태로 설정
            setSessionReady(true);
            setShowSessionDialog(false);
          }
        } catch (error) {
          console.error('Session validation error:', error);
          // 네트워크 오류 등의 경우 기존 세션 유지
          // 단, 실제 프롬프트 로드에서 오류가 발생하면 그때 처리
        }
      } else {
        // 세션 ID가 없으면 로그인 화면 표시
        setSessionReady(false);
        setShowSessionDialog(true);
      }
    };
    
    validateSession();
  }, []); // 앱 로드 시 한 번만 실행

  // 프롬프트 목록 로드 (세션 준비 후 호출)
  useEffect(() => {
    if (sessionReady) {
      loadPrompts();
    }
  }, [sessionReady]);

  // 프롬프트 목록 로드
  const loadPrompts = async () => {
    try {
      setIsLoading(true);
      const data = await promptsApi.getAll();
      setPrompts(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to load prompts:', error);
      
      // 세션 오류 처리
      if (!handleSessionError(error)) {
        addToast('프롬프트 목록을 불러오는 데 실패했습니다.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionReady) {
      loadPrompts();
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const handleSavePrompt = async (promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsSaving(true);
      
      if (editingPrompt) {
        // 편집 모드
        const updatedPrompt = await promptsApi.update(editingPrompt.id, promptData);
        setPrompts(prev => prev.map(p => 
          p.id === editingPrompt.id ? updatedPrompt : p
        ));
        addToast('프롬프트가 성공적으로 수정되었습니다.', 'success');
      } else {
        // 새 프롬프트 추가
        const newPrompt = await promptsApi.create(promptData);
        setPrompts(prev => [newPrompt, ...prev]);
        addToast('프롬프트가 성공적으로 추가되었습니다.', 'success');
      }
      
      setShowForm(false);
      setEditingPrompt(undefined);
    } catch (error) {
      console.error('Failed to save prompt:', error);
      
      // 세션 오류 처리
      if (error instanceof ApiError && error.status === 400) {
        clearUserCredentials();
        setSessionReady(false);
        setShowSessionDialog(true);
        setPrompts([]);
        addToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
      } else {
        const message = error instanceof ApiError 
          ? error.message 
          : '프롬프트 저장 중 오류가 발생했습니다.';
        addToast(message, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 프롬프트 수정을 위해 폼 열기
  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setShowForm(true);
  };

  const handleDeletePrompt = async (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;

    if (isLoading) {
      addToast('이미 작업이 진행 중입니다.', 'error');
      return;
    }

    if (window.confirm(`정말로 "${prompt.title}" 프롬프트를 삭제하시겠습니까?`)) {
      setIsLoading(true);
      try {
        await promptsApi.delete(id);
        setPrompts(prev => prev.filter(p => p.id !== id));
        addToast('프롬프트가 성공적으로 삭제되었습니다.', 'success');
      } catch (error) {
        console.error('Failed to delete prompt:', error);
        
        // 세션 오류 처리
        if (error instanceof ApiError && error.status === 400) {
          clearUserCredentials();
          setSessionReady(false);
          setShowSessionDialog(true);
          setPrompts([]);
          addToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
        } else {
          const message = error instanceof ApiError 
            ? error.message 
            : '프롬프트 삭제 중 오류가 발생했습니다.';
          addToast(message, 'error');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPrompt(undefined);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // 세션 오류 처리 헬퍼 함수
  const handleSessionError = (error: any) => {
    if (error instanceof ApiError && error.status === 400) {
      console.warn('Session error detected, clearing credentials');
      clearUserCredentials();
      setSessionReady(false);
      setShowSessionDialog(true);
      addToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
      return true; // 세션 오류로 처리됨
    }
    return false; // 세션 오류가 아님
  };

  // 로그아웃 처리
  const handleLogout = () => {
    if (window.confirm('로그아웃하시겠습니까?')) {
      clearUserCredentials();
      setSessionReady(false);
      setShowSessionDialog(true);
      setPrompts([]);
      addToast('로그아웃되었습니다.', 'success');
    }
  };



  // 태그 토글 함수
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // 모든 태그 선택 해제
  const handleClearAllTags = () => {
    setSelectedTags([]);
  };

  // 프롬프트 내보내기
  const handleExportPrompts = () => {
    if (prompts.length === 0) {
      addToast('내보낼 프롬프트가 없습니다.', 'error');
      return;
    }
    
    try {
      exportPrompts(prompts);
      addToast(`${prompts.length}개의 프롬프트를 내보냈습니다.`, 'success');
    } catch (error) {
      addToast('내보내기에 실패했습니다.', 'error');
    }
  };

  // 프롬프트 가져오기 (일괄 처리)
  const handleImportPrompts = async () => {
    const sessionId = getSessionId();
    if (!sessionId) {
      addToast('세션이 준비되지 않았습니다.', 'error');
      return;
    }

    if (isLoading) {
      addToast('이미 작업이 진행 중입니다.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const importedPrompts = await importPrompts();
      
      if (importedPrompts.length === 0) {
        addToast('가져올 프롬프트가 없습니다.', 'error');
        return;
      }

      // 데이터 변환
      const promptsToAdd = importedPrompts.map(importPrompt => 
        convertImportToPrompt(importPrompt, sessionId)
      );

      // 일괄 추가 API 호출
      const result = await promptsApi.createBatch(promptsToAdd);
      
      if (result.success) {
        if (result.added > 0) {
          addToast(`${result.added}개의 프롬프트를 가져왔습니다.`, 'success');
          await loadPrompts(); // 목록 새로고침
        }
        
        if (result.errors > 0) {
          addToast(`${result.errors}개의 프롬프트 가져오기에 실패했습니다.`, 'error');
          console.warn('가져오기 오류 상세:', result.errorDetails);
        }
      } else {
        addToast('가져오기에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      if (error instanceof ApiError && error.status === 400) {
        // 세션 오류 처리
        clearUserCredentials();
        setSessionReady(false);
        setShowSessionDialog(true);
        setPrompts([]);
        addToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
      } else {
        addToast(`가져오기에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`min-h-screen bg-background transition-colors duration-200 ${isDarkMode ? 'dark' : ''}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <header className="sticky top-0 bg-background/80 backdrop-blur border-b border-border mb-6 z-40 py-3">
          <div className="flex flex-col gap-3">
            {/* 첫 번째 줄: 로고 및 제목 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img 
                  src={isDarkMode ? "/logo.png" : "/logo_black.png"} 
                  alt="Prompt Keeper Logo" 
                  className="w-8 h-8 object-contain"
                />
                <h1 className="text-2xl font-bold text-foreground">Prompt Keeper</h1>
              </div>
              
              {/* 데스크톱에서만 보이는 사용자 정보 */}
              <div className="hidden sm:flex items-center gap-3">
                {/* 사용자 정보 */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{getSavedUsername() || 'Guest'}</span>
                </div>
                
                {/* 로그아웃 버튼 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="로그아웃"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* 두 번째 줄: 사용자 정보(모바일) 및 세션 정보 */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center sm:justify-end gap-2">
              {/* 모바일에서만 보이는 사용자 정보 */}
              <div className="flex sm:hidden items-center gap-3 w-full justify-end">
                {/* 사용자 정보 */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{getSavedUsername() || 'Guest'}</span>
                </div>
                
                {/* 로그아웃 버튼 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="로그아웃"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
              
              {/* 세션 정보 및 설정 */}
              <div className="flex items-center gap-2">
                <SessionIndicator inline />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleDarkMode}
                  aria-label="다크모드 전환"
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        {/* 검색 및 추가 버튼 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* 검색 박스 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="프롬프트, 태그로 검색..."
              className="pl-10"
              disabled={isLoading}
            />
          </div>
          
          {/* 버튼 그룹 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button 
              variant="outline"
              onClick={handleExportPrompts}
              className="flex items-center gap-2"
              disabled={isLoading || prompts.length === 0}
              title="프롬프트 내보내기"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">내보내기</span>
            </Button>
            <Button 
              variant="outline"
              onClick={handleImportPrompts}
              className="flex items-center gap-2"
              disabled={isLoading}
              title="프롬프트 가져오기"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">가져오기</span>
            </Button>
            <Button 
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">추가</span>
            </Button>
          </div>
        </div>

        {/* 프롬프트 추가/수정 모달 */}
        <Dialog open={showForm} onOpenChange={(open) => !isSaving && !open && setShowForm(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPrompt ? '프롬프트 편집' : '새 프롬프트 추가'}
              </DialogTitle>
            </DialogHeader>
            <PromptForm
              prompt={editingPrompt}
              onSave={handleSavePrompt}
              onCancel={handleCancelForm}
              isLoading={isSaving}
            />
          </DialogContent>
        </Dialog>

        {/* 프롬프트 목록 */}
        <main>
          {/* 태그 필터 */}
          <div className="mt-6 mb-4">
            <TagFilter
              tags={allTags}
              selectedTags={selectedTags}
              onTagToggle={handleTagToggle}
              onClearAll={handleClearAllTags}
            />
          </div>

          {/* 정렬 옵션 */}
          <div className="flex flex-wrap items-center gap-2 mt-6 mb-4">
            <span className="text-sm text-muted-foreground">정렬:</span>
            <div className="flex items-center border rounded-md overflow-hidden bg-background shadow-sm">
              <button
                onClick={() => handleChangeSortType('created')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${sortType === 'created' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                aria-label="최근 추가순 정렬"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                추가순
                {sortType === 'created' && (
                  sortDirection === 'desc' ? <SortDesc className="h-3.5 w-3.5 ml-1" /> : <SortAsc className="h-3.5 w-3.5 ml-1" />
                )}
              </button>
              <div className="w-px h-6 bg-border" />
              <button
                onClick={() => handleChangeSortType('used')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${sortType === 'used' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                aria-label="최근 사용순 정렬"
              >
                <Clock className="h-3.5 w-3.5" />
                사용순
                {sortType === 'used' && (
                  sortDirection === 'desc' ? <SortDesc className="h-3.5 w-3.5 ml-1" /> : <SortAsc className="h-3.5 w-3.5 ml-1" />
                )}
              </button>
              <div className="w-px h-6 bg-border" />
              <button
                onClick={() => handleChangeSortType('copied')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${sortType === 'copied' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                aria-label="많이 사용한 순서 정렬"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                사용횟수
                {sortType === 'copied' && (
                  sortDirection === 'desc' ? <SortDesc className="h-3.5 w-3.5 ml-1" /> : <SortAsc className="h-3.5 w-3.5 ml-1" />
                )}
              </button>
            </div>
            
            {/* 모두 펼치기/접기 버튼 */}
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1.5"
              onClick={() => setExpandAll(!expandAll)}
            >
              {expandAll ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  모두 접기
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  모두 펼치기
                </>
              )}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>프롬프트를 불러오는 중...</span>
              </div>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {searchQuery ? '검색 결과가 없습니다.' : '프롬프트가 없습니다.'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="mt-4"
                  variant="outline"
                >
                  첫 번째 프롬프트 추가하기
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPrompts.map((prompt) => (
                <PromptCard 
                  key={prompt.id}
                  prompt={prompt}
                  onEdit={handleEditPrompt}
                  onDelete={handleDeletePrompt}
                  forceExpanded={expandAll}
                />
              ))}
            </div>
          )}
        </main>

        {/* 푸터 */}
        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            Prompt Keeper - 재사용 가능한 AI 프롬프트 관리
          </p>
        </footer>
      </div>
      </div>
      
      <PWAInstallButton />
      <PWAUpdatePrompt />
      
      <SessionDialog
        open={showSessionDialog}
        onClose={() => setShowSessionDialog(false)}
        onSessionReady={() => setSessionReady(true)}
      />
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
