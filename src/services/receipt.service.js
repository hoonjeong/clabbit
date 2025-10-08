const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const PaymentRecordModel = require('../models/payment-record.model');
const StudentChargeModel = require('../models/student-charge.model');
const db = require('../config/database');
const createLogger = require('../utils/logger');

const logger = createLogger('ReceiptService');

class ReceiptService {
    /**
     * 영수증 HTML 생성
     * @param {number} academyId 학원 ID
     * @param {number} paymentId 수납 ID
     * @returns {Promise<string>} HTML 문자열
     */
    async generateReceiptHTML(academyId, paymentId) {
        try {
            // 수납 정보 조회
            const payment = await PaymentRecordModel.findById(academyId, paymentId);

            if (!payment) {
                throw new Error('수납 정보를 찾을 수 없습니다.');
            }

            // 학원 정보 조회
            const [academyResult] = await db.execute(
                'SELECT * FROM academies WHERE id = ?',
                [academyId]
            );
            const academy = academyResult[0];

            // 청구 정보 조회 (있는 경우)
            let charge = null;
            if (payment.charge_id) {
                charge = await StudentChargeModel.findById(academyId, payment.charge_id);
            }

            const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>영수증 - ${payment.receipt_number}</title>
    <style>
        @page { size: A4; margin: 0; }
        body {
            font-family: 'Malgun Gothic', sans-serif;
            margin: 0;
            padding: 20mm;
            line-height: 1.6;
        }
        .receipt {
            max-width: 180mm;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            border-bottom: 3px double #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
        }
        .academy-name {
            font-size: 18px;
            margin: 5px 0;
        }
        .academy-info {
            font-size: 12px;
            color: #666;
        }
        .receipt-number {
            position: absolute;
            top: 20mm;
            right: 20mm;
            font-size: 12px;
            color: #666;
        }
        .section {
            margin: 20px 0;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            padding: 5px;
            background: #f5f5f5;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border: 1px solid #ddd;
        }
        th {
            background: #f9f9f9;
            font-weight: normal;
            width: 30%;
        }
        .amount-section {
            margin: 30px 0;
            border: 2px solid #333;
            padding: 15px;
        }
        .amount-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
        }
        .amount-label {
            font-weight: bold;
        }
        .amount-value {
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            width: 45%;
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 40px;
            padding-top: 5px;
        }
        .stamp-area {
            width: 60px;
            height: 60px;
            border: 1px solid #999;
            margin: 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
            font-size: 10px;
        }
        @media print {
            body { padding: 10mm; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="receipt-number">No. ${payment.receipt_number}</div>

        <div class="header">
            <div class="title">영 수 증</div>
            <div class="academy-name">${academy.name}</div>
            <div class="academy-info">
                ${academy.address || ''}<br>
                Tel: ${academy.phone || ''} | 사업자번호: ${academy.business_number || ''}
            </div>
        </div>

        <div class="section">
            <div class="section-title">수납 정보</div>
            <table>
                <tr>
                    <th>수납일시</th>
                    <td>${new Date(payment.payment_date).toLocaleString('ko-KR')}</td>
                </tr>
                <tr>
                    <th>학생명</th>
                    <td>${payment.student_name}</td>
                </tr>
                <tr>
                    <th>수납방법</th>
                    <td>${this.getPaymentMethodText(payment.payment_method)}</td>
                </tr>
                ${payment.card_number_masked ? `
                <tr>
                    <th>카드번호</th>
                    <td>${payment.card_number_masked}</td>
                </tr>
                ` : ''}
                ${payment.depositor_name ? `
                <tr>
                    <th>입금자명</th>
                    <td>${payment.depositor_name}</td>
                </tr>
                ` : ''}
            </table>
        </div>

        ${charge ? `
        <div class="section">
            <div class="section-title">청구 내역</div>
            <table>
                <tr>
                    <th>청구항목</th>
                    <td>${charge.item_name || '수업료'}</td>
                </tr>
                <tr>
                    <th>청구일</th>
                    <td>${new Date(charge.charge_date).toLocaleDateString('ko-KR')}</td>
                </tr>
                <tr>
                    <th>청구금액</th>
                    <td>₩${charge.amount.toLocaleString()}</td>
                </tr>
                ${charge.discount_amount > 0 ? `
                <tr>
                    <th>할인금액</th>
                    <td>₩${charge.discount_amount.toLocaleString()} ${charge.discount_reason ? `(${charge.discount_reason})` : ''}</td>
                </tr>
                ` : ''}
            </table>
        </div>
        ` : ''}

        <div class="amount-section">
            <div class="amount-row">
                <span class="amount-label">수납금액</span>
                <span class="amount-value">₩${payment.amount.toLocaleString()}</span>
            </div>
        </div>

        ${payment.notes ? `
        <div class="section">
            <div class="section-title">비고</div>
            <p>${payment.notes}</p>
        </div>
        ` : ''}

        <div class="signature-section">
            <div class="signature-box">
                <div>위 금액을 정히 영수함</div>
                <div class="stamp-area">직인</div>
                <div class="signature-line">${academy.name}</div>
            </div>
            <div class="signature-box">
                <div>담당자</div>
                <div style="margin-top: 60px;"></div>
                <div class="signature-line">${payment.processor_name || '시스템'}</div>
            </div>
        </div>

        <div class="footer">
            <p>발행일: ${new Date().toLocaleDateString('ko-KR')}</p>
            <p>이 영수증은 ${academy.name}에서 발행한 정식 영수증입니다.</p>
        </div>
    </div>
</body>
</html>
            `;

            return html;
        } catch (error) {
            logger.error('영수증 HTML 생성 오류:', error);
            throw error;
        }
    }

    /**
     * 영수증 PDF 생성
     * @param {number} academyId 학원 ID
     * @param {number} paymentId 수납 ID
     * @returns {Promise<Buffer>} PDF 버퍼
     */
    async generateReceiptPDF(academyId, paymentId) {
        let browser = null;

        try {
            const html = await this.generateReceiptHTML(academyId, paymentId);

            // Puppeteer 브라우저 실행
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            // HTML 설정
            await page.setContent(html, {
                waitUntil: 'networkidle2'
            });

            // PDF 생성
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });

            logger.info(`영수증 PDF 생성 완료: Payment ID ${paymentId}`);
            return pdf;
        } catch (error) {
            logger.error('영수증 PDF 생성 오류:', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * 청구서 HTML 생성
     * @param {number} academyId 학원 ID
     * @param {Array} chargeIds 청구 ID 목록
     * @returns {Promise<string>} HTML 문자열
     */
    async generateInvoiceHTML(academyId, chargeIds) {
        try {
            // 청구 정보 조회
            const charges = [];
            for (const chargeId of chargeIds) {
                const charge = await StudentChargeModel.findById(academyId, chargeId);
                if (charge) {
                    charges.push(charge);
                }
            }

            if (charges.length === 0) {
                throw new Error('청구 정보를 찾을 수 없습니다.');
            }

            // 학생별로 그룹화
            const studentCharges = new Map();
            charges.forEach(charge => {
                if (!studentCharges.has(charge.student_id)) {
                    studentCharges.set(charge.student_id, {
                        student_name: charge.student_name,
                        charges: []
                    });
                }
                studentCharges.get(charge.student_id).charges.push(charge);
            });

            // 학원 정보 조회
            const [academyResult] = await db.execute(
                'SELECT * FROM academies WHERE id = ?',
                [academyId]
            );
            const academy = academyResult[0];

            // HTML 생성
            let htmlContent = '';

            for (const [studentId, data] of studentCharges) {
                const totalAmount = data.charges.reduce((sum, c) => sum + c.final_amount, 0);

                htmlContent += `
                    <div class="invoice-page">
                        <h1>청구서</h1>
                        <div class="invoice-header">
                            <div>${academy.name}</div>
                            <div>${new Date().toLocaleDateString('ko-KR')}</div>
                        </div>
                        <div class="student-info">
                            <h3>${data.student_name} 학생</h3>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>청구일</th>
                                    <th>항목</th>
                                    <th>금액</th>
                                    <th>할인</th>
                                    <th>최종금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.charges.map(c => `
                                    <tr>
                                        <td>${new Date(c.charge_date).toLocaleDateString('ko-KR')}</td>
                                        <td>${c.item_name || '수업료'}</td>
                                        <td>₩${c.amount.toLocaleString()}</td>
                                        <td>₩${c.discount_amount.toLocaleString()}</td>
                                        <td>₩${c.final_amount.toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <th colspan="4">총 청구금액</th>
                                    <th>₩${totalAmount.toLocaleString()}</th>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                `;
            }

            const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>청구서</title>
    <style>
        @page { size: A4; margin: 0; }
        body { font-family: 'Malgun Gothic', sans-serif; margin: 0; padding: 20mm; }
        .invoice-page { page-break-after: always; }
        .invoice-page:last-child { page-break-after: auto; }
        h1 { text-align: center; }
        .invoice-header { display: flex; justify-content: space-between; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; }
        tfoot th { text-align: right; font-size: 1.1em; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
            `;

            return html;
        } catch (error) {
            logger.error('청구서 HTML 생성 오류:', error);
            throw error;
        }
    }

    /**
     * 청구서 PDF 생성
     * @param {number} academyId 학원 ID
     * @param {Array} chargeIds 청구 ID 목록
     * @returns {Promise<Buffer>} PDF 버퍼
     */
    async generateInvoicePDF(academyId, chargeIds) {
        let browser = null;

        try {
            const html = await this.generateInvoiceHTML(academyId, chargeIds);

            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle2' });

            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
            });

            logger.info(`청구서 PDF 생성 완료: ${chargeIds.length}건`);
            return pdf;
        } catch (error) {
            logger.error('청구서 PDF 생성 오류:', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * 수납 방법 텍스트 변환
     */
    getPaymentMethodText(method) {
        const methodMap = {
            'cash': '현금',
            'card': '카드',
            'transfer': '계좌이체',
            'auto_transfer': '자동이체',
            'other': '기타'
        };
        return methodMap[method] || method;
    }

    /**
     * 영수증 파일 저장
     * @param {number} academyId 학원 ID
     * @param {number} paymentId 수납 ID
     * @returns {Promise<string>} 파일 경로
     */
    async saveReceiptToFile(academyId, paymentId) {
        try {
            const pdf = await this.generateReceiptPDF(academyId, paymentId);

            // 저장 디렉토리 생성
            const dir = path.join(__dirname, '..', '..', 'receipts', String(academyId));
            await fs.mkdir(dir, { recursive: true });

            // 파일명 생성
            const payment = await PaymentRecordModel.findById(academyId, paymentId);
            const fileName = `receipt_${payment.receipt_number}_${Date.now()}.pdf`;
            const filePath = path.join(dir, fileName);

            // 파일 저장
            await fs.writeFile(filePath, pdf);

            logger.info(`영수증 파일 저장: ${filePath}`);
            return filePath;
        } catch (error) {
            logger.error('영수증 파일 저장 오류:', error);
            throw error;
        }
    }
}

module.exports = new ReceiptService();