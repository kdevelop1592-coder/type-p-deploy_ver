// 게임 요소 모듈 (레벨, EXP, 뱃지, 콤보)
const Game = (() => {

    // 레벨 테이블 (누적 EXP 기준)
    const LEVEL_TABLE = [
        0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
        4000, 5000, 6200, 7600, 9200, 11000, 13200, 15700, 18500, 21600
    ];

    const LEVEL_TITLES = [
        '초보자', '독수리타법', '한손잡이', '열손가락', '자판사냥꾼',
        '속도광', '빛의손가락', '타자기사', '연타장인', '손끝마법사',
        '키보드워리어', '타자고수', '빠른손', '순간타격', '연속정타',
        '타자전문가', '디지털닌자', '타자달인', '속도의제왕', '타자왕'
    ];

    // 뱃지 정의
    const BADGES = [
        { id: 'first_session', name: '첫 연습', desc: '첫 번째 연습 완료', icon: '🎯' },
        { id: 'streak_7', name: '7일 연속', desc: '7일 연속 연습', icon: '🔥' },
        { id: 'wpm_100', name: '100 타수', desc: '100 타수 달성', icon: '⚡' },
        { id: 'wpm_200', name: '200 타수', desc: '200 타수 달성', icon: '🚀' },
        { id: 'accuracy_99', name: '정확도 99%', desc: '정확도 99% 달성', icon: '🎖️' },
        { id: 'keys_10000', name: '1만 타', desc: '누적 1만 타 달성', icon: '💎' },
        { id: 'keys_100000', name: '10만 타', desc: '누적 10만 타 달성', icon: '👑' },
    ];

    // EXP 계산 (WPM, 정확도, 모드에 따라)
    function calcExp(result) {
        const modeMultiplier = { word: 1, sentence: 1.5, paragraph: 2.5 };
        const base = Math.floor(result.wpm * (result.accuracy / 100));
        return Math.floor(base * (modeMultiplier[result.mode] || 1));
    }

    // 레벨 계산
    function calcLevel(totalExp) {
        let level = 1;
        for (let i = 0; i < LEVEL_TABLE.length; i++) {
            if (totalExp >= LEVEL_TABLE[i]) level = i + 1;
            else break;
        }
        return Math.min(level, 20);
    }

    // 다음 레벨까지 남은 EXP
    function expToNextLevel(totalExp) {
        const level = calcLevel(totalExp);
        if (level >= 20) return 0;
        const nextThreshold = LEVEL_TABLE[level]; // level은 1-based, 인덱스는 level
        return nextThreshold - totalExp;
    }

    // 현재 레벨 EXP 진행률 (0~100%)
    function levelProgress(totalExp) {
        const level = calcLevel(totalExp);
        if (level >= 20) return 100;
        const current = LEVEL_TABLE[level - 1];
        const next = LEVEL_TABLE[level];
        return Math.floor(((totalExp - current) / (next - current)) * 100);
    }

    function getLevelTitle(level) {
        return LEVEL_TITLES[Math.min(level - 1, 19)];
    }

    // 달성한 뱃지 확인
    function checkBadges(profile, result, totalKeystrokes) {
        const earned = [];
        const existing = profile.badges || [];

        const check = (id) => !existing.includes(id);

        if (check('first_session')) earned.push('first_session');
        if (check('wpm_100') && result.wpm >= 100) earned.push('wpm_100');
        if (check('wpm_200') && result.wpm >= 200) earned.push('wpm_200');
        if (check('accuracy_99') && result.accuracy >= 99) earned.push('accuracy_99');
        if (check('keys_10000') && totalKeystrokes >= 10000) earned.push('keys_10000');
        if (check('keys_100000') && totalKeystrokes >= 100000) earned.push('keys_100000');

        return earned;
    }

    // 결과 화면 HTML 생성
    function renderResult(result, expGained, newLevel, newBadges) {
        const gradeEmoji = result.accuracy >= 95 ? '🏆' : result.accuracy >= 80 ? '👍' : '💪';
        const badgeHtml = newBadges.map(id => {
            const b = BADGES.find(x => x.id === id);
            return b ? `<div class="badge-earned">${b.icon} ${b.name} 획득!</div>` : '';
        }).join('');

        return `
      <div class="result-card">
        <div class="result-emoji">${gradeEmoji}</div>
        <h2 class="result-title">연습 완료!</h2>
        <div class="result-stats">
          <div class="stat-item">
            <span class="stat-label">최고 타수 (CPM)</span>
            <span class="stat-value" style="color:var(--accent-purple)">${result.maxWpm || result.wpm}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">평균 타수 (CPM)</span>
            <span class="stat-value" style="color:var(--accent-cyan)">${result.wpm}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">오타 비율</span>
            <span class="stat-value" style="color:var(--accent-red)">${result.errorRatio || 0}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">정확도</span>
            <span class="stat-value" style="color:var(--accent-green)">${result.accuracy}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">시간</span>
            <span class="stat-value">${result.duration}초</span>
          </div>
        </div>
        <div class="exp-gained">+${expGained} EXP 획득! (Lv.${newLevel})</div>
        ${badgeHtml ? `<div class="badges-earned">${badgeHtml}</div>` : ''}
        <div class="result-actions">
          <button class="btn-primary" onclick="startNextSession()">다시 연습</button>
          <button class="btn-secondary" onclick="showMyRecords()">내 기록</button>
        </div>
      </div>
    `;
    }

    // 콤보 카운터 클래스
    class ComboCounter {
        constructor(displayEl) {
            this.count = 0;
            this.displayEl = displayEl;
        }
        hit() {
            this.count++;
            if (this.count >= 10 && this.displayEl) {
                this.displayEl.textContent = `🔥 ${this.count} 콤보!`;
                this.displayEl.classList.add('combo-active');
                if (this.count % 10 === 0) this.displayEl.classList.add('combo-milestone');
                else this.displayEl.classList.remove('combo-milestone');
            }
        }
        miss() {
            this.count = 0;
            if (this.displayEl) {
                this.displayEl.textContent = '';
                this.displayEl.classList.remove('combo-active', 'combo-milestone');
            }
        }
        reset() { this.miss(); }
    }

    return {
        calcExp, calcLevel, expToNextLevel, levelProgress,
        getLevelTitle, checkBadges, renderResult,
        BADGES, LEVEL_TITLES, ComboCounter
    };
})();
