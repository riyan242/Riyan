const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const ThreatEngine = require('./threatEngine');
const MarketEngine = require('./marketEngine');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const threatEngine = new ThreatEngine();
const marketEngine = new MarketEngine();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// REST API
app.get('/api/threats', (req, res) => {
  res.json({
    stats: threatEngine.getStats(),
    threats: threatEngine.getRecentThreats(parseInt(req.query.limit) || 50),
    timeline: threatEngine.getTimeline(),
    byType: threatEngine.getThreatsByType(),
    geoAttacks: threatEngine.getGeoAttacks(),
    sectors: threatEngine.getSectorBreakdown(),
  });
});

app.get('/api/market/symbols', (req, res) => {
  res.json(marketEngine.getSymbols());
});

app.get('/api/market/candles/:symbol', (req, res) => {
  const symbol = decodeURIComponent(req.params.symbol);
  res.json(marketEngine.getCandles(symbol));
});

app.get('/api/market/orderbook/:symbol', (req, res) => {
  const symbol = decodeURIComponent(req.params.symbol);
  res.json(marketEngine.getOrderBook(symbol));
});

app.get('/api/market/trades', (req, res) => {
  res.json(marketEngine.getRecentTrades());
});

app.get('/api/portfolio', (req, res) => {
  res.json(marketEngine.getPortfolio());
});

app.post('/api/order', (req, res) => {
  const result = marketEngine.executeOrder(req.body);
  res.json(result);
});

// WebSocket
wss.on('connection', (ws) => {
  let subscribedSymbol = 'BTC/USD';

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'subscribe') {
        subscribedSymbol = msg.symbol;
        ws.send(JSON.stringify({
          type: 'candles',
          symbol: subscribedSymbol,
          data: marketEngine.getCandles(subscribedSymbol),
        }));
        ws.send(JSON.stringify({
          type: 'orderbook',
          symbol: subscribedSymbol,
          data: marketEngine.getOrderBook(subscribedSymbol),
        }));
      }
    } catch (e) {}
  });

  const interval = setInterval(() => {
    const marketUpdates = marketEngine.tick();
    const newThreat = threatEngine.tick();

    ws.send(JSON.stringify({ type: 'market', data: marketUpdates }));

    if (subscribedSymbol && marketUpdates[subscribedSymbol]) {
      ws.send(JSON.stringify({
        type: 'candle_update',
        symbol: subscribedSymbol,
        data: marketUpdates[subscribedSymbol].lastCandle,
      }));
      ws.send(JSON.stringify({
        type: 'orderbook',
        symbol: subscribedSymbol,
        data: marketEngine.getOrderBook(subscribedSymbol),
      }));
    }

    if (newThreat) {
      ws.send(JSON.stringify({
        type: 'threat',
        data: newThreat,
        stats: threatEngine.getStats(),
      }));
    }
  }, 1000);

  ws.on('close', () => clearInterval(interval));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Cyber Threat Trading Platform running on http://localhost:${PORT}`);
});
