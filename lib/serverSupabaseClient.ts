import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 서버 사이드에서만 사용하는 클라이언트 (Service Role Key 사용)
// 함수로 만들어서 매번 환경 변수를 다시 읽도록 함
export function getServerSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'exists' : 'missing');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? 'exists' : 'missing');
    return null;
  }

  try {
    return createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    return null;
  }
}

// 하위 호환성을 위한 export (기존 코드에서 사용 중)
export const serverSupabase = getServerSupabase();

