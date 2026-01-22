
import { Profile, ColumnMapping, FieldType } from "../types";
import * as XLSX from "xlsx";

/**
 * Advanced CSV Parser that respects quoted multiline fields.
 */
export function parseRawCSV(text: string): { headers: string[], rows: string[][] } {
  const result: string[][] = [];
  let row: string[] = [];
  let currField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currField.trim());
        currField = "";
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        if (char === '\r') i++;
        row.push(currField.trim());
        result.push(row);
        row = [];
        currField = "";
      } else if (char === '\r' && nextChar !== '\n') {
        row.push(currField.trim());
        result.push(row);
        row = [];
        currField = "";
      } else {
        currField += char;
      }
    }
  }
  
  if (row.length > 0 || currField) {
    row.push(currField.trim());
    result.push(row);
  }

  const headers = result[0] || [];
  const rows = result.slice(1);
  return { headers, rows };
}

/**
 * Reconstructs profiles from an enriched CSV export.
 */
export function parseEnrichedCSV(headers: string[], rows: string[][]): Profile[] {
  const h = headers.map(header => header.toLowerCase().replace(/["']/g, '').trim());
  
  const nameIdx = h.indexOf('name');
  const titleIdx = h.indexOf('title');
  const companyIdx = h.indexOf('company');
  const linkedinIdx = h.indexOf('linkedin');
  const regionIdx = h.indexOf('region');
  const expIdx = h.indexOf('years of experience');
  const backgroundIdx = h.indexOf('background');
  const respIdx = h.indexOf('responsibilities');
  const achieveIdx = h.indexOf('achievements');
  const skillsIdx = h.indexOf('skills');

  return rows.map((row, i) => {
    const skillsRaw = skillsIdx !== -1 ? row[skillsIdx] : '';
    // Handle double-quoted string list of skills e.g. "Skill A, Skill B"
    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(s => s) : [];

    return {
      id: `restored-${i}-${Date.now()}`,
      name: (nameIdx !== -1 ? row[nameIdx] : 'Unknown').replace(/^"|"$/g, ''),
      title: (titleIdx !== -1 ? row[titleIdx] : '').replace(/^"|"$/g, ''),
      company: (companyIdx !== -1 ? row[companyIdx] : '').replace(/^"|"$/g, ''),
      region: (regionIdx !== -1 ? row[regionIdx] : '').replace(/^"|"$/g, ''),
      linkedin_url: (linkedinIdx !== -1 ? row[linkedinIdx] : '').replace(/^"|"$/g, ''),
      years_of_experience: (expIdx !== -1 ? row[expIdx] : '').replace(/^"|"$/g, ''),
      background: (backgroundIdx !== -1 ? row[backgroundIdx] : '').replace(/^"|"$/g, ''),
      what_they_do: (respIdx !== -1 ? row[respIdx] : '').replace(/^"|"$/g, ''),
      achievements: (achieveIdx !== -1 ? row[achieveIdx] : '').replace(/^"|"$/g, ''),
      skills: skills,
      enrichment_status: 'success',
      enrichment_source: 'gemini_web',
      selected: true
    } as Profile;
  });
}

export function detectMappings(headers: string[], rows: string[][]): ColumnMapping[] {
  return headers.map((header, idx) => {
    const h = header.toLowerCase();
    let mappedTo: FieldType = 'ignore';
    let autoDetected = true;

    if (h.includes('name')) mappedTo = 'name';
    else if (h.includes('title') || h.includes('role')) mappedTo = 'title';
    else if (h.includes('company') || h.includes('work')) mappedTo = 'company';
    else if (h.includes('linkedin') || h.includes('profile')) mappedTo = 'linkedin_url';
    else if (h.includes('email')) mappedTo = 'email';
    else autoDetected = false;

    const preview = rows.slice(0, 3).map(r => r[idx] || '').filter(v => v !== '');

    return { header, mappedTo, preview, autoDetected };
  });
}

function cleanLumaGarbage(val: string): string {
  if (!val) return '';
  const lines = val.split(/\r?\n/);
  let cleaned = lines[0]
    .replace(/\[.*?\]/g, '')
    .replace(/has registered for.*/gi, '')
    .replace(/registered for your event/gi, '')
    .replace(/\|.*/g, '')
    .trim();

  const placeholders = ['n/a', 'na', 'none', '.', '0', 'not applicable', '#n/a'];
  if (placeholders.includes(cleaned.toLowerCase())) return '';
  
  return cleaned;
}

export function finalizeProfiles(mappings: ColumnMapping[], rows: string[][]): Profile[] {
  return rows.map((row, rowIdx) => {
    const profile: any = {
      id: `profile-${rowIdx}-${Date.now()}`,
      enrichment_status: 'pending',
      enrichment_source: 'none',
      selected: true
    };

    mappings.forEach((m, colIdx) => {
      if (m.mappedTo !== 'ignore') {
        const val = row[colIdx];
        if (m.mappedTo === 'name') {
           profile.name = cleanLumaGarbage(val) || 'Unknown Attendee';
        } else if (m.mappedTo === 'linkedin_url') {
           const match = val?.match(/https?:\/\/[^\s\]]+/);
           profile.linkedin_url = match ? match[0] : undefined;
        } else {
           profile[m.mappedTo] = cleanLumaGarbage(val);
        }
      }
    });

    return profile as Profile;
  });
}

export function exportToCSV(profiles: Profile[]): string {
  const headers = ['Name', 'Title', 'Company', 'Region', 'LinkedIn', 'Years of Experience', 'Background', 'Responsibilities', 'Achievements', 'Skills'];
  const rows = profiles.map(p => [
    `"${p.name.replace(/"/g, '""')}"`,
    `"${(p.title || '').replace(/"/g, '""')}"`,
    `"${(p.company || '').replace(/"/g, '""')}"`,
    `"${(p.region || '').replace(/"/g, '""')}"`,
    `"${(p.linkedin_url || '').replace(/"/g, '""')}"`,
    `"${(p.years_of_experience || '').replace(/"/g, '""')}"`,
    `"${(p.background || '').replace(/"/g, '""')}"`,
    `"${(p.what_they_do || '').replace(/"/g, '""')}"`,
    `"${(p.achievements || '').replace(/"/g, '""')}"`,
    `"${(p.skills || []).join(', ').replace(/"/g, '""')}"`
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function exportToJSON(profiles: Profile[]): string {
  return JSON.stringify(profiles, null, 2);
}

export function downloadXLSX(profiles: Profile[], filename: string) {
  const data = profiles.map(p => ({
    Name: p.name,
    Title: p.title,
    Company: p.company,
    Region: p.region,
    LinkedIn: p.linkedin_url,
    YearsOfExperience: p.years_of_experience,
    Background: p.background,
    Responsibilities: p.what_they_do,
    Achievements: p.achievements,
    Skills: (p.skills || []).join(', '),
    Status: p.enrichment_status,
    Source: p.enrichment_source
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Enriched Profiles");
  XLSX.writeFile(workbook, filename);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
