import { sessionStore } from '@/services/sessionStore';
import { DEMO_TODAY, LEASE_EXPIRY_WARNING_MONTHS, isOpenVisit, leaseStatus } from '@/domain/derived';

export interface AdvisorResponse {
  markdown: string;
  timestamp: string;
}

/**
 * Local deterministic heuristic engine — no external network calls.
 * Analyzes current session state to surface grounded portfolio insights.
 */
export function runAdvisorQuery(prompt: string): AdvisorResponse {
  const state = sessionStore.getState();
  const lowerPrompt = prompt.toLowerCase();

  let markdown = '';

  if (lowerPrompt.includes('overdue') || lowerPrompt.includes('inspection') || lowerPrompt.includes('audit')) {
    const highPriorityOpen = state.siteVisits.filter(
      (v) => v.priority === 'High' && isOpenVisit(v)
    );
    markdown = `### Inspection Risk Summary\n\nThere are **${highPriorityOpen.length} high-priority inspections** currently open across the portfolio.\n\n${highPriorityOpen
      .slice(0, 5)
      .map((v) => `- **${v.propertyName}** — ${v.type} (${v.status}), inspector ${v.inspectorName}`)
      .join('\n')}\n\nRecommendation: prioritize dispatch confirmation for structural audits within 10 business days to avoid lender covenant delays.`;
  } else if (lowerPrompt.includes('walt') || lowerPrompt.includes('lease') || lowerPrompt.includes('expir')) {
    // Soonest end date first, and name the property: tenants lease suites in several buildings.
    const expiringSoon = state.leases
      .filter((l) => leaseStatus(l) === 'Expiring-Soon')
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
    const propertyName = (id: string) => state.properties.find((p) => p.id === id)?.name ?? id;
    const totalRentAtRisk = expiringSoon.reduce((acc, l) => acc + l.annualRent, 0);
    markdown = `### Lease Expiration Exposure\n\n**${expiringSoon.length} leases** end within ${LEASE_EXPIRY_WARNING_MONTHS} months of ${DEMO_TODAY}, representing **$${(
      totalRentAtRisk / 1_000_000
    ).toFixed(1)}M** in annual rent at renewal risk.\n\n${expiringSoon
      .slice(0, 5)
      .map((l) => `- ${l.tenantName}, ${propertyName(l.propertyId)} (${l.suite}) — ends ${l.endDate}, $${(l.annualRent / 1000).toFixed(0)}K/yr`)
      .join('\n')}\n\nRecommendation: initiate renewal conversations with tenants representing >$500K annual rent at least 12 months before term expiration.`;
  } else if (lowerPrompt.includes('pipeline') || lowerPrompt.includes('deal') || lowerPrompt.includes('acquisition')) {
    const closingDeals = state.pipelineDeals.filter((d) => d.stage === 'closing' || d.stage === 'underwriting');
    const totalValue = closingDeals.reduce((acc, d) => acc + d.estimatedValuation, 0);
    markdown = `### Acquisition Pipeline Momentum\n\n**${closingDeals.length} deals** are in Underwriting or Closing stages, totaling **$${(
      totalValue / 1_000_000
    ).toFixed(0)}M** in projected transaction volume.\n\n${closingDeals
      .slice(0, 5)
      .map((d) => `- ${d.dealName} — ${d.stage}, ${d.probability}% probability, target close ${d.targetClosingDate}`)
      .join('\n')}\n\nRecommendation: confirm capital allocation readiness for deals above 80% probability closing within 60 days.`;
  } else if (lowerPrompt.includes('occupancy') || lowerPrompt.includes('vacan')) {
    const lowOccupancy = state.properties
      .filter((p) => p.occupancyRate < 90)
      .sort((a, b) => a.occupancyRate - b.occupancyRate);
    markdown = `### Occupancy Risk Properties\n\n**${lowOccupancy.length} properties** are below the 90% occupancy threshold.\n\n${lowOccupancy
      .slice(0, 5)
      .map((p) => `- ${p.name} (${p.city}) — ${p.occupancyRate}% occupied, ${p.status}`)
      .join('\n')}\n\nRecommendation: evaluate leasing incentive packages for Value-Add assets trending below stabilization targets.`;
  } else {
    const summary = sessionStore.getPortfolioSummary();
    markdown = `### Portfolio Snapshot\n\nCurrent session holds **${summary.totalProperties} properties** valued at **$${(
      summary.totalValuation / 1_000_000_000
    ).toFixed(2)}B**, with **${summary.averageOccupancy}%** weighted occupancy and **$${(
      summary.totalNOI / 1_000_000
    ).toFixed(1)}M** annual NOI.\n\nTry asking about: overdue inspections, lease expirations, pipeline deals, or occupancy risk.`;
  }

  return {
    markdown,
    timestamp: new Date().toISOString()
  };
}
