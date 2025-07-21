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
 * 특정 세션이 존재하는지 확인합니다.
 */
async function sessionExists(sessionId) {
  if (!sessionId) {
    return false;
  }
  
  try {
    const store = getStore(STORE_NAME);
    const key = getSessionKey(sessionId);
    const data = await store.get(key, { type: 'json' });
    return data !== null;
  } catch (error) {
    console.error('Error checking session existence:', error);
    return false;
  }
}

export default async (request, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    switch (request.method) {
      case 'POST': {
        const { sessionId, action } = await request.json();
        
        if (!sessionId) {
          return Response.json({ error: 'Session ID is required' }, { status: 400, headers: corsHeaders });
        }

        if (action === 'check') {
          // 세션 존재 여부 확인
          const exists = await sessionExists(sessionId);
          return Response.json({ exists }, { headers: corsHeaders });
        } else if (action === 'create') {
          // 새 세션 생성 (회원가입)
          const exists = await sessionExists(sessionId);
          if (exists) {
            return Response.json({ error: 'Session already exists' }, { status: 409, headers: corsHeaders });
          }
          
          // 빈 프롬프트 배열로 세션 생성
          const store = getStore(STORE_NAME);
          const key = getSessionKey(sessionId);
          await store.setJSON(key, []);
          
          return Response.json({ success: true }, { headers: corsHeaders });
        } else {
          return Response.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders });
        }
      }

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }
  } catch (error) {
    console.error('Session API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
};
