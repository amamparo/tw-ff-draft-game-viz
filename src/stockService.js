// Stock data service using Yahoo Finance v8 chart API
export async function fetchStockData(symbols, startDate) {
  console.log('Fetching real stock data for symbols:', symbols);
  const errors = [];
  
  // Convert start date to timestamps
  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date().getTime() / 1000);
  
  // Fetch all symbols in parallel
  console.log('Starting parallel requests for all symbols...');
  const fetchPromises = symbols.map(async (symbol) => {
    try {
      console.log(`Fetching data for ${symbol}...`);
      const data = await fetchYahooFinanceData(symbol, startTimestamp, endTimestamp);
      if (data && data.length > 0) {
        console.log(`Successfully fetched ${data.length} data points for ${symbol}`);
        return { symbol, data };
      } else {
        const errorMsg = `No data available for symbol ${symbol}`;
        console.warn(errorMsg);
        errors.push(errorMsg);
        return null;
      }
    } catch (error) {
      const errorMsg = `Failed to fetch data for ${symbol}: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      return null;
    }
  });
  
  // Wait for all requests to complete
  const results = await Promise.all(fetchPromises);
  
  // Build stockData object from successful results
  const stockData = {};
  results.forEach(result => {
    if (result) {
      stockData[result.symbol] = result.data;
    }
  });
  
  // If no symbols succeeded, throw an error
  if (Object.keys(stockData).length === 0) {
    throw new Error(`Failed to fetch data for any symbols. Errors: ${errors.join('; ')}`);
  }
  
  // If some symbols failed, log warnings but continue
  if (errors.length > 0) {
    console.warn(`Some symbols failed to load: ${errors.join('; ')}`);
  }
  
  console.log(`Successfully loaded data for ${Object.keys(stockData).length} symbols`);
  return stockData;
}

async function fetchYahooFinanceData(symbol, startTimestamp, endTimestamp) {
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1h&includePrePost=false&events=div%7Csplit&lang=en-US&region=US`;
  
  // Multiple CORS proxy options for reliability
  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
    `https://cors-anywhere.herokuapp.com/${yahooUrl}`
  ];
  
  // Try each proxy until one succeeds
  for (let i = 0; i < proxies.length; i++) {
    const proxyUrl = proxies[i];
    const isAllOrigins = proxyUrl.includes('allorigins.win');
    
    try {
      console.log(`Trying proxy ${i + 1} for ${symbol}...`);
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let jsonData;
      if (isAllOrigins) {
        // allorigins.win wraps the response in a contents field
        const proxyData = await response.json();
        if (!proxyData.contents) {
          throw new Error('No data received from proxy');
        }
        jsonData = JSON.parse(proxyData.contents);
      } else {
        // Other proxies return the response directly
        jsonData = await response.json();
      }
      
      // Check for API errors
      if (jsonData.chart?.error) {
        throw new Error(jsonData.chart.error.description || 'Yahoo Finance API error');
      }
      
      if (!jsonData.chart?.result || jsonData.chart.result.length === 0) {
        throw new Error('No data found in response');
      }
      
      console.log(`Successfully fetched ${symbol} using proxy ${i + 1}`);
      return parseYahooChartData(jsonData.chart.result[0]);
      
    } catch (error) {
      console.warn(`Proxy ${i + 1} failed for ${symbol}:`, error.message);
      
      // If this is the last proxy, re-throw the error
      if (i === proxies.length - 1) {
        console.error(`All proxies failed for ${symbol}`);
        throw error;
      }
      // Otherwise continue to the next proxy
    }
  }
}

function parseYahooChartData(result) {
  const data = [];
  
  if (!result.timestamp || !result.indicators?.quote?.[0]?.close) {
    return data;
  }
  
  const timestamps = result.timestamp;
  const closes = result.indicators.quote[0].close;
  
  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    const close = closes[i];
    
    if (close !== null && close !== undefined && !isNaN(close)) {
      // Convert timestamp to datetime string for hourly data
      const date = new Date(timestamp * 1000);
      const dateTime = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
      
      data.push({
        date: dateTime,
        price: parseFloat(close.toFixed(2))
      });
    }
  }
  
  return data.sort((a, b) => new Date(a.date) - new Date(b.date));
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