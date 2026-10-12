import { LayoutDashboard, Building2, CalendarClock, FolderLock, Handshake } from 'lucide-react';

// The five pages: the sidebar's items, the header title and the page loading label.
export const ROUTES = [
  { id: 'portfolio', label: 'Executive Dashboard', icon: LayoutDashboard },
  { id: 'properties', label: 'Property & Lease Directory', icon: Building2 },
  { id: 'site-visits', label: 'Site Visits & Inspections', icon: CalendarClock },
  { id: 'due-diligence', label: 'Due Diligence Vault', icon: FolderLock },
  { id: 'pipeline', label: 'Acquisition Pipeline', icon: Handshake },
];
