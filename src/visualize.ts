import fs from "fs";
import path from "path";
// @ts-ignore - No types available for plotly.js-dist-min
import plotly from "plotly.js-dist-min";

interface EquityPoint {
  ts: number;
  equity: number;
  regime?: string;
}
interface Trade {
  ts: number;
  side: string;
  price: number;
  pnl: number;
}
interface BacktestResult {
  params: any;
  metrics: any;
  equityCurve: EquityPoint[];
  trades: Trade[];
}

export function plotBacktest(resultPath: string, outPath?: string) {
  const res: BacktestResult = JSON.parse(fs.readFileSync(resultPath, "utf8"));
  const timestamps = res.equityCurve.map((p) => new Date(p.ts));
  const equity = res.equityCurve.map((p) => p.equity);

  const equityTrace = {
    x: timestamps,
    y: equity,
    type: "scatter",
    mode: "lines",
    name: "Equity Curve",
    line: { color: "blue" }
  };

  const tradesLong = res.trades.filter((t) => t.side === "LONG");
  const tradesShort = res.trades.filter((t) => t.side === "SHORT");

  const tradesLongTrace = {
    x: tradesLong.map((t) => new Date(t.ts)),
    y: tradesLong.map((t) => t.pnl),
    mode: "markers",
    type: "scatter",
    name: "Long Trades",
    marker: { color: "green", size: 6 }
  };

  const tradesShortTrace = {
    x: tradesShort.map((t) => new Date(t.ts)),
    y: tradesShort.map((t) => t.pnl),
    mode: "markers",
    type: "scatter",
    name: "Short Trades",
    marker: { color: "red", size: 6 }
  };

  const regimes = res.equityCurve.map((p) => p.regime || null);
  const regimeBands: any[] = [];
  let currentRegime: string | null = null;
  let startIndex = 0;
  regimes.forEach((reg, i) => {
    if (reg !== currentRegime) {
      if (currentRegime && regimes[startIndex]) {
        regimeBands.push({
          type: "rect",
          xref: "x",
          yref: "paper",
          x0: timestamps[startIndex],
          x1: timestamps[i],
          y0: 0,
          y1: 1,
          fillcolor: currentRegime === "bull_trend" ? "rgba(0,200,0,0.1)" :
                     currentRegime === "bear_trend" ? "rgba(200,0,0,0.1)" :
                     currentRegime === "high_vol" ? "rgba(200,200,0,0.1)" :
                     currentRegime === "crash" ? "rgba(0,0,0,0.2)" :
                     "rgba(100,100,100,0.05)",
          line: { width: 0 }
        });
      }
      currentRegime = reg;
      startIndex = i;
    }
  });

  const fig = {
    data: [equityTrace, tradesLongTrace, tradesShortTrace],
    layout: {
      title: "PnL and Trades with Regimes",
      xaxis: { title: "Time" },
      yaxis: { title: "Equity" },
      shapes: regimeBands
    }
  };

  const html = `
<html>
  <head>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  </head>
  <body>
    <div id="plot"></div>
    <script>
      var fig = ${JSON.stringify(fig)};
      Plotly.newPlot("plot", fig.data, fig.layout);
    </script>
  </body>
</html>`;
  const outFile = outPath || path.join(process.cwd(), "var", "plots", `plot-${Date.now()}.html`);
  const dir = path.dirname(outFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outFile, html);
  console.log("Plot saved to", outFile);
}
