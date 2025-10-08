/**
 * 성능 최적화 유틸리티
 * 지연 로딩, 이미지 최적화, 인피니트 스크롤
 */

const PerformanceUtils = {
    /**
     * Intersection Observer 인스턴스
     */
    observers: {
        lazyLoad: null,
        infiniteScroll: null,
        fadeIn: null
    },

    /**
     * 이미지 지연 로딩 초기화
     */
    initLazyLoading() {
        // 지연 로딩할 이미지 선택
        const lazyImages = document.querySelectorAll('img[data-src], img.lazy');

        if ('IntersectionObserver' in window) {
            // Intersection Observer 생성
            this.observers.lazyLoad = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        this.loadImage(img);
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px', // 50px 전에 미리 로드
                threshold: 0.01
            });

            // 이미지 관찰 시작
            lazyImages.forEach(img => {
                this.observers.lazyLoad.observe(img);
            });
        } else {
            // Fallback: 모든 이미지 즉시 로드
            lazyImages.forEach(img => this.loadImage(img));
        }
    },

    /**
     * 이미지 로드
     * @param {HTMLImageElement} img - 이미지 요소
     */
    loadImage(img) {
        const src = img.dataset.src || img.getAttribute('data-src');
        const srcset = img.dataset.srcset;

        if (src) {
            // 로딩 상태 표시
            img.classList.add('loading');

            // 이미지 프리로드
            const tempImg = new Image();

            tempImg.onload = () => {
                img.src = src;
                if (srcset) {
                    img.srcset = srcset;
                }
                img.classList.remove('loading', 'lazy');
                img.classList.add('loaded');

                // 페이드 인 효과
                this.fadeIn(img);

                // data 속성 제거
                delete img.dataset.src;
                delete img.dataset.srcset;
            };

            tempImg.onerror = () => {
                img.classList.remove('loading');
                img.classList.add('error');

                // 대체 이미지 설정
                if (img.dataset.placeholder) {
                    img.src = img.dataset.placeholder;
                }
            };

            tempImg.src = src;
        }
    },

    /**
     * 페이드 인 애니메이션
     * @param {HTMLElement} element - 요소
     */
    fadeIn(element) {
        element.style.opacity = '0';
        element.style.transition = 'opacity 0.3s ease-in-out';

        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });
    },

    /**
     * 인피니트 스크롤 초기화
     * @param {Object} options - 옵션
     */
    initInfiniteScroll(options = {}) {
        const {
            container = '.infinite-scroll-container',
            loader = '.infinite-scroll-loader',
            threshold = 0.8,
            onLoadMore = () => {}
        } = options;

        const scrollContainer = document.querySelector(container);
        const scrollLoader = document.querySelector(loader);

        if (!scrollContainer || !scrollLoader) return;

        this.observers.infiniteScroll = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !scrollLoader.classList.contains('loading')) {
                    scrollLoader.classList.add('loading');
                    onLoadMore(() => {
                        scrollLoader.classList.remove('loading');
                    });
                }
            });
        }, {
            root: scrollContainer.parentElement,
            rootMargin: '100px',
            threshold: threshold
        });

        this.observers.infiniteScroll.observe(scrollLoader);
    },

    /**
     * 디바운스 함수
     * @param {Function} func - 실행할 함수
     * @param {number} wait - 대기 시간 (ms)
     * @returns {Function} 디바운스된 함수
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 쓰로틀 함수
     * @param {Function} func - 실행할 함수
     * @param {number} limit - 제한 시간 (ms)
     * @returns {Function} 쓰로틀된 함수
     */
    throttle(func, limit = 100) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 리소스 프리페치
     * @param {string[]} urls - 프리페치할 URL 목록
     */
    prefetchResources(urls) {
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
        });
    },

    /**
     * 중요 CSS 인라인 처리
     * @param {string} css - 인라인할 CSS
     */
    inlineCriticalCSS(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.insertBefore(style, document.head.firstChild);
    },

    /**
     * 웹 폰트 최적화
     */
    optimizeWebFonts() {
        // 폰트 프리로드
        const fontLinks = [
            '/fonts/Pretendard-Regular.woff2',
            '/fonts/Pretendard-Bold.woff2'
        ];

        fontLinks.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'font';
            link.type = 'font/woff2';
            link.href = href;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });

        // 폰트 디스플레이 스왑 설정
        const fontFaceStyle = `
            @font-face {
                font-family: 'Pretendard';
                font-display: swap;
            }
        `;
        this.inlineCriticalCSS(fontFaceStyle);
    },

    /**
     * 이미지 포맷 최적화
     * @param {string} src - 원본 이미지 경로
     * @returns {Object} 최적화된 이미지 소스
     */
    getOptimizedImageSources(src) {
        const baseName = src.substring(0, src.lastIndexOf('.'));
        const extension = src.substring(src.lastIndexOf('.'));

        return {
            webp: `${baseName}.webp`,
            avif: `${baseName}.avif`,
            original: src,
            srcset: `
                ${baseName}-320w${extension} 320w,
                ${baseName}-640w${extension} 640w,
                ${baseName}-1024w${extension} 1024w,
                ${baseName}-1920w${extension} 1920w
            `
        };
    },

    /**
     * Virtual Scrolling 구현
     * @param {Object} options - 옵션
     */
    initVirtualScroll(options = {}) {
        const {
            container = '.virtual-scroll-container',
            itemHeight = 50,
            items = [],
            renderItem = () => {}
        } = options;

        const scrollContainer = document.querySelector(container);
        if (!scrollContainer) return;

        const viewportHeight = scrollContainer.clientHeight;
        const totalHeight = items.length * itemHeight;
        const visibleCount = Math.ceil(viewportHeight / itemHeight);
        const bufferCount = 5;

        // 가상 스크롤 컨테이너 생성
        const virtualContainer = document.createElement('div');
        virtualContainer.style.height = `${totalHeight}px`;
        virtualContainer.style.position = 'relative';

        // 스크롤 이벤트 핸들러
        const handleScroll = this.throttle(() => {
            const scrollTop = scrollContainer.scrollTop;
            const startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.min(
                startIndex + visibleCount + bufferCount,
                items.length
            );

            // 보이는 아이템만 렌더링
            virtualContainer.innerHTML = '';
            for (let i = startIndex; i < endIndex; i++) {
                const itemEl = renderItem(items[i], i);
                itemEl.style.position = 'absolute';
                itemEl.style.top = `${i * itemHeight}px`;
                itemEl.style.height = `${itemHeight}px`;
                virtualContainer.appendChild(itemEl);
            }
        }, 100);

        scrollContainer.addEventListener('scroll', handleScroll);
        scrollContainer.appendChild(virtualContainer);

        // 초기 렌더링
        handleScroll();
    },

    /**
     * 리소스 힌트 추가
     */
    addResourceHints() {
        // DNS 프리페치
        const dnsPrefetch = [
            '//fonts.googleapis.com',
            '//fonts.gstatic.com',
            '//cdn.jsdelivr.net'
        ];

        dnsPrefetch.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'dns-prefetch';
            link.href = href;
            document.head.appendChild(link);
        });

        // 프리커넥트
        const preconnect = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com'
        ];

        preconnect.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = href;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    },

    /**
     * 메모리 누수 방지를 위한 정리
     */
    cleanup() {
        // Observer 정리
        Object.values(this.observers).forEach(observer => {
            if (observer) {
                observer.disconnect();
            }
        });

        // 이벤트 리스너 정리
        window.removeEventListener('scroll', this.handleScroll);
    },

    /**
     * 성능 측정
     */
    measurePerformance() {
        if ('performance' in window) {
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            const connectTime = perfData.responseEnd - perfData.requestStart;
            const renderTime = perfData.domComplete - perfData.domLoading;

            console.log('Performance Metrics:');
            console.log(`Page Load Time: ${pageLoadTime}ms`);
            console.log(`Connect Time: ${connectTime}ms`);
            console.log(`Render Time: ${renderTime}ms`);

            // Core Web Vitals
            if ('PerformanceObserver' in window) {
                // LCP (Largest Contentful Paint)
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    console.log(`LCP: ${lastEntry.renderTime || lastEntry.loadTime}ms`);
                }).observe({ entryTypes: ['largest-contentful-paint'] });

                // FID (First Input Delay)
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        console.log(`FID: ${entry.processingStart - entry.startTime}ms`);
                    });
                }).observe({ entryTypes: ['first-input'] });

                // CLS (Cumulative Layout Shift)
                let clsScore = 0;
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsScore += entry.value;
                            console.log(`CLS: ${clsScore}`);
                        }
                    }
                }).observe({ entryTypes: ['layout-shift'] });
            }
        }
    },

    /**
     * 초기화
     */
    init() {
        // 지연 로딩 초기화
        this.initLazyLoading();

        // 리소스 힌트 추가
        this.addResourceHints();

        // 웹 폰트 최적화
        this.optimizeWebFonts();

        // 성능 측정 (개발 모드)
        if (window.location.hostname === 'localhost') {
            window.addEventListener('load', () => {
                this.measurePerformance();
            });
        }

        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
};

// DOM 로드 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PerformanceUtils.init();
    });
} else {
    PerformanceUtils.init();
}

// 전역으로 내보내기
window.PerformanceUtils = PerformanceUtils;