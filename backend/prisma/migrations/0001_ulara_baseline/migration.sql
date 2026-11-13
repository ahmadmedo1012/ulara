-- 0001_ulara_baseline — the single-schema baseline (2026-11-13).
-- Generated from prisma/schema.prisma via: prisma migrate diff --from-empty --to-schema-datamodel
-- The 33 era migrations (2026-05-23 → 2026-11-12) are retired with their
-- names and checksums; an established database records THIS baseline as
-- applied instead (the _prisma_migrations swap rides the same change).
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER');

-- CreateEnum
CREATE TYPE "InstitutionStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AcademicRank" AS ENUM ('LECTURER', 'ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "AcademicPosition" AS ENUM ('DEAN', 'ASSOCIATE_DEAN', 'DEPARTMENT_HEAD');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('HOMEWORK', 'QUIZ', 'PROJECT', 'EXAM');

-- CreateEnum
CREATE TYPE "GradeKind" AS ENUM ('HOMEWORK', 'QUIZ_1', 'QUIZ_2', 'MIDTERM', 'PROJECT', 'FINAL');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED', 'LATE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('URGENT', 'ACADEMIC', 'SYSTEM', 'SOCIAL');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('PDF', 'PPT', 'VIDEO', 'DOC', 'ZIP', 'IMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'FREELANCE', 'REMOTE');

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('APPLIED', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ONGOING', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ArExperienceType" AS ENUM ('AR', 'VR');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DegreeLevel" AS ENUM ('BACHELORS', 'MASTERS', 'PHD');

-- CreateEnum
CREATE TYPE "Capability" AS ENUM ('RESEARCH_GRADE_OWN', 'RESEARCH_GRADE_ANY', 'RESEARCH_PUBLISH', 'EXAMS_AUTHOR', 'EXAMS_MODERATE', 'EXAMS_TAKE', 'CURRICULUM_EDIT_OWN', 'CURRICULUM_EDIT_ANY', 'USERS_MANAGE', 'ROLES_ASSIGN', 'TEACHERS_VERIFY', 'QUALITY_VIEW', 'QUALITY_REPORT', 'ANNOUNCE_PLATFORM', 'ANNOUNCE_FACULTY', 'COMPETITIONS_RUN', 'EVENTS_RUN');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'SHORT', 'ESSAY');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ExamKind" AS ENUM ('QUIZ', 'MIDTERM', 'FINAL', 'PRACTICE');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AnnouncementScope" AS ENUM ('PLATFORM', 'FACULTY', 'DEPARTMENT', 'OFFERING');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('OPEN', 'CLOSED', 'JUDGED');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('GOING', 'MAYBE', 'NO');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ResearchPaperStatus" AS ENUM ('UPLOADED', 'SCANNING', 'CHECKS_PASSED', 'CHECKS_FAILED', 'GRADED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "TrainingTrackCategory" AS ENUM ('ONBOARDING', 'ACADEMIC', 'FLIPPED', 'STUDY_SKILLS', 'RESEARCH', 'CAREER', 'COMMUNICATION', 'ENGLISH', 'PROGRAMMING', 'PRODUCTIVITY', 'VISION');

-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('NONE', 'QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "status" "InstitutionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarColor" TEXT,
    "avatarInitials" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "scopeFacultyId" TEXT,
    "themePreference" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "themePreferenceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboardingCompletedAt" TIMESTAMP(3),
    "firedMilestones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 1,
    "gpa" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "rank" "AcademicRank" NOT NULL DEFAULT 'LECTURER',
    "departmentId" TEXT NOT NULL,
    "bio" TEXT,
    "degreeLevel" "DegreeLevel" NOT NULL DEFAULT 'MASTERS',
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "certifications" JSONB,
    "publications" JSONB,
    "awards" JSONB,
    "profileImageUrl" TEXT,
    "officeLocation" TEXT,
    "officeHours" TEXT,
    "websiteUrl" TEXT,
    "subjectKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "position" "AcademicPosition",
    "positionFacultyId" TEXT,
    "positionDepartmentId" TEXT,
    "appointedAt" TIMESTAMP(3),
    "termEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faculty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "iconEmoji" TEXT,
    "city" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "facultyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 3,
    "iconEmoji" TEXT,
    "themeColor" TEXT,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOffering" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "room" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,

    CONSTRAINT "ScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "MaterialType" NOT NULL,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "AssignmentType" NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "textAnswer" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "grade" DECIMAL(5,2),
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" "GradeKind" NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "feedback" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "topic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "icon" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hashtags" TEXT[],
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "PostReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT,
    "ownerId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyRoomMember" (
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyRoomMember_pkey" PRIMARY KEY ("roomId","userId")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "iconEmoji" TEXT,
    "themeColor" TEXT,
    "rating" DECIMAL(2,1),
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId","achievementId")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "icon" TEXT,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("userId","skillId")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "hours" INTEGER NOT NULL DEFAULT 0,
    "status" "CertificateStatus" NOT NULL DEFAULT 'ONGOING',
    "externalUrl" TEXT,
    "fileUrl" TEXT,
    "trackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoocCourse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "iconEmoji" TEXT,
    "category" TEXT NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL,
    "enrolled" INTEGER NOT NULL DEFAULT 0,
    "hasCertificate" BOOLEAN NOT NULL DEFAULT true,
    "jobReady" BOOLEAN NOT NULL DEFAULT true,
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoocCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoocEnrollment" (
    "id" TEXT NOT NULL,
    "moocId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoocEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "salary" TEXT,
    "description" TEXT,
    "iconEmoji" TEXT,
    "category" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "matchScore" INTEGER,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualLab" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "category" TEXT NOT NULL,
    "iconEmoji" TEXT,
    "totalExperiments" INTEGER NOT NULL DEFAULT 0,
    "themeColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VirtualLab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSession" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experimentName" TEXT NOT NULL,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "score" DECIMAL(5,2),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LabSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArExperience" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "type" "ArExperienceType" NOT NULL,
    "description" TEXT,
    "iconEmoji" TEXT,
    "themeColor" TEXT,
    "contentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "institutionId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lecture" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "videoUrl" TEXT NOT NULL,
    "posterUrl" TEXT,
    "transcriptUrl" TEXT,
    "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT 'NONE',
    "transcriptError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureChapter" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startSec" INTEGER NOT NULL,
    "endSec" INTEGER NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "conceptId" TEXT,

    CONSTRAINT "LectureChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureCheckpoint" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "conceptId" TEXT,
    "triggerSec" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "LectureCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckpointAnswer" (
    "id" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answerIndex" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckpointAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchEvent" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "watchedSec" INTEGER NOT NULL,
    "totalSec" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "replays" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeConcept" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "ordinal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KnowledgeConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMastery" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "level" DECIMAL(4,3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchPaper" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "offeringId" TEXT,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "fileUrl" TEXT,
    "status" "ResearchPaperStatus" NOT NULL DEFAULT 'UPLOADED',
    "plagiarismPct" DECIMAL(4,1),
    "aiContentPct" DECIMAL(4,1),
    "grade" DECIMAL(4,1),
    "feedback" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "extractedText" TEXT,

    CONSTRAINT "ResearchPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperAnnotation" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingTrack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "summary" TEXT NOT NULL,
    "category" "TrainingTrackCategory" NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'BEGINNER',
    "iconEmoji" TEXT,
    "themeColor" TEXT,
    "estMinutes" INTEGER NOT NULL DEFAULT 60,
    "pointsAward" INTEGER NOT NULL DEFAULT 200,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingLesson" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "contentMarkdown" TEXT NOT NULL,
    "estMinutes" INTEGER NOT NULL DEFAULT 8,
    "pointsAward" INTEGER NOT NULL DEFAULT 5,
    "quizQuestion" TEXT,
    "quizAnswer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconEmoji" TEXT NOT NULL,
    "themeColor" TEXT,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "trackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("userId","badgeId")
);

-- CreateTable
CREATE TABLE "PointsLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "role" "Role" NOT NULL,
    "capability" "Capability" NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role","capability")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capability" "Capability" NOT NULL,
    "institutionId" TEXT,
    "grant" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,
    "reason" TEXT,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "facultyId" TEXT,
    "departmentId" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "iconEmoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "choices" JSONB,
    "correctAnswer" JSONB,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "points" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "moderatedById" TEXT,
    "moderationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTemplate" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT,
    "facultyId" TEXT,
    "title" TEXT NOT NULL,
    "kind" "ExamKind" NOT NULL DEFAULT 'QUIZ',
    "description" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 45,
    "passingScore" INTEGER NOT NULL DEFAULT 50,
    "randomized" BOOLEAN NOT NULL DEFAULT true,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "moderatedById" TEXT,
    "moderationNote" TEXT,
    "openAt" TIMESTAMP(3),
    "closeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTemplateQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "pointsOverride" INTEGER,

    CONSTRAINT "ExamTemplateQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" DECIMAL(6,2),
    "maxScore" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "choiceIndex" INTEGER,
    "isCorrect" BOOLEAN,
    "awardedPoints" DECIMAL(6,2),
    "feedback" TEXT,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "scope" "AnnouncementScope" NOT NULL,
    "scopeId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "iconEmoji" TEXT,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "prize" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "organizerId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'OPEN',
    "iconEmoji" TEXT,
    "themeColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionEntry" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fileUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,

    CONSTRAINT "CompetitionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "organizerId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "iconEmoji" TEXT,
    "themeColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRSVP" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL DEFAULT 'GOING',
    "rsvpedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRSVP_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "UniversityFact" (
    "key" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "source" TEXT NOT NULL DEFAULT 'zu.edu.ly',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UniversityFact_pkey" PRIMARY KEY ("institutionId","key")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "SyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "source" TEXT NOT NULL DEFAULT 'static-markdown',
    "institutionId" TEXT NOT NULL,
    "factsAdded" INTEGER NOT NULL DEFAULT 0,
    "factsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "durationMs" INTEGER,
    "notes" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "topic" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" "LiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "joinUrl" TEXT,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'platform',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTelemetry" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiKnowledgeChunk" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "locator" TEXT,
    "url" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiKnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalAlert" (
    "id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BinaryObject" (
    "key" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BinaryObject_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AiQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiBudget" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "usedTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostMicros" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "offeringId" TEXT,
    "departmentId" TEXT,
    "facultyId" TEXT,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteUse" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "role" TEXT,
    "route" TEXT,
    "userAgent" TEXT,
    "console" JSONB,
    "note" TEXT NOT NULL,
    "screenshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientError" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "route" TEXT,
    "role" TEXT,
    "breadcrumbs" JSONB,
    "appVersion" TEXT,
    "updateId" TEXT,
    "runtimeVersion" TEXT,
    "deviceModel" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "userAgent" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "expoToken" TEXT NOT NULL,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE INDEX "Institution_status_idx" ON "Institution"("status");

-- CreateIndex
CREATE INDEX "Membership_institutionId_role_idx" ON "Membership"("institutionId", "role");

-- CreateIndex
CREATE INDEX "Membership_institutionId_isActive_idx" ON "Membership"("institutionId", "isActive");

-- CreateIndex
CREATE INDEX "Membership_userId_isActive_idx" ON "Membership"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_institutionId_key" ON "Membership"("userId", "institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_scopeFacultyId_idx" ON "User"("scopeFacultyId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_membershipId_key" ON "StudentProfile"("membershipId");

-- CreateIndex
CREATE INDEX "StudentProfile_userId_idx" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_institutionId_idx" ON "StudentProfile"("institutionId");

-- CreateIndex
CREATE INDEX "StudentProfile_facultyId_idx" ON "StudentProfile"("facultyId");

-- CreateIndex
CREATE INDEX "StudentProfile_departmentId_idx" ON "StudentProfile"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_institutionId_universityId_key" ON "StudentProfile"("institutionId", "universityId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_membershipId_key" ON "TeacherProfile"("membershipId");

-- CreateIndex
CREATE INDEX "TeacherProfile_userId_idx" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE INDEX "TeacherProfile_departmentId_idx" ON "TeacherProfile"("departmentId");

-- CreateIndex
CREATE INDEX "TeacherProfile_verifiedById_idx" ON "TeacherProfile"("verifiedById");

-- CreateIndex
CREATE INDEX "TeacherProfile_positionFacultyId_idx" ON "TeacherProfile"("positionFacultyId");

-- CreateIndex
CREATE INDEX "TeacherProfile_positionDepartmentId_idx" ON "TeacherProfile"("positionDepartmentId");

-- CreateIndex
CREATE INDEX "Faculty_city_idx" ON "Faculty"("city");

-- CreateIndex
CREATE INDEX "Faculty_institutionId_idx" ON "Faculty"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_institutionId_name_city_key" ON "Faculty"("institutionId", "name", "city");

-- CreateIndex
CREATE INDEX "Department_facultyId_idx" ON "Department"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_facultyId_name_key" ON "Department"("facultyId", "name");

-- CreateIndex
CREATE INDEX "Course_institutionId_idx" ON "Course"("institutionId");

-- CreateIndex
CREATE INDEX "Course_departmentId_idx" ON "Course"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_institutionId_code_key" ON "Course"("institutionId", "code");

-- CreateIndex
CREATE INDEX "CourseOffering_teacherId_idx" ON "CourseOffering"("teacherId");

-- CreateIndex
CREATE INDEX "CourseOffering_term_idx" ON "CourseOffering"("term");

-- CreateIndex
CREATE UNIQUE INDEX "CourseOffering_courseId_term_teacherId_key" ON "CourseOffering"("courseId", "term", "teacherId");

-- CreateIndex
CREATE INDEX "Enrollment_offeringId_idx" ON "Enrollment"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_offeringId_key" ON "Enrollment"("studentId", "offeringId");

-- CreateIndex
CREATE INDEX "ScheduleSlot_offeringId_idx" ON "ScheduleSlot"("offeringId");

-- CreateIndex
CREATE INDEX "Material_offeringId_idx" ON "Material"("offeringId");

-- CreateIndex
CREATE INDEX "Material_type_idx" ON "Material"("type");

-- CreateIndex
CREATE INDEX "Material_uploaderId_idx" ON "Material"("uploaderId");

-- CreateIndex
CREATE INDEX "Assignment_offeringId_idx" ON "Assignment"("offeringId");

-- CreateIndex
CREATE INDEX "Assignment_dueAt_idx" ON "Assignment"("dueAt");

-- CreateIndex
CREATE INDEX "Submission_studentId_idx" ON "Submission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_assignmentId_studentId_key" ON "Submission"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "Grade_studentId_idx" ON "Grade"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_offeringId_studentId_kind_key" ON "Grade"("offeringId", "studentId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_offeringId_date_key" ON "AttendanceSession"("offeringId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_idx" ON "AttendanceRecord"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Message_toUserId_readAt_idx" ON "Message"("toUserId", "readAt");

-- CreateIndex
CREATE INDEX "Message_fromUserId_idx" ON "Message"("fromUserId");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_institutionId_createdAt_idx" ON "Post"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "PostComment_postId_idx" ON "PostComment"("postId");

-- CreateIndex
CREATE INDEX "PostComment_authorId_idx" ON "PostComment"("authorId");

-- CreateIndex
CREATE INDEX "PostReaction_userId_idx" ON "PostReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostReaction_postId_userId_kind_key" ON "PostReaction"("postId", "userId", "kind");

-- CreateIndex
CREATE INDEX "StudyRoom_ownerId_idx" ON "StudyRoom"("ownerId");

-- CreateIndex
CREATE INDEX "StudyRoom_institutionId_idx" ON "StudyRoom"("institutionId");

-- CreateIndex
CREATE INDEX "StudyRoomMember_userId_idx" ON "StudyRoomMember"("userId");

-- CreateIndex
CREATE INDEX "Book_category_idx" ON "Book"("category");

-- CreateIndex
CREATE INDEX "Loan_userId_idx" ON "Loan"("userId");

-- CreateIndex
CREATE INDEX "Loan_bookId_idx" ON "Loan"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE INDEX "UserAchievement_achievementId_idx" ON "UserAchievement"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "UserSkill_skillId_idx" ON "UserSkill"("skillId");

-- CreateIndex
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");

-- CreateIndex
CREATE INDEX "Certificate_trackId_idx" ON "Certificate"("trackId");

-- CreateIndex
CREATE INDEX "MoocCourse_category_idx" ON "MoocCourse"("category");

-- CreateIndex
CREATE INDEX "MoocEnrollment_userId_idx" ON "MoocEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MoocEnrollment_moocId_userId_key" ON "MoocEnrollment"("moocId", "userId");

-- CreateIndex
CREATE INDEX "Job_category_idx" ON "Job"("category");

-- CreateIndex
CREATE INDEX "Job_type_idx" ON "Job"("type");

-- CreateIndex
CREATE INDEX "JobApplication_userId_idx" ON "JobApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobId_userId_key" ON "JobApplication"("jobId", "userId");

-- CreateIndex
CREATE INDEX "LabSession_userId_idx" ON "LabSession"("userId");

-- CreateIndex
CREATE INDEX "LabSession_labId_idx" ON "LabSession"("labId");

-- CreateIndex
CREATE INDEX "AiConversation_userId_idx" ON "AiConversation"("userId");

-- CreateIndex
CREATE INDEX "AiConversation_userId_institutionId_idx" ON "AiConversation"("userId", "institutionId");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_institutionId_idx" ON "AuditLog"("institutionId");

-- CreateIndex
CREATE INDEX "Lecture_offeringId_ordinal_idx" ON "Lecture"("offeringId", "ordinal");

-- CreateIndex
CREATE INDEX "LectureChapter_lectureId_idx" ON "LectureChapter"("lectureId");

-- CreateIndex
CREATE INDEX "LectureChapter_conceptId_idx" ON "LectureChapter"("conceptId");

-- CreateIndex
CREATE INDEX "LectureCheckpoint_lectureId_idx" ON "LectureCheckpoint"("lectureId");

-- CreateIndex
CREATE INDEX "LectureCheckpoint_conceptId_idx" ON "LectureCheckpoint"("conceptId");

-- CreateIndex
CREATE INDEX "CheckpointAnswer_studentId_idx" ON "CheckpointAnswer"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckpointAnswer_checkpointId_studentId_key" ON "CheckpointAnswer"("checkpointId", "studentId");

-- CreateIndex
CREATE INDEX "WatchEvent_studentId_idx" ON "WatchEvent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchEvent_lectureId_studentId_key" ON "WatchEvent"("lectureId", "studentId");

-- CreateIndex
CREATE INDEX "KnowledgeConcept_courseId_idx" ON "KnowledgeConcept"("courseId");

-- CreateIndex
CREATE INDEX "KnowledgeConcept_parentId_idx" ON "KnowledgeConcept"("parentId");

-- CreateIndex
CREATE INDEX "StudentMastery_conceptId_idx" ON "StudentMastery"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMastery_studentId_conceptId_key" ON "StudentMastery"("studentId", "conceptId");

-- CreateIndex
CREATE INDEX "ResearchPaper_studentId_idx" ON "ResearchPaper"("studentId");

-- CreateIndex
CREATE INDEX "ResearchPaper_reviewerId_idx" ON "ResearchPaper"("reviewerId");

-- CreateIndex
CREATE INDEX "ResearchPaper_status_idx" ON "ResearchPaper"("status");

-- CreateIndex
CREATE INDEX "ResearchPaper_offeringId_idx" ON "ResearchPaper"("offeringId");

-- CreateIndex
CREATE INDEX "ResearchPaper_institutionId_idx" ON "ResearchPaper"("institutionId");

-- CreateIndex
CREATE INDEX "PaperAnnotation_paperId_idx" ON "PaperAnnotation"("paperId");

-- CreateIndex
CREATE INDEX "PaperAnnotation_authorId_idx" ON "PaperAnnotation"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingTrack_slug_key" ON "TrainingTrack"("slug");

-- CreateIndex
CREATE INDEX "TrainingTrack_category_idx" ON "TrainingTrack"("category");

-- CreateIndex
CREATE INDEX "TrainingTrack_order_idx" ON "TrainingTrack"("order");

-- CreateIndex
CREATE INDEX "TrainingLesson_trackId_idx" ON "TrainingLesson"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingLesson_trackId_order_key" ON "TrainingLesson"("trackId", "order");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_trackId_idx" ON "TrainingEnrollment"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingEnrollment_userId_trackId_key" ON "TrainingEnrollment"("userId", "trackId");

-- CreateIndex
CREATE INDEX "LessonProgress_lessonId_idx" ON "LessonProgress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_enrollmentId_lessonId_key" ON "LessonProgress"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE INDEX "Badge_trackId_idx" ON "Badge"("trackId");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE INDEX "PointsLedger_userId_createdAt_idx" ON "PointsLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserPermission_grantedById_idx" ON "UserPermission"("grantedById");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_capability_institutionId_key" ON "UserPermission"("userId", "capability", "institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCategory_slug_key" ON "QuestionCategory"("slug");

-- CreateIndex
CREATE INDEX "QuestionCategory_facultyId_idx" ON "QuestionCategory"("facultyId");

-- CreateIndex
CREATE INDEX "QuestionCategory_departmentId_idx" ON "QuestionCategory"("departmentId");

-- CreateIndex
CREATE INDEX "Question_categoryId_idx" ON "Question"("categoryId");

-- CreateIndex
CREATE INDEX "Question_authorId_idx" ON "Question"("authorId");

-- CreateIndex
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- CreateIndex
CREATE INDEX "Question_isApproved_idx" ON "Question"("isApproved");

-- CreateIndex
CREATE INDEX "Question_moderatedById_idx" ON "Question"("moderatedById");

-- CreateIndex
CREATE INDEX "ExamTemplate_offeringId_idx" ON "ExamTemplate"("offeringId");

-- CreateIndex
CREATE INDEX "ExamTemplate_facultyId_idx" ON "ExamTemplate"("facultyId");

-- CreateIndex
CREATE INDEX "ExamTemplate_authorId_idx" ON "ExamTemplate"("authorId");

-- CreateIndex
CREATE INDEX "ExamTemplate_status_idx" ON "ExamTemplate"("status");

-- CreateIndex
CREATE INDEX "ExamTemplate_moderatedById_idx" ON "ExamTemplate"("moderatedById");

-- CreateIndex
CREATE INDEX "ExamTemplateQuestion_questionId_idx" ON "ExamTemplateQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamTemplateQuestion_templateId_questionId_key" ON "ExamTemplateQuestion"("templateId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamTemplateQuestion_templateId_order_key" ON "ExamTemplateQuestion"("templateId", "order");

-- CreateIndex
CREATE INDEX "ExamAttempt_templateId_idx" ON "ExamAttempt"("templateId");

-- CreateIndex
CREATE INDEX "ExamAttempt_studentId_idx" ON "ExamAttempt"("studentId");

-- CreateIndex
CREATE INDEX "ExamAttempt_status_expiresAt_idx" ON "ExamAttempt"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ExamAnswer_questionId_idx" ON "ExamAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAnswer_attemptId_questionId_key" ON "ExamAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "Announcement_scope_scopeId_idx" ON "Announcement"("scope", "scopeId");

-- CreateIndex
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

-- CreateIndex
CREATE INDEX "Competition_status_idx" ON "Competition"("status");

-- CreateIndex
CREATE INDEX "Competition_deadline_idx" ON "Competition"("deadline");

-- CreateIndex
CREATE INDEX "Competition_organizerId_idx" ON "Competition"("organizerId");

-- CreateIndex
CREATE INDEX "Competition_institutionId_deadline_idx" ON "Competition"("institutionId", "deadline");

-- CreateIndex
CREATE INDEX "CompetitionEntry_userId_idx" ON "CompetitionEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEntry_competitionId_userId_key" ON "CompetitionEntry"("competitionId", "userId");

-- CreateIndex
CREATE INDEX "CampusEvent_startsAt_idx" ON "CampusEvent"("startsAt");

-- CreateIndex
CREATE INDEX "CampusEvent_organizerId_idx" ON "CampusEvent"("organizerId");

-- CreateIndex
CREATE INDEX "CampusEvent_institutionId_startsAt_idx" ON "CampusEvent"("institutionId", "startsAt");

-- CreateIndex
CREATE INDEX "EventRSVP_userId_idx" ON "EventRSVP"("userId");

-- CreateIndex
CREATE INDEX "UniversityFact_institutionId_category_idx" ON "UniversityFact"("institutionId", "category");

-- CreateIndex
CREATE INDEX "SyncRun_startedAt_idx" ON "SyncRun"("startedAt");

-- CreateIndex
CREATE INDEX "SyncRun_status_idx" ON "SyncRun"("status");

-- CreateIndex
CREATE INDEX "SyncRun_institutionId_startedAt_idx" ON "SyncRun"("institutionId", "startedAt");

-- CreateIndex
CREATE INDEX "LiveSession_offeringId_idx" ON "LiveSession"("offeringId");

-- CreateIndex
CREATE INDEX "LiveSession_teacherId_idx" ON "LiveSession"("teacherId");

-- CreateIndex
CREATE INDEX "LiveSession_status_scheduledAt_idx" ON "LiveSession"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- CreateIndex
CREATE INDEX "PlatformSetting_category_idx" ON "PlatformSetting"("category");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_slug_key" ON "FeatureFlag"("slug");

-- CreateIndex
CREATE INDEX "FeatureFlag_category_idx" ON "FeatureFlag"("category");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "AiTelemetry_userId_idx" ON "AiTelemetry"("userId");

-- CreateIndex
CREATE INDEX "AiTelemetry_feature_idx" ON "AiTelemetry"("feature");

-- CreateIndex
CREATE INDEX "AiTelemetry_createdAt_idx" ON "AiTelemetry"("createdAt");

-- CreateIndex
CREATE INDEX "AiTelemetry_success_idx" ON "AiTelemetry"("success");

-- CreateIndex
CREATE INDEX "AiKnowledgeChunk_institutionId_idx" ON "AiKnowledgeChunk"("institutionId");

-- CreateIndex
CREATE INDEX "AiKnowledgeChunk_sourceType_sourceId_idx" ON "AiKnowledgeChunk"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "OperationalAlert_severity_idx" ON "OperationalAlert"("severity");

-- CreateIndex
CREATE INDEX "OperationalAlert_category_idx" ON "OperationalAlert"("category");

-- CreateIndex
CREATE INDEX "OperationalAlert_resolvedAt_idx" ON "OperationalAlert"("resolvedAt");

-- CreateIndex
CREATE INDEX "OperationalAlert_createdAt_idx" ON "OperationalAlert"("createdAt");

-- CreateIndex
CREATE INDEX "LoginEvent_userId_idx" ON "LoginEvent"("userId");

-- CreateIndex
CREATE INDEX "LoginEvent_success_idx" ON "LoginEvent"("success");

-- CreateIndex
CREATE INDEX "LoginEvent_createdAt_idx" ON "LoginEvent"("createdAt");

-- CreateIndex
CREATE INDEX "LoginEvent_email_idx" ON "LoginEvent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiQuota_userId_key" ON "AiQuota"("userId");

-- CreateIndex
CREATE INDEX "AiQuota_dayKey_idx" ON "AiQuota"("dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiBudget_monthKey_key" ON "AiBudget"("monthKey");

-- CreateIndex
CREATE INDEX "AiFeedback_messageId_idx" ON "AiFeedback"("messageId");

-- CreateIndex
CREATE INDEX "AiFeedback_userId_idx" ON "AiFeedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiFeedback_messageId_userId_key" ON "AiFeedback"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_createdById_idx" ON "InviteCode"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "InviteUse_codeId_userId_key" ON "InviteUse"("codeId", "userId");

-- CreateIndex
CREATE INDEX "PilotFeedback_status_createdAt_idx" ON "PilotFeedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PilotFeedback_userId_idx" ON "PilotFeedback"("userId");

-- CreateIndex
CREATE INDEX "ClientError_kind_createdAt_idx" ON "ClientError"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "ClientError_reviewedAt_createdAt_idx" ON "ClientError"("reviewedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ClientError_userId_idx" ON "ClientError"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushDevice_expoToken_key" ON "PushDevice"("expoToken");

-- CreateIndex
CREATE INDEX "PushDevice_userId_idx" ON "PushDevice"("userId");

-- CreateIndex
CREATE INDEX "PushDevice_lastSeenAt_idx" ON "PushDevice"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_scopeFacultyId_fkey" FOREIGN KEY ("scopeFacultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_positionFacultyId_fkey" FOREIGN KEY ("positionFacultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_positionDepartmentId_fkey" FOREIGN KEY ("positionDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyRoom" ADD CONSTRAINT "StudyRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyRoom" ADD CONSTRAINT "StudyRoom_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyRoomMember" ADD CONSTRAINT "StudyRoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "StudyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyRoomMember" ADD CONSTRAINT "StudyRoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "TrainingTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoocEnrollment" ADD CONSTRAINT "MoocEnrollment_moocId_fkey" FOREIGN KEY ("moocId") REFERENCES "MoocCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoocEnrollment" ADD CONSTRAINT "MoocEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSession" ADD CONSTRAINT "LabSession_labId_fkey" FOREIGN KEY ("labId") REFERENCES "VirtualLab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSession" ADD CONSTRAINT "LabSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecture" ADD CONSTRAINT "Lecture_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureChapter" ADD CONSTRAINT "LectureChapter_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureChapter" ADD CONSTRAINT "LectureChapter_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "KnowledgeConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureCheckpoint" ADD CONSTRAINT "LectureCheckpoint_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureCheckpoint" ADD CONSTRAINT "LectureCheckpoint_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "KnowledgeConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckpointAnswer" ADD CONSTRAINT "CheckpointAnswer_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "LectureCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckpointAnswer" ADD CONSTRAINT "CheckpointAnswer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchEvent" ADD CONSTRAINT "WatchEvent_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchEvent" ADD CONSTRAINT "WatchEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeConcept" ADD CONSTRAINT "KnowledgeConcept_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeConcept" ADD CONSTRAINT "KnowledgeConcept_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KnowledgeConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMastery" ADD CONSTRAINT "StudentMastery_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMastery" ADD CONSTRAINT "StudentMastery_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "KnowledgeConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPaper" ADD CONSTRAINT "ResearchPaper_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPaper" ADD CONSTRAINT "ResearchPaper_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPaper" ADD CONSTRAINT "ResearchPaper_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPaper" ADD CONSTRAINT "ResearchPaper_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAnnotation" ADD CONSTRAINT "PaperAnnotation_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ResearchPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAnnotation" ADD CONSTRAINT "PaperAnnotation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingLesson" ADD CONSTRAINT "TrainingLesson_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "TrainingTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "TrainingTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "TrainingLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "TrainingTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategory" ADD CONSTRAINT "QuestionCategory_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategory" ADD CONSTRAINT "QuestionCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuestionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplate" ADD CONSTRAINT "ExamTemplate_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplate" ADD CONSTRAINT "ExamTemplate_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplate" ADD CONSTRAINT "ExamTemplate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplate" ADD CONSTRAINT "ExamTemplate_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplateQuestion" ADD CONSTRAINT "ExamTemplateQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExamTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplateQuestion" ADD CONSTRAINT "ExamTemplateQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExamTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusEvent" ADD CONSTRAINT "CampusEvent_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusEvent" ADD CONSTRAINT "CampusEvent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRSVP" ADD CONSTRAINT "EventRSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CampusEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRSVP" ADD CONSTRAINT "EventRSVP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityFact" ADD CONSTRAINT "UniversityFact_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiKnowledgeChunk" ADD CONSTRAINT "AiKnowledgeChunk_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "InviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotFeedback" ADD CONSTRAINT "PilotFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientError" ADD CONSTRAINT "ClientError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

