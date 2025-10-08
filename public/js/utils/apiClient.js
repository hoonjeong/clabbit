/**
 * 공통 API 클라이언트
 * 모든 API 호출을 통합 관리하고 일관된 에러 핸들링 제공
 */

class APIClient {
    /**
     * API 요청 공통 처리
     * @param {string} url - API 엔드포인트
     * @param {Object} options - fetch 옵션
     * @returns {Promise<Object>} 응답 데이터
     */
    static async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            // 에러를 상위로 전파
            throw error;
        }
    }

    /**
     * GET 요청
     * @param {string} url - API 엔드포인트
     * @param {Object} params - 쿼리 파라미터
     * @returns {Promise<Object>} 응답 데이터
     */
    static async get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;

        return this.request(fullUrl, {
            method: 'GET'
        });
    }

    /**
     * POST 요청
     * @param {string} url - API 엔드포인트
     * @param {Object} data - 요청 데이터
     * @returns {Promise<Object>} 응답 데이터
     */
    static async post(url, data = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT 요청
     * @param {string} url - API 엔드포인트
     * @param {Object} data - 요청 데이터
     * @returns {Promise<Object>} 응답 데이터
     */
    static async put(url, data = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE 요청
     * @param {string} url - API 엔드포인트
     * @returns {Promise<Object>} 응답 데이터
     */
    static async delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }

    /**
     * FormData POST 요청 (파일 업로드 등)
     * @param {string} url - API 엔드포인트
     * @param {FormData} formData - FormData 객체
     * @returns {Promise<Object>} 응답 데이터
     */
    static async postFormData(url, formData) {
        return this.request(url, {
            method: 'POST',
            headers: {}, // Content-Type을 자동으로 설정하도록 비움
            body: formData
        });
    }
}

// 전역으로 노출
window.APIClient = APIClient;
