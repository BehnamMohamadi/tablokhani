import type { Quote, Signal } from '../../../packages/shared/types';
export type { Quote, Signal };
export type Summary = {
  count: number;
  positive: number;
  negative: number;
  unchanged: number;
  averageChange: number | null;
  valueRial: string | null;
  netMoneyRial: string | null;
  clientCoverage: number;
};
export type Market = {
  source: string;
  receivedAt: string | null;
  stale: boolean;
  collector: { state: string; error?: string; lastSuccess?: string };
  quotes: Quote[];
  summary: Summary;
  industries: (Summary & { name: string })[];
};
export const num = (n: unknown, d = 0) =>
  n === null || n === undefined || n === ''
    ? '—'
    : Number(n).toLocaleString('fa-IR', { maximumFractionDigits: d });
export const money = (n: unknown) =>
  n === null || n === undefined ? '—' : `${num(Number(n) / 1e10, 1)}`;
export const pct = (n: unknown) =>
  n === null || n === undefined
    ? '—'
    : `${Number(n) > 0 ? '+' : ''}${num(n, 2)}٪`;
export const norm = (s: string) =>
  s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s/g, '').toLowerCase();
export const time = (s: string | null | undefined) =>
  s
    ? new Date(s).toLocaleTimeString('fa-IR', {
        timeZone: 'Asia/Tehran',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';
const groups: Record<string, string> = {
  '01': 'کشاورزی',
  '10': 'استخراج زغال‌سنگ',
  '13': 'کانه‌های فلزی',
  '14': 'سایر معادن',
  '15': 'غذایی و آشامیدنی',
  '17': 'منسوجات',
  '19': 'محصولات چرمی',
  '20': 'محصولات چوبی',
  '21': 'محصولات کاغذی',
  '22': 'انتشار و چاپ',
  '23': 'فرآورده‌های نفتی',
  '24': 'مواد شیمیایی',
  '25': 'لاستیک و پلاستیک',
  '26': 'کانی‌های غیرفلزی',
  '27': 'فلزات اساسی',
  '28': 'محصولات فلزی',
  '29': 'ماشین‌آلات',
  '31': 'ماشین‌آلات برقی',
  '32': 'وسایل ارتباطی',
  '34': 'خودرو و قطعات',
  '35': 'تجهیزات حمل‌ونقل',
  '36': 'مبلمان',
  '38': 'قند و شکر',
  '39': 'چند رشته‌ای صنعتی',
  '40': 'برق و انرژی',
  '42': 'محصولات غذایی',
  '43': 'دارویی',
  '44': 'محصولات شیمیایی',
  '45': 'پیمانکاری صنعتی',
  '47': 'خرده‌فروشی',
  '49': 'کاشی و سرامیک',
  '50': 'تجارت',
  '53': 'سیمان',
  '54': 'کانی‌های غیرفلزی',
  '56': 'سرمایه‌گذاری',
  '57': 'بانک‌ها',
  '58': 'واسطه‌گری مالی',
  '60': 'حمل‌ونقل',
  '64': 'مخابرات',
  '65': 'واسطه‌گری مالی',
  '66': 'بیمه',
  '67': 'فعالیت‌های مالی',
  '68': 'صندوق‌های سرمایه‌گذاری',
  '70': 'انبوه‌سازی',
  '72': 'رایانه',
  '73': 'اطلاعات و ارتباطات',
  '74': 'خدمات فنی و مهندسی',
};
export const industryName = (code: string) => groups[code] ?? `گروه ${code}`;
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(
    `/api/${path}`,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  if (!r.ok) throw Error('ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.');
  return r.json();
}
export function downloadCsv(rows: Quote[]) {
  const columns = [
    'نماد',
    'نام',
    'آخرین ریال',
    'پایانی ریال',
    'درصد تغییر',
    'حجم',
    'ارزش ریال',
    'قدرت خریدار',
    'خالص پول حقیقی ریال',
  ];
  const cell = (v: unknown) =>
    `"${String(v ?? '')
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  const lines = rows.map((q) => [
    q.symbol,
    q.name,
    q.last,
    q.close,
    q.change,
    q.volume,
    q.valueRial,
    q.power,
    q.netMoneyRial,
  ]);
  const content =
    '\uFEFF' +
    [columns, ...lines].map((r) => r.map(cell).join(',')).join('\r\n');
  const a = document.createElement('a');
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/csv;charset=utf-8' }),
  );
  a.href = url;
  a.download = 'tablokhani-tsetmc.csv';
  a.click();
  URL.revokeObjectURL(url);
}
