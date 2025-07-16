import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default async function insertDividend(data) {
  // 테이블명은 dividend_entries로 가정
  const { data: inserted, error } = await supabase
    .from('dividend_entries')
    .insert([data]);
  if (error) throw error;
  return inserted;
}
