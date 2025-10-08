const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const StudentChargeModel = require('../models/student-charge.model');
const PaymentRecordModel = require('../models/payment-record.model');
const db = require('../config/database');
const createLogger = require('../utils/logger');

const logger = createLogger('BillingExcelService');

class BillingExcelService {
    /**
     * 청구 데이터 엑셀 내보내기
     * @param {number} academyId 학원 ID
     * @param {Object} filters 필터 조건
     * @returns {Promise<Buffer>} 엑셀 파일 버퍼
     */
    async exportCharges(academyId, filters = {}) {
        try {
            // 청구 데이터 조회
            let query = `
                SELECT
                    sc.id as '청구번호',
                    sc.charge_date as '청구일',
                    s.name as '학생명',
                    s.grade as '학년',
                    s.school as '학교',
                    s.phone as '학생연락처',
                    s.parent_phone as '보호자연락처',
                    bi.name as '청구항목',
                    sc.amount as '청구금액',
                    sc.discount_amount as '할인금액',
                    sc.discount_reason as '할인사유',
                    sc.final_amount as '최종금액',
                    sc.paid_amount as '수납금액',
                    sc.remaining_amount as '미납금액',
                    CASE sc.status
                        WHEN 'pending' THEN '미납'
                        WHEN 'partial' THEN '부분납'
                        WHEN 'paid' THEN '완납'
                        WHEN 'overdue' THEN '연체'
                        WHEN 'cancelled' THEN '취소'
                    END as '상태',
                    sc.due_date as '납부기한',
                    sc.notes as '메모'
                FROM student_charges sc
                LEFT JOIN students s ON sc.student_id = s.id
                LEFT JOIN billing_items bi ON sc.billing_item_id = bi.id
                WHERE sc.academy_id = ?
            `;

            const params = [academyId];

            if (filters.month) {
                query += ' AND DATE_FORMAT(sc.charge_date, "%Y-%m") = ?';
                params.push(filters.month);
            }

            if (filters.status) {
                query += ' AND sc.status = ?';
                params.push(filters.status);
            }

            if (filters.student_id) {
                query += ' AND sc.student_id = ?';
                params.push(filters.student_id);
            }

            query += ' ORDER BY sc.charge_date DESC, s.name';

            const [rows] = await db.execute(query, params);

            // 워크북 생성
            const wb = XLSX.utils.book_new();

            // 청구 내역 시트
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, '청구내역');

            // 요약 통계 시트 추가
            const summaryData = await this.generateChargeSummary(academyId, filters);
            const summaryWs = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summaryWs, '요약');

            // 버퍼로 변환
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            logger.info(`청구 데이터 엑셀 내보내기 완료: ${rows.length}건`);
            return buffer;
        } catch (error) {
            logger.error('청구 데이터 엑셀 내보내기 오류:', error);
            throw error;
        }
    }

    /**
     * 수납 데이터 엑셀 내보내기
     * @param {number} academyId 학원 ID
     * @param {Object} filters 필터 조건
     * @returns {Promise<Buffer>} 엑셀 파일 버퍼
     */
    async exportPayments(academyId, filters = {}) {
        try {
            let query = `
                SELECT
                    pr.id as '수납번호',
                    pr.payment_date as '수납일시',
                    s.name as '학생명',
                    s.grade as '학년',
                    s.school as '학교',
                    pr.amount as '수납금액',
                    CASE pr.payment_method
                        WHEN 'cash' THEN '현금'
                        WHEN 'card' THEN '카드'
                        WHEN 'transfer' THEN '계좌이체'
                        WHEN 'auto_transfer' THEN '자동이체'
                        ELSE '기타'
                    END as '수납방법',
                    pr.receipt_number as '영수증번호',
                    pr.card_number_masked as '카드번호',
                    pr.bank_name as '은행명',
                    pr.depositor_name as '입금자명',
                    u.name as '처리자',
                    pr.notes as '메모',
                    CASE pr.status
                        WHEN 'completed' THEN '완료'
                        WHEN 'cancelled' THEN '취소'
                        WHEN 'refunded' THEN '환불'
                    END as '상태'
                FROM payment_records pr
                LEFT JOIN students s ON pr.student_id = s.id
                LEFT JOIN users u ON pr.processed_by = u.id
                WHERE pr.academy_id = ?
            `;

            const params = [academyId];

            if (filters.from_date && filters.to_date) {
                query += ' AND DATE(pr.payment_date) BETWEEN ? AND ?';
                params.push(filters.from_date, filters.to_date);
            } else if (filters.month) {
                query += ' AND DATE_FORMAT(pr.payment_date, "%Y-%m") = ?';
                params.push(filters.month);
            }

            if (filters.payment_method) {
                query += ' AND pr.payment_method = ?';
                params.push(filters.payment_method);
            }

            query += ' ORDER BY pr.payment_date DESC';

            const [rows] = await db.execute(query, params);

            // 워크북 생성
            const wb = XLSX.utils.book_new();

            // 수납 내역 시트
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, '수납내역');

            // 일별 집계 시트
            const dailySummary = await this.generateDailyPaymentSummary(academyId, filters);
            const dailyWs = XLSX.utils.json_to_sheet(dailySummary);
            XLSX.utils.book_append_sheet(wb, dailyWs, '일별집계');

            // 버퍼로 변환
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            logger.info(`수납 데이터 엑셀 내보내기 완료: ${rows.length}건`);
            return buffer;
        } catch (error) {
            logger.error('수납 데이터 엑셀 내보내기 오류:', error);
            throw error;
        }
    }

    /**
     * 미납자 목록 엑셀 내보내기
     * @param {number} academyId 학원 ID
     * @returns {Promise<Buffer>} 엑셀 파일 버퍼
     */
    async exportUnpaidStudents(academyId) {
        try {
            const query = `
                SELECT
                    s.name as '학생명',
                    s.grade as '학년',
                    s.school as '학교',
                    s.phone as '학생연락처',
                    s.parent_phone as '보호자연락처',
                    COUNT(sc.id) as '미납건수',
                    SUM(sc.remaining_amount) as '총미납액',
                    MIN(sc.due_date) as '최초납부기한',
                    GROUP_CONCAT(
                        CONCAT(
                            DATE_FORMAT(sc.charge_date, '%m/%d'),
                            '(',
                            sc.final_amount,
                            '원)'
                        )
                        ORDER BY sc.charge_date
                        SEPARATOR ', '
                    ) as '미납내역'
                FROM student_charges sc
                INNER JOIN students s ON sc.student_id = s.id
                WHERE sc.academy_id = ?
                AND sc.status IN ('pending', 'partial', 'overdue')
                AND sc.remaining_amount > 0
                AND s.status = 'active'
                GROUP BY s.id, s.name, s.grade, s.school, s.phone, s.parent_phone
                ORDER BY SUM(sc.remaining_amount) DESC, s.name
            `;

            const [rows] = await db.execute(query, [academyId]);

            // 워크북 생성
            const wb = XLSX.utils.book_new();

            // 미납자 목록 시트
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, '미납자목록');

            // 미납 통계 시트
            const stats = {
                '총 미납자수': rows.length,
                '총 미납금액': rows.reduce((sum, r) => sum + r['총미납액'], 0),
                '평균 미납금액': rows.length > 0 ? Math.floor(rows.reduce((sum, r) => sum + r['총미납액'], 0) / rows.length) : 0,
                '연체자수': rows.filter(r => new Date(r['최초납부기한']) < new Date()).length
            };

            const statsWs = XLSX.utils.json_to_sheet([stats]);
            XLSX.utils.book_append_sheet(wb, statsWs, '통계');

            // 버퍼로 변환
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            logger.info(`미납자 목록 엑셀 내보내기 완료: ${rows.length}명`);
            return buffer;
        } catch (error) {
            logger.error('미납자 목록 엑셀 내보내기 오류:', error);
            throw error;
        }
    }

    /**
     * 청구 데이터 엑셀 가져오기
     * @param {number} academyId 학원 ID
     * @param {Buffer} fileBuffer 엑셀 파일 버퍼
     * @returns {Promise<Object>} 가져오기 결과
     */
    async importCharges(academyId, fileBuffer) {
        const connection = await db.getConnection();

        try {
            // 엑셀 파일 읽기
            const wb = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(ws);

            logger.info(`청구 데이터 가져오기 시작: ${data.length}건`);

            const results = {
                success: 0,
                failed: 0,
                errors: []
            };

            await connection.beginTransaction();

            for (const row of data) {
                try {
                    // 학생 조회
                    const [students] = await connection.execute(
                        'SELECT id FROM students WHERE academy_id = ? AND name = ? AND status = "active"',
                        [academyId, row['학생명']]
                    );

                    if (students.length === 0) {
                        throw new Error(`학생을 찾을 수 없음: ${row['학생명']}`);
                    }

                    // 청구 항목 조회 (선택사항)
                    let billingItemId = null;
                    if (row['청구항목']) {
                        const [items] = await connection.execute(
                            'SELECT id FROM billing_items WHERE academy_id = ? AND name = ? AND is_active = TRUE',
                            [academyId, row['청구항목']]
                        );
                        if (items.length > 0) {
                            billingItemId = items[0].id;
                        }
                    }

                    // 청구 생성
                    const chargeData = {
                        student_id: students[0].id,
                        billing_item_id: billingItemId,
                        charge_date: this.parseDate(row['청구일']),
                        amount: this.parseAmount(row['청구금액']),
                        discount_amount: this.parseAmount(row['할인금액']) || 0,
                        discount_reason: row['할인사유'] || null,
                        due_date: this.parseDate(row['납부기한']) || null,
                        notes: row['메모'] || null
                    };

                    await StudentChargeModel.create(academyId, chargeData);
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        row: data.indexOf(row) + 2,
                        student: row['학생명'],
                        error: error.message
                    });
                }
            }

            await connection.commit();

            logger.info(`청구 데이터 가져오기 완료: 성공 ${results.success}건, 실패 ${results.failed}건`);
            return results;
        } catch (error) {
            await connection.rollback();
            logger.error('청구 데이터 가져오기 오류:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 청구 요약 생성
     */
    async generateChargeSummary(academyId, filters) {
        const month = filters.month || new Date().toISOString().slice(0, 7);

        const [summary] = await db.execute(`
            SELECT
                '청구 요약' as '구분',
                COUNT(DISTINCT student_id) as '청구학생수',
                COUNT(*) as '총청구건수',
                SUM(amount) as '총청구액',
                SUM(discount_amount) as '총할인액',
                SUM(final_amount) as '최종청구액',
                SUM(paid_amount) as '수납액',
                SUM(remaining_amount) as '미납액'
            FROM student_charges
            WHERE academy_id = ?
            AND DATE_FORMAT(charge_date, '%Y-%m') = ?
        `, [academyId, month]);

        return summary;
    }

    /**
     * 일별 수납 집계
     */
    async generateDailyPaymentSummary(academyId, filters) {
        let query = `
            SELECT
                DATE(payment_date) as '날짜',
                COUNT(DISTINCT student_id) as '수납학생수',
                COUNT(*) as '수납건수',
                SUM(amount) as '총수납액',
                SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as '현금',
                SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) as '카드',
                SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END) as '계좌이체',
                SUM(CASE WHEN payment_method = 'auto_transfer' THEN amount ELSE 0 END) as '자동이체'
            FROM payment_records
            WHERE academy_id = ?
            AND status = 'completed'
        `;

        const params = [academyId];

        if (filters.from_date && filters.to_date) {
            query += ' AND DATE(payment_date) BETWEEN ? AND ?';
            params.push(filters.from_date, filters.to_date);
        } else if (filters.month) {
            query += ' AND DATE_FORMAT(payment_date, "%Y-%m") = ?';
            params.push(filters.month);
        }

        query += ' GROUP BY DATE(payment_date) ORDER BY DATE(payment_date)';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 날짜 파싱
     */
    parseDate(value) {
        if (!value) return null;

        if (typeof value === 'number') {
            // 엑셀 날짜 숫자를 JavaScript 날짜로 변환
            const excelDate = new Date((value - 25569) * 86400 * 1000);
            return excelDate.toISOString().split('T')[0];
        }

        if (typeof value === 'string') {
            // YYYY-MM-DD 형식 체크
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return value;
            }
            // MM/DD/YYYY 형식 변환
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
                const [month, day, year] = value.split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }

        return null;
    }

    /**
     * 금액 파싱
     */
    parseAmount(value) {
        if (!value) return 0;

        if (typeof value === 'number') {
            return value;
        }

        if (typeof value === 'string') {
            // 쉼표와 원 기호 제거
            return parseInt(value.replace(/[,₩원]/g, '')) || 0;
        }

        return 0;
    }
}

module.exports = new BillingExcelService();