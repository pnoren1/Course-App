/**
 * Submission Status Enum
 * Centralized definition of all valid submission statuses
 */
export enum SubmissionStatus {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  NEEDS_REVISION = 'needs_revision'
}

/**
 * Type alias for submission status values
 */
export type SubmissionStatusType = `${SubmissionStatus}`;

/**
 * Helper function to get status display labels in Hebrew
 */
export const getSubmissionStatusLabel = (status: SubmissionStatusType): string => {
  switch (status) {
    case SubmissionStatus.SUBMITTED:
      return 'הוגשה';
    case SubmissionStatus.APPROVED:
      return 'אושרה';
    case SubmissionStatus.NEEDS_REVISION:
      return 'דורשת תיקון';
    default:
      return 'לא ידוע';
  }
};

/**
 * Helper function to get status CSS classes
 */
export const getSubmissionStatusStyle = (status: SubmissionStatusType): string => {
  switch (status) {
    case SubmissionStatus.SUBMITTED:
      return 'bg-blue-100 text-blue-800';
    case SubmissionStatus.APPROVED:
      return 'bg-emerald-100 text-emerald-800';
    case SubmissionStatus.NEEDS_REVISION:
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Array of all valid submission statuses for validation
 */
export const VALID_SUBMISSION_STATUSES: SubmissionStatusType[] = [
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.APPROVED,
  SubmissionStatus.NEEDS_REVISION
];