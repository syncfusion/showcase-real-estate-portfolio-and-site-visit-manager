import React, { useState, useMemo } from 'react';
import { PanelCard } from '@/components/cards/PanelCard';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Toolbar,
  Inject
} from '@syncfusion/ej2-react-grids';
import { Building2, FileText } from 'lucide-react';
import { useSessionStore } from '@/hooks/useSessionStore';
import { Property, type Lease, type LeaseStatus } from '@/domain/types';
import { BAND_LABEL, BAND_TONE, TONE_BADGE, TONE_TEXT, occupancyBand } from '@/styles/palette';
import { LEASE_STATUS_TEXT, leaseStatus } from '@/domain/derived';
import { sessionStore } from '@/services/sessionStore';

// Colour semantics: green good, amber watch, red bad, blue in progress, slate no
// judgement. A property's status is a stage in its life, not a verdict, so only Stabilized is green.
const STATUS_TONE: Record<Property['status'], keyof typeof TONE_BADGE> = {
  Stabilized: 'success',
  'Value-Add': 'info',
  'Under-Development': 'info',
  Disposition: 'neutral'
};
// A lease row for the Grid: the end date as a Date (the date column formats it) and the badge classes
// precomputed, so the module-level template reads only the record.
type LeaseRow = Lease & { endDateValue: Date; status: string; statusClass: string };
const leaseStatusTemplate = (row: LeaseRow) => (
  <span className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-medium ${row.statusClass}`}>
    {row.status}
  </span>
);

// Lease status follows the end date (src/domain/derived.ts): Expiring soon within 12 months of demo-today.
const LEASE_TONE: Record<LeaseStatus, keyof typeof TONE_BADGE> = {
  Active: 'success',
  'Expiring-Soon': 'warning',
  Expired: 'neutral'
};

export const PropertiesPage: React.FC = () => {
  const { state } = useSessionStore();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    state.properties[0]?.id || ''
  );

  const selectedProperty = useMemo(
    () => state.properties.find((p) => p.id === selectedPropertyId) || state.properties[0],
    [state.properties, selectedPropertyId]
  );

  const selectedLeases = useMemo(
    () => state.leases.filter((l) => l.propertyId === selectedProperty?.id),
    [state.leases, selectedProperty]
  );
  const leaseRows = useMemo<LeaseRow[]>(() => selectedLeases.map((lease) => ({
    ...lease,
    endDateValue: new Date(`${lease.endDate}T00:00:00`),
    status: LEASE_STATUS_TEXT[leaseStatus(lease)],
    statusClass: TONE_BADGE[LEASE_TONE[leaseStatus(lease)]]
  })), [selectedLeases]);

  const formatCurrency = (val: number) => `$${(val / 1_000_000).toFixed(1)}M`;

  const handleRowSelected = (args: { data?: { id?: string } }) => {
    if (args.data?.id) {
      setSelectedPropertyId(args.data.id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-sf-fg-primary)]">
          Property & Lease Directory
        </h1>
        <p className="text-sm text-[var(--color-sf-fg-secondary)] mt-1">
          Interactive registry of 30 institutional assets across 6 primary markets with tenancy and WALT breakdown.
        </p>
      </div>

      {/* Syncfusion DataGrid in a Syncfusion Card panel. */}
      <PanelCard title={`Institutional Asset Registry (${state.properties.length} Properties)`} icon={<Building2 size={18} />}
        aside="Click row to view leases & detail" contentClassName="rep-panel-tight">
          <GridComponent
            id="properties-grid"
            dataSource={state.properties}
            allowPaging={true}
            allowSorting={true}
            allowFiltering={true}
            pageSettings={{ pageSize: 8 }}
            filterSettings={{ type: 'Menu' }}
            rowSelected={handleRowSelected}
            allowTextWrap={true}
            textWrapSettings={{ wrapMode: 'Content' }}
          >
            <Inject services={[Page, Sort, Filter, Toolbar]} />
            <ColumnsDirective>
              {/* Eight fixed columns sum to 1080px: below 1400px the card is narrower (720px at 1024px, 992px at 1280px with
                  the sidebar docked), so Code, Market and Cap Rate step aside and Property Name takes the rest. */}
              <ColumnDirective field="code" headerText="Code" width="100" hideAtMedia="(min-width: 1400px)" />
              <ColumnDirective field="name" headerText="Property Name" />
              <ColumnDirective field="city" headerText="Market" width="130" hideAtMedia="(min-width: 1400px)" />
              <ColumnDirective field="assetClass" headerText="Asset Class" width="130" />
              <ColumnDirective
                field="marketValuation"
                headerText="Valuation"
                width="130"
                format="C0"
                textAlign="Right"
              />
              <ColumnDirective
                field="occupancyRate"
                headerText="Occupancy"
                width="120"
                format="N1"
                textAlign="Right"
                template={(props: Property) => (
                  <span
                    className={`font-semibold ${TONE_TEXT[BAND_TONE[occupancyBand(props.occupancyRate)]]}`}
                    title={BAND_LABEL[occupancyBand(props.occupancyRate)]}
                  >
                    {props.occupancyRate}%
                  </span>
                )}
              />
              <ColumnDirective
                hideAtMedia="(min-width: 1400px)"
                field="capitalizationRate"
                headerText="Cap Rate"
                width="110"
                format="N2"
                textAlign="Right"
                template={(props: Property) => `${props.capitalizationRate}%`}
              />
              <ColumnDirective
                field="status"
                headerText="Status"
                width="140"
                template={(props: Property) => (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TONE_BADGE[STATUS_TONE[props.status] ?? 'neutral']}`}
                  >
                    {props.status}
                  </span>
                )}
              />
            </ColumnsDirective>
          </GridComponent>
      </PanelCard>

      {/* Selected Property Details & Tenancy */}
      {selectedProperty && (
        <div className="grid grid-cols-1 min-[1400px]:grid-cols-3 gap-6">
          {/* Side by side from 1400px: below that the lease Grid's seven columns do not fit two thirds of the
              content (483px at 1024px, 640px at 1280px with the sidebar docked), so the cards stack at full width. */}
          {/* The selected property as a Syncfusion Card: image with the code as its title, then the name and
              address in the card header, then the figures. */}
          <section className="e-card rep-panel rep-property-card" aria-label={`${selectedProperty.name} details`}>
            <div className="e-card-image h-44 bg-slate-200" style={{ backgroundImage: `url(${selectedProperty.image})` }}
              role="img" aria-label={selectedProperty.name}>
              <div className="e-card-title">{selectedProperty.code}</div>
            </div>
            <div className="e-card-header">
              <div className="e-card-header-caption">
                <h2 className="e-card-header-title">{selectedProperty.name}</h2>
                <div className="e-card-sub-title">
                  {selectedProperty.address}, {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zipCode}
                </div>
              </div>
            </div>
            <div className="e-card-content flex-1 flex flex-col justify-between space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs border-y border-[var(--app-card-border)] py-3">
                <div>
                  <span className="text-[var(--color-sf-fg-secondary)] block">Valuation</span>
                  <span className="font-semibold text-sm text-[var(--color-sf-fg-primary)]">
                    {formatCurrency(selectedProperty.marketValuation)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-sf-fg-secondary)] block">Annual NOI</span>
                  <span className="font-semibold text-sm text-[var(--color-sf-fg-primary)]">
                    {formatCurrency(selectedProperty.netOperatingIncome)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-sf-fg-secondary)] block">Gross Sq Ft</span>
                  <span className="font-semibold text-[var(--color-sf-fg-primary)]">
                    {selectedProperty.grossSquareFeet.toLocaleString()} SF
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-sf-fg-secondary)] block">Built / LEED</span>
                  <span className="font-semibold text-[var(--color-sf-fg-primary)]">
                    {selectedProperty.yearBuilt} · {selectedProperty.leedCertification}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--color-sf-fg-secondary)]">
                <span>Active Leases: <strong>{sessionStore.getActiveLeaseCount(selectedProperty.id)}</strong></span>
                <span>Inspections: <strong>{sessionStore.getOpenInspectionCount(selectedProperty.id)} open</strong></span>
              </div>
            </div>
          </section>

          {/* Tenancy & Lease Roster (2 cols) */}
          <PanelCard className="min-[1400px]:col-span-2" title={`Tenancy & Lease Schedule (${selectedLeases.length} Active Leases)`}
            icon={<FileText size={18} />} aside={selectedProperty.name} contentClassName="flex-1 rep-panel-tight">
              {/* The lease schedule as a Syncfusion Grid: sortable, keyboard navigation and row hover from the Grid. */}
              <GridComponent
                id="lease-schedule-grid"
                dataSource={leaseRows}
                allowSorting={true}
                gridLines="Horizontal"
                // Tenant and Industry share what the fixed columns leave and wrap, so the seven columns fit
                // the card at 1440 px (fixed widths summed to 950 px in a 740 px card and hid Status).
                allowTextWrap={true}
                textWrapSettings={{ wrapMode: 'Content' }}
              >
                <ColumnsDirective>
                  <ColumnDirective field="tenantName" headerText="Tenant" />
                  <ColumnDirective field="suite" headerText="Suite" width="80" />
                  <ColumnDirective field="industry" headerText="Industry" />
                  <ColumnDirective field="leasedSquareFeet" headerText="Sq Ft" width="75" textAlign="Right" format="N0" />
                  <ColumnDirective field="annualRent" headerText="Annual Rent" width="105" textAlign="Right" format="C0" />
                  <ColumnDirective field="endDateValue" headerText="Expires" width="110" type="date" format="MMM d, y" />
                  <ColumnDirective field="status" headerText="Status" width="115" textAlign="Right" template={leaseStatusTemplate} />
                </ColumnsDirective>
                <Inject services={[Sort]} />
              </GridComponent>
          </PanelCard>
        </div>
      )}
    </div>
  );
};
