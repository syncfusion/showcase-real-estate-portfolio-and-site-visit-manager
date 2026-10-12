import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockDataPath = path.resolve(__dirname, '../src/fixtures/mockData.json');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'));

test('Mock data fixtures integrity', async (t) => {
  await t.test('has 30 institutional properties with valid schemas and coordinates', () => {
    assert.equal(mockData.properties.length, 30);
    const requiredFields = [
      'id', 'name', 'code', 'assetClass', 'address', 'city', 'state', 'zipCode',
      'grossSquareFeet', 'rentableSquareFeet', 'occupancyRate', 'marketValuation',
      'netOperatingIncome', 'capitalizationRate', 'yearBuilt', 'leedCertification',
      'status', 'coordinates'
    ];
    for (const prop of mockData.properties) {
      // Counts about other records are counted from them, not stored.
      assert.equal(prop.activeLeaseCount, undefined, `Property ${prop.id} stores activeLeaseCount`);
      assert.equal(prop.pendingInspectionCount, undefined, `Property ${prop.id} stores pendingInspectionCount`);
      for (const field of requiredFields) {
        assert.ok(prop[field] !== undefined, `Property ${prop.id} missing ${field}`);
      }
      assert.ok(prop.grossSquareFeet > 0);
      assert.ok(prop.occupancyRate >= 0 && prop.occupancyRate <= 100);
      assert.ok(prop.marketValuation > 0);
      assert.ok(prop.netOperatingIncome > 0);
      assert.ok(prop.capitalizationRate > 0 && prop.capitalizationRate < 20);
      assert.ok(typeof prop.coordinates.latitude === 'number');
      assert.ok(typeof prop.coordinates.longitude === 'number');
      assert.ok(prop.yearBuilt >= 1900 && prop.yearBuilt <= 2026);
    }
  });

  await t.test('covers all 4 institutional asset classes', () => {
    const classes = new Set(mockData.properties.map(p => p.assetClass));
    assert.ok(classes.has('Office'), 'Must include Office properties');
    assert.ok(classes.has('Industrial'), 'Must include Industrial properties');
    assert.ok(classes.has('Retail'), 'Must include Retail properties');
    assert.ok(classes.has('Multi-Family'), 'Must include Multi-Family properties');
  });

  await t.test('has 120 commercial leases referencing valid properties', () => {
    assert.equal(mockData.leases.length, 120);
    const propIds = new Set(mockData.properties.map(p => p.id));
    for (const lease of mockData.leases) {
      assert.ok(propIds.has(lease.propertyId), `Lease ${lease.id} references invalid property ${lease.propertyId}`);
      assert.ok(lease.tenantName && lease.tenantName.trim().length > 0);
      assert.ok(lease.leasedSquareFeet > 0);
      assert.ok(lease.annualRent > 0);
      assert.ok(lease.rentPerSquareFoot > 0);
      assert.ok(new Date(lease.startDate).getTime() > 0);
      assert.ok(new Date(lease.endDate).getTime() > 0);
      assert.ok(new Date(lease.endDate).getTime() >= new Date(lease.startDate).getTime());
      // Lease status follows the end date (src/domain/derived.ts); a stored status could contradict it.
      assert.equal(lease.status, undefined, `Lease ${lease.id} stores a status`);
    }
  });

  await t.test('has 45 site visits referencing valid properties with valid workflow statuses', () => {
    assert.equal(mockData.siteVisits.length, 45);
    const validStatuses = new Set(['scheduled', 'in-progress', 'pending-report', 'cleared']);
    const propIds = new Set(mockData.properties.map(p => p.id));
    const counts = { scheduled: 0, 'in-progress': 0, 'pending-report': 0, cleared: 0 };
    for (const visit of mockData.siteVisits) {
      assert.ok(propIds.has(visit.propertyId), `SiteVisit ${visit.id} references invalid property ${visit.propertyId}`);
      assert.ok(validStatuses.has(visit.status), `Invalid status ${visit.status}`);
      counts[visit.status]++;
      assert.ok(new Date(visit.scheduledStart).getTime() > 0);
      assert.ok(new Date(visit.scheduledEnd).getTime() > 0);
      assert.ok(visit.inspectorEmail && visit.inspectorEmail.includes('@'));
    }
    for (const [status, count] of Object.entries(counts)) {
      assert.ok(count > 0, `Status ${status} has 0 visits`);
    }
    // 23 open visits across the board's three open columns, as on the Dashboard KPI.
    assert.equal(counts.scheduled + counts['in-progress'] + counts['pending-report'], 23);
  });

  await t.test('has 18 acquisition pipeline deals distributed across all 5 stages', () => {
    assert.equal(mockData.pipelineDeals.length, 18);
    const validStages = new Set(['sourcing', 'loi', 'due-diligence', 'underwriting', 'closing']);
    const foundStages = new Set();
    for (const deal of mockData.pipelineDeals) {
      assert.ok(validStages.has(deal.stage), `Invalid stage ${deal.stage}`);
      foundStages.add(deal.stage);
      assert.ok(deal.estimatedValuation > 0);
      assert.ok(deal.probability >= 0 && deal.probability <= 100);
      assert.ok(deal.projectedCapRate > 0 && deal.projectedCapRate < 20);
      assert.ok(new Date(deal.targetClosingDate).getTime() > 0);
    }
    assert.equal(foundStages.size, 5, 'All 5 stages must be populated in the pipeline');
  });

  await t.test('has due diligence files spanning multiple categories, linked to valid properties', () => {
    assert.ok(mockData.dueDiligenceFiles.length > 0);
    const validCategories = new Set(['Leases', 'Environmental', 'Architectural', 'Financial-Audits', 'Legal-Title']);
    const propIds = new Set(mockData.properties.map(p => p.id));
    const foundCats = new Set();
    for (const doc of mockData.dueDiligenceFiles) {
      assert.ok(propIds.has(doc.propertyId), `DueDiligenceFile ${doc.id} references invalid property ${doc.propertyId}`);
      assert.ok(validCategories.has(doc.category), `Invalid category ${doc.category}`);
      foundCats.add(doc.category);
      assert.ok(doc.fileSize > 0);
      assert.ok(doc.name.length > 0);
      assert.ok(['verified', 'in-review'].includes(doc.reviewStatus), `DueDiligenceFile ${doc.id} review status ${doc.reviewStatus}`);
      // A PDF opens its type's one-page sample served by the app; a DWG drawing has no preview.
      if (doc.fileType === 'dwg') assert.equal(doc.url, '', `DWG ${doc.name} has a url`);
      else assert.ok(doc.url.startsWith('documents/') && fs.existsSync(path.resolve(__dirname, '../public', doc.url)), `${doc.name} opens ${doc.url}`);
      assert.ok(doc.name.endsWith('.' + doc.fileType), `${doc.name} is not ${doc.fileType}`);
    }
    assert.ok(foundCats.size >= 4, 'Multiple due-diligence categories must be represented');
  });
});
