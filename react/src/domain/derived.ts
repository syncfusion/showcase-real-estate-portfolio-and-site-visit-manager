import { Lease, LeaseStatus, SiteVisit, SiteVisitStatus } from '@/domain/types';

// The demo's "today". Statuses that follow from a date are derived
// against it, never stored in the fixtures.
export const DEMO_TODAY = '2026-10-15';

// A lease ending within this many months of demo-today is "Expiring soon".
export const LEASE_EXPIRY_WARNING_MONTHS = 12;

function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function leaseStatus(lease: Pick<Lease, 'endDate'>, today = DEMO_TODAY): LeaseStatus {
  if (lease.endDate < today) return 'Expired';
  if (lease.endDate <= addMonths(today, LEASE_EXPIRY_WARNING_MONTHS)) return 'Expiring-Soon';
  return 'Active';
}

export const LEASE_STATUS_TEXT: Record<LeaseStatus, string> = {
  Active: 'Active',
  'Expiring-Soon': 'Expiring soon',
  Expired: 'Expired'
};

// Open = not yet cleared: the board's Scheduled, In Progress and Pending Report columns.
export const OPEN_VISIT_STATUSES: SiteVisitStatus[] = ['scheduled', 'in-progress', 'pending-report'];
export const isOpenVisit = (visit: Pick<SiteVisit, 'status'>) => OPEN_VISIT_STATUSES.includes(visit.status);
