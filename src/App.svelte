<script>
  import { onMount } from 'svelte';
  import StockChart from './StockChart.svelte';
  import Leaderboard from './Leaderboard.svelte';
  import { loadConfig, fetchStockData, calculatePerformance } from './stockService.js';

  // Line color + row tint for 1st/2nd/3rd; everyone else renders gray
  const rankStyles = [
    { color: '#3987e5', tint: 'rgba(57,135,229,0.06)' },
    { color: '#d95926', tint: 'rgba(217,89,38,0.06)' },
    { color: '#199e70', tint: 'rgba(25,158,112,0.06)' }
  ];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let loading = true;
  let loadingMessage = 'Loading configuration...';
  let error = null;
  let config = null;
  let stockData = null;
  let performanceData = null;
  let highlightKey = null;

  async function loadData() {
    try {
      config = await loadConfig();

      loadingMessage = `Fetching data for ${config.entrants.length} entrants...`;
      stockData = await fetchStockData(config.entrants, config.startDate, config.endDate);
      performanceData = calculatePerformance(stockData, config.entrants);
    } catch (err) {
      console.error('Error loading stock data:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(loadData);

  function buildStandings(perf, cfg) {
    if (!perf || !cfg) return [];
    const rows = [];
    cfg.entrants.forEach(entrant => {
      const key = `${entrant.name} (${entrant.position} ${entrant.symbol})`;
      const series = perf[key];
      if (!series || series.length === 0) return;
      rows.push({
        key,
        name: entrant.name,
        symbol: entrant.symbol,
        position: entrant.position,
        performance: series[series.length - 1].performance,
        series
      });
    });
    rows.sort((a, b) => b.performance - a.performance);
    rows.forEach((row, i) => {
      const style = rankStyles[i];
      row.rank = i + 1;
      row.color = style ? style.color : null;
      row.tint = style ? style.tint : null;
    });
    return rows;
  }

  function parseYMD(dateStr) {
    const parts = dateStr.split('-');
    return { y: +parts[0], m: +parts[1], d: +parts[2] };
  }

  function buildContestLabel(startDate, endDate) {
    if (!startDate) return '';
    const s = parseYMD(startDate);
    if (!endDate) return `since ${MONTHS[s.m - 1]} ${s.d}, ${s.y}`;
    const e = parseYMD(endDate);
    if (s.y === e.y && s.m === e.m) return `${MONTHS[s.m - 1]} ${s.d}–${e.d}, ${e.y}`;
    if (s.y === e.y) return `${MONTHS[s.m - 1]} ${s.d} – ${MONTHS[e.m - 1]} ${e.d}, ${e.y}`;
    return `${MONTHS[s.m - 1]} ${s.d}, ${s.y} – ${MONTHS[e.m - 1]} ${e.d}, ${e.y}`;
  }

  function buildSinceLabel(startDate) {
    if (!startDate) return '';
    const s = parseYMD(startDate);
    const day = DAYS[new Date(s.y, s.m - 1, s.d).getDay()];
    return `Return since ${day} ${MONTHS[s.m - 1]} ${s.d}`;
  }

  // Latest data point across all symbols; dates are "YYYY-MM-DDTHH:MM" Central
  function buildUpdatedLabel(data) {
    if (!data) return '';
    let latest = '';
    Object.values(data).forEach(series => {
      const last = series[series.length - 1];
      if (last && last.date > latest) latest = last.date;
    });
    if (!latest) return '';
    const { y, m, d } = parseYMD(latest.slice(0, 10));
    const h = +latest.slice(11, 13);
    const min = latest.slice(14, 16);
    const day = DAYS[new Date(y, m - 1, d).getDay()];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `Updated ${day} ${MONTHS[m - 1]} ${d}, ${h12}:${min} ${ampm} CT`;
  }

  $: standings = buildStandings(performanceData, config);
  $: missing = config && stockData
    ? config.entrants.filter(e => !stockData[e.symbol] || stockData[e.symbol].length === 0)
    : [];
  $: contestLabel = config ? buildContestLabel(config.startDate, config.endDate) : '';
  $: sinceLabel = config ? buildSinceLabel(config.startDate) : '';
  $: updatedLabel = buildUpdatedLabel(stockData);
</script>

{#if loading}
  <div class="loading-screen">
    <div class="loading-text">{loadingMessage}</div>
  </div>
{:else if error}
  <div class="error-screen">
    <div class="error-text">Error: {error}</div>
  </div>
{:else}
  <div class="app">
    <header class="app-header">
      <div class="brand">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#c3c2b7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8v4a4 4 0 0 1-8 0V3z"/><path d="M6 5H3.5a2.5 2.5 0 0 0 2.6 2.5"/><path d="M14 5h2.5a2.5 2.5 0 0 1-2.6 2.5"/><path d="M10 11v3"/><path d="M7 16h6"/></svg>
        <div class="brand-title">THE DRAFT</div>
        <div class="brand-divider"></div>
        <div class="brand-sub">Trading Contest · {contestLabel}</div>
      </div>
      <div class="updated">{updatedLabel}</div>
    </header>

    {#if missing.length > 0}
      <div class="warning">
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#ec835a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L18 17H2L10 3z"/><path d="M10 8.5v3.5"/><path d="M10 14.6v.2"/></svg>
        <div>{missing.length} entrant{missing.length === 1 ? '' : 's'} missing data — {missing.map(e => `${e.name} (${e.symbol})`).join(', ')}</div>
      </div>
    {/if}

    <div class="layout">
      <Leaderboard {standings} {missing} {sinceLabel}
        on:highlight={(e) => highlightKey = e.detail} />

      <div class="chart-panel">
        <div class="chart-panel-header">THE RACE · {contestLabel.toUpperCase()}</div>
        <div class="chart-area">
          <StockChart {standings} {highlightKey} />
        </div>
        <div class="chart-hint">Hover any row to highlight its line</div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .loading-screen, .error-screen {
    width: 100vw;
    height: 100vh;
    background-color: #0d0d0d;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 20px;
    box-sizing: border-box;
  }

  .loading-text {
    color: #c3c2b7;
    font-size: 18px;
    font-weight: 500;
  }

  .error-text {
    color: #e66767;
    font-size: 18px;
    font-weight: 500;
  }

  .app {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    background-color: #0d0d0d;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 24px 28px;
    box-sizing: border-box;
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .brand-title {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .brand-divider {
    width: 1px;
    height: 16px;
    background: rgba(255, 255, 255, 0.14);
  }

  .brand-sub {
    font-size: 13px;
    font-weight: 500;
    color: #c3c2b7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .updated {
    font-size: 12px;
    color: #898781;
    white-space: nowrap;
  }

  .warning {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #c3c2b7;
    flex-shrink: 0;
  }

  .warning svg {
    flex-shrink: 0;
  }

  .layout {
    display: grid;
    grid-template-columns: 460px minmax(0, 1fr);
    gap: 16px;
    flex: 1;
    min-height: 0;
  }

  .chart-panel {
    background: #1a1a19;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    padding: 16px;
    min-height: 0;
  }

  .chart-panel-header {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    color: #898781;
    padding-bottom: 8px;
    flex-shrink: 0;
  }

  .chart-area {
    flex: 1;
    min-height: 0;
    position: relative;
  }

  .chart-hint {
    font-size: 11px;
    color: #898781;
    padding-top: 8px;
    flex-shrink: 0;
  }

  @media (max-width: 899px) {
    .app {
      padding: 16px;
    }

    .layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .chart-panel {
      display: none;
    }

    .brand-divider, .brand-sub {
      display: none;
    }

    .brand-title {
      font-size: 15px;
    }

    .updated {
      font-size: 10px;
    }
  }
</style>
