// 테이블 구조 및 데이터 조회 스크립트
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

async function checkTables() {
  try {
    console.log('📋 dividend_entries 테이블 구조 확인...\n');

    // 최근 데이터 5개 조회
    const { data: recentData, error } = await supabase
      .from('dividend_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('❌ 데이터 조회 실패:', error.message);
      return;
    }

    console.log('✅ 최근 데이터 5개:');
    console.table(recentData);

    // 컬럼별 통계
    const { data: stats, error: statsError } = await supabase
      .from('dividend_entries')
      .select('input_method, account_type')
      .limit(1000);

    if (!statsError && stats) {
      const inputMethods = {};
      const accountTypes = {};
      
      stats.forEach(row => {
        inputMethods[row.input_method] = (inputMethods[row.input_method] || 0) + 1;
        if (row.account_type) {
          accountTypes[row.account_type] = (accountTypes[row.account_type] || 0) + 1;
        }
      });

      console.log('\n📊 입력 방법별 통계:');
      console.table(inputMethods);
      
      console.log('\n📊 계좌 유형별 통계:');
      console.table(accountTypes);
    }

    // 통화별 통계
    const { data: currencies, error: currError } = await supabase
      .from('dividend_entries')
      .select('currency')
      .limit(1000);

    if (!currError && currencies) {
      const currencyStats = {};
      currencies.forEach(row => {
        currencyStats[row.currency] = (currencyStats[row.currency] || 0) + 1;
      });

      console.log('\n💰 통화별 통계:');
      console.table(currencyStats);
    }

  } catch (error) {
    console.log('❌ 조회 실패:', error.message);
  }
}

checkTables();