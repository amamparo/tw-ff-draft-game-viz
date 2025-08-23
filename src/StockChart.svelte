<script>
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import zoomPlugin from 'chartjs-plugin-zoom';
  import { loadConfig, fetchStockData, calculatePerformance } from './stockService.js';
  
  Chart.register(...registerables, zoomPlugin);
  
  let chartCanvas;
  let chart;
  let loading = true;
  let loadingMessage = 'Loading configuration...';
  let error = null;
  let config = null;
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
  
  async function loadStockData() {
    try {
      // Load configuration
      loadingMessage = 'Loading configuration...';
      config = await loadConfig();
      
      // Fetch stock data
      loadingMessage = `Fetching data for ${config.entrants.length} entrants...`;
      const stockData = await fetchStockData(config.entrants, config.startDate);
      const performanceData = calculatePerformance(stockData, config.entrants);
      
      // Prepare chart data
      loadingMessage = 'Preparing chart...';
      
      // Get dates from any available stock data
      const firstSymbol = Object.keys(stockData)[0];
      const dates = stockData[firstSymbol]?.map(point => point.date) || [];
      
      const datasets = config.entrants.map((entrant, index) => {
        const entrantKey = `${entrant.name} (${entrant.position} ${entrant.symbol})`;
        const positionEmoji = entrant.position === 'long' ? '📈' : '📉';
        const legendLabel = `${entrant.name} (${entrant.symbol} ${positionEmoji})`;
        
        return {
          label: legendLabel,
          data: performanceData[entrantKey]?.map(point => point.performance) || [],
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '20',
          fill: false,
          tension: 0.1
        };
      });
      
      chartData = {
        labels: dates,
        datasets: datasets
      };
      
      loading = false;
    } catch (err) {
      console.error('Error loading stock data:', err);
      error = err.message;
      loading = false;
    }
  }
  
  function createChart() {
    if (!chartCanvas || !chartData) return;
    
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
            title: {
              display: false
            },
            ticks: {
              color: '#b0b0b0',
              font: {
                size: window.innerWidth < 768 ? 10 : 12
              },
              maxTicksLimit: window.innerWidth < 768 ? 8 : 10,
              callback: function(value) {
                return value.toFixed(1) + '%';
              }
            },
            grid: {
              color: '#3a3a3a',
              lineWidth: window.innerWidth < 768 ? 0.5 : 1
            }
          },
          x: {
            title: {
              display: false
            },
            ticks: {
              color: '#b0b0b0',
              font: {
                size: window.innerWidth < 768 ? 9 : 11
              },
              maxTicksLimit: window.innerWidth < 480 ? 4 : window.innerWidth < 768 ? 6 : 15,
              maxRotation: window.innerWidth < 768 ? 45 : 0,
              callback: function(value, index, ticks) {
                const dateStr = this.getLabelForValue(value);
                const date = new Date(dateStr);
                const month = date.getMonth() + 1;
                const day = date.getDate();
                const hour = date.getHours();
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                
                // Show more compact format on mobile
                if (window.innerWidth < 480) {
                  return `${month}/${day}\n${displayHour}${ampm}`;
                }
                return `${month}/${day} ${displayHour}${ampm}`;
              }
            },
            grid: {
              color: '#3a3a3a',
              lineWidth: window.innerWidth < 768 ? 0.5 : 1
            }
          }
        },
        plugins: {
          title: {
            display: false
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#e0e0e0',
              font: {
                size: window.innerWidth < 768 ? 10 : 12
              },
              padding: window.innerWidth < 768 ? 8 : 10,
              boxWidth: window.innerWidth < 768 ? 12 : 15,
              usePointStyle: window.innerWidth < 768
            },
            maxHeight: window.innerWidth < 768 ? 120 : 150
          },
          tooltip: {
            backgroundColor: 'rgba(42, 42, 42, 0.95)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0',
            borderColor: '#555',
            borderWidth: 1,
            cornerRadius: 8,
            padding: window.innerWidth < 768 ? 8 : 12,
            displayColors: true,
            bodyFont: {
              size: window.innerWidth < 768 ? 11 : 13
            },
            callbacks: {
              title: function(context) {
                return ''; // No title
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
              speed: window.innerWidth < 768 ? 0.05 : 0.1
            },
            pan: {
              enabled: true,
              mode: 'x',
              speed: window.innerWidth < 768 ? 0.3 : 0.5,
              threshold: 5
            }
          }
        },
        interaction: {
          intersect: false,
          mode: window.innerWidth < 768 ? 'index' : 'nearest',
          axis: window.innerWidth < 768 ? 'x' : undefined
        },
        elements: {
          point: {
            radius: 0,
            hoverRadius: window.innerWidth < 768 ? 6 : 4,
            hitRadius: window.innerWidth < 768 ? 8 : 6
          },
          line: {
            borderWidth: window.innerWidth < 768 ? 2.5 : 2,
            tension: 0.1
          }
        }
      }
    });
  }
  
  // Reactive statement to create chart when both canvas and data are ready
  $: if (chartCanvas && chartData && !loading && !error) {
    createChart();
  }
  
  onMount(() => {
    loadStockData();
  });
  
  // Cleanup chart on component destroy
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });
</script>

<div class="chart-container">
  {#if loading}
    <div class="loading">{loadingMessage}</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <canvas bind:this={chartCanvas}></canvas>
  {/if}
</div>

<style>
  .chart-container {
    width: 100vw;
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height for mobile */
    position: fixed;
    top: 0;
    left: 0;
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
  
  .loading, .error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    font-size: 18px;
    position: absolute;
    top: 0;
    left: 0;
    background-color: #1a1a1a;
    color: #e0e0e0;
    padding: 20px;
    text-align: center;
  }
  
  .error {
    color: #ff6b6b;
  }
  
  /* Mobile-specific optimizations */
  @media (max-width: 768px) {
    .chart-container {
      /* Ensure full mobile viewport usage */
      height: 100vh;
      height: 100svh; /* Small viewport height for mobile keyboards */
    }
    
    .loading, .error {
      font-size: 16px;
      padding: 15px;
    }
  }
  
  @media (max-width: 480px) {
    .loading, .error {
      font-size: 14px;
      padding: 10px;
    }
  }
  
  /* Tablet optimizations */
  @media (min-width: 769px) and (max-width: 1024px) {
    .chart-container {
      /* Optimize for tablet viewing */
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