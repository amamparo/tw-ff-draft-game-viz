<script>
  import { createEventDispatcher } from 'svelte';

  export let standings = [];
  export let missing = [];
  export let sinceLabel = '';

  const dispatch = createEventDispatcher();

  function formatPerformance(value) {
    const sign = value >= 0 ? '+' : '−';
    return `${sign}${Math.abs(value).toFixed(2)}%`;
  }

  function positionLabel(position) {
    return position === 'short' ? 'SHORT' : 'LONG';
  }

  // Downsample a performance series into a 64x20 sparkline polyline
  function sparkPoints(series) {
    if (!series || series.length < 2) return '';
    const step = Math.max(1, Math.floor(series.length / 32));
    const values = [];
    for (let i = 0; i < series.length; i += step) {
      values.push(series[i].performance);
    }
    const lastValue = series[series.length - 1].performance;
    if (values[values.length - 1] !== lastValue) {
      values.push(lastValue);
    }
    const min = Math.min(...values);
    let max = Math.max(...values);
    if (max - min < 1e-9) max = min + 1;
    return values.map((v, i) => {
      const x = (i / (values.length - 1)) * 64;
      const y = 18 - ((v - min) / (max - min)) * 16;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }
</script>

<div class="panel">
  <div class="panel-header">
    <div class="panel-title">STANDINGS</div>
    <div class="panel-sub">{sinceLabel}</div>
  </div>
  <div class="rows">
    {#each standings as row (row.key)}
      <div
        class="row"
        style="border-left-color: {row.color || 'transparent'}; --tint: {row.tint || 'transparent'};"
        on:mouseenter={() => dispatch('highlight', row.key)}
        on:mouseleave={() => dispatch('highlight', null)}
      >
        <div class="rank" class:top={row.rank <= 3}>{row.rank}</div>
        <div class="who">
          <div class="name">{row.name}</div>
          <div class="ticker">{row.symbol}</div>
          <div class="tag" class:short={row.position === 'short'}>{positionLabel(row.position)}</div>
        </div>
        <svg class="spark" width="64" height="20" viewBox="0 0 64 20" fill="none">
          <polyline points={sparkPoints(row.series)} stroke="#898781" stroke-opacity="0.6" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
        </svg>
        <div class="pct" class:down={row.performance < 0}>{formatPerformance(row.performance)}</div>
      </div>
    {/each}
    {#each missing as entrant (entrant.symbol + entrant.name)}
      <div class="row nodata">
        <div class="rank">—</div>
        <div class="who">
          <div class="name">{entrant.name}</div>
          <div class="ticker">{entrant.symbol}</div>
          <div class="tag" class:short={entrant.position === 'short'}>{positionLabel(entrant.position)}</div>
        </div>
        <div class="nodata-note">no data</div>
        <div class="pct">—</div>
      </div>
    {/each}
  </div>
</div>

<style>
  .panel {
    background: #1a1a19;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.10);
    flex-shrink: 0;
  }

  .panel-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    color: #898781;
  }

  .panel-sub {
    font-size: 11px;
    color: #898781;
  }

  .rows {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-height: 0;
  }

  .row {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) 68px 76px;
    align-items: center;
    column-gap: 8px;
    min-height: 46px;
    padding: 0 16px 0 13px;
    border-left: 3px solid transparent;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }

  .row:last-child {
    border-bottom: none;
  }

  .row {
    background-color: var(--tint, transparent);
  }

  /* Layered gradient so hover brightens top-3 rows without losing their tint */
  .row:not(.nodata):hover {
    background-image: linear-gradient(rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.04));
  }

  .row.nodata {
    opacity: 0.55;
  }

  .rank {
    font-size: 13px;
    font-weight: 600;
    color: #c3c2b7;
  }

  .rank.top {
    color: #ffffff;
  }

  .nodata .rank, .nodata .name, .nodata .ticker, .nodata .pct {
    color: #898781;
  }

  .who {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .name {
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ticker {
    font-family: ui-monospace, monospace;
    font-size: 10px;
    color: #c3c2b7;
    background: #2c2c2a;
    border-radius: 4px;
    padding: 1px 5px;
    flex-shrink: 0;
  }

  .tag {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: #898781;
    flex-shrink: 0;
  }

  .tag.short {
    color: #c3c2b7;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 3px;
    padding: 1px 4px;
  }

  .spark {
    justify-self: end;
  }

  .pct {
    font-size: 13px;
    font-weight: 600;
    text-align: right;
    color: #0ca30c;
    font-variant-numeric: tabular-nums;
  }

  .pct.down {
    color: #e66767;
  }

  .nodata-note {
    font-size: 11px;
    color: #898781;
    justify-self: end;
  }
</style>
