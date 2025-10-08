const XLSX = require('xlsx');
const fs = require('fs');
const { validateStudent } = require('../utils/validator');

class ExcelService {
  // 샘플 파일 생성
  static generateSampleFile() {
    const sampleData = [
      {
        '이름*': '홍길동',
        '생년월일*': '2010-03-15',
        '학교': 'OO초등학교',
        '학년': '초등 5학년',
        '학생전화번호': '010-1234-5678',
        '학부모전화번호*': '010-5678-9012',
        '주소': '서울시 강남구',
        '메모': '특이사항 없음'
      },
      {
        '이름*': '김철수',
        '생년월일*': '2011-05-20',
        '학교': 'XX중학교',
        '학년': '중학교 2학년',
        '학생전화번호': '010-2345-6789',
        '학부모전화번호*': '010-6789-0123',
        '주소': '서울시 서초구',
        '메모': '알레르기 있음'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    // 열 너비 설정
    ws['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, '학생목록');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // 엑셀/CSV 파일 파싱 및 검증
  static async parseAndValidate(filePath) {
    // XLSX 라이브러리는 .xlsx, .xls, .csv 모두 지원
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const validStudents = [];
    const errors = [];

    data.forEach((row, index) => {
      const rowNum = index + 2;

      const student = {
        name: row['이름*'] || row['이름'],
        birth_date: row['생년월일*'] || row['생년월일(YYYY-MM-DD)'] || row['생년월일'],
        school: row['학교'] || null,
        grade: row['학년'] || null,
        student_phone: row['학생전화번호'] || null,
        parent_phone: row['학부모전화번호*'] || row['학부모전화번호'],
        address: row['주소'] || null,
        memo: row['메모'] || null
      };

      // 유효성 검사
      const validation = validateStudent(student);

      if (validation.isValid) {
        validStudents.push(student);
      } else {
        student.error = validation.errors[0];
        errors.push(`${rowNum}행: ${validation.errors.join(', ')}`);
        validStudents.push(student); // 에러 정보와 함께 추가
      }
    });

    // 파일 삭제
    fs.unlinkSync(filePath);

    return {
      students: validStudents,
      validCount: validStudents.filter(s => !s.error).length,
      errorCount: errors.length,
      errors
    };
  }
}

module.exports = ExcelService;
