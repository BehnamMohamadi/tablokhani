'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Database,
  Download,
  Plus,
  Search,
  ArrowUpDown,
  Star,
  Bell,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  api,
  num,
  money,
  pct,
  norm,
  time,
  industryName,
  downloadCsv,
  type Quote,
  type Market,
  type Signal,
} from '@/lib/market';
export function NoData({
  title = 'اطلاعاتی برای نمایش نیست',
  description = 'با دریافت داده معتبر، این بخش به‌صورت خودکار به‌روز می‌شود.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Empty className="empty-table">
      <EmptyHeader>
        <Database className="mx-auto mb-3" size={26} />
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function Picker({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(String(v))}>
      <SelectTrigger aria-label={label}>
        <SelectValue>
          {options.find((x) => x[0] === value)?.[1] ?? label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Line({
  rows,
  field,
  label,
}: {
  rows: any[];
  field: string;
  label: string;
}) {
  if (rows.length < 2)
    return (
      <div className="empty-chart">
        <div className="chart-grid" />
        <Activity size={30} />
        <b>تاریخچه در حال شکل‌گیری است</b>
        <p>برای رسم روند، دست‌کم دو نمونه زمانی نیاز داریم.</p>
      </div>
    );
  return (
    <div className="line-chart" dir="ltr">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={rows}>
          <defs>
            <linearGradient id={`fill-${field}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3874ec" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#3874ec" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="at"
            tickFormatter={time}
            minTickGap={45}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            width={60}
            tickFormatter={(v) => num(v, 1)}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            labelFormatter={(v) => time(String(v))}
            formatter={(v) => [num(v, 2), label]}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              direction: 'rtl',
            }}
          />
          <Area
            type="linear"
            dataKey={field}
            stroke="#3874ec"
            fill={`url(#fill-${field})`}
            strokeWidth={2}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
type Watch = { _id: string; name: string; instrumentIds: string[] };
export function QuoteTable({
  quotes,
  onSymbol,
  compact = false,
}: {
  quotes: Quote[];
  onSymbol: (id: string) => void;
  compact?: boolean;
}) {
  const [search, setSearch] = useState(''),
    [industry, setIndustry] = useState('all'),
    [filter, setFilter] = useState('all'),
    [sort, setSort] = useState('valueRial'),
    [asc, setAsc] = useState(false),
    [page, setPage] = useState(0),
    [saved, setSaved] = useState<Watch[]>([]),
    [watch, setWatch] = useState('all'),
    [open, setOpen] = useState(false),
    [name, setName] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    api<Watch[]>('watchlists')
      .then(setSaved)
      .catch(() => {});
  }, []);
  const rows = useMemo(
    () =>
      quotes
        .filter(
          (q) =>
            (!search || norm(q.symbol + q.name).includes(norm(search))) &&
            (industry === 'all' || q.industry === industry) &&
            (watch === 'all' ||
              saved
                .find((w) => w._id === watch)
                ?.instrumentIds.includes(q.id)) &&
            (filter === 'all' ||
              (filter === 'positive' && q.change !== null && q.change > 0) ||
              (filter === 'negative' && q.change !== null && q.change < 0) ||
              (filter === 'power' && q.power !== null && q.power > 1) ||
              (filter === 'money' &&
                q.netMoneyRial !== null &&
                BigInt(q.netMoneyRial) > 0n)),
        )
        .sort((a, b) => {
          const av = a[sort as keyof Quote],
            bv = b[sort as keyof Quote];
          if (av == null) return 1;
          if (bv == null) return -1;
          return (
            (sort === 'symbol'
              ? String(av).localeCompare(String(bv), 'fa')
              : Number(av) - Number(bv)) * (asc ? 1 : -1)
          );
        }),
    [quotes, search, industry, filter, watch, saved, sort, asc],
  );
  useEffect(() => setPage(0), [search, industry, filter, watch]);
  const columns: [string, string, (q: Quote) => React.ReactNode][] = [
    [
      'symbol',
      'نماد',
      (q) => (
        <button className="symbol-link" onClick={() => onSymbol(q.id)}>
          <b>{q.symbol}</b>
          <small>{industryName(q.industry)}</small>
        </button>
      ),
    ],
    ['last', 'آخرین (ریال)', (q) => num(q.last)],
    [
      'change',
      'تغییر',
      (q) => (
        <span className={Number(q.change) >= 0 ? 'up' : 'down'} dir="ltr">
          {pct(q.change)}
        </span>
      ),
    ],
    ['close', 'پایانی (ریال)', (q) => num(q.close)],
    ['volume', 'حجم معاملات', (q) => num(q.volume)],
    ['valueRial', 'ارزش (میلیارد تومان)', (q) => money(q.valueRial)],
    [
      'power',
      'قدرت خریدار',
      (q) => (
        <span className={Number(q.power) > 1 ? 'up' : ''}>
          {num(q.power, 2)}
        </span>
      ),
    ],
    [
      'netMoneyRial',
      'پول حقیقی (میلیارد تومان)',
      (q) => (
        <span className={Number(q.netMoneyRial) >= 0 ? 'up' : 'down'} dir="ltr">
          {money(q.netMoneyRial)}
        </span>
      ),
    ],
    [
      'buyPerCapita',
      'سرانه خرید (میلیون تومان)',
      (q) => num(q.buyPerCapita === null ? null : q.buyPerCapita / 1e7, 1),
    ],
    [
      'sellPerCapita',
      'سرانه فروش (میلیون تومان)',
      (q) => num(q.sellPerCapita === null ? null : q.sellPerCapita / 1e7, 1),
    ],
  ];
  const visible = compact
    ? columns.filter((_, i) => ![3, 4, 8, 9].includes(i))
    : columns;
  async function save() {
    try {
      if (!rows.length) return;
      const item = await api<Watch>('watchlists', {
        name,
        instrumentIds: rows.map((q) => q.id),
      });
      setSaved([...saved, item]);
      setOpen(false);
      setName('');
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>
            دیده‌بان بازار{' '}
            <span className="count-pill">{num(rows.length)} نماد</span>
          </h2>
          <p>مرتب‌سازی و فیلتر اطلاعات مستقیم بازار</p>
        </div>
        <div className="table-actions">
          <Button
            variant="outline"
            onClick={() => downloadCsv(rows)}
            disabled={!rows.length}
          >
            <Download size={15} />
            خروجی CSV
          </Button>
          {!compact && (
            <Button
              variant="outline"
              onClick={() => setOpen(true)}
              disabled={!rows.length}
            >
              <Plus size={15} />
              ذخیره دیده‌بان
            </Button>
          )}
        </div>
      </div>
      <div className="filter-bar">
        <div className="search">
          <Search size={16} />
          <Input
            aria-label="جستجوی نماد"
            placeholder="جستجوی نماد یا شرکت…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Picker
          label="صنعت"
          value={industry}
          onChange={setIndustry}
          options={[
            ['all', 'همه صنایع'],
            ...[...new Set(quotes.map((q) => q.industry))]
              .sort()
              .map((x) => [x, industryName(x)] as [string, string]),
          ]}
        />
        <Picker
          label="فیلتر"
          value={filter}
          onChange={setFilter}
          options={[
            ['all', 'همه نمادها'],
            ['positive', 'نمادهای مثبت'],
            ['negative', 'نمادهای منفی'],
            ['power', 'قدرت خریدار بیشتر از ۱'],
            ['money', 'ورود پول حقیقی'],
          ]}
        />
        {!compact && (
          <Picker
            label="دیده‌بان شخصی"
            value={watch}
            onChange={setWatch}
            options={[
              ['all', 'همه دیده‌بان‌ها'],
              ...saved.map((w) => [w._id, w.name] as [string, string]),
            ]}
          />
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {visible.map(([key, title]) => (
              <TableHead key={key}>
                <button
                  className="sort-button"
                  onClick={() => {
                    if (sort === key) setAsc(!asc);
                    else {
                      setSort(key);
                      setAsc(false);
                    }
                  }}
                >
                  {title}
                  <ArrowUpDown size={11} />
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(page * 25, page * 25 + 25).map((q) => (
            <TableRow key={q.id}>
              {visible.map(([key, , render]) => (
                <TableCell key={key}>{render(q)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!rows.length && (
        <NoData
          title={
            quotes.length
              ? 'نمادی با این شرایط پیدا نشد'
              : 'هنوز داده معتبر دریافت نشده'
          }
        />
      )}
      <div className="table-footer">
        <span>
          نمایش {num(Math.min(rows.length, page * 25 + 1))} تا{' '}
          {num(Math.min(rows.length, (page + 1) * 25))} از {num(rows.length)}
        </span>
        <div>
          <Button
            variant="ghost"
            size="icon"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            aria-label="صفحه قبل"
          >
            <ChevronRight />
          </Button>
          <span>{num(page + 1)}</span>
          <Button
            variant="ghost"
            size="icon"
            disabled={(page + 1) * 25 >= rows.length}
            onClick={() => setPage(page + 1)}
            aria-label="صفحه بعد"
          >
            <ChevronLeft />
          </Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>ذخیره دیده‌بان شخصی</DialogTitle>
            <DialogDescription>
              {num(rows.length)} نمادِ نتیجه فعلی در دیده‌بان ذخیره می‌شود.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="نام دیده‌بان"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً سهام منتخب من"
            maxLength={80}
          />
          {error && <p role="alert">{error}</p>}
          <Button onClick={save} disabled={!name.trim()}>
            ذخیره در حساب محلی
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function Overview({
  market,
  onSymbol,
  history,
}: {
  market: Market;
  onSymbol: (id: string) => void;
  history: any[];
}) {
  const s = market.summary;
  const total = s.positive + s.negative + s.unchanged;
  const pos = total ? (s.positive / total) * 100 : 0;
  const neg = total ? (s.negative / total) * 100 : 0;
  return (
    <>
      <div className="overview-grid">
        <section className="panel chart-panel">
          <div className="panel-title">
            <div>
              <h2>جریان پول حقیقی</h2>
              <p>میلیارد تومان · برآورد با قیمت پایانی</p>
            </div>
            <span>از شروع ثبت داده</span>
          </div>
          <Line
            rows={history.map((x) => ({
              ...x,
              money:
                x.netMoneyRial == null ? null : Number(x.netMoneyRial) / 1e10,
            }))}
            field="money"
            label="پول حقیقی"
          />
        </section>
        <section className="panel breadth">
          <div className="panel-title">
            <h2>نبض بازار</h2>
            <span>پراکندگی نمادها</span>
          </div>
          <div
            className="breadth-ring"
            style={
              total
                ? {
                    border: 0,
                    background: `conic-gradient(var(--green) 0% ${pos}%, var(--red) ${pos}% ${pos + neg}%,var(--muted) ${pos + neg}% 100%)`,
                  }
                : undefined
            }
          >
            <span className="ring-center">
              {total ? num(total) : '—'}
              <small>نماد در دیده‌بان</small>
            </span>
          </div>
          <div className="legend">
            <span>
              <i className="positive" />
              مثبت {num(s.positive)}
            </span>
            <span>
              <i className="negative" />
              منفی {num(s.negative)}
            </span>
            <span>
              <i />
              خنثی {num(s.unchanged)}
            </span>
          </div>
        </section>
      </div>
      <QuoteTable quotes={market.quotes} onSymbol={onSymbol} compact />
    </>
  );
}
export function Industries({
  market,
  onIndustry,
}: {
  market: Market;
  onIndustry: (code: string) => void;
}) {
  const [search, setSearch] = useState('');
  const rows = market.industries
    .filter((x) => norm(industryName(x.name)).includes(norm(search)))
    .sort((a, b) => Number(b.valueRial) - Number(a.valueRial));
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>مقایسه صنایع</h2>
          <p>آمار تجمیعی نمادهای موجود در آخرین دریافت</p>
        </div>
        <Input
          aria-label="جستجوی صنعت"
          placeholder="جستجوی صنعت…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-64"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {[
              'صنعت',
              'نمادها',
              'میانگین تغییر',
              'ارزش (میلیارد تومان)',
              'پول حقیقی (میلیارد تومان)',
              'مثبت / منفی',
            ].map((x) => (
              <TableHead key={x}>{x}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((x) => (
            <TableRow key={x.name}>
              <TableCell>
                <button
                  className="symbol-link"
                  onClick={() => onIndustry(x.name)}
                >
                  {industryName(x.name)}
                </button>
              </TableCell>
              <TableCell>{num(x.count)}</TableCell>
              <TableCell
                className={Number(x.averageChange) >= 0 ? 'up' : 'down'}
              >
                {pct(x.averageChange)}
              </TableCell>
              <TableCell>{money(x.valueRial)}</TableCell>
              <TableCell
                className={Number(x.netMoneyRial) >= 0 ? 'up' : 'down'}
              >
                {money(x.netMoneyRial)}
              </TableCell>
              <TableCell>
                <span className="up">{num(x.positive)}</span> /{' '}
                <span className="down">{num(x.negative)}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!rows.length && <NoData />}
    </section>
  );
}
export function MarketMap({
  quotes,
  onSymbol,
}: {
  quotes: Quote[];
  onSymbol: (id: string) => void;
}) {
  const [size, setSize] = useState('valueRial'),
    [color, setColor] = useState('change'),
    [industry, setIndustry] = useState('all');
  const rows = quotes
    .filter((q) => industry === 'all' || q.industry === industry)
    .sort(
      (a, b) => Number(b[size as keyof Quote]) - Number(a[size as keyof Quote]),
    )
    .slice(0, 80);
  const max = Math.max(1, ...rows.map((q) => Number(q[size as keyof Quote])));
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>نقشه بازار</h2>
          <p>
            ۸۰ نماد بزرگ‌تر بر اساس معیار انتخابی؛ انتخاب هر خانه برای جزئیات
          </p>
        </div>
      </div>
      <div className="filter-bar">
        <Picker
          label="اندازه خانه‌ها"
          value={size}
          onChange={setSize}
          options={[
            ['valueRial', 'اندازه: ارزش معاملات'],
            ['volume', 'اندازه: حجم معاملات'],
          ]}
        />
        <Picker
          label="رنگ خانه‌ها"
          value={color}
          onChange={setColor}
          options={[
            ['change', 'رنگ: درصد تغییر'],
            ['netMoneyRial', 'رنگ: پول حقیقی'],
          ]}
        />
        <Picker
          label="صنعت"
          value={industry}
          onChange={setIndustry}
          options={[
            ['all', 'همه صنایع'],
            ...[...new Set(quotes.map((q) => q.industry))].map(
              (c) => [c, industryName(c)] as [string, string],
            ),
          ]}
        />
      </div>
      <div className="heatmap">
        {rows.map((q) => {
          const n = Number(q[color as keyof Quote]);
          return (
            <button
              key={q.id}
              onClick={() => onSymbol(q.id)}
              style={{
                flexGrow: Math.max(
                  0.4,
                  (Number(q[size as keyof Quote]) / max) * 5,
                ),
                flexBasis: `${100 + (Number(q[size as keyof Quote]) / max) * 160}px`,
                background: n > 0 ? '#12836c' : n < 0 ? '#c64c64' : '#64748b',
              }}
            >
              <b>{q.symbol}</b>
              <span dir="ltr">
                {color === 'change' ? pct(q.change) : money(q.netMoneyRial)}
              </span>
              <small>{money(q.valueRial)} میلیارد تومان</small>
            </button>
          );
        })}
      </div>
      {!rows.length && <NoData />}
    </section>
  );
}
const hunts = [
  ['hot', 'پول داغ'],
  ['plus', 'پول داغ پلاس'],
  ['game', 'بازی بازار'],
  ['moves', 'تحرکات بزرگان'],
  ['monitor', 'رصد بازار'],
  ['castic', 'تابلو کستیک'],
  ['multi', 'تحلیل چندبعدی'],
  ['industry', 'شکار صنعت'],
];
export function Hunt({
  market,
  onSymbol,
  signals,
  history,
}: {
  market: Market;
  onSymbol: (id: string) => void;
  signals: Signal[];
  history: any[];
}) {
  const [tab, setTab] = useState('hot');
  const [search, setSearch] = useState('');
  const events = signals.filter(
    (x) =>
      x.kind === (tab === 'plus' ? 'plus' : 'hot') &&
      norm(x.symbol).includes(norm(search)),
  );
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
      <TabsList className="hunt-tabs">
        {hunts.map(([id, title]) => (
          <TabsTrigger key={id} value={id}>
            {title}
          </TabsTrigger>
        ))}
      </TabsList>
      {['hot', 'plus'].map((id) => (
        <TabsContent key={id} value={id}>
          <div className="method-note">
            برآورد از اختلاف حجم و تعداد حقیقی بین دو دریافت؛ نشان‌دهنده هویت یا
            تک‌معامله نیست.{' '}
            {id === 'hot'
              ? 'سرانه بازه حداقل ۲۰۰ میلیون تومان'
              : 'سرانه بازه از ۱۰۰ تا کمتر از ۲۰۰ میلیون تومان'}
            . رویدادها فقط از زمان شروع جمع‌آوری ثبت می‌شوند.
          </div>
          <section className="panel">
            <div className="panel-title">
              <h2>
                {id === 'hot' ? 'رویدادهای پول داغ' : 'رویدادهای پول داغ پلاس'}
              </h2>
              <Input
                className="max-w-64"
                placeholder="جستجوی نماد…"
                aria-label="جستجوی رویداد"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    'زمان دریافت',
                    'نماد',
                    'جهت',
                    'تغییر تعداد',
                    'سرانه بازه (میلیون تومان)',
                    'ارزش برآوردی (میلیارد تومان)',
                  ].map((x) => (
                    <TableHead key={x}>{x}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>{time(x.at)}</TableCell>
                    <TableCell>
                      <button
                        className="symbol-link"
                        onClick={() => onSymbol(x.instrumentId)}
                      >
                        {x.symbol}
                      </button>
                    </TableCell>
                    <TableCell className={x.side === 'buy' ? 'up' : 'down'}>
                      {x.side === 'buy' ? 'خرید' : 'فروش'}
                    </TableCell>
                    <TableCell>{num(x.count)}</TableCell>
                    <TableCell>{num(x.perCapitaRial / 1e7, 1)}</TableCell>
                    <TableCell>{money(x.amountRial)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!events.length && (
              <NoData
                title="رویدادی با این شرایط ثبت نشده"
                description="این جدول با نمونه‌های متوالی معتبر و بدون شکاف زمانی پر می‌شود."
              />
            )}
          </section>
        </TabsContent>
      ))}
      <TabsContent value="game">
        <div className="method-note">
          تفکیک واقعی معامله‌گران به بزرگ، متوسط و خرد از داده تجمیعی قابل اثبات
          نیست. این نما سرانه و قدرت خرید حقیقی را برای مقایسه نمایش می‌دهد.
        </div>
        <QuoteTable quotes={market.quotes} onSymbol={onSymbol} />
      </TabsContent>
      <TabsContent value="moves">
        <Moves signals={signals} onSymbol={onSymbol} />
      </TabsContent>
      <TabsContent value="monitor">
        <Overview market={market} onSymbol={onSymbol} history={history} />
      </TabsContent>
      <TabsContent value="castic">
        <div className="method-note">
          فرمول اختصاصی تابلو کستیک منبع مرجع در دسترس نیست. شاخص‌های اختصاصی D⁺،
          M⁺ و عدد طلایی تا تعریف و اعتبارسنجی فرمول تولید نمی‌شوند.
        </div>
        <QuoteTable quotes={market.quotes} onSymbol={onSymbol} />
      </TabsContent>
      <TabsContent value="multi">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>قدرت خریدار در برابر تغییر قیمت</h2>
              <p>
                اندازه نقطه: ارزش معاملات · محور افقی: درصد تغییر · محور عمودی:
                قدرت خریدار
              </p>
            </div>
          </div>
          <div style={{ height: 380, direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke="var(--border)" />
                <XAxis
                  type="number"
                  dataKey="change"
                  name="تغییر قیمت"
                  unit="٪"
                />
                <YAxis type="number" dataKey="power" name="قدرت خریدار" />
                <ZAxis type="number" dataKey="size" range={[30, 250]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => (
                    <div className="scatter-tip">
                      {payload?.[0]?.payload?.symbol}
                      <br />
                      {pct(payload?.[0]?.payload?.change)} ·{' '}
                      {num(payload?.[0]?.payload?.power, 2)}
                    </div>
                  )}
                />
                <Scatter
                  data={market.quotes
                    .filter(
                      (q) =>
                        q.power !== null && q.change !== null && q.power < 20,
                    )
                    .map((q) => ({ ...q, size: Number(q.valueRial) }))}
                  fill="#3d79e5"
                  onClick={(p) => {
                    if (p?.payload?.id) onSymbol(p.payload.id);
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>
      </TabsContent>
      <TabsContent value="industry">
        <Industries market={market} onIndustry={(code) => { const q=market.quotes.filter(q=>q.industry===code).sort((a,b)=>Number(b.netMoneyRial)-Number(a.netMoneyRial))[0]; if(q)onSymbol(q.id); }} />
      </TabsContent>
    </Tabs>
  );
}
function Moves({
  signals,
  onSymbol,
}: {
  signals: Signal[];
  onSymbol: (id: string) => void;
}) {
  const grouped = new Map<
    string,
    { id: string; symbol: string; slots: Map<string, bigint> }
  >();
  for (const s of signals) {
    const group = grouped.get(s.instrumentId) ?? {
      id: s.instrumentId,
      symbol: s.symbol,
      slots: new Map(),
    };
    const date = new Date(
      Math.floor(Date.parse(s.at) / 600000) * 600000,
    ).toISOString();
    group.slots.set(
      date,
      (group.slots.get(date) ?? 0n) +
        BigInt(s.amountRial) * (s.side === 'buy' ? 1n : -1n),
    );
    grouped.set(s.instrumentId, group);
  }
  const slots = [
    ...new Set([...grouped.values()].flatMap((g) => [...g.slots.keys()])),
  ].sort();
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>برآیند رویدادها در بازه‌های ده‌دقیقه‌ای</h2>
          <p>میلیارد تومان · محاسبه از رویدادهای برآوردی ثبت‌شده</p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>نماد</TableHead>
            {slots.map((s) => (
              <TableHead key={s}>{time(s)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...grouped.values()].map((g) => (
            <TableRow key={g.id}>
              <TableCell>
                <button onClick={() => onSymbol(g.id)}>{g.symbol}</button>
              </TableCell>
              {slots.map((s) => (
                <TableCell key={s}>
                  {g.slots.has(s) ? money(g.slots.get(s)?.toString()) : '—'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!grouped.size && <NoData title="هنوز رویداد ده‌دقیقه‌ای نداریم" />}
    </section>
  );
}
function CandleChart({rows}:{rows:any[]}){
 const data=rows.filter(r=>r.open>0&&r.high>0&&r.low>0&&r.close>0).slice(-60);
 if(!data.length)return <NoData/>;
 const lo=Math.min(...data.map(r=>r.low))*.98,hi=Math.max(...data.map(r=>r.high))*1.02;
 const y=(n:number)=>260-(n-lo)/(hi-lo)*225,step=830/data.length;
 return <div className="candle-wrapper" dir="ltr"><svg viewBox="0 0 960 310" role="img" aria-label="کندل روزانه تعدیل‌نشده"><g>{[0,1,2,3,4].map(i=>{const v=lo+(hi-lo)*i/4;return <g key={i}><line x1="75" x2="940" y1={y(v)} y2={y(v)} stroke="var(--border)"/><text x="68" y={y(v)+4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">{num(v)}</text></g>;})}{data.map((r,i)=>{const x=90+i*step,c=r.close>=r.open?'var(--green)':'var(--red)';return <g key={r.day}><title>{r.day} | باز {r.open} | بیشترین {r.high} | کمترین {r.low} | پایانی {r.close}</title><line x1={x} x2={x} y1={y(r.high)} y2={y(r.low)} stroke={c}/><rect x={x-step*.27} y={y(Math.max(r.open,r.close))} width={Math.max(2,step*.54)} height={Math.max(1,Math.abs(y(r.open)-y(r.close)))} fill={c}/>{i%10===0&&<text x={x} y="290" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">{r.day}</text>}</g>;})}</g></svg></div>;
}
export function SymbolDetail({ quote }: { quote: Quote | undefined }) {
  const [bars, setBars] = useState<any[]>([]),
    [daily,setDaily]=useState<any[]>([]),
    [historyStatus,setHistoryStatus]=useState(''),
    [tab, setTab] = useState('overview'),
    [open, setOpen] = useState(false),
    [threshold, setThreshold] = useState('2'),
    [message, setMessage] = useState('');
  useEffect(() => {
    setBars([]);
    setDaily([]);setHistoryStatus('');let active=true;
    const getDaily=()=>quote&&api<any>(`symbols/${quote.id}/daily`).then(d=>{if(active){setDaily(d.rows);setHistoryStatus(d.job?.status??'');}}).catch(()=>{});
    if (quote){
      api<any[]>(`symbols/${quote.id}/bars`)
        .then(d=>{if(active)setBars(d);})
        .catch(() => {});
      void getDaily();
    }
    const timer=setInterval(()=>void getDaily(),5000);return()=>{active=false;clearInterval(timer);};
  }, [quote?.id]);
  if (!quote)
    return (
      <NoData
        title="یک نماد انتخاب کنید"
        description="از جدول دیده‌بان یا نقشه بازار، روی نماد مورد نظر بزنید."
      />
    );
  const q = quote;
  return (
    <>
      <section className="panel symbol-summary">
        <div>
          <span className="count-pill">{industryName(q.industry)}</span>
          <h2>{q.symbol}</h2>
          <p>{q.name}</p>
        </div>
        <div>
          <small>آخرین قیمت · ریال</small>
          <strong>{num(q.last)}</strong>
          <span className={Number(q.change) >= 0 ? 'up' : 'down'} dir="ltr">
            {pct(q.change)}
          </span>
        </div>
        <div>
          <small>قیمت پایانی · ریال</small>
          <strong>{num(q.close)}</strong>
          <span>{pct(q.closeChange)}</span>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Bell size={16} />
          هشدار قدرت خریدار
        </Button>
        <a
          href={`https://www.tsetmc.com/instInfo/${q.id}`}
          target="_blank"
          rel="noreferrer"
          className="external-link"
        >
          صفحه در TSETMC <ExternalLink size={14} />
        </a>
      </section>
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="overview">تابلو معاملات</TabsTrigger>
          <TabsTrigger value="history">روند قیمت</TabsTrigger>
          <TabsTrigger value="orders">سفارش‌های خرید و فروش</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="symbol-grid">
            {[
              ['حجم معاملات', num(q.volume)],
              ['ارزش معاملات (میلیارد تومان)', money(q.valueRial)],
              ['قدرت خریدار', num(q.power, 2)],
              ['خالص حقیقی (میلیارد تومان)', money(q.netMoneyRial)],
              [
                'سرانه خرید (میلیون تومان)',
                num(q.buyPerCapita === null ? null : q.buyPerCapita / 1e7, 1),
              ],
              [
                'سرانه فروش (میلیون تومان)',
                num(q.sellPerCapita === null ? null : q.sellPerCapita / 1e7, 1),
              ],
              ['تعداد خریداران حقیقی', num(q.buyCount)],
              ['تعداد فروشندگان حقیقی', num(q.sellCount)],
              ['حجم خرید حقیقی', num(q.buyVolume)],
              ['حجم فروش حقیقی', num(q.sellVolume)],
              ['حجم خرید حقوقی', num(q.legalBuyVolume)],
              ['حجم فروش حقوقی', num(q.legalSellVolume)],
              ['کمترین قیمت (ریال)', num(q.low)],
              ['بیشترین قیمت (ریال)', num(q.high)],
              ['اولین قیمت (ریال)', num(q.first)],
              ['قیمت دیروز (ریال)', num(q.previous)],
            ].map(([label, value]) => (
              <div className="stat" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="history">
          <section className="panel" style={{marginBottom:20}}><div className="panel-title"><div><h2>کندل روزانه از TSETMC</h2><p>قیمت‌های تعدیل‌نشده · ۶۰ روز آخر موجود</p></div><Button variant="outline" disabled={historyStatus==='pending'} onClick={async()=>{try{await api(`symbols/${q.id}/history/refresh`,{});setHistoryStatus('pending');}catch(e){setMessage((e as Error).message);}}}>{historyStatus==='pending'?'در حال دریافت…':'دریافت تاریخچه مستقیم'}</Button></div>{daily.length?<CandleChart rows={daily}/>:<NoData title={historyStatus==='error'?'دریافت تاریخچه ناموفق بود':'تاریخچه روزانه هنوز ذخیره نشده'} description="با دکمه دریافت، تاریخچه از خود TSETMC خوانده و در پایگاه داده ذخیره می‌شود."/>}</section>
          <section className="panel">
            <div className="panel-title">
              <h2>روند قیمت نمونه‌برداری‌شده</h2>
              <span>از شروع جمع‌آوری</span>
            </div>
            <Line
              rows={bars.map((b) => ({ ...b, at: b.bucket }))}
              field="close"
              label="قیمت ریال"
            />
            <div className="method-note">
              این نمودار بر اساس برداشت‌های تابلو است؛ سقف و کف تمام معاملات را
              تضمین نمی‌کند.
            </div>
          </section>
        </TabsContent>
        <TabsContent value="orders">
          <div className="overview-grid">
            {[
              ['خرید', q.bids],
              ['فروش', q.asks],
            ].map(([side, orders]) => (
              <section className="panel" key={String(side)}>
                <div className="panel-title">
                  <h2>سفارش‌های {String(side)}</h2>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>تعداد</TableHead>
                      <TableHead>حجم</TableHead>
                      <TableHead>قیمت (ریال)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(orders as Quote['bids']).map((o, i) => (
                      <TableRow key={i}>
                        <TableCell>{num(o.count)}</TableCell>
                        <TableCell>{num(o.volume)}</TableCell>
                        <TableCell>{num(o.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!(orders as any[]).length && (
                  <NoData title="سفارش معتبر در این پاسخ موجود نیست" />
                )}
              </section>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>هشدار برای {q.symbol}</DialogTitle>
            <DialogDescription>
              وقتی قدرت خریدار بالاتر از حد تعیین‌شده باشد، یک اعلان در روز ثبت
              می‌شود.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="حد قدرت خریدار"
            type="number"
            step="0.1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
          <Button
            onClick={async () => {
              try {
                await api('alerts', {
                  instrumentId: q.id,
                  field: 'power',
                  threshold: Number(threshold),
                  direction: 'above',
                });
                setMessage('هشدار ذخیره شد.');
                setOpen(false);
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            ذخیره هشدار
          </Button>
        </DialogContent>
      </Dialog>
      {message && (
        <p role="status" className="method-note">
          {message}
        </p>
      )}
    </>
  );
}
