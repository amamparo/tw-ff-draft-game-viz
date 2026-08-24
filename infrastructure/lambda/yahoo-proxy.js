const https = require('https');
const { URL } = require('url');

exports.handler = async (event) => {
  console.log('Yahoo Finance Proxy - Received event:', JSON.stringify(event, null, 2));
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Accept,X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  };

  // Handle preflight CORS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract query parameters
    const { symbol, period1, period2, interval = '1h' } = event.queryStringParameters || {};
    
    if (!symbol || !period1 || !period2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters: symbol, period1, period2' 
        })
      };
    }

    // Validate symbol format (basic check)
    if (!/^[A-Za-z0-9.-]+$/.test(symbol)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid symbol format' })
      };
    }

    // Build Yahoo Finance URL
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=${interval}&includePrePost=false&events=div%7Csplit&lang=en-US&region=US`;
    
    console.log('Fetching from Yahoo Finance:', yahooUrl);
    
    const data = await fetchYahooData(yahooUrl);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch stock data',
        details: error.message 
      })
    };
  }
};

function fetchYahooData(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }

          const jsonData = JSON.parse(data);
          
          // Check for Yahoo Finance API errors
          if (jsonData.chart?.error) {
            reject(new Error(jsonData.chart.error.description || 'Yahoo Finance API error'));
            return;
          }
          
          if (!jsonData.chart?.result || jsonData.chart.result.length === 0) {
            reject(new Error('No data found in response'));
            return;
          }
          
          resolve(jsonData);
          
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}