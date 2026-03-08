class CandlestickChart {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.candles = [];
    this.chartType = options.chartType || 'candle';
    this.indicators = { sma: true, ema: false, bollinger: false, volume: true, rsi: false, macd: false };
    this.offset = 0;
    this.zoom = 1;
    this.crosshair = null;
    this.subCanvas = options.subCanvas || null;
    this.subCtx = this.subCanvas ? this.subCanvas.getContext('2d') : null;
    this.crosshairEl = options.crosshairEl || null;
    this.yAxisEl = options.yAxisEl || null;
    this.setupEvents();
  }

  setupEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Helpers.clamp(this.zoom + (e.deltaY > 0 ? 0.1 : -0.1), 0.3, 5);
      this.render();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.crosshair = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.crosshair = null;
      if (this.crosshairEl) this.crosshairEl.style.display = 'none';
      this.render();
    });
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;

    if (this.subCanvas) {
      const subRect = this.subCanvas.parentElement.getBoundingClientRect();
      this.subCanvas.width = subRect.width * window.devicePixelRatio;
      this.subCanvas.height = subRect.height * window.devicePixelRatio;
      this.subCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
      this.subWidth = subRect.width;
      this.subHeight = subRect.height;
    }
  }

  setData(candles) {
    this.candles = candles;
    this.render();
  }

  updateLastCandle(candle) {
    if (this.candles.length && candle) {
      const last = this.candles[this.candles.length - 1];
      if (Math.abs(candle.timestamp - last.timestamp) < 90000) {
        this.candles[this.candles.length - 1] = candle;
      } else {
        this.candles.push(candle);
        if (this.candles.length > 600) this.candles.shift();
      }
      this.render();
    }
  }

  calcSMA(period) {
    const result = [];
    for (let i = 0; i < this.candles.length; i++) {
      if (i < period - 1) { result.push(null); continue; }
      let sum = 0;
      for (let j = 0; j < period; j++) sum += this.candles[i - j].close;
      result.push(sum / period);
    }
    return result;
  }

  calcEMA(period) {
    const result = [];
    const k = 2 / (period + 1);
    let ema = this.candles[0]?.close || 0;
    for (let i = 0; i < this.candles.length; i++) {
      ema = this.candles[i].close * k + ema * (1 - k);
      result.push(i >= period - 1 ? ema : null);
    }
    return result;
  }

  calcBollinger(period = 20, stdDev = 2) {
    const sma = this.calcSMA(period);
    const upper = [], lower = [];
    for (let i = 0; i < this.candles.length; i++) {
      if (sma[i] === null) { upper.push(null); lower.push(null); continue; }
      let variance = 0;
      for (let j = 0; j < period; j++) variance += Math.pow(this.candles[i - j].close - sma[i], 2);
      const std = Math.sqrt(variance / period);
      upper.push(sma[i] + stdDev * std);
      lower.push(sma[i] - stdDev * std);
    }
    return { sma, upper, lower };
  }

  calcRSI(period = 14) {
    const result = [];
    let gains = 0, losses = 0;
    for (let i = 0; i < this.candles.length; i++) {
      if (i === 0) { result.push(50); continue; }
      const change = this.candles[i].close - this.candles[i - 1].close;
      if (i <= period) {
        if (change > 0) gains += change; else losses -= change;
        if (i === period) {
          gains /= period; losses /= period;
          const rs = losses === 0 ? 100 : gains / losses;
          result.push(100 - 100 / (1 + rs));
        } else { result.push(null); }
      } else {
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;
        gains = (gains * (period - 1) + gain) / period;
        losses = (losses * (period - 1) + loss) / period;
        const rs = losses === 0 ? 100 : gains / losses;
        result.push(100 - 100 / (1 + rs));
      }
    }
    return result;
  }

  render() {
    if (!this.width) this.resize();
    if (!this.candles.length) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const candleWidth = Math.max(3, 8 / this.zoom);
    const gap = Math.max(1, 2 / this.zoom);
    const totalWidth = candleWidth + gap;
    const visibleCount = Math.floor(this.width / totalWidth);
    const startIdx = Math.max(0, this.candles.length - visibleCount - this.offset);
    const endIdx = Math.min(this.candles.length, startIdx + visibleCount);
    const visible = this.candles.slice(startIdx, endIdx);

    if (!visible.length) return;

    const chartHeight = this.indicators.volume ? this.height * 0.75 : this.height;
    const volumeHeight = this.height - chartHeight;
    const padding = { top: 10, bottom: 10 };

    let minPrice = Infinity, maxPrice = -Infinity, maxVol = 0;
    visible.forEach(c => {
      minPrice = Math.min(minPrice, c.low);
      maxPrice = Math.max(maxPrice, c.high);
      maxVol = Math.max(maxVol, c.volume);
    });
    const priceRange = maxPrice - minPrice || 1;
    const pricePad = priceRange * 0.05;
    minPrice -= pricePad;
    maxPrice += pricePad;
    const adjRange = maxPrice - minPrice;

    const priceToY = (p) => padding.top + (1 - (p - minPrice) / adjRange) * (chartHeight - padding.top - padding.bottom);
    const idxToX = (i) => (i - startIdx) * totalWidth + candleWidth / 2;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridLines = 6;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * (chartHeight - padding.top - padding.bottom);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Bollinger Bands
    if (this.indicators.bollinger) {
      const bb = this.calcBollinger();
      ctx.fillStyle = 'rgba(124,77,255,0.05)';
      ctx.beginPath();
      let started = false;
      for (let i = startIdx; i < endIdx; i++) {
        if (bb.upper[i] === null) continue;
        const x = idxToX(i);
        if (!started) { ctx.moveTo(x, priceToY(bb.upper[i])); started = true; }
        else ctx.lineTo(x, priceToY(bb.upper[i]));
      }
      for (let i = endIdx - 1; i >= startIdx; i--) {
        if (bb.lower[i] === null) continue;
        ctx.lineTo(idxToX(i), priceToY(bb.lower[i]));
      }
      ctx.fill();

      this.drawLine(ctx, bb.upper, startIdx, endIdx, idxToX, priceToY, 'rgba(124,77,255,0.4)', 1);
      this.drawLine(ctx, bb.lower, startIdx, endIdx, idxToX, priceToY, 'rgba(124,77,255,0.4)', 1);
    }

    // SMA
    if (this.indicators.sma) {
      const sma = this.calcSMA(20);
      this.drawLine(ctx, sma, startIdx, endIdx, idxToX, priceToY, '#ffc400', 1.5);
    }

    // EMA
    if (this.indicators.ema) {
      const ema = this.calcEMA(12);
      this.drawLine(ctx, ema, startIdx, endIdx, idxToX, priceToY, '#00e5ff', 1.5);
    }

    // Candles / Line / Area
    if (this.chartType === 'candle') {
      for (let i = startIdx; i < endIdx; i++) {
        const c = this.candles[i];
        const x = idxToX(i);
        const isUp = c.close >= c.open;
        const color = isUp ? '#00e676' : '#ff1744';

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, priceToY(c.high));
        ctx.lineTo(x, priceToY(c.low));
        ctx.stroke();

        const top = priceToY(Math.max(c.open, c.close));
        const bottom = priceToY(Math.min(c.open, c.close));
        const bodyHeight = Math.max(1, bottom - top);

        if (isUp) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.strokeRect(x - candleWidth / 2, top, candleWidth, bodyHeight);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(x - candleWidth / 2, top, candleWidth, bodyHeight);
        }
      }
    } else if (this.chartType === 'line') {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = startIdx; i < endIdx; i++) {
        const x = idxToX(i);
        const y = priceToY(this.candles[i].close);
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (this.chartType === 'area') {
      const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
      gradient.addColorStop(0, 'rgba(0,229,255,0.3)');
      gradient.addColorStop(1, 'rgba(0,229,255,0)');

      ctx.beginPath();
      for (let i = startIdx; i < endIdx; i++) {
        const x = idxToX(i);
        const y = priceToY(this.candles[i].close);
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(idxToX(endIdx - 1), chartHeight);
      ctx.lineTo(idxToX(startIdx), chartHeight);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = startIdx; i < endIdx; i++) {
        const x = idxToX(i);
        const y = priceToY(this.candles[i].close);
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Volume bars
    if (this.indicators.volume && volumeHeight > 0) {
      const volY = chartHeight;
      for (let i = startIdx; i < endIdx; i++) {
        const c = this.candles[i];
        const x = idxToX(i);
        const isUp = c.close >= c.open;
        const barH = (c.volume / maxVol) * (volumeHeight - 10);
        ctx.fillStyle = isUp ? 'rgba(0,230,118,0.3)' : 'rgba(255,23,68,0.3)';
        ctx.fillRect(x - candleWidth / 2, volY + volumeHeight - barH - 5, candleWidth, barH);
      }
    }

    // Current price line
    const lastPrice = visible[visible.length - 1].close;
    const lastY = priceToY(lastPrice);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = lastPrice >= visible[0].close ? 'rgba(0,230,118,0.5)' : 'rgba(255,23,68,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, lastY);
    ctx.lineTo(this.width, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label
    ctx.fillStyle = lastPrice >= visible[0].close ? '#00e676' : '#ff1744';
    ctx.fillRect(this.width - 65, lastY - 10, 65, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText(Helpers.formatPrice(lastPrice), this.width - 5, lastY + 4);

    // Crosshair
    if (this.crosshair) {
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.crosshair.x, 0);
      ctx.lineTo(this.crosshair.x, this.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, this.crosshair.y);
      ctx.lineTo(this.width, this.crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const hoveredIdx = Math.round(this.crosshair.x / totalWidth) + startIdx;
      if (hoveredIdx >= 0 && hoveredIdx < this.candles.length && this.crosshairEl) {
        const c = this.candles[hoveredIdx];
        this.crosshairEl.style.display = 'block';
        this.crosshairEl.innerHTML = `O: ${Helpers.formatPrice(c.open)} H: ${Helpers.formatPrice(c.high)} L: ${Helpers.formatPrice(c.low)} C: ${Helpers.formatPrice(c.close)} V: ${Helpers.formatNumber(c.volume)}`;
      }
    }

    // Y-axis labels
    if (this.yAxisEl) {
      this.yAxisEl.innerHTML = '';
      for (let i = 0; i <= gridLines; i++) {
        const price = maxPrice - (i / gridLines) * adjRange;
        const label = document.createElement('span');
        label.textContent = Helpers.formatPrice(price);
        this.yAxisEl.appendChild(label);
      }
    }

    // Sub-chart (RSI or MACD)
    if (this.subCtx && this.subWidth) {
      this.renderSubChart(startIdx, endIdx, idxToX);
    }
  }

  renderSubChart(startIdx, endIdx, idxToX) {
    const ctx = this.subCtx;
    ctx.clearRect(0, 0, this.subWidth, this.subHeight);

    if (this.indicators.rsi) {
      const rsi = this.calcRSI();
      const padding = 5;
      const h = this.subHeight - padding * 2;

      // Background
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0, 0, this.subWidth, this.subHeight);

      // Overbought/oversold zones
      ctx.fillStyle = 'rgba(255,23,68,0.05)';
      ctx.fillRect(0, padding, this.subWidth, h * 0.3);
      ctx.fillStyle = 'rgba(0,230,118,0.05)';
      ctx.fillRect(0, padding + h * 0.7, this.subWidth, h * 0.3);

      // Lines at 30/70
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      [30, 50, 70].forEach(level => {
        const y = padding + (1 - level / 100) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.subWidth, y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // RSI line
      ctx.strokeStyle = '#7c4dff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (let i = startIdx; i < endIdx; i++) {
        if (rsi[i] === null) continue;
        const x = idxToX(i);
        const y = padding + (1 - rsi[i] / 100) * h;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('RSI(14)', 5, 12);
      const lastRsi = rsi[endIdx - 1];
      if (lastRsi !== null) {
        ctx.fillStyle = lastRsi > 70 ? '#ff1744' : lastRsi < 30 ? '#00e676' : '#7c4dff';
        ctx.textAlign = 'right';
        ctx.fillText(lastRsi.toFixed(1), this.subWidth - 5, 12);
      }
    } else {
      // Volume sub-chart
      let maxVol = 0;
      for (let i = startIdx; i < endIdx; i++) maxVol = Math.max(maxVol, this.candles[i].volume);
      const cw = Math.max(3, 8 / this.zoom);
      for (let i = startIdx; i < endIdx; i++) {
        const c = this.candles[i];
        const x = idxToX(i);
        const isUp = c.close >= c.open;
        const barH = (c.volume / maxVol) * (this.subHeight - 15);
        ctx.fillStyle = isUp ? 'rgba(0,230,118,0.4)' : 'rgba(255,23,68,0.4)';
        ctx.fillRect(x - cw / 2, this.subHeight - barH - 5, cw, barH);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Volume', 5, 12);
    }
  }

  drawLine(ctx, data, startIdx, endIdx, idxToX, priceToY, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    let started = false;
    for (let i = startIdx; i < endIdx; i++) {
      if (data[i] === null) continue;
      const x = idxToX(i);
      const y = priceToY(data[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
