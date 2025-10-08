const AcademyModel = require('../models/academy.model');
const OCRService = require('../services/ocr.service');
const { successResponse, errorResponse } = require('../utils/response');
const path = require('path');
const fs = require('fs').promises;

class AcademyController {
  // 학원 선택 페이지
  static async selectPage(req, res) {
    try {
      const userId = req.session.userId || req.user.id;
      const academies = await AcademyModel.findByUserId(userId);

      res.render('academies/select', {
        academies,
        user: req.user || { name: req.session.userName }
      });

    } catch (error) {
      console.error('학원 선택 페이지 오류:', error);
      res.status(500).send('서버 오류가 발생했습니다.');
    }
  }

  // 학원 추가 페이지
  static newPage(req, res) {
    res.render('academies/new', {
      user: req.user || { name: req.session.userName }
    });
  }

  // 사용자의 학원 목록 조회 (API)
  static async getList(req, res) {
    try {
      const userId = req.session.userId || req.user.id;
      const academies = await AcademyModel.findByUserId(userId);

      return successResponse(res, { academies });

    } catch (error) {
      console.error('학원 목록 조회 오류:', error);
      return errorResponse(res, '학원 목록을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  // 학원 등록
  static async create(req, res) {
    try {
      const userId = req.session.userId || req.user.id;
      const { name, registration_number, business_number, address, phone } = req.body;

      // 파일 확인
      if (!req.files || !req.files.registration_cert || !req.files.business_cert) {
        return errorResponse(res, '학원운영등록증과 사업자등록증을 모두 첨부해주세요.', 400);
      }

      const registrationCert = req.files.registration_cert[0];
      const businessCert = req.files.business_cert[0];

      // 파일 형식 검증
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(registrationCert.mimetype) ||
          !allowedTypes.includes(businessCert.mimetype)) {
        // 업로드된 파일 삭제
        await fs.unlink(registrationCert.path).catch(err => console.error(err));
        await fs.unlink(businessCert.path).catch(err => console.error(err));
        return errorResponse(res, '이미지(JPG, PNG) 또는 PDF 파일만 업로드 가능합니다.', 400);
      }

      // OCR 검증
      console.log('🔍 OCR 검증 시작...');
      const verification = await OCRService.verifyAcademyDocuments(
        { name, registration_number, business_number },
        registrationCert.path,
        businessCert.path
      );

      if (!verification.isValid) {
        // 검증 실패 시 파일 삭제
        await fs.unlink(registrationCert.path).catch(err => console.error(err));
        await fs.unlink(businessCert.path).catch(err => console.error(err));

        return errorResponse(res, '서류 검증에 실패했습니다.', 400, {
          errors: verification.errors
        });
      }

      // 파일을 영구 저장 위치로 이동
      const uploadDir = path.join(__dirname, '../../uploads/academies');
      await fs.mkdir(uploadDir, { recursive: true });

      const timestamp = Date.now();
      const registrationCertPath = path.join(uploadDir, `${timestamp}_reg_${registrationCert.originalname}`);
      const businessCertPath = path.join(uploadDir, `${timestamp}_biz_${businessCert.originalname}`);

      await fs.rename(registrationCert.path, registrationCertPath);
      await fs.rename(businessCert.path, businessCertPath);

      // 학원 등록
      const academyId = await AcademyModel.create({
        name,
        registration_number,
        business_number,
        registration_cert_path: registrationCertPath,
        business_cert_path: businessCertPath,
        address,
        phone
      });

      // 사용자를 학원 소유자로 등록
      await AcademyModel.assignUserRole(userId, academyId, 'owner');

      // 검증 완료 처리
      await AcademyModel.updateVerification(academyId, 'verified', '검증 완료');

      console.log('✅ 학원 등록 완료:', academyId);

      return successResponse(res, {
        message: '학원이 성공적으로 등록되었습니다.',
        academyId
      }, 201);

    } catch (error) {
      console.error('학원 등록 오류:', error);

      // 오류 발생 시 업로드된 파일 삭제 시도
      if (req.files) {
        if (req.files.registration_cert) {
          await fs.unlink(req.files.registration_cert[0].path).catch(err => {});
        }
        if (req.files.business_cert) {
          await fs.unlink(req.files.business_cert[0].path).catch(err => {});
        }
      }

      return errorResponse(res, '학원 등록 중 오류가 발생했습니다.', 500);
    }
  }

  // 학원 입장 (세션에 academy_id 저장)
  static async enter(req, res) {
    try {
      const userId = req.session.userId || req.user.id;
      const { academyId } = req.body;

      // 접근 권한 확인
      const hasAccess = await AcademyModel.hasAccess(userId, academyId);

      if (!hasAccess) {
        return errorResponse(res, '해당 학원에 접근 권한이 없습니다.', 403);
      }

      // 학원 정보 조회
      const academy = await AcademyModel.findById(academyId);

      // 세션에 현재 학원 ID와 이름 저장 (ID는 숫자로 변환)
      req.session.currentAcademyId = parseInt(academyId);
      req.session.currentAcademyName = academy ? academy.name : '학원';

      return successResponse(res, {
        message: '학원에 입장했습니다.',
        redirectUrl: '/dashboard'
      });

    } catch (error) {
      console.error('학원 입장 오류:', error);
      return errorResponse(res, '학원 입장 중 오류가 발생했습니다.', 500);
    }
  }
}

module.exports = AcademyController;
