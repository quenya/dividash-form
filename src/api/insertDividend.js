import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

async function insertDividend(dividendData) {
  try {
    const { error } = await supabase
      .from('dividend_entries')
      .insert([{
        account_name: dividendData.account_name,
        account_type: dividendData.account_type || null,
        account_number: dividendData.account_number || null,
        ticker: dividendData.ticker || null,
        company_name: dividendData.company_name || dividendData.stock,
        dividend_amount: dividendData.dividend_amount,
        payment_date: dividendData.payment_date,
        currency: dividendData.currency || 'KRW',
        input_method: dividendData.input_method || 'manual',
        confidence_score: dividendData.confidence_score || null
      }]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('배당금 입력 오류:', error);
    throw new Error(`배당금 입력 실패: ${error.message}`);
  }
}

export default insertDividend;
