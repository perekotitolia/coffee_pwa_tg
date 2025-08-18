import { createClient } from '@supabase/supabase-js';

console.log('SB URL?', process.env.NEXT_PUBLIC_SUPABASE_URL); // должно быть НЕ undefined

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
