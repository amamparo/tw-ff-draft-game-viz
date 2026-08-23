<script>
  export let performanceData = {};
  export let entrants = [];
  export let stockData = {};
  
  function getCurrentPerformance() {
    const performances = [];

    entrants.forEach(entrant => {
      const entrantKey = `${entrant.name} (${entrant.position} ${entrant.symbol})`;
      const data = performanceData[entrantKey];

      if (data && data.length > 0) {
        const symbolData = stockData[entrant.symbol];
        const currentPrice = symbolData && symbolData.length > 0
          ? symbolData[symbolData.length - 1].price
          : null;

        performances.push({
          name: entrant.name,
          symbol: entrant.symbol,
          position: entrant.position,
          performance: data[data.length - 1].performance,
          currentPrice
        });
      }
    });

    // Sort by performance descending, then rank
    performances.sort((a, b) => b.performance - a.performance);
    performances.forEach((p, i) => {
      p.rank = i + 1;
    });

    return performances;
  }
  
  $: leaderboardData = getCurrentPerformance();
  
  function formatPerformance(value) {
    const sign = value >= 0 ? '+' : '';
    const color = value >= 0 ? '#4ade80' : '#f87171';
    return {
      text: `${sign}${value.toFixed(2)}%`,
      color
    };
  }

  function formatPrice(price) {
    return price ? `$${price.toFixed(2)}` : 'N/A';
  }

  function getPositionEmoji(position) {
    return position === 'long' ? '📈' : '📉';
  }

  function getMedalEmoji(rank) {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  }
</script>

<div class="leaderboard-container">
  <div class="table-wrapper">
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Name</th>
          <th>Symbol</th>
          <th>Position</th>
          <th class="perf-header">Performance</th>
          <th class="price-col">Current Price</th>
        </tr>
      </thead>
      <tbody>
        {#each leaderboardData as entry}
          {@const perf = formatPerformance(entry.performance)}
          <tr class="entry-row" class:podium={entry.rank <= 3}>
            <td class="rank-cell">
              <span class="rank-number">{entry.rank}</span>
              <span class="medal desktop-only">{getMedalEmoji(entry.rank)}</span>
            </td>
            <td class="name-cell">
              {entry.name}
            </td>
            <td class="symbol-cell">
              <span class="symbol-badge">{entry.symbol}</span>
            </td>
            <td class="position-cell">
              <span class="position-badge {entry.position}">
                {getPositionEmoji(entry.position)} {entry.position}
              </span>
            </td>
            <td class="performance-cell">
              <span class="performance-value" style="color: {perf.color}">
                {perf.text}
              </span>
            </td>
            <td class="price-cell price-col">
              {formatPrice(entry.currentPrice)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .leaderboard-container {
    width: 100%;
    height: 100%;
    background-color: #1a1a1a;
    color: #e0e0e0;
    padding: 20px;
    box-sizing: border-box;
    overflow-y: auto;
  }
  
  .table-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    background-color: #2a2a2a;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .leaderboard-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  thead {
    background-color: #3a3a3a;
  }
  
  th {
    padding: 16px 12px;
    text-align: left;
    font-weight: 600;
    color: #f0f0f0;
    border-bottom: 2px solid #4a4a4a;
  }
  
  th:first-child {
    text-align: center;
  }
  
  th:nth-child(5), th:nth-child(6) {
    text-align: right;
  }
  
  .entry-row {
    border-bottom: 1px solid #3a3a3a;
    transition: background-color 0.2s;
  }
  
  .entry-row:hover {
    background-color: #333;
  }
  
  .entry-row.podium {
    background-color: #2d3748;
  }
  
  .entry-row.podium:hover {
    background-color: #374151;
  }
  
  td {
    padding: 14px 12px;
  }
  
  .rank-cell {
    text-align: center;
    font-weight: 600;
  }
  
  .rank-number {
    font-size: 16px;
  }
  
  .medal {
    margin-left: 8px;
    font-size: 18px;
  }
  
  .name-cell {
    font-weight: 500;
    font-size: 15px;
  }
  
  .symbol-badge {
    background-color: #4a4a4a;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: monospace;
    font-weight: 600;
    font-size: 13px;
  }
  
  .position-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }
  
  .position-badge.long {
    background-color: #065f46;
    color: #10b981;
  }
  
  .position-badge.short {
    background-color: #7f1d1d;
    color: #f87171;
  }
  
  .performance-cell {
    text-align: right;
  }
  
  .performance-value {
    font-family: monospace;
    font-weight: 600;
    font-size: 15px;
  }
  
  .price-cell {
    text-align: right;
    font-family: monospace;
    color: #d1d5db;
  }
  
  .desktop-only {
    display: inline;
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .leaderboard-container {
      padding: 10px;
    }
    
    .price-col {
      display: none;
    }
    
    .desktop-only {
      display: none;
    }
    
    .perf-header::after {
      content: "Perf.";
    }
    
    .perf-header {
      font-size: 0;
    }
    
    th, td {
      padding: 10px 8px;
    }
    
    th {
      font-size: 13px;
    }
    
    .name-cell {
      font-size: 14px;
    }
    
    .symbol-badge {
      font-size: 11px;
      padding: 3px 6px;
    }
    
    .position-badge {
      font-size: 10px;
      padding: 3px 6px;
    }
    
    .performance-value {
      font-size: 14px;
    }
  }
  
  @media (max-width: 480px) {
    .leaderboard-container {
      padding: 5px;
    }
    
    th:nth-child(4)::after {
      content: "Pos.";
    }
    
    th:nth-child(4) {
      font-size: 0;
    }
  }
</style>