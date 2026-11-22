/**
 * r352 — pure lifecycle transition tables for every status-bearing
 * institutional entity. Illegal transitions are rejected by the
 * services with a dedicated 409 error code; these tables are the
 * single source (unit-pinned).
 */
export type TransitionTable<S extends string> = Partial<Record<S, readonly S[]>>;

export const ACCREDITATION_TRANSITIONS: TransitionTable<AccreditationState> = ({
  PENDING: ['IN_REVIEW', 'WITHDRAWN'],
  IN_REVIEW: ['GRANTED', 'CONDITIONAL', 'REJECTED', 'WITHDRAWN'],
  GRANTED: ['RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'WITHDRAWN'],
  CONDITIONAL: ['GRANTED', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'WITHDRAWN'],
  RENEWED: ['RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED'],
  SUSPENDED: ['GRANTED', 'EXPIRED', 'REVOKED'],
  REVOKED: [],
  EXPIRED: ['IN_REVIEW'],
  WITHDRAWN: [],
});
export type AccreditationState =
  | 'PENDING' | 'IN_REVIEW' | 'GRANTED' | 'CONDITIONAL' | 'REJECTED'
  | 'RENEWED' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED' | 'WITHDRAWN';

export const LICENSE_TRANSITIONS: TransitionTable<LicenseState> = ({
  PENDING: ['ACTIVE', 'SUSPENDED', 'REVOKED'],
  ACTIVE: ['RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED'],
  RENEWED: ['RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED'],
  SUSPENDED: ['ACTIVE', 'REVOKED', 'EXPIRED'],
  REVOKED: [],
  EXPIRED: ['ACTIVE'], // re-activation after renewal paperwork
});
export type LicenseState = 'PENDING' | 'ACTIVE' | 'RENEWED' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';

export const INSPECTION_TRANSITIONS: TransitionTable<InspectionState> = ({
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['SCHEDULED'],
});
export type InspectionState = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const FINDING_TRANSITIONS: TransitionTable<FindingState> = ({
  OPEN: ['ACKNOWLEDGED', 'DISPUTED', 'CLOSED'],
  ACKNOWLEDGED: ['IN_REMEDIATION', 'DISPUTED', 'CLOSED'],
  IN_REMEDIATION: ['RESOLVED', 'DISPUTED'],
  RESOLVED: ['CLOSED', 'IN_REMEDIATION'],
  DISPUTED: ['ACKNOWLEDGED', 'CLOSED'],
  CLOSED: [],
});
export type FindingState = 'OPEN' | 'ACKNOWLEDGED' | 'IN_REMEDIATION' | 'RESOLVED' | 'DISPUTED' | 'CLOSED';

export const CORRECTIVE_ACTION_TRANSITIONS: TransitionTable<CorrectiveState> = ({
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['VERIFIED', 'IN_PROGRESS'],
  VERIFIED: [],
  CANCELLED: ['PLANNED'],
});
export type CorrectiveState = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'CANCELLED';

export const SELF_ASSESSMENT_TRANSITIONS: TransitionTable<SelfAssessmentState> = ({
  DRAFT: ['SUBMITTED', 'ARCHIVED'],
  SUBMITTED: ['UNDER_REVIEW', 'DRAFT'],
  UNDER_REVIEW: ['APPROVED', 'DRAFT'],
  APPROVED: ['ARCHIVED'],
  ARCHIVED: [],
});
export type SelfAssessmentState = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'ARCHIVED';

export const RESOLUTION_TRANSITIONS: TransitionTable<ResolutionState> = ({
  DRAFT: ['APPROVED', 'REJECTED'],
  APPROVED: ['IMPLEMENTED', 'ARCHIVED'],
  REJECTED: [],
  IMPLEMENTED: ['ARCHIVED'],
  ARCHIVED: [],
});
export type ResolutionState = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED' | 'ARCHIVED';

export const MINUTES_TRANSITIONS: TransitionTable<MinutesState> = ({
  DRAFT: ['APPROVED'],
  APPROVED: ['SIGNED'],
  SIGNED: [],
});
export type MinutesState = 'DRAFT' | 'APPROVED' | 'SIGNED';

export const PROGRAM_TRANSITIONS: TransitionTable<ProgramState> = ({
  DRAFT: ['APPROVED', 'CLOSED'],
  APPROVED: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['SUSPENDED', 'CLOSED'],
  SUSPENDED: ['ACTIVE', 'CLOSED'],
  CLOSED: [],
});
export type ProgramState = 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export const PROGRAM_VERSION_TRANSITIONS: TransitionTable<ProgramVersionState> = ({
  DRAFT: ['APPROVED', 'RETIRED'],
  APPROVED: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['RETIRED'],
  RETIRED: [],
});
export type ProgramVersionState = 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'RETIRED';

export const PROGRAM_ENROLLMENT_TRANSITIONS: TransitionTable<ProgramEnrollmentState> = ({
  CANDIDATE: ['ACTIVE', 'WITHDRAWN'],
  ACTIVE: ['ON_LEAVE', 'WITHDRAWN', 'SUSPENDED', 'COMPLETED', 'GRADUATED'],
  ON_LEAVE: ['ACTIVE', 'WITHDRAWN'],
  WITHDRAWN: [],
  SUSPENDED: ['ACTIVE', 'WITHDRAWN'],
  COMPLETED: ['GRADUATED'],
  GRADUATED: [],
});
export type ProgramEnrollmentState =
  | 'CANDIDATE' | 'ACTIVE' | 'ON_LEAVE' | 'WITHDRAWN' | 'SUSPENDED' | 'COMPLETED' | 'GRADUATED';

export const WORK_ORDER_TRANSITIONS: TransitionTable<WorkOrderState> = ({
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['OPEN'],
});
export type WorkOrderState = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const RESERVATION_TRANSITIONS: TransitionTable<ReservationState> = ({
  REQUESTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
});
export type ReservationState = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export const RESEARCH_PROJECT_TRANSITIONS: TransitionTable<ResearchProjectState> = ({
  PROPOSED: ['APPROVED', 'TERMINATED'],
  APPROVED: ['ACTIVE', 'TERMINATED'],
  ACTIVE: ['SUSPENDED', 'COMPLETED', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  COMPLETED: [],
  TERMINATED: [],
});
export type ResearchProjectState =
  | 'PROPOSED' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'TERMINATED';

/** Generic guard: is `from → to` a legal transition? */
export function transitionAllowed<S extends string>(
  table: TransitionTable<S>,
  from: S,
  to: S,
): boolean {
  return (table[from] ?? []).includes(to);
}
