class ThreatFeedRenderer {
  static renderFeed(threats, container) {
    container.innerHTML = threats.slice(0, 30).map(t => `
      <div class="threat-feed-item ${t.severity}" data-id="${t.id}">
        <span class="tfi-icon">${t.icon}</span>
        <div class="tfi-content">
          <div class="tfi-type">
            ${t.type.replace(/_/g, ' ')}
            <span class="tfi-severity ${t.severity}">${t.severity}</span>
          </div>
          <div class="tfi-details">
            ${t.source.code} → ${t.target.code} | ${t.sector} | ${t.vector}
          </div>
        </div>
        <span class="tfi-time">${Helpers.timeAgo(t.timestamp)}</span>
      </div>
    `).join('');
  }

  static addThreat(threat, container) {
    const item = document.createElement('div');
    item.className = `threat-feed-item ${threat.severity}`;
    item.dataset.id = threat.id;
    item.innerHTML = `
      <span class="tfi-icon">${threat.icon}</span>
      <div class="tfi-content">
        <div class="tfi-type">
          ${threat.type.replace(/_/g, ' ')}
          <span class="tfi-severity ${threat.severity}">${threat.severity}</span>
        </div>
        <div class="tfi-details">
          ${threat.source.code} → ${threat.target.code} | ${threat.sector} | ${threat.vector}
        </div>
      </div>
      <span class="tfi-time">just now</span>
    `;
    container.insertBefore(item, container.firstChild);

    // Keep max 30 items
    while (container.children.length > 30) {
      container.removeChild(container.lastChild);
    }
  }

  static renderTable(threats, tbody) {
    tbody.innerHTML = threats.map(t => {
      const cvssClass = t.cvss >= 9 ? 'critical' : t.cvss >= 7 ? 'high' : 'medium';
      return `
        <tr data-id="${t.id}">
          <td>${t.icon} ${t.type.replace(/_/g, ' ')}</td>
          <td><span class="severity-badge ${t.severity}">${t.severity}</span></td>
          <td>${t.source.name} (${t.source.code})</td>
          <td>${t.target.name} (${t.target.code})</td>
          <td>${t.sector}</td>
          <td><span class="cvss-score ${cvssClass}">${t.cvss}</span></td>
          <td><span class="status-badge ${t.status}">${t.status}</span></td>
          <td>${Helpers.timeAgo(t.timestamp)}</td>
        </tr>
      `;
    }).join('');
  }

  static renderDetail(threat, container) {
    if (!threat) {
      container.innerHTML = '<p class="no-selection">Select a threat to view details</p>';
      return;
    }

    container.innerHTML = `
      <div class="td-header">
        <span class="td-icon">${threat.icon}</span>
        <div>
          <div class="td-title">${threat.type.replace(/_/g, ' ')}</div>
          <span class="severity-badge ${threat.severity}">${threat.severity}</span>
          <span class="status-badge ${threat.status}">${threat.status}</span>
        </div>
      </div>
      <div class="td-field">
        <span class="td-label">CVE</span>
        <span class="td-value">${threat.cve}</span>
      </div>
      <div class="td-field">
        <span class="td-label">CVSS Score</span>
        <span class="td-value cvss-score ${threat.cvss >= 9 ? 'critical' : threat.cvss >= 7 ? 'high' : 'medium'}">${threat.cvss}</span>
      </div>
      <div class="td-field">
        <span class="td-label">Source</span>
        <span class="td-value">${threat.source.name} (${threat.source.code})</span>
      </div>
      <div class="td-field">
        <span class="td-label">Target</span>
        <span class="td-value">${threat.target.name} (${threat.target.code})</span>
      </div>
      <div class="td-field">
        <span class="td-label">Sector</span>
        <span class="td-value">${threat.sector}</span>
      </div>
      <div class="td-field">
        <span class="td-label">Vector</span>
        <span class="td-value">${threat.vector}</span>
      </div>
      <div class="td-field">
        <span class="td-label">Confidence</span>
        <span class="td-value">${threat.confidence}%</span>
      </div>
      <div class="td-field">
        <span class="td-label">Detected</span>
        <span class="td-value">${Helpers.formatDate(threat.timestamp)}</span>
      </div>
      <div class="td-section-title">Indicators of Compromise</div>
      ${threat.iocs.map(ioc => `
        <div class="td-ioc">
          <span class="td-ioc-type">${ioc.type}</span>
          ${ioc.value}
        </div>
      `).join('')}
      <div class="td-section-title">TTPs (MITRE ATT&CK)</div>
      ${threat.ttps.map(ttp => `
        <div class="td-ttp">
          <span>${ttp.tactic}</span>
          <span class="td-ttp-technique">${ttp.technique}</span>
        </div>
      `).join('')}
    `;
  }
}
