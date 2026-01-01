// ==========================================
// 1. KONFİQURASİYA & GLOBAL DƏYİŞƏNLƏR
// ==========================================
const API_KEY = '196fa505944ecee128d2576be7776978';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';

// Slider Tənzimləmələri (CSS ilə eyni olmalıdır)
const ITEM_WIDTH = 160; // 130px Card + 30px Gap

// Grid & Pagination State
let currentPage = 1;
let pagesLoaded = 0;
const PAGES_TO_LOAD_BEFORE_CLICK = 3; // 3 səhifədən bir "Load More" çıxsın
let isFetching = false;

// Filter & Sort State
let currentGenre = 'all';
let currentSort = 'popularity.desc';

// Data State
let wishlist = JSON.parse(localStorage.getItem('filmoria_wishlist')) || [];
let pickerHistory = [];
let heroMoviesList = [];

// Hero Slider State
let heroTimer;
let activeGlobalIndex = 0;

// Janr ID-ləri
const genresMap = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 878: "Sci-Fi", 53: "Thriller", 10749: "Romance"
};

// DOM Elementləri
const heroBg = document.getElementById('hero-bg');
const heroTitle = document.getElementById('hero-title');
const heroDesc = document.getElementById('hero-desc');
const heroRating = document.getElementById('hero-rating');
const heroYear = document.getElementById('hero-year');
const heroGenres = document.getElementById('hero-genres');
const heroSlider = document.getElementById('hero-slider');
const grid = document.getElementById('main-grid');
const loader = document.getElementById('loader');
const loadMoreBtn = document.getElementById('load-more-btn');
const wishlistCount = document.getElementById('wishlist-count');
const sortSelect = document.getElementById('sort-select');

// --- BAŞLANĞIC ---
document.addEventListener('DOMContentLoaded', () => {
    updateWishlistCount();
    fetchHeroData();
    fetchMainGrid();
});


// ==========================================
// 2. HERO SLIDER MƏNTİQİ (FIXED INFINITY)
// ==========================================

async function fetchHeroData() {
    try {
        const res = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`);
        const data = await res.json();
        heroMoviesList = data.results;

        // Slideri 3 qat (Triple List) olaraq yaradırıq
        renderInfiniteSlider();

        // Başlanğıc: Ortadakı siyahının başından başlayırıq
        const initialIndex = heroMoviesList.length;
        activeGlobalIndex = initialIndex;

        // UI-ı yenilə
        updateHeroUI(0);
        highlightSlide(activeGlobalIndex);

        // Slideri dərhal həmin yerə atırıq (Animasiyasız)
        setTimeout(() => {
            scrollToIndex(activeGlobalIndex, 'auto');
        }, 100);

        // Timer-i başlat
        startHeroTimer();

        // Manual Scroll Listener
        heroSlider.addEventListener('scroll', handleManualScroll);

        // Mouse üzərinə gələndə dayanması üçün
        const wrapper = document.getElementById('hero-wrapper');
        wrapper.addEventListener('mouseenter', stopHeroTimer);
        wrapper.addEventListener('mouseleave', startHeroTimer);

    } catch (e) { console.error("Hero Error:", e); }
}

function renderInfiniteSlider() {
    heroSlider.innerHTML = '';
    // [List 1 (Klon)] + [List 2 (Əsas)] + [List 3 (Klon)]
    const tripleList = [...heroMoviesList, ...heroMoviesList, ...heroMoviesList];

    tripleList.forEach((movie, i) => {
        const slide = document.createElement('div');
        slide.classList.add('slide-item');
        slide.dataset.globalIndex = i;
        slide.innerHTML = `<img src="${POSTER_URL + movie.poster_path}" alt="${movie.title}">`;

        slide.onclick = () => {
            // Kliklənən elementə keçid
            activeGlobalIndex = i;
            const realIndex = i % heroMoviesList.length;

            updateHeroUI(realIndex);
            highlightSlide(i);
            scrollToIndex(i, 'smooth');

            // Timeri sıfırla ki, dərhal başqa yerə tullanmasın
            startHeroTimer();
        };
        heroSlider.appendChild(slide);
    });
}

function startHeroTimer() {
    stopHeroTimer();
    heroTimer = setInterval(() => {
        activeGlobalIndex++;

        // Real indeksi tap (UI üçün)
        const realIndex = activeGlobalIndex % heroMoviesList.length;

        updateHeroUI(realIndex);
        highlightSlide(activeGlobalIndex);
        scrollToIndex(activeGlobalIndex, 'smooth');

        // MAGİC JUMP: Əgər 3-cü siyahının başına çatdıqsa, 
        // animasiya bitən kimi (500ms sonra) istifadəçini 2-ci siyahının başına atırıq.
        // Bu sonsuz dövrü yaradır.
        if (activeGlobalIndex >= heroMoviesList.length * 2) {
            setTimeout(() => {
                activeGlobalIndex = heroMoviesList.length; // Geri qaytar
                scrollToIndex(activeGlobalIndex, 'auto'); // Hiss etdirmədən ('auto')
                highlightSlide(activeGlobalIndex);
            }, 500);
        }
    }, 5000); // 5 saniyə
}

function stopHeroTimer() {
    clearInterval(heroTimer);
}

function handleManualScroll() {
    // Bu funksiya istifadəçi əli ilə sürüşdürəndə sonsuzluğu təmin edir
    const totalSetWidth = heroMoviesList.length * ITEM_WIDTH;

    // Çox sola gedibsə -> Ortaya at
    if (heroSlider.scrollLeft < 50) {
        heroSlider.scrollLeft += totalSetWidth;
    }
    // Çox sağa gedibsə -> Ortaya at
    else if (heroSlider.scrollLeft > (totalSetWidth * 2) - heroSlider.clientWidth) {
        heroSlider.scrollLeft -= totalSetWidth;
    }
}

function scrollToIndex(index, behavior) {
    const centerOffset = (window.innerWidth / 2) - (ITEM_WIDTH / 2);
    const scrollPos = (index * ITEM_WIDTH) - centerOffset + 30; // 30px padding
    heroSlider.scrollTo({ left: scrollPos, behavior: behavior });
}

function highlightSlide(globalIndex) {
    document.querySelectorAll('.slide-item').forEach(el => el.classList.remove('active-slide'));
    const activeSlide = document.querySelector(`.slide-item[data-global-index="${globalIndex}"]`);
    if (activeSlide) activeSlide.classList.add('active-slide');
}

function updateHeroUI(realIndex) {
    const movie = heroMoviesList[realIndex];
    if (!movie) return;

    // Background Fade
    heroBg.style.opacity = 0.2;
    setTimeout(() => {
        heroBg.style.backgroundImage = `url('${IMG_URL + movie.backdrop_path}')`;
        heroBg.style.opacity = 1;
    }, 200);

    // Text Updates
    heroTitle.innerText = movie.title;
    heroDesc.innerText = movie.overview;
    heroRating.innerText = movie.vote_average.toFixed(1);
    heroYear.innerText = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    heroGenres.innerHTML = movie.genre_ids ? movie.genre_ids.slice(0, 3).map(id =>
        `<span class="badge">${genresMap[id] || 'Film'}</span>`
    ).join('') : '';

    // Buttons
    document.getElementById('play-btn').onclick = () => openModal(movie.id);
    const wishBtn = document.getElementById('hero-wishlist-btn');
    wishBtn.onclick = () => toggleWishlist(movie);
    updateHeroWishlistBtn(movie.id);
}


// ==========================================
// 3. MAIN GRID (SORT, FILTER, LOAD MORE)
// ==========================================

// Sort Event
sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    resetGrid();
    fetchMainGrid();
});

// Filter Event
document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelector('.filter-btn.active').classList.remove('active');
    btn.classList.add('active');
    currentGenre = btn.dataset.id;
    resetGrid();
    fetchMainGrid();
}));

function resetGrid() {
    currentPage = 1;
    pagesLoaded = 0;
    grid.innerHTML = '';
    loadMoreBtn.classList.add('hide');
    // Scroll listener-i geri qaytarırıq
    window.addEventListener('scroll', infiniteScrollListener);
}

async function fetchMainGrid() {
    if (isFetching) return;
    isFetching = true;
    loader.classList.remove('hide');

    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&page=${currentPage}&sort_by=${currentSort}`;
    if (currentGenre !== 'all') {
        url += `&with_genres=${currentGenre}`;
    }

    try {
        const res = await fetch(url);
        const data = await res.json();
        showMovies(data.results);

        currentPage++;
        pagesLoaded++;

        // 3 səhifə yüklənibsə, avto-scrollu dayandır və düyməni göstər
        if (pagesLoaded % PAGES_TO_LOAD_BEFORE_CLICK === 0) {
            window.removeEventListener('scroll', infiniteScrollListener);
            loadMoreBtn.classList.remove('hide');
        }

    } catch (error) { console.error(error); }
    finally { isFetching = false; loader.classList.add('hide'); }
}

function showMovies(movies, append = true) {
    if (!append) grid.innerHTML = '';
    movies.forEach(movie => {
        if (!movie.poster_path) return;

        const card = document.createElement('div');
        card.classList.add('movie-card');
        const activeClass = isInWishlist(movie.id) ? 'active' : '';
        const movieData = JSON.stringify(movie).replace(/'/g, "&#39;");

        card.innerHTML = `
            <div class="poster">
                <img src="${POSTER_URL + movie.poster_path}" alt="${movie.title}">
                <div class="rating-badge"><i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)}</div>
                <div class="wishlist-icon ${activeClass}" id="wish-${movie.id}" onclick='toggleWishlist(${movieData}, event)'>
                    <i class="fas fa-heart"></i>
                </div>
            </div>
            <div class="movie-info"><h3>${movie.title}</h3></div>
        `;
        card.onclick = (e) => { if (!e.target.closest('.wishlist-icon')) openModal(movie.id); };
        grid.appendChild(card);
    });
}

// "Load More" düyməsinin funksiyası
loadMoreBtn.addEventListener('click', () => {
    loadMoreBtn.classList.add('hide');
    window.addEventListener('scroll', infiniteScrollListener); // Scrollu yenidən aktiv et
    fetchMainGrid();
});

// Infinity Scroll Listener
const infiniteScrollListener = () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
        fetchMainGrid();
    }
};
// Başlanğıcda scrollu aktiv et
window.addEventListener('scroll', infiniteScrollListener);

// Navbar rəngi
window.addEventListener('scroll', () => {
    document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 50);
});


// ==========================================
// 4. RANDOM PICKER & HISTORY
// ==========================================
const spinBtn = document.getElementById('spin-btn');
const pickerImg = document.getElementById('picker-image');
const pickerTitle = document.getElementById('picker-title');
const pickerWatchBtn = document.getElementById('picker-watch-btn');
const historyList = document.getElementById('picker-history-list');

spinBtn.addEventListener('click', async () => {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const res = await fetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&page=${randomPage}`);
    const data = await res.json();
    const movies = data.results;

    spinBtn.disabled = true;
    spinBtn.innerHTML = 'Spinning...';
    pickerWatchBtn.classList.add('hide');

    let counter = 0;
    const interval = setInterval(() => {
        const random = movies[Math.floor(Math.random() * movies.length)];
        pickerImg.src = POSTER_URL + random.poster_path;
        counter++;
        if (counter > 15) {
            clearInterval(interval);
            finalizePick(random);
        }
    }, 100);
});

function finalizePick(movie) {
    pickerImg.src = POSTER_URL + movie.poster_path;
    pickerTitle.innerText = movie.title;
    pickerTitle.style.color = "#bc13fe";

    spinBtn.disabled = false;
    spinBtn.innerHTML = 'Spin Again';

    pickerWatchBtn.classList.remove('hide');
    pickerWatchBtn.onclick = () => openModal(movie.id);

    addToHistory(movie);
}

function addToHistory(movie) {
    if (!pickerHistory.some(m => m.id === movie.id)) {
        pickerHistory.unshift(movie);
        if (pickerHistory.length > 5) pickerHistory.pop(); // Max 5 element
    }
    renderHistory();
}

function renderHistory() {
    if (pickerHistory.length === 0) return;
    historyList.innerHTML = '';
    pickerHistory.forEach(movie => {
        const item = document.createElement('div');
        item.classList.add('history-item');
        item.innerHTML = `<img src="${POSTER_URL + movie.poster_path}"> <span>${movie.title}</span>`;
        item.onclick = () => openModal(movie.id);
        historyList.appendChild(item);
    });
}


// ==========================================
// 5. WISHLIST & MODAL UTILITIES
// ==========================================

function toggleWishlist(movie, event) {
    if (event) event.stopPropagation();

    const index = wishlist.findIndex(m => m.id === movie.id);
    if (index === -1) wishlist.push(movie);
    else wishlist.splice(index, 1);

    localStorage.setItem('filmoria_wishlist', JSON.stringify(wishlist));
    updateWishlistCount();

    const btn = document.getElementById(`wish-${movie.id}`);
    if (btn) btn.classList.toggle('active');

    // Əgər Hero hissəsindəki filmdirsə, ordakı düyməni də yenilə
    const currentHeroTitle = document.getElementById('hero-title').innerText;
    if (currentHeroTitle === movie.title) updateHeroWishlistBtn(movie.id);
}

function updateWishlistCount() { wishlistCount.innerText = wishlist.length; }
function isInWishlist(id) { return wishlist.some(m => m.id === id); }

function updateHeroWishlistBtn(id) {
    const wishBtn = document.getElementById('hero-wishlist-btn');
    if (!wishBtn) return;
    if (isInWishlist(id)) {
        wishBtn.innerHTML = '<i class="fas fa-check"></i> Added';
        wishBtn.style.color = 'var(--primary-blue)';
    } else {
        wishBtn.innerHTML = '<i class="far fa-heart"></i> Add to List';
        wishBtn.style.color = 'white';
    }
}

window.showWishlist = function () {
    document.getElementById('grid-title').innerText = "My Wishlist";
    grid.innerHTML = '';
    loadMoreBtn.classList.add('hide');
    window.removeEventListener('scroll', infiniteScrollListener);

    if (wishlist.length === 0) grid.innerHTML = '<h3 style="padding:20px; color:#aaa;">Your list is empty.</h3>';
    else showMovies(wishlist, false);

    document.getElementById('grid-start').scrollIntoView({ behavior: 'smooth' });
}

window.scrollToGrid = function () {
    document.getElementById('grid-start').scrollIntoView({ behavior: 'smooth' });
}

// Search
document.getElementById('search').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && e.target.value) {
        const query = e.target.value;
        const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}`);
        const data = await res.json();
        document.getElementById('grid-title').innerText = `Search: "${query}"`;
        grid.innerHTML = '';
        showMovies(data.results, false);
        loadMoreBtn.classList.add('hide');
        window.removeEventListener('scroll', infiniteScrollListener);
        document.getElementById('grid-start').scrollIntoView({ behavior: 'smooth' });
    }
});

// Modal
async function openModal(id) {
    const res = await fetch(`${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}`);
    const data = await res.json();
    const trailer = data.results.find(v => v.type === 'Trailer') || data.results[0];
    const frame = document.getElementById('video-frame');

    if (trailer) {
        frame.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
        frame.style.display = 'block';
        document.getElementById('no-video').style.display = 'none';
    } else {
        frame.style.display = 'none';
        document.getElementById('no-video').style.display = 'block';
    }
    document.getElementById('video-modal').classList.add('show');
}

document.querySelector('.close-btn').onclick = () => {
    document.getElementById('video-modal').classList.remove('show');
    document.getElementById('video-frame').src = '';
};
window.onclick = (e) => {
    if (e.target == document.getElementById('video-modal')) {
        document.getElementById('video-modal').classList.remove('show');
        document.getElementById('video-frame').src = '';
    }
};