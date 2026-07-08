// lib/reportExport.ts
// Turn a ReportData snapshot into a shareable Excel / CSV / PDF file on device.
// Native counterpart of the web app's lib/reportExport.ts: writes the file to a
// cache path, then opens the OS share sheet (expo-sharing).
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import type { ReportData } from './services/reports';
import { fmtDateShort as fmtDate } from './format';

export type ReportFormat = 'excel' | 'csv' | 'pdf';

const money = (code: string, n?: number | null) =>
    `${code} ${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ymd = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const fileBase = (d: ReportData) => `RotoPay-Report_${ymd(d.period.start)}_${ymd(d.period.end)}`;

const summaryRows = (d: ReportData): [string, string][] => [
    ['Period', `${fmtDate(d.period.start)} – ${fmtDate(d.period.end)} (${d.period.months} month${d.period.months > 1 ? 's' : ''})`],
    ['Global currency', d.currency],
    ['Native currency', d.nativeCurrency],
    ['Rate', d.rate == null ? 'unavailable' : `1 ${d.currency} = ${d.rate} ${d.nativeCurrency}`],
    ['Total shifts', String(d.totals.shifts)],
    ['Total hours', `${d.totals.hours}h`],
    ['Amount earned', money(d.currency, d.totals.earned)],
    ['Native amount earned', d.totals.nativeEarned == null ? '—' : money(d.nativeCurrency, d.totals.nativeEarned)],
    ['Wages recorded', String(d.totals.wages)],
    ['Payments total', money(d.currency, d.totals.paidTotal)],
];

// ── CSV ─────────────────────────────
function csvCell(v: string | number): string {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csvRow = (cells: (string | number)[]) => cells.map(csvCell).join(',');

function toCSV(d: ReportData): string {
    const lines: string[] = ['RotoPay Report'];
    for (const [k, v] of summaryRows(d)) lines.push(csvRow([k, v]));
    lines.push('', 'Shifts', csvRow(['Date', 'Name', 'Type', 'Hours', `Earned (${d.currency})`]));
    for (const s of d.shifts) lines.push(csvRow([fmtDate(s.date), s.name, s.type, s.hours, s.earned]));
    lines.push('', 'Wages', csvRow(['Shift', 'Employee', 'Rate type', 'Currency', 'Value']));
    for (const w of d.wages) lines.push(csvRow([w.shift, w.employee, w.rateType, w.currency, w.value]));
    lines.push('', 'Payments', csvRow(['Month', `Amount (${d.currency})`]));
    for (const p of d.payments) lines.push(csvRow([p.label, p.amount]));
    return lines.join('\n');
}

// ── Excel (SheetJS) ─────────────────
function toWorkbookBase64(d: ReportData): string {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['RotoPay Report'], [], ...summaryRows(d)]), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        d.shifts.map((s) => ({ Date: fmtDate(s.date), Name: s.name, Type: s.type, Hours: s.hours, [`Earned (${d.currency})`]: s.earned }))
    ), 'Shifts');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        d.wages.map((w) => ({ Shift: w.shift, Employee: w.employee, 'Rate type': w.rateType, Currency: w.currency, Value: w.value }))
    ), 'Wages');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        d.payments.map((p) => ({ Month: p.label, [`Amount (${d.currency})`]: p.amount }))
    ), 'Payments');
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

// ── PDF (HTML → expo-print) ─────────
function esc(s: string | number): string {
    return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}
function toHTML(d: ReportData): string {
    const summary = summaryRows(d).map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
    const shiftRows = d.shifts.map((s) => `<tr><td>${esc(fmtDate(s.date))}</td><td>${esc(s.name)}</td><td>${esc(s.type)}</td><td>${esc(s.hours)}</td><td>${esc(s.earned.toLocaleString())}</td></tr>`).join('');
    const wageRows = d.wages.map((w) => `<tr><td>${esc(w.shift)}</td><td>${esc(w.employee)}</td><td>${esc(w.rateType)}</td><td>${esc(w.currency)}</td><td>${esc(w.value.toLocaleString())}</td></tr>`).join('');
    const payRows = d.payments.map((p) => `<tr><td>${esc(p.label)}</td><td>${esc(p.amount.toLocaleString())}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{font-family:-apple-system,Roboto,Helvetica,sans-serif;color:#1b1c1c;padding:24px;}
    h1{color:#2563eb;margin:0 0 4px;font-size:22px;} .sub{color:#707783;font-size:12px;margin:0 0 16px;}
    h2{color:#2563eb;font-size:14px;margin:20px 0 6px;}
    table{width:100%;border-collapse:collapse;font-size:11px;} td,th{border:1px solid #e4e2e2;padding:6px 8px;text-align:left;}
    th{background:#2563eb;color:#fff;} td.k{font-weight:700;color:#2563eb;width:40%;}
    </style></head><body>
    <h1>RotoPay Report</h1><p class="sub">${esc(fmtDate(d.period.start))} – ${esc(fmtDate(d.period.end))}</p>
    <table>${summary}</table>
    <h2>Shifts</h2><table><tr><th>Date</th><th>Name</th><th>Type</th><th>Hours</th><th>Earned (${esc(d.currency)})</th></tr>${shiftRows}</table>
    <h2>Wages</h2><table><tr><th>Shift</th><th>Employee</th><th>Rate</th><th>Cur</th><th>Value</th></tr>${wageRows}</table>
    ${d.payments.length ? `<h2>Payments</h2><table><tr><th>Month</th><th>Amount (${esc(d.currency)})</th></tr>${payRows}</table>` : ''}
    </body></html>`;
}

async function shareUri(uri: string) {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
}

export async function exportReport(data: ReportData, format: ReportFormat): Promise<void> {
    const base = fileBase(data);
    if (format === 'pdf') {
        const { uri } = await Print.printToFileAsync({ html: toHTML(data) });
        await shareUri(uri);
        return;
    }
    if (format === 'csv') {
        const uri = `${FileSystem.cacheDirectory}${base}.csv`;
        await FileSystem.writeAsStringAsync(uri, toCSV(data), { encoding: FileSystem.EncodingType.UTF8 });
        await shareUri(uri);
        return;
    }
    // excel
    const uri = `${FileSystem.cacheDirectory}${base}.xlsx`;
    await FileSystem.writeAsStringAsync(uri, toWorkbookBase64(data), { encoding: FileSystem.EncodingType.Base64 });
    await shareUri(uri);
}
