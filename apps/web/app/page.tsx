'use client';
import { useEffect, useState } from 'react';
import {
  Activity,
  LayoutDashboard,
  ListFilter,
  Layers,
  Grid2X2,
  Crosshair,
  ArrowUpLeft,
  Database,
  RefreshCw,
  Sun,
  Moon,
  ChevronLeft,
  ShieldCheck,
  Clock3,
  Bell,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Overview,
  QuoteTable,
  Industries,
  MarketMap,
  Hunt,
  SymbolDetail,
  NoData,
} from '@/components/market-views';
import { api, num, money, time, type Market, type Signal } from '@/lib/market';
const sections = [
  ['overview', 'نمای کلی بازار', LayoutDashboard, 'MARKET OVERVIEW'],
  ['watchlist', 'دیده‌بان جامع', ListFilter, 'MARKET WATCH'],
  ['industries', 'آنالیز صنایع', Layers, 'INDUSTRY ANALYSIS'],
  ['map', 'نقشه بازار', Grid2X2, 'MARKET MAP'],
  ['hunt', 'شکار سهام', Crosshair, 'STOCK SCREENER'],
  ['symbol', 'صفحه نماد', Activity, 'SYMBOL OVERVIEW'],
] as const;
const empty: Market = {
  source: 'TSETMC',
  receivedAt: null,
  stale: true,
  collector: { state: 'waiting' },
  quotes: [],
  summary: {
    count: 0,
    positive: 0,
    negative: 0,
    unchanged: 0,
    averageChange: null,
    valueRial: null,
    netMoneyRial: null,
    clientCoverage: 0,
  },
  industries: [],
};
export default function Page() {
  const [section, setSection] = useState('overview'),
    [data, setData] = useState<Market>(empty),
    [error, setError] = useState(''),
    [dark, setDark] = useState(false),
    [symbol, setSymbol] = useState(''),
    [industry, setIndustry] = useState(''),
    [history, setHistory] = useState<any[]>([]),
    [signals, setSignals] = useState<Signal[]>([]),
    [busy, setBusy] = useState(false),
    [notifications, setNotifications] = useState<any[]>([]),
    [showNotifications, setShowNotifications] = useState(false);
  async function refresh() {
    setBusy(true);
    try {
      const d = await api<Market>('market');
      setData(d);
      setError('');
      const results = await Promise.allSettled([
        api<any[]>('history'),
        api<Signal[]>('signals'),
        api<any[]>('notifications'),
      ]);
      if (results[0].status === 'fulfilled') setHistory(results[0].value);
      if (results[1].status === 'fulfilled')
        setSignals(results[1].value as Signal[]);
      if (results[2].status === 'fulfilled') setNotifications(results[2].value);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function navigate(id: string) {
    if (!sections.some((s) => s[0] === id)) return;
    setSection(id);
    window.history.replaceState(null, '', `#${id}`);
  }
  function onSymbol(id: string) {
    setSymbol(id);
    navigate('symbol');
  }
  useEffect(() => {
    const initial = window.location.hash.slice(1);
    if (sections.some((s) => s[0] === initial)) setSection(initial);
    setDark(localStorage.getItem('tablokhani-theme') === 'dark');
    void refresh();
    const e = new EventSource('/api/events');
    e.addEventListener('market', (m) => {
      setData(JSON.parse(m.data));
      setError('');
    });
    e.addEventListener('unavailable', () =>
      setError('سرویس داده موقتاً در دسترس نیست'),
    );
    e.onerror = () =>
      setError('ارتباط زنده قطع شده؛ آخرین داده ذخیره‌شده نمایش داده می‌شود');
    const timer = setInterval(() => void refresh(), 30000);
    return () => {
      e.close();
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: 'open_market_section',
          description: 'Open an existing section of the market dashboard.',
          inputSchema: {
            type: 'object',
            properties: {
              section: { type: 'string', enum: sections.map((x) => x[0]) },
            },
            required: ['section'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: (input: any) => {
            if (!sections.some((s) => s[0] === input?.section))
              throw Error('Unknown section');
            navigate(input.section);
            return { section: input.section };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  const meta = sections.find((x) => x[0] === section)!;
  const q = data.quotes.find((q) => q.id === symbol);
  const s = data.summary;
  const status = error
    ? 'ارتباط قطع است'
    : data.receivedAt
      ? data.stale
        ? 'آخرین داده ذخیره‌شده'
        : 'داده دریافت شد'
      : 'در انتظار منبع';
  return (
    <div className={dark ? 'dark' : ''}>
      <SidebarProvider>
        <Sidebar side="right" className="app-sidebar">
          <SidebarHeader>
            <div className="brand">
              <span className="brand-icon">
                <Activity />
              </span>
              <div>
                <b>نبض تابلو</b>
                <small>دیده‌بان هوشمند بازار</small>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <div className="nav-label">فضای تحلیل</div>
            <SidebarMenu>
              {sections.map(([id, label, Icon]) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    isActive={section === id}
                    onClick={() => {
                      setIndustry('');
                      navigate(id);
                    }}
                  >
                    <Icon />
                    <span>{label}</span>
                    {section === id && <ChevronLeft className="mr-auto" />}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div className="source-card">
              <Database size={20} />
              <b>یک منبع، داده شفاف</b>
              <p>اطلاعات بازار مستقیماً از TSETMC دریافت می‌شود.</p>
              <span>منبع داده · TSETMC</span>
            </div>
          </SidebarContent>
          <SidebarFooter>
            <div className="profile">
              <span>ش</span>
              <div>
                فضای شخصی شما<small>نسخه محلی · ۰.۱</small>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              <SidebarTrigger /> بازار سرمایه <ChevronLeft size={14} />{' '}
              <b>{meta[1]}</b>
            </div>
            <div className="top-actions">
              <span className="connection">
                <i
                  style={{
                    background:
                      !error && !data.stale ? 'var(--green)' : undefined,
                  }}
                />{' '}
                {status}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="اعلان‌ها"
                onClick={() => setShowNotifications(true)}
              >
                <Bell />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="تغییر پوسته"
                onClick={() => {
                  setDark(!dark);
                  localStorage.setItem(
                    'tablokhani-theme',
                    !dark ? 'dark' : 'light',
                  );
                }}
              >
                {dark ? <Sun /> : <Moon />}
              </Button>
            </div>
          </header>
          <div className="page-content">
            <div className="page-heading">
              <div>
                <span className="eyebrow">{meta[3]}</span>
                <h1>{section === 'symbol' && q ? q.symbol : meta[1]}</h1>
                <p>قیمت‌ها، جریان پول و رفتار معامله‌گران در یک نگاه</p>
              </div>
              <Button variant="outline" onClick={refresh} disabled={busy}>
                <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
                به‌روزرسانی
              </Button>
            </div>
            <div className="source-banner">
              <ShieldCheck size={20} />
              <div>
                <b>
                  {error ||
                    (data.receivedAt
                      ? `${num(data.quotes.length)} نماد از TSETMC دریافت شده`
                      : data.collector.state === 'blocked'
                        ? 'TSETMC دسترسی این اتصال را مسدود کرده'
                        : 'در انتظار دریافت داده معتبر از TSETMC')}
                </b>
                <p>
                  {data.receivedAt
                    ? `آخرین دریافت: ${time(data.receivedAt)} · پوشش حقیقی‌حقوقی معتبر: ${num(s.clientCoverage)} نماد · ${data.quotes.every(q=>q.volume===0) ? 'حجم تمام نمادها در پاسخ منبع صفر است؛ این نما آمار یک جلسه فعال معاملاتی نیست.' : data.stale ? 'داده تازه نیست؛ زمان دریافت را در نظر بگیرید.' : 'تازه بودن دریافت به‌معنای انجام معامله جدید نیست.'}`
                    : 'تا زمان دریافت داده معتبر، اعداد بازار نمایش داده نمی‌شوند.'}
                </p>
              </div>
              <span>منبع مستقیم</span>
            </div>
            {section !== 'symbol' && (
              <div className="stats-grid">
                {[
                  ['ارزش معاملات', money(s.valueRial), 'میلیارد تومان'],
                  [
                    'خالص پول حقیقی',
                    money(s.netMoneyRial),
                    'میلیارد تومان · برآورد با پایانی',
                  ],
                  [
                    'نمادهای مثبت',
                    data.quotes.length ? num(s.positive) : '—',
                    'در آخرین دریافت',
                  ],
                  [
                    'نمادهای منفی',
                    data.quotes.length ? num(s.negative) : '—',
                    'در آخرین دریافت',
                  ],
                ].map(([title, value, unit], i) => (
                  <section className="stat" key={title}>
                    <span>
                      {title}
                      <ArrowUpLeft size={17} />
                    </span>
                    <strong
                      className={
                        i === 1
                          ? Number(s.netMoneyRial) >= 0
                            ? 'up'
                            : 'down'
                          : i === 2
                            ? 'up'
                            : i === 3
                              ? 'down'
                              : ''
                      }
                      dir="ltr"
                    >
                      {value}
                    </strong>
                    <small>{unit}</small>
                  </section>
                ))}
              </div>
            )}
            {section === 'overview' && (
              <Overview market={data} onSymbol={onSymbol} history={history} />
            )}{' '}
            {section === 'watchlist' && (
              <QuoteTable
                key={industry}
                quotes={
                  industry
                    ? data.quotes.filter((q) => q.industry === industry)
                    : data.quotes
                }
                onSymbol={onSymbol}
              />
            )}{' '}
            {section === 'industries' && (
              <Industries
                market={data}
                onIndustry={(id) => {
                  setIndustry(id);
                  navigate('watchlist');
                }}
              />
            )}{' '}
            {section === 'map' && (
              <MarketMap quotes={data.quotes} onSymbol={onSymbol} />
            )}{' '}
            {section === 'hunt' && (
              <Hunt
                market={data}
                onSymbol={onSymbol}
                signals={signals}
                history={history}
              />
            )}{' '}
            {section === 'symbol' && (
              <>
                <SymbolDetail quote={q} />
                {!q && (
                  <QuoteTable
                    quotes={data.quotes}
                    onSymbol={onSymbol}
                    compact
                  />
                )}
              </>
            )}
            <footer className="page-footer">
              <span>نبض تابلو • ابزار تحلیل بازار سرمایه</span>
              <span>
                <Clock3 size={12} className="inline" /> دریافت:{' '}
                {time(data.receivedAt)} · قیمت‌ها: ریال
              </span>
            </footer>
          </div>
        </main>
        <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>اعلان‌های شما</DialogTitle>
              <DialogDescription>
                هشدارهای ثبت‌شده از زمان شروع جمع‌آوری
              </DialogDescription>
            </DialogHeader>
            {notifications.length ? (
              notifications.map((n) => (
                <div key={n._id}>
                  <b>{n.symbol}</b>
                  <p>
                    قدرت خریدار: {num(n.value, 2)} · {time(n.at)}
                  </p>
                </div>
              ))
            ) : (
              <NoData
                title="اعلان جدیدی ثبت نشده"
                description="در صفحه هر نماد می‌توانید هشدار قدرت خریدار بسازید."
              />
            )}
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </div>
  );
}
