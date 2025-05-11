// Stock API Integration
document.addEventListener('DOMContentLoaded', function() {
    // API configuration
    const API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key
    const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX'];
    
    // Initialize the stock ticker with real data
    initRealStockData();
    
    // Function to fetch real stock data
    async function fetchStockData() {
        try {
            // For demonstration, we'll show how to use different APIs
            
            // Option 1: Alpha Vantage API
            // const endpoint = `https://www.alphavantage.co/query?function=BATCH_STOCK_QUOTES&symbols=${SYMBOLS.join(',')}&apikey=${API_KEY}`;
            
            // Option 2: Finnhub API
            // const endpoint = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;
            
            // Option 3: Yahoo Finance API (via RapidAPI)
            // const endpoint = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=${SYMBOLS.join(',')}`;
            
            // For this demo, we'll use a mock response
            return getMockRealData();
            
            // In a real implementation, you would use fetch:
            /*
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    // Include any required headers for your chosen API
                    // 'X-RapidAPI-Key': API_KEY,
                    // 'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
                }
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            return await response.json();
            */
        } catch (error) {
            console.error('Error fetching stock data:', error);
            return null;
        }
    }
    
    // Function to update the ticker with real data
    async function initRealStockData() {
        const stockData = await fetchStockData();
        if (!stockData) return;
        
        updateTickerWithRealData(stockData);
        
        // Set up periodic updates (every 60 seconds)
        setInterval(async () => {
            const updatedData = await fetchStockData();
            if (updatedData) {
                updateTickerWithRealData(updatedData);
            }
        }, 60000); // Update every minute
    }
    
    // Update the ticker with real data
    function updateTickerWithRealData(data) {
        const tickerContainer = document.getElementById('stockTickerContainer');
        if (!tickerContainer) return;
        
        // Create new ticker content
        let tickerHTML = '';
        
        // Process the data based on the API format
        // This example assumes the mock data format
        data.forEach(stock => {
            const changePercent = stock.changePercent;
            const changeClass = changePercent >= 0 ? 'positive' : 'negative';
            const changeSign = changePercent >= 0 ? '+' : '';
            
            tickerHTML += `
                <div class="ticker-item">
                    <span class="ticker-symbol">${stock.symbol}</span>
                    <span class="ticker-price">$${stock.price.toFixed(2)}</span>
                    <span class="ticker-change ${changeClass}">${changeSign}${changePercent.toFixed(2)}%</span>
                </div>
            `;
        });
        
        // Update the ticker content
        const tickerElement = document.getElementById('stockTicker');
        if (tickerElement) {
            tickerElement.innerHTML = tickerHTML;
            
            // Clone for continuous scrolling
            tickerElement.innerHTML += tickerHTML;
        }
    }
    
    // Mock real data for demonstration
    function getMockRealData() {
        // This simulates the structure of real API data
        // In a real implementation, this would be replaced with actual API responses
        return [
            { symbol: 'AAPL', price: 178.72, changePercent: 1.24 },
            { symbol: 'MSFT', price: 403.78, changePercent: 0.87 },
            { symbol: 'GOOGL', price: 142.56, changePercent: -0.32 },
            { symbol: 'AMZN', price: 178.15, changePercent: 2.15 },
            { symbol: 'TSLA', price: 175.34, changePercent: -1.45 },
            { symbol: 'META', price: 474.99, changePercent: 0.56 },
            { symbol: 'NFLX', price: 628.80, changePercent: 1.78 }
        ];
    }
});