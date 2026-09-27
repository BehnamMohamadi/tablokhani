export type Quote = {
  id: string; symbol: string; name: string; industry: string;
  last: number | null; close: number | null; previous: number | null; first: number | null;
  high: number | null; low: number | null; volume: number | null; trades: number | null;
  valueRial: string | null; sourceTime: string | null; receivedAt: string;
  buyVolume: number | null; sellVolume: number | null; buyCount: number | null; sellCount: number | null;
  legalBuyVolume: number | null; legalSellVolume: number | null;
  bids: {price:number;volume:number;count:number}[]; asks: {price:number;volume:number;count:number}[];
  change: number | null; closeChange: number | null; buyPerCapita: number | null; sellPerCapita: number | null;
  power: number | null; netMoneyRial: string | null; quality: string[];
};
export type Signal = { id: string; instrumentId: string; symbol: string; at: string; side: 'buy'|'sell'; amountRial:string; perCapitaRial:number; count:number; formulaVersion:string; kind:'hot'|'plus'; quality:string };
