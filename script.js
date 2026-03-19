/**
 * CHAMP Achievement Tracker
 * Logic for localStorage and Overview-first navigation
 */

// State
let achievements = JSON.parse(localStorage.getItem('achievements')) || [];
let deletedAchievements = JSON.parse(localStorage.getItem('deletedAchievements')) || [];

// Constants
const POINTS = {
    Local: { '1st': 20, '2nd': 15, '3rd': 10, 'Participation': 5 },
    District: { '1st': 25, '2nd': 20, '3rd': 15, 'Participation': 10 },
    State: { '1st': 30, '2nd': 25, '3rd': 20, 'Participation': 15 },
    National: { '1st': 35, '2nd': 30, '3rd': 25, 'Participation': 20 }
};

const LEVELS = {
    offline: ['School', 'District', 'State', 'National'],
    online: ['Basic', 'District', 'State', 'National']
};

// Elements
const dom = {
    navLinks: document.querySelectorAll('.nav-link'),
    sections: document.querySelectorAll('.tab-section'),
    form: document.getElementById('achievement-form'),
    overlay: document.getElementById('modal-overlay'),
    totalPoints: document.getElementById('total-points'),
    binCount: document.getElementById('bin-count'),
    containers: {
        home: document.getElementById('achievements-container'),
        bin: document.getElementById('bin-container'),
        levelStats: document.getElementById('level-stats'),
        positionStats: document.getElementById('position-stats')
    }
};

// Init
function init() {
    updateLevelOptions();
    bindEvents();
    renderAll();
    switchTab('overview');
}

function bindEvents() {
    dom.navLinks.forEach(link => {
        link.addEventListener('click', () => switchTab(link.dataset.tab));
    });

    document.getElementById('btn-add-main').addEventListener('click', () => {
        dom.form.reset();
        dom.overlay.classList.remove('hidden');
        updateLevelOptions();
        updatePointsPreview();
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
        dom.overlay.classList.add('hidden');
    });

    document.getElementById('type').addEventListener('change', () => {
        updateLevelOptions();
        updatePointsPreview();
    });
    document.getElementById('level').addEventListener('change', updatePointsPreview);
    document.getElementById('position').addEventListener('change', updatePointsPreview);

    dom.form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveAchievement();
    });
}

function switchTab(tabId) {
    dom.navLinks.forEach(link => link.classList.toggle('active', link.dataset.tab === tabId));
    dom.sections.forEach(sec => sec.classList.toggle('hidden', sec.id !== `${tabId}-section`));
    
    if (tabId === 'overview') renderOverview();
    renderAll();
}

function updateLevelOptions() {
    const type = document.getElementById('type').value;
    const levelSelect = document.getElementById('level');
    levelSelect.innerHTML = LEVELS[type].map(l => `<option value="${l}">${l}</option>`).join('');
}

function updatePointsPreview() {
    const level = document.getElementById('level').value;
    const position = document.getElementById('position').value;
    document.getElementById('estimated-points').textContent = calculatePoints(level, position);
}

function calculatePoints(level, position) {
    const cat = (level === 'School' || level === 'Basic') ? 'Local' : level;
    return POINTS[cat][position] || 0;
}

function saveAchievement() {
    const a = {
        id: Date.now(),
        name: document.getElementById('name').value,
        category: document.getElementById('category').value,
        type: document.getElementById('type').value,
        level: document.getElementById('level').value,
        position: document.getElementById('position').value,
        date: document.getElementById('date').value,
        points: calculatePoints(document.getElementById('level').value, document.getElementById('position').value)
    };
    achievements.push(a);
    sync();
    dom.overlay.classList.add('hidden');
    showToast('Achievement added!');
    renderAll();
}

function moveToBin(id) {
    const i = achievements.findIndex(x => x.id === id);
    if (i > -1) {
        deletedAchievements.push(achievements.splice(i, 1)[0]);
        sync();
        renderAll();
        showToast('Moved to bin');
    }
}

function restore(id) {
    const i = deletedAchievements.findIndex(x => x.id === id);
    if (i > -1) {
        achievements.push(deletedAchievements.splice(i, 1)[0]);
        sync();
        renderAll();
        showToast('Restored!');
    }
}

function delFinal(id) {
    if (confirm('Permanently delete?')) {
        deletedAchievements = deletedAchievements.filter(x => x.id !== id);
        sync();
        renderAll();
    }
}

function sync() {
    localStorage.setItem('achievements', JSON.stringify(achievements));
    localStorage.setItem('deletedAchievements', JSON.stringify(deletedAchievements));
}

function renderAll() {
    const total = achievements.reduce((s, a) => s + a.points, 0);
    dom.totalPoints.textContent = total;

    renderCards(achievements, dom.containers.home, false);
    renderCards(deletedAchievements, dom.containers.bin, true);
}

function renderCards(data, container, isBin) {
    if (data.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; opacity: 0.3; color: var(--primary-color);">
            <i class="fas fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <p>No achievements found</p>
        </div>`;
        return;
    }

    container.innerHTML = data.map(a => `
        <div class="achievement-card pos-${a.position.toLowerCase()}">
            <span class="card-tag">${a.category}</span>
            <span class="card-points">+${a.points}</span>
            <div class="card-body">
                <h3>${a.name}</h3>
                <div class="card-meta">
                    <div><i class="fas fa-layer-group"></i> ${a.level}</div>
                    <div><i class="fas fa-trophy"></i> ${a.position}</div>
                    <div><i class="fas fa-calendar-alt"></i> ${a.date}</div>
                </div>
            </div>
            <div class="card-actions">
                ${isBin ? `
                    <button class="icon-btn" onclick="restore(${a.id})" title="Restore"><i class="fas fa-undo"></i></button>
                    <button class="icon-btn" onclick="delFinal(${a.id})" title="Delete"><i class="fas fa-times"></i></button>
                ` : `
                    <button class="icon-btn" onclick="moveToBin(${a.id})" title="Delete"><i class="fas fa-trash-alt"></i></button>
                `}
            </div>
        </div>
    `).join('');
}

function renderOverview() {
    const count = achievements.length;
    
    document.getElementById('stat-total-count').textContent = count;

    const levels = ['School', 'Basic', 'District', 'State', 'National'];
    dom.containers.levelStats.innerHTML = levels.map(l => {
        const c = achievements.filter(a => a.level === l).length;
        return `
            <div class="progress-row" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                <div class="progress-info" style="margin-bottom: 0;"><span>${l}</span><span style="color: var(--primary-color); font-size: 1.1rem;">${c}</span></div>
            </div>
        `;
    }).join('');

    const positions = ['1st', '2nd', '3rd', 'Participation'];
    dom.containers.positionStats.innerHTML = positions.map(pos => {
        const c = achievements.filter(a => a.position === pos).length;
        return `
            <div class="progress-row" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                <div class="progress-info" style="margin-bottom: 0;"><span>${pos}</span><span style="color: var(--primary-color); font-size: 1.1rem;">${c}</span></div>
            </div>
        `;
    }).join('');
}

function showToast(m) {
    const t = document.createElement('div');
    t.style.cssText = 'background: #3E2C23; color: #F5E9D8; padding: 0.8rem 1.2rem; border-radius: 0.8rem; box-shadow: var(--shadow-md); font-weight: 700; font-size: 0.9rem;';
    t.textContent = m;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

window.moveToBin = moveToBin;
window.restore = restore;
window.delFinal = delFinal;

init();
