class PortfolioRenderer {
  static render(portfolio) {
    // Summary
    document.getElementById('portfolioTotal').textContent = `$${Helpers.formatPrice(portfolio.totalValue)}`;
    document.getElementById('portfolioCash').textContent = `$${Helpers.formatPrice(portfolio.balance)}`;

    const invested = portfolio.totalValue - portfolio.balance;
    document.getElementById('portfolioInvested').textContent = `$${Helpers.formatPrice(invested)}`;

    const totalPnl = Object.values(portfolio.positions).reduce((s, p) => s + p.pnl, 0);
    const pnlEl = document.getElementById('portfolioPnl');
    pnlEl.textContent = `${totalPnl >= 0 ? '+' : ''}$${Helpers.formatPrice(totalPnl)}`;
    pnlEl.className = `ps-value ${totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`;

    // Update available balance in order form
    document.getElementById('availableBalance').textContent = `$${Helpers.formatPrice(portfolio.balance)}`;

    // Positions table
    const posBody = document.getElementById('positionsBody');
    const positions = Object.entries(portfolio.positions);
    const noPos = document.getElementById('noPositions');

    if (positions.length === 0) {
      posBody.innerHTML = '';
      noPos.style.display = 'block';
    } else {
      noPos.style.display = 'none';
      posBody.innerHTML = positions.map(([sym, pos]) => `
        <tr>
          <td style="font-weight:600">${sym}</td>
          <td>${pos.quantity.toFixed(4)}</td>
          <td>$${Helpers.formatPrice(pos.avgPrice)}</td>
          <td>$${Helpers.formatPrice(pos.currentPrice)}</td>
          <td>$${Helpers.formatPrice(pos.marketValue)}</td>
          <td class="${pos.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">
            ${pos.pnl >= 0 ? '+' : ''}$${Helpers.formatPrice(pos.pnl)}
          </td>
          <td class="${pos.pnlPercent >= 0 ? 'pnl-positive' : 'pnl-negative'}">
            ${pos.pnlPercent >= 0 ? '+' : ''}${pos.pnlPercent.toFixed(2)}%
          </td>
        </tr>
      `).join('');
    }

    // Trade history
    const histBody = document.getElementById('historyBody');
    const noHist = document.getElementById('noHistory');
    if (portfolio.tradeHistory.length === 0) {
      histBody.innerHTML = '';
      noHist.style.display = 'block';
    } else {
      noHist.style.display = 'none';
      histBody.innerHTML = portfolio.tradeHistory.map(t => `
        <tr>
          <td>${Helpers.formatTime(t.timestamp)}</td>
          <td style="font-weight:600">${t.symbol}</td>
          <td class="${t.side === 'buy' ? 'side-buy' : 'side-sell'}">${t.side.toUpperCase()}</td>
          <td>${t.type}</td>
          <td>${t.quantity.toFixed(4)}</td>
          <td>$${Helpers.formatPrice(t.price)}</td>
          <td>$${Helpers.formatPrice(t.total)}</td>
          <td><span class="status-filled">${t.status}</span></td>
        </tr>
      `).join('');
    }

    // Donut chart
    const donutCanvas = document.getElementById('portfolioDonut');
    if (donutCanvas && positions.length > 0) {
      const chart = new MiniChart(donutCanvas);
      const colors = ['#00e5ff', '#7c4dff', '#00e676', '#ff9100', '#ff1744', '#ffc400', '#e040fb', '#18ffff'];
      const data = positions.map(([sym, pos]) => ({ label: sym, value: pos.marketValue }));
      if (portfolio.balance > 0) data.push({ label: 'Cash', value: portfolio.balance });
      chart.drawDonut(data, colors);
    }
  }
}
