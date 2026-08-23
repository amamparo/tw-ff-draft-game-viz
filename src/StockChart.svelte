<script>
  import { onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';

  Chart.register(...registerables);

  export let standings = [];
  export let highlightKey = null;

  const GRAY = '#4a4a48';
  const GRAY_HIGHLIGHT = '#e0e0e0';
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let chartCanvas;
  let chart;

  function formatShortPct(value) {
    const sign = value >= 0 ? '+' : '−';
    return `${sign}${Math.abs(value).toFixed(1)}%`;
  }

  function weekdayOf(dateStr) {
    const y = +dateStr.slice(0, 4);
    const m = +dateStr.slice(5, 7);
    const d = +dateStr.slice(8, 10);
    return DAYS[new Date(y, m - 1, d).getDay()];
  }

  // "2026-08-27T09:00" -> "THU AUG 27 · 9:00 AM"
  function formatTooltipTitle(dateStr) {
    const m = +dateStr.slice(5, 7);
    const d = +dateStr.slice(8, 10);
    const h = +dateStr.slice(11, 13);
    const min = dateStr.slice(14, 16);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${weekdayOf(dateStr).toUpperCase()} ${MONTHS[m - 1]} ${d} · ${h12}:${min} ${ampm}`;
  }

  // Labels come from the longest series so no line is truncated
  function buildLabels(rows) {
    let longest = [];
    rows.forEach(row => {
      if (row.series.length > longest.length) longest = row.series;
    });
    return longest.map(point => point.date);
  }

  function buildDatasets(rows, labels) {
    // Rank 1 first: Chart.js paints dataset index 0 topmost
    const ordered = rows.slice().sort((a, b) => a.rank - b.rank);
    return ordered.map(row => {
      // Align each series to the shared labels by date; a symbol missing an
      // hourly bar gets a null there instead of shifting every later point
      const byDate = {};
      row.series.forEach(point => { byDate[point.date] = point.performance; });
      const top3 = !!row.color;
      const color = row.color || GRAY;
      const endLabel = { name: row.name, value: formatShortPct(row.performance) };
      return {
        label: row.name,
        data: labels.map(date => (date in byDate ? byDate[date] : null)),
        spanGaps: true,
        borderColor: color,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 6,
        borderWidth: 2,
        rowKey: row.key,
        baseColor: color,
        top3,
        endLabel: top3 ? endLabel : null,
        baseEndLabel: endLabel,
        inTooltip: top3
      };
    });
  }

  // Draws "Name +x.x%" beside each labeled line's last point
  const endLabelPlugin = {
    id: 'endLabels',
    afterDatasetsDraw(c) {
      const ctx = c.ctx;
      const nameFont = '600 13px Archivo, system-ui, sans-serif';
      const valueFont = '500 13px Archivo, system-ui, sans-serif';
      ctx.save();
      ctx.textBaseline = 'middle';
      const placed = [];
      c.data.datasets.forEach((ds, i) => {
        if (!ds.endLabel) return;
        const meta = c.getDatasetMeta(i);
        if (meta.hidden || meta.data.length === 0) return;
        // Anchor to the last real point — trailing nulls have no position
        let lastIndex = -1;
        for (let j = ds.data.length - 1; j >= 0; j--) {
          if (ds.data[j] !== null && ds.data[j] !== undefined) {
            lastIndex = j;
            break;
          }
        }
        if (lastIndex < 0) return;
        const last = meta.data[lastIndex];
        if (!last) return;
        let y = last.y;
        let guard = 0;
        while (placed.some(p => Math.abs(p - y) < 16) && guard < 40) {
          y += 4;
          guard += 1;
        }
        placed.push(y);
        ctx.font = nameFont;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ds.endLabel.name, last.x + 10, y);
        const nameWidth = ctx.measureText(ds.endLabel.name).width;
        ctx.font = valueFont;
        ctx.fillStyle = '#c3c2b7';
        ctx.fillText(ds.endLabel.value, last.x + 10 + nameWidth + 6, y);
      });
      ctx.restore();
    }
  };

  // Dashed vertical crosshair at the hovered column
  const crosshairPlugin = {
    id: 'crosshair',
    afterDatasetsDraw(c) {
      const active = c.tooltip && c.tooltip.getActiveElements();
      if (!active || active.length === 0) return;
      const x = active[0].element.x;
      const area = c.chartArea;
      const ctx = c.ctx;
      ctx.save();
      ctx.strokeStyle = 'rgba(195, 194, 183, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x, area.top);
      ctx.lineTo(x, area.bottom);
      ctx.stroke();
      ctx.restore();
    }
  };

  function createChart(canvas, rows) {
    const labels = buildLabels(rows);
    // Per-day labels only fit a contest-length range; longer spans skip ticks
    const dayCount = new Set(labels.map(l => l.slice(0, 10))).size;
    const skipTicks = dayCount > 10;
    return new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: buildDatasets(rows, labels)
      },
      plugins: [endLabelPlugin, crosshairPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: window.devicePixelRatio || 1,
        layout: {
          padding: { right: 130 }
        },
        scales: {
          y: {
            ticks: {
              color: '#898781',
              font: { size: 11, family: 'Archivo, system-ui, sans-serif' },
              callback: value => (value > 0 ? '+' : '') + value + '%'
            },
            grid: {
              color: context => context.tick.value === 0 ? '#565550' : '#2c2c2a',
              lineWidth: context => context.tick.value === 0 ? 1.5 : 1
            },
            border: { display: false }
          },
          x: {
            ticks: {
              color: '#898781',
              font: { size: 11, family: 'Archivo, system-ui, sans-serif' },
              autoSkip: skipTicks,
              maxTicksLimit: skipTicks ? 12 : undefined,
              maxRotation: 0,
              // Contest range: label the first point of each day ("Mon 24");
              // longer ranges: skipped ticks labeled "AUG 21"
              callback(value, index) {
                const label = labels[index];
                if (!label) return '';
                if (skipTicks) {
                  return `${MONTHS[+label.slice(5, 7) - 1]} ${+label.slice(8, 10)}`;
                }
                if (index > 0 && labels[index - 1].slice(0, 10) === label.slice(0, 10)) return '';
                return `${weekdayOf(label)} ${+label.slice(8, 10)}`;
              }
            },
            grid: { display: false },
            border: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f1f1e',
            titleColor: '#898781',
            bodyColor: '#c3c2b7',
            borderColor: 'rgba(255,255,255,0.14)',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            titleFont: { size: 11, family: 'Archivo, system-ui, sans-serif' },
            bodyFont: { size: 13, family: 'Archivo, system-ui, sans-serif' },
            filter: item => item.dataset.inTooltip,
            itemSort: (a, b) => b.parsed.y - a.parsed.y,
            callbacks: {
              title: items => items.length ? formatTooltipTitle(labels[items[0].dataIndex]) : '',
              label: context => `${context.dataset.label}  ${formatShortPct(context.parsed.y)}`
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  function applyHighlight(key) {
    if (!chart) return;
    chart.data.datasets.forEach(ds => {
      const highlighted = ds.rowKey === key;
      ds.borderColor = highlighted && !ds.top3 ? GRAY_HIGHLIGHT : ds.baseColor;
      ds.borderWidth = highlighted ? 3 : 2;
      ds.order = highlighted ? -1 : 0;
      ds.endLabel = ds.top3 || highlighted ? ds.baseEndLabel : null;
      ds.inTooltip = ds.top3 || highlighted;
    });
    chart.update('none');
  }

  // Function args keep the reactive dependencies explicit: rebuilding only
  // tracks canvas/standings, so hover highlights never recreate the chart
  function rebuild(canvas, rows) {
    if (!canvas || rows.length === 0) return;
    if (chart) chart.destroy();
    chart = createChart(canvas, rows);
    applyHighlight(highlightKey);
  }

  $: rebuild(chartCanvas, standings);
  $: applyHighlight(highlightKey);

  onDestroy(() => {
    if (chart) chart.destroy();
  });
</script>

<div class="chart-container">
  <canvas bind:this={chartCanvas}></canvas>
</div>

<style>
  .chart-container {
    position: absolute;
    inset: 0;
  }

  canvas {
    width: 100% !important;
    height: 100% !important;
  }
</style>
