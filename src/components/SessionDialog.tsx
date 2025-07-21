import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, User, Lock, UserPlus } from 'lucide-react';
import { generateSessionIdFromCredentials, setSessionId, saveUserCredentials } from '@/lib/session';
import { sessionApi } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSessionReady: () => void;
}

export function SessionDialog({ open, onClose, onSessionReady }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 로그인 폼 상태
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  
  // 회원가입 폼 상태
  const [signupForm, setSignupForm] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // ID/PW로 session_id 생성
      const sessionId = await generateSessionIdFromCredentials(loginForm.username, loginForm.password);
      
      // 백엔드에서 세션 존재 여부 확인
      const sessionExists = await sessionApi.checkSession(sessionId);
      
      if (!sessionExists) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        return;
      }
      
      // 로그인 성공
      setSessionId(sessionId);
      saveUserCredentials(loginForm.username);
      onSessionReady();
      onClose();
    } catch (error) {
      console.error('Login error:', error);
      setError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupForm.username.trim() || !signupForm.password.trim() || !signupForm.confirmPassword.trim()) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (signupForm.password.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // ID/PW로 session_id 생성
      const sessionId = await generateSessionIdFromCredentials(signupForm.username, signupForm.password);
      
      // 백엔드에서 세션 중복 검사 및 생성
      await sessionApi.createSession(sessionId);
      
      // 회원가입 성공
      setSessionId(sessionId);
      saveUserCredentials(signupForm.username);
      onSessionReady();
      onClose();
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.status === 409) {
        setError('이미 사용 중인 아이디/비밀번호 조합입니다.');
      } else {
        setError('계정 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !isLoading) {
      action();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">Prompt Keeper</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              로그인
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              회원가입
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="login-username">아이디</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="login-username"
                  type="text"
                  placeholder="아이디를 입력하세요"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력하세요"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {error && (
              <div className="text-sm text-red-500 text-center">{error}</div>
            )}
            
            <Button 
              onClick={handleLogin} 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="signup-username">아이디</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="사용할 아이디를 입력하세요"
                  value={signupForm.username}
                  onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signup-password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력하세요 (최소 4자)"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password">비밀번호 확인</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="비밀번호를 다시 입력하세요"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                  onKeyPress={(e) => handleKeyPress(e, handleSignup)}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {error && (
              <div className="text-sm text-red-500 text-center">{error}</div>
            )}
            
            <Button 
              onClick={handleSignup} 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? '계정 생성 중...' : '계정 생성'}
            </Button>
          </TabsContent>
        </Tabs>
        
        <div className="text-xs text-muted-foreground text-center mt-4">
          동일한 아이디/비밀번호로 다른 기기에서도 접근할 수 있습니다.
        </div>
      </DialogContent>
    </Dialog>
  );
}
