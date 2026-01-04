import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase DB 연결 타입 정의
 * 'primary': 기본 DB (기존 설정)
 * 'secondary': 두 번째 DB
 * 또는 커스텀 이름 사용 가능
 */
export type SupabaseDBName = 'primary' | 'secondary' | string;

/**
 * 서버 사이드에서 사용하는 다중 Supabase 클라이언트
 * Service Role Key를 사용하여 관리자 권한으로 접근
 */
export function getServerSupabase(dbName: SupabaseDBName = 'primary'): SupabaseClient | null {
  let supabaseUrl: string | undefined;
  let supabaseServiceRoleKey: string | undefined;

  if (dbName === 'primary') {
    // 기본 DB (기존 설정)
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else if (dbName === 'secondary') {
    // 두 번째 DB
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_2;
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY_2;
  } else {
    // 커스텀 DB 이름 (환경 변수에서 동적으로 가져오기)
    supabaseUrl = process.env[`NEXT_PUBLIC_SUPABASE_URL_${dbName.toUpperCase()}`];
    supabaseServiceRoleKey = process.env[`SUPABASE_SERVICE_ROLE_KEY_${dbName.toUpperCase()}`];
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error(`Missing Supabase environment variables for DB: ${dbName}`);
    console.error(`URL: ${supabaseUrl ? 'exists' : 'missing'}`);
    console.error(`Service Role Key: ${supabaseServiceRoleKey ? 'exists' : 'missing'}`);
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
    console.error(`Error creating Supabase client for DB: ${dbName}`, error);
    return null;
  }
}

/**
 * 클라이언트 사이드에서 사용하는 다중 Supabase 클라이언트
 * Anon Key를 사용하여 클라이언트 권한으로 접근
 */
export function getSupabase(dbName: SupabaseDBName = 'primary'): SupabaseClient {
  let supabaseUrl: string | undefined;
  let supabaseAnonKey: string | undefined;

  if (dbName === 'primary') {
    // 기본 DB (기존 설정)
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } else if (dbName === 'secondary') {
    // 두 번째 DB
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_2;
    supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_2;
  } else {
    // 커스텀 DB 이름
    supabaseUrl = process.env[`NEXT_PUBLIC_SUPABASE_URL_${dbName.toUpperCase()}`];
    supabaseAnonKey = process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${dbName.toUpperCase()}`];
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing Supabase environment variables for DB: ${dbName}. ` +
      `Required: NEXT_PUBLIC_SUPABASE_URL${dbName !== 'primary' ? '_' + dbName.toUpperCase() : ''} ` +
      `and NEXT_PUBLIC_SUPABASE_ANON_KEY${dbName !== 'primary' ? '_' + dbName.toUpperCase() : ''}`
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * 커스텀 URL과 키로 Supabase 클라이언트 생성
 * 환경 변수에 없는 DB를 동적으로 연결할 때 사용
 */
export function createCustomSupabaseClient(
  url: string,
  key: string,
  options?: {
    autoRefreshToken?: boolean;
    persistSession?: boolean;
  }
): SupabaseClient {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: options?.autoRefreshToken ?? false,
      persistSession: options?.persistSession ?? false,
    },
  });
}


