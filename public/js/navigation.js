// 네비게이션 드롭다운 관리
document.addEventListener('DOMContentLoaded', function() {
    const menuDropdown = document.querySelector('.menu-dropdown');
    const menuButton = menuDropdown?.querySelector('.menu-item');
    const dropdownContent = menuDropdown?.querySelector('.dropdown-content');

    if (!menuDropdown || !menuButton || !dropdownContent) {
        return;
    }

    // 메뉴 버튼 클릭 시 드롭다운 토글
    menuButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        // 드롭다운 토글
        menuDropdown.classList.toggle('show');

        // 활성화 상태 토글
        this.classList.toggle('active');

        // ARIA 속성 업데이트
        const isExpanded = menuDropdown.classList.contains('show');
        this.setAttribute('aria-expanded', isExpanded);
    });

    // 문서 전체 클릭 시 드롭다운 닫기
    document.addEventListener('click', function(e) {
        // 메뉴 영역 외부 클릭 시에만 닫기
        if (!menuDropdown.contains(e.target)) {
            menuDropdown.classList.remove('show');
            menuButton.classList.remove('active');
            menuButton.setAttribute('aria-expanded', 'false');
        }
    });

    // 드롭다운 내부 링크 클릭 시 (페이지 이동)
    const dropdownItems = dropdownContent.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', function() {
            // 페이지 이동하므로 드롭다운은 자동으로 닫힘
            menuDropdown.classList.remove('show');
            menuButton.classList.remove('active');
        });
    });

    // 현재 페이지에 해당하는 드롭다운 항목 표시
    const currentPath = window.location.pathname;
    dropdownItems.forEach(item => {
        if (item.getAttribute('href') === currentPath) {
            item.classList.add('current');
            menuButton.classList.add('active');
        }
    });

    // ESC 키로 드롭다운 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && menuDropdown.classList.contains('show')) {
            menuDropdown.classList.remove('show');
            menuButton.classList.remove('active');
            menuButton.setAttribute('aria-expanded', 'false');
            menuButton.focus();
        }
    });
});
