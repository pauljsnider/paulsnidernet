// Weather functionality
document.addEventListener('DOMContentLoaded', function() {
    // Weather API key (using OpenWeatherMap free API)
    const apiKey = 'YOUR_API_KEY'; // Replace with your actual API key
    
    // DOM elements
    const cityInput = document.getElementById('cityInput');
    const searchButton = document.getElementById('searchWeather');
    const weatherLoading = document.getElementById('weatherLoading');
    const weatherInfo = document.getElementById('weatherInfo');
    const weatherError = document.getElementById('weatherError');
    
    // Weather data elements
    const weatherCity = document.getElementById('weatherCity');
    const weatherCountry = document.getElementById('weatherCountry');
    const weatherIcon = document.getElementById('weatherIcon');
    const weatherTemp = document.getElementById('weatherTemp');
    const weatherDescription = document.getElementById('weatherDescription');
    const weatherFeelsLike = document.getElementById('weatherFeelsLike');
    const weatherHumidity = document.getElementById('weatherHumidity');
    const weatherWind = document.getElementById('weatherWind');
    
    // Event listeners
    searchButton.addEventListener('click', getWeather);
    cityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            getWeather();
        }
    });
    
    // Get weather data from API
    function getWeather() {
        const city = cityInput.value.trim();
        
        if (!city) {
            showError('Please enter a city name');
            return;
        }
        
        // Show loading state
        weatherLoading.style.display = 'block';
        weatherInfo.style.display = 'none';
        weatherError.style.display = 'none';
        
        // For demo purposes, we'll use a mock response
        // In a real application, you would use the API key and fetch real data
        setTimeout(() => {
            if (city.toLowerCase() === 'error') {
                showError('City not found. Please try again.');
            } else {
                // Mock weather data
                const mockWeatherData = getMockWeatherData(city);
                displayWeather(mockWeatherData);
            }
        }, 1000);
        
        // In a real application, you would use this code:
        /*
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('City not found');
                }
                return response.json();
            })
            .then(data => {
                displayWeather(data);
            })
            .catch(error => {
                showError('City not found. Please try again.');
            });
        */
    }
    
    // Display weather data
    function displayWeather(data) {
        // Hide loading, show weather info
        weatherLoading.style.display = 'none';
        weatherInfo.style.display = 'block';
        weatherError.style.display = 'none';
        
        // Update weather information
        weatherCity.textContent = data.name;
        weatherCountry.textContent = data.sys.country;
        
        // Use local weather icons instead of external API
        const iconCode = data.weather[0].icon;
        const iconMap = {
            '01d': '☀️', // clear sky day
            '01n': '🌙', // clear sky night
            '02d': '⛅', // few clouds day
            '02n': '☁️', // few clouds night
            '03d': '☁️', // scattered clouds
            '03n': '☁️',
            '04d': '☁️', // broken clouds
            '04n': '☁️',
            '09d': '🌧️', // shower rain
            '09n': '🌧️',
            '10d': '🌦️', // rain
            '10n': '🌧️',
            '11d': '⛈️', // thunderstorm
            '11n': '⛈️',
            '13d': '❄️', // snow
            '13n': '❄️',
            '50d': '🌫️', // mist
            '50n': '🌫️'
        };
        
        // Use emoji as fallback if icon not found
        const weatherEmoji = iconMap[iconCode] || '🌤️';
        weatherIcon.src = ''; // Clear any previous src
        weatherIcon.style.fontSize = '60px';
        weatherIcon.style.display = 'inline-block';
        weatherIcon.alt = data.weather[0].description;
        weatherIcon.innerHTML = weatherEmoji;
        
        weatherTemp.textContent = `${Math.round(data.main.temp)}°C`;
        weatherDescription.textContent = data.weather[0].description;
        weatherFeelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
        weatherHumidity.textContent = `${data.main.humidity}%`;
        weatherWind.textContent = `${data.wind.speed} m/s`;
    }
    
    // Show error message
    function showError(message) {
        weatherLoading.style.display = 'none';
        weatherInfo.style.display = 'none';
        weatherError.style.display = 'block';
        weatherError.querySelector('p').textContent = message;
    }
    
    // Mock weather data for demo purposes
    function getMockWeatherData(city) {
        const weatherIcons = ['01d', '02d', '03d', '04d', '09d', '10d', '11d', '13d', '50d'];
        const weatherDescriptions = [
            'clear sky', 'few clouds', 'scattered clouds', 'broken clouds', 
            'shower rain', 'rain', 'thunderstorm', 'snow', 'mist'
        ];
        
        const randomIndex = Math.floor(Math.random() * weatherIcons.length);
        const temp = Math.floor(Math.random() * 35) + 5; // Random temp between 5 and 40
        const feelsLike = temp + (Math.random() * 5 - 2); // Feels like temp +/- 2 degrees
        const humidity = Math.floor(Math.random() * 60) + 30; // Random humidity between 30% and 90%
        const windSpeed = Math.random() * 10; // Random wind speed between 0 and 10 m/s
        
        return {
            name: city,
            sys: {
                country: 'US' // Default country for demo
            },
            weather: [
                {
                    icon: weatherIcons[randomIndex],
                    description: weatherDescriptions[randomIndex]
                }
            ],
            main: {
                temp: temp,
                feels_like: feelsLike,
                humidity: humidity
            },
            wind: {
                speed: windSpeed.toFixed(1)
            }
        };
    }
    
    // Try to get user's location for initial weather
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                // In a real app, you would use the coordinates to get weather
                // For demo, we'll just set a default city
                cityInput.value = 'Kansas City';
                getWeather();
            }, () => {
                // If user denies location or error occurs, use default city
                cityInput.value = 'Kansas City';
                getWeather();
            });
        } else {
            // Geolocation not supported
            cityInput.value = 'Kansas City';
            getWeather();
        }
    }
    
    // Initialize with user's location or default city
    getUserLocation();
});