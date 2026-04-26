// Andean Textile Weaving — Contemporary Sidebar + Intricate Pattern
const sketch = function(p) {
    let gridSize = 14;
    let cols, rows;
    let textileGrid, colorGrid, animationOffsets, isStitchAnchor, userDrawn;

    const andeanSymbols = [
        // Original 14
        '╋','◆','∧','∨','▬','△','◉','▩','◇','▤','◈','▣','▦','◊',
        // Additional 14 Ecuadorian/Andean motifs
        '✦','⬟','◐','◑','☼','✧','▽','◭','⬢','⬡','◮','◯','⬣','⬤'
    ];
    let andeanColors;

    let globalTime = 0;
    let weavingMode = true;
    let drawConnections = true;
    let currentSymbol = 0;
    let mouseCol = -1, mouseRow = -1;
    let history = [], redoHistory = [];
    let currentWord = "";
    let wordDisplayPhase = 0;
    let gridOpacity = 40;
    let stitchThickness = 1.5;
    let showIntroText = true;
    let introTextTimer = 400;
    let patternPath = [];

    // Speed warning state
    let prevMouseX = 0, prevMouseY = 0;
    let fastFrameCount = 0;
    let warnOpacity = 0;
    const SPEED_THRESHOLD = 18;  // px/frame dragging to count as fast
    const FAST_FRAMES_NEEDED = 22;
    const WARN_FADE_IN  = 0.04;
    const WARN_FADE_OUT = 0.018;

    // Intro pattern clears instantly when intro overlay is dismissed
    let showIntroPattern = true;

    // Minimal collapsible sidebar width — set to 0 to remove left sidebar
    const TAB_W = 0;      // left tab width (disabled)
    const PANEL_W = 200;   // compact panel width
    let sidebarOpen = false;
    let sidebarWidth = 0;  // left sidebar removed
    const PAD = 12;
    const BTN_H = 32;
    let currentSection = -1;  // -1 = closed, 0 = symbols open
    let canvasEl;
    
    // Floating action buttons state
    let showStitchSlider = false;

    const colorNames = [
        "Golden Yellow","Brick Red","Purple","Deep Burgundy",
        "Lime Green","Coral Pink","Olive Green","Cyan Blue",
        "Brown","Coral Red","Amber","Deep Blue"
    ];

    // ── SETUP ────────────────────────────────────────────────────────────────
    p.setup = function() {
        const container = document.getElementById('canvas-container');
        if (!container) return;
        const cv = p.createCanvas(container.offsetWidth, container.offsetHeight);
        cv.parent('canvas-container');
        canvasEl = cv.elt;
        canvasEl.setAttribute('tabindex','0');
        canvasEl.style.outline = 'none';
        canvasEl.addEventListener('keydown', function(e) {
            if ([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
            handleKey(e.key);
        });

        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(gridSize * 1.2);

        cols = p.floor((p.width - TAB_W) / gridSize);
        rows = p.floor(p.height / gridSize);

        andeanColors = [
            p.color(231,204,68),   // #e7cc44 Golden Yellow
            p.color(204,58,40),    // #cc3a28 Brick Red
            p.color(141,105,198),  // #8d69c6 Purple
            p.color(88,30,56),     // #581e38 Deep Burgundy
            p.color(193,220,110),  // #c1dc6e Lime Green
            p.color(233,120,131),  // #e97883 Coral Pink
            p.color(128,152,67),   // #809843 Olive Green
            p.color(91,198,226),   // #5bc6e2 Cyan Blue
            p.color(125,55,40),    // #7d3728 Brown
            p.color(222,84,74),    // #de544a Coral Red
            p.color(211,156,66),   // #d39c42 Amber
            p.color(33,35,137)     // #212389 Deep Blue
        ];

        initGrid();
        generatePattern();
        p.noStroke();
    };

    function initGrid() {
        textileGrid=[]; colorGrid=[]; animationOffsets=[]; isStitchAnchor=[]; userDrawn=[];
        for (let x=0;x<cols;x++){
            textileGrid[x]=[]; colorGrid[x]=[]; animationOffsets[x]=[]; isStitchAnchor[x]=[]; userDrawn[x]=[];
            for (let y=0;y<rows;y++){
                textileGrid[x][y]=' '; colorGrid[x][y]=-1;
                animationOffsets[x][y]=p.random(p.TWO_PI); isStitchAnchor[x][y]=false;
                userDrawn[x][y]=false;
            }
        }
    }

    // ── INTRICATE FULL-CANVAS PATTERN ────────────────────────────────────────
    // Runs every pixel through ALL layers simultaneously — no bands.
    // Each layer uses a different mathematical structure; they combine by priority.
    function generatePattern() {
        const cx = p.floor(cols / 2), cy = p.floor(rows / 2);
        // Pre-seed Perlin noise so it's deterministic each run
        p.noiseSeed(42);

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const dx = x - cx, dy = y - cy;
                const r   = Math.sqrt(dx*dx + dy*dy);
                const ang = Math.atan2(dy, dx);          // -π..π

                // ── Perlin layers ──────────────────────────────────────────
                const n1 = p.noise(x*0.07,  y*0.07);           // broad
                const n2 = p.noise(x*0.18,  y*0.18,  0.5);     // medium
                const n3 = p.noise(x*0.35,  y*0.35,  1.2);     // fine
                const n4 = p.noise(x*0.06 + 50, y*0.06 + 50);  // offset broad

                // ── Structural values ──────────────────────────────────────
                const manhattan  = Math.abs(dx) + Math.abs(dy); // diamond dist
                const chebyshev  = Math.max(Math.abs(dx), Math.abs(dy)); // square dist
                const spiral     = (r * 0.38 + ang * 5 / p.TWO_PI * 3) % 8; // Archimedean
                const spoke16    = Math.round((ang / p.TWO_PI) * 16 + 8) % 16;
                const sierp      = (x & y) & 3;                 // bit-AND fractal
                const truchet    = ((p.floor(x/3) + p.floor(y/3)) % 2 === 0)
                                    ? (x%3 + y%3) : (x%3 - y%3 + 3); // Truchet-like
                const interf     = Math.sin(r*0.55 + n1*4) * Math.cos(ang*3 + n2*3); // interference
                const waveMoire  = Math.sin(x*0.45 + n1*2) * Math.sin(y*0.45 + n2*2);
                const chevron    = (x + Math.abs(y % 10 - 5)) % 7;
                const tartan     = (x % 6 < 3) !== (y % 6 < 3);  // XOR tartan

                // ── Layer assignment (ordered: denser/more intricate first) ─

                // L0 – Interference moiré rings (subtlest base layer, every pixel)
                if (Math.abs(interf) > 0.82) {
                    setCell(x, y, 6, 0);

                // L1 – Double Archimedean spiral arms
                } else if (spiral < 0.7) {
                    setCell(x, y, 1, 1);
                } else if (spiral > 3.5 && spiral < 4.2) {
                    setCell(x, y, 5, 4);

                // L2 – Concentric manhattan diamonds (Andean key-fret motif)
                } else if (manhattan % 5 === 0) {
                    setCell(x, y, 0, 0);
                } else if (manhattan % 5 === 2 && (x+y)%2===0) {
                    setCell(x, y, 13, 2);

                // L3 – Sunburst spokes (16-fold radial)
                } else if (spoke16 % 2 === 0 && r < cols*0.48 && r > 2) {
                    setCell(x, y, 4, 3);

                // L4 – Concentric squares every 4 units (Chebyshev)
                } else if (chebyshev % 4 === 0) {
                    setCell(x, y, 7, 5);
                } else if (chebyshev % 4 === 2 && sierp === 0) {
                    setCell(x, y, 9, 6);

                // L5 – Sierpinski fractal carpet fill
                } else if (sierp === 0 && n1 > 0.52) {
                    setCell(x, y, 2, 1);

                // L6 – Wave moiré interference (horizontal × vertical)
                } else if (waveMoire > 0.78) {
                    setCell(x, y, 10, 2);
                } else if (waveMoire < -0.78) {
                    setCell(x, y, 12, 4);

                // L7 – Truchet tile corners
                } else if (truchet % 4 === 0) {
                    setCell(x, y, 3, 2);
                } else if (truchet % 4 === 3) {
                    setCell(x, y, 8, 5);

                // L8 – Chevron arrows (left-pointing Andean fret)
                } else if (chevron < 1) {
                    setCell(x, y, 2, 3);
                } else if (chevron < 2) {
                    setCell(x, y, 3, 0);

                // L9 – Tartan plaid grid (warp × weft)
                } else if (tartan && x%3===0) {
                    setCell(x, y, 11, 6);
                } else if (tartan && y%3===0) {
                    setCell(x, y, 4, 1);

                // L10 – Noise-driven organic scatter with 4 sub-zones
                } else if (n1 > 0.70 && n2 > 0.60) {
                    setCell(x, y, 1,  0);
                } else if (n1 < 0.28 && n3 > 0.55) {
                    setCell(x, y, 13, 4);
                } else if (n2 > 0.72 && n4 < 0.45) {
                    setCell(x, y, 5,  2);
                } else if (n3 < 0.30 && n4 > 0.62) {
                    setCell(x, y, 6,  6);

                // L11 – Fine diagonal hatch (densest filler)
                } else if ((x + y) % 4 === 0) {
                    setCell(x, y, 0, 5);
                } else if ((x - y + cols*2) % 7 === 0) {
                    setCell(x, y, 7, 3);

                // L12 – Starburst lattice nodes
                } else if (Math.abs(dx)%8===0 && Math.abs(dy)%8===0) {
                    setCell(x, y, 6, 0);
                } else if ((x+y)%8===0) {
                    setCell(x, y, 0, 1);
                }
            }
        }
    }

    function setCell(x, y, symIdx, colorIdx) {
        if (x<0||x>=cols||y<0||y>=rows) return;
        textileGrid[x][y] = andeanSymbols[symIdx % andeanSymbols.length];
        colorGrid[x][y]   = colorIdx % andeanColors.length;
        isStitchAnchor[x][y] = true;
    }

    // ── DRAW LOOP ─────────────────────────────────────────────────────────────
    p.draw = function() {
        globalTime += 0.05;
        p.background(22, 22, 30);

    // Left sidebar removed: ensure sidebarWidth stays zero so canvas
    // fills the full width and no left gutter is reserved.
    sidebarWidth = 0;
    sidebarOpen = false;

        // Clear intro pattern when intro overlay is dismissed
        if (showIntroPattern && !showIntroText) {
            showIntroPattern = false;
        }

        mouseCol = p.constrain(p.floor((p.mouseX - sidebarWidth) / gridSize), 0, cols-1);
        mouseRow = p.constrain(p.floor(p.mouseY / gridSize), 0, rows-1);

        if (weavingMode && p.mouseIsPressed && p.mouseX > sidebarWidth) {
            weaveAt(mouseCol, mouseRow);
            patternPath.push(p.createVector(mouseCol, mouseRow));
            if (patternPath.length > 60) patternPath.shift();
        }

        // ── Speed warning ────────────────────────────────────────────────────
        if (p.mouseIsPressed && p.mouseX > sidebarWidth) {
            const dx = p.mouseX - prevMouseX;
            const dy = p.mouseY - prevMouseY;
            const speed = Math.sqrt(dx*dx + dy*dy);
            if (speed > SPEED_THRESHOLD) {
                fastFrameCount = Math.min(fastFrameCount + 1, FAST_FRAMES_NEEDED + 30);
            } else {
                fastFrameCount = Math.max(fastFrameCount - 2, 0);
            }
        } else {
            fastFrameCount = Math.max(fastFrameCount - 1, 0);
        }
        prevMouseX = p.mouseX;
        prevMouseY = p.mouseY;

        const shouldWarn = fastFrameCount >= FAST_FRAMES_NEEDED;
        warnOpacity = shouldWarn
            ? Math.min(1, warnOpacity + WARN_FADE_IN)
            : Math.max(0, warnOpacity - WARN_FADE_OUT);
        updateSpeedWarning(warnOpacity);

        drawGridBg();
        if (drawConnections) drawStitchConn();
        drawGrid();
        drawPatternPath();
        tickWordWeave();
        drawSidebar();
        // HTML panel handles buttons — only draw symbol panel overlay if open
        if (currentSection === 0) {
            const panelW = PANEL_W;
            const panelX = 0;
            p.fill(8, 9, 14, 248);
            p.rect(panelX, 0, panelW, p.height);
            p.stroke(255,255,255,6); p.strokeWeight(1);
            p.line(panelX + panelW - 0.5, 0, panelX + panelW - 0.5, p.height); p.noStroke();
            drawSymbolPanel(panelX, panelW);
            // Close button top-right of panel
            const closeX = panelX + panelW - 18;
            const closeHover = p.mouseX > closeX-6 && p.mouseX < closeX+6 && p.mouseY > 10 && p.mouseY < 26;
            p.fill(255,255,255, closeHover ? 160 : 45);
            p.textSize(16); p.textAlign(p.CENTER, p.CENTER);
            p.text("×", closeX, 18);
        }
        drawStatusBar();

        if (p.mouseX > sidebarWidth && mouseCol >= 0 && mouseRow >= 0) drawTooltip();
        if (showIntroText) { drawIntro(); if (--introTextTimer <= 0) showIntroText = false; }
    };

    // ── GRID BACKGROUND ──────────────────────────────────────────────────────
    function drawGridBg() {
        // Grid lines stay permanently (subtle, always visible)
        p.stroke(andeanColors[8], gridOpacity);
        p.strokeWeight(0.4);
        for (let x=0;x<=cols;x++) {
            const lx=x*gridSize+sidebarWidth+p.sin(globalTime*0.4+x*0.08)*0.4;
            p.line(lx,0,lx,p.height);
        }
        for (let y=0;y<=rows;y++) {
            const ly=y*gridSize+p.cos(globalTime*0.4+y*0.08)*0.4;
            p.line(sidebarWidth,ly,p.width,ly);
        }
        // Dot lattice only shows with intro pattern
        if (showIntroPattern) {
            p.fill(andeanColors[8], gridOpacity*0.6); p.noStroke();
            for (let x=0;x<=cols;x++) for (let y=0;y<=rows;y++) {
                if ((x+y)%4===0) {
                    const pulse=p.sin(globalTime*0.6+x*0.2+y*0.2)*0.5+1;
                    p.ellipse(x*gridSize+sidebarWidth,y*gridSize,1.1*pulse,1.1*pulse);
                }
            }
        }
        p.noStroke();
    }

    // ── STITCH CONNECTIONS ────────────────────────────────────────────────────
    function drawStitchConn() {
        for (let x=0;x<cols;x++) for (let y=0;y<rows;y++) {
            if (!isStitchAnchor[x][y]||textileGrid[x][y]===' ') continue;
            // Skip intro pattern cells once dismissed, but always show user connections
            if (!showIntroPattern && !userDrawn[x][y]) continue;
            for (let dx=-2;dx<=2;dx++) for (let dy=-2;dy<=2;dy++) {
                const nx=x+dx,ny=y+dy;
                if (nx<0||nx>=cols||ny<0||ny>=rows||(!dx&&!dy)) continue;
                if (!isStitchAnchor[nx][ny]||textileGrid[nx][ny]===' ') continue;
                // Also skip target if it's intro pattern
                if (!showIntroPattern && !userDrawn[nx][ny]) continue;
                const dsq=dx*dx+dy*dy;
                if (dsq>4||dsq===0) continue;
                const c1=colorGrid[x][y],c2=colorGrid[nx][ny];
                if (c1<0||c2<0) continue;
                const x1=x*gridSize+gridSize/2+sidebarWidth,y1=y*gridSize+gridSize/2;
                const x2=nx*gridSize+gridSize/2+sidebarWidth,y2=ny*gridSize+gridSize/2;
                const mx=(x1+x2)/2,my=(y1+y2)/2,cv=p.sin(globalTime+x+y)*2;
                for (let i=0;i<8;i++) {
                    const t1=i/8;
                    const bx1=p.bezierPoint(x1,mx+cv,mx-cv,x2,t1);
                    const by1=p.bezierPoint(y1,my+cv,my-cv,y2,t1);
                    const bx2=p.bezierPoint(x1,mx+cv,mx-cv,x2,(i+0.5)/8);
                    const by2=p.bezierPoint(y1,my+cv,my-cv,y2,(i+0.5)/8);
                    p.stroke(p.lerpColor(andeanColors[c1%andeanColors.length],andeanColors[c2%andeanColors.length],t1),100);
                    p.strokeWeight(stitchThickness+p.sin(globalTime*2+i)*0.3);
                    p.line(bx1,by1,bx2,by2);
                }
            }
        }
        p.noStroke();
    }

    // ── DRAW GRID ─────────────────────────────────────────────────────────────
    function drawGrid() {
        for (let x=0;x<cols;x++) for (let y=0;y<rows;y++) {
            const sym=textileGrid[x][y];
            if (sym===' ') continue;
            // Skip intro pattern cells once dismissed, but always show user-drawn cells
            if (!showIntroPattern && !userDrawn[x][y]) continue;
            const ax=x*gridSize+gridSize/2+sidebarWidth,ay=y*gridSize+gridSize/2;
            const pulse=p.sin(globalTime*2+animationOffsets[x][y])*0.3+1.0;
            const bob=p.sin(globalTime*3+animationOffsets[x][y]*2)*0.8;
            const ci=colorGrid[x][y];
            p.fill(0, 40); p.text(sym,ax+1,ay+1);
            const baseCol = ci>=0 ? andeanColors[ci] : p.color(180);
            p.fill(baseCol);
            p.push();
            p.translate(ax,ay+bob*0.3); p.scale(pulse*0.85); p.text(sym,0,0);
            if (isStitchAnchor[x][y]&&ci>=0) {
                p.fill(andeanColors[ci], 160);
                const ds=1.4+p.sin(globalTime+animationOffsets[x][y])*0.7;
                p.ellipse(-3,-3,ds,ds);p.ellipse(3,-3,ds,ds);
                p.ellipse(-3,3,ds,ds);p.ellipse(3,3,ds,ds);
            }
            p.pop();
        }
    }

    // ── PATTERN PATH ─────────────────────────────────────────────────────────
    function drawPatternPath() {
        if (patternPath.length<2) return;
        for (let i=0;i<patternPath.length-1;i++) {
            const p1=patternPath[i],p2=patternPath[i+1];
            const x1=p1.x*gridSize+gridSize/2+sidebarWidth,y1=p1.y*gridSize+gridSize/2;
            const x2=p2.x*gridSize+gridSize/2+sidebarWidth,y2=p2.y*gridSize+gridSize/2;
            const sc=andeanColors[(i+currentSymbol)%andeanColors.length];
            const sw=stitchThickness*(1.2+p.sin(globalTime*3+i)*0.3);
            p.stroke(sc,180);p.strokeWeight(sw);p.line(x1,y1,x2,y2);
            const mx=(x1+x2)/2,my=(y1+y2)/2;
            const ang=p.atan2(y2-y1,x2-x1)+p.HALF_PI;
            const cl=3+p.sin(globalTime*4+i)*2;
            p.stroke(sc,220);p.strokeWeight(sw*0.7);
            p.line(mx-p.cos(ang)*cl,my-p.sin(ang)*cl,mx+p.cos(ang)*cl,my+p.sin(ang)*cl);
        }
        p.noStroke();
    }

    // ── WORD DISPLAY ─────────────────────────────────────────────────────────
    // Grid-weaving phase — runs every frame to stamp typed letters into the grid.
    // The visual text box is now an HTML element above the canvas; only the
    // grid-stamping logic lives here.
    function tickWordWeave() {
        if (wordDisplayPhase>0) {
            if (wordDisplayPhase===1){clearWordArea();for(let i=0;i<currentWord.length;i++)displayLetterInGrid(currentWord.charAt(i),i);}
            if (++wordDisplayPhase>60) wordDisplayPhase=0;
        }
    }

    function clearWordArea() {
        const lw=5,sp=1,tw=currentWord.length*(lw+sp)-sp;
        const sx=p.floor(cols/2-tw/2),cy=p.floor(rows/2);
        for(let i=0;i<currentWord.length;i++){
            const lsx=sx+i*(lw+sp);
            for(let dx=-1;dx<=lw;dx++) for(let dy=-3;dy<=3;dy++){
                const gx=lsx+dx,gy=cy+dy;
                if(gx>=0&&gx<cols&&gy>=0&&gy<rows){textileGrid[gx][gy]=' ';isStitchAnchor[gx][gy]=false;}
            }
        }
    }

    function displayLetterInGrid(letter,pos) {
        const lw=5,sp=1,tw=currentWord.length*(lw+sp)-sp;
        const sx=p.floor(cols/2-tw/2)+pos*(lw+sp),sy=p.floor(rows/2)-2;
        const pat=getLetterPattern(letter);
        for(let py=0;py<5;py++) for(let px=0;px<5;px++) {
            if(pat[py][px]===1){
                const gx=sx+px,gy=sy+py;
                if(gx>=0&&gx<cols&&gy>=0&&gy<rows){
                    textileGrid[gx][gy]='■';colorGrid[gx][gy]=7;
                    isStitchAnchor[gx][gy]=true;animationOffsets[gx][gy]=pos*0.5+py*0.2+px*0.1;
                    userDrawn[gx][gy]=true;  // Mark typed letters as user-created
                }
            }
        }
    }

    function getLetterPattern(letter) {
        const _=0,X=1;
        const P={
            'A':[[_,X,X,X,_],[X,_,_,_,X],[X,X,X,X,X],[X,_,_,_,X],[X,_,_,_,X]],
            'B':[[X,X,X,X,_],[X,_,_,_,X],[X,X,X,X,_],[X,_,_,_,X],[X,X,X,X,_]],
            'C':[[_,X,X,X,X],[X,_,_,_,_],[X,_,_,_,_],[X,_,_,_,_],[_,X,X,X,X]],
            'D':[[X,X,X,X,_],[X,_,_,_,X],[X,_,_,_,X],[X,_,_,_,X],[X,X,X,X,_]],
            'E':[[X,X,X,X,X],[X,_,_,_,_],[X,X,X,_,_],[X,_,_,_,_],[X,X,X,X,X]],
            'F':[[X,X,X,X,X],[X,_,_,_,_],[X,X,X,_,_],[X,_,_,_,_],[X,_,_,_,_]],
            'G':[[_,X,X,X,X],[X,_,_,_,_],[X,_,X,X,X],[X,_,_,_,X],[_,X,X,X,X]],
            'H':[[X,_,_,_,X],[X,_,_,_,X],[X,X,X,X,X],[X,_,_,_,X],[X,_,_,_,X]],
            'I':[[X,X,X,X,X],[_,_,X,_,_],[_,_,X,_,_],[_,_,X,_,_],[X,X,X,X,X]],
            'J':[[_,_,_,_,X],[_,_,_,_,X],[_,_,_,_,X],[X,_,_,_,X],[_,X,X,X,_]],
            'K':[[X,_,_,X,_],[X,_,X,_,_],[X,X,_,_,_],[X,_,X,_,_],[X,_,_,X,_]],
            'L':[[X,_,_,_,_],[X,_,_,_,_],[X,_,_,_,_],[X,_,_,_,_],[X,X,X,X,X]],
            'M':[[X,_,_,_,X],[X,X,_,X,X],[X,_,X,_,X],[X,_,_,_,X],[X,_,_,_,X]],
            'N':[[X,_,_,_,X],[X,X,_,_,X],[X,_,X,_,X],[X,_,_,X,X],[X,_,_,_,X]],
            'O':[[_,X,X,X,_],[X,_,_,_,X],[X,_,_,_,X],[X,_,_,_,X],[_,X,X,X,_]],
            'P':[[X,X,X,X,_],[X,_,_,_,X],[X,X,X,X,_],[X,_,_,_,_],[X,_,_,_,_]],
            'Q':[[_,X,X,X,_],[X,_,_,_,X],[X,_,X,_,X],[X,_,_,X,_],[_,X,X,_,X]],
            'R':[[X,X,X,X,_],[X,_,_,_,X],[X,X,X,X,_],[X,_,X,_,_],[X,_,_,X,_]],
            'S':[[_,X,X,X,X],[X,_,_,_,_],[_,X,X,X,_],[_,_,_,_,X],[X,X,X,X,_]],
            'T':[[X,X,X,X,X],[_,_,X,_,_],[_,_,X,_,_],[_,_,X,_,_],[_,_,X,_,_]],
            'U':[[X,_,_,_,X],[X,_,_,_,X],[X,_,_,_,X],[X,_,_,_,X],[_,X,X,X,_]],
            'V':[[X,_,_,_,X],[X,_,_,_,X],[X,_,_,_,X],[_,X,_,X,_],[_,_,X,_,_]],
            'W':[[X,_,_,_,X],[X,_,_,_,X],[X,_,X,_,X],[X,X,_,X,X],[X,_,_,_,X]],
            'X':[[X,_,_,_,X],[_,X,_,X,_],[_,_,X,_,_],[_,X,_,X,_],[X,_,_,_,X]],
            'Y':[[X,_,_,_,X],[_,X,_,X,_],[_,_,X,_,_],[_,_,X,_,_],[_,_,X,_,_]],
            'Z':[[X,X,X,X,X],[_,_,_,X,_],[_,_,X,_,_],[_,X,_,_,_],[X,X,X,X,X]],
        };
        const r=P[letter.toUpperCase()];
        if(r) return r;
        const d=[];
        for(let i=0;i<5;i++){d[i]=[];for(let j=0;j<5;j++)d[i][j]=(Math.abs(i-2)+Math.abs(j-2)<=2)?1:0;}
        return d;
    }

    // ── SIDEBAR — Left tab is intentionally hidden now. Symbols live in
    // a right-side floating panel (matched to the control buttons).
    function drawSidebar() {
        // Left sidebar removed — no-op to avoid drawing anything on the left.
        return;
    }

    // Draw the symbol panel at an absolute originX (top-left) with width panelW.
    // This makes it easy to render the same panel on the right side of the canvas.
    function drawSymbolPanel(originX, panelW) {
        p.push();
        p.translate(originX, 0);
        const sy = 45, spr = 4, sp = 2;
        const bW = (panelW - PAD*2 - sp*(spr-1)) / spr;
        const numRows = Math.ceil(andeanSymbols.length / spr);
        const gridH = numRows * (bW + sp);
        const maxVisibleH = p.height - 140; // leave space for header and footer

        p.fill(255,255,255,18); p.textSize(7); p.textAlign(p.LEFT,p.CENTER);
        p.text("SYMBOLS (" + andeanSymbols.length + ")", PAD, sy-10);

        // Draw symbols grid (skip items outside visible region)
        for (let i = 0; i < andeanSymbols.length; i++) {
            const rr = p.floor(i / spr), cc = i % spr;
            const bx = PAD + cc * (bW + sp), by = sy + rr * (bW + sp);
            if (by + bW < sy || by > sy + maxVisibleH) continue;

            const isAct = i === currentSymbol;
            // compute hover relative to absolute mouse pos
            const absBx = originX + bx, absBy = by;
            const isHov = !isAct && p.mouseX > absBx && p.mouseX < absBx + bW && p.mouseY > absBy && p.mouseY < absBy + bW;

            if (isAct) {
                p.fill(andeanColors[i % andeanColors.length], 140); p.rect(bx, by, bW, bW, 3);
                p.fill(andeanColors[2], 200); p.rect(bx, by + bW - 1.5, bW, 1.5, 1);
            } else {
                p.fill(255,255,255, isHov ? 10 : 3); p.rect(bx, by, bW, bW, 3);
            }
            p.fill(isAct ? 255 : andeanColors[i % andeanColors.length]);
            p.textSize(10); p.textAlign(p.CENTER, p.CENTER);
            p.text(andeanSymbols[i], bx + bW/2, by + bW/2);
        }

        // Current symbol info at bottom
        const footY = p.height - 50;
        p.fill(255,255,255,5); p.rect(PAD, footY, panelW - PAD*2, 1);
        const ac = andeanColors[currentSymbol % andeanColors.length];
        p.fill(ac); p.textSize(20); p.textAlign(p.LEFT, p.CENTER);
        p.text(andeanSymbols[currentSymbol], PAD, footY + 16);
        p.fill(255,255,255,100); p.textSize(7); p.textAlign(p.LEFT, p.CENTER);
        p.text(colorNames[currentSymbol % colorNames.length], PAD + 24, footY + 16);

        p.pop();
    }


    // ── FLOATING ACTION BUTTONS ──────────────────────────────────────────────
    function drawFloatingButtons() {
        const btnSize = 44;
        const gap = 8;
        const startX = p.width - btnSize - 16;
        let y = 16;
        
        // Add a SYMBOLS button to match the same style/placement as the
        // control buttons (top-right). This toggles the symbols panel.
        const buttons = [
            {icon: "╋", label: "SYMBOLS", action: "symbols", tooltip: "Open Symbols"},
            {icon: "?", label: "HELP", action: "help", tooltip: "Help Overlay"},
            {icon: "↻", label: "CLEAR", action: "clear", tooltip: "Clear Canvas"},
            {icon: "↓", label: "SAVE", action: "save", tooltip: "Save PNG"},
            {icon: "━", label: "WIDTH", action: "stitch", tooltip: "Stitch Width"},
            {icon: drawConnections ? "◉" : "○", label: "CONN", action: "connect", tooltip: "Toggle Connections"}
        ];
        
        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const bx = startX;
            const by = y;
            const isHover = p.mouseX > bx && p.mouseX < bx+btnSize && p.mouseY > by && p.mouseY < by+btnSize;
            
            // Button background
            p.fill(6, 7, 12, isHover ? 240 : 200);
            p.stroke(255,255,255, isHover ? 30 : 15); p.strokeWeight(1);
            p.rect(bx, by, btnSize, btnSize, 6);
            p.noStroke();
            
            // Icon
            p.fill(andeanColors[0], isHover ? 255 : 180);
            p.textSize(18); p.textAlign(p.CENTER, p.CENTER);
            p.text(btn.icon, bx+btnSize/2, by+btnSize/2);
            
            // Tooltip on hover
            if (isHover) {
                const tw = p.textWidth(btn.tooltip) + 16;
                p.fill(8, 9, 14, 250);
                p.stroke(255,255,255,30); p.strokeWeight(1);
                p.rect(bx - tw - 8, by + btnSize/2 - 14, tw, 28, 4);
                p.noStroke();
                p.fill(255, 200);
                p.textSize(10); p.textAlign(p.RIGHT, p.CENTER);
                p.text(btn.tooltip, bx - 16, by + btnSize/2);
            }
            
            y += btnSize + gap;
        }
        
        // Stitch width slider (appears below stitch button when active)
        if (showStitchSlider) {
            const sliderX = startX - 120;
            const sliderY = 16 + (btnSize+gap)*3;
            const sliderW = 100;
            const sliderH = btnSize;
            
            p.fill(6, 7, 12, 240);
            p.stroke(255,255,255, 20); p.strokeWeight(1);
            p.rect(sliderX, sliderY, sliderW, sliderH, 6);
            p.noStroke();
            
            // Slider track
            const trackY = sliderY + sliderH/2;
            const trackX = sliderX + 12;
            const trackW = sliderW - 24;
            const norm = (stitchThickness - 0.5) / 4.5;
            
            p.fill(255,255,255, 15);
            p.rect(trackX, trackY-1, trackW, 2, 1);
            p.fill(andeanColors[0], 180);
            p.rect(trackX, trackY-1, trackW*norm, 2, 1);
            
            // Thumb
            p.noFill();
            p.stroke(andeanColors[0], 200);
            p.strokeWeight(1.5);
            p.ellipse(trackX + trackW*norm, trackY, 8, 8);
            p.noStroke();
            
            // Value label
            p.fill(255, 160);
            p.textSize(9);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(p.nf(stitchThickness, 0, 1), sliderX + sliderW/2, sliderY - 10);
        }

        // If symbols panel is open, draw it to the left of the floating
        // controls so it visually matches the control placement/style.
        if (currentSection === 0) {
            const panelW = PANEL_W;
            const panelX = startX - panelW - 12;

            // Panel background
            p.fill(8, 9, 14, 248);
            p.rect(panelX, 0, panelW, p.height);
            // Right hairline
            p.stroke(255,255,255,6); p.strokeWeight(1);
            p.line(panelX + panelW - 0.5, 0, panelX + panelW - 0.5, p.height); p.noStroke();

            // Render symbol panel content
            drawSymbolPanel(panelX, panelW);

            // Close button (subtle X) at top-right of panel
            const closeX = panelX + panelW - 18;
            const closeHover = p.mouseX > closeX-6 && p.mouseX < closeX+6 && p.mouseY > 10 && p.mouseY < 26;
            p.fill(255,255,255, closeHover ? 160 : 45);
            p.textSize(16); p.textAlign(p.CENTER, p.CENTER);
            p.text("×", closeX, 18);
        }
    }

    // ── STATUS BAR ───────────────────────────────────────────────────────────
    function drawStatusBar() {
        p.fill(13,15,22,210); p.noStroke();
        p.rect(sidebarWidth,p.height-26,p.width-sidebarWidth,26);
        p.stroke(255,255,255,8); p.strokeWeight(1);
        p.line(sidebarWidth,p.height-26,p.width,p.height-26); p.noStroke();
        p.fill(255,255,255,80); p.textSize(8.5);
        p.textAlign(p.LEFT,p.CENTER);
        p.text("DRAG TO WEAVE  ·  CLICK CANVAS THEN TYPE LETTERS  ·  USE LEFT PANEL FOR CONTROLS", sidebarWidth+14,p.height-13);
    }

    // ── TOOLTIP ──────────────────────────────────────────────────────────────
    function drawTooltip() {
        const sym=textileGrid[mouseCol][mouseRow];
        if (sym===' ') return;
        p.fill(13,15,22,215); p.stroke(255,255,255,25); p.strokeWeight(1);
        p.rect(p.mouseX+12,p.mouseY-30,140,36,5); p.noStroke();
        p.fill(andeanColors[colorGrid[mouseCol][mouseRow]%andeanColors.length]);
        p.textSize(16); p.textAlign(p.LEFT,p.CENTER);
        p.text(sym,p.mouseX+20,p.mouseY-16);
        p.fill(255,255,255,150); p.textSize(8.5);
        p.text(colorNames[colorGrid[mouseCol][mouseRow]%colorNames.length],p.mouseX+38,p.mouseY-16);
        p.fill(255,255,255,70); p.textSize(7.5);
        p.text("col "+mouseCol+" · row "+mouseRow,p.mouseX+20,p.mouseY-3);
    }

    // ── INTRO OVERLAY ────────────────────────────────────────────────────────
    function drawIntro() {
        const cx = sidebarWidth + (p.width - sidebarWidth) / 2;
        const cy = p.height / 2;
        const W = 480, H = 320;
        const L = cx - W/2, T = cy - H/2;
        const pulse = p.sin(globalTime * 2.0) * 0.5 + 0.5;

        // ── Full-canvas dim ───────────────────────────────────────────────
        p.noStroke(); p.fill(5, 6, 12, 210);
        p.rect(0, 0, p.width, p.height);

        // ── Backdrop card ─────────────────────────────────────────────────
        p.noStroke(); p.fill(11, 12, 22, 255);
        p.rect(L, T, W, H, 16);

        // ── Top gradient accent bar ───────────────────────────────────────
        const barH = 4;
        const stops = [andeanColors[9], andeanColors[0], andeanColors[4], andeanColors[7]];
        const segW  = W / (stops.length - 1);
        for (let s = 0; s < stops.length - 1; s++) {
            for (let px = 0; px < segW + 1; px++) {
                const t2 = px / segW;
                const c  = p.lerpColor(stops[s], stops[s + 1], t2);
                p.fill(p.red(c), p.green(c), p.blue(c), 255);
                p.rect(L + s * segW + px, T, 1, barH);
            }
        }

        // ── Single clean border ring ──────────────────────────────────────
        p.noFill();
        p.stroke(255, 255, 255, 10);
        p.strokeWeight(1);
        p.rect(L + 1, T + 1, W - 2, H - 2, 15);
        p.noStroke();

        // ── Title — very small, dimmed ────────────────────────────────────
        p.fill(255, 255, 255, 90);
        p.textSize(11); p.textAlign(p.CENTER, p.CENTER);
        p.text("DIGITAL ANDES", cx, T + 28);

        // ── Hairline divider ──────────────────────────────────────────────
        p.fill(255, 255, 255, 10);
        p.rect(L + 48, T + 42, W - 96, 1);

        // ── Instruction rows — keyword + description on same line ─────────
        const rows = [
            { key: "DRAG",   desc: "across the canvas to place symbols",       col: andeanColors[9]  },
            { key: "TYPE",   desc: "any letter to weave words into the grid",   col: andeanColors[0]  },
            { key: "PANEL",  desc: "left side — symbols, stitch width & save",  col: andeanColors[4]  },
        ];

        const rowStartY = T + 100;
        const rowGap    = 68;
        const keyW      = 80;
        const rowLeft   = L + 52;
        const rowRight  = L + W - 52;
        const rowMid    = rowLeft + keyW;

        for (let i = 0; i < rows.length; i++) {
            const r  = rows[i];
            const ry = rowStartY + i * rowGap;

            // Row separator (except first)
            if (i > 0) {
                p.fill(255, 255, 255, 8);
                p.rect(rowLeft, ry - 22, rowRight - rowLeft, 1);
            }

            // Keyword — right-aligned to column edge, coloured
            p.fill(p.red(r.col), p.green(r.col), p.blue(r.col), 240);
            p.textSize(15); p.textAlign(p.RIGHT, p.CENTER);
            p.text(r.key, rowMid - 14, ry);

            // Dot separator
            p.fill(255, 255, 255, 30);
            p.ellipse(rowMid, ry, 3, 3);

            // Description — left-aligned from column edge
            p.fill(255, 255, 255, 175);
            p.textSize(13); p.textAlign(p.LEFT, p.CENTER);
            p.text(r.desc, rowMid + 14, ry);
        }

        // ── CTA ───────────────────────────────────────────────────────────
        const ctaY = T + H - 36;
        p.fill(255, 255, 255, 6 + pulse * 8);
        p.rect(L + 48, ctaY - 14, W - 96, 28, 6);
        p.stroke(255, 255, 255, 20 + pulse * 30);
        p.strokeWeight(1); p.noFill();
        p.rect(L + 48, ctaY - 14, W - 96, 28, 6);
        p.noStroke();
        p.fill(255, 255, 255, 120 + pulse * 80);
        p.textSize(10); p.textAlign(p.CENTER, p.CENTER);
        p.text("CLICK OR PRESS ANY KEY TO BEGIN", cx, ctaY);

        p.textSize(gridSize * 1.2);
    }

    // ── WEAVE ────────────────────────────────────────────────────────────────
    function weaveAt(x,y) {
        if(x<0||x>=cols||y<0||y>=rows) return;
        const ps=textileGrid[x][y],pc=colorGrid[x][y],pa=isStitchAnchor[x][y];
        textileGrid[x][y]=andeanSymbols[currentSymbol];
        colorGrid[x][y]=currentSymbol%andeanColors.length;
        isStitchAnchor[x][y]=true;
        userDrawn[x][y]=true;  // Mark as user-created
        for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) {
            const nx=x+dx,ny=y+dy;
            if(nx>=0&&nx<cols&&ny>=0&&ny<rows&&(dx||dy)&&p.random(1)<0.3) isStitchAnchor[nx][ny]=true;
        }
        redoHistory=[];
        history.push({x,y,symbol:ps,colorIndex:pc,wasAnchor:pa});
        if(history.length>100) history.shift();
    }

    // ── KEYBOARD ────────────────────────────────────────────────────────────
    function handleKey(key) {
        if(showIntroText){showIntroText=false;updateTypeBar();return;}
        if(key.length===1&&key.match(/[a-zA-Z]/)){currentWord+=key.toUpperCase();wordDisplayPhase=1;updateTypeBar();return;}
        if(key==='Backspace'){if(currentWord.length>0){currentWord=currentWord.slice(0,-1);wordDisplayPhase=1;}updateTypeBar();return;}
        if(key==='Enter'){currentWord="";wordDisplayPhase=0;updateTypeBar();return;}
    }

    function updateTypeBar() {
        const bar = document.getElementById('type-bar-text');
        if (!bar) return;
        bar.textContent = currentWord;
    }

    function updateSpeedWarning(opacity) {
        const el = document.getElementById('speed-warning');
        if (!el) return;
        el.style.opacity = opacity;
        el.style.pointerEvents = opacity > 0.05 ? 'none' : 'none';
    }

    // ── MOUSE ────────────────────────────────────────────────────────────────
    // ── MOUSE ────────────────────────────────────────────────────────────────
    p.mousePressed = function() {
        if(canvasEl) canvasEl.focus();
        if(showIntroText){showIntroText=false;return false;}

        // ── Symbol panel overlay click handling ──────────────────────────
        if (currentSection === 0) {
            const panelW = PANEL_W;
            const panelX = 0;
            const closeX = panelX + panelW - 18;
            if(p.mouseX > closeX-6 && p.mouseX < closeX+6 && p.mouseY > 10 && p.mouseY < 26) {
                currentSection = -1;
                return false;
            }
            if (p.mouseX > panelX && p.mouseX < panelX + panelW) {
                const mx = p.mouseX - panelX;
                const spr = 4, sp = 2, sy = 45;
                const bW = (panelW - PAD*2 - sp*(spr-1)) / spr;
                for (let i = 0; i < andeanSymbols.length; i++) {
                    const r = p.floor(i / spr), c = i % spr;
                    const bx = PAD + c * (bW + sp), by = sy + r * (bW + sp);
                    if (mx > bx && mx < bx + bW && p.mouseY > by && p.mouseY < by + bW) {
                        currentSymbol = i;
                        // Update HTML panel icon
                        const iconEl = document.getElementById('ctrl-icon-sym');
                        if (iconEl) iconEl.textContent = andeanSymbols[i];
                        return false;
                    }
                }
                return false; // ate the click inside panel
            }
        }

        // Default: weave on canvas (clicked outside panels)
        if(p.mouseX > sidebarWidth) weaveAt(mouseCol,mouseRow);
        return false;
    };
    p.mouseDragged = function() {
        if(p.mouseX>sidebarWidth) weaveAt(mouseCol,mouseRow);
        return false;
    };

    function undoAction() {
        if(!history.length) return;
        const a=history.pop();
        redoHistory.push({x:a.x,y:a.y,symbol:textileGrid[a.x][a.y],colorIndex:colorGrid[a.x][a.y],wasAnchor:isStitchAnchor[a.x][a.y]});
        textileGrid[a.x][a.y]=a.symbol;colorGrid[a.x][a.y]=a.colorIndex;isStitchAnchor[a.x][a.y]=a.wasAnchor;
    }

    function redoAction() {
        if(!redoHistory.length) return;
        const a=redoHistory.pop();
        history.push({x:a.x,y:a.y,symbol:textileGrid[a.x][a.y],colorIndex:colorGrid[a.x][a.y],wasAnchor:isStitchAnchor[a.x][a.y]});
        textileGrid[a.x][a.y]=a.symbol;colorGrid[a.x][a.y]=a.colorIndex;isStitchAnchor[a.x][a.y]=a.wasAnchor;
    }

    p.windowResized = function() {
        const c=document.getElementById('canvas-container');
        if(!c) return;
        p.resizeCanvas(c.offsetWidth,c.offsetHeight);
        cols=p.floor((p.width-TAB_W)/gridSize);
        rows=p.floor(p.height/gridSize);
    };

    // ── Expose actions for HTML panel ───────────────────────────────────────
    p.actionSymbols = function() { currentSection = (currentSection === 0) ? -1 : 0; };
    p.actionHelp    = function() { showIntroText = true; introTextTimer = 400; };
    p.actionClear   = function() { initGrid(); generatePattern(); patternPath=[]; history=[]; redoHistory=[]; showIntroPattern=true; currentWord=""; wordDisplayPhase=0; updateTypeBar(); };
    p.actionSave    = function() {        const dataURL = canvasEl.toDataURL('image/png');
        const timestamp = new Date();
        const label = timestamp.toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'});
        const id = Date.now();
        const entry = { id, dataURL, label, timestamp: timestamp.toISOString() };
        const saved = JSON.parse(localStorage.getItem('andean_archive') || '[]');
        saved.unshift(entry);
        if (saved.length > 50) saved.pop();
        localStorage.setItem('andean_archive', JSON.stringify(saved));
        if (typeof window.onWeavingSaved === 'function') {
            setTimeout(() => window.onWeavingSaved(id), 200);
        } else if (typeof window.switchTab === 'function') {
            setTimeout(() => window.switchTab('archive'), 200);
        }
    };
    p.actionConnect = function() { drawConnections = !drawConnections; return drawConnections; };
    p.setStitch     = function(v) { stitchThickness = v; };
    p.setColor      = function(i) { currentColor = i; };
    p.setSymbol     = function(i) { currentSymbol = i; };
    p.getColors     = function() { return andeanColors; };
};

if(typeof window!=='undefined') window.sketch=sketch;