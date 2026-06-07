/* =============================================================
   PIRANESI HOUSE — Interactions
   바닐라 JS. 각 기능을 독립 init 함수로 분리해 재사용/유지보수 용이
   ============================================================= */

/* 1) 스크롤 시 내비 배경 전환
   히어로 위에서는 투명(blend), 스크롤하면 솔리드 배경으로 */
function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const onScroll = () => {
    // 임계값 60px — 히어로 상단을 벗어났는지 판단
    nav.classList.toggle('nav--scrolled', window.scrollY > 60);
  };
  // passive: true → 스크롤 성능 최적화 (preventDefault 미사용 명시)
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* 2) 모바일 햄버거 토글 */
function initNavToggle() {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');
  if (!nav || !toggle) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('nav--open');
    toggle.textContent = open ? 'CLOSE' : 'MENU';
    // 메뉴 열림 시 배경 스크롤 잠금
    document.body.style.overflow = open ? 'hidden' : '';
  });
  // 링크 클릭 시 자동 닫힘
  nav.querySelectorAll('.nav__links a').forEach((a) =>
    a.addEventListener('click', () => {
      nav.classList.remove('nav--open');
      toggle.textContent = 'MENU';
      document.body.style.overflow = '';
    })
  );
}

/* 3) 스크롤 진입 시 요소 페이드/슬라이드 인
   IntersectionObserver로 뷰포트 진입 감지 → .is-visible 부여 */
function initScrollReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length || !('IntersectionObserver' in window)) {
    // 폴백: 관찰 불가 환경에서는 즉시 표시
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target); // 1회만 실행 → 비용 절감
        }
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
  );
  els.forEach((el) => io.observe(el));
}

/* 4) (Journal) 히어로 패럴랙스 — 배경이 스크롤보다 느리게 이동
   transform만 조작해 리플로우 없이 GPU 가속 */
function initParallax() {
  const layers = document.querySelectorAll('[data-parallax]');
  if (!layers.length) return;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    layers.forEach((el) => {
      // 다이브 진행 중인 히어로의 배경은 건드리지 않음 (줌 변환 보존)
      const h = el.closest('.hero');
      if (h && h.classList.contains('is-diving')) return;
      const speed = parseFloat(el.dataset.parallax) || 0.3;
      el.style.transform = `translate3d(0, ${y * speed}px, 0) scale(1.08)`;
    });
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(update); // 프레임당 1회로 제한
        ticking = true;
      }
    },
    { passive: true }
  );
}

/* 5) (Home) monopo식 인덱스 — 행 호버 시 프리뷰 이미지가 커서를 따라옴
   각 행의 data-img 를 읽어 고정 위치 프리뷰에 표시 */
function initIndexPreview() {
  const list = document.querySelector('.index');
  const preview = document.querySelector('.index__preview');
  if (!list || !preview) return;
  const img = preview.querySelector('img');
  const rows = list.querySelectorAll('.index__row[data-img]');

  // 커서 추적 (rAF로 좌표 갱신을 프레임당 1회로 제한)
  let mx = 0, my = 0, raf = null;
  const move = () => {
    // 위치만 갱신 — 중앙정렬/스케일/전환은 CSS(.is-on)가 담당
    preview.style.left = mx + 'px';
    preview.style.top = my + 'px';
    raf = null;
  };
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (!raf) raf = requestAnimationFrame(move);
  }, { passive: true });

  rows.forEach((row) => {
    row.addEventListener('mouseenter', () => {
      img.src = row.dataset.img;       // 해당 챕터 이미지로 교체
      preview.classList.add('is-on');
    });
    row.addEventListener('mouseleave', () => preview.classList.remove('is-on'));
  });
}

/* 6) (Journal) 홀 마커 클릭 → 해당 홀로 '빨려들어가는' 다이브 전환
   클릭 지점을 transform-origin 으로 배경을 확대·발광시키고, 광막이 화면을
   덮은 순간 타겟 홀로 점프 → 광막이 걷히며 홀이 드러난다 */
function initJournalDive() {
  const hero = document.querySelector('.hero--dark');
  if (!hero) return;
  const bg = hero.querySelector('.hero__bg');
  const veil = document.querySelector('.dive-veil');
  const markers = hero.querySelectorAll('.marker[data-target]');
  if (!bg || !veil || !markers.length) return;

  let diving = false;
  markers.forEach((m) => {
    m.addEventListener('click', (e) => {
      e.preventDefault();
      if (diving) return;
      diving = true;

      const target = document.querySelector(m.dataset.target);
      // 클릭한 마커 중심을 히어로 기준 %로 환산 → 그 지점으로 빨려듦
      const hr = hero.getBoundingClientRect();
      const mr = m.getBoundingClientRect();
      const ox = (((mr.left + mr.width / 2) - hr.left) / hr.width) * 100;
      const oy = (((mr.top + mr.height / 2) - hr.top) / hr.height) * 100;

      // 진입 애니메이션(slowZoom)을 끄고 인라인 변환이 적용되게 함
      bg.style.animation = 'none';
      bg.style.transformOrigin = `${ox}% ${oy}%`;
      void bg.offsetWidth; // 리플로우 강제 → transition 보장

      hero.classList.add('is-diving');
      bg.style.transform = 'scale(6)';
      bg.style.filter = 'blur(12px) brightness(2)';
      veil.classList.add('is-on');

      // 광막이 화면을 덮은 시점에 타겟 홀로 즉시 점프(이동이 가려짐)
      setTimeout(() => { if (target) target.scrollIntoView(); }, 700);
      // 광막 페이드아웃 + 히어로 상태 리셋
      setTimeout(() => {
        veil.classList.remove('is-on');
        hero.classList.remove('is-diving');
        bg.style.transform = '';
        bg.style.filter = '';
        bg.style.transformOrigin = '';
        bg.style.animation = '';
        diving = false;
      }, 1300);
    });
  });
}

/* 진입점 — DOM 준비 후 모든 init 실행 */
document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initNavToggle();
  initScrollReveal();
  initParallax();
  initIndexPreview();
  initJournalDive();
});
