// ── Word Bubble Shooter 게임 엔진 ──────────────────────────────
'use strict';

const BubbleGame = (() => {

    // ── 상수 ──────────────────────────────────────────────────
    const COLS = 8;
    const BUBBLE_R = 28;               // 버블 반지름(px)
    const CANVAS_W = 480;
    const CANVAS_H = 560;
    const DANGER_Y = CANVAS_H - 72;   // 위험선 Y
    const PROJ_SPEED = 14;              // 발사체 속도
    const FILL_PROB = 0.78;            // 버블 채움 확률
    const INIT_ROWS = 4;               // 초기 행 수
    const DROP_START = 11000;           // 초기 내려오기 주기(ms)
    const DROP_MIN = 3500;            // 최소 주기
    const DROP_STEP = 600;             // 레벨당 주기 감소

    const COLORS = [
        '#FF4455', // 빨강
        '#FF9900', // 주황
        '#FFD700', // 노랑
        '#33CC66', // 초록
        '#3399FF', // 파랑
        '#AA44FF', // 보라
    ];

    // ── 내부 상태 ─────────────────────────────────────────────
    let canvas, ctx;
    let bubbles = [];   // BubbleCell[]
    let proj = null; // 날아가는 발사체
    let wordPool = [];   // 단어 풀 (shuffle 후 pop)
    let allWords = [];   // 원본 단어 목록
    let score = 0;
    let combo = 0;
    let level = 1;
    let popped = 0;    // 이번 레벨 처치 수
    let TARGET_PER_LEVEL = 8;
    let dropInterval = DROP_START;
    let dropTimer = null;
    let animFrame = null;
    let gameRunning = false;
    let cb = {};               // 콜백 모음
    let fallingBubbles = [];   // 천장에서 분리되어 떨어지는 버블 배열
    let aimTarget = null;      // 현재 조준 중인 타겟 버블

    // ── 육각형 격자 좌표 ──────────────────────────────────────
    const hexX = (col, row) =>
        BUBBLE_R + col * BUBBLE_R * 2 + (row % 2 === 1 ? BUBBLE_R : 0);
    const hexY = (row) => BUBBLE_R + row * BUBBLE_R * 1.72;

    // ── 공개 API ──────────────────────────────────────────────
    function init(canvasEl, words, callbacks = {}) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        cb = callbacks;

        allWords = [...words];
        refillPool();

        bubbles = [];
        fallingBubbles = [];
        proj = null;
        score = 0; combo = 0; level = 1; popped = 0;
        dropInterval = DROP_START;
        gameRunning = true;

        for (let r = 0; r < INIT_ROWS; r++) spawnRow(r);
        startDrop();
        loop();
    }

    // 발사 (단어 입력 완료 시 호출)
    function shoot(word) {
        if (!gameRunning || proj) return false;

        // 화면의 살아있는 버블 중 같은 단어 찾기
        const target = bubbles.find(b => b.alive && b.word === word);
        if (!target) { combo = 0; notifyUpdate(); return false; }

        // 하단 중앙에서 목표를 향해 발사
        const sx = CANVAS_W / 2, sy = CANVAS_H - 28;
        const dx = target.x - sx, dy = target.y - sy;
        const d = Math.hypot(dx, dy);
        proj = {
            x: sx, y: sy, vx: (dx / d) * PROJ_SPEED, vy: (dy / d) * PROJ_SPEED,
            color: target.color, word
        };
        return true;
    }

    // 조준 (입력 중 실시간 호출)
    function aim(word) {
        if (!gameRunning) { aimTarget = null; return; }
        // 정확히 일치하는 버블 우선, 없으면 접두사 일치
        aimTarget = bubbles.find(b => b.alive && b.word === word)
            || (word.length > 0 ? bubbles.find(b => b.alive && b.word.startsWith(word)) : null);
    }

    function pause() { gameRunning = false; clearInterval(dropTimer); cancelAnimationFrame(animFrame); }
    function resume() { if (!gameRunning) { gameRunning = true; startDrop(); loop(); } }
    function stop() { pause(); bubbles = []; proj = null; }

    // 현재 화면의 살아있는 단어 목록 (입력 힌트용)
    function getLiveWords() {
        return [...new Set(bubbles.filter(b => b.alive).map(b => b.word))];
    }

    // ── 단어 풀 관리 ──────────────────────────────────────────
    function refillPool() {
        wordPool = shuffle([...allWords]);
    }

    function nextWord() {
        // 화면에 이미 있는 단어는 중복 방지
        const live = new Set(bubbles.filter(b => b.alive).map(b => b.word));
        for (let tries = 0; tries < wordPool.length; tries++) {
            const w = wordPool.pop();
            if (wordPool.length === 0) refillPool();
            if (!live.has(w)) return w;
        }
        return wordPool.pop() || allWords[0]; // fallback
    }

    // ── 행 스폰 ───────────────────────────────────────────────
    function spawnRow(atRow) {
        const cols = COLS - (atRow % 2 === 1 ? 1 : 0);
        for (let c = 0; c < cols; c++) {
            if (Math.random() > FILL_PROB) continue;
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const word = nextWord();
            bubbles.push({
                row: atRow, col: c,
                color, word,
                x: hexX(c, atRow),
                y: hexY(atRow),
                alive: true,
                popAnim: 0,  // 0=없음, >0=팝 애니 진행
            });
        }
    }

    // ── 내려오기 타이머 ───────────────────────────────────────
    function startDrop() {
        clearInterval(dropTimer);
        dropTimer = setInterval(() => {
            if (!gameRunning) return;
            // 기존 버블 한 행씩 내림
            bubbles.forEach(b => { b.row++; b.y = hexY(b.row); });
            // 새 행 추가 (0행)
            spawnRow(0);
            syncX(); // 홀짝 오프셋 재계산
            checkDanger();
        }, dropInterval);
    }

    function syncX() {
        bubbles.forEach(b => { b.x = hexX(b.col, b.row); });
    }

    // ── 위험 체크 ─────────────────────────────────────────────
    function checkDanger() {
        if (bubbles.some(b => b.alive && b.y + BUBBLE_R >= DANGER_Y)) {
            endGame(false);
        }
    }

    // ── 충돌 판정 ─────────────────────────────────────────────
    function checkCollision() {
        if (!proj) return;

        // 모든 살아있는 버블과 충돌 체크 (가장 가까운 것 우선)
        let closestDist = Infinity;
        let closestBubble = null;
        for (const b of bubbles) {
            if (!b.alive) continue;
            const dist = Math.hypot(b.x - proj.x, b.y - proj.y);
            if (dist < BUBBLE_R * 2 - 4 && dist < closestDist) {
                closestDist = dist;
                closestBubble = b;
            }
        }

        if (closestBubble) {
            if (closestBubble.word === proj.word) {
                // ✅ 타겟 버블: 격파
                popBubbles(closestBubble);
            } else {
                // ❌ 중간 버블에 막힘: 발사체 소멸, 콤보 리셋
                combo = 0;
                notifyUpdate();
            }
            proj = null;
            return;
        }

        // 화면 이탈 시 발사체 소멸
        if (proj.x < -BUBBLE_R || proj.x > CANVAS_W + BUBBLE_R ||
            proj.y < -BUBBLE_R || proj.y > CANVAS_H + BUBBLE_R) {
            proj = null;
            combo = 0;
            notifyUpdate();
        }
    }

    // ── BFS 연쇄 제거 ─────────────────────────────────────────
    function popBubbles(target) {
        const color = target.color;
        const visited = new Set();
        const queue = [target];
        visited.add(target);

        // 1단계: 같은 색 연결 BFS
        while (queue.length) {
            const cur = queue.shift();
            for (const nb of bubbles) {
                if (visited.has(nb) || !nb.alive || nb.color !== color) continue;
                if (Math.hypot(nb.x - cur.x, nb.y - cur.y) < BUBBLE_R * 2.6) {
                    visited.add(nb);
                    queue.push(nb);
                }
            }
        }

        const count = visited.size;
        visited.forEach(b => { b.alive = false; });

        // 2단계: 천장 연결 체크 → 분리된 버블 낙하
        dropDetachedBubbles();

        // 점수: 단독=10, 연쇄 보너스
        combo++;
        const pts = count === 1 ? 10 * combo : count * 15 * combo;
        score += pts;
        popped++;

        // 레벨 업
        if (popped >= TARGET_PER_LEVEL * level) {
            level++;
            dropInterval = Math.max(DROP_MIN, dropInterval - DROP_STEP);
            startDrop();
        }

        notifyUpdate({ pts, count });
    }

    // ── 천장 연결 BFS → 분리 버블 낙하 ──────────────────────────
    function dropDetachedBubbles() {
        // 천장(row === 0)의 살아있는 버블에서 BFS로 연결된 버블 전부 마킹
        const connected = new Set();
        const queue = bubbles.filter(b => b.alive && b.row === 0);
        queue.forEach(b => connected.add(b));

        let i = 0;
        while (i < queue.length) {
            const cur = queue[i++];
            for (const nb of bubbles) {
                if (connected.has(nb) || !nb.alive) continue;
                if (Math.hypot(nb.x - cur.x, nb.y - cur.y) < BUBBLE_R * 2.6) {
                    connected.add(nb);
                    queue.push(nb);
                }
            }
        }

        // 연결 안 된 살아있는 버블 → 낙하 애니메이션으로 전환
        const toFall = bubbles.filter(b => b.alive && !connected.has(b));
        toFall.forEach(b => {
            b.alive = false;
            fallingBubbles.push({
                x: b.x, y: b.y,
                vx: (Math.random() - 0.5) * 2,  // 살짝 좌우 흔들림
                vy: -1 + Math.random() * 2,      // 초기 속도 (약간 위로 튀었다가 떨어짐)
                color: b.color, word: b.word,
                alpha: 1.0,
            });
        });

        // 낙하 버블로 얻는 보너스 점수
        if (toFall.length > 0) {
            score += toFall.length * 5 * combo;
            notifyUpdate({});
        }
    }

    function notifyUpdate(extra = {}) {
        if (cb.onUpdate) cb.onUpdate({ score, level, combo, ...extra });
    }

    // ── 게임 종료 ─────────────────────────────────────────────
    function endGame(win) {
        gameRunning = false;
        clearInterval(dropTimer);
        cancelAnimationFrame(animFrame);
        if (cb.onGameOver) cb.onGameOver({ score, level, win });
    }

    // ── 메인 루프 ─────────────────────────────────────────────
    function loop() {
        if (!gameRunning) return;
        update();
        render();
        animFrame = requestAnimationFrame(loop);
    }

    function update() {
        // 발사체 이동
        if (proj) {
            proj.x += proj.vx;
            proj.y += proj.vy;
            if (proj.x - BUBBLE_R < 0 || proj.x + BUBBLE_R > CANVAS_W) proj.vx *= -1;
            checkCollision();
        }

        // 낙하 버블 물리 업데이트
        const GRAVITY = 0.55;
        fallingBubbles = fallingBubbles.filter(f => {
            f.vy += GRAVITY;
            f.y += f.vy;
            f.x += f.vx;
            f.alpha -= 0.022;         // 서서히 투명해짐
            return f.alpha > 0 && f.y < CANVAS_H + BUBBLE_R * 2;
        });
    }

    // ── 렌더링 ────────────────────────────────────────────────
    // 별 배경 (고정)
    const STARS = Array.from({ length: 70 }, () => ({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H * 0.9,
        r: Math.random() * 1.4 + 0.4,
        a: Math.random() * 0.5 + 0.2,
    }));

    function render() {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // 배경
        const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        bg.addColorStop(0, '#07071a');
        bg.addColorStop(1, '#0e1c2f');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // 별
        STARS.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${s.a})`;
            ctx.fill();
        });

        // 위험선
        ctx.save();
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = 'rgba(255,68,68,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, DANGER_Y);
        ctx.lineTo(CANVAS_W, DANGER_Y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 버블 렌더 (살아있는 것)
        bubbles.forEach(b => {
            if (!b.alive) return;
            drawBubble(b.x, b.y, b.color, b.word, 1.0);
        });

        // 낙하 중인 버블
        fallingBubbles.forEach(f => {
            drawBubble(f.x, f.y, f.color, f.word, f.alpha);
        });

        // 발사체
        if (proj) drawProjectile(proj.x, proj.y, proj.color);

        // 대포
        drawCannon();
    }

    function drawBubble(x, y, color, word, alpha = 1.0) {
        ctx.save();
        ctx.globalAlpha = alpha;

        // 글로우
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;

        // 본체
        ctx.beginPath();
        ctx.arc(x, y, BUBBLE_R - 1, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.88 * alpha;
        ctx.fill();

        // 하이라이트
        const shine = ctx.createRadialGradient(x - 9, y - 9, 2, x, y, BUBBLE_R);
        shine.addColorStop(0, 'rgba(255,255,255,0.85)');
        shine.addColorStop(0.4, 'rgba(255,255,255,0.15)');
        shine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 0.6 * alpha;
        ctx.fillStyle = shine;
        ctx.beginPath();
        ctx.arc(x, y, BUBBLE_R - 1, 0, Math.PI * 2);
        ctx.fill();

        // 테두리
        ctx.globalAlpha = 0.4 * alpha;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, BUBBLE_R - 1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // 단어 텍스트
        ctx.save();
        ctx.globalAlpha = alpha;
        const fs = word.length > 5 ? 9 : word.length > 3 ? 11 : 13;
        ctx.font = `bold ${fs}px 'Pretendard', 'Apple SD Gothic Neo', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 5;
        const display = word.length > 6 ? word.slice(0, 5) + '…' : word;
        ctx.fillText(display, x, y);
        ctx.restore();
    }

    function drawProjectile(x, y, color) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 28;

        // 꼬리
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x - proj.vx * 2.5, y - proj.vy * 2.5, BUBBLE_R - 8, 0, Math.PI * 2);
        ctx.fill();

        // 본체
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.arc(x, y, BUBBLE_R - 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // 하이라이트
        const shine = ctx.createRadialGradient(x - 7, y - 7, 1, x, y, BUBBLE_R - 3);
        shine.addColorStop(0, 'rgba(255,255,255,0.9)');
        shine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = shine;
        ctx.beginPath();
        ctx.arc(x, y, BUBBLE_R - 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ── 대포 렌더링 (회전 + 색상 + 조준선) ──────────────────────
    function drawCannon() {
        const cx = CANVAS_W / 2, cy = CANVAS_H - 28;
        const barrelColor = aimTarget ? aimTarget.color : '#00d4ff';

        // 타겟 방향 각도 계산
        let angle = -Math.PI / 2; // 기본: 정면 위
        if (aimTarget) {
            angle = Math.atan2(aimTarget.y - cy, aimTarget.x - cx);
        }

        // 조준선 (점선)
        if (aimTarget) {
            ctx.save();
            ctx.setLineDash([6, 8]);
            ctx.strokeStyle = barrelColor;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = barrelColor;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(aimTarget.x, aimTarget.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // 포신 (회전)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + Math.PI / 2); // 포신이 위를 향하도록 보정
        ctx.shadowColor = barrelColor;
        ctx.shadowBlur = 22;
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = barrelColor;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-6, -34, 12, 26, 4);
        } else {
            ctx.rect(-6, -34, 12, 26);
        }
        ctx.fill();
        ctx.restore();

        // 받침대
        ctx.save();
        ctx.shadowColor = barrelColor;
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#1a2a3a';
        ctx.globalAlpha = 0.95;
        ctx.fill();
        ctx.strokeStyle = barrelColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    // ── 유틸 ──────────────────────────────────────────────────
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    return { init, shoot, aim, pause, resume, stop, getLiveWords };
})();
