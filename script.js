const API_KEY = '196fa505944ecee128d2576be7776978';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';

// State Management
let currentPage = 1;
let isFetching = false;
let currentGenre = 'all';
let wishlist = JSON.parse(localStorage.getItem('filmoria_wishlist')) || [];
let heroMovies = [];
let heroIndex = 0;
let heroInterval;

const genresMap = { 28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 878: "Sci-Fi", 53: "Thriller" };

// DOM Elements
const heroSection = document.getElementById('hero');
const slider = document.getElementById('upcoming-slider');
const grid = document.getElementById('main-grid');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('search');
const videoModal = document.getElementById('video-modal');
const videoFrame = document.getElementById('video-frame');
const wishlistCount = document.getElementById('wishlist-count');
const heroProgressBar = document.getElementById('hero-progress');

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    updateWishlistCount();
    fetchHeroMovies();     // Hero Slideshow
    fetchUpcomingMovies();
    fetchMainGrid();
});

// --- WISHLIST LOGIC ---
function toggleWishlist(movie, event) {
    if (event) event.stopPropagation(); // Karta basanda modal açılmasın, ancaq ürəyə basanda işləsin

    const index = wishlist.findIndex(m => m.id === movie.id);
    if (index === -1) {
        wishlist.push(movie);
    } else {
        wishlist.splice(index, 1);
    }

    localStorage.setItem('filmoria_wishlist', JSON.stringify(wishlist));
    updateWishlistCount();

    // UI yeniləmə (əgər ekranda varsa)
    const btn = document.getElementById(`wish-${movie.id}`);
    if (btn) btn.classList.toggle('active');

    // Hero hissəsindəki düyməni də yoxla
    const heroBtn = document.getElementById('hero-wishlist-btn');
    if (heroMovies[heroIndex] && heroMovies[heroIndex].id === movie.id) {
        updateHeroWishlistBtn(movie.id);
    }

    // Əgər "My List" səhifəsindəyiksə, siyahını yenilə
    if (document.getElementById('grid-title').innerText === 'My Wishlist') {
        showWishlist();
    }
}

function updateWishlistCount() {
    wishlistCount.innerText = wishlist.length;
}

function isInWishlist(id) {
    return wishlist.some(m => m.id === id);
}

function showWishlist() {
    document.getElementById('grid-title').innerText = "My Wishlist";
    document.getElementById('genre-filters').style.display = 'none'; // Filtrləri gizlət
    grid.innerHTML = '';

    if (wishlist.length === 0) {
        grid.innerHTML = '<h3 style="color:#aaa; text-align:center; grid-column: 1/-1;">Siyahınız boşdur.</h3>';
        return;
    }
    showMovies(wishlist, false); // false = API-dən gəlmir, localdan gəlir
}

// --- HERO SLIDESHOW & PROGRESS ---
async function fetchHeroMovies() {
    try {
        const res = await fetch(`${BASE_URL}/trending/movie/day?api_key=${API_KEY}`);
        const data = await res.json();
        heroMovies = data.results.slice(0, 5); // İlk 5 filmi götür
        setHero(heroMovies[0]);
        startHeroTimer();
    } catch (e) { console.error(e); }
}

function setHero(movie) {
    const title = document.getElementById('hero-title');
    const desc = document.getElementById('hero-desc');
    const rating = document.getElementById('hero-rating');
    const genres = document.getElementById('hero-genres');
    const playBtn = document.getElementById('play-btn');
    const wishBtn = document.getElementById('hero-wishlist-btn');

    // Fade out effect (optional, sadəlik üçün birbaşa dəyişirəm)
    heroSection.style.backgroundImage = `url('${IMG_URL + movie.backdrop_path}')`;
    title.innerText = movie.title;
    desc.innerText = movie.overview;
    rating.innerText = movie.vote_average.toFixed(1);

    // Genres
    genres.innerHTML = movie.genre_ids ? movie.genre_ids.slice(0, 3).map(id =>
        `<span class="badge">${genresMap[id] || 'Film'}</span>`
    ).join('') : '';

    // Buttons
    playBtn.onclick = () => openModal(movie.id);

    // Hero Wishlist Button Logic
    wishBtn.onclick = () => toggleWishlist(movie);
    updateHeroWishlistBtn(movie.id);
}

function updateHeroWishlistBtn(id) {
    const wishBtn = document.getElementById('hero-wishlist-btn');
    if (isInWishlist(id)) {
        wishBtn.innerHTML = '<i class="fas fa-check"></i> Added';
        wishBtn.style.color = 'var(--primary-blue)';
    } else {
        wishBtn.innerHTML = '<i class="far fa-heart"></i> Add to List';
        wishBtn.style.color = 'white';
    }
}

function startHeroTimer() {
    // Reset animation
    heroProgressBar.style.transition = 'none';
    heroProgressBar.style.width = '0%';

    setTimeout(() => {
        heroProgressBar.style.transition = 'width 10s linear'; // 10 saniyəlik timer
        heroProgressBar.style.width = '100%';
    }, 100);

    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        heroIndex++;
        if (heroIndex >= heroMovies.length) heroIndex = 0;
        setHero(heroMovies[heroIndex]);

        // Reset Progress Bar Loop
        heroProgressBar.style.transition = 'none';
        heroProgressBar.style.width = '0%';
        setTimeout(() => {
            heroProgressBar.style.transition = 'width 10s linear';
            heroProgressBar.style.width = '100%';
        }, 100);

    }, 10000); // 10 saniyədən bir dəyiş
}

// --- MAIN GRID & MOVIES ---
async function fetchMainGrid() {
    if (isFetching) return;
    isFetching = true;
    loader.classList.remove('hide');

    let url = currentGenre === 'all'
        ? `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${currentPage}`
        : `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${currentGenre}&page=${currentPage}&sort_by=popularity.desc`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        showMovies(data.results);
        currentPage++;
    } catch (error) { console.error(error); }
    finally { isFetching = false; loader.classList.add('hide'); }
}

function showMovies(movies) {
    movies.forEach(movie => {
        if (!movie.poster_path) return;
        const card = document.createElement('div');
        card.classList.add('movie-card');

        // Data atributlarına filmi yazırıq ki, click edəndə istifadə edək
        const movieData = JSON.stringify(movie).replace(/'/g, "&#39;");

        const activeClass = isInWishlist(movie.id) ? 'active' : '';

        card.innerHTML = `
            <div class="poster">
                <img src="${POSTER_URL + movie.poster_path}" alt="${movie.title}">
                <div class="rating-badge"><i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)}</div>
                <div class="wishlist-icon ${activeClass}" id="wish-${movie.id}" onclick='toggleWishlist(${movieData}, event)'>
                    <i class="fas fa-heart"></i>
                </div>
            </div>
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <div class="meta">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</div>
            </div>
        `;
        card.onclick = (e) => {
            if (!e.target.closest('.wishlist-icon')) openModal(movie.id);
        };
        grid.appendChild(card);
    });
}

// --- UPCOMING SLIDER ---
async function fetchUpcomingMovies() {
    const res = await fetch(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}&page=1`);
    const data = await res.json();
    slider.innerHTML = '';
    data.results.forEach(movie => {
        if (!movie.poster_path) return;
        const div = document.createElement('div');
        div.classList.add('card-horizontal');
        div.innerHTML = `<img src="${POSTER_URL + movie.poster_path}">`;
        div.onclick = () => openModal(movie.id);
        slider.appendChild(div);
    });
}
function scrollSlider(dir) { slider.scrollBy({ left: dir * 300, behavior: 'smooth' }); }

// --- RANDOM PICKER LOGIC ---
const pickerImg = document.getElementById('picker-image');
const pickerTitle = document.getElementById('picker-title');
const spinBtn = document.getElementById('spin-btn');
const pickerWatchBtn = document.getElementById('picker-watch-btn');

spinBtn.addEventListener('click', async () => {
    // Top Rated filmləri gətir
    const res = await fetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&page=${Math.floor(Math.random() * 5) + 1}`);
    const data = await res.json();
    const movies = data.results;

    spinBtn.disabled = true;
    spinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Picking...';
    pickerWatchBtn.classList.add('hide');
    pickerImg.classList.add('blur-effect');

    let counter = 0;
    const interval = setInterval(() => {
        const random = movies[Math.floor(Math.random() * movies.length)];
        pickerImg.src = POSTER_URL + random.poster_path;
        counter++;
        if (counter > 20) {
            clearInterval(interval);
            finalizePick(random);
        }
    }, 100);
});

function finalizePick(movie) {
    pickerImg.src = POSTER_URL + movie.poster_path;
    pickerImg.classList.remove('blur-effect');
    pickerTitle.innerText = movie.title;
    pickerTitle.style.color = "#bc13fe";

    spinBtn.disabled = false;
    spinBtn.innerHTML = 'Spin Again';
    pickerWatchBtn.classList.remove('hide');
    pickerWatchBtn.onclick = () => openModal(movie.id);
}

// --- MODAL & SCROLL ---
async function openModal(id) {
    const res = await fetch(`${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}`);
    const data = await res.json();
    const trailer = data.results.find(v => v.type === 'Trailer') || data.results[0];
    if (trailer) {
        videoFrame.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
        videoFrame.style.display = 'block'; document.getElementById('no-video').style.display = 'none';
    } else {
        videoFrame.style.display = 'none'; document.getElementById('no-video').style.display = 'block';
    }
    videoModal.classList.add('show');
}
document.querySelector('.close-btn').onclick = () => { videoModal.classList.remove('show'); videoFrame.src = ''; };
window.onclick = (e) => { if (e.target == videoModal) { videoModal.classList.remove('show'); videoFrame.src = ''; } };

// --- EVENTS ---
window.addEventListener('scroll', () => {
    document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 50);
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) fetchMainGrid();
});

document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelector('.filter-btn.active').classList.remove('active');
    btn.classList.add('active');
    currentGenre = btn.dataset.id;
    currentPage = 1; grid.innerHTML = '';
    document.getElementById('grid-title').innerText = "Explore Popular";
    fetchMainGrid();
}));

function showSection(type) {
    location.reload(); // Sadəlik üçün yeniləyir
}