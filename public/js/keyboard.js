// 화면 키보드 모듈 — 키 피드백 + 다음 키 안내
const KeyboardDisplay = (() => {

    // ── 키보드 레이아웃 정의 ──────────────────────────────

    // 영문 QWERTY (표시문자, 실제 key값)
    const EN_ROWS = [
        ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
        ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
        ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
        ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift↑'],
        ['Space']
    ];

    // 한글 두벌식 배열 (각 키의 한글 문자)
    // 실제 key 이벤트에서 영문 키코드를 한글 문자로 매핑
    const KO_MAP = {
        'q': 'ㅂ', 'w': 'ㅈ', 'e': 'ㄷ', 'r': 'ㄱ', 't': 'ㅅ',
        'y': 'ㅛ', 'u': 'ㅕ', 'i': 'ㅑ', 'o': 'ㅐ', 'p': 'ㅔ',
        'a': 'ㅁ', 's': 'ㄴ', 'd': 'ㅇ', 'f': 'ㄹ', 'g': 'ㅎ',
        'h': 'ㅗ', 'j': 'ㅓ', 'k': 'ㅏ', 'l': 'ㅣ',
        'z': 'ㅋ', 'x': 'ㅌ', 'c': 'ㅊ', 'v': 'ㅍ', 'b': 'ㅠ', 'n': 'ㅜ', 'm': 'ㅡ',
        // Shift (쌍자음/이중모음)
        'Q': 'ㅃ', 'W': 'ㅉ', 'E': 'ㄸ', 'R': 'ㄲ', 'T': 'ㅆ',
        'O': 'ㅒ', 'P': 'ㅖ',
    };

    const KO_ROWS = [
        ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
        ['Tab', 'ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ', '[', ']', '\\'],
        ['Caps', 'ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ', ';', "'", 'Enter'],
        ['Shift', 'ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ', ',', '.', '/', 'Shift↑'],
        ['Space']
    ];

    // 키 너비 클래스 매핑
    const WIDE_KEYS = {
        'Backspace': 'key-wide', 'Tab': 'key-wide', 'Caps': 'key-wide',
        'Enter': 'key-wide', 'Shift': 'key-wider', 'Shift↑': 'key-wider', 'Space': 'key-space'
    };

    // 실물 key → 화면 키 ID 매핑
    const KEY_ID_MAP = {
        'Backspace': 'Backspace', 'Tab': 'Tab', 'CapsLock': 'Caps',
        'Enter': 'Enter', 'ShiftLeft': 'Shift', 'ShiftRight': 'Shift↑',
        ' ': 'Space',
    };
    // 영문 소문자 → 키 ID
    'qwertyuiopasdfghjklzxcvbnm'.split('').forEach(c => KEY_ID_MAP[c] = c);
    '`1234567890-=[]\\\';,./'.split('').forEach(c => KEY_ID_MAP[c] = c);

    let container = null;
    let currentLang = 'en';
    let activeTimeout = null;

    // ── 렌더링 ────────────────────────────────────────────

    function render(el, lang = 'en') {
        container = el;
        currentLang = lang;
        const rows = lang === 'ko' ? KO_ROWS : EN_ROWS;

        el.innerHTML = '';
        el.className = 'keyboard-wrap';

        rows.forEach((row, ri) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'kb-row';
            row.forEach(key => {
                const btn = document.createElement('div');
                btn.className = 'kb-key ' + (WIDE_KEYS[key] || '');
                btn.dataset.key = key;
                btn.textContent = key === 'Space' ? '' : key;
                rowEl.appendChild(btn);
            });
            el.appendChild(rowEl);
        });
    }

    // ── 키 피드백 ─────────────────────────────────────────

    // 누른 키 하이라이트 (녹색 = 정타, 빨강 = 오타)
    function pressKey(keyId, correct = true) {
        if (!container) return;
        // code → 화면 key 문자 변환
        let displayKey = KEY_ID_MAP[keyId] || keyId;

        // 한글 모드일 때 영문 keyId를 한글 문자로 변환
        if (currentLang === 'ko' && KO_MAP[displayKey]) {
            displayKey = KO_MAP[displayKey];
        } else if (currentLang === 'ko' && KO_MAP[displayKey.toLowerCase()]) { // 'A' (Shift+A) -> 'ㅁ' 등으로 떨어질 경우의 대비 (하지만 KO_MAP 대문자는 쌍자음 지원)
            displayKey = KO_MAP[displayKey];
        }

        // 따옴표나 백슬래시 등의 특수문자 대응
        let escapedKey = displayKey;
        if (displayKey === '\\') escapedKey = '\\\\';
        if (displayKey === "'") escapedKey = "\\'";
        if (displayKey === '"') escapedKey = '\\"';

        try {
            const el = container.querySelector(`[data-key="${escapedKey}"]`);
            if (!el) return;

            el.classList.remove('key-correct', 'key-error');
            // reflow를 강제로 발생시켜 짧은 시간에 연속으로 같은 키를 누를 때 애니메이션 초기화
            void el.offsetWidth;
            el.classList.add(correct ? 'key-correct' : 'key-error');

            // Set timeout for the specific key element instead of a global setTimeout
            // to allow multiple keys to be highlighted simultaneously
            if (el.dataset.activeTimeout) {
                clearTimeout(parseInt(el.dataset.activeTimeout));
            }
            const timeoutId = setTimeout(() => {
                el.classList.remove('key-correct', 'key-error');
                delete el.dataset.activeTimeout;
            }, 180);
            el.dataset.activeTimeout = timeoutId;
        } catch (e) {
            console.error('Invalid selector for key feedback:', displayKey, e);
        }
    }

    // 다음에 눌러야 할 키 안내 (파란 테두리)
    function highlightNext(char) {
        if (!container) return;
        // 기존 힌트 제거
        container.querySelectorAll('.key-hint').forEach(e => e.classList.remove('key-hint'));
        if (!char) return;

        const rows = currentLang === 'ko' ? KO_ROWS : EN_ROWS;
        let found = false;
        rows.forEach(row => {
            row.forEach(key => {
                if (currentLang === 'ko') {
                    // 한글 문자를 KO_MAP 역방향으로 찾기
                    const match = Object.entries(KO_MAP).find(([k, v]) => v === char);
                    if (match && key === match[1]) {
                        const el = container.querySelector(`[data-key="${key}"]`);
                        if (el && !found) { el.classList.add('key-hint'); found = true; }
                    }
                }
                // 영문 직접 매핑
                if (key.toLowerCase() === char.toLowerCase()) {
                    const el = container.querySelector(`[data-key="${key}"]`);
                    if (el && !found) { el.classList.add('key-hint'); found = true; }
                }
                // Space
                if (char === ' ' && key === 'Space') {
                    const el = container.querySelector(`[data-key="Space"]`);
                    if (el && !found) { el.classList.add('key-hint'); found = true; }
                }
            });
        });
    }

    // 언어 전환 시 키보드 재렌더
    function setLang(lang) {
        if (container) render(container, lang);
    }

    // 전체 키 초기화
    function reset() {
        if (!container) return;
        container.querySelectorAll('.kb-key').forEach(el => {
            el.classList.remove('key-correct', 'key-error', 'key-hint');
        });
    }

    return { render, pressKey, highlightNext, setLang, reset };
})();
