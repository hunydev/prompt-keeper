import { getStore } from '@netlify/blobs';

const STORE_NAME = 'ai-prompts';

/**
 * 세션 ID에 해당하는 키 이름을 생성합니다.
 * @param {string} sessionId 세션 ID
 * @returns {string} 키 이름
 */
function getSessionKey(sessionId) {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }
  return `prompt_${sessionId}`;
}

/**
 * 특정 세션의 프롬프트 배열을 Netlify Blobs에서 로드합니다. 
 * 찾을 수 없는 경우 빈 배열을 반환합니다.
 */
async function loadPrompts(sessionId) {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }
  
  const store = getStore(STORE_NAME);
  const key = getSessionKey(sessionId);
  const prompts = await store.get(key, { type: 'json' }) || [];
  return prompts;
}

/**
 * 특정 세션의 프롬프트 배열을 Netlify Blobs에 JSON으로 저장합니다.
 */
async function savePrompts(sessionId, prompts) {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }
  
  const store = getStore(STORE_NAME);
  const key = getSessionKey(sessionId);
  await store.setJSON(key, prompts);
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export default async (request, context) => {
  const parseCookies = (cookieHeader = '') => Object.fromEntries(cookieHeader.split(';').map(c=>c.trim().split('=').map(decodeURIComponent)));

  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies.session_id;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // 세션 ID가 없는 경우 처리
  if (!sessionId && request.method !== 'OPTIONS') {
    return Response.json({ error: 'Session required' }, { status: 400, headers: corsHeaders });
  }

  // Preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    switch (request.method) {
      case 'GET': {
        const prompts = await loadPrompts(sessionId);
        return Response.json({ prompts }, { headers: corsHeaders });
      }

      case 'POST': {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        // /prompts/batch 경로 처리 (일괄 추가)
        if (pathParts.length >= 2 && pathParts[pathParts.length - 1] === 'batch') {
          const input = await request.json();
          if (!Array.isArray(input.prompts)) {
            return Response.json({ error: 'prompts array is required' }, { status: 400, headers: corsHeaders });
          }
          
          const prompts = await loadPrompts(sessionId);
          const newPrompts = [];
          const errors = [];
          
          for (const promptData of input.prompts) {
            try {
              if (!promptData.title?.trim() || !promptData.content?.trim()) {
                errors.push({ error: 'Title and content are required', data: promptData });
                continue;
              }
              
              const newPrompt = {
                id: generateId(),
                title: promptData.title.trim(),
                content: promptData.content.trim(),
                tags: Array.isArray(promptData.tags) ? promptData.tags.filter((t) => t && t.trim()) : [],
                session_id: sessionId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                copiedCount: promptData.copiedCount || 0,
                lastUsedAt: promptData.lastUsedAt || null
              };
              
              newPrompts.push(newPrompt);
            } catch (error) {
              errors.push({ error: error.message, data: promptData });
            }
          }
          
          // 새 프롬프트들을 기존 배열에 추가
          prompts.push(...newPrompts);
          await savePrompts(sessionId, prompts);
          
          return Response.json({ 
            success: true, 
            added: newPrompts.length, 
            errors: errors.length,
            prompts: newPrompts,
            errorDetails: errors
          }, { status: 201, headers: corsHeaders });
        }
        // /prompts/{id}/copy 경로 처리 (복사 횟수 업데이트)
        else if (pathParts.length >= 3 && pathParts[pathParts.length - 1] === 'copy') {
          const id = pathParts[pathParts.length - 2];
          if (!id) {
            return Response.json({ error: 'Missing prompt ID' }, { status: 400, headers: corsHeaders });
          }
          
          const prompts = await loadPrompts(sessionId);
          const index = prompts.findIndex((p) => p.id === id);
          
          if (index === -1) {
            return Response.json({ error: 'Prompt not found', id }, { status: 404, headers: corsHeaders });
          }
          
          // 입력 데이터 받기 (있는 경우)
          const input = await request.json().catch(() => ({}));
          
          // 복사 횟수 증가 및 마지막 사용 시간 업데이트
          const updatedPrompt = {
            ...prompts[index],
            copiedCount: (prompts[index].copiedCount || 0) + 1,
            lastUsedAt: input.lastUsedAt || new Date().toISOString()
          };
          
          prompts[index] = updatedPrompt;
          await savePrompts(sessionId, prompts);
          
          return Response.json(updatedPrompt, { headers: corsHeaders });
        } 
        // 새 프롬프트 생성 처리
        else {
          const input = await request.json();
          if (!input.title?.trim() || !input.content?.trim()) {
            return Response.json({ error: 'Title and content are required' }, { status: 400, headers: corsHeaders });
          }
          const prompts = await loadPrompts(sessionId);
          const newPrompt = {
            id: generateId(),
            title: input.title.trim(),
            content: input.content.trim(),
            tags: Array.isArray(input.tags) ? input.tags.filter((t) => t && t.trim()) : [],
            session_id: sessionId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            copiedCount: 0, // 초기화
            lastUsedAt: null // 초기화 
          };
          prompts.push(newPrompt);
          await savePrompts(sessionId, prompts);
          return Response.json(newPrompt, { status: 201, headers: corsHeaders });
        }
      }

      case 'PUT': {
        const url = new URL(request.url);
        let id = url.searchParams.get('id');
        if (!id) {
          const segments = url.pathname.split('/').filter(Boolean);
          id = segments[segments.length - 1];
          if (id === 'prompts') id = null;
        }
        if (!id) {
          return Response.json({ error: 'Missing prompt ID' }, { status: 400, headers: corsHeaders });
        }
        const input = await request.json();
        if (!input.title?.trim() || !input.content?.trim()) {
          return Response.json({ error: 'Title and content are required' }, { status: 400, headers: corsHeaders });
        }
        const prompts = await loadPrompts(sessionId);
        const index = prompts.findIndex((p) => p.id === id);
        if (index === -1) {
          return Response.json({ error: 'Prompt not found', id }, { status: 404, headers: corsHeaders });
        }
        const updated = {
          ...prompts[index],
          title: input.title.trim(),
          content: input.content.trim(),
          tags: Array.isArray(input.tags) ? input.tags.filter((t) => t && t.trim()) : [],
          updatedAt: new Date().toISOString(),
        };
        prompts[index] = updated;
        await savePrompts(sessionId, prompts);
        return Response.json(updated, { headers: corsHeaders });
      }

      case 'DELETE': {
        const url = new URL(request.url);
        let id = url.searchParams.get('id');
        if (!id) {
          const segments = url.pathname.split('/').filter(Boolean);
          id = segments[segments.length - 1];
          if (id === 'prompts') id = null;
        }
        if (!id) {
          return Response.json({ error: 'Missing prompt ID' }, { status: 400, headers: corsHeaders });
        }
        const prompts = await loadPrompts(sessionId);
        const index = prompts.findIndex((p) => p.id === id);
        if (index === -1) {
          return Response.json({ error: 'Prompt not found', id }, { status: 404, headers: corsHeaders });
        }
        prompts.splice(index, 1);
        await savePrompts(sessionId, prompts);
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }
  } catch (err) {
    console.error('Handler error:', err);
    return Response.json({ error: 'Internal server error', details: err.message }, { status: 500, headers: corsHeaders });
  }
};
