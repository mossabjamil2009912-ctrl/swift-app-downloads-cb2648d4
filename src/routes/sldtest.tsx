import { createFileRoute } from "@tanstack/react-router";
import SldDiagram from "@/components/sld-diagram";

const PARAMS = {
  panel: { model: "Suntech N-Type 720 Wp", wp: 720, voc: 52.4, vmp: 43.6, imp: 16.5, isc: 17.4 },
  inv: { model: "Deye SUN-50K-SG01HP3-EU-BM3", kwac: 50, vmin: 200, vmax: 1000, vbat: 400, vbatRange: "160-800" },
  bat: { model: "Lithium 16 kWh HV", kwh: 16 },
  nStr: 8, perStr: 20, nPan: 160, nInv: 2, nBat: 6,
  kWp: 115.2, phase3: true, mppt: 5, mpptPerInv: 5, strPerMppt: 2, strVoc: 1048, strVmp: 872,
  peak: 62, daily: 420, sysLabel: "Hybrid", sysMode: "hyb", city_en: "Sanaa",
  customer_name: "Dhamran Sawan Center", project: "ACTES SOLAR PV SYSTEM", designer: "SUFYAN JAMIL",
  date: "2026-09-29", quote_number: "ACTES-Q123456",
  quote_items: [
    { key: "panel:720", name: "لوح سنتك N-Type 720 وات", qty: 160, unit: "حبة" },
    { key: "inverter:50:3:deye", name: "إنفرتر دايا هايبرد 50 كيلو ثري فاز", qty: 2, unit: "حبة" },
    { key: "battery:16:hv", name: "بطارية ليثيوم 16 كيلو جهد عالٍ", qty: 6, unit: "حبة" },
    { key: "bms:hv:16", name: "كنترول ربط بطاريات ليثيوم جهد عالٍ", qty: 1, unit: "كنترول" },
    { key: "cable", name: "كابل نحاس مجلفن 1500 فولت", qty: 670, unit: "متر" },
    { key: "dc:4", name: "لوحة حماية DC 4 خط", qty: 1, unit: "حبة" },
    { key: "ac:3-100", name: "لوحة حماية AC ثري فاز 100 أمبير", qty: 1, unit: "حبة" },
    { key: "bat:box:250", name: "صندوق حماية بطاريات قاطع MCCB-2P-250A", qty: 1, unit: "حبة" },
    { key: "earth:pit", name: "حفرة تأريض مع جميع مكوناتها", qty: 1, unit: "حفرة" },
  ],
};

export const Route = createFileRoute("/sldtest")({
  head: () => ({
    meta: [
      { title: "معاينة المخطط الأحادي — أكتس" },
      { name: "description", content: "معاينة داخلية للمخطط الكهربائي أحادي الخط." },
    ],
  }),
  component: () => (
    <main className="p-4" dir="rtl">
      <SldDiagram params={PARAMS} number="ACTES-Q123456" />
    </main>
  ),
});
