// CSV → Supabase 자동 입력 스크립트
// 사용 전: npm install @supabase/supabase-js csv-parse

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sheetDir = __dirname;
const files = fs.readdirSync(sheetDir).filter(f => /^배당정리 - \d{4}\.csv$/.test(f));

const monthMap = [
  null, '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'
];

(async () => {
  for (const file of files) {
    const yearMatch = file.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : '2023';
    const csvPath = path.join(sheetDir, file);
    const csv = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csv, { relax_column_count: true });
    let currentAccount = null;
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      // 계좌명 행: 첫 컬럼이 계좌번호로 시작
      if (row[0] && /\d{2,}-\d{2,}-\d{3,}/.test(row[0])) {
        currentAccount = row[0];
        continue;
      }
      // 종목명 행: 첫 컬럼이 종목명, 월별 금액이 있음
      if (
        currentAccount &&
        row[0] &&
        row.slice(1, 13).some(cell => cell && cell.trim()) &&
        !/^계|^합계|^환산|^총계/.test(row[0]) // '계', '합계', '환산', '총계' 행 제외
      ) {
        const company = row[0];
        for (let m = 1; m <= 12; m++) {
          const cell = row[m];
          if (!cell || !cell.trim()) continue;
          // 금액/통화 파싱
          let amount = cell.replace(/[^\d.\-]/g, '');
          let currency = cell.includes('₩') ? 'KRW' : (cell.includes('$') ? 'USD' : 'KRW');
          // 환산(환율) 셀은 제외: 금액이 있고, company가 '환산' 또는 '총계'인 경우
          if (!amount) continue;
          // 날짜: 연도별, 월별 1일로 지정
          const payment_date = `${year}-${monthMap[m]}-01`;
          // insert
          const { error } = await supabase.from('dividend_entries').insert([
            {
              account_name: currentAccount,
              company_name: company,
              dividend_amount: parseFloat(amount),
              payment_date,
              currency
            }
          ]);
          if (error) {
            console.error('Insert error:', error, row);
          } else {
            console.log(`Inserted: ${file}, ${currentAccount}, ${company}, ${amount} ${currency}, ${payment_date}`);
          }
        }
      }
    }
  }
})();
