const { v4: uuidv4 } = require('uuid');

const THREAT_TYPES = [
  { type: 'MALWARE', severity: 'critical', icon: '🦠', color: '#ff1744' },
  { type: 'RANSOMWARE', severity: 'critical', icon: '🔒', color: '#d50000' },
  { type: 'PHISHING', severity: 'high', icon: '🎣', color: '#ff6d00' },
  { type: 'DDoS', severity: 'high', icon: '🌊', color: '#ff9100' },
  { type: 'SQL_INJECTION', severity: 'high', icon: '💉', color: '#ff3d00' },
  { type: 'XSS', severity: 'medium', icon: '📜', color: '#ffc400' },
  { type: 'BRUTE_FORCE', severity: 'medium', icon: '🔨', color: '#ffab00' },
  { type: 'MAN_IN_THE_MIDDLE', severity: 'high', icon: '👤', color: '#ff6d00' },
  { type: 'ZERO_DAY', severity: 'critical', icon: '💀', color: '#b71c1c' },
  { type: 'APT', severity: 'critical', icon: '🎯', color: '#880e4f' },
  { type: 'CRYPTOJACKING', severity: 'medium', icon: '⛏️', color: '#e65100' },
  { type: 'INSIDER_THREAT', severity: 'high', icon: '🕵️', color: '#bf360c' },
  { type: 'SUPPLY_CHAIN', severity: 'critical', icon: '🔗', color: '#d50000' },
  { type: 'DNS_TUNNELING', severity: 'medium', icon: '🌐', color: '#f57f17' },
  { type: 'PORT_SCAN', severity: 'low', icon: '🔍', color: '#827717' },
];

const COUNTRIES = [
  { code: 'CN', name: 'China', lat: 35.86, lng: 104.19 },
  { code: 'RU', name: 'Russia', lat: 61.52, lng: 105.31 },
  { code: 'US', name: 'United States', lat: 37.09, lng: -95.71 },
  { code: 'KP', name: 'North Korea', lat: 40.34, lng: 127.51 },
  { code: 'IR', name: 'Iran', lat: 32.42, lng: 53.69 },
  { code: 'BR', name: 'Brazil', lat: -14.23, lng: -51.92 },
  { code: 'IN', name: 'India', lat: 20.59, lng: 78.96 },
  { code: 'DE', name: 'Germany', lat: 51.16, lng: 10.45 },
  { code: 'GB', name: 'United Kingdom', lat: 55.37, lng: -3.43 },
  { code: 'UA', name: 'Ukraine', lat: 48.37, lng: 31.16 },
  { code: 'IL', name: 'Israel', lat: 31.04, lng: 34.85 },
  { code: 'NG', name: 'Nigeria', lat: 9.08, lng: 8.67 },
];

const TARGET_SECTORS = [
  'Financial Services', 'Healthcare', 'Government', 'Energy',
  'Technology', 'Defense', 'Telecommunications', 'Education',
  'Retail', 'Manufacturing', 'Transportation', 'Critical Infrastructure'
];

const ATTACK_VECTORS = [
  'Email Attachment', 'Watering Hole', 'Drive-by Download', 'USB Drop',
  'Social Engineering', 'Exploit Kit', 'Command & Control', 'Lateral Movement',
  'Credential Stuffing', 'API Abuse', 'Firmware Exploit', 'Cloud Misconfiguration'
];

const CVE_PREFIXES = ['CVE-2024', 'CVE-2025', 'CVE-2026'];

class ThreatEngine {
  constructor() {
    this.threats = [];
    this.threatStats = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      blocked: 0,
      investigating: 0,
      active: 0,
    };
    this.threatTimeline = [];
    this.geoData = [];
    this.initHistoricalData();
  }

  initHistoricalData() {
    const now = Date.now();
    for (let i = 1440; i >= 0; i--) {
      const timestamp = now - i * 60000;
      const count = Math.floor(Math.random() * 5) + 1;
      this.threatTimeline.push({
        timestamp,
        count,
        critical: Math.floor(Math.random() * 2),
        high: Math.floor(Math.random() * 3),
        medium: Math.floor(Math.random() * 3),
        low: Math.floor(Math.random() * 2),
      });
    }

    for (let i = 0; i < 200; i++) {
      this.threats.push(this.generateThreat(now - Math.random() * 86400000));
    }
    this.threats.sort((a, b) => b.timestamp - a.timestamp);
    this.recalculateStats();
  }

  generateThreat(timestamp = Date.now()) {
    const threatType = THREAT_TYPES[Math.floor(Math.random() * THREAT_TYPES.length)];
    const source = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    const target = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    const sector = TARGET_SECTORS[Math.floor(Math.random() * TARGET_SECTORS.length)];
    const vector = ATTACK_VECTORS[Math.floor(Math.random() * ATTACK_VECTORS.length)];
    const statuses = ['active', 'blocked', 'investigating', 'mitigated'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const cvss = (Math.random() * 4 + 6).toFixed(1);

    return {
      id: uuidv4(),
      type: threatType.type,
      severity: threatType.severity,
      icon: threatType.icon,
      color: threatType.color,
      source: { ...source },
      target: { ...target },
      sector,
      vector,
      status,
      cvss: parseFloat(cvss),
      cve: `${CVE_PREFIXES[Math.floor(Math.random() * CVE_PREFIXES.length)]}-${Math.floor(Math.random() * 90000 + 10000)}`,
      timestamp,
      iocs: this.generateIOCs(),
      confidence: Math.floor(Math.random() * 30 + 70),
      ttps: this.generateTTPs(),
    };
  }

  generateIOCs() {
    const count = Math.floor(Math.random() * 4) + 1;
    const iocs = [];
    for (let i = 0; i < count; i++) {
      const types = ['ip', 'domain', 'hash', 'url'];
      const type = types[Math.floor(Math.random() * types.length)];
      let value;
      switch (type) {
        case 'ip':
          value = `${Math.floor(Math.random()*223+1)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`;
          break;
        case 'domain':
          value = `${['mal','evil','dark','hack','bad'][Math.floor(Math.random()*5)]}${Math.floor(Math.random()*999)}.${['xyz','top','tk','cc','ru'][Math.floor(Math.random()*5)]}`;
          break;
        case 'hash':
          value = Array.from({length: 64}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
          break;
        case 'url':
          value = `https://${Math.floor(Math.random()*223+1)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}/payload`;
          break;
      }
      iocs.push({ type, value });
    }
    return iocs;
  }

  generateTTPs() {
    const tactics = ['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
      'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
      'Collection', 'Exfiltration', 'Impact'];
    const count = Math.floor(Math.random() * 3) + 1;
    return Array.from({ length: count }, () => {
      const tactic = tactics[Math.floor(Math.random() * tactics.length)];
      return {
        tactic,
        technique: `T${Math.floor(Math.random() * 9000 + 1000)}`,
      };
    });
  }

  tick() {
    const shouldGenerate = Math.random() < 0.3;
    if (!shouldGenerate) return null;

    const threat = this.generateThreat();
    this.threats.unshift(threat);
    if (this.threats.length > 500) this.threats.pop();

    const last = this.threatTimeline[this.threatTimeline.length - 1];
    const now = Date.now();
    if (now - last.timestamp > 60000) {
      this.threatTimeline.push({
        timestamp: now,
        count: 1,
        critical: threat.severity === 'critical' ? 1 : 0,
        high: threat.severity === 'high' ? 1 : 0,
        medium: threat.severity === 'medium' ? 1 : 0,
        low: threat.severity === 'low' ? 1 : 0,
      });
      if (this.threatTimeline.length > 1500) this.threatTimeline.shift();
    } else {
      last.count++;
      last[threat.severity]++;
    }

    this.recalculateStats();
    return threat;
  }

  recalculateStats() {
    this.threatStats = {
      total: this.threats.length,
      critical: this.threats.filter(t => t.severity === 'critical').length,
      high: this.threats.filter(t => t.severity === 'high').length,
      medium: this.threats.filter(t => t.severity === 'medium').length,
      low: this.threats.filter(t => t.severity === 'low').length,
      blocked: this.threats.filter(t => t.status === 'blocked').length,
      investigating: this.threats.filter(t => t.status === 'investigating').length,
      active: this.threats.filter(t => t.status === 'active').length,
    };
  }

  getStats() {
    return this.threatStats;
  }

  getRecentThreats(limit = 50) {
    return this.threats.slice(0, limit);
  }

  getTimeline() {
    return this.threatTimeline.slice(-120);
  }

  getThreatsByType() {
    const counts = {};
    this.threats.forEach(t => {
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => {
      const info = THREAT_TYPES.find(tt => tt.type === type);
      return { type, count, color: info?.color || '#fff', icon: info?.icon || '' };
    }).sort((a, b) => b.count - a.count);
  }

  getGeoAttacks() {
    return this.threats.slice(0, 30).map(t => ({
      id: t.id,
      source: t.source,
      target: t.target,
      type: t.type,
      severity: t.severity,
      color: t.color,
    }));
  }

  getSectorBreakdown() {
    const counts = {};
    this.threats.forEach(t => {
      counts[t.sector] = (counts[t.sector] || 0) + 1;
    });
    return Object.entries(counts).map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count);
  }
}

module.exports = ThreatEngine;
