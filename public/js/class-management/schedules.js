// 시간표 관리 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 상태 관리
    let currentView = 'week'; // week, day, month
    let currentDate = new Date();
    let schedules = [];
    let selectedSchedule = null;
    let isDragging = false;
    let draggedSchedule = null;

    // DOM 요소
    const viewButtons = document.querySelectorAll('.view-btn');
    const prevButton = document.getElementById('prevPeriod');
    const nextButton = document.getElementById('nextPeriod');
    const todayButton = document.getElementById('todayBtn');
    const currentPeriodLabel = document.getElementById('currentPeriod');
    const scheduleGrid = document.getElementById('scheduleGrid');
    const addScheduleBtn = document.getElementById('addSchedule');
    const scheduleModal = document.getElementById('scheduleModal');
    const scheduleForm = document.getElementById('scheduleForm');
    const deleteScheduleBtn = document.getElementById('deleteSchedule');
    const teacherFilter = document.getElementById('teacherFilter');
    const classFilter = document.getElementById('classFilter');
    const roomFilter = document.getElementById('roomFilter');

    // 초기화
    init();

    function init() {
        setupEventListeners();
        loadFilters();
        loadSchedules();
        renderCalendar();
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 뷰 변경 버튼
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => changeView(btn.dataset.view));
        });

        // 네비게이션 버튼
        prevButton.addEventListener('click', navigatePrevious);
        nextButton.addEventListener('click', navigateNext);
        todayButton.addEventListener('click', navigateToday);

        // 필터 변경
        teacherFilter.addEventListener('change', loadSchedules);
        classFilter.addEventListener('change', loadSchedules);
        roomFilter.addEventListener('change', loadSchedules);

        // 스케줄 추가 버튼
        addScheduleBtn.addEventListener('click', openAddScheduleModal);

        // 스케줄 폼 제출
        scheduleForm.addEventListener('submit', handleScheduleSubmit);

        // 스케줄 삭제 버튼
        deleteScheduleBtn.addEventListener('click', handleScheduleDelete);

        // 모달 닫기
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // 드래그 앤 드롭 이벤트
        scheduleGrid.addEventListener('dragstart', handleDragStart);
        scheduleGrid.addEventListener('dragover', handleDragOver);
        scheduleGrid.addEventListener('drop', handleDrop);
        scheduleGrid.addEventListener('dragend', handleDragEnd);

        // 반복 설정 토글
        document.getElementById('isRecurring').addEventListener('change', toggleRecurringOptions);

        // 충돌 체크
        document.getElementById('checkConflicts').addEventListener('click', checkScheduleConflicts);
    }

    // 필터 옵션 로드
    async function loadFilters() {
        try {
            // 교사 목록
            const teachersResponse = await fetch('/api/users/teachers');
            const teachers = await teachersResponse.json();
            populateSelect(teacherFilter, teachers, 'id', 'name');

            // 반 목록
            const classesResponse = await fetch('/api/classes');
            const classes = await classesResponse.json();
            populateSelect(classFilter, classes, 'id', 'name');

            // 강의실 목록
            const roomsResponse = await fetch('/api/class-management/rooms');
            const rooms = await roomsResponse.json();
            populateSelect(roomFilter, rooms, 'room', 'room');
        } catch (error) {
            console.error('필터 로드 실패:', error);
        }
    }

    // Select 옵션 채우기
    function populateSelect(selectElement, items, valueKey, textKey) {
        selectElement.innerHTML = '<option value="">전체</option>';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[textKey];
            selectElement.appendChild(option);
        });
    }

    // 스케줄 로드
    async function loadSchedules() {
        try {
            const params = new URLSearchParams({
                start_date: getStartDate().toISOString().split('T')[0],
                end_date: getEndDate().toISOString().split('T')[0]
            });

            if (teacherFilter.value) params.append('teacher_id', teacherFilter.value);
            if (classFilter.value) params.append('class_id', classFilter.value);
            if (roomFilter.value) params.append('room', roomFilter.value);

            const response = await fetch(`/api/class-management/schedules?${params}`);
            schedules = await response.json();

            renderSchedules();
        } catch (error) {
            console.error('스케줄 로드 실패:', error);
            showToast('시간표를 불러오는데 실패했습니다.', 'error');
        }
    }

    // 뷰 변경
    function changeView(view) {
        currentView = view;

        // 버튼 활성화 상태 변경
        viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        renderCalendar();
        loadSchedules();
    }

    // 이전 기간으로 이동
    function navigatePrevious() {
        switch (currentView) {
            case 'day':
                currentDate.setDate(currentDate.getDate() - 1);
                break;
            case 'week':
                currentDate.setDate(currentDate.getDate() - 7);
                break;
            case 'month':
                currentDate.setMonth(currentDate.getMonth() - 1);
                break;
        }
        renderCalendar();
        loadSchedules();
    }

    // 다음 기간으로 이동
    function navigateNext() {
        switch (currentView) {
            case 'day':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'week':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'month':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
        }
        renderCalendar();
        loadSchedules();
    }

    // 오늘로 이동
    function navigateToday() {
        currentDate = new Date();
        renderCalendar();
        loadSchedules();
    }

    // 캘린더 렌더링
    function renderCalendar() {
        updatePeriodLabel();

        switch (currentView) {
            case 'day':
                renderDayView();
                break;
            case 'week':
                renderWeekView();
                break;
            case 'month':
                renderMonthView();
                break;
        }
    }

    // 기간 라벨 업데이트
    function updatePeriodLabel() {
        const options = { year: 'numeric', month: 'long' };

        switch (currentView) {
            case 'day':
                currentPeriodLabel.textContent = currentDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                });
                break;
            case 'week':
                const weekStart = getWeekStart(currentDate);
                const weekEnd = getWeekEnd(currentDate);
                currentPeriodLabel.textContent = `${weekStart.toLocaleDateString('ko-KR', options)} ${weekStart.getDate()}일 - ${weekEnd.getDate()}일`;
                break;
            case 'month':
                currentPeriodLabel.textContent = currentDate.toLocaleDateString('ko-KR', options);
                break;
        }
    }

    // 주간 뷰 렌더링
    function renderWeekView() {
        const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
        const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7시부터 20시까지

        let html = '<div class="schedule-grid week-view">';

        // 헤더
        html += '<div class="grid-header">';
        html += '<div class="time-column"></div>';

        const weekStart = getWeekStart(currentDate);
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const isToday = isDateToday(date);

            html += `
                <div class="day-column ${isToday ? 'today' : ''}">
                    <div class="day-name">${weekDays[i]}</div>
                    <div class="day-date">${date.getDate()}</div>
                </div>
            `;
        }
        html += '</div>';

        // 시간 슬롯
        html += '<div class="grid-body">';
        hours.forEach(hour => {
            html += '<div class="time-row">';
            html += `<div class="time-label">${hour}:00</div>`;

            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + i);
                html += `
                    <div class="time-slot"
                         data-date="${date.toISOString().split('T')[0]}"
                         data-hour="${hour}"
                         data-day="${i}">
                    </div>
                `;
            }
            html += '</div>';
        });
        html += '</div>';
        html += '</div>';

        scheduleGrid.innerHTML = html;

        // 시간 슬롯 클릭 이벤트
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.addEventListener('click', handleTimeSlotClick);
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('drop', handleDrop);
        });
    }

    // 일간 뷰 렌더링
    function renderDayView() {
        const hours = Array.from({ length: 14 }, (_, i) => i + 7);

        let html = '<div class="schedule-grid day-view">';
        html += '<div class="grid-header">';
        html += '<div class="time-column"></div>';
        html += `<div class="day-column">${currentDate.toLocaleDateString('ko-KR', { weekday: 'long' })}</div>`;
        html += '</div>';

        html += '<div class="grid-body">';
        hours.forEach(hour => {
            html += '<div class="time-row">';
            html += `<div class="time-label">${hour}:00</div>`;
            html += `
                <div class="time-slot"
                     data-date="${currentDate.toISOString().split('T')[0]}"
                     data-hour="${hour}">
                </div>
            `;
            html += '</div>';
        });
        html += '</div>';
        html += '</div>';

        scheduleGrid.innerHTML = html;

        // 이벤트 리스너 추가
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.addEventListener('click', handleTimeSlotClick);
        });
    }

    // 월간 뷰 렌더링
    function renderMonthView() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let html = '<div class="schedule-grid month-view">';

        // 헤더
        html += '<div class="grid-header">';
        ['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
            html += `<div class="day-name">${day}</div>`;
        });
        html += '</div>';

        // 날짜 그리드
        html += '<div class="grid-body">';
        let currentDatePointer = new Date(startDate);

        for (let week = 0; week < 6; week++) {
            html += '<div class="week-row">';
            for (let day = 0; day < 7; day++) {
                const isCurrentMonth = currentDatePointer.getMonth() === month;
                const isToday = isDateToday(currentDatePointer);

                html += `
                    <div class="date-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}"
                         data-date="${currentDatePointer.toISOString().split('T')[0]}">
                        <div class="date-number">${currentDatePointer.getDate()}</div>
                        <div class="date-schedules"></div>
                    </div>
                `;

                currentDatePointer.setDate(currentDatePointer.getDate() + 1);
            }
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';

        scheduleGrid.innerHTML = html;

        // 날짜 셀 클릭 이벤트
        document.querySelectorAll('.date-cell').forEach(cell => {
            cell.addEventListener('click', handleDateCellClick);
        });
    }

    // 스케줄 렌더링
    function renderSchedules() {
        if (!schedules.length) return;

        schedules.forEach(schedule => {
            if (currentView === 'week' || currentView === 'day') {
                renderScheduleInTimeSlot(schedule);
            } else if (currentView === 'month') {
                renderScheduleInDateCell(schedule);
            }
        });
    }

    // 시간 슬롯에 스케줄 렌더링
    function renderScheduleInTimeSlot(schedule) {
        const scheduleDate = new Date(schedule.date);
        const startHour = parseInt(schedule.start_time.split(':')[0]);
        const startMinute = parseInt(schedule.start_time.split(':')[1]);
        const endHour = parseInt(schedule.end_time.split(':')[0]);
        const endMinute = parseInt(schedule.end_time.split(':')[1]);

        const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        const height = (duration / 60) * 60; // 60px per hour

        const slot = document.querySelector(
            `.time-slot[data-date="${schedule.date}"][data-hour="${startHour}"]`
        );

        if (!slot) return;

        const scheduleElement = document.createElement('div');
        scheduleElement.className = `schedule-item ${getScheduleColorClass(schedule)}`;
        scheduleElement.draggable = true;
        scheduleElement.dataset.scheduleId = schedule.id;
        scheduleElement.style.height = `${height}px`;
        scheduleElement.style.top = `${(startMinute / 60) * 60}px`;

        scheduleElement.innerHTML = `
            <div class="schedule-time">${schedule.start_time} - ${schedule.end_time}</div>
            <div class="schedule-title">${schedule.title}</div>
            <div class="schedule-info">
                <span class="schedule-teacher">${schedule.teacher_name}</span>
                <span class="schedule-room">${schedule.room || ''}</span>
            </div>
            ${schedule.student_count ? `<div class="schedule-students">${schedule.student_count}명</div>` : ''}
        `;

        scheduleElement.addEventListener('click', (e) => {
            e.stopPropagation();
            handleScheduleClick(schedule);
        });

        slot.appendChild(scheduleElement);
    }

    // 날짜 셀에 스케줄 렌더링
    function renderScheduleInDateCell(schedule) {
        const cell = document.querySelector(`.date-cell[data-date="${schedule.date}"]`);
        if (!cell) return;

        const schedulesContainer = cell.querySelector('.date-schedules');
        const scheduleElement = document.createElement('div');
        scheduleElement.className = `schedule-badge ${getScheduleColorClass(schedule)}`;
        scheduleElement.innerHTML = `
            <span class="schedule-time">${schedule.start_time}</span>
            <span class="schedule-title">${schedule.title}</span>
        `;

        scheduleElement.addEventListener('click', (e) => {
            e.stopPropagation();
            handleScheduleClick(schedule);
        });

        schedulesContainer.appendChild(scheduleElement);
    }

    // 스케줄 색상 클래스 결정
    function getScheduleColorClass(schedule) {
        // 과목이나 유형에 따라 다른 색상 반환
        const colors = ['blue', 'green', 'orange', 'purple', 'red'];
        const index = schedule.subject ? schedule.subject.charCodeAt(0) % colors.length : 0;
        return `schedule-${colors[index]}`;
    }

    // 시간 슬롯 클릭 처리
    function handleTimeSlotClick(e) {
        const slot = e.currentTarget;
        const date = slot.dataset.date;
        const hour = slot.dataset.hour;

        openAddScheduleModal({
            date: date,
            start_time: `${hour.padStart(2, '0')}:00`
        });
    }

    // 날짜 셀 클릭 처리
    function handleDateCellClick(e) {
        const cell = e.currentTarget;
        const date = cell.dataset.date;

        // 일간 뷰로 전환
        currentDate = new Date(date);
        changeView('day');
    }

    // 스케줄 클릭 처리
    function handleScheduleClick(schedule) {
        selectedSchedule = schedule;
        openEditScheduleModal(schedule);
    }

    // 스케줄 추가 모달 열기
    function openAddScheduleModal(defaults = {}) {
        selectedSchedule = null;
        scheduleForm.reset();

        // 기본값 설정
        if (defaults.date) {
            document.getElementById('scheduleDate').value = defaults.date;
        }
        if (defaults.start_time) {
            document.getElementById('startTime').value = defaults.start_time;
        }

        // 삭제 버튼 숨기기
        deleteScheduleBtn.style.display = 'none';

        scheduleModal.style.display = 'block';
    }

    // 스케줄 수정 모달 열기
    function openEditScheduleModal(schedule) {
        // 폼에 데이터 채우기
        document.getElementById('scheduleTitle').value = schedule.title;
        document.getElementById('scheduleDate').value = schedule.date;
        document.getElementById('startTime').value = schedule.start_time;
        document.getElementById('endTime').value = schedule.end_time;
        document.getElementById('teacherId').value = schedule.teacher_id;
        document.getElementById('classId').value = schedule.class_id || '';
        document.getElementById('room').value = schedule.room || '';
        document.getElementById('description').value = schedule.description || '';

        // 반복 설정
        if (schedule.recurrence_pattern) {
            document.getElementById('isRecurring').checked = true;
            document.getElementById('recurrencePattern').value = schedule.recurrence_pattern;
            document.getElementById('recurrenceEnd').value = schedule.recurrence_end;
            toggleRecurringOptions();
        }

        // 삭제 버튼 표시
        deleteScheduleBtn.style.display = 'inline-block';

        scheduleModal.style.display = 'block';
    }

    // 모달 닫기
    function closeModal() {
        scheduleModal.style.display = 'none';
        selectedSchedule = null;
    }

    // 스케줄 폼 제출 처리
    async function handleScheduleSubmit(e) {
        e.preventDefault();

        const formData = new FormData(scheduleForm);
        const scheduleData = {
            title: formData.get('title'),
            date: formData.get('date'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            teacher_id: formData.get('teacher_id'),
            class_id: formData.get('class_id') || null,
            room: formData.get('room'),
            description: formData.get('description')
        };

        // 반복 설정
        if (formData.get('is_recurring')) {
            scheduleData.recurrence_pattern = formData.get('recurrence_pattern');
            scheduleData.recurrence_end = formData.get('recurrence_end');
        }

        try {
            const url = selectedSchedule
                ? `/api/class-management/schedules/${selectedSchedule.id}`
                : '/api/class-management/schedules';

            const method = selectedSchedule ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scheduleData)
            });

            if (response.ok) {
                showToast(selectedSchedule ? '시간표가 수정되었습니다.' : '시간표가 추가되었습니다.', 'success');
                closeModal();
                loadSchedules();
            } else {
                const error = await response.json();
                if (error.conflict) {
                    showConflictDialog(error.conflicts);
                } else {
                    showToast(error.message || '저장에 실패했습니다.', 'error');
                }
            }
        } catch (error) {
            console.error('스케줄 저장 실패:', error);
            showToast('저장 중 오류가 발생했습니다.', 'error');
        }
    }

    // 스케줄 삭제 처리
    async function handleScheduleDelete() {
        if (!selectedSchedule) return;

        if (!confirm('이 시간표를 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/class-management/schedules/${selectedSchedule.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('시간표가 삭제되었습니다.', 'success');
                closeModal();
                loadSchedules();
            }
        } catch (error) {
            console.error('스케줄 삭제 실패:', error);
            showToast('삭제 중 오류가 발생했습니다.', 'error');
        }
    }

    // 반복 옵션 토글
    function toggleRecurringOptions() {
        const isRecurring = document.getElementById('isRecurring').checked;
        document.getElementById('recurringOptions').style.display = isRecurring ? 'block' : 'none';
    }

    // 충돌 체크
    async function checkScheduleConflicts() {
        const formData = new FormData(scheduleForm);
        const checkData = {
            date: formData.get('date'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            teacher_id: formData.get('teacher_id'),
            room: formData.get('room')
        };

        try {
            const response = await fetch('/api/class-management/schedules/check-conflicts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(checkData)
            });

            const result = await response.json();

            if (result.conflicts && result.conflicts.length > 0) {
                showConflictDialog(result.conflicts);
            } else {
                showToast('충돌하는 일정이 없습니다.', 'success');
            }
        } catch (error) {
            console.error('충돌 체크 실패:', error);
        }
    }

    // 충돌 다이얼로그 표시
    function showConflictDialog(conflicts) {
        let message = '다음 일정과 충돌합니다:\n\n';

        conflicts.forEach(conflict => {
            message += `- ${conflict.title} (${conflict.start_time} - ${conflict.end_time})`;
            if (conflict.teacher_name) message += ` / ${conflict.teacher_name}`;
            if (conflict.room) message += ` / ${conflict.room}`;
            message += '\n';
        });

        alert(message);
    }

    // 드래그 시작
    function handleDragStart(e) {
        if (!e.target.classList.contains('schedule-item')) return;

        isDragging = true;
        draggedSchedule = schedules.find(s => s.id === parseInt(e.target.dataset.scheduleId));
        e.target.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
    }

    // 드래그 오버
    function handleDragOver(e) {
        if (!isDragging) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // 드롭 가능 영역 하이라이트
        if (e.currentTarget.classList.contains('time-slot')) {
            e.currentTarget.classList.add('drag-over');
        }
    }

    // 드롭
    async function handleDrop(e) {
        if (!isDragging || !draggedSchedule) return;
        e.preventDefault();

        const slot = e.currentTarget;
        if (!slot.classList.contains('time-slot')) return;

        const newDate = slot.dataset.date;
        const newHour = slot.dataset.hour;

        // 시간 계산
        const duration = calculateDuration(draggedSchedule.start_time, draggedSchedule.end_time);
        const newStartTime = `${newHour.padStart(2, '0')}:00`;
        const newEndTime = calculateEndTime(newStartTime, duration);

        // 스케줄 업데이트
        try {
            const response = await fetch(`/api/class-management/schedules/${draggedSchedule.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...draggedSchedule,
                    date: newDate,
                    start_time: newStartTime,
                    end_time: newEndTime
                })
            });

            if (response.ok) {
                showToast('일정이 이동되었습니다.', 'success');
                loadSchedules();
            } else {
                const error = await response.json();
                if (error.conflict) {
                    showConflictDialog(error.conflicts);
                }
            }
        } catch (error) {
            console.error('일정 이동 실패:', error);
            showToast('일정 이동에 실패했습니다.', 'error');
        }

        slot.classList.remove('drag-over');
    }

    // 드래그 종료
    function handleDragEnd(e) {
        if (!e.target.classList.contains('schedule-item')) return;
        e.target.style.opacity = '';
        isDragging = false;
        draggedSchedule = null;

        // 모든 드래그 오버 클래스 제거
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }

    // 헬퍼 함수들
    function getStartDate() {
        switch (currentView) {
            case 'day':
                return new Date(currentDate);
            case 'week':
                return getWeekStart(currentDate);
            case 'month':
                return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        }
    }

    function getEndDate() {
        switch (currentView) {
            case 'day':
                return new Date(currentDate);
            case 'week':
                return getWeekEnd(currentDate);
            case 'month':
                return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        }
    }

    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    function getWeekEnd(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + 6;
        return new Date(d.setDate(diff));
    }

    function isDateToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    function calculateDuration(startTime, endTime) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        return (endHour * 60 + endMin) - (startHour * 60 + startMin);
    }

    function calculateEndTime(startTime, duration) {
        const [hour, min] = startTime.split(':').map(Number);
        const totalMinutes = hour * 60 + min + duration;
        const endHour = Math.floor(totalMinutes / 60);
        const endMin = totalMinutes % 60;
        return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
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

    // 시간표 인쇄
    window.printSchedule = function() {
        window.print();
    };

    // 시간표 내보내기 (Excel)
    window.exportSchedule = async function() {
        try {
            const params = new URLSearchParams({
                start_date: getStartDate().toISOString().split('T')[0],
                end_date: getEndDate().toISOString().split('T')[0],
                format: 'excel'
            });

            window.location.href = `/api/class-management/schedules/export?${params}`;
        } catch (error) {
            console.error('내보내기 실패:', error);
            showToast('내보내기에 실패했습니다.', 'error');
        }
    };
});