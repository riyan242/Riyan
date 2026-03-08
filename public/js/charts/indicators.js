// Mini chart renderer for dashboard panels
class MiniChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;
  }

  drawCandlestick(candles) {
    if (!this.width) this.resize();
    if (!candles.length) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const visible = candles.slice(-80);
    const padding = 5;
    const cw = Math.max(2, (this.width - padding * 2) / visible.length - 1);

    let min = Infinity, max = -Infinity;
    visible.forEach(c => { min = Math.min(min, c.low); max = Math.max(max, c.high); });
    const range = max - min || 1;
    min -= range * 0.05;
    max += range * 0.05;
    const adjRange = max - min;

    const toY = (p) => padding + (1 - (p - min) / adjRange) * (this.height - padding * 2);

    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = padding + i * (cw + 1) + cw / 2;
      const isUp = c.close >= c.open;
      const color = isUp ? '#00e676' : '#ff1744';

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(c.high));
      ctx.lineTo(x, toY(c.low));
      ctx.stroke();

      const top = toY(Math.max(c.open, c.close));
      const bottom = toY(Math.min(c.open, c.close));
      ctx.fillStyle = color;
      ctx.fillRect(x - cw / 2, top, cw, Math.max(1, bottom - top));
    }
  }

  drawDonut(data, colors) {
    if (!this.width) this.resize();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = Math.min(cx, cy) - 10;
    const inner = radius * 0.6;

    let angle = -Math.PI / 2;
    data.forEach((d, i) => {
      const sweep = (d.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle, angle + sweep);
      ctx.arc(cx, cy, inner, angle + sweep, angle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Label
      if (sweep > 0.2) {
        const midAngle = angle + sweep / 2;
        const lx = cx + Math.cos(midAngle) * (radius + inner) / 2;
        const ly = cy + Math.sin(midAngle) * (radius + inner) / 2;
        ctx.fillStyle = '#fff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, lx, ly);
      }
      angle += sweep;
    });
  }
}
