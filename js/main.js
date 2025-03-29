// main.js

// Constants
const MAX_RECENT_SEARCHES = 5;

// DOM Elements
const form = document.getElementById('search-form');
const jobTitleInput = document.getElementById('job-title');
const locationInput = document.getElementById('location');
const experienceSelect = document.getElementById('experience');
const locationTypeSelect = document.getElementById('location-type');
const resultsContainer = document.getElementById('results');
const currencySelect = document.getElementById('currency');
const recentSearchesContainer = document.getElementById('recent-searches-container');
const recentSearchesList = document.getElementById('recent-searches');
const sortSelect = document.getElementById('sort-select');

// Exchange rates (simplified for demo purposes)
const exchangeRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.78,
    JPY: 113.5,
    CAD: 1.35,
    AUD: 1.50
};

// Currency symbols
const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$'
};

// Load recent searches from localStorage
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

// Initialize the app
function init() {
    // Event listeners
    form.addEventListener('submit', handleSearch);
    currencySelect.addEventListener('change', updateCurrency);
    sortSelect.addEventListener('change', sortResults);

    // Render recent searches if any
    renderRecentSearches();
}

// Handle the search form submission
async function handleSearch(e) {
    e.preventDefault();
    
    const jobTitle = jobTitleInput.value.trim();
    const location = locationInput.value.trim();
    const experience = experienceSelect.value;
    const locationType = locationTypeSelect.value;
    
    if (!jobTitle || !location) {
        showError('Please enter both job title and location');
        return;
    }
    
    // Add to recent searches
    addToRecentSearches(jobTitle, location, experience, locationType);
    
    // Show loading spinner
    showLoading();
    
    try {
        const data = await fetchSalaryEstimates(jobTitle, location, experience, locationType);
        renderResults(data);
    } catch (error) {
        handleApiError(error);
    }
}

// Fetch salary estimates from the API using values from the config file
async function fetchSalaryEstimates(jobTitle, location, experience, locationType) {
    const url = `https://jsearch.p.rapidapi.com/estimated-salary?job_title=${encodeURIComponent(jobTitle)}&location=${encodeURIComponent(location)}&location_type=${locationType}&years_of_experience=${experience}`;
    
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': CONFIG.API_HOST,
            'x-rapidapi-key': CONFIG.API_KEY
        }
    };
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    
    return await response.json();
}

// Handle API error
function handleApiError(error) {
    console.error('API Error:', error);
    showError('Failed to fetch salary data. Please try again later.');
}

// Render the API results
function renderResults(data) {
    if (!data.data || data.data.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i>🔍</i>
                <p>No salary data found for your search. Try adjusting your criteria.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    const currency = currencySelect.value;
    
    data.data.forEach(item => {
        const medianSalary = convertCurrency(item.median_salary || 0, currency);
        const minSalary = convertCurrency(item.min_salary || 0, currency);
        const maxSalary = convertCurrency(item.max_salary || 0, currency);
        
        html += `
            <div class="salary-card">
                <div class="salary-header">
                    <div class="job-title">${item.job_title || 'Job Title'}</div>
                    <div class="salary-amount">${formatCurrency(medianSalary, currency)}</div>
                </div>
                <div class="salary-range">Range: ${formatCurrency(minSalary, currency)} - ${formatCurrency(maxSalary, currency)}</div>
                <p>${item.publisher_name ? `Data by ${item.publisher_name}` : ''}</p>
                <div class="salary-details">
                    <div class="salary-detail location">${item.location || 'Location'}</div>
                    <div class="salary-detail experience">${formatExperience(item.years_of_experience)}</div>
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
    sortResults(); // Sort results after rendering
}

// Show loading spinner
function showLoading() {
    resultsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
}

// Show error message
function showError(message) {
    resultsContainer.innerHTML = `
        <div class="error-message">
            ${message}
        </div>
        <div class="no-results">
            <p>Please try adjusting your search criteria</p>
        </div>
    `;
}

// Format currency values
function formatCurrency(amount, currency) {
    const symbol = currencySymbols[currency];
    
    // Format based on currency type
    if (currency === 'JPY') {
        return `${symbol}${Math.round(amount).toLocaleString()}`;
    }
    
    return `${symbol}${amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
}

// Convert currency
function convertCurrency(amount, targetCurrency) {
    return amount * exchangeRates[targetCurrency];
}

// Format experience level
function formatExperience(experience) {
    if (!experience) return 'All Experience';
    
    const experienceMap = {
        'ALL': 'All Experience',
        'LESS_THAN_1': '< 1 Year',
        'ONE_TO_THREE': '1-3 Years',
        'THREE_TO_FIVE': '3-5 Years', 
        'FIVE_TO_TEN': '5-10 Years',
        'MORE_THAN_10': '10+ Years'
    };
    
    return experienceMap[experience] || experience;
}

// Update currency display
function updateCurrency() {
    const currentHTML = resultsContainer.innerHTML;
    if (!currentHTML.includes('no-results') && !currentHTML.includes('loading')) {
        const jobTitle = jobTitleInput.value.trim();
        const location = locationInput.value.trim();
        const experience = experienceSelect.value;
        const locationType = locationTypeSelect.value;
        
        showLoading();
        
        fetchSalaryEstimates(jobTitle, location, experience, locationType)
            .then(data => renderResults(data))
            .catch(handleApiError);
    }
}

// Sort results based on selected criteria
function sortResults() {
    const sortValue = sortSelect.value;
    const results = Array.from(resultsContainer.children);
    const salaryCards = results.filter(card => card.classList.contains('salary-card'));

    salaryCards.sort((a, b) => {
        const aSalary = parseCurrency(a.querySelector('.salary-amount').textContent);
        const bSalary = parseCurrency(b.querySelector('.salary-amount').textContent);
        
        if (sortValue === 'median') {
            return bSalary - aSalary; // Descending order
        } else if (sortValue === 'min') {
            const aMin = parseCurrency(a.querySelector('.salary-range').textContent.split(' - ')[0]);
            const bMin = parseCurrency(b.querySelector('.salary-range').textContent.split(' - ')[0]);
            return bMin - aMin; // Ascending order
        } else {
            const aMax = parseCurrency(a.querySelector('.salary-range').textContent.split(' - ')[1]);
            const bMax = parseCurrency(b.querySelector('.salary-range').textContent.split(' - ')[1]);
            return bMax - aMax; // Ascending order
        }
    });

    resultsContainer.innerHTML = '';
    salaryCards.forEach(card => resultsContainer.appendChild(card));
}

// Parse currency string to number
function parseCurrency(currencyString) {
    return parseFloat(currencyString.replace(/[^0-9.-]+/g,""));
}

// Add to recent searches
function addToRecentSearches(jobTitle, location, experience, locationType) {
    const search = {
        id: Date.now(),
        jobTitle,
        location,
        experience,
        locationType
    };
    
    recentSearches.unshift(search);
    
    if (recentSearches.length > MAX_RECENT_SEARCHES) {
        recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);
    }
    
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    
    renderRecentSearches();
}

// Render recent searches
function renderRecentSearches() {
    if (recentSearches.length === 0) {
        recentSearchesContainer.classList.add('hidden');
        return;
    }
    
    recentSearchesContainer.classList.remove('hidden');
    recentSearchesList.innerHTML = '';
    
    recentSearches.forEach(search => {
        const searchTag = document.createElement('div');
        searchTag.classList.add('recent-search-tag');
        searchTag.innerHTML = `<span class="search-icon">🔍</span> ${search.jobTitle} in ${search.location}`;
        
        searchTag.addEventListener('click', () => {
            jobTitleInput.value = search.jobTitle;
            locationInput.value = search.location;
            experienceSelect.value = search.experience;
            locationTypeSelect.value = search.locationType;
            
            form.dispatchEvent(new Event('submit'));
        });
        
        recentSearchesList.appendChild(searchTag);
    });
}

// Initialize the app
init();
