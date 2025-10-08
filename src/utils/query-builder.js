/**
 * SQL 쿼리 빌더 유틸리티
 * 안전하고 최적화된 쿼리 생성을 위한 헬퍼 함수
 */

const { validateSortColumn, validateSortOrder, escapeLikePattern } = require('./security');

/**
 * SELECT 쿼리 빌더
 */
class QueryBuilder {
    constructor(tableName) {
        this.tableName = tableName;
        this.selectColumns = ['*'];
        this.joins = [];
        this.wheres = [];
        this.params = [];
        this.groupBy = null;
        this.orderBy = null;
        this.limitValue = null;
        this.offsetValue = null;
    }

    /**
     * SELECT 컬럼 지정
     * @param {string|string[]} columns - 선택할 컬럼
     */
    select(columns) {
        if (Array.isArray(columns)) {
            this.selectColumns = columns;
        } else if (typeof columns === 'string') {
            this.selectColumns = columns.split(',').map(c => c.trim());
        }
        return this;
    }

    /**
     * JOIN 추가
     * @param {string} type - JOIN 타입 (INNER, LEFT, RIGHT)
     * @param {string} table - 조인할 테이블
     * @param {string} on - ON 조건
     */
    join(type, table, on) {
        this.joins.push(`${type} JOIN ${table} ON ${on}`);
        return this;
    }

    /**
     * INNER JOIN
     */
    innerJoin(table, on) {
        return this.join('INNER', table, on);
    }

    /**
     * LEFT JOIN
     */
    leftJoin(table, on) {
        return this.join('LEFT', table, on);
    }

    /**
     * WHERE 조건 추가
     * @param {string} column - 컬럼명
     * @param {string} operator - 연산자
     * @param {any} value - 값
     */
    where(column, operator, value) {
        if (value !== undefined && value !== null) {
            this.wheres.push(`${column} ${operator} ?`);
            this.params.push(value);
        }
        return this;
    }

    /**
     * WHERE = 조건
     */
    whereEquals(column, value) {
        return this.where(column, '=', value);
    }

    /**
     * WHERE IN 조건
     */
    whereIn(column, values) {
        if (Array.isArray(values) && values.length > 0) {
            const placeholders = values.map(() => '?').join(', ');
            this.wheres.push(`${column} IN (${placeholders})`);
            this.params.push(...values);
        }
        return this;
    }

    /**
     * WHERE LIKE 조건
     */
    whereLike(column, pattern) {
        if (pattern) {
            this.wheres.push(`${column} LIKE ?`);
            this.params.push(`%${escapeLikePattern(pattern)}%`);
        }
        return this;
    }

    /**
     * WHERE BETWEEN 조건
     */
    whereBetween(column, start, end) {
        if (start && end) {
            this.wheres.push(`${column} BETWEEN ? AND ?`);
            this.params.push(start, end);
        }
        return this;
    }

    /**
     * WHERE NULL 조건
     */
    whereNull(column) {
        this.wheres.push(`${column} IS NULL`);
        return this;
    }

    /**
     * WHERE NOT NULL 조건
     */
    whereNotNull(column) {
        this.wheres.push(`${column} IS NOT NULL`);
        return this;
    }

    /**
     * OR WHERE 조건 그룹
     * @param {Function} callback - 조건 설정 콜백
     */
    orWhere(callback) {
        const subBuilder = new QueryBuilder(this.tableName);
        callback(subBuilder);

        if (subBuilder.wheres.length > 0) {
            this.wheres.push(`(${subBuilder.wheres.join(' OR ')})`);
            this.params.push(...subBuilder.params);
        }
        return this;
    }

    /**
     * GROUP BY 설정
     */
    groupByColumn(column) {
        this.groupBy = column;
        return this;
    }

    /**
     * ORDER BY 설정
     */
    orderByColumn(column, direction = 'ASC', allowedColumns = []) {
        if (allowedColumns.length > 0) {
            column = validateSortColumn(column, allowedColumns);
        }
        direction = validateSortOrder(direction);
        this.orderBy = `${column} ${direction}`;
        return this;
    }

    /**
     * LIMIT 설정
     */
    limit(limit, offset = 0) {
        this.limitValue = parseInt(limit);
        this.offsetValue = parseInt(offset);
        return this;
    }

    /**
     * 페이징 설정
     */
    paginate(page = 1, perPage = 20) {
        const offset = (page - 1) * perPage;
        return this.limit(perPage, offset);
    }

    /**
     * 쿼리 문자열 생성
     */
    build() {
        let query = `SELECT ${this.selectColumns.join(', ')} FROM ${this.tableName}`;

        // JOIN
        if (this.joins.length > 0) {
            query += ' ' + this.joins.join(' ');
        }

        // WHERE
        if (this.wheres.length > 0) {
            query += ' WHERE ' + this.wheres.join(' AND ');
        }

        // GROUP BY
        if (this.groupBy) {
            query += ` GROUP BY ${this.groupBy}`;
        }

        // ORDER BY
        if (this.orderBy) {
            query += ` ORDER BY ${this.orderBy}`;
        }

        // LIMIT
        if (this.limitValue) {
            query += ' LIMIT ? OFFSET ?';
            this.params.push(this.limitValue, this.offsetValue);
        }

        return { query, params: this.params };
    }

    /**
     * COUNT 쿼리 생성
     */
    buildCount() {
        const originalSelect = this.selectColumns;
        const originalLimit = this.limitValue;
        const originalOffset = this.offsetValue;

        this.selectColumns = ['COUNT(*) as total'];
        this.limitValue = null;
        this.offsetValue = null;

        const result = this.build();

        // 원래 값 복원
        this.selectColumns = originalSelect;
        this.limitValue = originalLimit;
        this.offsetValue = originalOffset;

        // LIMIT 관련 파라미터 제거
        if (originalLimit) {
            result.params = result.params.slice(0, -2);
        }

        return result;
    }
}

/**
 * INSERT 쿼리 빌더
 */
class InsertBuilder {
    constructor(tableName) {
        this.tableName = tableName;
        this.columns = [];
        this.values = [];
    }

    /**
     * 삽입할 데이터 설정
     */
    data(data) {
        this.columns = Object.keys(data);
        this.values = Object.values(data);
        return this;
    }

    /**
     * 쿼리 생성
     */
    build() {
        const placeholders = this.values.map(() => '?').join(', ');
        const query = `INSERT INTO ${this.tableName} (${this.columns.join(', ')}) VALUES (${placeholders})`;
        return { query, params: this.values };
    }
}

/**
 * UPDATE 쿼리 빌더
 */
class UpdateBuilder {
    constructor(tableName) {
        this.tableName = tableName;
        this.updates = [];
        this.wheres = [];
        this.params = [];
    }

    /**
     * 업데이트할 데이터 설정
     */
    set(column, value) {
        this.updates.push(`${column} = ?`);
        this.params.push(value);
        return this;
    }

    /**
     * 여러 필드 동시 설정
     */
    setMultiple(data) {
        Object.entries(data).forEach(([column, value]) => {
            this.set(column, value);
        });
        return this;
    }

    /**
     * WHERE 조건
     */
    where(column, value) {
        this.wheres.push(`${column} = ?`);
        this.params.push(value);
        return this;
    }

    /**
     * 쿼리 생성
     */
    build() {
        let query = `UPDATE ${this.tableName} SET ${this.updates.join(', ')}`;

        if (this.wheres.length > 0) {
            query += ' WHERE ' + this.wheres.join(' AND ');
        }

        return { query, params: this.params };
    }
}

/**
 * DELETE 쿼리 빌더
 */
class DeleteBuilder {
    constructor(tableName) {
        this.tableName = tableName;
        this.wheres = [];
        this.params = [];
    }

    /**
     * WHERE 조건
     */
    where(column, value) {
        this.wheres.push(`${column} = ?`);
        this.params.push(value);
        return this;
    }

    /**
     * 쿼리 생성
     */
    build() {
        let query = `DELETE FROM ${this.tableName}`;

        if (this.wheres.length > 0) {
            query += ' WHERE ' + this.wheres.join(' AND ');
        }

        return { query, params: this.params };
    }
}

/**
 * 팩토리 함수
 */
const createQueryBuilder = {
    select: (table) => new QueryBuilder(table),
    insert: (table) => new InsertBuilder(table),
    update: (table) => new UpdateBuilder(table),
    delete: (table) => new DeleteBuilder(table)
};

module.exports = {
    QueryBuilder,
    InsertBuilder,
    UpdateBuilder,
    DeleteBuilder,
    createQueryBuilder
};