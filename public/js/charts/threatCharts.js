class ThreatCharts {
  static drawTimeline(canvas, data) {
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    if (!data.length) return;

    const padding = { top: 10, bottom: 20, left: 10, right: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    let maxCount = 0;
    data.forEach(d => maxCount = Math.max(maxCount, d.count));
    maxCount = maxCount || 1;

    const barW = Math.max(1, chartW / data.length - 1);

    // Stacked bars
    data.forEach((d, i) => {
      const x = padding.left + (i / data.length) * chartW;
      let y = padding.top + chartH;
      const levels = [
        { val: d.critical, color: '#ff1744' },
        { val: d.high, color: '#ff6d00' },
        { val: d.medium, color: '#ffc400' },
        { val: d.low, color: '#00e676' },
      ];
      levels.forEach(l => {
        const barH = (l.val / maxCount) * chartH;
        y -= barH;
        ctx.fillStyle = l.color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, y, barW, barH);
      });
      ctx.globalAlpha = 1;
    });

    // Trend line
    ctx.strokeStyle = 'rgba(0,229,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding.left + (i / data.length) * chartW + barW / 2;
      const y = padding.top + chartH - (d.count / maxCount) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Time labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const step = Math.floor(data.length / 6);
    for (let i = 0; i < data.length; i += step) {
      const x = padding.left + (i / data.length) * chartW;
      ctx.fillText(Helpers.formatTime(data[i].timestamp), x, h - 4);
    }
  }

  static drawThreatTypes(canvas, data) {
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    if (!data.length) return;

    const total = data.reduce((s, d) => s + d.count, 0);
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(cx, cy) - 20;
    const inner = radius * 0.55;

    let angle = -Math.PI / 2;
    data.forEach(d => {
      const sweep = (d.count / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle, angle + sweep);
      ctx.arc(cx, cy, inner, angle + sweep, angle, true);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (sweep > 0.25) {
        const mid = angle + sweep / 2;
        const lx = cx + Math.cos(mid) * (radius + 14);
        const ly = cy + Math.sin(mid) * (radius + 14);
        ctx.fillStyle = '#fff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.type.replace(/_/g, ' '), lx, ly);
      }
      angle += sweep;
    });

    // Center text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), cx, cy - 6);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('TOTAL', cx, cy + 10);
  }

  static drawAttackVectors(canvas, threats) {
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const counts = {};
    threats.forEach(t => { counts[t.vector] = (counts[t.vector] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!sorted.length) return;

    const max = sorted[0][1];
    const barH = Math.min(20, (h - 10) / sorted.length - 4);

    sorted.forEach(([vector, count], i) => {
      const y = 5 + i * (barH + 4);
      const barW = (count / max) * (w - 100);

      const gradient = ctx.createLinearGradient(80, 0, 80 + barW, 0);
      gradient.addColorStop(0, 'rgba(0,229,255,0.6)');
      gradient.addColorStop(1, 'rgba(124,77,255,0.6)');
      ctx.fillStyle = gradient;
      ctx.fillRect(80, y, barW, barH);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(vector.length > 12 ? vector.slice(0, 12) + '..' : vector, 75, y + barH / 2);

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(count.toString(), 85 + barW, y + barH / 2);
    });
  }

  static drawThreatMap(canvas, attacks) {
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // Simple world map background
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const x = (i / 12) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const y = (i / 6) * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const lngToX = (lng) => ((lng + 180) / 360) * w;
    const latToY = (lat) => ((90 - lat) / 180) * h;

    // Draw attack arcs
    attacks.forEach((atk, idx) => {
      const sx = lngToX(atk.source.lng);
      const sy = latToY(atk.source.lat);
      const tx = lngToX(atk.target.lng);
      const ty = latToY(atk.target.lat);

      // Arc
      const progress = ((Date.now() / 1000 + idx * 0.5) % 3) / 3;
      ctx.strokeStyle = Helpers.hexToRgba(atk.color, 0.3 + progress * 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      const cpX = (sx + tx) / 2;
      const cpY = Math.min(sy, ty) - 30 - Math.random() * 20;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cpX, cpY, tx, ty);
      ctx.stroke();

      // Animated dot on arc
      const dotT = progress;
      const dotX = (1-dotT)*(1-dotT)*sx + 2*(1-dotT)*dotT*cpX + dotT*dotT*tx;
      const dotY = (1-dotT)*(1-dotT)*sy + 2*(1-dotT)*dotT*cpY + dotT*dotT*ty;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
      ctx.fillStyle = atk.color;
      ctx.fill();

      // Source dot
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = atk.color;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Target dot with pulse
      ctx.beginPath();
      ctx.arc(tx, ty, 4 + Math.sin(Date.now() / 500 + idx) * 2, 0, Math.PI * 2);
      ctx.fillStyle = Helpers.hexToRgba(atk.color, 0.3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fillStyle = atk.color;
      ctx.fill();
    });

    // Legend
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${attacks.length} Active Attack Vectors`, 10, h - 10);
  }
}
