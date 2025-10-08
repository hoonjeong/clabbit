// 학습 자료 관리 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 상태 관리
    let materials = [];
    let selectedMaterial = null;
    let currentPage = 1;
    let totalPages = 1;
    let uploadQueue = [];
    let isUploading = false;

    // DOM 요소
    const materialsGrid = document.getElementById('materialsGrid');
    const materialsList = document.getElementById('materialsList');
    const viewToggle = document.querySelectorAll('.view-toggle');
    const uploadButton = document.getElementById('uploadMaterial');
    const fileInput = document.getElementById('fileInput');
    const uploadModal = document.getElementById('uploadModal');
    const uploadForm = document.getElementById('uploadForm');
    const searchInput = document.getElementById('searchMaterials');
    const typeFilter = document.getElementById('typeFilter');
    const classFilter = document.getElementById('classFilter');
    const sortBy = document.getElementById('sortBy');
    const dropZone = document.getElementById('dropZone');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    // 초기화
    init();

    function init() {
        setupEventListeners();
        loadFilters();
        loadMaterials();
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 뷰 토글
        viewToggle.forEach(btn => {
            btn.addEventListener('click', () => toggleView(btn.dataset.view));
        });

        // 업로드 버튼
        uploadButton.addEventListener('click', openUploadModal);

        // 파일 입력
        fileInput.addEventListener('change', handleFileSelect);

        // 업로드 폼
        uploadForm.addEventListener('submit', handleUploadSubmit);

        // 검색 및 필터
        searchInput.addEventListener('input', debounce(loadMaterials, 300));
        typeFilter.addEventListener('change', loadMaterials);
        classFilter.addEventListener('change', loadMaterials);
        sortBy.addEventListener('change', loadMaterials);

        // 드래그 앤 드롭
        setupDragAndDrop();

        // 모달 닫기
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // 페이지네이션
        document.getElementById('prevPage')?.addEventListener('click', () => changePage(currentPage - 1));
        document.getElementById('nextPage')?.addEventListener('click', () => changePage(currentPage + 1));

        // 일괄 선택
        document.getElementById('selectAll')?.addEventListener('change', handleSelectAll);

        // 일괄 작업
        document.getElementById('bulkDownload')?.addEventListener('click', handleBulkDownload);
        document.getElementById('bulkDelete')?.addEventListener('click', handleBulkDelete);
    }

    // 필터 로드
    async function loadFilters() {
        try {
            // 수업 목록
            const response = await fetch('/api/classes');
            const classes = await response.json();

            classFilter.innerHTML = '<option value="">전체 수업</option>';
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                classFilter.appendChild(option);
            });
        } catch (error) {
            console.error('필터 로드 실패:', error);
        }
    }

    // 자료 목록 로드
    async function loadMaterials(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                limit: 20,
                search: searchInput.value,
                type: typeFilter.value,
                class_id: classFilter.value,
                sort: sortBy.value
            });

            const response = await fetch(`/api/class-management/materials?${params}`);
            const data = await response.json();

            materials = data.materials;
            currentPage = data.currentPage;
            totalPages = data.totalPages;

            renderMaterials();
            updatePagination();
        } catch (error) {
            console.error('자료 로드 실패:', error);
            showToast('자료를 불러오는데 실패했습니다.', 'error');
        }
    }

    // 자료 렌더링
    function renderMaterials() {
        const currentView = document.querySelector('.view-toggle.active').dataset.view;

        if (currentView === 'grid') {
            renderGridView();
        } else {
            renderListView();
        }
    }

    // 그리드 뷰 렌더링
    function renderGridView() {
        materialsGrid.style.display = 'grid';
        materialsList.style.display = 'none';

        materialsGrid.innerHTML = '';

        materials.forEach(material => {
            const card = document.createElement('div');
            card.className = 'material-card';
            card.dataset.materialId = material.id;

            const thumbnail = getThumbnail(material);
            const fileIcon = getFileIcon(material.file_type);

            card.innerHTML = `
                <div class="material-thumbnail">
                    ${thumbnail ? `<img src="${thumbnail}" alt="${material.title}">` : fileIcon}
                </div>
                <div class="material-info">
                    <h4 class="material-title">${material.title}</h4>
                    <div class="material-meta">
                        <span class="material-type">${getFileTypeLabel(material.file_type)}</span>
                        <span class="material-size">${formatFileSize(material.file_size)}</span>
                    </div>
                    <div class="material-class">${material.class_name || '전체'}</div>
                    <div class="material-date">${formatDate(material.uploaded_at)}</div>
                </div>
                <div class="material-actions">
                    <button class="btn-icon" onclick="viewMaterial(${material.id})" title="보기">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="downloadMaterial(${material.id})" title="다운로드">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-icon" onclick="shareMaterial(${material.id})" title="공유">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteMaterial(${material.id})" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (!e.target.closest('.material-actions')) {
                    viewMaterial(material.id);
                }
            });

            materialsGrid.appendChild(card);
        });
    }

    // 리스트 뷰 렌더링
    function renderListView() {
        materialsGrid.style.display = 'none';
        materialsList.style.display = 'block';

        const tbody = materialsList.querySelector('tbody');
        tbody.innerHTML = '';

        materials.forEach(material => {
            const row = document.createElement('tr');
            row.dataset.materialId = material.id;

            row.innerHTML = `
                <td>
                    <input type="checkbox" class="material-checkbox" value="${material.id}">
                </td>
                <td>
                    <div class="material-name">
                        ${getFileIcon(material.file_type)}
                        <span>${material.title}</span>
                    </div>
                </td>
                <td>${getFileTypeLabel(material.file_type)}</td>
                <td>${formatFileSize(material.file_size)}</td>
                <td>${material.class_name || '전체'}</td>
                <td>${material.uploader_name}</td>
                <td>${formatDate(material.uploaded_at)}</td>
                <td>
                    <span class="download-count">
                        <i class="fas fa-download"></i> ${material.download_count || 0}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="viewMaterial(${material.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="downloadMaterial(${material.id})">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn-icon" onclick="shareMaterial(${material.id})">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteMaterial(${material.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    // 뷰 토글
    function toggleView(view) {
        viewToggle.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        renderMaterials();
    }

    // 드래그 앤 드롭 설정
    function setupDragAndDrop() {
        if (!dropZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        dropZone.addEventListener('drop', handleDrop, false);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('drag-over');
    }

    function unhighlight(e) {
        dropZone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // 파일 선택 처리
    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    // 파일 처리
    function handleFiles(files) {
        const fileArray = Array.from(files);

        // 파일 유효성 검사
        const validFiles = fileArray.filter(file => {
            if (file.size > 50 * 1024 * 1024) { // 50MB
                showToast(`${file.name}: 파일 크기는 50MB를 초과할 수 없습니다.`, 'error');
                return false;
            }
            return true;
        });

        // 업로드 큐에 추가
        validFiles.forEach(file => {
            uploadQueue.push(file);
            displayFilePreview(file);
        });
    }

    // 파일 미리보기 표시
    function displayFilePreview(file) {
        const previewContainer = document.getElementById('filePreviewContainer');
        if (!previewContainer) return;

        const preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.dataset.fileName = file.name;

        const fileType = getFileType(file);
        const icon = getFileIcon(fileType);

        preview.innerHTML = `
            <div class="preview-icon">${icon}</div>
            <div class="preview-info">
                <div class="preview-name">${file.name}</div>
                <div class="preview-size">${formatFileSize(file.size)}</div>
                <div class="preview-progress">
                    <div class="progress-bar-mini">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
            </div>
            <button class="preview-remove" onclick="removeFromQueue('${file.name}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        previewContainer.appendChild(preview);
    }

    // 업로드 모달 열기
    function openUploadModal() {
        uploadModal.style.display = 'block';
        uploadQueue = [];
        document.getElementById('filePreviewContainer').innerHTML = '';
    }

    // 모달 닫기
    function closeModal() {
        uploadModal.style.display = 'none';
        uploadQueue = [];
    }

    // 업로드 폼 제출
    async function handleUploadSubmit(e) {
        e.preventDefault();

        if (uploadQueue.length === 0) {
            showToast('업로드할 파일을 선택하세요.', 'warning');
            return;
        }

        isUploading = true;
        uploadProgress.style.display = 'block';

        const formData = new FormData(uploadForm);

        for (let i = 0; i < uploadQueue.length; i++) {
            const file = uploadQueue[i];
            await uploadFile(file, formData, i + 1, uploadQueue.length);
        }

        isUploading = false;
        uploadProgress.style.display = 'none';
        closeModal();
        loadMaterials();
        showToast('모든 파일이 업로드되었습니다.', 'success');
    }

    // 파일 업로드
    async function uploadFile(file, formData, current, total) {
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        fileFormData.append('title', formData.get('title') || file.name);
        fileFormData.append('description', formData.get('description'));
        fileFormData.append('class_id', formData.get('class_id'));

        try {
            progressText.textContent = `업로드 중... (${current}/${total})`;

            const xhr = new XMLHttpRequest();

            // 진행률 모니터링
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressBar.style.width = percentComplete + '%';

                    // 개별 파일 진행률 업데이트
                    const preview = document.querySelector(`[data-file-name="${file.name}"] .progress-fill`);
                    if (preview) {
                        preview.style.width = percentComplete + '%';
                    }
                }
            });

            // Promise로 래핑
            return new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };

                xhr.onerror = () => reject(new Error('Upload failed'));

                xhr.open('POST', '/api/class-management/materials');
                xhr.send(fileFormData);
            });
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            showToast(`${file.name} 업로드 실패`, 'error');
        }
    }

    // 자료 보기
    window.viewMaterial = async function(id) {
        const material = materials.find(m => m.id === id);
        if (!material) return;

        // 파일 타입에 따른 처리
        const fileType = material.file_type;

        if (fileType.startsWith('image/')) {
            showImageViewer(material);
        } else if (fileType === 'application/pdf') {
            showPDFViewer(material);
        } else if (fileType.startsWith('video/')) {
            showVideoPlayer(material);
        } else {
            // 다운로드
            downloadMaterial(id);
        }
    };

    // 이미지 뷰어 표시
    function showImageViewer(material) {
        const modal = document.createElement('div');
        modal.className = 'image-viewer-modal';
        modal.innerHTML = `
            <div class="viewer-content">
                <span class="close-viewer">&times;</span>
                <img src="${material.file_url}" alt="${material.title}">
                <div class="viewer-info">
                    <h3>${material.title}</h3>
                    <p>${material.description || ''}</p>
                </div>
            </div>
        `;

        modal.querySelector('.close-viewer').addEventListener('click', () => {
            modal.remove();
        });

        document.body.appendChild(modal);
    }

    // PDF 뷰어 표시
    function showPDFViewer(material) {
        const modal = document.createElement('div');
        modal.className = 'pdf-viewer-modal';
        modal.innerHTML = `
            <div class="viewer-content">
                <div class="viewer-header">
                    <h3>${material.title}</h3>
                    <span class="close-viewer">&times;</span>
                </div>
                <iframe src="${material.file_url}" width="100%" height="600"></iframe>
            </div>
        `;

        modal.querySelector('.close-viewer').addEventListener('click', () => {
            modal.remove();
        });

        document.body.appendChild(modal);
    }

    // 비디오 플레이어 표시
    function showVideoPlayer(material) {
        const modal = document.createElement('div');
        modal.className = 'video-player-modal';
        modal.innerHTML = `
            <div class="player-content">
                <span class="close-player">&times;</span>
                <video controls autoplay>
                    <source src="${material.file_url}" type="${material.file_type}">
                </video>
                <div class="player-info">
                    <h3>${material.title}</h3>
                    <p>${material.description || ''}</p>
                </div>
            </div>
        `;

        modal.querySelector('.close-player').addEventListener('click', () => {
            modal.remove();
        });

        document.body.appendChild(modal);
    }

    // 자료 다운로드
    window.downloadMaterial = async function(id) {
        try {
            // 다운로드 카운트 증가
            await fetch(`/api/class-management/materials/${id}/download`, {
                method: 'POST'
            });

            const material = materials.find(m => m.id === id);
            if (!material) return;

            // 다운로드 링크 생성
            const link = document.createElement('a');
            link.href = material.file_url;
            link.download = material.file_name;
            link.click();

            showToast('다운로드가 시작되었습니다.', 'success');
        } catch (error) {
            console.error('다운로드 실패:', error);
            showToast('다운로드에 실패했습니다.', 'error');
        }
    };

    // 자료 공유
    window.shareMaterial = async function(id) {
        const material = materials.find(m => m.id === id);
        if (!material) return;

        // 공유 링크 생성
        const shareUrl = `${window.location.origin}/shared/material/${id}`;

        // 클립보드에 복사
        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast('공유 링크가 클립보드에 복사되었습니다.', 'success');
        } catch (error) {
            // 대체 방법
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showToast('공유 링크가 클립보드에 복사되었습니다.', 'success');
        }
    };

    // 자료 삭제
    window.deleteMaterial = async function(id) {
        if (!confirm('이 자료를 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/class-management/materials/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('자료가 삭제되었습니다.', 'success');
                loadMaterials();
            }
        } catch (error) {
            console.error('삭제 실패:', error);
            showToast('삭제에 실패했습니다.', 'error');
        }
    };

    // 전체 선택
    function handleSelectAll(e) {
        const checkboxes = document.querySelectorAll('.material-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
    }

    // 일괄 다운로드
    async function handleBulkDownload() {
        const selected = getSelectedMaterials();
        if (selected.length === 0) {
            showToast('다운로드할 자료를 선택하세요.', 'warning');
            return;
        }

        for (const id of selected) {
            await downloadMaterial(id);
        }
    }

    // 일괄 삭제
    async function handleBulkDelete() {
        const selected = getSelectedMaterials();
        if (selected.length === 0) {
            showToast('삭제할 자료를 선택하세요.', 'warning');
            return;
        }

        if (!confirm(`선택한 ${selected.length}개의 자료를 삭제하시겠습니까?`)) return;

        try {
            const response = await fetch('/api/class-management/materials/bulk-delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: selected })
            });

            if (response.ok) {
                showToast('선택한 자료가 삭제되었습니다.', 'success');
                loadMaterials();
            }
        } catch (error) {
            console.error('일괄 삭제 실패:', error);
            showToast('삭제에 실패했습니다.', 'error');
        }
    }

    // 선택된 자료 ID 가져오기
    function getSelectedMaterials() {
        const checkboxes = document.querySelectorAll('.material-checkbox:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.value));
    }

    // 페이지 변경
    function changePage(page) {
        if (page < 1 || page > totalPages) return;
        loadMaterials(page);
    }

    // 페이지네이션 업데이트
    function updatePagination() {
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `${currentPage} / ${totalPages}`;
        }

        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    }

    // 헬퍼 함수들
    function getFileType(file) {
        return file.type || 'application/octet-stream';
    }

    function getFileIcon(fileType) {
        const icons = {
            'application/pdf': '<i class="fas fa-file-pdf text-danger"></i>',
            'application/msword': '<i class="fas fa-file-word text-primary"></i>',
            'application/vnd.ms-excel': '<i class="fas fa-file-excel text-success"></i>',
            'application/vnd.ms-powerpoint': '<i class="fas fa-file-powerpoint text-warning"></i>',
            'image': '<i class="fas fa-file-image text-info"></i>',
            'video': '<i class="fas fa-file-video text-purple"></i>',
            'audio': '<i class="fas fa-file-audio text-pink"></i>',
            'text': '<i class="fas fa-file-alt"></i>',
            'default': '<i class="fas fa-file"></i>'
        };

        if (fileType.startsWith('image/')) return icons.image;
        if (fileType.startsWith('video/')) return icons.video;
        if (fileType.startsWith('audio/')) return icons.audio;
        if (fileType.startsWith('text/')) return icons.text;

        return icons[fileType] || icons.default;
    }

    function getFileTypeLabel(fileType) {
        const labels = {
            'application/pdf': 'PDF',
            'application/msword': 'Word',
            'application/vnd.ms-excel': 'Excel',
            'application/vnd.ms-powerpoint': 'PowerPoint',
            'image': '이미지',
            'video': '동영상',
            'audio': '오디오',
            'text': '텍스트',
            'default': '파일'
        };

        if (fileType.startsWith('image/')) return labels.image;
        if (fileType.startsWith('video/')) return labels.video;
        if (fileType.startsWith('audio/')) return labels.audio;
        if (fileType.startsWith('text/')) return labels.text;

        return labels[fileType] || labels.default;
    }

    function getThumbnail(material) {
        if (material.file_type.startsWith('image/')) {
            return material.file_url;
        }
        if (material.file_type.startsWith('video/')) {
            return material.thumbnail_url;
        }
        return null;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR');
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 업로드 큐에서 제거
    window.removeFromQueue = function(fileName) {
        uploadQueue = uploadQueue.filter(file => file.name !== fileName);
        const preview = document.querySelector(`[data-file-name="${fileName}"]`);
        if (preview) preview.remove();
    };
});