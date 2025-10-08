/**
 * 재사용 가능한 모달 컴포넌트
 * 폼, 확인 다이얼로그 등에 사용
 */

class Modal {
    constructor(options = {}) {
        this.id = options.id || `modal-${Date.now()}`;
        this.title = options.title || '';
        this.content = options.content || '';
        this.onClose = options.onClose || null;
        this.closeOnBackdropClick = options.closeOnBackdropClick !== false;

        this.element = null;
        this.isOpen = false;
    }

    /**
     * 모달 HTML 생성
     */
    render() {
        const modalHTML = `
            <div id="${this.id}" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
                <div class="form-modal-container">
                    <div class="form-modal-header">
                        <h2 class="form-modal-title">${this.title}</h2>
                        <button type="button" class="form-modal-close" data-modal-close>&times;</button>
                    </div>
                    <div class="form-modal-body">
                        ${this.content}
                    </div>
                </div>
            </div>
        `;

        // DOM에 추가
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML.trim();
        this.element = tempDiv.firstChild;
        document.body.appendChild(this.element);

        this.bindEvents();
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 닫기 버튼
        const closeBtn = this.element.querySelector('[data-modal-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // 백드롭 클릭
        if (this.closeOnBackdropClick) {
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) {
                    this.close();
                }
            });
        }

        // ESC 키
        this.escHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escHandler);
    }

    /**
     * 모달 열기
     */
    open() {
        if (!this.element) {
            this.render();
        }

        this.element.style.display = 'flex';
        this.isOpen = true;
        document.body.style.overflow = 'hidden'; // 스크롤 방지
    }

    /**
     * 모달 닫기
     */
    close() {
        if (this.element) {
            this.element.style.display = 'none';
            this.isOpen = false;
            document.body.style.overflow = ''; // 스크롤 복원

            if (this.onClose) {
                this.onClose();
            }
        }
    }

    /**
     * 모달 제거
     */
    destroy() {
        if (this.element) {
            this.element.remove();
            document.removeEventListener('keydown', this.escHandler);
            this.element = null;
        }
    }

    /**
     * 모달 내용 업데이트
     */
    setContent(content) {
        if (this.element) {
            const body = this.element.querySelector('.form-modal-body');
            if (body) {
                body.innerHTML = content;
            }
        }
    }

    /**
     * 모달 제목 업데이트
     */
    setTitle(title) {
        if (this.element) {
            const titleEl = this.element.querySelector('.form-modal-title');
            if (titleEl) {
                titleEl.textContent = title;
            }
        }
    }

    /**
     * 확인 다이얼로그 (정적 메서드)
     */
    static confirm(message, title = '확인') {
        return new Promise((resolve) => {
            const content = `
                <p style="margin-bottom: 24px; font-size: 14px; color: #333;">${message}</p>
                <div class="form-btn-group form-btn-group-end">
                    <button type="button" class="form-btn form-btn-secondary" data-confirm-cancel>취소</button>
                    <button type="button" class="form-btn form-btn-primary" data-confirm-ok>확인</button>
                </div>
            `;

            const modal = new Modal({
                title,
                content,
                closeOnBackdropClick: false
            });

            modal.render();
            modal.open();

            const okBtn = modal.element.querySelector('[data-confirm-ok]');
            const cancelBtn = modal.element.querySelector('[data-confirm-cancel]');

            okBtn.addEventListener('click', () => {
                modal.destroy();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                modal.destroy();
                resolve(false);
            });
        });
    }

    /**
     * 알림 다이얼로그 (정적 메서드)
     */
    static alert(message, title = '알림') {
        return new Promise((resolve) => {
            const content = `
                <p style="margin-bottom: 24px; font-size: 14px; color: #333;">${message}</p>
                <div class="form-btn-group form-btn-group-end">
                    <button type="button" class="form-btn form-btn-primary" data-alert-ok>확인</button>
                </div>
            `;

            const modal = new Modal({
                title,
                content,
                closeOnBackdropClick: false
            });

            modal.render();
            modal.open();

            const okBtn = modal.element.querySelector('[data-alert-ok]');
            okBtn.addEventListener('click', () => {
                modal.destroy();
                resolve();
            });
        });
    }
}

// 전역으로 노출
window.Modal = Modal;
