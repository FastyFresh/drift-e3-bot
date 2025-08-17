import fs from "fs";
import path from "path";
import fetch from "node-fetch";

export interface Candle {
  timestamp: number; // ms epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DriftSnapshot {
  candle: Candle;
  fundingRate?: number;
  openInterest?: number;
}

/**
 * DriftDataProvider pulls SOL-PERP historical data from Drift v2 S3 archives,
 * caches it locally under /data, and exposes aggregated snapshots matching backtester needs.
 */
export class DriftDataProvider {
  baseUrl: string;
  cacheDir: string;

  constructor() {
    this.baseUrl =
      "https://drift-historical-data-v2.s3.eu-west-1.amazonaws.com/program/dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH";
    this.cacheDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
  }

  private async downloadIfNotCached(
    market: string,
    type: string,
    date: string
  ): Promise<string> {
    const url = `${this.baseUrl}/market/${market}/${type}Records/${date.slice(
      0,
      4
    )}/${date}`;
    const cacheFile = path.join(
      this.cacheDir,
      `${market}_${type}_${date}.json`
    );

    if (fs.existsSync(cacheFile)) {
      return cacheFile;
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}, status ${res.status}`);
    }
    const text = await res.text();
    fs.writeFileSync(cacheFile, text);
    return cacheFile;
  }

  private aggregateTradesToCandles(
    trades: any[],
    resolutionSec: number
  ): Candle[] {
    const candles: Candle[] = [];
    const grouped: Record<string, any[]> = {};

    for (const trade of trades) {
      const ts =
        (trade.blockTimestamp ?? trade.ts ?? trade.slot * 400) * 1000; // fallback approx
      const bucket = Math.floor(ts / (resolutionSec * 1000));
      if (!grouped[bucket]) grouped[bucket] = [];
      grouped[bucket].push(trade);
    }

    for (const bucket of Object.keys(grouped)) {
      const bucketTrades = grouped[bucket];
      const sorted = bucketTrades.sort((a, b) => a.ts - b.ts);
      const open = sorted[0].price;
      const close = sorted[sorted.length - 1].price;
      let high = -Infinity;
      let low = Infinity;
      let volume = 0;
      for (const t of sorted) {
        if (t.price > high) high = t.price;
        if (t.price < low) low = t.price;
        volume += t.baseAmount ?? 0;
      }
      candles.push({
        timestamp: Number(bucket) * resolutionSec * 1000,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    candles.sort((a, b) => a.timestamp - b.timestamp);
    return candles;
  }

  /**
   * Load Drift snapshots for given market + date range.
   * Dates must be in YYYYMMDD format.
   */
  async load(
    market: string,
    startDate: string,
    endDate: string,
    resolution: "1m" | "5m" = "1m"
  ): Promise<DriftSnapshot[]> {
    const resolutionSec = resolution === "1m" ? 60 : 300;
    const dateRange = this.expandDates(startDate, endDate);
    let snapshots: DriftSnapshot[] = [];

    for (const date of dateRange) {
      try {
        const tradeFile = await this.downloadIfNotCached(
          market,
          "trade",
          date
        );
        const tradeData = JSON.parse(fs.readFileSync(tradeFile, "utf8"));
        const candles = this.aggregateTradesToCandles(
          tradeData,
          resolutionSec
        );

        // attempt funding
        let fundingRate;
        try {
          const fundingFile = await this.downloadIfNotCached(
            market,
            "fundingRate",
            date
          );
          const fundingData = JSON.parse(
            fs.readFileSync(fundingFile, "utf8")
          );
          fundingRate = fundingData.length
            ? fundingData[fundingData.length - 1].rate
            : undefined;
        } catch {
          /* funding may not exist */
        }

        for (const candle of candles) {
          snapshots.push({
            candle,
            fundingRate,
          });
        }
      } catch (e) {
        console.warn(`No data for ${date}: ${e}`);
      }
    }

    return snapshots;
  }

  private expandDates(start: string, end: string): string[] {
    const results: string[] = [];
    const sY = parseInt(start.substring(0, 4));
    const sM = parseInt(start.substring(4, 6)) - 1;
    const sD = parseInt(start.substring(6, 8));
    const startDate = new Date(Date.UTC(sY, sM, sD));

    const eY = parseInt(end.substring(0, 4));
    const eM = parseInt(end.substring(4, 6)) - 1;
    const eD = parseInt(end.substring(6, 8));
    const endDate = new Date(Date.UTC(eY, eM, eD));

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      results.push(`${y}${m}${day}`);
    }
    return results;
  }
}
