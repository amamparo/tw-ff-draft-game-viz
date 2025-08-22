// Mock stock data service - replace with real API calls as needed
export async function fetchStockData(symbols, startDate) {
  // Generate mock data for demonstration
  const endDate = new Date();
  const start = new Date(startDate);
  const days = Math.ceil((endDate - start) / (1000 * 60 * 60 * 24));
  
  const stockData = {};
  
  symbols.forEach(symbol => {
    const data = [];
    let basePrice = Math.random() * 200 + 50; // Random starting price between 50-250
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      // Generate realistic price movement
      const change = (Math.random() - 0.5) * 0.1; // ±5% daily change
      basePrice = basePrice * (1 + change);
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: parseFloat(basePrice.toFixed(2))
      });
    }
    
    stockData[symbol] = data;
  });
  
  return stockData;
}

export async function loadConfig() {
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load config:', error);
    // Return default config if fetch fails
    return {
      stockSymbols: ['AAPL', 'MSFT', 'GOOGL'],
      startDate: '2024-01-01'
    };
  }
}

// Calculate percentage performance from start date
export function calculatePerformance(stockData) {
  const performanceData = {};
  
  Object.keys(stockData).forEach(symbol => {
    const data = stockData[symbol];
    if (data.length === 0) return;
    
    const startPrice = data[0].price;
    performanceData[symbol] = data.map(point => ({
      date: point.date,
      performance: ((point.price - startPrice) / startPrice) * 100
    }));
  });
  
  return performanceData;
}