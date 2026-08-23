import { supabase } from './supabaseClient';

const ACCOUNT_COLUMNS = [
  'id',
  'display_name',
  'brokerage_name',
  'account_type',
  'account_number_masked',
  'is_active',
  'created_at'
].join(',');

export async function listAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select(ACCOUNT_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

export async function createAccount({ displayName, brokerageName, accountType, accountNumberMasked }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('로그인이 필요합니다.');
  }

  const { data, error } = await supabase
    .from('accounts')
    .insert([{
      user_id: authData.user.id,
      display_name: displayName.trim(),
      brokerage_name: brokerageName.trim(),
      account_type: accountType?.trim() || null,
      account_number_masked: accountNumberMasked?.trim() || null,
      is_active: true
    }])
    .select(ACCOUNT_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 등록된 계좌명입니다.');
    }
    throw error;
  }

  return data;
}
