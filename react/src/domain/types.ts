export type AssetClass = 'Office' | 'Industrial' | 'Retail' | 'Multi-Family';

export type PropertyStatus = 'Stabilized' | 'Value-Add' | 'Under-Development' | 'Disposition';

export type LeedCertification = 'Platinum' | 'Gold' | 'Silver' | 'Certified' | 'None';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Property {
  id: string;
  name: string;
  code: string;
  assetClass: AssetClass;
  status: PropertyStatus;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: Coordinates;
  grossSquareFeet: number;
  rentableSquareFeet: number;
  occupancyRate: number; // 0.0 to 100.0
  marketValuation: number; // USD
  netOperatingIncome: number; // USD
  capitalizationRate: number; // Percentage, e.g. 5.85
  yearBuilt: number;
  leedCertification: LeedCertification;
  image: string;
}

export type TenantIndustry =
  | 'Financial Services'
  | 'Technology'
  | 'Legal'
  | 'Healthcare'
  | 'Logistics'
  | 'Retail';

// Derived from the end date (src/domain/derived.ts), never stored.
export type LeaseStatus = 'Active' | 'Expiring-Soon' | 'Expired';

export interface Lease {
  id: string;
  propertyId: string;
  tenantName: string;
  suite: string;
  industry: TenantIndustry;
  leasedSquareFeet: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  annualRent: number; // USD
  rentPerSquareFoot: number; // USD
  escalationPercent: number; // Percentage
}

export type InspectionType =
  | 'Structural Audit'
  | 'Environmental Phase I'
  | 'Annual PCA'
  | 'Tenant Move-in'
  | 'HVAC Assessment';

export type SiteVisitStatus = 'scheduled' | 'in-progress' | 'pending-report' | 'cleared';

export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface SiteVisit {
  id: string;
  propertyId: string;
  propertyName: string;
  type: InspectionType;
  inspectorName: string;
  inspectorEmail: string;
  scheduledStart: string; // ISO 8601
  scheduledEnd: string; // ISO 8601
  status: SiteVisitStatus;
  priority: PriorityLevel;
  findingsSummary: string;
  estimatedRepairCost: number; // USD
}

export type FileType = 'pdf' | 'dwg' | 'xlsx' | 'docx';

export type DueDiligenceCategory =
  | 'Leases'
  | 'Environmental'
  | 'Architectural'
  | 'Financial-Audits'
  | 'Legal-Title';

export interface DueDiligenceFile {
  id: string;
  propertyId: string;
  name: string;
  path: string;
  fileType: FileType;
  fileSize: number; // bytes
  lastModified: string; // ISO 8601
  category: DueDiligenceCategory;
  url: string; // the type's sample document; empty for a format the viewer cannot open (DWG)
  reviewStatus: DocumentReviewStatus;
}

export type DocumentReviewStatus = 'verified' | 'in-review';

export type PipelineStage =
  | 'sourcing'
  | 'loi'
  | 'due-diligence'
  | 'underwriting'
  | 'closing';

export interface PipelineDeal {
  id: string;
  dealName: string;
  assetClass: AssetClass;
  targetCity: string;
  stage: PipelineStage;
  estimatedValuation: number; // USD
  projectedCapRate: number; // percentage
  leadBroker: string;
  targetClosingDate: string; // YYYY-MM-DD
  probability: number; // 0 to 100
}

export interface PortfolioSummary {
  totalProperties: number;
  totalValuation: number;
  totalNOI: number;
  averageOccupancy: number;
  totalGrossSqFt: number;
  openInspections: Record<'scheduled' | 'in-progress' | 'pending-report', number> & { total: number; highPriority: number };
  weightedCapRate: number;
  totalAnnualRent: number;
}

export interface SessionState {
  properties: Property[];
  leases: Lease[];
  siteVisits: SiteVisit[];
  dueDiligenceFiles: DueDiligenceFile[];
  pipelineDeals: PipelineDeal[];
  lastUpdated: string;
}
