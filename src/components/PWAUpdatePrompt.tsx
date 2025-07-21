import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/button';
import { X, RefreshCw } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowUpdatePrompt(true);
    }
  }, [needRefresh]);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setShowUpdatePrompt(false);
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {offlineReady ? '오프라인 사용 가능' : '업데이트 사용 가능'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {offlineReady 
            ? '앱이 오프라인에서도 사용할 수 있도록 준비되었습니다.'
            : '새로운 버전이 사용 가능합니다. 업데이트하시겠습니까?'
          }
        </p>
        
        {needRefresh && (
          <div className="flex space-x-2">
            <Button onClick={handleUpdate} size="sm" className="flex-1">
              업데이트
            </Button>
            <Button onClick={close} variant="outline" size="sm" className="flex-1">
              나중에
            </Button>
          </div>
        )}
        
        {offlineReady && (
          <Button onClick={close} size="sm" className="w-full">
            확인
          </Button>
        )}
      </div>
    </div>
  );
}
