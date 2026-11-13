"use client";

// كل عمليات الإكسل في المتصفح، و exceljs يُحمّل فقط عند الحاجة.

async function loadExcel() {
  // نسخة المتصفح الجاهزة من exceljs (بدون وحدات Node)
  const mod = await import("exceljs/dist/exceljs.min.js");
  return (mod as unknown as { default?: typeof import("exceljs") }).default ?? mod;
}

function download(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface SheetColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
}

export async function exportSheet(opts: {
  filename: string;
  sheetName: string;
  columns: SheetColumn[];
  rows: Record<string, unknown>[];
  totalRow?: Record<string, unknown>;
}) {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  wb.creator = "نظام العيادات";
  const ws = wb.addWorksheet(opts.sheetName, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.columns = opts.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16, style: c.numFmt ? { numFmt: c.numFmt } : {} }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  header.alignment = { vertical: "middle", horizontal: "center" };
  header.height = 22;
  opts.rows.forEach((r) => ws.addRow(r));
  if (opts.totalRow) {
    const row = ws.addRow(opts.totalRow);
    row.font = { bold: true };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  }
  const buffer = await wb.xlsx.writeBuffer();
  download(buffer as ArrayBuffer, opts.filename);
}

export const IMPORT_COLUMNS: SheetColumn[] = [
  { header: "رقم الملف القديم", key: "fileNumber", width: 16 },
  { header: "الاسم", key: "name", width: 32 },
  { header: "الجنس", key: "gender", width: 10 },
  { header: "العمر", key: "age", width: 10 },
  { header: "الجوال", key: "phone", width: 16 },
  { header: "المبلغ", key: "amount", width: 14, numFmt: "#,##0" },
  { header: "ملاحظة", key: "note", width: 28 },
];

export async function downloadImportTemplate() {
  await exportSheet({
    filename: "قالب-استيراد-الأرصدة.xlsx",
    sheetName: "الأرصدة",
    columns: IMPORT_COLUMNS,
    rows: [
      { fileNumber: 15, name: "محمد أحمد علي الحميري", gender: "ذكر", age: 35, phone: "777123456", amount: 25000, note: "من الدفتر" },
      { fileNumber: "", name: "فاطمة صالح محمد العولقي", gender: "أنثى", age: 28, phone: "", amount: 10000, note: "" },
    ],
  });
}

/** يقرأ ملف إكسل ويرجع الأسطر كقيم خام (بدون الصف الأول) */
export async function readSheet(file: File): Promise<unknown[][]> {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const out: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const values: unknown[] = [];
    for (let c = 1; c <= 7; c++) {
      const v = row.getCell(c).value as unknown;
      // خلايا النص الغني أو المعادلات
      if (v && typeof v === "object") {
        const o = v as { result?: unknown; text?: unknown; richText?: { text: string }[] };
        values.push(o.result ?? o.text ?? (o.richText ? o.richText.map((t) => t.text).join("") : ""));
      } else values.push(v ?? "");
    }
    if (values.some((x) => String(x).trim() !== "")) out.push(values);
  });
  return out;
}
