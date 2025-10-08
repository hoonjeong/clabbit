/**
 * 공통 에러 핸들러
 * 에러 메시지 표시 및 로깅 관리
 */

class ErrorHandler {
    /**
     * 에러 처리 및 사용자 알림
     * @param {Error} error - 에러 객체
     * @param {string} fallbackMessage - 기본 에러 메시지
     * @param {boolean} showAlert - alert 표시 여부 (기본: true)
     */
    static handle(error, fallbackMessage = '오류가 발생했습니다.', showAlert = true) {
        const errorMessage = error.message || fallbackMessage;

        // 개발 환경에서만 콘솔에 상세 로그
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.error('Error:', error);
        }

        if (showAlert) {
            alert(errorMessage);
        }

        return errorMessage;
    }

    /**
     * 네트워크 에러 확인
     * @param {Error} error - 에러 객체
     * @returns {boolean} 네트워크 에러 여부
     */
    static isNetworkError(error) {
        return error.message === 'Failed to fetch' ||
               error.message === 'Network request failed' ||
               !navigator.onLine;
    }

    /**
     * 인증 에러 확인
     * @param {Error} error - 에러 객체
     * @returns {boolean} 인증 에러 여부
     */
    static isAuthError(error) {
        return error.message?.includes('로그인') ||
               error.message?.includes('권한') ||
               error.message?.includes('인증');
    }

    /**
     * 에러 타입별 처리
     * @param {Error} error - 에러 객체
     * @param {Object} handlers - 에러 타입별 핸들러
     */
    static handleByType(error, handlers = {}) {
        if (this.isNetworkError(error) && handlers.network) {
            handlers.network(error);
        } else if (this.isAuthError(error) && handlers.auth) {
            handlers.auth(error);
        } else if (handlers.default) {
            handlers.default(error);
        } else {
            this.handle(error);
        }
    }

    /**
     * 토스트 메시지 표시 (향후 확장용)
     * @param {string} message - 메시지
     * @param {string} type - 메시지 타입 (success, error, warning, info)
     */
    static showToast(message, type = 'error') {
        // 현재는 alert 사용, 향후 토스트 UI로 대체 가능
        alert(message);
    }
}

// 전역으로 노출
window.ErrorHandler = ErrorHandler;
