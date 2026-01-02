import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 클라이언트 사이드 Supabase 클라이언트 (빌드 시점 에러 방지를 위해 함수로 제공)
export function getSupabase(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// 하위 호환성을 위한 export (빌드 시점 에러 방지를 위해 lazy getter 사용)
// 클라이언트 컴포넌트에서만 사용하고, 서버 컴포넌트에서는 getServerSupabase() 사용
let _supabaseClient: SupabaseClient | null = null;
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabaseClient) {
      _supabaseClient = getSupabase();
    }
    return (_supabaseClient as any)[prop];
  }
});












