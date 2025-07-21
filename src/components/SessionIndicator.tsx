import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSessionId } from '@/lib/session';
import { Copy } from 'lucide-react';
import { useState } from 'react';

interface Props { inline?: boolean; }
export function SessionIndicator({ inline = false }: Props) {
  const [copied, setCopied] = useState(false);
  const id = getSessionId();

  const copyId = async () => {
    if (!id) return;
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!id) return null;

  return (
    <div className={inline ? 'flex items-center gap-2' : 'fixed bottom-20 right-4 flex items-center gap-2 z-50'}>
      <Badge variant="secondary" className="font-mono text-xs px-3 py-1">
        {id.substring(0, 7)}
      </Badge>
      <Button size="icon" variant="ghost" onClick={copyId} aria-label="세션 ID 복사">
        <Copy className="h-4 w-4" />
      </Button>
      {copied && <span className="text-xs text-muted-foreground">복사됨</span>}
    </div>
  );
}
