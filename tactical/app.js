(function () {
  const STORAGE_KEY = 'twinfang_currency_preference';
  const defaultCurrency = 'USD';
  const FX = {
    SGD: 1.276,
    IDR: 17032,
    MYR: 3.9775,
    PHP: 59.4245,
    USD: 1
  };
  const FX_TIMESTAMP = 'Apr 8, 2026';
  const MARKET_CURRENCY = {
    Indonesia: 'IDR',
    Malaysia: 'MYR',
    Philippines: 'PHP',
    Singapore: 'SGD'
  };
  const buttons = Array.from(document.querySelectorAll('[data-currency-option]'));
  const displayTargets = Array.from(document.querySelectorAll('[data-currency-display]'));
  const root = document.documentElement;

  const recruitmentData = [
    { role: 'Concept Artist', seniority: 'Mid', market: 'Indonesia', minUSD: 1200, maxUSD: 2200, cadence: 'Monthly', note: 'Primary target market. Strong value for core production hiring.' },
    { role: 'Concept Artist', seniority: 'Senior', market: 'Indonesia', minUSD: 2200, maxUSD: 3500, cadence: 'Monthly', note: 'Good benchmark for experienced individual contributors.' },
    { role: 'Concept Artist', seniority: 'Mid', market: 'Malaysia', minUSD: 1800, maxUSD: 3000, cadence: 'Monthly', note: 'Useful secondary benchmark for regional comparison.' },
    { role: 'Concept Artist', seniority: 'Senior', market: 'Malaysia', minUSD: 3000, maxUSD: 4600, cadence: 'Monthly', note: 'Higher cost than Indonesia, still viable for specialist needs.' },
    { role: 'Concept Artist', seniority: 'Mid', market: 'Philippines', minUSD: 1600, maxUSD: 2800, cadence: 'Monthly', note: 'Comparable regional market with strong outsourcing familiarity.' },
    { role: 'Concept Artist', seniority: 'Senior', market: 'Philippines', minUSD: 2800, maxUSD: 4300, cadence: 'Monthly', note: 'Good alternative if Indonesia pipeline is thin.' },
    { role: 'Concept Artist', seniority: 'Mid', market: 'Singapore', minUSD: 3200, maxUSD: 5000, cadence: 'Monthly', note: 'Higher-cost benchmark. Use mainly for local-market calibration.' },
    { role: 'Concept Artist', seniority: 'Senior', market: 'Singapore', minUSD: 5000, maxUSD: 7600, cadence: 'Monthly', note: 'Leadership-adjacent senior benchmark rather than default outsourcing target.' },

    { role: '3D Artist', seniority: 'Mid', market: 'Indonesia', minUSD: 1400, maxUSD: 2500, cadence: 'Monthly', note: 'Relevant for production-heavy outsourcing work.' },
    { role: '3D Artist', seniority: 'Senior', market: 'Indonesia', minUSD: 2500, maxUSD: 3800, cadence: 'Monthly', note: 'Senior range increases with engine pipeline experience.' },
    { role: '3D Artist', seniority: 'Mid', market: 'Malaysia', minUSD: 2200, maxUSD: 3400, cadence: 'Monthly', note: 'Useful comparison for stronger technical pipelines.' },
    { role: '3D Artist', seniority: 'Senior', market: 'Malaysia', minUSD: 3400, maxUSD: 5200, cadence: 'Monthly', note: 'Good benchmark if specialist quality matters more than cost.' },
    { role: '3D Artist', seniority: 'Mid', market: 'Philippines', minUSD: 1900, maxUSD: 3100, cadence: 'Monthly', note: 'Comparable market with outsourcing familiarity.' },
    { role: '3D Artist', seniority: 'Senior', market: 'Philippines', minUSD: 3100, maxUSD: 4800, cadence: 'Monthly', note: 'Viable fallback when Indonesia supply is thin.' },
    { role: '3D Artist', seniority: 'Mid', market: 'Singapore', minUSD: 3600, maxUSD: 5600, cadence: 'Monthly', note: 'Local benchmark, not the default cost-efficient target.' },
    { role: '3D Artist', seniority: 'Senior', market: 'Singapore', minUSD: 5600, maxUSD: 8400, cadence: 'Monthly', note: 'Premium benchmark for highly technical senior hires.' },

    { role: 'Producer', seniority: 'Mid', market: 'Indonesia', minUSD: 1500, maxUSD: 2600, cadence: 'Monthly', note: 'Useful when production support becomes the first bottleneck.' },
    { role: 'Producer', seniority: 'Senior', market: 'Indonesia', minUSD: 2600, maxUSD: 3900, cadence: 'Monthly', note: 'Strong value benchmark for structured delivery support.' },
    { role: 'Producer', seniority: 'Mid', market: 'Malaysia', minUSD: 2200, maxUSD: 3400, cadence: 'Monthly', note: 'Secondary benchmark for experienced coordination support.' },
    { role: 'Producer', seniority: 'Senior', market: 'Malaysia', minUSD: 3400, maxUSD: 5000, cadence: 'Monthly', note: 'Useful when you need stronger client-facing production experience.' },
    { role: 'Producer', seniority: 'Mid', market: 'Philippines', minUSD: 2000, maxUSD: 3200, cadence: 'Monthly', note: 'Alternative benchmark for outsourcing-savvy production hires.' },
    { role: 'Producer', seniority: 'Senior', market: 'Philippines', minUSD: 3200, maxUSD: 4700, cadence: 'Monthly', note: 'Good alternative if Indonesia pipeline is constrained.' },
    { role: 'Producer', seniority: 'Mid', market: 'Singapore', minUSD: 3800, maxUSD: 5800, cadence: 'Monthly', note: 'Local benchmark for coordination roles with stakeholder exposure.' },
    { role: 'Producer', seniority: 'Senior', market: 'Singapore', minUSD: 5800, maxUSD: 8600, cadence: 'Monthly', note: 'High-cost benchmark for senior local production leadership.' },

    { role: 'Art Director', seniority: 'Mid', market: 'Indonesia', minUSD: 2600, maxUSD: 4000, cadence: 'Monthly', note: 'Benchmark only. Not likely the first hire.' },
    { role: 'Art Director', seniority: 'Senior', market: 'Indonesia', minUSD: 4000, maxUSD: 6000, cadence: 'Monthly', note: 'Senior AD benchmark in lower-cost market.' },
    { role: 'Art Director', seniority: 'Mid', market: 'Malaysia', minUSD: 3600, maxUSD: 5400, cadence: 'Monthly', note: 'Leadership benchmark for regional comparison.' },
    { role: 'Art Director', seniority: 'Senior', market: 'Malaysia', minUSD: 5400, maxUSD: 7600, cadence: 'Monthly', note: 'Premium leadership benchmark.' },
    { role: 'Art Director', seniority: 'Mid', market: 'Philippines', minUSD: 3300, maxUSD: 5200, cadence: 'Monthly', note: 'Leadership comparison benchmark.' },
    { role: 'Art Director', seniority: 'Senior', market: 'Philippines', minUSD: 5200, maxUSD: 7200, cadence: 'Monthly', note: 'Alternative benchmark for senior leadership.' },
    { role: 'Art Director', seniority: 'Mid', market: 'Singapore', minUSD: 5000, maxUSD: 7000, cadence: 'Monthly', note: 'Local leadership benchmark rather than immediate target hire.' },
    { role: 'Art Director', seniority: 'Senior', market: 'Singapore', minUSD: 7000, maxUSD: 9800, cadence: 'Monthly', note: 'Top-end local benchmark for senior creative leadership.' }
  ];

  function getSavedCurrency() {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'SGD' || saved === 'USD' ? saved : defaultCurrency;
  }


  function flagBadge(market) {
    const map = { Indonesia: 'id', Malaysia: 'my', Philippines: 'ph', Singapore: 'sg' };
    const code = map[market] || 'xx';
    return `<span class="flag-badge flag-badge--${code}" aria-hidden="true"></span>`;
  }

  function marketLabel(market) {
    return `${flagBadge(market)} <span>${market}</span>`;
  }

  function formatMoneyByCode(value, code) {
    const opts = { maximumFractionDigits: 0 };
    if (code === 'USD') return `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', ...opts }).format(value)} USD`;
    if (code === 'SGD') return `${new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', ...opts }).format(value)} SGD`;
    if (code === 'IDR') return `${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', ...opts }).format(value)} IDR`;
    if (code === 'MYR') return `${new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR', ...opts }).format(value)} MYR`;
    if (code === 'PHP') return `${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', ...opts }).format(value)} PHP`;
    return `${Math.round(value)} ${code}`;
  }

  function money(valueUSD, displayCurrency) {
    return formatMoneyByCode(valueUSD * FX[displayCurrency], displayCurrency);
  }

  function localMoney(valueUSD, market) {
    const code = MARKET_CURRENCY[market] || 'USD';
    return formatMoneyByCode(valueUSD * FX[code], code);
  }


  function fxNote(market, displayCurrency) {
    const localCode = MARKET_CURRENCY[market] || 'USD';
    const parts = [];
    if (displayCurrency !== 'USD') parts.push(`1 USD = ${formatMoneyByCode(FX[displayCurrency], displayCurrency).replace(/\s[A-Z]{3}$/, '')} ${displayCurrency}`);
    if (localCode !== 'USD' && localCode !== displayCurrency) parts.push(`1 USD = ${formatMoneyByCode(FX[localCode], localCode).replace(/\s[A-Z]{3}$/, '')} ${localCode}`);
    if (!parts.length) parts.push('Base currency: USD');
    return `FX used (${FX_TIMESTAMP}): ${parts.join(' · ')}`;
  }

  function numericValueUSD(row) {
    return (row.minUSD + row.maxUSD) / 2;
  }

  function yearlyRangeText(row, currency) {
    return `Yearly equivalent: ${money(row.minUSD * 12, currency)} – ${money(row.maxUSD * 12, currency)}`;
  }

  function hiringPurposeText(row) {
    const purpose = {
      Indonesia: 'Start here for cost-efficient core production hiring and first-pass outreach.',
      Malaysia: 'Use when you need a stronger secondary regional benchmark with technical depth.',
      Philippines: 'Use as a practical fallback market when Indonesia supply is thin or timing is tight.',
      Singapore: 'Use mainly for local-market calibration, leadership benchmarking, and onshore hiring checks.'
    };
    return purpose[row.market] || 'Recommended starting market for this role mix.';
  }

  function pageUseText(row) {
    return `Set an opening benchmark for ${row.role.toLowerCase()}, compare fallback markets, and sense-check annualized cost before moving into live offer design.`;
  }

  function deltaText(row, primaryRow, currency) {
    if (!primaryRow || row.market === primaryRow.market) return '<span class="benchmark-delta is-neutral">Primary baseline</span>';
    const delta = (numericValueUSD(row) - numericValueUSD(primaryRow)) * FX[currency];
    const pct = primaryRow ? ((numericValueUSD(row) - numericValueUSD(primaryRow)) / numericValueUSD(primaryRow)) * 100 : 0;
    const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
    const klass = delta > 0 ? 'is-positive' : delta < 0 ? 'is-negative' : 'is-neutral';
    const deltaAmount = formatMoneyByCode(Math.abs(delta), currency).replace(/\s[A-Z]{3}$/, '');
    return `<span class="benchmark-delta ${klass}">${sign}${deltaAmount} ${currency} vs primary median (${sign}${Math.round(Math.abs(pct))}%)</span>`;
  }

  function renderBarChart(rows, currency, primary, compare) {
    const chartRoot = document.querySelector('[data-region-chart]');
    if (!chartRoot) return;
    const values = rows.flatMap((row) => [row.minUSD, row.maxUSD]).map((v) => v * FX[currency]);
    const maxValue = Math.max(...values, 1);
    const niceMax = Math.ceil(maxValue / 500) * 500;
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((niceMax / tickCount) * (tickCount - i)));

    const columns = rows.map((row) => {
      const minVal = row.minUSD * FX[currency];
      const maxVal = row.maxUSD * FX[currency];
      const medianVal = numericValueUSD(row) * FX[currency];
      const bottomPct = (minVal / niceMax) * 100;
      const heightPct = Math.max(6, ((maxVal - minVal) / niceMax) * 100);
      const medianPct = ((medianVal - minVal) / (maxVal - minVal || 1)) * 100;
      const classes = ['region-column'];
      if (row.market === primary) classes.push('is-primary');
      if (compare !== 'Regional' && row.market === compare) classes.push('is-compare');
      return `
        <div class="region-column-wrap">
          <div class="region-column-meta mono">${money(row.minUSD, currency)} – ${money(row.maxUSD, currency)}</div>
          <div class="region-plot-area">
            <div class="${classes.join(' ')}" style="bottom:${bottomPct}%; height:${heightPct}%">
              <button
                type="button"
                class="region-median-line"
                style="bottom:${Math.max(0, Math.min(100, medianPct))}%"
                aria-label="${row.market} median ${money(numericValueUSD(row), currency)}"
                title="${row.market} median: ${money(numericValueUSD(row), currency)}"
              ></button>
            </div>
          </div>
          <div class="region-x-label">
            <strong>${marketLabel(row.market)}</strong>
            <span>${row.seniority}</span>
          </div>
        </div>`;
    }).join('');

    chartRoot.innerHTML = `
      <div class="region-chart-vertical">
        <div class="region-y-axis">
          ${ticks.map((tick) => `<span>${formatMoneyByCode(tick, currency)}</span>`).join('')}
        </div>
        <div class="region-chart-panel">
          <div class="region-grid-lines">
            ${ticks.map(() => '<span></span>').join('')}
          </div>
          <div class="region-columns">${columns}</div>
        </div>
      </div>`;
  }

  function renderRecruitment(currency) {
    const role = document.querySelector('[data-filter-role]')?.value || 'Concept Artist';
    const seniority = document.querySelector('[data-filter-seniority]')?.value || 'Mid';
    const primary = document.querySelector('[data-filter-primary]')?.value || 'Indonesia';
    const compare = document.querySelector('[data-filter-compare]')?.value || 'Regional';

    const rows = recruitmentData.filter((r) => r.role === role && (seniority === 'All' || r.seniority === seniority));
    const allRegionalRows = rows.slice().sort((a, b) => numericValueUSD(a) - numericValueUSD(b));
    const primaryRow = rows.find((r) => r.market === primary) || null;
    const comparePool = compare === 'Regional'
      ? rows.slice()
      : rows.filter((r) => r.market === compare || r.market === primary);
    const compareRows = comparePool.slice().sort((a, b) => {
      if (a.market === primary) return -1;
      if (b.market === primary) return 1;
      return numericValueUSD(a) - numericValueUSD(b);
    });

    const rangeEl = document.querySelector('[data-role-range]');
    const localEl = document.querySelector('[data-role-local]');
    const captionEl = document.querySelector('[data-role-caption]');
    const targetEl = document.querySelector('[data-hiring-target]');
    const hiringPurposeEl = document.querySelector('[data-hiring-purpose]');
    const pageUseEl = document.querySelector('[data-page-use]');
    const benchEl = document.querySelector('[data-benchmark-list]');
    const noteEl = document.querySelector('[data-role-note]');
    const primaryTag = document.querySelector('[data-primary-market]');
    const roleTitle = document.querySelector('[data-role-title]');
    const chartSubtitle = document.querySelector('[data-chart-subtitle]');
    const roleFx = document.querySelector('[data-role-fx]');
    const compareTitle = document.querySelector('[data-compare-title]');
    const chartTitle = document.querySelector('[data-chart-title]');

    if (roleTitle) roleTitle.textContent = `${role} snapshot`;
    if (compareTitle) compareTitle.textContent = 'Regional comparison';
    if (chartTitle) chartTitle.textContent = `${role} across all markets`;
    if (chartSubtitle) chartSubtitle.textContent = 'Each market is plotted on the X axis and salary value on the Y axis. The column shows the low-to-high range, and the median appears as a hoverable line marker.';

    if (primaryRow) {
      if (rangeEl) rangeEl.textContent = `${money(primaryRow.minUSD, currency)} – ${money(primaryRow.maxUSD, currency)}`;
      if (localEl) localEl.textContent = `${localMoney(primaryRow.minUSD, primaryRow.market)} – ${localMoney(primaryRow.maxUSD, primaryRow.market)}`;
      if (captionEl) captionEl.textContent = yearlyRangeText(primaryRow, currency);
      if (roleFx) roleFx.textContent = fxNote(primaryRow.market, currency);
      if (targetEl) targetEl.innerHTML = marketLabel(primaryRow.market);
      if (hiringPurposeEl) hiringPurposeEl.textContent = hiringPurposeText(primaryRow);
      if (pageUseEl) pageUseEl.textContent = pageUseText(primaryRow);
      if (noteEl) noteEl.textContent = primaryRow.note;
      if (primaryTag) primaryTag.innerHTML = `Primary market: ${marketLabel(primaryRow.market)}`;
    } else {
      if (rangeEl) rangeEl.textContent = 'No benchmark available';
      if (localEl) localEl.textContent = '';
      if (captionEl) captionEl.textContent = 'Yearly equivalent unavailable for this selection';
      if (roleFx) roleFx.textContent = fxNote(primary, currency);
      if (targetEl) targetEl.innerHTML = marketLabel(primary);
      if (hiringPurposeEl) hiringPurposeEl.textContent = 'No benchmark row is currently loaded for this exact combination.';
      if (pageUseEl) pageUseEl.textContent = 'Use nearby markets as a proxy until a cleaner benchmark row is added.';
      if (noteEl) noteEl.textContent = 'There is currently no benchmark row for this exact role / seniority / market combination.';
      if (primaryTag) primaryTag.innerHTML = `Primary market: ${marketLabel(primary)}`;
    }

    if (benchEl) {
      benchEl.innerHTML = compareRows.map((row) => `
        <div class="benchmark-item">
          <div>
            <p class="m-0"><strong>${marketLabel(row.market)}</strong></p>
            <p class="m-0 muted">${row.role} · ${row.seniority}</p>
          </div>
          <div class="right benchmark-value mono">
            <p class="m-0"><strong>${money(row.minUSD, currency)} – ${money(row.maxUSD, currency)}</strong></p>
            <p class="m-0 benchmark-local">${localMoney(row.minUSD, row.market)} – ${localMoney(row.maxUSD, row.market)}</p>
            <p class="m-0">${deltaText(row, primaryRow, currency)}</p>
          </div>
        </div>`).join('');
    }

    renderBarChart(allRegionalRows, currency, primary, compare);
  }

  function applyCurrency(currency) {
    root.setAttribute('data-currency', currency);
    window.localStorage.setItem(STORAGE_KEY, currency);
    buttons.forEach((button) => {
      const isActive = button.dataset.currencyOption === currency;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    displayTargets.forEach((target) => {
      target.textContent = currency;
    });
    renderRecruitment(currency);
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => applyCurrency(button.dataset.currencyOption || defaultCurrency));
  });

  ['[data-filter-role]', '[data-filter-seniority]', '[data-filter-primary]', '[data-filter-compare]'].forEach((selector) => {
    const el = document.querySelector(selector);
    if (el) el.addEventListener('change', () => renderRecruitment(getSavedCurrency()));
  });

  applyCurrency(getSavedCurrency());
})();
