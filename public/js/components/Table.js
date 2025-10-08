/**
 * 재사용 가능한 테이블 컴포넌트
 * 정렬, 페이지네이션 기능 포함
 */

class Table {
    constructor(options = {}) {
        this.container = options.container;
        this.columns = options.columns || [];
        this.data = options.data || [];
        this.onSort = options.onSort || null;
        this.onRowClick = options.onRowClick || null;
        this.emptyMessage = options.emptyMessage || '데이터가 없습니다.';
        this.emptyIcon = options.emptyIcon || '📄';

        this.sortColumn = null;
        this.sortOrder = 'asc';
    }

    /**
     * 테이블 렌더링
     */
    render() {
        if (!this.container) return;

        if (this.data.length === 0) {
            this.renderEmpty();
            return;
        }

        const tableHTML = `
            <table class="data-table" style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f8f9fa; border-bottom: 2px solid #e0e0e0;">
                    <tr>
                        ${this.renderHeader()}
                    </tr>
                </thead>
                <tbody>
                    ${this.renderBody()}
                </tbody>
            </table>
        `;

        this.container.innerHTML = tableHTML;
        this.bindEvents();
    }

    /**
     * 테이블 헤더 렌더링
     */
    renderHeader() {
        return this.columns.map(column => {
            const sortable = column.sortable ? 'sortable' : '';
            const sortIcon = column.sortable ? '<span class="sort-icon">⇅</span>' : '';
            const align = column.align || 'left';

            return `
                <th
                    class="${sortable}"
                    data-column="${column.key}"
                    style="padding: 16px; text-align: ${align}; font-weight: 600; ${column.sortable ? 'cursor: pointer;' : ''}"
                >
                    ${column.label} ${sortIcon}
                </th>
            `;
        }).join('');
    }

    /**
     * 테이블 바디 렌더링
     */
    renderBody() {
        return this.data.map((row, index) => {
            const clickable = this.onRowClick ? 'style="cursor: pointer;"' : '';

            return `
                <tr data-row-index="${index}" ${clickable} style="border-bottom: 1px solid #f0f0f0;">
                    ${this.renderRow(row)}
                </tr>
            `;
        }).join('');
    }

    /**
     * 테이블 행 렌더링
     */
    renderRow(row) {
        return this.columns.map(column => {
            const value = column.render
                ? column.render(row[column.key], row)
                : row[column.key] || '-';
            const align = column.align || 'left';

            return `
                <td style="padding: 16px; text-align: ${align};">
                    ${value}
                </td>
            `;
        }).join('');
    }

    /**
     * 빈 테이블 렌더링
     */
    renderEmpty() {
        this.container.innerHTML = `
            <div style="padding: 60px; text-align: center; color: #999;">
                <div style="font-size: 48px; margin-bottom: 16px;">${this.emptyIcon}</div>
                <p style="font-size: 16px;">${this.emptyMessage}</p>
            </div>
        `;
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 정렬 이벤트
        const sortableHeaders = this.container.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this.handleSort(column);
            });
        });

        // 행 클릭 이벤트
        if (this.onRowClick) {
            const rows = this.container.querySelectorAll('tbody tr');
            rows.forEach(row => {
                row.addEventListener('click', () => {
                    const index = parseInt(row.dataset.rowIndex);
                    this.onRowClick(this.data[index], index);
                });
            });
        }
    }

    /**
     * 정렬 처리
     */
    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortOrder = 'asc';
        }

        if (this.onSort) {
            this.onSort(column, this.sortOrder);
        }
    }

    /**
     * 데이터 업데이트
     */
    setData(data) {
        this.data = data;
        this.render();
    }

    /**
     * 데이터 추가
     */
    addRow(row) {
        this.data.push(row);
        this.render();
    }

    /**
     * 데이터 삭제
     */
    removeRow(index) {
        this.data.splice(index, 1);
        this.render();
    }

    /**
     * 테이블 초기화
     */
    clear() {
        this.data = [];
        this.render();
    }
}

// 전역으로 노출
window.Table = Table;
