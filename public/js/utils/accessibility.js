/**
 * 접근성 향상 유틸리티
 * ARIA 레이블, 키보드 네비게이션, 포커스 관리
 */

const AccessibilityUtils = {
    /**
     * 키보드 네비게이션 초기화
     */
    initKeyboardNavigation() {
        // 탭 키 네비게이션 표시
        let isTabbing = false;

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (!isTabbing) {
                    document.body.classList.add('keyboard-nav');
                    isTabbing = true;
                }
            }
        });

        document.addEventListener('mousedown', () => {
            if (isTabbing) {
                document.body.classList.remove('keyboard-nav');
                isTabbing = false;
            }
        });

        // ESC 키로 모달/드롭다운 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeActiveModals();
                this.closeActiveDropdowns();
            }
        });
    },

    /**
     * 포커스 트랩 설정 (모달 등에 사용)
     * @param {HTMLElement} element - 포커스를 가둘 요소
     */
    createFocusTrap(element) {
        const focusableElements = element.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        );

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // 첫 번째 요소에 포커스
        if (firstFocusable) {
            firstFocusable.focus();
        }

        // 탭 키 이벤트 핸들러
        const trapHandler = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstFocusable) {
                    lastFocusable.focus();
                    e.preventDefault();
                }
            } else {
                // Tab
                if (document.activeElement === lastFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        };

        element.addEventListener('keydown', trapHandler);

        // 클린업 함수 반환
        return () => {
            element.removeEventListener('keydown', trapHandler);
        };
    },

    /**
     * 스크린 리더용 알림 메시지
     * @param {string} message - 알림 메시지
     * @param {string} priority - 'polite' 또는 'assertive'
     */
    announceToScreenReader(message, priority = 'polite') {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', priority);
        announcement.className = 'sr-only';
        announcement.textContent = message;

        document.body.appendChild(announcement);

        // 메시지 제거
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    },

    /**
     * 드롭다운 메뉴 접근성 설정
     * @param {HTMLElement} trigger - 드롭다운 트리거 요소
     * @param {HTMLElement} menu - 드롭다운 메뉴 요소
     */
    setupDropdownAccessibility(trigger, menu) {
        const menuId = menu.id || `dropdown-menu-${Date.now()}`;
        menu.id = menuId;

        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-controls', menuId);

        // 키보드 이벤트
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleDropdown(trigger, menu);
            }

            if (e.key === 'ArrowDown' && trigger.getAttribute('aria-expanded') === 'true') {
                e.preventDefault();
                const firstItem = menu.querySelector('[role="menuitem"]');
                if (firstItem) firstItem.focus();
            }
        });

        // 메뉴 아이템 키보드 네비게이션
        const menuItems = menu.querySelectorAll('[role="menuitem"]');
        menuItems.forEach((item, index) => {
            item.setAttribute('tabindex', '-1');

            item.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextItem = menuItems[index + 1] || menuItems[0];
                    nextItem.focus();
                }

                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevItem = menuItems[index - 1] || menuItems[menuItems.length - 1];
                    prevItem.focus();
                }

                if (e.key === 'Escape') {
                    this.closeDropdown(trigger, menu);
                    trigger.focus();
                }

                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        });
    },

    /**
     * 드롭다운 토글
     */
    toggleDropdown(trigger, menu) {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';

        if (isOpen) {
            this.closeDropdown(trigger, menu);
        } else {
            this.openDropdown(trigger, menu);
        }
    },

    /**
     * 드롭다운 열기
     */
    openDropdown(trigger, menu) {
        trigger.setAttribute('aria-expanded', 'true');
        menu.style.display = 'block';
        menu.classList.add('is-open');
    },

    /**
     * 드롭다운 닫기
     */
    closeDropdown(trigger, menu) {
        trigger.setAttribute('aria-expanded', 'false');
        menu.style.display = 'none';
        menu.classList.remove('is-open');
    },

    /**
     * 모든 활성 드롭다운 닫기
     */
    closeActiveDropdowns() {
        const openDropdowns = document.querySelectorAll('[aria-expanded="true"]');
        openDropdowns.forEach(trigger => {
            const menuId = trigger.getAttribute('aria-controls');
            const menu = document.getElementById(menuId);
            if (menu) {
                this.closeDropdown(trigger, menu);
            }
        });
    },

    /**
     * 모달 접근성 설정
     * @param {HTMLElement} modal - 모달 요소
     */
    setupModalAccessibility(modal) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            const titleId = modalTitle.id || `modal-title-${Date.now()}`;
            modalTitle.id = titleId;
            modal.setAttribute('aria-labelledby', titleId);
        }

        const modalDescription = modal.querySelector('.modal-description');
        if (modalDescription) {
            const descId = modalDescription.id || `modal-desc-${Date.now()}`;
            modalDescription.id = descId;
            modal.setAttribute('aria-describedby', descId);
        }
    },

    /**
     * 모든 활성 모달 닫기
     */
    closeActiveModals() {
        const openModals = document.querySelectorAll('.modal.is-active');
        openModals.forEach(modal => {
            modal.classList.remove('is-active');
            modal.setAttribute('aria-hidden', 'true');

            // 포커스를 원래 트리거로 되돌리기
            const trigger = modal.dataset.trigger;
            if (trigger) {
                const triggerElement = document.querySelector(trigger);
                if (triggerElement) {
                    triggerElement.focus();
                }
            }
        });
    },

    /**
     * 폼 유효성 검사 메시지 접근성
     * @param {HTMLElement} input - 입력 필드
     * @param {string} message - 오류 메시지
     * @param {boolean} isValid - 유효성 상태
     */
    setFormFieldValidity(input, message, isValid = false) {
        const errorId = `error-${input.id || input.name}`;
        let errorElement = document.getElementById(errorId);

        if (!isValid && message) {
            // 오류 메시지 생성 또는 업데이트
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.id = errorId;
                errorElement.className = 'form-error';
                errorElement.setAttribute('role', 'alert');
                errorElement.setAttribute('aria-live', 'polite');
                input.parentNode.appendChild(errorElement);
            }

            errorElement.textContent = message;
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', errorId);
            input.classList.add('is-invalid');
        } else {
            // 오류 메시지 제거
            if (errorElement) {
                errorElement.remove();
            }
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
            input.classList.remove('is-invalid');
        }
    },

    /**
     * 탭 패널 접근성 설정
     * @param {HTMLElement} tabContainer - 탭 컨테이너
     */
    setupTabAccessibility(tabContainer) {
        const tabList = tabContainer.querySelector('[role="tablist"]');
        const tabs = tabList.querySelectorAll('[role="tab"]');
        const panels = tabContainer.querySelectorAll('[role="tabpanel"]');

        // 초기 상태 설정
        tabs.forEach((tab, index) => {
            const panelId = `tabpanel-${index}`;
            const panel = panels[index];

            tab.setAttribute('aria-controls', panelId);
            tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
            tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');

            panel.id = panelId;
            panel.setAttribute('aria-labelledby', tab.id);
            panel.hidden = index !== 0;
        });

        // 키보드 네비게이션
        tabList.addEventListener('keydown', (e) => {
            const currentTab = document.activeElement;
            const currentIndex = Array.from(tabs).indexOf(currentTab);

            let newIndex;

            if (e.key === 'ArrowRight') {
                newIndex = (currentIndex + 1) % tabs.length;
            } else if (e.key === 'ArrowLeft') {
                newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            } else if (e.key === 'Home') {
                newIndex = 0;
            } else if (e.key === 'End') {
                newIndex = tabs.length - 1;
            } else {
                return;
            }

            e.preventDefault();
            this.activateTab(tabs[newIndex], tabs, panels);
        });

        // 클릭 이벤트
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.activateTab(tab, tabs, panels);
            });
        });
    },

    /**
     * 탭 활성화
     */
    activateTab(activeTab, allTabs, allPanels) {
        // 모든 탭 비활성화
        allTabs.forEach((tab, index) => {
            tab.setAttribute('tabindex', '-1');
            tab.setAttribute('aria-selected', 'false');
            allPanels[index].hidden = true;
        });

        // 선택된 탭 활성화
        const activeIndex = Array.from(allTabs).indexOf(activeTab);
        activeTab.setAttribute('tabindex', '0');
        activeTab.setAttribute('aria-selected', 'true');
        activeTab.focus();
        allPanels[activeIndex].hidden = false;
    },

    /**
     * 스킵 링크 생성
     */
    createSkipLinks() {
        const skipNav = document.createElement('div');
        skipNav.className = 'skip-links';
        skipNav.innerHTML = `
            <a href="#main-content" class="skip-link">본문 바로가기</a>
            <a href="#main-navigation" class="skip-link">주 메뉴 바로가기</a>
            <a href="#search" class="skip-link">검색 바로가기</a>
        `;

        document.body.insertBefore(skipNav, document.body.firstChild);
    },

    /**
     * 초기화
     */
    init() {
        this.initKeyboardNavigation();
        this.createSkipLinks();

        // 드롭다운 메뉴 접근성 설정
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            if (trigger && menu) {
                this.setupDropdownAccessibility(trigger, menu);
            }
        });

        // 모달 접근성 설정
        document.querySelectorAll('.modal').forEach(modal => {
            this.setupModalAccessibility(modal);
        });

        // 탭 접근성 설정
        document.querySelectorAll('.tabs-container').forEach(container => {
            this.setupTabAccessibility(container);
        });
    }
};

// DOM 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    AccessibilityUtils.init();
});

// 전역으로 내보내기
window.AccessibilityUtils = AccessibilityUtils;