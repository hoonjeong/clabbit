// 엑셀 일괄 등록 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    let uploadedData = [];
    let validData = [];
    let invalidData = [];

    const fileInput = document.getElementById('fileInput');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const selectedFile = document.getElementById('selectedFile');
    const fileName = document.getElementById('fileName');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const previewSection = document.getElementById('previewSection');
    const submitSection = document.getElementById('submitSection');
    const resultSection = document.getElementById('resultSection');
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');

    // 템플릿 다운로드
    downloadTemplateBtn.addEventListener('click', function() {
        // 템플릿 데이터 생성
        const template = [
            ['이름*', '생년월일*(YYYY-MM-DD)', '학교', '학년', '학생 전화번호', '학부모 전화번호*', '주소', '메모'],
            ['홍길동', '2010-03-15', '서울초등학교', '초등 5학년', '010-1234-5678', '010-9876-5432', '서울시 강남구', ''],
            ['김철수', '2012-07-20', '부산중학교', '중학교 2학년', '', '010-5555-6666', '부산시 해운대구', '수학 특기'],
        ];

        // CSV 형식으로 변환
        const csvContent = template.map(row => row.join(',')).join('\n');
        const BOM = '\uFEFF'; // UTF-8 BOM for Excel
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', '학생_일괄등록_템플릿.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert('템플릿이 다운로드되었습니다.\nExcel에서 열어 정보를 입력해주세요.');
    });

    // 파일 선택 버튼
    selectFileBtn.addEventListener('click', function() {
        fileInput.click();
    });

    // 파일 업로드 영역 클릭
    fileUploadArea.addEventListener('click', function(e) {
        if (e.target === fileUploadArea || e.target.classList.contains('upload-text') || e.target.classList.contains('upload-hint')) {
            fileInput.click();
        }
    });

    // 드래그 앤 드롭
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        fileUploadArea.classList.add('drag-over');
    });

    fileUploadArea.addEventListener('dragleave', function() {
        fileUploadArea.classList.remove('drag-over');
    });

    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        fileUploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // 파일 선택
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });

    // 파일 제거
    removeFileBtn.addEventListener('click', function() {
        resetUpload();
    });

    // 파일 선택 처리
    function handleFileSelect(file) {
        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('파일 크기는 5MB를 초과할 수 없습니다.');
            return;
        }

        // 파일 확장자 체크
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(ext)) {
            alert('엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.');
            return;
        }

        fileName.textContent = file.name;
        selectedFile.style.display = 'flex';
        fileUploadArea.style.display = 'none';

        // CSV 파일 읽기
        if (ext === 'csv') {
            readCSVFile(file);
        } else {
            alert('현재는 CSV 파일만 지원합니다. 엑셀 파일(.xlsx)은 CSV로 저장한 후 업로드해주세요.');
            resetUpload();
        }
    }

    // CSV 파일 읽기
    function readCSVFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            parseCSV(text);
        };
        reader.readAsText(file, 'UTF-8');
    }

    // CSV 파싱
    function parseCSV(text) {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        uploadedData = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const student = {
                name: values[0] || '',
                birth_date: values[1] || '',
                school: values[2] || '',
                grade: values[3] || '',
                student_phone: values[4] || '',
                parent_phone: values[5] || '',
                address: values[6] || '',
                memo: values[7] || ''
            };

            uploadedData.push(student);
        }

        validateData();
        displayPreview();
    }

    // 데이터 유효성 검사
    function validateData() {
        validData = [];
        invalidData = [];

        uploadedData.forEach((student, index) => {
            const errors = [];

            // 필수 필드 검증
            if (!student.name || student.name.trim() === '') {
                errors.push('이름 필수');
            }

            if (!student.birth_date) {
                errors.push('생년월일 필수');
            } else if (!/^\d{4}-\d{2}-\d{2}$/.test(student.birth_date)) {
                errors.push('생년월일 형식 오류');
            }

            if (!student.parent_phone || student.parent_phone.trim() === '') {
                errors.push('학부모 전화번호 필수');
            } else if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(student.parent_phone)) {
                errors.push('학부모 전화번호 형식 오류');
            }

            // 학생 전화번호 (선택)
            if (student.student_phone && student.student_phone.trim() !== '') {
                if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(student.student_phone)) {
                    errors.push('학생 전화번호 형식 오류');
                }
            }

            if (errors.length === 0) {
                validData.push({ ...student, index });
            } else {
                invalidData.push({ ...student, index, errors: errors.join(', ') });
            }
        });
    }

    // 미리보기 표시
    function displayPreview() {
        const tableBody = document.getElementById('previewTableBody');
        document.getElementById('totalRows').textContent = uploadedData.length;
        document.getElementById('validCount').textContent = validData.length;
        document.getElementById('errorCount').textContent = invalidData.length;

        let html = '';

        // 유효한 데이터
        validData.forEach(student => {
            html += `
                <tr class="valid-row">
                    <td><span class="status-badge status-valid">✅</span></td>
                    <td>${student.name}</td>
                    <td>${student.birth_date}</td>
                    <td>${student.school || '-'}</td>
                    <td>${student.grade || '-'}</td>
                    <td>${student.student_phone || '-'}</td>
                    <td>${student.parent_phone}</td>
                    <td>${student.address || '-'}</td>
                    <td>${student.memo || '-'}</td>
                    <td>-</td>
                </tr>
            `;
        });

        // 오류 데이터
        invalidData.forEach(student => {
            html += `
                <tr class="invalid-row">
                    <td><span class="status-badge status-invalid">❌</span></td>
                    <td>${student.name || '-'}</td>
                    <td>${student.birth_date || '-'}</td>
                    <td>${student.school || '-'}</td>
                    <td>${student.grade || '-'}</td>
                    <td>${student.student_phone || '-'}</td>
                    <td>${student.parent_phone || '-'}</td>
                    <td>${student.address || '-'}</td>
                    <td>${student.memo || '-'}</td>
                    <td class="error-cell">${student.errors}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
        previewSection.style.display = 'block';
        submitSection.style.display = validData.length > 0 ? 'flex' : 'none';
    }

    // 업로드 초기화
    function resetUpload() {
        fileInput.value = '';
        selectedFile.style.display = 'none';
        fileUploadArea.style.display = 'flex';
        previewSection.style.display = 'none';
        submitSection.style.display = 'none';
        resultSection.style.display = 'none';
        uploadedData = [];
        validData = [];
        invalidData = [];
    }

    // 일괄 등록
    document.getElementById('submitBtn').addEventListener('click', async function() {
        if (validData.length === 0) {
            alert('등록할 유효한 데이터가 없습니다.');
            return;
        }

        if (!confirm(`총 ${validData.length}명의 학생을 등록하시겠습니까?`)) {
            return;
        }

        const submitBtn = this;
        const submitBtnText = document.getElementById('submitBtnText');
        submitBtn.disabled = true;
        submitBtnText.textContent = '등록 중...';

        let successCount = 0;
        let failureCount = 0;
        const failedStudents = [];

        for (const student of validData) {
            try {
                const response = await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(student)
                });

                const result = await response.json();

                if (result.success) {
                    successCount++;
                } else {
                    failureCount++;
                    failedStudents.push({ name: student.name, error: result.error || result.message || '등록 실패' });
                }
            } catch (error) {
                failureCount++;
                failedStudents.push({ name: student.name, error: '서버 오류' });
            }
        }

        displayResult(successCount, failureCount, failedStudents);

        submitBtn.disabled = false;
        submitBtnText.textContent = '일괄 등록';
    });

    // 결과 표시
    function displayResult(successCount, failureCount, failedStudents) {
        document.getElementById('successCount').textContent = successCount;
        document.getElementById('failureCount').textContent = failureCount;

        let detailsHtml = '';
        if (failedStudents.length > 0) {
            detailsHtml = '<div class="failure-details"><h4>실패 상세</h4><ul>';
            failedStudents.forEach(student => {
                detailsHtml += `<li><strong>${student.name}</strong>: ${student.error}</li>`;
            });
            detailsHtml += '</ul></div>';
        }

        document.getElementById('resultDetails').innerHTML = detailsHtml;

        previewSection.style.display = 'none';
        submitSection.style.display = 'none';
        resultSection.style.display = 'block';
    }

    // 취소 버튼
    document.getElementById('cancelBtn').addEventListener('click', function() {
        if (confirm('업로드를 취소하시겠습니까?')) {
            resetUpload();
        }
    });

    // 다시 등록 버튼
    document.getElementById('resetBtn').addEventListener('click', function() {
        resetUpload();
    });

    // 로그아웃
    document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('로그아웃 하시겠습니까?')) {
            window.location.href = '/login';
        }
    });
});
