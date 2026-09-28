import { useMemo } from "react";
import { ArrowLeft, Download, LineChart, Network, ShoppingCart, Sun, Zap } from "lucide-react";
import { buildPvsystStudy } from "@/lib/pvsyst-engine";
import { downloadPvsystReport } from "@/lib/pvsyst-pdf";
import type { View } from "@/lib/present";

const nf = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

type Props = {
  study: NonNullable<View["study"]>;
  /** أزرار الشاشة المستقلة للدراسة (تُعرض فقط في الشاشة المستقلة) */
  actions?: { onBuy: () => void; onBackToQuote: () => void; onSld: () => void };
};

/** شاشة نتائج دراسة PVsyst: ملخص النظام، المؤشرات، الرسم البياني، جدول الإنتاجية، والفواقد. */
export default function PvsystStudy({ study, actions }: Props) {
  const result = useMemo(
    () =>
      buildPvsystStudy(study.params, {
        city: study.city,
        customer: study.customer,
        reference: study.number,
        monthlyConsumption: study.monthlyConsumption,
      }),
    [study],
  );

  if (!result) return null;
  const s = result.system;

  const specs: { label: string; value: string }[] = [];
  const spec = (label: string, value: string | null | undefined) => {
    if (value) specs.push({ label, value });
  };
  spec("قدرة المنظومة الشمسية", s.kwp ? `${nf(s.kwp, 2)} kWp` : null);
  spec("عدد الألواح", s.panelQty ? `${nf(s.panelQty)} لوح` : null);
  spec("قدرة اللوح الواحد", s.panelWp ? `${nf(s.panelWp)} وات` : null);
  spec("موديل الألواح", s.panelModel);
  spec("موديل الإنفرتر", s.invModel);
  spec("عدد الإنفرترات", s.invQty ? `${nf(s.invQty)}` : null);
  spec("إجمالي قدرة الإنفرترات", s.invTotalKw ? `${nf(s.invTotalKw, 1)} kW` : null);
  spec("نسبة القدرة Pnom ratio", s.pnomRatio ? `${nf(s.pnomRatio, 2)}` : null);
  spec("منظومة التخزين", s.batteryModel && s.batteryKwh ? `${s.batteryModel} — ${nf(s.batteryKwh, 2)} kWh` : null);
  spec("نوع المنظومة", s.sysMode);
  spec("نوع الطور", s.phase);
  spec("الموقع", result.city || null);
  spec(
    "الإحداثيات",
    s.latitude && s.longitude ? `${nf(s.latitude, 4)}°N , ${nf(s.longitude, 4)}°E` : s.latitude ? `${nf(s.latitude, 2)}°N` : null,
  );
  spec("الارتفاع عن سطح البحر", s.altitude ? `${nf(s.altitude)} م` : null);
  spec("زاوية الميل", s.tilt ? `${s.tilt}°` : null);
  spec("اتجاه الألواح", s.azimuth);

  const kpis: { label: string; value: string }[] = [];
  const kpi = (label: string, value: string | null) => {
    if (value) kpis.push({ label, value });
  };
  kpi("الإنتاج السنوي", result.annualEnergy ? `${nf(result.annualEnergy)} kWh` : null);
  kpi("الإنتاج النوعي", result.specificYield ? `${nf(result.specificYield)} kWh/kWp` : null);
  kpi("معامل الأداء PR", result.annualPr ? `${nf(result.annualPr * 100, 1)}%` : null);
  kpi("الإشعاع السنوي", result.annualIrradiation ? `${nf(result.annualIrradiation)} kWh/m²` : null);
  kpi("الطاقة المفقودة", result.losses ? `${nf(result.losses)} kWh` : null);
  kpi("تغطية الاستهلاك", result.coverage ? `${nf(result.coverage)}%` : null);

  const months = result.months;
  const maxEnergy = months.length ? Math.max(...months.map((m) => m.energy)) : 0;
  const minEnergy = months.length ? Math.min(...months.map((m) => m.energy)) : 0;
  // مقياس يبدأ من أقل شهر لإظهار الفروق الشهرية بوضوح
  const barHeight = (energy: number) =>
    maxEnergy <= minEnergy ? 100 : 35 + ((energy - minEnergy) / (maxEnergy - minEnergy)) * 65;
  const hasGhi = months.some((m) => m.ghi !== null);

  if (!specs.length && !months.length) return null;

  return (
    <section className={actions ? "" : "mt-3 rounded-lg border border-border bg-card p-3"}>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md bg-secondary text-skyline">
          <LineChart className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-black">دراسة المحاكاة الشمسية (PVsyst)</h3>
          <p className="text-[10px] text-muted-foreground">
            {result.reference ? `رقم الدراسة: ${result.reference}` : "تقرير أداء المنظومة"}
            {result.customer ? ` — العميل: ${result.customer}` : ""}
          </p>
        </div>
      </div>

      {specs.length > 0 && (
        <>
          <h4 className="mt-4 flex items-center gap-1.5 text-xs font-black text-skyline">
            <Zap className="size-3.5" /> ملخص النظام
          </h4>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map((row) => (
              <div key={row.label} className="rounded-md bg-muted/55 px-3 py-2">
                <dt className="text-[10px] text-muted-foreground">{row.label}</dt>
                <dd className="mt-1 text-xs font-bold break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {kpis.length > 0 && (
        <>
          <h4 className="mt-4 flex items-center gap-1.5 text-xs font-black text-skyline">
            <Sun className="size-3.5" /> أهم المؤشرات
          </h4>
          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-6">
            {kpis.map((item) => (
              <div key={item.label} className="rounded-md border border-border border-t-2 border-t-brand bg-card px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-black">{item.value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {months.length > 0 && (
        <>
          <h4 className="mt-4 text-xs font-black text-skyline">الإنتاجية الشهرية (kWh)</h4>
          <div className="mt-2 flex h-40 items-end gap-1 rounded-md bg-muted/40 p-2" dir="ltr">
            {months.map((m) => (
              <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[8px] font-bold text-muted-foreground">{nf(m.energy)}</span>
                <span
                  className="w-full rounded-t bg-brand"
                  style={{ height: `${barHeight(m.energy)}%` }}
                  title={`${m.month}: ${nf(m.energy)} kWh`}
                />
                <span className="text-[8px] font-bold">{m.month.slice(0, 3)}</span>
              </div>
            ))}
          </div>
          {result.bestMonth && result.worstMonth && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              أعلى شهر إنتاجاً: {result.bestMonth} — أدنى شهر إنتاجاً: {result.worstMonth}
            </p>
          )}

          <h4 className="mt-4 text-xs font-black text-skyline">جدول الإنتاجية الشهرية</h4>
          <div className="mt-2 -mx-1 overflow-x-auto px-1" data-quote-scroll>
            <table className="w-full min-w-[430px] border-collapse text-[11px]">
              <thead>
                <tr className="bg-brand text-brand-foreground">
                  <th className="border border-border px-2 py-1.5 font-black">الشهر</th>
                  {hasGhi && <th className="hidden border border-border px-2 py-1.5 font-black md:table-cell">الأفقي kWh/m²</th>}
                  <th className="border border-border px-2 py-1.5 font-black">الإشعاع kWh/m²</th>
                  <th className="hidden border border-border px-2 py-1.5 font-black sm:table-cell">الفعّال kWh/m²</th>
                  <th className="hidden border border-border px-2 py-1.5 font-black lg:table-cell">الحرارة °م</th>
                  <th className="border border-border px-2 py-1.5 font-black">الإنتاج kWh</th>
                  <th className="border border-border px-2 py-1.5 font-black">PR</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="odd:bg-muted/40">
                    <td className="border border-border px-2 py-1 text-center font-bold">{m.month}</td>
                    {hasGhi && (
                      <td className="hidden border border-border px-2 py-1 text-center md:table-cell">{m.ghi !== null ? nf(m.ghi, 1) : "—"}</td>
                    )}
                    <td className="border border-border px-2 py-1 text-center">{nf(m.irradiation, 1)}</td>
                    <td className="hidden border border-border px-2 py-1 text-center sm:table-cell">{nf(m.globEff, 1)}</td>
                    <td className="hidden border border-border px-2 py-1 text-center lg:table-cell">{nf(m.temp, 1)}</td>
                    <td className="border border-border px-2 py-1 text-center font-bold">{nf(m.energy)}</td>
                    <td className="border border-border px-2 py-1 text-center">{nf(m.pr * 100, 1)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-black">
                {result.annualEnergy && (
                  <tr className="bg-secondary">
                    <td className="border border-border px-2 py-1.5 text-center">الإجمالي السنوي</td>
                    <td className="border border-border px-2 py-1.5 text-center" colSpan={9}>{nf(result.annualEnergy)} kWh</td>
                  </tr>
                )}
                {result.monthlyAverage && (
                  <tr className="bg-secondary">
                    <td className="border border-border px-2 py-1.5 text-center">متوسط الإنتاج الشهري</td>
                    <td className="border border-border px-2 py-1.5 text-center" colSpan={9}>{nf(result.monthlyAverage)} kWh</td>
                  </tr>
                )}
                {result.annualPr && (
                  <tr className="bg-secondary">
                    <td className="border border-border px-2 py-1.5 text-center">معامل الأداء السنوي</td>
                    <td className="border border-border px-2 py-1.5 text-center" colSpan={9}>{nf(result.annualPr * 100, 1)}%</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </>
      )}

      {result.lossBreakdown.length > 0 && (
        <>
          <h4 className="mt-4 text-xs font-black text-skyline">تفصيل الفواقد السنوية</h4>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {result.lossBreakdown.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                <span className="text-[10px] font-semibold">{row.label}</span>
                <span className={`text-[11px] font-black ${row.percent < 0 ? "text-brand" : "text-energy"}`} dir="ltr">
                  {row.percent > 0 ? "+" : ""}{nf(row.percent * 100, 2)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {result.annualConsumption && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          الاستهلاك السنوي المُدخل: {nf(result.annualConsumption)} kWh
          {result.coverage ? ` — تغطية الطاقة الشمسية: ${nf(result.coverage)}%` : ""}
        </p>
      )}

      <button
        type="button"
        onClick={() => downloadPvsystReport(result)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-black text-brand-foreground shadow-md transition hover:opacity-90"
      >
        <Download className="size-4" />
        تحميل التقرير الكامل
      </button>

      {actions && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={actions.onBuy}
            className="flex items-center justify-center gap-2 rounded-full bg-energy px-4 py-3 text-sm font-black text-energy-foreground shadow-sm ring-1 ring-black/5 transition hover:opacity-90"
          >
            <ShoppingCart className="size-4" />
            متابعة الشراء
          </button>
          <button
            type="button"
            onClick={actions.onBackToQuote}
            className="flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-black text-brand-foreground shadow-sm ring-1 ring-black/5 transition hover:opacity-90"
          >
            <ArrowLeft className="size-4" />
            العودة لعرض السعر
          </button>
          <button
            type="button"
            onClick={actions.onSld}
            className="flex items-center justify-center gap-2 rounded-full bg-field px-4 py-3 text-sm font-black text-field-foreground shadow-sm ring-1 ring-black/5 transition hover:opacity-90"
          >
            <Network className="size-4" />
            مخطط SLD
          </button>
        </div>
      )}
    </section>
  );
}
