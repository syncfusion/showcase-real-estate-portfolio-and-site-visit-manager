import mockDataRaw from '@/fixtures/mockData.json';
import {
  Property,
  Lease,
  SiteVisit,
  DueDiligenceFile,
  PipelineDeal,
  SessionState,
  PortfolioSummary,
  SiteVisitStatus,
  PipelineStage
} from '@/domain/types';
import { isOpenVisit, leaseStatus } from '@/domain/derived';

// Versioned with the sample data: a saved session is reused for good, so changing the fixtures needs a new
// key, or returning visitors keep the old data. v2: the October 2026 dates; v3 (2026-10-08, night): the
// sample documents, the 23 open visits and lease status derived from dates.
const STORAGE_KEY = 'rep_session_state_v3';
const OLD_KEYS = ['rep_session_state_v1', 'rep_session_state_v2'];

function getInitialState(): SessionState {
  return {
    properties: mockDataRaw.properties as Property[],
    leases: mockDataRaw.leases as Lease[],
    siteVisits: mockDataRaw.siteVisits as SiteVisit[],
    dueDiligenceFiles: mockDataRaw.dueDiligenceFiles as DueDiligenceFile[],
    pipelineDeals: mockDataRaw.pipelineDeals as PipelineDeal[],
    lastUpdated: new Date().toISOString()
  };
}

class SessionStore {
  private state: SessionState;
  private listeners: Array<() => void> = [];

  constructor() {
    this.state = this.loadFromStorage();
  }

  private loadFromStorage(): SessionState {
    try {
      for (const key of OLD_KEYS) localStorage.removeItem(key);
    } catch {
      // Storage blocked: nothing to clear
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.properties) && parsed.properties.length > 0) {
          return parsed as SessionState;
        }
      }
    } catch {
      // Fallback on storage read error
    }
    const initial = getInitialState();
    this.saveToStorage(initial);
    return initial;
  }

  private saveToStorage(state: SessionState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota or storage write error
    }
  }

  private notify() {
    this.state.lastUpdated = new Date().toISOString();
    this.saveToStorage(this.state);
    for (const listener of this.listeners) {
      listener();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getState(): SessionState {
    return this.state;
  }

  public resetToDemoData() {
    this.state = getInitialState();
    this.notify();
  }

  public getPortfolioSummary(): PortfolioSummary {
    const props = this.state.properties;
    const totalValuation = props.reduce((acc, p) => acc + p.marketValuation, 0);
    const totalNOI = props.reduce((acc, p) => acc + p.netOperatingIncome, 0);
    const totalGrossSqFt = props.reduce((acc, p) => acc + p.grossSquareFeet, 0);
    const totalOccupancyWeighted = props.reduce((acc, p) => acc + p.occupancyRate * p.rentableSquareFeet, 0);
    const totalRentableSqFt = props.reduce((acc, p) => acc + p.rentableSquareFeet, 0);
    const averageOccupancy = totalRentableSqFt > 0 ? totalOccupancyWeighted / totalRentableSqFt : 0;
    const open = this.state.siteVisits.filter(isOpenVisit);
    const openInspections = {
      total: open.length,
      scheduled: open.filter((v) => v.status === 'scheduled').length,
      'in-progress': open.filter((v) => v.status === 'in-progress').length,
      'pending-report': open.filter((v) => v.status === 'pending-report').length,
      highPriority: open.filter((v) => v.priority === 'High').length
    };
    const weightedCapRate = totalValuation > 0 ? (totalNOI / totalValuation) * 100 : 0;
    const totalAnnualRent = this.state.leases
      .filter((l) => leaseStatus(l) !== 'Expired')
      .reduce((acc, l) => acc + l.annualRent, 0);

    return {
      totalProperties: props.length,
      totalValuation,
      totalNOI,
      averageOccupancy: Math.round(averageOccupancy * 10) / 10,
      totalGrossSqFt,
      openInspections,
      weightedCapRate: Math.round(weightedCapRate * 100) / 100,
      totalAnnualRent
    };
  }

  public getProperties(filters?: {
    assetClass?: string;
    city?: string;
    status?: string;
    search?: string;
  }): Property[] {
    return this.state.properties.filter((p) => {
      if (filters?.assetClass && filters.assetClass !== 'All' && p.assetClass !== filters.assetClass) {
        return false;
      }
      if (filters?.city && filters.city !== 'All' && p.city !== filters.city) {
        return false;
      }
      if (filters?.status && filters.status !== 'All' && p.status !== filters.status) {
        return false;
      }
      if (filters?.search && filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const matches =
          p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query) ||
          p.city.toLowerCase().includes(query) ||
          p.address.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }

  public getPropertyById(id: string): Property | undefined {
    return this.state.properties.find((p) => p.id === id);
  }

  public getLeasesForProperty(propertyId: string): Lease[] {
    return this.state.leases.filter((l) => l.propertyId === propertyId);
  }

  // Counted from the leases and visits (the fixtures stored fixed counts before, 2026-10-08).
  public getActiveLeaseCount(propertyId: string): number {
    return this.state.leases.filter((l) => l.propertyId === propertyId && leaseStatus(l) !== 'Expired').length;
  }

  public getOpenInspectionCount(propertyId: string): number {
    return this.state.siteVisits.filter((v) => v.propertyId === propertyId && isOpenVisit(v)).length;
  }

  public getSiteVisits(filters?: {
    inspector?: string;
    status?: string;
    propertyId?: string;
  }): SiteVisit[] {
    return this.state.siteVisits.filter((v) => {
      if (filters?.inspector && filters.inspector !== 'All' && v.inspectorName !== filters.inspector) {
        return false;
      }
      if (filters?.status && filters.status !== 'All' && v.status !== filters.status) {
        return false;
      }
      if (filters?.propertyId && v.propertyId !== filters.propertyId) {
        return false;
      }
      return true;
    });
  }

  public getPipelineDeals(stage?: string): PipelineDeal[] {
    if (!stage || stage === 'All') return this.state.pipelineDeals;
    return this.state.pipelineDeals.filter((d) => d.stage === stage);
  }

  public getDueDiligenceFiles(propertyId?: string, category?: string): DueDiligenceFile[] {
    return this.state.dueDiligenceFiles.filter((f) => {
      if (propertyId && propertyId !== 'All' && f.propertyId !== propertyId) {
        return false;
      }
      if (category && category !== 'All' && f.category !== category) {
        return false;
      }
      return true;
    });
  }

  // Mutation commands
  public updateSiteVisitStatus(visitId: string, status: SiteVisitStatus, findingsSummary?: string) {
    this.state.siteVisits = this.state.siteVisits.map((v) => {
      if (v.id === visitId) {
        return {
          ...v,
          status,
          findingsSummary: findingsSummary !== undefined ? findingsSummary : v.findingsSummary
        };
      }
      return v;
    });
    this.notify();
  }

  public rescheduleSiteVisit(visitId: string, scheduledStart: string, scheduledEnd: string) {
    this.state.siteVisits = this.state.siteVisits.map((v) => {
      if (v.id === visitId) {
        return {
          ...v,
          scheduledStart,
          scheduledEnd
        };
      }
      return v;
    });
    this.notify();
  }

  // Calendar and board editors: a new visit gets the next
  // id and starts Scheduled; only a Scheduled visit can be deleted (a cancellation).
  public addSiteVisit(visit: Omit<SiteVisit, 'id' | 'status'>): SiteVisit {
    const next = Math.max(0, ...this.state.siteVisits.map((v) => Number(v.id.replace(/\D/g, '')) || 0)) + 1;
    const created: SiteVisit = { ...visit, id: `visit-${String(next).padStart(3, '0')}`, status: 'scheduled' };
    this.state.siteVisits = [...this.state.siteVisits, created];
    this.notify();
    return created;
  }

  public updateSiteVisit(visitId: string, changes: Partial<Omit<SiteVisit, 'id' | 'status'>>) {
    this.state.siteVisits = this.state.siteVisits.map((v) => (v.id === visitId ? { ...v, ...changes } : v));
    this.notify();
  }

  public deleteSiteVisit(visitId: string): boolean {
    const visit = this.state.siteVisits.find((v) => v.id === visitId);
    if (!visit || visit.status !== 'scheduled') return false;
    this.state.siteVisits = this.state.siteVisits.filter((v) => v.id !== visitId);
    this.notify();
    return true;
  }

  public updateDeal(dealId: string, changes: Partial<Omit<PipelineDeal, 'id' | 'stage'>>) {
    this.state.pipelineDeals = this.state.pipelineDeals.map((d) => (d.id === dealId ? { ...d, ...changes } : d));
    this.notify();
  }

  public updateDealStage(dealId: string, newStage: PipelineStage) {
    this.state.pipelineDeals = this.state.pipelineDeals.map((d) => {
      if (d.id === dealId) {
        return {
          ...d,
          stage: newStage
        };
      }
      return d;
    });
    this.notify();
  }

  public saveProperty(propertyData: Partial<Property> & { id: string }) {
    this.state.properties = this.state.properties.map((p) => {
      if (p.id === propertyData.id) {
        return {
          ...p,
          ...propertyData
        };
      }
      return p;
    });
    this.notify();
  }
}

export const sessionStore = new SessionStore();
