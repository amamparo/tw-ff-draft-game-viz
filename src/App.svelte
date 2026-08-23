<script>
  import { onMount } from 'svelte';
  import StockChart from './StockChart.svelte';
  import Leaderboard from './Leaderboard.svelte';
  import { loadConfig, fetchStockData, calculatePerformance } from './stockService.js';
  
  let currentView = 'leaderboard';
  let loading = true;
  let loadingMessage = 'Loading configuration...';
  let error = null;
  let config = null;
  let stockData = null;
  let performanceData = null;

  async function loadData() {
    try {
      config = await loadConfig();

      loadingMessage = `Fetching data for ${config.entrants.length} entrants...`;
      stockData = await fetchStockData(config.entrants, config.startDate);
      performanceData = calculatePerformance(stockData, config.entrants);
    } catch (err) {
      console.error('Error loading stock data:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const savedView = localStorage.getItem('tw-ff-view');
    if (savedView === 'chart' || savedView === 'leaderboard') {
      currentView = savedView;
    }

    loadData();
  });

  function setView(view) {
    currentView = view;
    localStorage.setItem('tw-ff-view', view);
  }
</script>

{#if loading}
  <div class="loading-screen">
    <div class="loading-content">
      <div class="loading-text">{loadingMessage}</div>
    </div>
  </div>
{:else if error}
  <div class="error-screen">
    <div class="error-content">
      <div class="error-text">Error: {error}</div>
    </div>
  </div>
{:else}
  <div class="app-container">
    <div class="toggle-header">
      <div class="toggle-container">
        <button
          class="toggle-btn {currentView === 'leaderboard' ? 'active' : 'inactive'}"
          on:click={() => setView('leaderboard')}
        >
          🏆 Leaderboard
        </button>
        <button
          class="toggle-btn {currentView === 'chart' ? 'active' : 'inactive'}"
          on:click={() => setView('chart')}
        >
          📊 Chart
        </button>
      </div>
    </div>

    <div class="content-area">
      {#if currentView === 'leaderboard'}
        <Leaderboard {performanceData} entrants={config.entrants} {stockData} />
      {:else if currentView === 'chart'}
        <StockChart {config} {stockData} {performanceData} />
      {/if}
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
    background-color: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .loading-content, .error-content {
    text-align: center;
    padding: 20px;
  }
  
  .loading-text {
    color: #e0e0e0;
    font-size: 18px;
    font-weight: 500;
  }
  
  .error-text {
    color: #ff6b6b;
    font-size: 18px;
    font-weight: 500;
  }
  
  .app-container {
    width: 100vw;
    height: 100vh;
    background-color: #1a1a1a;
    display: flex;
    flex-direction: column;
  }
  
  .toggle-header {
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    padding: 20px;
    background-color: #1a1a1a;
    border-bottom: 1px solid #3a3a3a;
  }
  
  .toggle-container {
    display: flex;
    background-color: #2a2a2a;
    border-radius: 8px;
    padding: 4px;
  }
  
  .toggle-btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin: 0 2px;
  }
  
  .toggle-btn.active {
    background-color: #3b82f6;
    color: white;
    font-weight: 600;
  }
  
  .toggle-btn.inactive {
    background-color: transparent;
    color: #9ca3af;
  }
  
  .toggle-btn.inactive:hover {
    background-color: #374151;
    color: #e5e7eb;
  }
  
  .content-area {
    flex: 1;
    overflow: hidden;
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .toggle-header {
      padding: 15px;
    }
    
    .toggle-container {
      width: 100%;
    }
    
    .toggle-btn {
      padding: 10px 18px;
      font-size: 13px;
      flex: 1;
    }
  }
  
  @media (max-width: 480px) {
    .toggle-header {
      padding: 10px;
    }

    .toggle-btn {
      padding: 8px 14px;
      font-size: 12px;
    }
  }
</style>