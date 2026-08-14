/**
 * 赵兄收集的RSS - 纯前端解析（无 API）
 */

const CONFIG = {
    OPML_PATH: './opml/feeds.opml',
    CORS_PROXIES: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://cors.bridged.cc/'
    ],
    ITEMS_PER_LOAD: 10,
    CACHE_DURATION: 5 * 60 * 1000
};

const state = {
    feeds: [],
    currentFeed: null,
    allItems: [],
    articles: [],
    loadedCount: 0,
    isLoading: false,
    cache: new Map(),
    proxyIndex: 0
};

const elements = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    elements.feedList = document.getElementById('feedList');
    elements.articlesList = document.getElementById('articlesList');
    elements.currentFeedInfo = document.getElementById('feedHeader');
    elements.loadMoreBtn = document.getElementById('loadMoreBtn');
    elements.searchInput = document.getElementById('searchInput');
    elements.refreshBtn = document.getElementById('refreshBtn');
    
    elements.loadMoreBtn.addEventListener('click', loadMoreArticles);
    elements.refreshBtn.addEventListener('click', refreshCurrentFeed);
    elements.searchInput.addEventListener('input', debounce(filterFeeds, 300));
    
    await loadOPML();
}

async function loadOPML() {
    try {
        const response = await fetch(CONFIG.OPML_PATH);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) throw new Error('XML 解析失败');
        
        const outlines = xmlDoc.querySelectorAll('outline[xmlUrl]');
        if (outlines.length === 0) throw new Error('未找到任何 RSS 订阅源');
        
        state.feeds = Array.from(outlines).map((outline, index) => ({
            id: index,
            title: outline.getAttribute('title') || outline.getAttribute('text') || '未命名',
            url: outline.getAttribute('xmlUrl'),
            htmlUrl: outline.getAttribute('htmlUrl') || '#',
            icon: getFeedIcon(outline.getAttribute('title') || outline.getAttribute('text'))
        }));
        
        renderFeedList();
        showEmptyState();
        
    } catch (error) {
        console.error('加载 OPML 失败:', error);
        elements.feedList.innerHTML = `
            <div class="error-state">
                <div class="error-state-icon">⚠️</div>
                <p>加载订阅源失败：${error.message}</p>
            </div>
        `;
    }
}

function getFeedIcon(title) {
    if (!title) return '?';
    const match = title.match(/[\u4e00-\u9fa5]/) || title.match(/[a-zA-Z]/);
    return match ? match[0].toUpperCase() : title.charAt(0).toUpperCase();
}

function renderFeedList(feedsToRender = state.feeds) {
    if (feedsToRender.length === 0) {
        elements.feedList.innerHTML = '<div class="empty-state"><p>未找到订阅源</p></div>';
        return;
    }
    
    elements.feedList.innerHTML = feedsToRender.map(feed => `
        <div class="feed-item" data-feed-id="${feed.id}" onclick="selectFeed(${feed.id})">
            <div class="feed-icon">${feed.icon}</div>
            <span class="feed-name" title="${escapeHtml(feed.title)}">${escapeHtml(feed.title)}</span>
        </div>
    `).join('');
}

function filterFeeds() {
    const query = elements.searchInput.value.toLowerCase().trim();
    if (!query) { renderFeedList(); return; }
    const filtered = state.feeds.filter(feed => feed.title.toLowerCase().includes(query));
    renderFeedList(filtered);
}

async function selectFeed(feedId) {
    const feed = state.feeds.find(f => f.id === feedId);
    if (!feed) return;
    
    document.querySelectorAll('.feed-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.feedId) === feedId);
    });
    
    state.currentFeed = feed;
    state.allItems = [];
    state.articles = [];
    state.loadedCount = 0;
    
    updateFeedInfo(feed);
    elements.refreshBtn.disabled = false;
    await loadArticles(true);
}

function updateFeedInfo(feed) {
    elements.currentFeedInfo.innerHTML = `
        <div>
            <h3>${escapeHtml(feed.title)}</h3>
            <div class="feed-url">${escapeHtml(feed.url)}</div>
        </div>
        <button class="refresh-btn" id="refreshBtn" onclick="refreshCurrentFeed()">🔄 刷新</button>
    `;
    elements.refreshBtn = document.getElementById('refreshBtn');
}

async function fetchWithProxy(url) {
    for (let i = 0; i < CONFIG.CORS_PROXIES.length; i++) {
        const proxyIndex = (state.proxyIndex + i) % CONFIG.CORS_PROXIES.length;
        const proxyUrl = CONFIG.CORS_PROXIES[proxyIndex] + encodeURIComponent(url);
        
        try {
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/xml, text/xml' }
            });
            
            if (!response.ok) continue;
            
            const text = await response.text();
            if (text && (text.includes('<?xml') || text.includes('<rss') || text.includes('<feed'))) {
                state.proxyIndex = proxyIndex;
                return text;
            }
        } catch (error) {
            console.warn('代理失败:', error.message);
            continue;
        }
    }
    
    throw new Error('所有 CORS 代理均不可用');
}

function parseRSS(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) throw new Error('RSS XML 格式错误');
    
    const items = Array.from(xmlDoc.querySelectorAll('item, entry')).map(item => {
        const title = getNodeText(item, 'title');
        const link = getNodeText(item, 'link') || getNodeAttr(item, 'link', 'href');
        const pubDate = getNodeText(item, 'pubDate', 'updated', 'published');
        const description = getNodeText(item, 'description', 'summary', 'content');
        const author = getAuthor(item);
        
        let thumbnail = getNodeAttr(item, 'enclosure', 'url');
        if (!thumbnail && description) {
            const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
            if (imgMatch) thumbnail = imgMatch[1];
        }
        
        return {
            title: title || '无标题',
            link: link || '#',
            pubDate: pubDate ? new Date(pubDate) : new Date(),
            description: description || '',
            author: author || '',
            thumbnail: thumbnail
        };
    }).filter(item => item.link !== '#');
    
    return items;
}

function getNodeText(node, ...tagNames) {
    for (const tagName of tagNames) {
        // 尝试直接子元素
        let child = node.querySelector(tagName);
        if (child && child.textContent) return child.textContent.trim();
        // 尝试 getElementsByTagName（支持命名空间）
        child = node.getElementsByTagName(tagName);
        if (child.length > 0 && child[0].textContent) return child[0].textContent.trim();
        // 尝试带命名空间的标签（如 dc:creator）
        const allElements = node.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            if (el.localName === tagName || el.tagName === tagName || el.tagName.endsWith(':' + tagName)) {
                if (el.textContent) return el.textContent.trim();
            }
        }
    }
    return '';
}

function getNodeAttr(node, tagName, attrName) {
    const element = node.querySelector(tagName);
    return element ? element.getAttribute(attrName) : '';
}

// 修复：正确处理 dc:creator 等带命名空间的作者字段
function getAuthor(item) {
    // 尝试 author 标签
    const author = item.querySelector('author');
    if (author && author.textContent) return author.textContent.trim();
    
    // 尝试 dc:creator（通过遍历所有元素）
    const allElements = item.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (el.localName === 'creator' || el.tagName === 'dc:creator' || el.tagName.endsWith(':creator')) {
            if (el.textContent) return el.textContent.trim();
        }
    }
    
    return '';
}

async function loadArticles(isRefresh = false) {
    if (state.isLoading || !state.currentFeed) return;
    
    state.isLoading = true;
    updateRefreshBtn(true);
    
    try {
        const cacheKey = `${state.currentFeed.url}_${Math.floor(Date.now() / CONFIG.CACHE_DURATION)}`;
        let items;
        
        if (!isRefresh && state.cache.has(cacheKey)) {
            items = state.cache.get(cacheKey);
        } else {
            const xmlText = await fetchWithProxy(state.currentFeed.url);
            items = parseRSS(xmlText);
            state.cache.set(cacheKey, items);
        }
        
        if (isRefresh) {
            state.allItems = items;
            state.loadedCount = 0;
        }
        
        const start = state.loadedCount;
        const end = Math.min(state.loadedCount + CONFIG.ITEMS_PER_LOAD, state.allItems.length);
        const itemsToLoad = state.allItems.slice(start, end);
        
        const newArticles = itemsToLoad.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: stripHtml(item.description),
            author: item.author,
            thumbnail: item.thumbnail
        }));
        
        if (isRefresh) {
            state.articles = newArticles;
        } else {
            state.articles = [...state.articles, ...newArticles];
        }
        
        state.loadedCount = end;
        
        renderArticles(isRefresh);
        updateLoadMoreBtn(state.loadedCount < state.allItems.length);
        
    } catch (error) {
        console.error('加载 RSS 失败:', error);
        if (isRefresh) {
            elements.articlesList.innerHTML = `
                <div class="error-state">
                    <div class="error-state-icon">⚠️</div>
                    <p>加载失败：${error.message}</p>
                    <p style="margin-top:15px;font-size:0.85rem;color:#64748b;">
                        💡 解决方案：<br>
                        1. 某些 RSS 源可能需要科学上网<br>
                        2. 或尝试其他订阅源
                    </p>
                </div>
            `;
        }
    } finally {
        state.isLoading = false;
        updateRefreshBtn(false);
    }
}

function renderArticles(isRefresh = false) {
    if (state.articles.length === 0) {
        showEmptyState('暂无文章');
        return;
    }
    
    const startIdx = isRefresh ? 0 : Math.max(0, state.loadedCount - CONFIG.ITEMS_PER_LOAD);
    const articlesToRender = state.articles.slice(startIdx);
    
    const html = articlesToRender.map(article => `
        <article class="article-card unread">
            <div class="article-header">
                <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer" class="article-title">
                    ${escapeHtml(article.title)}
                </a>
            </div>
            <div class="article-meta">
                <span class="article-date">📅 ${formatDate(article.pubDate)}</span>
                ${article.author ? `<span class="article-source">✍️ ${escapeHtml(article.author)}</span>` : ''}
            </div>
            ${article.description ? `<div class="article-description">${article.description}</div>` : ''}
        </article>
    `).join('');
    
    if (isRefresh) {
        elements.articlesList.innerHTML = html;
    } else {
        elements.articlesList.insertAdjacentHTML('beforeend', html);
    }
    setupLazyLoad();
}

function loadMoreArticles() {
    if (state.isLoading) return;
    loadArticles(false);
}

function updateLoadMoreBtn(hasMore) {
    elements.loadMoreBtn.style.display = hasMore ? 'block' : 'none';
    elements.loadMoreBtn.disabled = state.isLoading;
}

function refreshCurrentFeed() {
    if (!state.currentFeed || state.isLoading) return;
    loadArticles(true);
}

function updateRefreshBtn(loading) {
    const btn = document.getElementById('refreshBtn');
    if (!btn) return;
    if (loading) {
        btn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> 加载中...';
        btn.disabled = true;
    } else {
        btn.innerHTML = '🔄 刷新';
        btn.disabled = !state.currentFeed;
    }
}

function showEmptyState(message = '请从左侧选择一个订阅源') {
    elements.articlesList.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📰</div>
            <h3>${message}</h3>
            <p>点击左侧网站列表开始阅读</p>
        </div>
    `;
    elements.loadMoreBtn.style.display = 'none';
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    let text = tmp.textContent || tmp.innerText || '';
    if (text.length > 200) text = text.substring(0, 200) + '...';
    return escapeHtml(text);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function setupLazyLoad() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '200px' });
    
    document.querySelectorAll('.article-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transition = 'opacity 0.3s ease';
        observer.observe(card);
    });
}

window.selectFeed = selectFeed;
