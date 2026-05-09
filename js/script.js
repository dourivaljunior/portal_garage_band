// script.js - Funções compartilhadas entre todas as páginas

let currentView = "list";
let currentSong = null;
let currentLyricsText = "";
let musicDatabase = [];

const resultsDiv = document.getElementById("resultsContent");
const searchInputElem = document.getElementById("searchInput");

function sortSongs(songs) {
    return [...songs].sort((a, b) => a.nome.localeCompare(b.nome));
}

function filterSongs(songs, query) {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return songs.filter(s => 
        s.nome.toLowerCase().includes(lowerQuery) || 
        s.artista.toLowerCase().includes(lowerQuery)
    );
}

async function loadLyricsFromFile(txtFile) {
    try {
        const response = await fetch(txtFile);
        if (!response.ok) throw new Error(`Arquivo ${txtFile} não encontrado`);
        return await response.text();
    } catch (error) {
        return `❌ Erro ao carregar letra: ${error.message}\n\nVerifique se o arquivo "${txtFile}" está na mesma pasta.`;
    }
}

async function showSongDetail(song) {
    currentSong = song;
    currentLyricsText = await loadLyricsFromFile(song.txt);
    currentView = "detail";
    renderListView();
}

function renderDetailView() {
    if (!currentSong) return;
    
    const html = `
        <div class="detail-view">
            <button class="back-btn" id="backToMainBtn">← Voltar para busca</button>
            <div class="detail-container">
                <div class="lyrics-section">
                    <h3>📖 ${escapeHtml(currentSong.nome)} - ${escapeHtml(currentSong.artista)}</h3>
                    <div class="lyrics-content">${escapeHtml(currentLyricsText).replace(/\n/g, '<br>')}</div>
                </div>
                <div class="players-section" style="flex:1; display:flex; flex-direction:column; gap:24px;">
                    <div class="player-card" style="background:rgba(255,255,255,0.08); border-radius:24px; padding:24px; text-align:center;">
                        <h4>🎧 Música Original</h4>
                        <audio controls preload="metadata" src="${currentSong.mp3}" style="width:100%"></audio>
                    </div>
                    <div class="player-card" style="background:rgba(255,255,255,0.08); border-radius:24px; padding:24px; text-align:center;">
                        <h4>🎹 Backing Track</h4>
                        <audio controls preload="metadata" src="${currentSong.backingTrack}" style="width:100%"></audio>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (resultsDiv) resultsDiv.innerHTML = html;
    
    document.getElementById("backToMainBtn")?.addEventListener("click", () => {
        currentView = "list";
        currentSong = null;
        renderListView();
    });
}

function renderListView() {
    if (!searchInputElem) return;
    
    const term = searchInputElem.value;
    
    if (!term.trim()) {
        if (resultsDiv) resultsDiv.innerHTML = '';
        return;
    }
    
    let filtered = filterSongs(musicDatabase, term);
    filtered = sortSongs(filtered);

    if (filtered.length === 0) {
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div style="text-align:center; padding:40px; background:rgba(255,255,255,0.05); border-radius:32px;">
                    <p>😕 Nenhuma música encontrada para "${escapeHtml(term)}"</p>
                </div>
            `;
        }
        return;
    }

    const resultsText = filtered.length === 1 ? '1 música encontrada' : `${filtered.length} músicas encontradas`;
    
    let html = `
        <div class="results-container">
            <div class="results-info" style="text-align:center; margin-bottom:20px; color:rgba(255,255,255,0.7);">✨ ${resultsText}</div>
            <div class="music-list">
    `;

    filtered.forEach(song => {
        html += `
            <div class="music-card">
                <div class="music-info">
                    <div class="music-info-left">
                        <div class="music-title" data-song='${JSON.stringify(song)}'>
                            <div class="music-name">${escapeHtml(song.nome)}</div>
                            <div class="music-artist">${escapeHtml(song.artista)}</div>
                        </div>
                        <div class="link-lyrics">📄 Letra</div>
                    </div>
                    <div class="music-controls">
                        <div class="player-label">
                            <span>🎧 Original</span>
                            <audio controls preload="metadata">
                                <source src="${song.mp3}" type="audio/mpeg">
                            </audio>
                        </div>
                        <div class="player-label">
                            <span>🎹 Backing</span>
                            <audio controls preload="metadata">
                                <source src="${song.backingTrack}" type="audio/mpeg">
                            </audio>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    if (resultsDiv) resultsDiv.innerHTML = html;

    document.querySelectorAll('.music-title').forEach(title => {
        title.addEventListener('click', (e) => {
            e.stopPropagation();
            const songData = JSON.parse(title.getAttribute('data-song'));
            showSongDetail(songData);
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function loadMusicDatabase() {
    if (typeof musicData !== 'undefined') {
        musicDatabase = musicData;
        musicDatabase.forEach((song, idx) => {
            if (!song.id) song.id = idx + 1;
        });
        if (currentView === "list") renderListView();
    } else if (resultsDiv) {
        resultsDiv.innerHTML = `<div style="text-align:center; padding:40px;"><p>⚠️ Erro ao carregar playlist.</p></div>`;
    }
}

if (searchInputElem) {
    searchInputElem.addEventListener("input", () => {
        if (currentView === "list") renderListView();
    });
}

if (typeof musicData !== 'undefined') loadMusicDatabase();
