# Architecture and data contract

## Processes

`apps/collector`: fixed-origin HTTPS adapter → raw response → validated batch.

`apps/worker`: ordered pending Mongo batches → snapshots, bars, events, summaries → immutable published batch. It also processes explicit historical-import jobs.

`apps/api`: Express on loopback → Mongo read models, watchlist/alert commands, SSE. No browser calls to TSETMC.

`apps/web`: Persian RTL React interface; `/api` is proxied to port 4000 by the development server.

## Provenance

Observed endpoints:

- `https://cdn.tsetmc.com/api/ClosingPrice/GetMarketWatch?market=0&industrialGroup=&paperTypes%5B0%5D=1`
- `https://cdn.tsetmc.com/api/ClientType/GetClientTypeAll`
- `https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/{insCode}/0`

Compact market response uses `marketwatch` and `lva/lvc/csv/pdv/pcl/py/pf/pmn/pmx/qtj/ztt/qtc` fields. The similarly named long-form fields can be zero placeholders in this response and MUST NOT override compact values. Client response key observed: `clientTypeAllDto`. Schemas fail closed on incompatible or empty replies. The same endpoint produced a blocked HTML response with curl but JSON with Node; availability is not guaranteed. Preserve errors instead of treating HTTP 200 as valid data.

IDs and exact integer money remain strings; lossless JSON parsing protects identifiers above JS safe integer range. Arithmetic on net money uses BigInt; display conversions and ratios are approximate floating-point. All persisted monetary values are rial. Source URL and receive timestamp are retained with raw responses. Raw TTL is 14 days; sampled snapshots default to 30 days. Date partitions use receipt date in Tehran when the source omits its date; do not present this as exchange-confirmed trade date.

## Formulas v1

- Price change: `(last / previous - 1) × 100`, null for absent/zero denominator.
- Real buyer/seller per capita: real volume × closing price / real participant count. This estimates monetary value using closing price, not execution prices.
- Buyer power: buyer per capita / seller per capita; undefined denominators remain null.
- Net real money: `(real buy volume - real sell volume) × closing price`, an estimate. Inconsistent client volume is excluded from monetary aggregates.
- Hot event: successive same-day samples no more than 60s apart, positive change in cumulative participant count, nonnegative change in volume. Estimated interval amount = delta volume × current last price. Divide by delta count. At least 2 billion rial → hot; at least 1 billion and below 2 billion → plus. This is NOT an individual trade or identity detector.
- Ten-minute moves: signed sums of recorded interval events. Unknown intervals are not zero.
- Sampled bars: first/max/min/last observed price in a minute; not trade-complete OHLC. Daily official OHLC is stored separately in `official_daily`.
- Daily alert: first satisfying snapshot per rule/receipt day creates one internal notification.

## Reliability and boundaries

Batch IDs hash receipt day and raw responses; snapshot/event IDs include batch identity. Replaying a batch is idempotent for derived documents. API follows a published pointer only after batch quote documents are written. Worker uses a renewable Mongo lease; this is a single-host design and not a guarantee under distributed pauses or partitions. Raw writes and projections are not wrapped in cross-collection transactions; replay tests cover interrupted/repeated processing assumptions, not every crash boundary.

Minute aggregation runs in bulk, not one query per symbol. Large-scale retention/archival for `published_quotes`, events and aggregate history needs a production storage budget. Add Redis/BullMQ or a fenced durable queue, shared cache and distributed API fanout before horizontal scaling.

Authentication is intentionally not invented: the current `local` owner is only valid on a loopback-bound, single-user development instance. Public deployment requires actual account isolation, authenticated command endpoints, rate limiting, secret management, monitoring and backup restore validation. Do not expose the current API publicly.

## Remaining parity work

Verified orderbook endpoint, reliable exchange session dates/calendar, backfill/reconciliation, historical client flow, proprietary formula definitions, configurable numeric column filters, native XLSX, complete industry trends and alerts management, authentication, multi-user storage, and production deployment.
