// Supabase 연결 테스트 스크립트
// 터미널에서 'node sheet/test_connection.js' 로 실행

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Supabase 연결 정보 확인...');
console.log('URL:', process.env.REACT_APP_SUPABASE_URL || '❌ 설정되지 않음');
console.log('Key:', process.env.REACT_APP_SUPABASE_ANON_KEY ? '✅ 설정됨' : '❌ 설정되지 않음');

if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.log('\n❌ 환경 변수가 설정되지 않았습니다.');
  console.log('📝 .env 파일에 다음 정보를 입력해주세요:');
  console.log('REACT_APP_SUPABASE_URL=https://your-project.supabase.co');
  console.log('REACT_APP_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

async function testConnection() {
  try {
    console.log('\n🚀 Supabase 연결 테스트 중...');

    // 1. 테이블 존재 확인
    const { data: tables, error: tableError } = await supabase
      .from('dividend_entries')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('❌ 테이블 연결 실패:', tableError.message);
      console.log('💡 Supabase SQL Editor에서 supabase_setup.sql을 실행해주세요.');
      return;
    }

    console.log('✅ dividend_entries 테이블 연결 성공');

    // 2. 테이블 구조 확인
    const { data: columns, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'dividend_entries' })
      .select('*');

    // 3. 데이터 개수 확인
    const { count, error: countError } = await supabase
      .from('dividend_entries')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`📊 현재 데이터 개수: ${count}개`);
    }

    // 4. 새로운 컬럼들 확인
    const { data: sample, error: sampleError } = await supabase
      .from('dividend_entries')
      .select('input_method, confidence_score, account_type, account_number')
      .limit(1);

    if (!sampleError) {
      console.log('✅ AI 기능용 새 컬럼들이 정상적으로 추가되었습니다.');
      console.log('   - input_method');
      console.log('   - confidence_score');
      console.log('   - account_type');
      console.log('   - account_number');
    }

    console.log('\n🎉 Supabase 연결이 완료되었습니다!');
    console.log('이제 애플리케이션을 실행할 수 있습니다: npm start');

  } catch (error) {
    console.log('❌ 연결 테스트 실패:', error.message);
    console.log('\n🔧 해결 방법:');
    console.log('1. .env 파일의 URL과 Key가 정확한지 확인');
    console.log('2. Supabase 프로젝트가 활성화되어 있는지 확인');
    console.log('3. SQL Editor에서 supabase_setup.sql 실행');
  }
}

testConnection();
