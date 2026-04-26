// Textile Gallery — mini p5.js weavings for the home page checkered grid
(function() {

    // Each mini sketch gets its own seed and color palette variation
    const galleryConfigs = [
        {
            id: 'canvas-replica-1',
            seed: 11,
            // Horizontal stripe pattern — mimics the iStock photo
            patternType: 'stripes',
            colorScheme: [
                [231,204,68],[204,58,40],[141,105,198],[193,220,110],
                [233,120,131],[91,198,226],[222,84,74],[211,156,66]
            ]
        },
        {
            id: 'canvas-replica-2',
            seed: 37,
            // Diamond / rhombus pattern
            patternType: 'diamonds',
            colorScheme: [
                [88,30,56],[222,84,74],[231,204,68],[91,198,226],
                [193,220,110],[204,58,40],[211,156,66],[141,105,198]
            ]
        },
        {
            id: 'canvas-replica-3',
            seed: 73,
            // Andean geometric / chevron pattern
            patternType: 'chevrons',
            colorScheme: [
                [33,35,137],[231,204,68],[204,58,40],[193,220,110],
                [91,198,226],[233,120,131],[141,105,198],[128,152,67]
            ]
        },
        {
            id: 'canvas-replica-4',
            seed: 99,
            // Dense symbol grid — intricate overall pattern
            patternType: 'symbols',
            colorScheme: [
                [222,84,74],[231,204,68],[88,30,56],[193,220,110],
                [91,198,226],[211,156,66],[141,105,198],[204,58,40]
            ]
        }
    ];

    function createMiniSketch(cfg) {
        const container = document.getElementById(cfg.id);
        if (!container) return;

        const miniSketch = function(p) {
            let t = 0;
            const gs = 8; // grid size (pixels per cell)
            let cols, rows;
            let grid = []; // {sym, ci} per cell

            const symbols = ['◆','╋','▩','◉','◈','▣','∧','✦','⬟','◐','◑','☼','▽','⬢'];
            let palette;

            p.setup = function() {
                const w = container.offsetWidth || 150;
                const h = container.offsetHeight || 150;
                const cv = p.createCanvas(w, h);
                cv.parent(cfg.id);
                cv.elt.style.display = 'block';
                p.noiseSeed(cfg.seed);
                p.randomSeed(cfg.seed);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(gs * 1.1);
                p.noStroke();

                palette = cfg.colorScheme.map(c => p.color(c[0], c[1], c[2]));

                cols = p.floor(w / gs);
                rows = p.floor(h / gs);
                buildGrid();
            };

            function buildGrid() {
                grid = [];
                const pt = cfg.patternType;

                for (let x = 0; x < cols; x++) {
                    grid[x] = [];
                    for (let y = 0; y < rows; y++) {
                        let sym = ' ', ci = -1;

                        if (pt === 'stripes') {
                            // Horizontal bands like traditional textiles
                            const band = p.floor(y / 3) % palette.length;
                            if (y % 3 === 0) {
                                // Band border — dense symbols
                                sym = symbols[band % symbols.length];
                                ci = band;
                            } else if (y % 3 === 1) {
                                // Solid band with occasional symbol
                                if (x % 4 === 0) {
                                    sym = symbols[(band + 2) % symbols.length];
                                    ci = (band + 3) % palette.length;
                                } else {
                                    sym = '▬';
                                    ci = band;
                                }
                            } else {
                                // Alternating fill
                                sym = x % 2 === 0 ? '◆' : '◇';
                                ci = (band + 1) % palette.length;
                            }

                        } else if (pt === 'diamonds') {
                            const manhattan = Math.abs(x - p.floor(cols/2)) + Math.abs(y - p.floor(rows/2));
                            if (manhattan % 6 === 0) {
                                sym = '◆';
                                ci = 0;
                            } else if (manhattan % 6 === 3) {
                                sym = '◈';
                                ci = 1;
                            } else if (manhattan % 3 === 0) {
                                sym = '╋';
                                ci = (manhattan / 3) % palette.length;
                            } else {
                                const n = p.noise(x * 0.25, y * 0.25, cfg.seed * 0.1);
                                if (n > 0.6) {
                                    sym = '∧';
                                    ci = p.floor(n * palette.length) % palette.length;
                                } else if (n < 0.35) {
                                    sym = '▩';
                                    ci = (p.floor(n * palette.length) + 2) % palette.length;
                                } else {
                                    sym = '◉';
                                    ci = p.floor(y / 5) % palette.length;
                                }
                            }

                        } else if (pt === 'chevrons') {
                            const chevVal = (x + Math.abs((y % 8) - 4)) % 6;
                            if (chevVal < 1) {
                                sym = '∧';
                                ci = p.floor(y / 4) % palette.length;
                            } else if (chevVal < 2) {
                                sym = '╋';
                                ci = (p.floor(y / 4) + 2) % palette.length;
                            } else if ((x + y) % 3 === 0) {
                                sym = '◆';
                                ci = (p.floor(x / 4) + 1) % palette.length;
                            } else if ((x * y) % 7 < 2) {
                                sym = '◈';
                                ci = (p.floor(y / 6) + 4) % palette.length;
                            } else {
                                const n = p.noise(x * 0.3, y * 0.3);
                                if (n > 0.65) {
                                    sym = '✦';
                                    ci = p.floor(n * 8) % palette.length;
                                }
                            }

                        } else if (pt === 'symbols') {
                            // Dense intricate pattern
                            const manhattan = Math.abs(x - p.floor(cols/2)) + Math.abs(y - p.floor(rows/2));
                            const n1 = p.noise(x * 0.2, y * 0.2);
                            const n2 = p.noise(x * 0.4 + 10, y * 0.4 + 10);
                            const tartan = (x % 4 < 2) !== (y % 4 < 2);

                            if (manhattan % 4 === 0) {
                                sym = '◆';
                                ci = (p.floor(manhattan / 4)) % palette.length;
                            } else if (tartan && n1 > 0.5) {
                                sym = '╋';
                                ci = p.floor(n1 * palette.length);
                            } else if (n2 > 0.72) {
                                sym = '☼';
                                ci = p.floor(n2 * palette.length) % palette.length;
                            } else if ((x + y) % 5 === 0) {
                                sym = '▩';
                                ci = (x + y) % palette.length;
                            } else if (n1 < 0.3) {
                                sym = '◉';
                                ci = p.floor(n2 * palette.length);
                            } else {
                                sym = symbols[p.floor(n1 * symbols.length)];
                                ci = p.floor(n2 * palette.length);
                            }
                        }

                        grid[x][y] = { sym, ci };
                    }
                }
            }

            p.draw = function() {
                t += 0.04;
                p.background(22, 22, 30);

                // Draw woven symbols
                for (let x = 0; x < cols; x++) {
                    for (let y = 0; y < rows; y++) {
                        const cell = grid[x][y];
                        if (cell.sym === ' ' || cell.ci < 0) continue;

                        const ax = x * gs + gs / 2;
                        const ay = y * gs + gs / 2;
                        const offset = p.noise(x * 0.3, y * 0.3, t * 0.5);
                        const pulse = p.sin(t * 2 + offset * p.TWO_PI) * 0.12 + 0.95;
                        const bob = p.sin(t * 2.5 + offset * p.TWO_PI) * 0.6;

                        p.fill(palette[cell.ci % palette.length]);
                        p.push();
                        p.translate(ax, ay + bob * 0.3);
                        p.scale(pulse);
                        p.text(cell.sym, 0, 0);
                        p.pop();
                    }
                }

                // Stitch connections — draw thin lines between nearby anchors
                for (let x = 0; x < cols; x++) {
                    for (let y = 0; y < rows; y++) {
                        const cell = grid[x][y];
                        if (cell.sym === ' ' || cell.ci < 0) continue;
                        // Only connect a fraction for performance
                        if ((x + y) % 4 !== 0) continue;

                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (!dx && !dy) continue;
                                const nx = x + dx, ny = y + dy;
                                if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
                                const ncell = grid[nx][ny];
                                if (ncell.sym === ' ' || ncell.ci < 0) continue;

                                const x1 = x * gs + gs / 2, y1 = y * gs + gs / 2;
                                const x2 = nx * gs + gs / 2, y2 = ny * gs + gs / 2;
                                const c1 = palette[cell.ci % palette.length];
                                const c2 = palette[ncell.ci % palette.length];
                                const mid = p.lerpColor(c1, c2, 0.5);
                                const wave = p.sin(t * 1.5 + x * 0.4 + y * 0.4) * 1.2;

                                p.stroke(mid, 60);
                                p.strokeWeight(0.7);
                                p.line(x1, y1 + wave, x2, y2 + wave);
                            }
                        }
                        p.noStroke();
                    }
                }

                // Subtle scanline overlay
                p.noStroke();
                for (let y = 0; y < p.height; y += 3) {
                    p.fill(0, 18);
                    p.rect(0, y, p.width, 1);
                }
            };

            p.windowResized = function() {
                const w = container.offsetWidth || 150;
                const h = container.offsetHeight || 150;
                p.resizeCanvas(w, h);
                cols = p.floor(w / gs);
                rows = p.floor(h / gs);
                buildGrid();
            };
        };

        new p5(miniSketch);
    }

    // Initialize all gallery sketches once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            galleryConfigs.forEach(createMiniSketch);
        });
    } else {
        galleryConfigs.forEach(createMiniSketch);
    }

})();
