// Writes the Due Diligence Vault's five one-page sample documents: one per document type, shared by every record of that type, so each names no property.
// Plain PDF 1.4 with the standard Helvetica fonts; no dependencies. Run: node scripts/make-sample-documents.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('../public/documents/', import.meta.url);

const DOCS = [
  {
    file: 'phase-i-environmental-site-assessment.pdf',
    title: 'Phase I Environmental Site Assessment',
    standard: 'Prepared in accordance with ASTM E1527-21',
    sections: [
      ['1. Summary', ['No recognized environmental conditions (RECs) were identified at the subject property.',
        'One historical REC (former heating-oil tank, closed in place) requires no further action.']],
      ['2. Scope of work', ['Records review: federal, state and tribal databases; historical aerials and Sanborn maps.',
        'Site reconnaissance and interviews with the property manager and the local fire department.']],
      ['3. Findings', ['Adjoining sites: no listed releases within the approximate minimum search distance.',
        'Vapor encroachment screening: no vapor encroachment condition identified.']],
      ['4. Recommendations', ['No Phase II investigation is recommended at this time.']]
    ]
  },
  {
    file: 'structural-as-built-drawing-set.pdf',
    title: 'Structural As-Built Drawing Set',
    standard: 'Cover sheet and sheet index (drawings issued separately as DWG)',
    sections: [
      ['Sheet index', ['S-001  General notes, design criteria and abbreviations',
        'S-101  Foundation plan and footing schedule', 'S-201  Typical floor framing plan',
        'S-301  Roof framing plan', 'S-501  Sections and connection details']],
      ['Design criteria', ['Governing code: IBC 2021 with local amendments. Risk category II.',
        'Floor live load 50 psf (office) plus 15 psf partitions; roof live load 20 psf.']],
      ['Record notes', ['As-built conditions verified by field survey. Revisions are clouded and dated.']]
    ]
  },
  {
    file: 'gaap-audited-financial-statement.pdf',
    title: 'Audited Financial Statement (GAAP)',
    standard: 'Statement of operations, fiscal year 2025',
    sections: [
      ['Independent auditor\'s opinion', ['In our opinion, the financial statements present fairly, in all material respects,',
        'the financial position of the property entity in accordance with US GAAP.']],
      ['Statement of operations (USD)', ['Rental revenue ............................................. 18,420,000',
        'Recoveries and other income ............................. 2,115,000',
        'Operating expenses ........................................ (7,960,000)',
        'Net operating income ..................................... 12,575,000']],
      ['Notes', ['Revenue is recognized on a straight-line basis over each lease term (ASC 842).']]
    ]
  },
  {
    file: 'alta-land-title-survey.pdf',
    title: 'ALTA/NSPS Land Title Survey',
    standard: 'Surveyor\'s certificate and notes (survey drawing issued separately as DWG)',
    sections: [
      ['Certificate', ['This map or plat and the survey on which it is based were made in accordance with the',
        '2021 Minimum Standard Detail Requirements for ALTA/NSPS Land Title Surveys,',
        'including Items 1-4, 6(a), 7(a), 8, 9, 11(a), 13 and 16 of Table A.']],
      ['Survey notes', ['Flood zone: Zone X (area of minimal flood hazard).',
        'Easements listed in the title commitment are plotted where locatable.',
        'No evidence of recent earth moving, building construction or additions observed.']],
      ['Title commitment', ['Schedule B-II exceptions reviewed; no encroachments noted.']]
    ]
  },
  {
    file: 'master-tenant-lease-abstract.pdf',
    title: 'Master Tenant Lease Pack: Lease Abstract',
    standard: 'Key terms of the tenant leases in this pack',
    sections: [
      ['Key terms', ['Lease type: full-service gross with operating expense pass-through above base year.',
        'Annual escalation: fixed, as stated per lease. Security deposit: letter of credit.',
        'Renewal: one or two options of five years at 95% of fair market rent.']],
      ['Critical dates', ['Notice of renewal: 12 months before expiration.',
        'Rent commencement and expiration dates are listed per tenant in the rent roll.']],
      ['Estoppels and SNDAs', ['Tenant estoppel certificates and SNDAs received for leases over 10,000 square feet.']]
    ]
  }
];

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function page(doc) {
  const lines = [];
  let y = 742;
  const text = (font, size, x, s) => { lines.push(`BT /${font} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`); };
  lines.push('0.09 0.36 0.83 rg 0 752 612 40 re f'); // brand band
  lines.push('1 1 1 rg'); y = 766; text('F2', 11, 54, 'SAMPLE DOCUMENT  |  Real Estate Portfolio showcase');
  lines.push('0.07 0.09 0.15 rg'); y = 712; text('F2', 20, 54, doc.title);
  y -= 22; lines.push('0.29 0.33 0.4 rg'); text('F1', 11, 54, doc.standard);
  y -= 14; lines.push(`0.85 0.87 0.9 RG 54 ${y} m 558 ${y} l S`);
  for (const [heading, body] of doc.sections) {
    y -= 30; lines.push('0.07 0.09 0.15 rg'); text('F2', 12, 54, heading);
    lines.push('0.2 0.24 0.31 rg');
    for (const line of body) { y -= 17; text('F1', 10, 54, line); }
  }
  y = 60; lines.push('0.45 0.49 0.55 rg');
  text('F1', 9, 54, 'Illustrative sample for a software demonstration. Not a real report. The vault shows the record\'s file and property.');
  return lines.join('\n');
}

function pdf(doc) {
  const content = page(doc);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    `<< /Title (${esc(doc.title)} - sample) /Producer (make-sample-documents.mjs) >>`
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => { offsets.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

mkdirSync(OUT, { recursive: true });
for (const doc of DOCS) {
  const bytes = pdf(doc);
  writeFileSync(new URL(doc.file, OUT), bytes);
  console.log(`${doc.file}: ${bytes.length} bytes`);
}
