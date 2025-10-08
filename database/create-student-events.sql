-- student_events 테이블 생성
-- 학생의 가입/퇴원/재원 이벤트를 기록하여 정확한 통계 제공

CREATE TABLE IF NOT EXISTS student_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  academy_id INT NOT NULL,
  student_id INT NOT NULL,
  event_type ENUM('join', 'rejoin', 'exit') NOT NULL COMMENT 'join: 신규가입, rejoin: 재원, exit: 퇴원',
  event_date DATE NOT NULL COMMENT '이벤트 발생 날짜',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '레코드 생성 시각',

  -- 인덱스
  INDEX idx_academy_date (academy_id, event_date),
  INDEX idx_academy_type_date (academy_id, event_type, event_date),
  INDEX idx_student (student_id),

  -- 외래키
  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='학생 이벤트 로그 테이블';
