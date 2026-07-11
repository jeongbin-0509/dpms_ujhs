const N = 30;
const room = document.getElementById('room');
const genderGrid = document.getElementById('gender-grid');

// state 구조에 각 자리가 공개되었는지 여부를 추적하는 revealed 배열 추가
let state = JSON.parse(localStorage.getItem('seatapp') || 'null') || {
  students: Array.from({ length: N }, (_, i) => i + 1),
  fixed: Array(N).fill(false),
  males: [],
  matchMode: 'none',
  revealed: Array(N).fill(true) // 기본 상태는 모두 공개
};

let selectedMales = [...state.males];

function save() { 
    localStorage.setItem('seatapp', JSON.stringify(state)); 
}

function sh(a) { 
    for (let i = a.length - 1; i > 0; i--) { 
        let j = Math.floor(Math.random() * (i + 1)); 
        [a[i], a[j]] = [a[j], a[i]]; 
    } 
}

// 사이드바 박스 그리기
function drawSidebar() {
  genderGrid.innerHTML = '';
  for (let i = 1; i <= N; i++) {
    let box = document.createElement('div');
    box.className = 'gender-box' + (selectedMales.includes(i) ? ' male' : '');
    box.textContent = i;
    box.onclick = () => {
      if (selectedMales.includes(i)) {
        selectedMales = selectedMales.filter(x => x !== i);
      } else {
        selectedMales.push(i);
      }
      drawSidebar();
    };
    genderGrid.appendChild(box);
  }
}

document.getElementById('gender-btn').onclick = () => {
  state.males = [...selectedMales];
  save();
  alert('성별 설정이 저장되었습니다.');
};

// 배정 옵션 버튼 이벤트 연결
const optSameBtn = document.getElementById('opt-same');
const optDiffBtn = document.getElementById('opt-diff');

function updateOptionUI() {
  optSameBtn.classList.remove('active');
  optDiffBtn.classList.remove('active');
  
  if (state.matchMode === 'same') optSameBtn.classList.add('active');
  if (state.matchMode === 'diff') optDiffBtn.classList.add('active');
}

optSameBtn.onclick = () => {
  state.matchMode = state.matchMode === 'same' ? 'none' : 'same';
  save();
  updateOptionUI();
};

optDiffBtn.onclick = () => {
  state.matchMode = state.matchMode === 'diff' ? 'none' : 'diff';
  save();
  updateOptionUI();
};

let drag = -1;
function draw() {
  room.innerHTML = '';
  let idx = 0;
  for (let c = 0; c < 3; c++) {
    let col = document.createElement('div');
    col.className = 'col';
    for (let r = 0; r < 5; r++) {
      let p = document.createElement('div');
      p.className = 'pair';
      for (let k = 0; k < 2; k++) {
        let i = idx, s = document.createElement('div');
        s.className = 'seat' + (state.fixed[i] ? ' fixed' : '');
        
        // 가림막이 쳐져 있지 않을 때만 드래그가 가능하도록 수정
        s.draggable = !state.fixed[i] && (state.revealed ? state.revealed[i] : true);
        s.dataset.i = i;
        
        // 내부 텍스트로 자리 번호 추가
        s.append(document.createTextNode(state.students[i]));
        
        // 가림막 생성 조건 처리 (고정되지 않았고 비공개 상태인 경우)
        if (!state.fixed[i] && state.revealed && !state.revealed[i]) {
            let blind = document.createElement('div');
            blind.className = 'blind';
            blind.textContent = '❓';
            blind.onclick = (e) => {
                e.stopPropagation(); // 부모(좌석) 클릭 전파 방지
                state.revealed[i] = true;
                save();
                draw();
            };
            s.appendChild(blind);
        }
        
        s.ondragstart = () => drag = i;
        s.ondragover = e => e.preventDefault();
        s.ondrop = e => {
          e.preventDefault();
          let to = i;
          if (drag < 0 || state.fixed[drag] || state.fixed[to]) return;
          [state.students[drag], state.students[to]] = [state.students[to], state.students[drag]];
          
          // 드래그 앤 드롭 시 공개 정보 배열도 연동하여 위치 변경
          if(state.revealed) {
            [state.revealed[drag], state.revealed[to]] = [state.revealed[to], state.revealed[drag]];
          }
          save();
          draw();
        };
        
        let b = document.createElement('button');
        b.className = 'pin';
        b.textContent = '📌';
        b.onclick = e => {
          e.stopPropagation();
          state.fixed[i] = !state.fixed[i];
          if(state.fixed[i] && state.revealed) state.revealed[i] = true; // 핀 고정 시 강제 즉시 공개
          save();
          draw();
        };
        s.appendChild(b);
        p.appendChild(s);
        idx++;
      }
      col.appendChild(p);
    }
    room.appendChild(col);
  }
}

// 랜덤 배정 로직 (남-여 매칭 적용)
document.getElementById('r').onclick = () => {
  let lockedStudents = [];
  for (let i = 0; i < N; i++) {
    if (state.fixed[i]) lockedStudents.push(state.students[i]);
  }
  let pool = state.students.filter(x => !lockedStudents.includes(x));

  let newStudents = [...state.students];

  if (state.matchMode === 'none') {
    sh(pool);
    let pi = 0;
    for (let i = 0; i < N; i++) {
      if (!state.fixed[i]) newStudents[i] = pool[pi++];
    }
  } else {
    let poolMales = pool.filter(x => state.males.includes(x));
    let poolFemales = pool.filter(x => !state.males.includes(x));
    sh(poolMales);
    sh(poolFemales);

    for (let pairIdx = 0; pairIdx < 15; pairIdx++) {
      let idx1 = pairIdx * 2;
      let idx2 = pairIdx * 2 + 1;
      let f1 = state.fixed[idx1];
      let f2 = state.fixed[idx2];

      if (!f1 && !f2) {
        if (state.matchMode === 'diff') {
          if (poolMales.length > 0 && poolFemales.length > 0) {
            let m = poolMales.pop(), f = poolFemales.pop();
            if (Math.random() < 0.5) { newStudents[idx1] = m; newStudents[idx2] = f; }
            else { newStudents[idx1] = f; newStudents[idx2] = m; }
          } else if (poolMales.length >= 2) {
            newStudents[idx1] = poolMales.pop(); newStudents[idx2] = poolMales.pop();
          } else if (poolFemales.length >= 2) {
            newStudents[idx1] = poolFemales.pop(); newStudents[idx2] = poolFemales.pop();
          } else {
            let rest = [...poolMales, ...poolFemales]; sh(rest);
            if(rest[0]) newStudents[idx1] = rest[0]; if(rest[1]) newStudents[idx2] = rest[1];
            poolMales = []; poolFemales = [];
          }
        } else if (state.matchMode === 'same') {
          if (poolMales.length >= 2) {
            newStudents[idx1] = poolMales.pop(); newStudents[idx2] = poolMales.pop();
          } else if (poolFemales.length >= 2) {
            newStudents[idx1] = poolFemales.pop(); newStudents[idx2] = poolFemales.pop();
          } else {
            let rest = [...poolMales, ...poolFemales]; sh(rest);
            if(rest[0]) newStudents[idx1] = rest[0]; if(rest[1]) newStudents[idx2] = rest[1];
            poolMales = []; poolFemales = [];
          }
        }
      }
      else if (!f1 || !f2) {
        let openIdx = !f1 ? idx1 : idx2;
        let fixedIdx = f1 ? idx1 : idx2;
        let isFixedMale = state.males.includes(state.students[fixedIdx]);

        if (state.matchMode === 'diff') {
          if (isFixedMale) {
            if (poolFemales.length > 0) newStudents[openIdx] = poolFemales.pop();
            else if (poolMales.length > 0) newStudents[openIdx] = poolMales.pop();
          } else {
            if (poolMales.length > 0) newStudents[openIdx] = poolMales.pop();
            else if (poolFemales.length > 0) newStudents[openIdx] = poolFemales.pop();
          }
        } else if (state.matchMode === 'same') {
          if (isFixedMale) {
            if (poolMales.length > 0) newStudents[openIdx] = poolMales.pop();
            else if (poolFemales.length > 0) newStudents[openIdx] = poolFemales.pop();
          } else {
            if (poolFemales.length > 0) newStudents[openIdx] = poolFemales.pop();
            else if (poolMales.length > 0) newStudents[openIdx] = poolMales.pop();
          }
        }
      }
    }
  }

  state.students = newStudents;
  
  // 랜덤 배정 완료 시 고정석 외 모든 일반 좌석을 비공개(가림막 작동) 상태로 리셋
  state.revealed = Array(N).fill(false);
  for (let i = 0; i < N; i++) {
    if (state.fixed[i]) state.revealed[i] = true;
  }

  save();
  draw();
};

// 일괄공개 버튼 이벤트 연결
document.getElementById('reveal-all-btn').onclick = () => {
  state.revealed = Array(N).fill(true);
  save();
  draw();
};

// 초기화 실행
drawSidebar();
updateOptionUI();
draw();