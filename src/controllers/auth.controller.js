const UserModel = require('../models/user.model');
const { successResponse, errorResponse } = require('../utils/response');
const bcrypt = require('bcrypt');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate
} = require('../utils/jwt.util');

class AuthController {
  // 회원가입
  static async signup(req, res) {
    try {
      const { email, password, name, phone } = req.body;

      // 유효성 검사
      if (!email || !password || !name) {
        return errorResponse(res, '필수 정보를 모두 입력해주세요.', 400);
      }

      // 이메일 중복 확인
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return errorResponse(res, '이미 사용 중인 이메일입니다.', 400);
      }

      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password, 10);

      // 사용자 생성
      const userId = await UserModel.create({
        email,
        password: hashedPassword,
        name,
        phone
      });

      // 세션 설정
      req.session.userId = userId;
      req.session.userEmail = email;
      req.session.userName = name;

      return successResponse(res, {
        message: '회원가입이 완료되었습니다.',
        redirectUrl: '/academies/select'
      }, 201);

    } catch (error) {
      console.error('회원가입 오류:', error);
      return errorResponse(res, '회원가입 중 오류가 발생했습니다.', 500);
    }
  }

  // 로그인
  static async login(req, res) {
    try {
      const { email, password, autoLogin } = req.body;

      // 입력값 유효성 검사
      if (!email || !password) {
        return errorResponse(res, '이메일과 비밀번호를 입력해주세요.', 400, 'MISSING_FIELDS');
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return errorResponse(res, '올바른 이메일 형식이 아닙니다.', 400, 'INVALID_EMAIL');
      }

      // 사용자 조회
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return errorResponse(res, '이메일 또는 비밀번호가 올바르지 않습니다.', 401, 'INVALID_CREDENTIALS');
      }

      // 비밀번호 확인
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return errorResponse(res, '이메일 또는 비밀번호가 올바르지 않습니다.', 401, 'INVALID_CREDENTIALS');
      }

      // Access Token 생성 (15분)
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        name: user.name
      });

      // Refresh Token 생성 (자동로그인 체크 시에만, 30일)
      let refreshToken = null;
      if (autoLogin) {
        refreshToken = generateRefreshToken({
          userId: user.id
        });

        // Refresh Token을 데이터베이스에 저장
        const expiresAt = getRefreshTokenExpiryDate();
        await UserModel.saveRefreshToken(user.id, refreshToken, expiresAt);
      } else {
        // 자동로그인 체크 해제 시 기존 Refresh Token 제거
        await UserModel.removeRefreshToken(user.id);
      }

      // 마지막 로그인 시간 업데이트
      await UserModel.updateLastLogin(user.id);

      // 세션도 병행 유지 (기존 기능과의 호환성)
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userName = user.name;

      return successResponse(res, {
        message: '로그인되었습니다.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          },
          accessToken,
          refreshToken
        },
        redirectUrl: '/academies/select'
      });

    } catch (error) {
      console.error('로그인 오류:', error);
      return errorResponse(res, '로그인 중 오류가 발생했습니다.', 500, 'SERVER_ERROR');
    }
  }

  // 토큰 갱신 (Refresh Token으로 새로운 Access Token 발급)
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return errorResponse(res, 'Refresh Token이 없습니다.', 401, 'MISSING_TOKEN');
      }

      // Refresh Token 검증
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (error) {
        return errorResponse(res, error.message, 401, 'INVALID_TOKEN');
      }

      // 데이터베이스에서 Refresh Token 확인
      const user = await UserModel.findByRefreshToken(refreshToken);
      if (!user) {
        return errorResponse(res, 'Refresh Token이 유효하지 않습니다.', 401, 'INVALID_TOKEN');
      }

      // 새로운 Access Token 생성
      const newAccessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        name: user.name
      });

      return successResponse(res, {
        message: '토큰이 갱신되었습니다.',
        data: {
          accessToken: newAccessToken
        }
      });

    } catch (error) {
      console.error('토큰 갱신 오류:', error);
      return errorResponse(res, '토큰 갱신 중 오류가 발생했습니다.', 500, 'SERVER_ERROR');
    }
  }

  // 로그아웃
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.session.userId;

      // Refresh Token이 있으면 데이터베이스에서 제거
      if (refreshToken) {
        await UserModel.removeRefreshTokenByToken(refreshToken);
      } else if (userId) {
        // 세션 기반 로그아웃 시 해당 사용자의 Refresh Token 제거
        await UserModel.removeRefreshToken(userId);
      }

      // 세션 삭제
      req.session.destroy((err) => {
        if (err) {
          console.error('세션 삭제 오류:', err);
        }
      });

      // API 요청인 경우
      if (req.path.startsWith('/api/')) {
        return successResponse(res, {
          message: '로그아웃되었습니다.'
        });
      }

      // 페이지 요청인 경우
      res.redirect('/login');

    } catch (error) {
      console.error('로그아웃 오류:', error);
      if (req.path.startsWith('/api/')) {
        return errorResponse(res, '로그아웃 중 오류가 발생했습니다.', 500, 'SERVER_ERROR');
      }
      res.redirect('/login');
    }
  }

  // 프로필 페이지
  static async getProfile(req, res) {
    try {
      const userId = req.session.userId;
      const user = await UserModel.findById(userId);

      if (!user) {
        return res.redirect('/login');
      }

      res.render('profile', {
        title: '내정보 - 클래빗',
        page: 'profile',
        user: user,
        userName: req.session.userName,
        academyName: req.session.currentAcademyName || '학원'
      });
    } catch (error) {
      console.error('프로필 조회 오류:', error);
      return res.redirect('/dashboard');
    }
  }

  // 비밀번호 변경
  static async changePassword(req, res) {
    try {
      const userId = req.session.userId;
      const { currentPassword, newPassword } = req.body;

      // 유효성 검사
      if (!currentPassword || !newPassword) {
        return errorResponse(res, '현재 비밀번호와 새 비밀번호를 입력해주세요.', 400);
      }

      if (newPassword.length < 6) {
        return errorResponse(res, '비밀번호는 최소 6자 이상이어야 합니다.', 400);
      }

      // 사용자 조회
      const user = await UserModel.findById(userId);
      if (!user) {
        return errorResponse(res, '사용자를 찾을 수 없습니다.', 404);
      }

      // 현재 비밀번호 확인
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return errorResponse(res, '현재 비밀번호가 올바르지 않습니다.', 401);
      }

      // 새 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // 비밀번호 업데이트
      await UserModel.updatePassword(userId, hashedPassword);

      return successResponse(res, {
        message: '비밀번호가 변경되었습니다.'
      });

    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      return errorResponse(res, '비밀번호 변경 중 오류가 발생했습니다.', 500);
    }
  }
}

module.exports = AuthController;
