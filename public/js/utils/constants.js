/**
 * 프론트엔드 상수 정의
 * 하드코딩된 값들을 중앙 집중 관리
 */

const CONSTANTS = {
    // API 엔드포인트
    API: {
        AUTH: {
            LOGIN: '/api/auth/login',
            SIGNUP: '/api/auth/signup',
            LOGOUT: '/api/auth/logout',
            CHANGE_PASSWORD: '/api/auth/change-password'
        },
        STUDENTS: {
            LIST: '/api/students',
            DETAIL: (id) => `/api/students/${id}`,
            CREATE: '/api/students',
            UPDATE: (id) => `/api/students/${id}`,
            DELETE: (id) => `/api/students/${id}`,
            SEARCH: '/api/students/search',
            NEW: '/api/students/new',
            EXITS: '/api/students/exits',
            BULK_CREATE: '/api/students/bulk',
            REINSTATE: (id) => `/api/students/${id}/reinstate`,
            WITHDRAW: (id) => `/api/students/${id}/withdraw`
        },
        CLASSES: {
            LIST: '/api/classes',
            DETAIL: (id) => `/api/classes/${id}`,
            CREATE: '/api/classes',
            UPDATE: (id) => `/api/classes/${id}`,
            DELETE: (id) => `/api/classes/${id}`,
            COMPLETE: (id) => `/api/classes/${id}/complete`,
            GRADES: '/api/classes/grades'
        },
        TEACHERS: {
            LIST: '/api/teachers',
            DETAIL: (id) => `/api/teachers/${id}`,
            CREATE: '/api/teachers',
            UPDATE: (id) => `/api/teachers/${id}`,
            DELETE: (id) => `/api/teachers/${id}`
        },
        ACADEMIES: {
            LIST: '/api/academies',
            SELECT: (id) => `/api/academies/${id}/select`
        },
        DASHBOARD: {
            STATS: '/api/dashboard/stats'
        }
    },

    // 페이지네이션
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 20,
        ITEMS_PER_PAGE_OPTIONS: [10, 20, 50, 100]
    },

    // 학생 상태
    STUDENT_STATUS: {
        ACTIVE: 'active',
        WITHDRAWN: 'withdrawn'
    },

    // 수업 상태
    CLASS_STATUS: {
        ACTIVE: 'active',
        COMPLETED: 'completed'
    },

    // 날짜 형식
    DATE_FORMAT: {
        DISPLAY: 'YYYY-MM-DD',
        API: 'YYYY-MM-DD',
        KOREAN: 'YYYY년 MM월 DD일'
    },

    // 메시지
    MESSAGES: {
        CONFIRM_DELETE: '정말 삭제하시겠습니까?',
        CONFIRM_LOGOUT: '로그아웃 하시겠습니까?',
        SAVE_SUCCESS: '저장되었습니다.',
        DELETE_SUCCESS: '삭제되었습니다.',
        UPDATE_SUCCESS: '수정되었습니다.',
        NETWORK_ERROR: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
        AUTH_ERROR: '인증이 필요합니다. 다시 로그인해주세요.'
    },

    // 정규식
    REGEX: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PHONE: /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
        PASSWORD_MIN_LENGTH: 6
    }
};

// 전역으로 노출
window.CONSTANTS = CONSTANTS;
