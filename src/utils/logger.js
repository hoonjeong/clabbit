/**
 * 로거 유틸리티
 * 환경별로 다른 로깅 레벨을 제공합니다.
 */

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const LOG_COLORS = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m',  // Yellow
    INFO: '\x1b[36m',  // Cyan
    DEBUG: '\x1b[90m', // Gray
    RESET: '\x1b[0m'
};

class Logger {
    constructor(module) {
        this.module = module;
        this.level = this.getLogLevel();
    }

    getLogLevel() {
        const env = process.env.NODE_ENV || 'development';
        const configLevel = process.env.LOG_LEVEL || 'INFO';

        if (env === 'production') {
            return LOG_LEVELS[configLevel.toUpperCase()] || LOG_LEVELS.INFO;
        }
        return LOG_LEVELS.DEBUG; // 개발 환경에서는 모든 로그 출력
    }

    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const color = LOG_COLORS[level];
        const reset = LOG_COLORS.RESET;

        let logMessage = `${color}[${timestamp}] [${level}] [${this.module}]${reset} ${message}`;

        if (data) {
            if (typeof data === 'object') {
                logMessage += '\n' + JSON.stringify(data, null, 2);
            } else {
                logMessage += ' ' + data;
            }
        }

        return logMessage;
    }

    log(level, message, data) {
        if (LOG_LEVELS[level] <= this.level) {
            const formattedMessage = this.formatMessage(level, message, data);

            switch(level) {
                case 'ERROR':
                    console.error(formattedMessage);
                    break;
                case 'WARN':
                    console.warn(formattedMessage);
                    break;
                default:
                    console.log(formattedMessage);
            }
        }
    }

    error(message, data) {
        this.log('ERROR', message, data);
    }

    warn(message, data) {
        this.log('WARN', message, data);
    }

    info(message, data) {
        this.log('INFO', message, data);
    }

    debug(message, data) {
        this.log('DEBUG', message, data);
    }

    // 프로덕션 환경에서는 민감한 정보 제거
    sanitize(data) {
        if (process.env.NODE_ENV === 'production') {
            const sanitized = { ...data };
            const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];

            Object.keys(sanitized).forEach(key => {
                if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                    sanitized[key] = '[REDACTED]';
                }
            });

            return sanitized;
        }
        return data;
    }

    // SQL 쿼리 로깅 (개발 환경에서만)
    query(sql, params) {
        if (process.env.NODE_ENV !== 'production') {
            this.debug('SQL Query', { sql, params });
        }
    }

    // HTTP 요청 로깅
    request(method, url, body) {
        const sanitizedBody = this.sanitize(body);
        this.info(`${method} ${url}`, sanitizedBody);
    }

    // 에러 스택 트레이스 로깅
    exception(error) {
        this.error(error.message, {
            stack: error.stack,
            code: error.code
        });
    }
}

// 싱글톤 인스턴스 관리
const loggers = {};

/**
 * 로거 인스턴스 생성 또는 반환
 * @param {string} module - 모듈 이름
 * @returns {Logger} 로거 인스턴스
 */
function createLogger(module) {
    if (!loggers[module]) {
        loggers[module] = new Logger(module);
    }
    return loggers[module];
}

module.exports = createLogger;