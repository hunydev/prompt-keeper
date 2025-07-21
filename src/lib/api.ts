import { Prompt } from '@/types';

const API_BASE_URL = '/.netlify/functions';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP error! status: ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Keep default error message if JSON parsing fails
    }
    
    throw new ApiError(errorMessage, response.status);
  }
  
  return response.json();
}

export const promptsApi = {
  async getAll(): Promise<Prompt[]> {
    const response = await fetch(`${API_BASE_URL}/prompts`);
    const data = await handleResponse<{ prompts: Prompt[] }>(response);
    return data.prompts || [];
  },

  async create(prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    const response = await fetch(`${API_BASE_URL}/prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prompt),
    });
    
    return handleResponse<Prompt>(response);
  },

  async update(id: string, prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    const response = await fetch(`${API_BASE_URL}/prompts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prompt),
    });
    
    return handleResponse<Prompt>(response);
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/prompts/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Keep default error message if JSON parsing fails
      }
      
      throw new ApiError(errorMessage, response.status);
    }
  },
  
  // 프롬프트가 복사될 때마다 복사 횟수 증가 및 마지막 사용 시간 업데이트
  async incrementCopyCount(id: string): Promise<Prompt> {
    const response = await fetch(`${API_BASE_URL}/prompts/${id}/copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lastUsedAt: new Date().toISOString()
      }),
    });
    
    return handleResponse<Prompt>(response);
  },

  // 일괄 프롬프트 추가
  async createBatch(prompts: Omit<Prompt, 'id' | 'session_id' | 'createdAt' | 'updatedAt'>[]): Promise<{ success: boolean; added: number; errors: number; prompts: Prompt[]; errorDetails: any[] }> {
    const response = await fetch(`${API_BASE_URL}/prompts/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompts }),
    });
    
    return handleResponse<{ success: boolean; added: number; errors: number; prompts: Prompt[]; errorDetails: any[] }>(response);
  },
};

// 세션 관련 API
export const sessionApi = {
  // 세션 존재 여부 확인
  async checkSession(sessionId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        action: 'check'
      }),
    });
    
    const data = await handleResponse<{ exists: boolean }>(response);
    return data.exists;
  },

  // 새 세션 생성 (회원가입)
  async createSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        action: 'create'
      }),
    });
    
    await handleResponse<{ success: boolean }>(response);
  },
};
