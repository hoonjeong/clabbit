const Tesseract = require('tesseract.js');
const fs = require('fs').promises;

class OCRService {
  // 이미지/PDF에서 텍스트 추출
  async extractText(filePath) {
    try {
      const { data: { text } } = await Tesseract.recognize(
        filePath,
        'kor+eng',  // 한국어 + 영어
        {
          logger: info => {
            if (info.status === 'recognizing text') {
              console.log(`OCR 진행률: ${Math.round(info.progress * 100)}%`);
            }
          }
        }
      );

      return text;

    } catch (error) {
      console.error('OCR 처리 오류:', error);
      throw new Error('문서를 읽을 수 없습니다.');
    }
  }

  // 학원 정보 검증
  async verifyAcademyDocuments(academyData, registrationCertPath, businessCertPath) {
    try {
      console.log('📄 학원운영등록증 OCR 처리 중...');
      const registrationText = await this.extractText(registrationCertPath);

      console.log('📄 사업자등록증 OCR 처리 중...');
      const businessText = await this.extractText(businessCertPath);

      // 검증 결과
      const errors = [];

      // 학원 이름 검증
      if (!this.containsText(registrationText, academyData.name)) {
        errors.push('학원운영등록증의 학원 이름이 입력한 정보와 일치하지 않습니다.');
      }

      // 학원등록번호 검증
      const cleanedRegNum = academyData.registration_number.replace(/[^0-9]/g, '');
      if (!this.containsNumber(registrationText, cleanedRegNum)) {
        errors.push('학원운영등록증의 등록번호가 입력한 정보와 일치하지 않습니다.');
      }

      // 사업자등록번호 검증
      const cleanedBizNum = academyData.business_number.replace(/[^0-9]/g, '');
      if (!this.containsNumber(businessText, cleanedBizNum)) {
        errors.push('사업자등록증의 사업자번호가 입력한 정보와 일치하지 않습니다.');
      }

      // 학원 이름이 사업자등록증에도 있는지 확인 (선택)
      if (!this.containsText(businessText, academyData.name)) {
        errors.push('사업자등록증의 상호명이 학원 이름과 일치하지 않습니다.');
      }

      return {
        isValid: errors.length === 0,
        errors,
        extractedData: {
          registrationText: registrationText.substring(0, 500), // 디버깅용
          businessText: businessText.substring(0, 500)
        }
      };

    } catch (error) {
      console.error('문서 검증 오류:', error);
      return {
        isValid: false,
        errors: ['문서를 읽을 수 없습니다. 파일이 손상되었거나 형식이 올바르지 않습니다.']
      };
    }
  }

  // 텍스트 포함 여부 확인 (공백, 특수문자 무시)
  containsText(source, target) {
    const normalizedSource = this.normalize(source);
    const normalizedTarget = this.normalize(target);

    return normalizedSource.includes(normalizedTarget);
  }

  // 숫자 포함 여부 확인
  containsNumber(source, target) {
    const numbersInSource = source.replace(/[^0-9]/g, '');
    const numbersInTarget = target.replace(/[^0-9]/g, '');

    return numbersInSource.includes(numbersInTarget);
  }

  // 텍스트 정규화 (공백, 특수문자 제거)
  normalize(text) {
    return text
      .replace(/\s+/g, '')           // 공백 제거
      .replace(/[^\w가-힣]/g, '')    // 특수문자 제거
      .toLowerCase();
  }
}

module.exports = new OCRService();
