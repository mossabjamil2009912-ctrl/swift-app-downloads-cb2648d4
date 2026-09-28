import type { PvsystStudyResult } from "./pvsyst-engine";

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"]/g, (char) =>
    char === "&" ? "&amp;" : char === "<" ? "&lt;" : char === ">" ? "&gt;" : "&quot;",
  );
}

const nf = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

/** يبني تقرير دراسة PVsyst الكامل ويفتح نافذة الطباعة لحفظه بصيغة PDF. */
export function downloadPvsystReport(study: PvsystStudyResult) {
  if (typeof window === "undefined") return;
  const s = study.system;

  const specRows: string[] = [];
  const spec = (label: string, value: string | null) => {
    if (!value) return;
    specRows.push(`<tr><td class="lbl">${esc(label)}</td><td class="val">${esc(value)}</td></tr>`);
  };
  spec("قدرة المنظومة الشمسية", s.kwp ? `${nf(s.kwp, 2)} kWp` : null);
  spec("عدد الألواح", s.panelQty ? `${nf(s.panelQty)} لوح` : null);
  spec("قدرة اللوح", s.panelWp ? `${nf(s.panelWp)} وات` : null);
  spec("موديل الألواح", s.panelModel);
  spec("موديل الإنفرتر", s.invModel);
  spec("عدد الإنفرترات", s.invQty ? `${nf(s.invQty)}` : null);
  spec("إجمالي قدرة الإنفرترات", s.invTotalKw ? `${nf(s.invTotalKw, 1)} kW` : null);
  spec("نسبة القدرة Pnom ratio", s.pnomRatio ? `${nf(s.pnomRatio, 2)}` : null);
  spec("منظومة التخزين", s.batteryModel && s.batteryKwh ? `${s.batteryModel} — ${nf(s.batteryKwh, 2)} kWh` : null);
  spec("نوع المنظومة", s.sysMode);
  spec("نوع الطور", s.phase);
  spec("الموقع", study.city || null);
  spec("الإحداثيات", s.latitude && s.longitude ? `${nf(s.latitude, 4)}°N , ${nf(s.longitude, 4)}°E` : s.latitude ? `${nf(s.latitude, 2)}°N` : null);
  spec("الارتفاع عن سطح البحر", s.altitude ? `${nf(s.altitude)} م` : null);
  spec("زاوية الميل", s.tilt ? `${s.tilt}°` : null);
  spec("اتجاه الألواح", s.azimuth);

  const kpiCards: string[] = [];
  const kpi = (label: string, value: string | null) => {
    if (!value) return;
    kpiCards.push(`<div class="kpi"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`);
  };
  kpi("الإنتاج السنوي", study.annualEnergy ? `${nf(study.annualEnergy)} kWh` : null);
  kpi("الإنتاج النوعي", study.specificYield ? `${nf(study.specificYield)} kWh/kWp` : null);
  kpi("معامل الأداء PR", study.annualPr ? `${nf(study.annualPr * 100, 1)} %` : null);
  kpi("الإشعاع السنوي على الألواح", study.annualIrradiation ? `${nf(study.annualIrradiation)} kWh/m²` : null);
  kpi("الطاقة المفقودة", study.losses ? `${nf(study.losses)} kWh` : null);
  kpi("تغطية الاستهلاك", study.coverage ? `${nf(study.coverage)} %` : null);

  const hasMonths = study.months.length === 12;
  const hasGhi = study.months.some((m) => m.ghi !== null);
  const maxEnergy = hasMonths ? Math.max(...study.months.map((m) => m.energy)) : 0;
  const minEnergy = hasMonths ? Math.min(...study.months.map((m) => m.energy)) : 0;

  const tableRows = study.months
    .map(
      (m) => `<tr>
      <td class="c">${esc(m.month)}</td>
      ${hasGhi ? `<td class="c">${m.ghi !== null ? nf(m.ghi, 1) : "—"}</td><td class="c">${m.dhi !== null ? nf(m.dhi, 1) : "—"}</td>` : ""}
      <td class="c">${nf(m.irradiation, 1)}</td>
      <td class="c">${nf(m.globEff, 1)}</td>
      <td class="c">${nf(m.temp, 1)}</td>
      <td class="c">${nf(m.eArray)}</td>
      <td class="c">${nf(m.energy)}</td>
      <td class="c">${nf(m.pr * 100, 1)}%</td>
    </tr>`,
    )
    .join("");

  const colSpan = hasGhi ? 8 : 6;

  const lossRows = study.lossBreakdown
    .map(
      (row) =>
        `<tr><td class="lbl">${esc(row.label)}</td><td class="c">${row.percent > 0 ? "+" : ""}${nf(row.percent * 100, 2)}%</td><td class="c">${row.energy !== null ? `${nf(row.energy)} kWh` : "—"}</td></tr>`,
    )
    .join("");

  const bars = study.months
    .map((m) => {
      const h = maxEnergy <= minEnergy ? 100 : Math.round(35 + ((m.energy - minEnergy) / (maxEnergy - minEnergy)) * 65);
      return `<div class="bwrap"><span class="bv">${nf(m.energy)}</span><span class="bar" style="height:${h}%"></span><span class="bm">${esc(m.month.slice(0, 3))}</span></div>`;
    })
    .join("");

  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>${esc(`تقرير دراسة PVsyst ${study.reference || "ACTES"}`)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:14px}
  .head{display:flex;justify-content:space-between;align-items:center;gap:16px;border:2px solid #000;padding:10px 12px}
  .head p{margin:0}
  .t1{font-weight:900;font-size:15px}
  .t2{font-weight:700;font-size:11px;color:#e8202a}
  .meta{text-align:left;font-size:11px;font-weight:700;line-height:1.7}
  /* ألوان الخلفيات تُطبع كما هي، وكل عنصر مهم له حدود تظهر حتى بدون طباعة الخلفيات */
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  h2{font-size:13px;margin:15px 0 6px;padding:4px 2px;color:#e8202a;border-bottom:2px solid #e8202a}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border:1px solid #444;padding:4px 5px}
  thead th{background:#f0f0f0;color:#111;text-align:center;font-weight:900;font-size:10px}
  tr{page-break-inside:avoid}
  .c{text-align:center;font-weight:700}
  .lbl{background:#f6f6f6;font-weight:700;width:40%}
  .val{font-weight:700}
  tfoot td{background:#eaeaea;font-weight:900;text-align:center}
  .kpis{display:flex;flex-wrap:wrap;gap:8px}
  .kpi{flex:1 1 150px;border:1px solid #444;border-top:3px solid #e8202a;padding:7px 9px}
  .kpi small{display:block;font-size:10px;color:#444}
  .kpi strong{display:block;font-size:14px;margin-top:3px}
  .chart{display:flex;align-items:flex-end;gap:6px;height:170px;border:1px solid #444;padding:8px;direction:ltr;page-break-inside:avoid}
  .bwrap{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%}
  .bar{display:block;width:100%;background:#e8202a;border:1px solid #8c1218}
  .bv{font-size:8px;font-weight:700;margin-bottom:2px}
  .bm{font-size:8.5px;margin-top:3px;font-weight:700}
  .note{font-size:10px;color:#444;margin-top:6px;line-height:1.6}
  @page{size:A4;margin:11mm}
</style></head><body>
<div class="head">
  <div><p class="t1">أكتس لأنظمة الطاقة وحلولها</p><p class="t2">تقرير دراسة المحاكاة الشمسية PVsyst</p></div>
  <div class="meta">
    <p>رقم الدراسة: ${esc(study.reference || "—")}</p>
    <p>العميل: ${esc(study.customer || "—")}</p>
    <p>الموقع: ${esc(study.city || "—")}</p>
    <p>التاريخ: ${esc(new Date().toISOString().slice(0, 10))}</p>
  </div>
</div>

${specRows.length ? `<h2>أولاً: ملخص مواصفات المنظومة</h2><table><tbody>${specRows.join("")}</tbody></table>` : ""}

${kpiCards.length ? `<h2>ثانياً: أهم مؤشرات الأداء</h2><div class="kpis">${kpiCards.join("")}</div>` : ""}

${
  hasMonths
    ? `<h2>ثالثاً: جدول الإنتاجية الشهرية</h2>
<table>
  <thead><tr><th>الشهر</th>${hasGhi ? "<th>الإشعاع الأفقي GlobHor</th><th>الإشعاع المنتشر DiffHor</th>" : ""}<th>الإشعاع على الألواح GlobInc</th><th>الإشعاع الفعّال GlobEff</th><th>الحرارة °م</th><th>مخرج المصفوفة EArray</th><th>الطاقة المنتجة kWh</th><th>PR</th></tr></thead>
  <tbody>${tableRows}</tbody>
  <tfoot>
    <tr><td>الإجمالي السنوي</td><td colspan="${colSpan}">${study.annualEnergy ? `${nf(study.annualEnergy)} kWh` : "—"}</td></tr>
    <tr><td>متوسط الإنتاج الشهري</td><td colspan="${colSpan}">${study.monthlyAverage ? `${nf(study.monthlyAverage)} kWh` : "—"}</td></tr>
    <tr><td>معامل الأداء السنوي</td><td colspan="${colSpan}">${study.annualPr ? `${nf(study.annualPr * 100, 1)} %` : "—"}</td></tr>
  </tfoot>
</table>
<h2>رابعاً: مخطط الإنتاجية الشهرية</h2>
<div class="chart">${bars}</div>`
    : ""
}
${
  lossRows
    ? `<h2>خامساً: تفصيل الفواقد السنوية</h2>
<table><thead><tr><th>بند الفاقد</th><th>النسبة</th><th>الطاقة</th></tr></thead><tbody>${lossRows}</tbody></table>`
    : ""
}
${study.annualConsumption ? `<p class="note">الاستهلاك السنوي المدخل: ${nf(study.annualConsumption)} kWh${study.coverage ? ` — نسبة التغطية بالطاقة الشمسية: ${nf(study.coverage)}%` : ""}</p>` : ""}
<p class="note">حُسبت النتائج من بيانات الإشعاع الشمسي الشهري (Meteonorm) لموقع المشروع على مستوى الألواح، مع سلسلة الفواقد الكاملة: التظليل والغبار وزاوية السقوط IAM وانعكاس الأرض والحرارة وجودة الوحدات والتدهور الضوئي LID وعدم التطابق وأسلاك التيار المستمر وكفاءة الإنفرتر وفواقد النظام. أعدّ التقرير قسم الهندسة — أكتس لأنظمة الطاقة وحلولها.</p>
<script>window.onload=function(){window.focus();window.print();};</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
