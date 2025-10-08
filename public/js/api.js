/**
 * API 호출 래퍼
 */
class API {
  static async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.');
      }

      return data;

    } catch (error) {
      console.error('API 오류:', error);
      throw error;
    }
  }

  static get(url) {
    return this.request(url, { method: 'GET' });
  }

  static post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static delete(url) {
    return this.request(url, { method: 'DELETE' });
  }

  // 파일 업로드
  static async upload(url, formData) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
        // Content-Type은 자동 설정됨
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '업로드 중 오류가 발생했습니다.');
      }

      return data;

    } catch (error) {
      console.error('업로드 오류:', error);
      throw error;
    }
  }
}
