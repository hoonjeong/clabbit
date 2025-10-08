/**
 * 랜딩 페이지 JavaScript
 * 클래빗 학원관리 시스템
 */

document.addEventListener('DOMContentLoaded', () => {
  // ===========================
  // 모바일 메뉴 토글
  // ===========================
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const headerNav = document.getElementById('headerNav');

  if (mobileMenuBtn && headerNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenuBtn.classList.toggle('active');
      headerNav.classList.toggle('active');
    });

    // 메뉴 링크 클릭 시 메뉴 닫기
    const navLinks = headerNav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuBtn.classList.remove('active');
        headerNav.classList.remove('active');
      });
    });

    // 외부 클릭 시 메뉴 닫기
    document.addEventListener('click', (e) => {
      if (!mobileMenuBtn.contains(e.target) && !headerNav.contains(e.target)) {
        mobileMenuBtn.classList.remove('active');
        headerNav.classList.remove('active');
      }
    });
  }

  // ===========================
  // FAQ 아코디언
  // ===========================
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    if (question) {
      question.addEventListener('click', () => {
        // 다른 열린 FAQ 닫기
        faqItems.forEach(otherItem => {
          if (otherItem !== item && otherItem.classList.contains('active')) {
            otherItem.classList.remove('active');
          }
        });

        // 현재 FAQ 토글
        item.classList.toggle('active');
      });
    }
  });

  // ===========================
  // 부드러운 스크롤
  // ===========================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');

      // # 만 있는 경우 무시
      if (href === '#' || href === '#demo') {
        e.preventDefault();
        return;
      }

      const target = document.querySelector(href);

      if (target) {
        e.preventDefault();

        // 헤더 높이 고려
        const headerHeight = document.querySelector('.landing-header').offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // 모바일 메뉴 닫기
        if (mobileMenuBtn && headerNav) {
          mobileMenuBtn.classList.remove('active');
          headerNav.classList.remove('active');
        }
      }
    });
  });

  // ===========================
  // 스크롤 시 헤더 그림자 추가
  // ===========================
  const header = document.querySelector('.landing-header');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    } else {
      header.style.boxShadow = 'none';
    }
  });

  // ===========================
  // 스크롤 애니메이션 (선택사항)
  // ===========================
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // 애니메이션 대상 요소들
  const animatedElements = document.querySelectorAll('.feature-card, .premium-card, .pricing-card');

  animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
});
