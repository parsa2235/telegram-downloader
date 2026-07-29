// Configuration
const HISTORY_URL = 'data/history.json';
const CACHE_KEY = 'download_history_cache';
const CACHE_TIMESTAMP_KEY = 'download_history_timestamp';

// State
let allData = [];
let currentLang = 'fa';
let currentTheme = 'light';

// Translations
const translations = {
    fa: {
        title: 'مدیریت دانلود',
        totalFiles: 'کل فایل‌ها',
        totalSize: 'حجم کل',
        lastUpdate: 'آخرین بروزرسانی',
        searchPlaceholder: 'جستجو در نام فایل‌ها...',
        allChannels: 'همه کانال‌ها',
        allFormats: 'همه فرمت‌ها',
        newest: 'جدیدترین',
        oldest: 'قدیمی‌ترین',
        largest: 'بزرگترین',
        smallest: 'کوچکترین',
        loading: 'در حال بارگذاری...',
        noFiles: 'هیچ فایلی یافت نشد',
        footer: 'طراحی شده با دقت',
        download: 'دانلود مستقیم',
        channel: 'کانال',
        size: 'حجم'
    },
    en: {
        title: 'Download Manager',
        totalFiles: 'Total Files',
        totalSize: 'Total Size',
        lastUpdate: 'Last Update',
        searchPlaceholder: 'Search files...',
        allChannels: 'All Channels',
        allFormats: 'All Formats',
        newest: 'Newest',
        oldest: 'Oldest',
        largest: 'Largest',
        smallest: 'Smallest',
        loading: 'Loading...',
        noFiles: 'No files found',
        footer: 'Crafted with precision',
        download: 'Direct Download',
        channel: 'Channel',
        size: 'Size'
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLang();
    fetchData();
    setupEventListeners();
    
    // Auto-refresh every 30 seconds
    setInterval(fetchData, 30000);
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
}

// Language Management
function initLang() {
    const savedLang = localStorage.getItem('lang') || 'fa';
    currentLang = savedLang;
    updateDirection(savedLang);
    updateTexts(savedLang);
}

function toggleLang() {
    currentLang = currentLang === 'fa' ? 'en' : 'fa';
    localStorage.setItem('lang', currentLang);
    updateDirection(currentLang);
    updateTexts(currentLang);
    render(allData); // Re-render with new language
}

function updateDirection(lang) {
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
}

function updateTexts(lang) {
    const t = translations[lang];
    
    // Update static texts
    document.getElementById('site-title').textContent = t.title;
    
    // Update elements with data attributes
    document.querySelectorAll('[data-fa]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });
    
    // Update placeholders
    const searchInput = document.getElementById('searchInput');
    searchInput.placeholder = t.searchPlaceholder;
    
    // Update filter options
    updateFilterOptions(lang);
}

function updateFilterOptions(lang) {
    const t = translations[lang];
    
    const channelFilter = document.getElementById('channelFilter');
    channelFilter.options[0].text = t.allChannels;
    
    const extFilter = document.getElementById('extFilter');
    extFilter.options[0].text = t.allFormats;
    
    const sortFilter = document.getElementById('sortFilter');
    sortFilter.options[0].text = t.newest;
    sortFilter.options[1].text = t.oldest;
    sortFilter.options[2].text = t.largest;
    sortFilter.options[3].text = t.smallest;
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('langToggle').addEventListener('click', toggleLang);
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
        applyFilters();
    });
    
    document.getElementById('channelFilter').addEventListener('change', () => {
        applyFilters();
    });
    
    document.getElementById('extFilter').addEventListener('change', () => {
        applyFilters();
    });
    
    document.getElementById('sortFilter').addEventListener('change', () => {
        applyFilters();
    });
}

// Data Fetching
async function fetchData() {
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`${HISTORY_URL}?t=${timestamp}`, {
            cache: 'no-store'
        });
        
        if (!response.ok) {
            throw new Error('History file not found');
        }
        
        allData = await response.json();
        
        // Update last update time
        const now = new Date();
        const timeStr = currentLang === 'fa' 
            ? toPersianDate(now) 
            : now.toLocaleString();
        document.getElementById('lastUpdate').textContent = timeStr;
        
        updateStats();
        populateFilters();
        applyFilters();
        
    } catch (error) {
        console.error('Fetch error:', error);
        showEmptyState();
    }
}

// Statistics
function updateStats() {
    const totalFiles = allData.length;
    const totalSize = allData.reduce((acc, item) => acc + (item.size_mb || 0), 0);
    
    const t = translations[currentLang];
    
    document.getElementById('totalFiles').textContent = totalFiles.toLocaleString(currentLang === 'fa' ? 'fa-IR' : 'en-US');
    document.getElementById('totalSize').textContent = `${Math.round(totalSize).toLocaleString(currentLang === 'fa' ? 'fa-IR' : 'en-US')} MB`;
}

// Filter Population
function populateFilters() {
    const channels = [...new Set(allData.map(item => item.channel))];
    const extensions = [...new Set(allData.map(item => item.extension))];
    
    const channelFilter = document.getElementById('channelFilter');
    const extFilter = document.getElementById('extFilter');
    
    // Keep first option, remove others
    while (channelFilter.options.length > 1) {
        channelFilter.remove(1);
    }
    while (extFilter.options.length > 1) {
        extFilter.remove(1);
    }
    
    // Add new options
    channels.forEach(channel => {
        const opt = document.createElement('option');
        opt.value = channel;
        opt.textContent = channel;
        channelFilter.appendChild(opt);
    });
    
    extensions.forEach(ext => {
        const opt = document.createElement('option');
        opt.value = ext;
        opt.textContent = ext.toUpperCase();
        extFilter.appendChild(opt);
    });
}

// Apply Filters & Sort
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedChannel = document.getElementById('channelFilter').value;
    const selectedExt = document.getElementById('extFilter').value;
    const sortBy = document.getElementById('sortFilter').value;
    
    let filtered = allData.filter(item => {
        const matchesSearch = item.original_name.toLowerCase().includes(searchTerm);
        const matchesChannel = selectedChannel === 'all' || item.channel === selectedChannel;
        const matchesExt = selectedExt === 'all' || item.extension === selectedExt;
        return matchesSearch && matchesChannel && matchesExt;
    });
    
    // Sort
    switch (sortBy) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'largest':
            filtered.sort((a, b) => b.size_mb - a.size_mb);
            break;
        case 'smallest':
            filtered.sort((a, b) => a.size_mb - b.size_mb);
            break;
    }
    
    render(filtered);
}

// Render
function render(data) {
    const grid = document.getElementById('filesGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (data.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    grid.innerHTML = '';
    
    const t = translations[currentLang];
    
    data.forEach((item, index) => {
        const card = createFileCard(item, t, index);
        grid.appendChild(card);
    });
}

function createFileCard(item, t, index) {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.style.animationDelay = `${index * 0.05}s`;
    
    const dateObj = new Date(item.date);
    const dateStr = currentLang === 'fa' 
        ? toPersianDate(dateObj, true) 
        : dateObj.toLocaleDateString();
    
    const iconSvg = getFileIcon(item.extension);
    
    card.innerHTML = `
        <div class="file-header">
            <div class="file-icon-wrapper">
                ${iconSvg}
            </div>
            <div class="file-info">
                <div class="file-name" title="${item.original_name}">${item.original_name}</div>
                <div class="file-meta">
                    <span>${item.size_mb} MB</span>
                    <span class="file-badge">${item.extension}</span>
                </div>
            </div>
        </div>
        <div class="file-details">
            <div>
                <div class="file-channel">${t.channel}: ${item.channel}</div>
                <div class="file-date">${dateStr}</div>
            </div>
        </div>
        <a href="${item.url}" target="_blank" class="btn-download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            ${t.download}
        </a>
    `;
    
    return card;
}

function getFileIcon(ext) {
    const icons = {
        pdf: '<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
        zip: '<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
        mp4: '<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',
        mp3: '<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
        jpg: '<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        png: '<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        txt: '<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>'
    };
    
    return icons[ext.toLowerCase()] || '<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
}

function showEmptyState() {
    const grid = document.getElementById('filesGrid');
    const emptyState = document.getElementById('emptyState');
    const t = translations[currentLang];
    
    grid.innerHTML = '';
    emptyState.querySelector('p').textContent = t.noFiles;
    emptyState.classList.remove('hidden');
}

// Persian Date Helper
function toPersianDate(date, includeTime = false) {
    const persianMonths = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];
    
    // Simple approximation (not exact Persian calendar)
    const year = date.getFullYear() - 621;
    const month = persianMonths[date.getMonth()];
    const day = date.getDate();
    
    let result = `${day} ${month} ${year}`;
    
    if (includeTime) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        result += ` ${hours}:${minutes}`;
    }
    
    return result;
}
