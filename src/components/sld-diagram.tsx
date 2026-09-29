import { useMemo, useRef, useState } from "react";
import { Download, Minus, Move, Network, Plus, RotateCcw } from "lucide-react";
import { buildSld, type SldModel } from "@/lib/sld-engine";
import { downloadSldSheet } from "@/lib/sld-pdf";
import logoAsset from "@/assets/actes-logo-sld.png.asset.json";

/**
 * ألوان الرسم الكهربائي القياسية (IEC): ليست ألوان واجهة بل دلالات هندسية
 * ثابتة على الورق وعلى الشاشة (DC / AC / Earth / Comm).
 */
const C = {
  dc: "#b4231f",
  dcN: "#1b1b1b",
  ac: "#0f3f9e",
  earth: "#1a8a2a",
  ink: "#111111",
  frame: "#111111",
  soft: "#6b7280",
  fill: "#ffffff",
  band: "#eef2f7",
  brand: "#e2231a",
};

const F = "'Segoe UI', 'Tahoma', sans-serif";

type Props = { params: Record<string, unknown> | null; number?: string };

/** رمز لوح شمسي قياسي. */
function PvSymbol({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={C.fill} stroke={C.ink} strokeWidth={1.4} />
      <line x1={x} y1={y} x2={x + w} y2={y + h} stroke={C.ink} strokeWidth={1} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={C.ink} strokeWidth={0.8} />
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={C.ink} strokeWidth={0.8} />
    </g>
  );
}

/** رمز قاطع دائرة (Circuit Breaker). */
function BreakerSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={y - 12} x2={x} y2={y - 5} stroke={C.ink} strokeWidth={1.4} />
      <line x1={x} y1={y - 5} x2={x + 9} y2={y + 8} stroke={C.ink} strokeWidth={1.6} />
      <line x1={x} y1={y + 6} x2={x} y2={y + 13} stroke={C.ink} strokeWidth={1.4} />
      <path d={`M ${x - 5} ${y + 6} l 10 0`} stroke={C.ink} strokeWidth={1.4} fill="none" />
    </g>
  );
}

/** رمز فيوز (Fuse). */
function FuseSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 4} y={y - 9} width={8} height={18} fill={C.fill} stroke={C.ink} strokeWidth={1.3} />
      <line x1={x} y1={y - 9} x2={x} y2={y + 9} stroke={C.ink} strokeWidth={1.1} />
    </g>
  );
}

/** رمز مانع صواعق (SPD). */
function SpdSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 6} y={y - 9} width={12} height={18} fill={C.fill} stroke={C.ink} strokeWidth={1.3} />
      <path d={`M ${x - 3} ${y - 5} l 5 5 l -5 5`} stroke={C.ink} strokeWidth={1.3} fill="none" />
      <line x1={x} y1={y + 9} x2={x} y2={y + 15} stroke={C.earth} strokeWidth={1.3} />
    </g>
  );
}

/** رمز بطارية (خلايا متعددة). */
function BatterySymbol({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <line x1={x + i * 12} y1={y - 11} x2={x + i * 12} y2={y + 11} stroke={C.ink} strokeWidth={2} />
          <line x1={x + i * 12 + 6} y1={y - 6} x2={x + i * 12 + 6} y2={y + 6} stroke={C.ink} strokeWidth={1.2} />
        </g>
      ))}
    </g>
  );
}

/** رمز تأريض قياسي. */
function EarthSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={C.earth} strokeWidth={1.8}>
      <line x1={x - 13} y1={y} x2={x + 13} y2={y} />
      <line x1={x - 8} y1={y + 5} x2={x + 8} y2={y + 5} />
      <line x1={x - 4} y1={y + 10} x2={x + 4} y2={y + 10} />
    </g>
  );
}

/** صندوق مكوّن هندسي بعنوان وأسطر مواصفات. */
function Block({
  x, y, w, h, title, lines, accent,
}: { x: number; y: number; w: number; h: number; title: string; lines: string[]; accent: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={C.fill} stroke={C.frame} strokeWidth={1.6} />
      <rect x={x} y={y} width={w} height={16} fill={C.band} stroke={C.frame} strokeWidth={1.2} />
      <rect x={x} y={y} width={3} height={h} fill={accent} />
      <text x={x + w / 2} y={y + 12} textAnchor="middle" fontFamily={F} fontSize={9.5} fontWeight={700} fill={C.ink}>
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={i} x={x + 6} y={y + 30 + i * 12} fontFamily={F} fontSize={8.6} fill={C.ink}>
          {l}
        </text>
      ))}
    </g>
  );
}

/** نص تسمية كابل على المسار. */
function WireTag({ x, y, text: label, color }: { x: number; y: number; text: string; color: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontFamily={F} fontSize={8} fontWeight={700} fill={color}>
      {label}
    </text>
  );
}

/** يرسم المخطط الأحادي الكامل داخل عنصر SVG واحد. */
export function SldSvg({ m }: { m: SldModel }) {
  const W = 1240;
  const drawnStrings = Math.min(m.pv?.strings || 1, 4);
  const pvTop = 52;
  const rowH = 44;
  const pvH = drawnStrings * rowH;
  const busY = pvTop + pvH / 2;
  const batY = busY + 150;
  const bottom = Math.max(busY + 120, batY + 70);
  const earthY = bottom + 40;
  const H = earthY + 46;

  const xPv = 24;
  const wPv = 180;
  const xDc = 250;
  const wDc = 132;
  const xInv = 430;
  const wInv = 168;
  const xAc = 650;
  const wAc = 140;
  const xAts = 840;
  const wAts = 128;
  const xOut = 1016;
  const wOut = 200;

  const invY = busY - 46;
  const invH = 92;

  const pv = m.pv;
  const dc = m.dcBox;
  const inv = m.inverter;
  const bat = m.battery;
  const ac = m.acBox;

  // نقطة مخرج الألواح / مدخل الإنفرتر بحسب وجود لوحة الـ DC
  const dcOutX = dc ? xDc + wDc : xPv + wPv;
  const dcY = busY;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Single Line Diagram" style={{ background: C.fill }}>
      <defs>
        <marker id="sld-arrow" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={C.ac} />
        </marker>
      </defs>

      {/* ── جانب التيار المستمر: سلاسل الألواح ───────────────────────────── */}
      {pv && (
        <>
          <text x={xPv} y={pvTop - 14} fontFamily={F} fontSize={10} fontWeight={700} fill={C.dc}>
            DC SIDE — PV ARRAY {pv.kwp ? `${pv.kwp.toFixed(2)} kWp` : ""}
          </text>
          {Array.from({ length: drawnStrings }).map((_, i) => {
            const y = pvTop + i * rowH + 8;
            return (
              <g key={i}>
                {[0, 1, 2].map((k) => (
                  <PvSymbol key={k} x={xPv + k * 30} y={y} w={26} h={22} />
                ))}
                <text x={xPv + 96} y={y + 15} fontFamily={F} fontSize={8.4} fill={C.ink}>
                  {`String ${i + 1} — ${pv.perString} × ${pv.wp} Wp`}
                </text>
                <line x1={xPv + wPv - 36} y1={y + 11} x2={dc ? xDc : xInv} y2={y + 11} stroke={C.dc} strokeWidth={1.5} />
                {pv.strings > drawnStrings && i === drawnStrings - 1 && (
                  <text x={xPv} y={y + 34} fontFamily={F} fontSize={8.4} fontStyle="italic" fill={C.soft}>
                    {`typical — total ${pv.strings} strings × ${pv.perString} modules (${pv.qty} modules)`}
                  </text>
                )}
              </g>
            );
          })}
          <text x={xPv} y={pvTop + pvH + 24} fontFamily={F} fontSize={8.4} fill={C.soft}>
            {`${pv.model}${pv.strVoc ? ` — Voc/string ${Math.round(pv.strVoc)} V` : ""}${pv.strVmp ? ` / Vmp ${Math.round(pv.strVmp)} V` : ""}`}
          </text>
        </>
      )}

      {/* ── لوحة حماية الـ DC (فقط إذا كانت ضمن الأصناف) ──────────────────── */}
      {dc && (
        <>
          <Block
            x={xDc}
            y={pvTop}
            w={wDc}
            h={pvH + 8}
            title="DC PROTECTION BOARD"
            lines={[`${dc.ways} Way`, `Fuse ${dc.fuseA} A / 1000 V DC`, "DC Isolator", dc.hasSpd ? "DC SPD Type 2" : ""].filter(Boolean)}
            accent={C.dc}
          />
          {Array.from({ length: drawnStrings }).map((_, i) => (
            <FuseSymbol key={i} x={xDc + wDc - 20} y={pvTop + i * rowH + 19} />
          ))}
          <SpdSymbol x={xDc + 22} y={pvTop + pvH - 8} />
          <line x1={xDc + wDc} y1={dcY} x2={xInv} y2={dcY} stroke={C.dc} strokeWidth={2} />
        </>
      )}
      {!dc && pv && inv && <line x1={xPv + wPv} y1={dcY} x2={xInv} y2={dcY} stroke={C.dc} strokeWidth={2} />}
      {m.cables[0] && <WireTag x={(dcOutX + xInv) / 2} y={dcY - 6} text={m.cables.find((c) => /MPPT/.test(c.route))?.tag || "W1"} color={C.dc} />}

      {/* ── الإنفرتر ─────────────────────────────────────────────────────── */}
      {inv && (
        <>
          <Block
            x={xInv}
            y={invY}
            w={wInv}
            h={invH}
            title={inv.phase3 ? "PV INVERTER — 3PH" : "PV INVERTER — 1PH"}
            lines={[
              `${inv.qty} × ${inv.kw} kW = ${inv.totalKw} kW`,
              inv.mppt ? `MPPT inputs: ${inv.mppt}` : "",
              inv.mpptRange ? `MPPT: ${inv.mpptRange}` : "",
              inv.vbat ? `BAT port: ${inv.vbat} V DC` : "",
            ].filter(Boolean)}
            accent={C.ac}
          />
          <text x={xInv + wInv / 2} y={invY + invH + 12} textAnchor="middle" fontFamily={F} fontSize={8.2} fill={C.soft}>
            {inv.model}
          </text>
          <text x={xInv - 4} y={dcY - 4} textAnchor="end" fontFamily={F} fontSize={7.6} fill={C.dc}>DC IN</text>
          <text x={xInv + wInv + 4} y={dcY - 4} fontFamily={F} fontSize={7.6} fill={C.ac}>AC OUT</text>
        </>
      )}

      {/* ── بنك البطاريات (فقط إذا كانت ضمن الأصناف) ──────────────────────── */}
      {bat && inv && (
        <>
          <Block
            x={xInv - 210}
            y={batY - 30}
            w={176}
            h={72}
            title="BATTERY BANK"
            lines={[
              `${bat.qty} × ${bat.kwh} kWh = ${bat.totalKwh} kWh`,
              bat.vdc ? `Nominal ${bat.vdc} V DC` : "",
              bat.current ? `Max current ≈ ${bat.current} A` : "",
            ].filter(Boolean)}
            accent={C.dc}
          />
          <BatterySymbol x={xInv - 196} y={batY + 32} />
          <text x={xInv - 210} y={batY + 58} fontFamily={F} fontSize={8} fill={C.soft}>{bat.model}</text>
          {m.batBox ? (
            <>
              <Block x={xInv - 8} y={batY - 22} w={100} h={56} title="BATTERY BOX" lines={[m.batBox.rating]} accent={C.dc} />
              <line x1={xInv - 34} y1={batY} x2={xInv - 8} y2={batY} stroke={C.dc} strokeWidth={2} />
              <line x1={xInv + 92} y1={batY} x2={xInv + wInv / 2} y2={batY} stroke={C.dc} strokeWidth={2} />
              <BreakerSymbol x={xInv + 42} y={batY + 4} />
            </>
          ) : (
            <>
              <line x1={xInv - 34} y1={batY} x2={xInv + wInv / 2} y2={batY} stroke={C.dc} strokeWidth={2} />
              {bat.breakerA && <BreakerSymbol x={xInv + 20} y={batY + 4} />}
              {bat.breakerA && (
                <text x={xInv + 30} y={batY + 26} fontFamily={F} fontSize={7.8} fill={C.ink}>{`DC ${bat.breakerA} A 2P`}</text>
              )}
            </>
          )}
          <line x1={xInv + wInv / 2} y1={batY} x2={xInv + wInv / 2} y2={invY + invH} stroke={C.dc} strokeWidth={2} />
          <WireTag x={xInv + wInv / 2 + 22} y={batY - 8} text={m.cables.find((c) => /BAT/.test(c.route))?.tag || "W3"} color={C.dc} />
        </>
      )}

      {/* ── لوحة حماية الـ AC ─────────────────────────────────────────────── */}
      {ac && inv && (
        <>
          <line x1={xInv + wInv} y1={dcY} x2={xAc} y2={dcY} stroke={C.ac} strokeWidth={2} />
          <WireTag x={(xInv + wInv + xAc) / 2} y={dcY - 6} text="W4" color={C.ac} />
          <Block
            x={xAc}
            y={invY - 6}
            w={wAc}
            h={invH + 12}
            title="AC PROTECTION BOARD"
            lines={[
              `Main ${ac.breakerA} A ${ac.phase3 ? "4P" : "2P"}`,
              ac.phase3 ? "L1 / L2 / L3 / N" : "L / N",
              "AC SPD Type 2",
            ]}
            accent={C.ac}
          />
          <BreakerSymbol x={xAc + wAc - 24} y={dcY} />
          <SpdSymbol x={xAc + 22} y={dcY + 26} />
        </>
      )}

      {/* ── مفتاح التحويل / المولد (فقط إذا كان ضمن الأصناف) ───────────────── */}
      {m.ats && ac && (
        <>
          <line x1={xAc + wAc} y1={dcY} x2={xAts} y2={dcY} stroke={C.ac} strokeWidth={2} />
          <Block
            x={xAts}
            y={invY}
            w={wAts}
            h={invH}
            title="ATS CHANGEOVER"
            lines={["Grid / Generator", m.ats.kva ? `Generator ${m.ats.kva} kVA` : "MCCB 4P 175 A"]}
            accent={C.ac}
          />
        </>
      )}

      {/* ── الشبكة والأحمال ──────────────────────────────────────────────── */}
      {(() => {
        const from = m.ats && ac ? xAts + wAts : ac ? xAc + wAc : inv ? xInv + wInv : xAc;
        const loadY = m.grid ? dcY + 34 : dcY;
        return (
          <>
            {m.grid && (
              <>
                <Block
                  x={xOut}
                  y={dcY - 76}
                  w={wOut}
                  h={52}
                  title="UTILITY GRID"
                  lines={[m.title.phase]}
                  accent={C.ac}
                />
                <line x1={from} y1={dcY} x2={xOut - 26} y2={dcY} stroke={C.ac} strokeWidth={2} />
                <line x1={xOut - 26} y1={dcY} x2={xOut - 26} y2={dcY - 50} stroke={C.ac} strokeWidth={2} />
                <line x1={xOut - 26} y1={dcY - 50} x2={xOut} y2={dcY - 50} stroke={C.ac} strokeWidth={2} markerEnd="url(#sld-arrow)" />
              </>
            )}
            <Block
              x={xOut}
              y={loadY - 26}
              w={wOut}
              h={56}
              title={m.battery ? "BACKUP / SITE LOADS" : "SITE LOADS"}
              lines={[m.title.phase, ""].filter(Boolean)}
              accent={C.ac}
            />
            <line x1={from} y1={dcY} x2={xOut - 26} y2={dcY} stroke={C.ac} strokeWidth={2} />
            <line x1={xOut - 26} y1={dcY} x2={xOut - 26} y2={loadY} stroke={C.ac} strokeWidth={2} />
            <line x1={xOut - 26} y1={loadY} x2={xOut} y2={loadY} stroke={C.ac} strokeWidth={2} markerEnd="url(#sld-arrow)" />
            <WireTag x={(from + xOut) / 2} y={dcY - 6} text="W5" color={C.ac} />
          </>
        );
      })()}

      {/* ── قضيب التأريض (فقط إذا كانت حفرة التأريض ضمن الأصناف) ───────────── */}
      {m.earth && (
        <>
          <line x1={xPv} y1={earthY} x2={xOut + wOut} y2={earthY} stroke={C.earth} strokeWidth={2} strokeDasharray="7 4" />
          {[xPv + 60, dc ? xDc + wDc / 2 : null, inv ? xInv + wInv / 2 : null, ac ? xAc + wAc / 2 : null].filter(
            (v): v is number => v !== null,
          ).map((x) => (
            <line key={x} x1={x} y1={earthY - 22} x2={x} y2={earthY} stroke={C.earth} strokeWidth={1.4} strokeDasharray="4 3" />
          ))}
          <EarthSymbol x={xOut + wOut - 40} y={earthY + 8} />
          <text x={xOut + wOut - 40} y={earthY - 8} textAnchor="middle" fontFamily={F} fontSize={8.4} fill={C.earth}>
            {m.earth.name}
          </text>
          <text x={xPv} y={earthY - 8} fontFamily={F} fontSize={8.4} fontWeight={700} fill={C.earth}>
            PE — EARTH BONDING BUS 1×16 mm²
          </text>
        </>
      )}
    </svg>
  );
}

/** شاشة المخطط الأحادي الرسمي داخل التطبيق مع تكبير وتحريك وتحميل. */
export default function SldDiagram({ params, number }: Props) {
  const model = useMemo(() => buildSld(params), [params]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  if (!model) return null;

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
  };
  const onUp = () => { drag.current = null; };

  return (
    <section className="mt-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-secondary text-skyline">
            <Network className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-black">المخطط الكهربائي أحادي الخط (SLD)</h3>
            <p className="text-[10px] text-muted-foreground">
              {model.title.system}
              {number || model.title.ref ? ` — رقم المخطط: ${number || model.title.ref}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label="تكبير" className="grid size-9 place-items-center rounded-full border border-border bg-card text-skyline transition hover:border-brand hover:text-brand">
            <Plus className="size-4" />
          </button>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))} aria-label="تصغير" className="grid size-9 place-items-center rounded-full border border-border bg-card text-skyline transition hover:border-brand hover:text-brand">
            <Minus className="size-4" />
          </button>
          <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="إعادة الضبط" className="grid size-9 place-items-center rounded-full border border-border bg-card text-skyline transition hover:border-brand hover:text-brand">
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      <div
        className="mt-3 overflow-hidden rounded-md border border-border bg-white touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ cursor: "grab" }}
        dir="ltr"
      >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          <SldSvg m={model} />
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Move className="size-3" /> اسحب المخطط للتحريك، واستخدم + و − للتكبير والتصغير.
      </p>

      {/* كتلة بيانات اللوحة الرسمية */}
      <div className="mt-3 overflow-hidden rounded-md border border-border" dir="ltr">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {[
            ["PROJECT", model.title.project],
            ["CLIENT", model.title.customer || "—"],
            ["LOCATION", model.title.city || "—"],
            ["SYSTEM", model.title.system],
            ["SUPPLY", model.title.phase],
            ["DRAWING No.", number || model.title.ref || "—"],
            ["DATE", model.title.date],
            ["DESIGNED BY", model.title.designer],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-2.5 py-1.5">
              <p className="text-[9px] font-bold text-muted-foreground">{label}</p>
              <p className="text-[10px] font-black break-words">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-2.5 py-2">
          <img src={logoAsset.url} alt="ACTES" className="h-8 w-auto" />
          <p className="text-[9px] font-bold text-muted-foreground">ACTES ENERGY SYSTEMS &amp; SOLUTIONS — SINGLE LINE DIAGRAM — REV 01</p>
        </div>
      </div>

      {model.cables.length > 0 && (
        <>
          <h4 className="mt-4 text-xs font-black text-skyline">جدول الكابلات المناسبة</h4>
          <div className="mt-2 -mx-1 overflow-x-auto px-1" data-quote-scroll dir="ltr">
            <table className="w-full min-w-[430px] border-collapse text-[10.5px]">
              <thead>
                <tr className="bg-brand text-brand-foreground">
                  <th className="border border-border px-2 py-1.5 font-black">TAG</th>
                  <th className="border border-border px-2 py-1.5 font-black">ROUTE</th>
                  <th className="border border-border px-2 py-1.5 font-black">CABLE</th>
                </tr>
              </thead>
              <tbody>
                {model.cables.map((c) => (
                  <tr key={c.tag + c.route} className="odd:bg-muted/40">
                    <td className="border border-border px-2 py-1 text-center font-black">{c.tag}</td>
                    <td className="border border-border px-2 py-1">{c.route}</td>
                    <td className="border border-border px-2 py-1">{c.spec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {model.bom.length > 0 && (
        <>
          <h4 className="mt-4 text-xs font-black text-skyline">أصناف المنظومة المرسومة</h4>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {model.bom.map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                <span className="text-[10px] font-semibold">{row.name}</span>
                <span className="shrink-0 text-[11px] font-black" dir="ltr">{row.qty} {row.unit}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {model.notes.length > 0 && (
        <ul className="mt-3 space-y-1" dir="ltr">
          {model.notes.map((n) => (
            <li key={n} className="text-[10px] text-muted-foreground">• {n}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => downloadSldSheet(model, number)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-black text-brand-foreground shadow-md transition hover:opacity-90"
      >
        <Download className="size-4" />
        تحميل المخطط الرسمي
      </button>
    </section>
  );
}
