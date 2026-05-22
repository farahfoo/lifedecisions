import { createClient } from '@supabase/supabase-js';

// Use standard import.meta.env so Vite can statically replace these at compile time
// @ts-ignore
const rawUrl = import.meta.env?.VITE_SUPABASE_URL;
// @ts-ignore
const rawAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
const supabaseAnonKey = typeof rawAnonKey === 'string' ? rawAnonKey.trim() : '';

const isValid = supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey;

// Safe mock database state for graceful offline experience if Supabase is disconnected or unconfigured
let mockDatabase: any[] = [];

// A robust proxy to intercept calls and support fallback behavior in case config is missing or invalid
const createMockSupabase = () => {
  const mockClient = {
    from: (table: string) => {
      return {
        select: (columns: string) => {
          return Promise.resolve({ data: [...mockDatabase], error: null });
        },
        insert: (dataList: any[]) => {
          mockDatabase = [...dataList, ...mockDatabase];
          return Promise.resolve({ data: dataList, error: null });
        },
        delete: () => {
          return {
            neq: (col: string, val: string) => {
              mockDatabase = [];
              return Promise.resolve({ error: null });
            }
          };
        }
      };
    },
    channel: (name: string) => {
      return {
        on: (event: string, filter: any, callback: Function) => {
          return {
            subscribe: () => {
              console.log(`[Mock Supabase] Subscribed to real-time channel: ${name}`);
              return { unsubscribe: () => {} };
            }
          };
        }
      };
    },
    removeChannel: (channel: any) => {
      console.log('[Mock Supabase] Removed channel');
    }
  };
  return mockClient as any;
};

if (!isValid) {
  console.warn(
    "Supabase configuration is missing or invalid. Utilizing resilient background simulated database state to keep application online."
  );
}

export const supabase = isValid 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : createMockSupabase();

