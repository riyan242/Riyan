class OrderBookRenderer {
  static render(data, symbol) {
    const asksEl = document.getElementById('orderbookAsks');
    const bidsEl = document.getElementById('orderbookBids');
    const spreadEl = document.getElementById('orderbookSpread');

    if (!data || !data.asks || !data.bids) return;

    const maxTotal = Math.max(
      data.asks.length ? data.asks[data.asks.length - 1].total : 0,
      data.bids.length ? data.bids[data.bids.length - 1].total : 0
    ) || 1;

    // Asks (reversed to show lowest at bottom)
    const asksReversed = data.asks.slice(0, 10).reverse();
    asksEl.innerHTML = asksReversed.map(a => `
      <div class="ob-row ask">
        <div class="ob-bg" style="width:${(a.total / maxTotal) * 100}%"></div>
        <span class="ob-price">${Helpers.formatPrice(a.price)}</span>
        <span class="ob-qty">${a.quantity.toFixed(4)}</span>
        <span class="ob-total">${a.total.toFixed(4)}</span>
      </div>
    `).join('');

    // Bids
    bidsEl.innerHTML = data.bids.slice(0, 10).map(b => `
      <div class="ob-row bid">
        <div class="ob-bg" style="width:${(b.total / maxTotal) * 100}%"></div>
        <span class="ob-price">${Helpers.formatPrice(b.price)}</span>
        <span class="ob-qty">${b.quantity.toFixed(4)}</span>
        <span class="ob-total">${b.total.toFixed(4)}</span>
      </div>
    `).join('');

    // Spread
    if (data.asks.length && data.bids.length) {
      const spread = data.asks[0].price - data.bids[0].price;
      spreadEl.textContent = `Spread: $${Helpers.formatPrice(spread)} (${((spread / data.asks[0].price) * 100).toFixed(3)}%)`;
    }
  }

  static renderTrades(trades, symbol) {
    const el = document.getElementById('tradesList');
    const filtered = trades.filter(t => t.symbol === symbol).slice(0, 20);

    el.innerHTML = filtered.map(t => `
      <div class="trade-row ${t.side}">
        <span class="trade-price">${Helpers.formatPrice(t.price)}</span>
        <span class="trade-qty">${t.quantity.toFixed(4)}</span>
        <span class="trade-time">${Helpers.formatTime(t.timestamp)}</span>
      </div>
    `).join('');
  }
}
