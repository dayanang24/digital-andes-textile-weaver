// ── Canvas idle redirect ─────────────────────────────────────────────────────
// If the user is on the canvas tab for 2 minutes without saving, send them home.

const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const IDLE_WARN_MS    = 20 * 1000;      // warn 20 s before redirect
let   idleTimer       = null;
let   warnTimer       = null;
let   idleSaved       = false;           // set true when they save

// Inject the countdown overlay (hidden by default)
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.id = 'idle-overlay';
    overlay.innerHTML = `
        <div id="idle-box">
            <div id="idle-symbol">◈</div>
            <div id="idle-msg">Still weaving?</div>
            <div id="idle-sub">Returning to home in <span id="idle-count">20</span>s</div>
            <button id="idle-stay">KEEP WEAVING</button>
        </div>`;
    document.body.appendChild(overlay);

    document.getElementById('idle-stay').addEventListener('click', () => {
        hideIdleOverlay();
        resetIdleTimer();
    });

    // Inject styles
    const s = document.createElement('style');
    s.textContent = `
        #idle-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(5,6,10,0.82);
            backdrop-filter: blur(6px);
            z-index: 99999;
            align-items: center;
            justify-content: center;
        }
        #idle-overlay.visible { display: flex; }
        #idle-box {
            background: #0d0f18;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 2.4rem 2.8rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            box-shadow: 0 0 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(231,204,68,0.12);
            animation: idlePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes idlePop {
            from { transform: scale(0.85); opacity: 0; }
            to   { transform: scale(1);    opacity: 1; }
        }
        #idle-symbol {
            font-size: 2.4rem;
            color: #e7cc44;
            animation: idleSpin 3s linear infinite;
        }
        @keyframes idleSpin {
            from { transform: rotate(0deg);   }
            to   { transform: rotate(360deg); }
        }
        #idle-msg {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.6rem;
            letter-spacing: 0.12em;
            color: #fff;
        }
        #idle-sub {
            font-family: 'Space Mono', monospace;
            font-size: 0.65rem;
            letter-spacing: 0.14em;
            color: rgba(255,255,255,0.45);
        }
        #idle-count {
            color: #e7cc44;
            font-weight: bold;
        }
        #idle-stay {
            margin-top: 0.4rem;
            padding: 0.55rem 1.6rem;
            background: rgba(231,204,68,0.12);
            border: 1px solid rgba(231,204,68,0.45);
            border-radius: 6px;
            color: #e7cc44;
            font-family: 'Space Mono', monospace;
            font-size: 0.62rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            transition: all 0.2s;
        }
        #idle-stay:hover {
            background: rgba(231,204,68,0.22);
            border-color: #e7cc44;
            box-shadow: 0 0 12px rgba(231,204,68,0.3);
        }
        #archive-idle-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(5,6,10,0.82);
            backdrop-filter: blur(6px);
            z-index: 99999;
            align-items: center;
            justify-content: center;
        }
        #archive-idle-overlay.visible { display: flex; }
        #archive-idle-overlay .idle-box {
            background: #0d0f18;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 2.4rem 2.8rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            box-shadow: 0 0 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(91,198,226,0.12);
            animation: idlePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        #archive-idle-overlay .idle-symbol {
            font-size: 2.4rem;
            color: #5bc6e2;
            animation: idleSpin 3s linear infinite;
        }
        #archive-idle-overlay .idle-msg {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.6rem;
            letter-spacing: 0.12em;
            color: #fff;
        }
        #archive-idle-overlay .idle-sub {
            font-family: 'Space Mono', monospace;
            font-size: 0.65rem;
            letter-spacing: 0.14em;
            color: rgba(255,255,255,0.45);
        }
        #archive-idle-count { color: #5bc6e2; font-weight: bold; }
        .idle-stay-btn {
            margin-top: 0.4rem;
            padding: 0.55rem 1.6rem;
            background: rgba(91,198,226,0.12);
            border: 1px solid rgba(91,198,226,0.45);
            border-radius: 6px;
            color: #5bc6e2;
            font-family: 'Space Mono', monospace;
            font-size: 0.62rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            transition: all 0.2s;
        }
        .idle-stay-btn:hover {
            background: rgba(91,198,226,0.22);
            border-color: #5bc6e2;
            box-shadow: 0 0 12px rgba(91,198,226,0.3);
        }
    `;
    document.head.appendChild(s);
});

function showIdleOverlay() {
    const overlay = document.getElementById('idle-overlay');
    if (!overlay) return;
    overlay.classList.add('visible');

    // Countdown tick
    let remaining = 20;
    const countEl = document.getElementById('idle-count');
    if (countEl) countEl.textContent = remaining;

    const tick = setInterval(() => {
        remaining--;
        if (countEl) countEl.textContent = remaining;
        if (remaining <= 0) {
            clearInterval(tick);
            hideIdleOverlay();
            switchTab('home');
        }
    }, 1000);

    // Store so we can clear it if they stay
    overlay._tick = tick;
}

function hideIdleOverlay() {
    const overlay = document.getElementById('idle-overlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
    if (overlay._tick) { clearInterval(overlay._tick); overlay._tick = null; }
}

function resetIdleTimer() {
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);

    const canvasTab = document.getElementById('canvas');
    const isOnCanvas = canvasTab && canvasTab.classList.contains('active');
    if (!isOnCanvas || idleSaved) return;

    warnTimer = setTimeout(showIdleOverlay,                   IDLE_TIMEOUT_MS - IDLE_WARN_MS);
    idleTimer = setTimeout(() => {
        hideIdleOverlay();
        switchTab('home');
    }, IDLE_TIMEOUT_MS);
}

function stopIdleTimer() {
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);
    hideIdleOverlay();
}

// ── Archive idle redirect ────────────────────────────────────────────────────
const ARCHIVE_IDLE_MS      = 1 * 60 * 1000;
const ARCHIVE_IDLE_WARN_MS = 15 * 1000;
let   archiveIdleTimer     = null;
let   archiveWarnTimer     = null;

function showArchiveIdleOverlay() {
    const overlay = document.getElementById('archive-idle-overlay');
    if (!overlay) return;
    overlay.classList.add('visible');

    let remaining = 15;
    const countEl = document.getElementById('archive-idle-count');
    if (countEl) countEl.textContent = remaining;

    const tick = setInterval(() => {
        remaining--;
        if (countEl) countEl.textContent = remaining;
        if (remaining <= 0) {
            clearInterval(tick);
            hideArchiveIdleOverlay();
            switchTab('home');
        }
    }, 1000);
    overlay._tick = tick;
}

function hideArchiveIdleOverlay() {
    const overlay = document.getElementById('archive-idle-overlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
    if (overlay._tick) { clearInterval(overlay._tick); overlay._tick = null; }
}

function resetArchiveIdleTimer() {
    clearTimeout(archiveIdleTimer);
    clearTimeout(archiveWarnTimer);
    const archiveTab = document.getElementById('archive');
    if (!archiveTab || !archiveTab.classList.contains('active')) return;
    archiveWarnTimer = setTimeout(showArchiveIdleOverlay,  ARCHIVE_IDLE_MS - ARCHIVE_IDLE_WARN_MS);
    archiveIdleTimer = setTimeout(() => { hideArchiveIdleOverlay(); switchTab('home'); }, ARCHIVE_IDLE_MS);
}

function stopArchiveIdleTimer() {
    clearTimeout(archiveIdleTimer);
    clearTimeout(archiveWarnTimer);
    hideArchiveIdleOverlay();
}

// Build archive idle overlay once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.id = 'archive-idle-overlay';
    overlay.innerHTML = `
        <div class="idle-box">
            <div class="idle-symbol">▣</div>
            <div class="idle-msg">Still browsing?</div>
            <div class="idle-sub">Returning to home in <span id="archive-idle-count">15</span>s</div>
            <button class="idle-stay-btn" id="archive-idle-stay">KEEP BROWSING</button>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('archive-idle-stay').addEventListener('click', () => {
        hideArchiveIdleOverlay();
        resetArchiveIdleTimer();
    });
});

// Activity events that reset the idle clock (canvas and archive)
['mousemove','mousedown','keydown','touchstart','wheel'].forEach(evt => {
    document.addEventListener(evt, () => {
        const canvasTab  = document.getElementById('canvas');
        const archiveTab = document.getElementById('archive');
        if (canvasTab  && canvasTab.classList.contains('active'))  resetIdleTimer();
        if (archiveTab && archiveTab.classList.contains('active')) resetArchiveIdleTimer();
    }, { passive: true });
});

// Hook into save — once saved, disable the idle redirect for this session
const _origOnWeavingSaved = window.onWeavingSaved;
window.onWeavingSaved = function(id) {
    idleSaved = true;
    stopIdleTimer();
    if (typeof _origOnWeavingSaved === 'function') _origOnWeavingSaved(id);
};

// ── Tab switching functionality ──────────────────────────────────────────────
function switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to clicked tab and corresponding content
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(tabName);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
    
    // Initialize p5 sketch when canvas tab is activated
    if (tabName === 'canvas') {
        idleSaved = false;
        stopArchiveIdleTimer();
        setTimeout(() => {
            initializeP5Canvas();
            resetIdleTimer();
        }, 100);
    } else if (tabName === 'archive') {
        stopIdleTimer();
        resetArchiveIdleTimer();
    } else {
        stopIdleTimer();
        stopArchiveIdleTimer();
    }
}

// Event listeners for navigation tabs
document.addEventListener('DOMContentLoaded', () => {
    const navTabs = document.querySelectorAll('.nav-tab');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Add parallax effect to color blocks
    const colorBlocks = document.querySelectorAll('.color-block');
    colorBlocks.forEach((block, index) => {
        block.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Add hover effect to instruction cards
    const cards = document.querySelectorAll('.instruction-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.animation = 'fadeIn 0.6s ease forwards';
        card.style.opacity = '0';
    });
    
    // Smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Initialize p5.js canvas
function initializeP5Canvas() {
    const container = document.getElementById('canvas-container');
    if (!container) {
        console.error('Canvas container not found');
        return;
    }
    
    // Check if sketch is defined
    if (typeof sketch === 'undefined') {
        console.error('Sketch is not defined. Make sure weaving.js is loaded before script.js');
        return;
    }
    
    // Remove existing instance if it exists
    if (window.p5Instance) {
        console.log('Removing existing canvas instance');
        window.p5Instance.remove();
        window.p5Instance = null;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Create new p5 instance
    console.log('Creating new p5 instance');
    window.p5Instance = new p5(sketch, 'canvas-container');
    console.log('Canvas initialized successfully');
}

// Random glitch effect on title
function triggerGlitch() {
    const glitchElements = document.querySelectorAll('.glitch');
    glitchElements.forEach(el => {
        el.style.animation = 'none';
        setTimeout(() => {
            el.style.animation = '';
        }, 10);
    });
}

// Trigger random glitch every few seconds
setInterval(() => {
    if (Math.random() > 0.7) {
        triggerGlitch();
    }
}, 3000);

// Add cursor trail effect
const canvas = document.createElement('canvas');
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.pointerEvents = 'none';
canvas.style.zIndex = '9999';
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];

document.addEventListener('mousemove', (e) => {
    particles.push({
        x: e.clientX,
        y: e.clientY,
        size: Math.random() * 3 + 1,
        life: 1,
        color: ['#de544a', '#e7cc44', '#c1dc6e', '#5bc6e2', '#8d69c6', '#e97883'][Math.floor(Math.random() * 6)]
    });
});

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        p.life -= 0.02;
        p.size *= 0.98;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
    
    requestAnimationFrame(animateParticles);
}

animateParticles();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Reinitialize p5 canvas if it exists and canvas tab is active
    const canvasTab = document.getElementById('canvas');
    if (window.p5Instance && canvasTab && canvasTab.classList.contains('active')) {
        setTimeout(() => {
            initializeP5Canvas();
        }, 100);
    }
});