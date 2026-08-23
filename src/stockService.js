// Stock data service using Yahoo Finance v8 chart API
export async function fetchStockData(entrants, startDate, endDate) {
  console.log('Fetching real stock data for entrants:', entrants.map(e => `${e.name} (${e.position} ${e.symbol})`));
  const errors = [];

  // Start at 8:00 AM Central Daylight Time (CDT) on the start date
  const startDateObj = new Date(startDate + 'T08:00:00-05:00');
  const startTimestamp = Math.floor(startDateObj.getTime() / 1000);
  // Clamp to end of the end date (inclusive) so the contest freezes there
  const nowMs = Date.now();
  const endMs = endDate ? Math.min(nowMs, new Date(endDate + 'T23:59:59-05:00').getTime()) : nowMs;
  const endTimestamp = Math.floor(endMs / 1000);

  const uniqueSymbols = [...new Set(entrants.map(entrant => entrant.symbol))];

  console.log('Starting parallel requests for all symbols...');
  const fetchPromises = uniqueSymbols.map(async (symbol) => {
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
  
  const results = await Promise.all(fetchPromises);

  const stockData = {};
  results.forEach(result => {
    if (result) {
      stockData[result.symbol] = result.data;
    }
  });

  // Every symbol empty usually means the contest window hasn't traded yet
  // (weekend / pre-market); the caller renders a "no data yet" state
  if (Object.keys(stockData).length === 0) {
    console.warn(`No data available for any symbol. Errors: ${errors.join('; ')}`);
    return stockData;
  }

  if (errors.length > 0) {
    console.warn(`Some symbols failed to load: ${errors.join('; ')}`);
  }
  
  console.log(`Successfully loaded data for ${Object.keys(stockData).length} symbols`);
  return stockData;
}

async function fetchYahooFinanceData(symbol, startTimestamp, endTimestamp) {
  // Use our dedicated AWS Lambda proxy instead of public proxies
  const proxyUrl = getProxyUrl();
  const apiUrl = `${proxyUrl}/yahoo?symbol=${symbol}&period1=${startTimestamp}&period2=${endTimestamp}&interval=1h`;
  
  console.log(`Fetching data for ${symbol} using dedicated proxy...`);
  
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const startTime = Date.now();
    
    const response = await fetch(apiUrl, { 
      signal: controller.signal,
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const jsonData = await response.json();
    
    // Check for API errors
    if (jsonData.chart?.error) {
      throw new Error(jsonData.chart.error.description || 'Yahoo Finance API error');
    }
    
    if (!jsonData.chart?.result || jsonData.chart.result.length === 0) {
      throw new Error('No data found in response');
    }
    
    console.log(`Successfully fetched ${symbol} using dedicated proxy (${responseTime}ms)`);
    
    return parseYahooChartData(jsonData.chart.result[0]);
    
  } catch (error) {
    console.error(`Dedicated proxy failed for ${symbol}:`, error.message);
    console.error('Full error details:', error);
    console.error('API URL attempted:', apiUrl);
    throw error;
  }
}

function getProxyUrl() {
  // In development, you can override this with a local URL or staging URL
  // In production, this will be replaced with the actual API Gateway URL
  return window.YAHOO_PROXY_URL || 'https://a3nigzzk33.execute-api.us-east-1.amazonaws.com/prod';
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
      // Yahoo Finance timestamps are UTC; shift 5 hours back to Central Daylight
      // Time (UTC-5) so labels show market hours regardless of user's timezone
      const central = new Date((timestamp - 5 * 3600) * 1000);
      const year = central.getUTCFullYear();
      const month = String(central.getUTCMonth() + 1).padStart(2, '0');
      const day = String(central.getUTCDate()).padStart(2, '0');
      const hour = String(central.getUTCHours()).padStart(2, '0');
      const minute = String(central.getUTCMinutes()).padStart(2, '0');

      data.push({
        date: `${year}-${month}-${day}T${hour}:${minute}`,
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

// Calculate percentage performance from start date considering long/short positions
export function calculatePerformance(stockData, entrants) {
  const performanceData = {};
  
  entrants.forEach(entrant => {
    const { name, symbol, position } = entrant;
    const data = stockData[symbol];
    
    if (!data || data.length === 0) return;
    
    const startPrice = data[0].price;
    const entrantKey = `${name} (${position} ${symbol})`;
    
    performanceData[entrantKey] = data.map(point => {
      const rawPerformance = ((point.price - startPrice) / startPrice) * 100;
      
      // For short positions, invert the performance (gain when stock goes down)
      const adjustedPerformance = position === 'short' ? -rawPerformance : rawPerformance;
      
      return {
        date: point.date,
        performance: adjustedPerformance
      };
    });
  });
  
  return performanceData;
}