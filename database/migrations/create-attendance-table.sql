-- 출석 테이블 생성
CREATE TABLE IF NOT EXISTS attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  class_id INT,
  attendance_date DATE NOT NULL,
  status ENUM('출석', '결석', '지각', '조퇴', '병결', '공결') NOT NULL DEFAULT '출석',
  check_in_time TIME,
  check_out_time TIME,
  note TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_attendance_student (student_id),
  INDEX idx_attendance_date (attendance_date),
  INDEX idx_attendance_class (class_id),
  INDEX idx_attendance_student_date (student_id, attendance_date),
  UNIQUE KEY unique_student_class_date (student_id, class_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='출석 기록';

-- 출석 수정 이력 테이블
CREATE TABLE IF NOT EXISTS attendance_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  attendance_id INT NOT NULL,
  old_status VARCHAR(10),
  new_status VARCHAR(10),
  old_check_in_time TIME,
  new_check_in_time TIME,
  old_check_out_time TIME,
  new_check_out_time TIME,
  reason TEXT NOT NULL COMMENT '정정 사유',
  modified_by INT NOT NULL,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
  FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_history_attendance (attendance_id),
  INDEX idx_history_date (modified_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='출석 수정 이력';
