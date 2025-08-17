import fs from "fs";
import path from "path";
import plotly from "plotly.js-dist-min";

interface EquityPoint {
  ts: number;
  equity: number;
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

  const fig = {
    data: [equityTrace, tradesLongTrace, tradesShortTrace],
    layout: {
      title: "PnL and Trades",
      xaxis: { title: "Time" },
      yaxis: { title: "Equity" }
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
