import { InspectionType, PriorityLevel, SiteVisitStatus } from '@/domain/types';

export const INSPECTION_TYPES: InspectionType[] = [
  'Structural Audit', 'Environmental Phase I', 'Annual PCA', 'Tenant Move-in', 'HVAC Assessment'
];
export const PRIORITIES: PriorityLevel[] = ['High', 'Medium', 'Low'];
export const VISIT_STATUS_TEXT: Record<SiteVisitStatus, string> = {
  scheduled: 'Scheduled', 'in-progress': 'In Progress', 'pending-report': 'Pending Report', cleared: 'Cleared'
};
