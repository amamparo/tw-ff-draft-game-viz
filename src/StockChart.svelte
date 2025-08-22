<script>
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { loadConfig, fetchStockData, calculatePerformance } from './stockService.js';
  
  Chart.register(...registerables);
  
  let chartCanvas;
  let chart;
  let loading = true;
  let error = null;
  let config = null;
  let chartData = null;
  
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
    '#4BC0C0', '#FF6384'
  ];
  
  async function loadStockData() {
    try {
      // Load configuration
      config = await loadConfig();
      
      // Fetch stock data
      const stockData = await fetchStockData(config.stockSymbols, config.startDate);
      const performanceData = calculatePerformance(stockData);
      
      // Prepare chart data
      const dates = stockData[config.stockSymbols[0]]?.map(point => point.date) || [];
      
      const datasets = config.stockSymbols.map((symbol, index) => ({
        label: symbol,
        data: performanceData[symbol]?.map(point => point.performance) || [],
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        fill: false,
        tension: 0.1
      }));
      
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
        scales: {
          y: {
            title: {
              display: true,
              text: 'Performance (%)'
            },
            ticks: {
              callback: function(value) {
                return value.toFixed(1) + '%';
              }
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            },
            ticks: {
              maxTicksLimit: 10
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: `Stock Performance Since ${config.startDate}`
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + '%';
              }
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
    <div class="loading">Loading stock data...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <canvas bind:this={chartCanvas}></canvas>
    {#if config}
      <div class="config-info">
        <p><strong>Tracking:</strong> {config.stockSymbols.join(', ')}</p>
        <p><strong>Since:</strong> {config.startDate}</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .chart-container {
    width: 100%;
    height: 500px;
    position: relative;
    padding: 20px;
    box-sizing: border-box;
  }
  
  canvas {
    width: 100% !important;
    height: 100% !important;
  }
  
  .loading, .error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 18px;
  }
  
  .error {
    color: #ff3e00;
  }
  
  .config-info {
    margin-top: 15px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 5px;
    font-size: 14px;
  }
  
  .config-info p {
    margin: 5px 0;
  }
  
  @media (max-width: 768px) {
    .chart-container {
      height: 400px;
      padding: 10px;
    }
  }
</style>