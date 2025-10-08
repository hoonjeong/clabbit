const ClassAssignmentModel = require('../models/class-assignment.model');
const CommunicationService = require('../services/communication.service');
const { successResponse, errorResponse } = require('../utils/response');
const { PAGINATION } = require('../config/constants');

/**
 * 수업 과제 관리 컨트롤러
 */
class ClassAssignmentsController {
  /**
   * 과제 목록 조회
   * @route GET /api/class-assignments
   */
  static async getList(req, res) {
    try {
      const academyId = req.academyId;
      const {
        schedule_id,
        teacher_id,
        search,
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT
      } = req.query;

      const offset = (page - 1) * limit;

      const filters = {
        schedule_id,
        teacher_id,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const assignments = await ClassAssignmentModel.findAll(academyId, filters);
      const total = await ClassAssignmentModel.count(academyId, filters);

      return successResponse(res, {
        assignments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('과제 목록 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 과제 상세 조회
   * @route GET /api/class-assignments/:id
   */
  static async getDetail(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      const assignment = await ClassAssignmentModel.findById(academyId, id);
      if (!assignment) {
        return errorResponse(res, '과제를 찾을 수 없습니다.', 404);
      }

      // 제출 목록 조회
      const submissions = await ClassAssignmentModel.getSubmissions(id);

      return successResponse(res, {
        assignment,
        submissions
      });
    } catch (error) {
      console.error('과제 상세 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 과제 생성
   * @route POST /api/class-assignments
   */
  static async create(req, res) {
    try {
      const academyId = req.academyId;
      const assignmentData = {
        ...req.body,
        teacher_id: req.user.id
      };

      const assignmentId = await ClassAssignmentModel.create(academyId, assignmentData);

      return successResponse(res, {
        message: '과제가 생성되었습니다.',
        assignmentId
      }, 201);
    } catch (error) {
      console.error('과제 생성 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 과제 수정
   * @route PUT /api/class-assignments/:id
   */
  static async update(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      // 기존 과제 확인
      const existing = await ClassAssignmentModel.findById(academyId, id);
      if (!existing) {
        return errorResponse(res, '과제를 찾을 수 없습니다.', 404);
      }

      // 작성자 또는 관리자만 수정 가능
      if (existing.teacher_id !== req.user.id && req.user.role !== 'admin') {
        return errorResponse(res, '수정 권한이 없습니다.', 403);
      }

      const success = await ClassAssignmentModel.update(academyId, id, req.body);

      if (!success) {
        return errorResponse(res, '과제 수정에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '과제가 수정되었습니다.'
      });
    } catch (error) {
      console.error('과제 수정 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 과제 삭제
   * @route DELETE /api/class-assignments/:id
   */
  static async delete(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      // 기존 과제 확인
      const existing = await ClassAssignmentModel.findById(academyId, id);
      if (!existing) {
        return errorResponse(res, '과제를 찾을 수 없습니다.', 404);
      }

      // 작성자 또는 관리자만 삭제 가능
      if (existing.teacher_id !== req.user.id && req.user.role !== 'admin') {
        return errorResponse(res, '삭제 권한이 없습니다.', 403);
      }

      const success = await ClassAssignmentModel.delete(academyId, id);

      if (!success) {
        return errorResponse(res, '과제 삭제에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '과제가 삭제되었습니다.'
      });
    } catch (error) {
      console.error('과제 삭제 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 과제 제출
   * @route POST /api/class-assignments/:id/submit
   */
  static async submit(req, res) {
    try {
      const { id } = req.params;
      const { student_id, content } = req.body;

      // 과제 제출
      const submissionId = await ClassAssignmentModel.submitAssignment(id, student_id, {
        content
      });

      // 첨부파일 처리
      if (req.files && req.files.attachments) {
        const files = Array.isArray(req.files.attachments)
          ? req.files.attachments
          : [req.files.attachments];

        for (const file of files) {
          const fileData = await CommunicationService.handleFileUpload(file, 'assignments');
          await ClassAssignmentModel.addSubmissionFile(submissionId, fileData);
        }
      }

      return successResponse(res, {
        message: '과제가 제출되었습니다.',
        submissionId
      }, 201);
    } catch (error) {
      console.error('과제 제출 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 과제 채점
   * @route PUT /api/class-assignments/:id/submissions/:submissionId/grade
   */
  static async grade(req, res) {
    try {
      const { submissionId } = req.params;
      const { score, feedback } = req.body;

      const success = await ClassAssignmentModel.gradeSubmission(
        submissionId,
        req.user.id,
        score,
        feedback
      );

      if (!success) {
        return errorResponse(res, '채점에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '채점이 완료되었습니다.'
      });
    } catch (error) {
      console.error('과제 채점 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 학생의 과제 제출 조회
   * @route GET /api/class-assignments/:id/my-submission
   */
  static async getMySubmission(req, res) {
    try {
      const { id } = req.params;
      const { student_id } = req.query;

      const submission = await ClassAssignmentModel.getSubmissionByStudent(id, student_id);

      if (!submission) {
        return successResponse(res, {
          submission: null,
          message: '제출된 과제가 없습니다.'
        });
      }

      // 첨부파일 조회
      const files = await ClassAssignmentModel.getSubmissionFiles(submission.id);

      return successResponse(res, {
        submission,
        files
      });
    } catch (error) {
      console.error('과제 제출 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 미제출 과제 목록 조회
   * @route GET /api/class-assignments/pending
   */
  static async getPending(req, res) {
    try {
      const academyId = req.academyId;
      const { student_id } = req.query;

      if (!student_id) {
        return errorResponse(res, '학생 ID가 필요합니다.', 400);
      }

      const pendingAssignments = await ClassAssignmentModel.getPendingAssignments(
        academyId,
        student_id
      );

      return successResponse(res, {
        assignments: pendingAssignments
      });
    } catch (error) {
      console.error('미제출 과제 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = ClassAssignmentsController;
