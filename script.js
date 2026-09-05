/* =========================================================
   지역상생 여행혜택 최적화 서비스 — 웹 MVP
   PRD 6번(화면 구성) 순서 그대로 구현: 랜딩 → 입력 → 처리 → 결과 → 피드백 → 완료
   ========================================================= */

/* ---------------------------------------------------------
   0. 데모 데이터 (사전 정리된 지자체 지원조건 데이터셋)

   ⚠️ 아래 지역·환급률·상한액은 실제 공고를 그대로 옮긴 것이 아니라,
   MVP 흐름 검증을 위해 단순화한 가상의 예시 값입니다.
   실제 서비스에서는 각 지자체 공식 공고문을 근거로 이 데이터를 채워야 합니다.
   PRD 4번(AI 기능 스펙)의 "추정·해석·보완 금지" 원칙에 따라,
   여기 없는 지역이나 조건은 절대로 만들어내지 않고 '정보 없음'으로 표시합니다.
--------------------------------------------------------- */
const REGION_DATASET = [
  {
    id: 'pyeongchang', name: '강원 평창군', sido: '강원특별자치도',
    refundRate: 0.5, capPerPerson: 100000, capGroup: 200000,
    deadline: '2026-10-18',
    conditions: ['인구감소지역 여행자 대상', '관광지 2개소 이상 방문', '숙박 1박 이상'],
    source: '대한민국 구석구석 반값여행 공고 (데모 요약)',
    complete: true
  },
  {
    id: 'yeongwol', name: '강원 영월군', sido: '강원특별자치도',
    refundRate: 0.5, capPerPerson: 100000, capGroup: 200000,
    deadline: '2026-09-30',
    conditions: ['인구감소지역 여행자 대상', '모바일 지역사랑상품권으로 환급'],
    source: '대한민국 구석구석 반값여행 공고 (데모 요약)',
    complete: true
  },
  {
    id: 'jecheon', name: '충북 제천시', sido: '충청북도',
    refundRate: 0.5, capPerPerson: 100000, capGroup: 200000,
    deadline: '2026-09-16',
    conditions: ['회차별 선착순 접수(조기 마감 가능)', '지정 앱·가맹점 결제분만 인정'],
    source: '대한민국 구석구석 반값여행 공고 (데모 요약)',
    complete: true
  },
  {
    id: 'gangjin', name: '전남 강진군', sido: '전라남도',
    refundRate: 0.5, capPerPerson: 100000, capGroup: 200000,
    deadline: '2026-08-31',
    conditions: ['관광지 2개소 이상 방문', '모바일 강진사랑상품권(Chak) 결제분만 인정'],
    source: '대한민국 구석구석 반값여행 공고 (데모 요약)',
    complete: true
  },
  {
    id: 'wando', name: '전남 완도군', sido: '전라남도',
    refundRate: 0.5, capPerPerson: 100000, capGroup: 200000,
    deadline: '2026-10-31',
    conditions: ['인구감소지역 여행자 대상', '숙박 증빙 필수'],
    source: '대한민국 구석구석 반값여행 공고 (데모 요약)',
    complete: true
  },
  {
    id: 'miryang', name: '경남 밀양시', sido: '경상남도',
    refundRate: 0.5, capPerPerson: 100000, capGroup: 200000,
    deadline: '2026-11-30',
    conditions: ['사전 여행계획 승인 필요', '영수증 등 증빙자료 제출'],
    source: '대한민국 구석구석 반값여행 공고 (데모 요약)',
    complete: true
  },
  {
    id: 'namhae', name: '경남 남해군', sido: '경상남도',
    refundRate: 0.5, capPerPerson: 100000, capGroup: 200000,
    deadline: '2026-09-20',
    conditions: ['인구감소지역 여행자 대상', '2인 이상 시 단체 상한 적용'],
    source: '대한민국 구석구석 반값여행 공고 (데모 요약)',
    complete: true
  },
  {
    id: 'gochang', name: '전북 고창군', sido: '전북특별자치도',
    refundRate: 0.5, capPerPerson: 100000, capGroup: 200000,
    deadline: '2026-09-25',
    conditions: ['인구감소지역 여행자 대상', '지정 가맹점 결제분만 인정'],
    source: '대한민국 구석구석 반값여행 공고 (데모 요약)',
    complete: true
  },
  {
    id: 'geochang', name: '경남 거창군', sido: '경상남도',
    refundRate: null, capPerPerson: null, capGroup: null,
    deadline: null,
    conditions: [],
    source: '',
    complete: false // 정보 없음 상태를 보여주기 위한 데모 항목
  }
];

const ASSUMED_SPEND_PER_PERSON = 150000; // 예산 미입력 시 데모 가정값(1인당)

/* ---------------------------------------------------------
   1. 상태 및 화면 전환
--------------------------------------------------------- */
const state = {
  input: null,        // { region, date, people, budget }
  results: [],         // 계산된 지역 리스트
  interestedIds: new Set(),
  feedback: { helpful: null, wouldChange: null }
};

const screens = ['landing', 'input', 'loading', 'result', 'feedback', 'done'];
const stepScreens = ['input', 'loading', 'result', 'feedback']; // 진행 단계 표시 대상

function showScreen(name){
  screens.forEach(s => {
    const el = document.getElementById('screen-' + s);
    if (el) el.hidden = (s !== name);
  });

  const stepsNav = document.getElementById('steps');
  if (stepScreens.includes(name)){
    stepsNav.hidden = false;
    document.querySelectorAll('.steps__item').forEach(item => {
      const step = item.dataset.step;
      item.classList.remove('is-active', 'is-done');
      const curIdx = stepScreens.indexOf(name);
      const itemIdx = stepScreens.indexOf(step);
      if (itemIdx === curIdx) item.classList.add('is-active');
      else if (itemIdx < curIdx) item.classList.add('is-done');
    });
  } else {
    stepsNav.hidden = true;
  }

  window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ---------------------------------------------------------
   2. 화면 1 → 2: 시작하기
--------------------------------------------------------- */
document.getElementById('btn-start').addEventListener('click', () => {
  showScreen('input');
});

/* ---------------------------------------------------------
   3. 화면 2: 조건 입력 → 검증 → 처리 화면으로
--------------------------------------------------------- */
document.getElementById('form-input').addEventListener('submit', (e) => {
  e.preventDefault();
  const region = document.getElementById('input-region').value;
  const date = document.getElementById('input-date').value;
  const people = parseInt(document.getElementById('input-people').value, 10);
  const budgetRaw = document.getElementById('input-budget').value;
  const budget = budgetRaw ? parseInt(budgetRaw, 10) : null;
  const consent = document.getElementById('input-consent').checked;

  const errorEl = document.getElementById('input-error');

  if (!region || !date || !people || people < 1) {
    errorEl.textContent = '거주지, 여행 날짜, 인원을 모두 입력해주세요.';
    errorEl.hidden = false;
    return;
  }
  if (!consent) {
    errorEl.textContent = '다음 단계로 진행하려면 동의가 필요해요.';
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;

  state.input = { region, date, people, budget };

  showScreen('loading');

  // AI 처리 단계를 시각적으로 보여주기 위한 지연 (실제 계산은 즉시 수행됨)
  setTimeout(() => {
    state.results = computeResults(state.input);
    renderResults();
    showScreen('result');
    logToSheet('input_submitted', {
      region: state.input.region,
      date: state.input.date,
      people: state.input.people,
      budget: state.input.budget ?? '',
      matched_region_count: state.results.filter(r => r.complete).length,
      matched_region_names: state.results.filter(r => r.complete).map(r => r.name).join(', ')
    });
  }, 900);
});

/* ---------------------------------------------------------
   4. 계산 로직 (규칙 기반, AI가 임의로 추정하지 않음)
--------------------------------------------------------- */
function computeResults(input){
  const totalSpend = input.budget && input.budget > 0
    ? input.budget
    : ASSUMED_SPEND_PER_PERSON * input.people;
  const usedAssumedBudget = !(input.budget && input.budget > 0);

  return REGION_DATASET.map(region => {
    if (!region.complete) {
      return {
        ...region,
        complete: false,
        expectedRefund: null,
        perceivedCost: null,
        usedAssumedBudget
      };
    }

    const cap = input.people >= 2 ? region.capGroup : region.capPerPerson;
    const rawRefund = totalSpend * region.refundRate;
    const expectedRefund = Math.min(rawRefund, cap);
    const perceivedCost = totalSpend - expectedRefund;

    const deadlinePassed = region.deadline
      ? new Date(input.date) > new Date(region.deadline)
      : false;

    const sameSido = region.sido === input.region;

    return {
      ...region,
      complete: true,
      totalSpend,
      expectedRefund,
      perceivedCost,
      deadlinePassed,
      sameSido,
      usedAssumedBudget
    };
  });
}

/* ---------------------------------------------------------
   5. 화면 4: 결과 렌더링
--------------------------------------------------------- */
function renderResults(){
  const listEl = document.getElementById('result-list');
  const summaryEl = document.getElementById('result-summary');
  const sortSelect = document.getElementById('sort-select');

  const matchedCount = state.results.filter(r => r.complete).length;
  const anyAssumed = state.results.some(r => r.usedAssumedBudget);
  summaryEl.textContent =
    `${matchedCount}개 지역의 정보를 확인했어요.` +
    (anyAssumed ? ` (예산을 입력하지 않아 1인당 ${ASSUMED_SPEND_PER_PERSON.toLocaleString()}원으로 가정해 계산했어요 · 데모 가정값)` : '');

  function draw(){
    const sorted = [...state.results].sort((a, b) => {
      if (!a.complete) return 1;
      if (!b.complete) return -1;
      if (sortSelect.value === 'refund-desc') return b.expectedRefund - a.expectedRefund;
      return a.perceivedCost - b.perceivedCost;
    });

    listEl.innerHTML = '';
    sorted.forEach(r => listEl.appendChild(renderCard(r)));
  }

  sortSelect.onchange = draw;
  draw();
}

function renderCard(r){
  const li = document.createElement('li');
  li.className = 'region-card' + (!r.complete ? ' is-unavailable' : '');

  if (!r.complete) {
    li.innerHTML = `
      <div>
        <p class="region-card__name">${r.name}</p>
        <div class="region-card__badges"><span class="badge badge--muted">정보 없음</span></div>
        <p class="region-card__source">이 지역은 데이터가 아직 준비되지 않아 계산할 수 없어요. 공식 공고를 직접 확인해주세요.</p>
      </div>
      <div></div>
    `;
    return li;
  }

  const badges = [];
  if (r.sameSido) badges.push('<span class="badge badge--warn">동일 시/도 거주자는 참여가 제한될 수 있어요</span>');
  if (r.deadlinePassed) badges.push('<span class="badge badge--muted">이번 차수 마감 지남</span>');
  badges.push('<span class="badge">데모 데이터</span>');

  const isSaved = state.interestedIds.has(r.id);

  li.innerHTML = `
    <div>
      <p class="region-card__name">${r.name}</p>
      <div class="region-card__badges">${badges.join('')}</div>
      <ul class="region-card__conditions">
        ${r.conditions.map(c => `<li>${c}</li>`).join('')}
      </ul>
      <p class="region-card__source">출처: ${r.source}</p>
      <button type="button" class="region-card__save${isSaved ? ' is-active' : ''}" data-id="${r.id}">
        ${isSaved ? '관심 지역으로 저장됨' : '관심 지역으로 저장'}
      </button>
    </div>
    <div class="region-card__numbers">
      <p class="region-card__cost-label">체감 여행비</p>
      <p class="region-card__cost">${Math.round(r.perceivedCost).toLocaleString()}원</p>
      <p class="region-card__refund">예상 환급액 ${Math.round(r.expectedRefund).toLocaleString()}원</p>
    </div>
  `;

  li.querySelector('.region-card__save').addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    if (state.interestedIds.has(id)) {
      state.interestedIds.delete(id);
    } else {
      state.interestedIds.add(id);
      logToSheet('region_saved', { region_id: id });
    }
    renderResults(); // 배지 상태 갱신을 위해 다시 그림
  });

  return li;
}

/* ---------------------------------------------------------
   6. 화면 4 → 5
--------------------------------------------------------- */
document.getElementById('btn-to-feedback').addEventListener('click', () => {
  showScreen('feedback');
});

/* ---------------------------------------------------------
   7. 화면 5: 피드백 선택 및 제출
--------------------------------------------------------- */
document.querySelectorAll('.btn-group').forEach(group => {
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    const question = group.dataset.question;
    group.querySelectorAll('.chip').forEach(c => c.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    if (question === 'helpful') state.feedback.helpful = btn.dataset.value;
    if (question === 'would-change') state.feedback.wouldChange = btn.dataset.value;
  });
});

document.getElementById('btn-submit-feedback').addEventListener('click', () => {
  const errorEl = document.getElementById('feedback-error');
  if (!state.feedback.helpful || !state.feedback.wouldChange) {
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;

  logToSheet('feedback_submitted', {
    helpful: state.feedback.helpful,
    would_change_destination: state.feedback.wouldChange,
    interested_region_ids: Array.from(state.interestedIds).join(', '),
    submitted_at: new Date().toISOString()
  });

  showScreen('done');
});

/* ---------------------------------------------------------
   8. Google Sheets 로깅 (선택적, 실패해도 서비스 흐름은 막지 않음)

   설정 방법:
   1) Google Sheets를 새로 만든다.
   2) 확장 프로그램 > Apps Script 에서 아래와 같은 doPost 함수를 붙여넣는다.
      (하단 "Apps Script 참고 코드" 안내 참고)
   3) 배포 > 웹 앱으로 배포 → 액세스 권한 "모든 사용자"로 설정 후 URL을 복사한다.
   4) 아래 SHEET_WEBAPP_URL 값에 복사한 URL을 붙여넣는다.

   URL을 비워두면(기본 상태) 네트워크 호출 없이 콘솔에만 기록되어,
   Sheets 없이도 화면 흐름 전체를 바로 테스트할 수 있다.
--------------------------------------------------------- */
const SHEET_WEBAPP_URL = ''; // ← 여기에 Apps Script 웹앱 URL을 붙여넣으세요

function logToSheet(eventName, payload){
  const record = { event: eventName, timestamp: new Date().toISOString(), ...payload };

  if (!SHEET_WEBAPP_URL) {
    console.log('[Sheets 연동 미설정 · 콘솔 기록]', record);
    return;
  }

  fetch(SHEET_WEBAPP_URL, {
    method: 'POST',
    mode: 'no-cors', // Apps Script 웹앱 특성상 no-cors로 전송(응답은 읽지 않음)
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(record)
  }).catch(err => {
    console.warn('Sheets 기록 실패(서비스 흐름에는 영향 없음):', err);
  });
}
