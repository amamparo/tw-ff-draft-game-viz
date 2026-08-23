<script>
  import { onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import zoomPlugin from 'chartjs-plugin-zoom';

  Chart.register(...registerables, zoomPlugin);

  export let config = null;
  export let stockData = null;
  export let performanceData = null;

  let chartCanvas;
  let chart;
  let chartData = null;

  // 12 distinct, high-contrast colors optimized for visibility
  const colors = [
    '#E31A1C', // Bright Red
    '#1F78B4', // Blue
    '#33A02C', // Green
    '#FF7F00', // Orange
    '#6A3D9A', // Purple
    '#FFD700', // Gold
    '#A6CEE3', // Light Blue
    '#B2DF8A', // Light Green
    '#FB9A99', // Pink
    '#FDBF6F', // Light Orange
    '#CAB2D6', // Light Purple
    '#8B4513'  // Brown
  ];

  function prepareChartData() {
    if (!config || !stockData || !performanceData) return;

    // Get dates from any available stock data
    const firstSymbol = Object.keys(stockData)[0];
    const dates = stockData[firstSymbol]?.map(point => point.date) || [];

    const datasets = config.entrants.map((entrant, index) => {
      const entrantKey = `${entrant.name} (${entrant.position} ${entrant.symbol})`;
      const positionEmoji = entrant.position === 'long' ? '📈' : '📉';
      const color = colors[index % colors.length];

      return {
        label: `${entrant.name} (${entrant.symbol} ${positionEmoji})`,
        data: performanceData[entrantKey]?.map(point => point.performance) || [],
        borderColor: color,
        backgroundColor: color + '20',
        fill: false,
        tension: 0.1
      };
    });

    chartData = {
      labels: dates,
      datasets
    };
  }

  // Evaluated at render time so tick labels adapt if the window is resized
  function formatDateTick(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';

    let displayHour;
    if (hour === 0) {
      displayHour = 12;
    } else if (hour > 12) {
      displayHour = hour - 12;
    } else {
      displayHour = hour;
    }

    if (window.innerWidth < 480) {
      return `${month}/${day}\n${displayHour}${ampm}`;
    }
    return `${month}/${day} ${displayHour}${ampm}`;
  }

  function createChart() {
    if (!chartCanvas || !chartData) return;

    const isMobile = window.innerWidth < 768;

    let xMaxTicksLimit;
    if (window.innerWidth < 480) {
      xMaxTicksLimit = 4;
    } else if (isMobile) {
      xMaxTicksLimit = 6;
    } else {
      xMaxTicksLimit = 15;
    }

    const ctx = chartCanvas.getContext('2d');
    chart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: window.devicePixelRatio || 1,
        scales: {
          y: {
            ticks: {
              color: '#b0b0b0',
              font: {
                size: isMobile ? 10 : 12
              },
              maxTicksLimit: isMobile ? 8 : 10,
              callback: function(value) {
                return value.toFixed(1) + '%';
              }
            },
            grid: {
              color: '#3a3a3a',
              lineWidth: isMobile ? 0.5 : 1
            }
          },
          x: {
            ticks: {
              color: '#b0b0b0',
              font: {
                size: isMobile ? 9 : 11
              },
              maxTicksLimit: xMaxTicksLimit,
              maxRotation: isMobile ? 45 : 0,
              callback: function(value) {
                return formatDateTick(this.getLabelForValue(value));
              }
            },
            grid: {
              color: '#3a3a3a',
              lineWidth: isMobile ? 0.5 : 1
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#e0e0e0',
              font: {
                size: isMobile ? 10 : 12
              },
              padding: isMobile ? 8 : 10,
              boxWidth: isMobile ? 12 : 15,
              usePointStyle: isMobile
            },
            maxHeight: isMobile ? 120 : 150
          },
          tooltip: {
            backgroundColor: 'rgba(42, 42, 42, 0.95)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0',
            borderColor: '#555',
            borderWidth: 1,
            cornerRadius: 8,
            padding: isMobile ? 8 : 12,
            displayColors: true,
            bodyFont: {
              size: isMobile ? 11 : 13
            },
            callbacks: {
              title: function() {
                return '';
              },
              label: function(context) {
                const performance = context.parsed.y.toFixed(2);
                const sign = performance >= 0 ? '+' : '';
                return `${context.dataset.label}: ${sign}${performance}%`;
              }
            }
          },
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
                speed: 0.1
              },
              pinch: {
                enabled: true,
                threshold: 2
              },
              mode: 'x',
              speed: isMobile ? 0.05 : 0.1
            },
            pan: {
              enabled: true,
              mode: 'x',
              speed: isMobile ? 0.3 : 0.5,
              threshold: 5
            }
          }
        },
        interaction: {
          intersect: false,
          mode: isMobile ? 'index' : 'nearest',
          axis: isMobile ? 'x' : undefined
        },
        elements: {
          point: {
            radius: 0,
            hoverRadius: isMobile ? 6 : 4,
            hitRadius: isMobile ? 8 : 6
          },
          line: {
            borderWidth: isMobile ? 2.5 : 2,
            tension: 0.1
          }
        }
      }
    });
  }

  $: if (config && stockData && performanceData) {
    prepareChartData();
  }

  $: if (chartCanvas && chartData) {
    if (chart) {
      chart.destroy();
    }
    createChart();
  }

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });
</script>

<div class="chart-container">
  <canvas bind:this={chartCanvas}></canvas>
</div>

<style>
  .chart-container {
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    touch-action: manipulation; /* Optimize for touch interactions */
    -webkit-overflow-scrolling: touch;
  }

  canvas {
    width: 100% !important;
    height: 100% !important;
    touch-action: pan-x; /* Allow horizontal panning only */
  }

  @media (max-width: 768px) {
    .chart-container {
      /* Account for legend space - reduce height to prevent clipping */
      height: calc(100% - 140px);
      min-height: calc(100vh - 200px);
    }
  }

  /* High-DPI display support */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    canvas {
      /* Chart.js handles high-DPI automatically, but ensure crisp rendering */
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  }
</style>