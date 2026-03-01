// 타자 입력 처리 엔진 (한글/영문 WPM·정확도 측정)
const TypingEngine = (() => {

    let state = {
        text: '',           // 연습 텍스트
        typed: '',          // 현재 입력값
        startTime: null,    // 시작 시각
        endTime: null,
        errors: 0,          // 오타 횟수
        totalTyped: 0,      // 총 입력 키 수
        isRunning: false,
        mode: 'sentence',   // word | sentence | paragraph
        lang: 'ko',
        onComplete: null,   // 완료 콜백
        onUpdate: null,     // 업데이트 콜백
    };

    // 텍스트 초기화
    function init({ text, mode, lang, onComplete, onUpdate }) {
        state = {
            text: text.trim(),
            typed: '',
            startTime: null,
            endTime: null,
            errors: 0,
            totalTyped: 0,
            maxWpm: 0,
            isRunning: false,
            mode, lang, onComplete, onUpdate
        };
    }

    // 입력 처리 (input 이벤트에 연결)
    function processInput(inputEl, displayEl, statsEl) {
        const value = inputEl.value;

        // 첫 입력 시 타이머 시작
        if (!state.isRunning && value.length > 0) {
            state.startTime = Date.now();
            state.isRunning = true;
        }

        state.typed = value;
        state.totalTyped = Math.max(state.totalTyped, value.length);

        // 오타 계산 (현재 위치까지 틀린 문자 수)
        let errors = 0;
        for (let i = 0; i < value.length; i++) {
            if (value[i] !== state.text[i]) errors++;
        }
        state.errors = errors;

        // 디스플레이 업데이트
        renderText(displayEl, value);

        // 통계 업데이트
        const elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
        const wpm = calcWPM(value.length - state.errors, elapsed, state.lang);
        const accuracy = calcAccuracy(value.length, state.errors);

        // 최고 속도 기록
        if (wpm > state.maxWpm) {
            state.maxWpm = wpm;
        }

        if (statsEl && state.onUpdate) {
            state.onUpdate({ wpm, accuracy, elapsed: Math.floor(elapsed) });
        }

        // 완료 확인 로직은 자동 검사에서 제외 (사용자가 엔터 쳐야 완료)
    }

    // 외부에서 완료 검사를 트리거할 수 있게 제공
    function checkComplete(inputEl) {
        const val = inputEl.value.replace(/\r?\n|\r/g, '').trimEnd();
        const target = state.text.trimEnd();

        if (val === target) {
            const elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
            // 오타 수는 현재 텍스트 길이를 바탕으로 재확인
            let finalErrors = 0;
            for (let i = 0; i < val.length; i++) {
                if (val[i] !== state.text[i]) finalErrors++;
            }
            complete(elapsed, state.totalTyped, finalErrors);
            return true;
        }
        return false;
    }

    // 텍스트 디스플레이 렌더링 (정타: 초록, 오타: 빨강, 미입력: 기본)
    function renderText(displayEl, typed) {
        if (!displayEl) return;
        let html = '';
        for (let i = 0; i < state.text.length; i++) {
            const ch = state.text[i] === ' ' ? '&nbsp;' : state.text[i];
            if (i < typed.length) {
                if (typed[i] === state.text[i]) {
                    html += `<span class="correct">${ch}</span>`;
                } else {
                    html += `<span class="incorrect">${ch}</span>`;
                }
            } else if (i === typed.length) {
                html += `<span class="cursor">${ch}</span>`;
            } else {
                html += `<span class="pending">${ch}</span>`;
            }
        }
        displayEl.innerHTML = html;
    }

    // WPM 계산 (기존 방식 대신 한컴타자연습 기준 '분당 타수'로 변경)
    // 변수명은 호환성을 위해 wpm을 유지하지만 실제 값은 CPM입니다.
    function calcWPM(correctChars, elapsedSec, lang) {
        if (elapsedSec < 1) return 0;
        // 1분당 타격 수 (CPM)
        return Math.round((correctChars / elapsedSec) * 60);
    }

    // CPM 계산 (분당 타수)
    function calcCPM(correctChars, elapsedSec) {
        if (elapsedSec < 1) return 0;
        return Math.round((correctChars / elapsedSec) * 60);
    }

    // 정확도 계산
    function calcAccuracy(total, errors) {
        if (total === 0) return 100;
        return Math.max(0, Math.round(((total - errors) / total) * 100));
    }

    // 완료 처리
    function complete(elapsed, totalTyped, errors) {
        if (state.endTime) return;
        state.endTime = Date.now();
        state.isRunning = false;

        const correctChars = totalTyped - errors;
        const errorRatio = totalTyped > 0 ? ((errors / totalTyped) * 100).toFixed(1) : "0.0";

        const result = {
            mode: state.mode,
            lang: state.lang,
            wpm: calcWPM(correctChars, elapsed, state.lang),
            maxWpm: state.maxWpm,
            cpm: calcCPM(correctChars, elapsed),
            accuracy: calcAccuracy(totalTyped, errors),
            errorRatio: parseFloat(errorRatio),
            duration: Math.floor(elapsed),
            keystrokes: totalTyped,
            errors,
        };

        if (state.onComplete) state.onComplete(result);
    }

    // 현재 상태 반환
    function getState() { return { ...state }; }

    // 타이머 포맷 (초 → MM:SS)
    function formatTime(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    return { init, processInput, renderText, calcWPM, calcCPM, calcAccuracy, getState, formatTime, checkComplete };
})();
