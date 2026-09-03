/* ═══════════════════════════════════════════════════════════════
   비철금속 B2B 거래 플랫폼 — 프로토타입 (위시켓 158040)
   의존성 없음 · 상태는 전부 메모리에만 둡니다 (브라우저 저장소 미사용)

   1 데이터   2 유틸   3 셸   4 화면   5 액션

   요구사항.md 등록부 ID(MEM/LOT/MKT/BID/DEL/STS/OPS/AUT/ENV/OPT/EXC/PRN)를
   각 화면 상단 배지에 그대로 표시합니다.
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ══ 1. 데이터 ═══════════════════════════════════════════════ */

/* ── 1.1 코드값 — 화면에서 바꾸는 설정 (버전 관리) ─────────── */

/* 품목·등급 (§3 「핵심」 데이터 · Q-03 확인 필요) */
var ITEMS = [
  { c:'CU', n:'구리',       u:'원/kg', base:11800, act:1 },
  { c:'AL', n:'알루미늄',    u:'원/kg', base:2950,  act:1 },
  { c:'BR', n:'황동',       u:'원/kg', base:6400,  act:1 },
  { c:'SS', n:'스테인리스',  u:'원/kg', base:2250,  act:1 },
  { c:'PB', n:'납',         u:'원/kg', base:2680,  act:1 },
  { c:'ZN', n:'아연',       u:'원/kg', base:3420,  act:1 },
  { c:'NI', n:'니켈',       u:'원/kg', base:19500, act:0 }
];

/* 등급 — 품목별. adj = 기준단가 대비 조정률 */
var GRADES = [
  { c:'CU-1', it:'CU', n:'1급 (광명동선)', adj:0,     act:1 },
  { c:'CU-2', it:'CU', n:'2급 (상동)',     adj:-0.06, act:1 },
  { c:'CU-3', it:'CU', n:'3급 (하동)',     adj:-0.14, act:1 },
  { c:'AL-A', it:'AL', n:'A급 (신규 압출)', adj:0,     act:1 },
  { c:'AL-B', it:'AL', n:'B급 (혼합)',     adj:-0.09, act:1 },
  { c:'AL-C', it:'AL', n:'C급 (도장재)',   adj:-0.18, act:1 },
  { c:'BR-A', it:'BR', n:'A급 (황동 정품)', adj:0,     act:1 },
  { c:'BR-B', it:'BR', n:'B급 (혼합)',     adj:-0.11, act:1 },
  { c:'SS-3', it:'SS', n:'304',           adj:0,     act:1 },
  { c:'SS-4', it:'SS', n:'430',           adj:-0.22, act:1 },
  { c:'PB-A', it:'PB', n:'A급 (연괴)',     adj:0,     act:1 },
  { c:'PB-B', it:'PB', n:'B급 (혼합)',     adj:-0.10, act:1 },
  { c:'ZN-A', it:'ZN', n:'A급 (아연괴)',   adj:0,     act:1 },
  { c:'ZN-B', it:'ZN', n:'B급 (혼합)',     adj:-0.12, act:1 }
];

var REGIONS = ['서울', '경기 북부', '경기 남부', '인천', '충청', '강원', '영남', '호남'];

/* ── 1.2 상태정의·전이규칙 — 버전 있는 설정 데이터 (STS-H5) ── */
/* req = 이 단계로 넘어갈 때 필수 입력 · ev = 필수 증빙 종류 */
var SDEF_V1 = [
  { c:'S01', n:'거래확정',        req:[],                              ev:[],        who:'OPS' },
  { c:'S02', n:'배차대기',        req:[],                              ev:[],        who:'OPS' },
  { c:'S03', n:'배차완료',        req:['차량번호','기사명','상차예정일'], ev:[],        who:'OPS' },
  { c:'S04', n:'상차완료',        req:['상차시각'],                     ev:['상차사진'], who:'OPS' },
  { c:'S05', n:'운송중',          req:[],                              ev:[],        who:'OPS' },
  { c:'S06', n:'도착',            req:['도착시각'],                     ev:[],        who:'OPS' },
  { c:'S07', n:'계근완료',        req:['실중량'],                       ev:['계근표'], who:'OPS' },
  { c:'S08', n:'검수완료',        req:['판정등급'],                     ev:['검수자료'], who:'OPS' },
  { c:'S09', n:'최종금액확정',     req:['최종금액'],                     ev:[],        who:'OPS' },
  { c:'S10', n:'구매자 입금확인',  req:['입금일'],                       ev:[],        who:'OPS' },
  { c:'S11', n:'판매자 지급완료',  req:['지급일'],                       ev:[],        who:'OPS' },
  { c:'S12', n:'거래완료',        req:[],                              ev:[],        who:'OPS' }
];
/* 전이규칙 — 되돌리기(back) 허용 여부를 단계별로 둡니다 */
var TR_V1 = {
  S01:{ next:['S02'],        back:[] },
  S02:{ next:['S03'],        back:['S01'] },
  S03:{ next:['S04'],        back:['S02'] },
  S04:{ next:['S05'],        back:['S03'] },
  S05:{ next:['S06'],        back:['S04'] },
  S06:{ next:['S07'],        back:['S05'] },
  S07:{ next:['S08'],        back:['S07'] },
  S08:{ next:['S09'],        back:['S08'] },
  S09:{ next:['S10'],        back:[] },
  S10:{ next:['S11'],        back:[] },
  S11:{ next:['S12'],        back:[] },
  S12:{ next:[],             back:[] }
};

/* 최종금액 계산 규칙 (AUT-02 · Q-01 확인 필요) */
var RULE_V1 = {
  gradeAdj:  true,      /* 판정등급의 조정률을 단가에 적용 */
  moisture:  0.008,     /* 수분 공제율 — 실중량에서 차감 */
  impurity:  0,         /* 불순물 공제 — 검수에서 입력 */
  weighTol:  0.005,     /* 계근 오차 허용 ±0.5% */
  freightBy: '구매자',   /* 운송비 부담 주체 */
  freight:   180000,    /* 운송비 (건당) */
  vat:       0.10       /* 부가세 별도 */
};

/* 설정 버전 대장 — 화면에서 새 버전을 만듭니다 */
var VERS = [
  { v:1, from:'2026-03-02', by:'시스템', memo:'초기 설정 (RFP §9 12단계)',
    sdef:SDEF_V1, tr:TR_V1, rule:RULE_V1, act:1 }
];

/* ── 1.3 회원 (MEM) ────────────────────────────────────────── */
var MEMBERS = [
  { id:'M01', role:'SELLER', co:'대성비철',       nm:'김대성', biz:'214-81-40218', tel:'010-2841-7712', rg:'경기 남부', st:'승인', at:'2026-03-04', memo:'구리·황동 주력. 월 8~12건.' },
  { id:'M02', role:'SELLER', co:'한빛금속',       nm:'이한빛', biz:'132-86-11902', tel:'010-3391-2205', rg:'인천',     st:'승인', at:'2026-03-05', memo:'알루미늄 압출 스크랩.' },
  { id:'M03', role:'SELLER', co:'동아리사이클',    nm:'박동아', biz:'305-81-77410', tel:'010-8827-4419', rg:'충청',     st:'승인', at:'2026-03-09', memo:'' },
  { id:'M04', role:'SELLER', co:'우진자원',       nm:'정우진', biz:'611-81-22087', tel:'010-4412-9903', rg:'영남',     st:'승인', at:'2026-03-11', memo:'전화 접수 위주 — 대행 등록 대상.' },
  { id:'M05', role:'SELLER', co:'신성메탈',       nm:'최신성', biz:'128-81-63301', tel:'010-7742-1180', rg:'경기 북부', st:'승인대기', at:'2026-03-28', memo:'사업자등록증 확인 대기 (Q-06)' },
  { id:'M06', role:'BUYER',  co:'제일신동',       nm:'오제일', biz:'204-86-30119', tel:'010-5520-8834', rg:'서울',     st:'승인', at:'2026-03-04', memo:'구리 1급 상시 매입.' },
  { id:'M07', role:'BUYER',  co:'태광알루미늄',    nm:'강태광', biz:'410-81-55027', tel:'010-6613-7729', rg:'호남',     st:'승인', at:'2026-03-06', memo:'' },
  { id:'M08', role:'BUYER',  co:'세아정련',       nm:'윤세아', biz:'503-81-19928', tel:'010-2207-6641', rg:'영남',     st:'승인', at:'2026-03-10', memo:'월 20건 이상. 대량 매입.' },
  { id:'M09', role:'BUYER',  co:'금호비철',       nm:'한금호', biz:'220-88-40092', tel:'010-9931-5528', rg:'경기 남부', st:'승인', at:'2026-03-13', memo:'' },
  { id:'M10', role:'BUYER',  co:'대륙메탈트레이딩', nm:'서대륙', biz:'129-86-72214', tel:'010-3308-1147', rg:'인천',     st:'승인대기', at:'2026-03-29', memo:'거래처 확인 중 (RecycleInMe 방식)' },
  { id:'M11', role:'SELLER', co:'삼정금속',       nm:'노삼정', biz:'617-81-90034', tel:'010-4477-2019', rg:'영남',     st:'신규문의', at:'2026-03-30', memo:'전화 문의 접수 — 가입 안내 예정' },
  { id:'M12', role:'BUYER',  co:'현우실업',       nm:'배현우', biz:'135-81-28806', tel:'010-8890-3312', rg:'서울',     st:'신규문의', at:'2026-03-30', memo:'홈페이지 문의' }
];
var OPS_USERS = [
  { id:'OP1', nm:'조운영', pos:'거래운영 팀장', perm:'FULL' },
  { id:'OP2', nm:'남지원', pos:'거래운영 담당', perm:'FULL' },
  { id:'OP3', nm:'백감사', pos:'정산 검토',     perm:'READ' }
];

/* ── 1.4 물량 (LOT) — 물량의 생애주기 ─────────────────────── */
/* 등록 → 승인대기 → 판매중 → 거래성립 → 마감 */
var LOTS = [
  { id:'L-0031', sel:'M01', it:'CU', gr:'CU-1', wt:12400, rg:'경기 남부', want:11500, out:'2026-04-06', st:'판매중',   at:'2026-03-24', ph:2, by:null,   memo:'광명동선 위주. 사진 2장.' },
  { id:'L-0032', sel:'M02', it:'AL', gr:'AL-A', wt:26800, rg:'인천',     want:2820,  out:'2026-04-03', st:'판매중',   at:'2026-03-25', ph:3, by:null,   memo:'압출 신재.' },
  { id:'L-0033', sel:'M04', it:'BR', gr:'BR-A', wt:5200,  rg:'영남',     want:6100,  out:'2026-04-08', st:'판매중',   at:'2026-03-25', ph:1, by:'OP2', memo:'전화 접수 — 대행 등록.' },
  { id:'L-0034', sel:'M03', it:'SS', gr:'SS-3', wt:18300, rg:'충청',     want:2180,  out:'2026-04-10', st:'판매중',   at:'2026-03-26', ph:2, by:null,   memo:'' },
  { id:'L-0035', sel:'M01', it:'CU', gr:'CU-2', wt:8600,  rg:'경기 남부', want:10900, out:'2026-04-04', st:'거래성립', at:'2026-03-20', ph:2, by:null,   memo:'' },
  { id:'L-0036', sel:'M02', it:'AL', gr:'AL-B', wt:15400, rg:'인천',     want:2610,  out:'2026-03-31', st:'거래성립', at:'2026-03-18', ph:1, by:null,   memo:'' },
  { id:'L-0037', sel:'M04', it:'CU', gr:'CU-1', wt:9800,  rg:'영남',     want:11600, out:'2026-04-02', st:'거래성립', at:'2026-03-17', ph:2, by:'OP1', memo:'대행 등록 (1분 입력).' },
  { id:'L-0038', sel:'M03', it:'PB', gr:'PB-A', wt:7200,  rg:'충청',     want:2560,  out:'2026-03-30', st:'거래성립', at:'2026-03-16', ph:1, by:null,   memo:'' },
  { id:'L-0039', sel:'M01', it:'BR', gr:'BR-B', wt:4100,  rg:'경기 남부', want:5700,  out:'2026-03-28', st:'거래성립', at:'2026-03-12', ph:2, by:null,   memo:'' },
  { id:'L-0040', sel:'M02', it:'ZN', gr:'ZN-A', wt:6600,  rg:'인천',     want:3280,  out:'2026-03-27', st:'거래성립', at:'2026-03-10', ph:1, by:null,   memo:'' },
  { id:'L-0041', sel:'M04', it:'AL', gr:'AL-A', wt:21500, rg:'영남',     want:2410,  out:'2026-03-26', st:'거래성립', at:'2026-03-06', ph:2, by:'OP2', memo:'대행 등록.' },
  { id:'L-0042', sel:'M03', it:'CU', gr:'CU-1', wt:11200, rg:'충청',     want:10100, out:'2026-03-24', st:'거래성립', at:'2026-03-04', ph:3, by:null,   memo:'' },
  { id:'L-0043', sel:'M05', it:'SS', gr:'SS-4', wt:9400,  rg:'경기 북부', want:1740,  out:'2026-04-12', st:'승인대기', at:'2026-03-28', ph:1, by:null,   memo:'판매자 승인 전 — 노출되지 않습니다.' },
  { id:'L-0044', sel:'M01', it:'AL', gr:'AL-A', wt:13800, rg:'경기 남부', want:2870,  out:'2026-04-14', st:'승인대기', at:'2026-03-29', ph:0, by:null,   memo:'사진 미첨부 — 운영자 확인 필요.' },
  { id:'L-0030', sel:'M02', it:'CU', gr:'CU-1', wt:7400,  rg:'인천',     want:11400, out:'2026-03-20', st:'마감',     at:'2026-02-24', ph:2, by:null,   memo:'출고 가능일 경과.' }
];

/* ── 1.5 구매 제안 (BID) — 제안의 생애주기 ────────────────── */
/* 제안 → 검토중 → 수락 / 거절 / 만료 */
var BIDS = [
  { id:'B-0120', lot:'L-0031', buy:'M06', qty:12000, px:11350, cond:'선입금 · 상차 당사 부담', st:'검토중', at:'2026-03-26 09:12', by:null,   memo:'' },
  { id:'B-0121', lot:'L-0031', buy:'M08', qty:12400, px:11180, cond:'검수 후 3일 내 결제',     st:'제안',   at:'2026-03-26 14:40', by:null,   memo:'' },
  { id:'B-0122', lot:'L-0031', buy:'M09', qty:6000,  px:11500, cond:'분할 인수 희망',          st:'제안',   at:'2026-03-27 10:05', by:'OP2', memo:'전화 접수 — 대행 입력.' },
  { id:'B-0123', lot:'L-0032', buy:'M07', qty:26800, px:2780,  cond:'일괄 인수 · 운송 당사',    st:'검토중', at:'2026-03-26 16:22', by:null,   memo:'' },
  { id:'B-0124', lot:'L-0033', buy:'M06', qty:5200,  px:6020,  cond:'현장 확인 후 확정',        st:'제안',   at:'2026-03-27 11:31', by:null,   memo:'' },
  { id:'B-0125', lot:'L-0034', buy:'M08', qty:18300, px:2140,  cond:'계근 기준 정산',           st:'제안',   at:'2026-03-27 15:08', by:null,   memo:'' },
  { id:'B-0110', lot:'L-0035', buy:'M06', qty:8600,  px:10850, cond:'계근 기준 정산',           st:'수락',   at:'2026-03-21 10:00', by:null,   memo:'' },
  { id:'B-0111', lot:'L-0036', buy:'M07', qty:15400, px:2580,  cond:'일괄 인수',               st:'수락',   at:'2026-03-19 11:20', by:null,   memo:'' },
  { id:'B-0112', lot:'L-0037', buy:'M08', qty:9800,  px:11520, cond:'선입금',                  st:'수락',   at:'2026-03-18 09:40', by:'OP1', memo:'대행 입력.' },
  { id:'B-0113', lot:'L-0038', buy:'M09', qty:7200,  px:2530,  cond:'검수 후 결제',            st:'수락',   at:'2026-03-17 14:05', by:null,   memo:'' },
  { id:'B-0114', lot:'L-0039', buy:'M06', qty:4100,  px:5640,  cond:'현장 인수',               st:'수락',   at:'2026-03-13 10:30', by:null,   memo:'' },
  { id:'B-0115', lot:'L-0040', buy:'M07', qty:6600,  px:3240,  cond:'일괄 인수',               st:'수락',   at:'2026-03-11 16:00', by:null,   memo:'' },
  { id:'B-0116', lot:'L-0041', buy:'M08', qty:21500, px:2380,  cond:'계근 기준 정산',           st:'수락',   at:'2026-03-07 09:15', by:'OP2', memo:'' },
  { id:'B-0117', lot:'L-0042', buy:'M09', qty:11200, px:9980,  cond:'검수 후 결제',            st:'수락',   at:'2026-03-05 13:45', by:null,   memo:'' },
  { id:'B-0105', lot:'L-0030', buy:'M06', qty:7400,  px:11200, cond:'선입금',                  st:'만료',   at:'2026-02-26 09:00', by:null,   memo:'출고 가능일 경과로 만료.' },
  { id:'B-0106', lot:'L-0030', buy:'M08', qty:7000,  px:11050, cond:'분할 인수',               st:'거절',   at:'2026-02-27 15:20', by:null,   memo:'판매자 거절 — 희망가 미달.' }
];

/* ── 1.6 거래 (DEL·STS) — 거래의 생애주기 ────────────────── */
/* fields = 단계별 입력값 · ev = 증빙 · hist = 변경이력(append only) */
var DEALS = [];

/* 시드 거래 정의 — [번호, 물량, 제안, 도달 상태, 확정일] */
var DEAL_SEED = [
  ['D-2026-0041', 'L-0037', 'B-0112', 'S02', '2026-03-18'],
  ['D-2026-0040', 'L-0036', 'B-0111', 'S03', '2026-03-19'],
  ['D-2026-0039', 'L-0035', 'B-0110', 'S05', '2026-03-21'],
  ['D-2026-0038', 'L-0038', 'B-0113', 'S06', '2026-03-17'],
  ['D-2026-0037', 'L-0039', 'B-0114', 'S07', '2026-03-13'],
  ['D-2026-0036', 'L-0040', 'B-0115', 'S08', '2026-03-11'],
  ['D-2026-0035', 'L-0041', 'B-0116', 'S09', '2026-03-07'],
  ['D-2026-0034', 'L-0042', 'B-0117', 'S12', '2026-03-05']
];

/* ── 1.7 알림 (AUT-04) · notify() 한 지점 ─────────────────── */
var NOTES = [];
var WATCH = [
  { id:'W1', mem:'M06', it:'CU', gr:'CU-1', rg:'',        min:5000,  memo:'구리 1급 5톤 이상' },
  { id:'W2', mem:'M08', it:'AL', gr:'',     rg:'인천',     min:10000, memo:'인천 알루미늄 10톤 이상' }
];

/* ── 1.8 세션 상태 ─────────────────────────────────────────── */
var S = {
  role: null,        /* SELLER | BUYER | OPS */
  me:   null,        /* MEMBERS / OPS_USERS 항목 */
  route:'board',
  arg:  '',
  railOpen:false,
  theme:'sys',
  seq:{ lot:44, bid:125, deal:41, note:0 },
  qs:'', flt:{ it:'', gr:'', rg:'', min:'' },
  boardFlt:'',
  tab:{},
  reveal:{},
  now:'2026-03-30 14:20'
};

/* ══ 2. 유틸 ═════════════════════════════════════════════════ */

function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
function nf(n) { return (Math.round(Number(n) || 0)).toLocaleString('ko-KR'); }
function nf1(n) { return (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('ko-KR'); }
function pc(n, d) { return ((Number(n) || 0) * 100).toFixed(d == null ? 1 : d) + '%'; }
function kg(n) { return nf(n) + ' kg'; }
function ton(n) { return nf1((Number(n) || 0) / 1000) + ' t'; }
function won(n) { return nf(n) + '원'; }
function tel(v, on) { return on ? v : String(v).replace(/^(\d{3})-\d{3,4}-(\d{2})\d{2}$/, '$1-****-**$2'); }
function biz(v, on) { return on ? v : String(v).replace(/^(\d{3})-(\d{2})-\d{5}$/, '$1-$2-*****'); }
function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
function nowStamp(add) {
  var t = S.now.split(' '), hm = t[1].split(':');
  var mi = Number(hm[0]) * 60 + Number(hm[1]) + (add || 0);
  return t[0] + ' ' + pad(Math.floor(mi / 60) % 24, 2) + ':' + pad(mi % 60, 2);
}
function today() { return S.now.split(' ')[0]; }

/* 조회 헬퍼 */
function ver()      { return VERS.filter(function (v) { return v.act; })[0] || VERS[VERS.length - 1]; }
function verOf(n)   { return VERS.filter(function (v) { return v.v === n; })[0] || ver(); }
function sdefOf(vn) { return verOf(vn).sdef; }
function stName(vn, c) {
  var s = sdefOf(vn).filter(function (x) { return x.c === c; })[0];
  return s ? s.n : c;
}
function stIdx(vn, c) {
  var d = sdefOf(vn);
  for (var i = 0; i < d.length; i++) if (d[i].c === c) return i;
  return -1;
}
function item(c)  { return ITEMS.filter(function (x) { return x.c === c; })[0] || { n:c, base:0, u:'원/kg' }; }
function grade(c) { return GRADES.filter(function (x) { return x.c === c; })[0] || { n:c, adj:0 }; }
function mem(id)  { return MEMBERS.filter(function (x) { return x.id === id; })[0] || { co:id, nm:'', tel:'', biz:'', rg:'' }; }
function opsUser(id) { return OPS_USERS.filter(function (x) { return x.id === id; })[0] || { nm:id, pos:'' }; }
function actorName(id) {
  if (!id) return '시스템';
  return /^OP/.test(id) ? opsUser(id).nm + '(운영자)' : mem(id).co + ' ' + mem(id).nm;
}
function lot(id)  { return LOTS.filter(function (x) { return x.id === id; })[0]; }
function bid(id)  { return BIDS.filter(function (x) { return x.id === id; })[0]; }
function deal(id) { return DEALS.filter(function (x) { return x.id === id; })[0]; }
function gradesOf(it) { return GRADES.filter(function (g) { return g.it === it && g.act; }); }

/* 내가 당사자인지 (MEM-05 접근통제) */
function isParty(d) {
  if (S.role === 'OPS') return true;
  if (!S.me) return false;
  return d.sel === S.me.id || d.buy === S.me.id;
}
function myDeals() {
  return DEALS.filter(function (d) {
    if (S.role === 'OPS') return true;
    return S.role === 'SELLER' ? d.sel === S.me.id : d.buy === S.me.id;
  });
}

/* ── 최종금액 계산 (AUT-02) — 산출 근거를 함께 돌려줍니다 ─── */
function calcAmount(d, ruleIn, pxIn) {
  var r  = ruleIn || verOf(d.rv).rule;
  var it = item(d.it);
  var px = pxIn != null ? pxIn : d.px;
  var gc = d.f['판정등급'] || d.gr;
  var g  = grade(gc);
  var wt = Number(d.f['실중량'] || 0);
  var lines = [], amt = 0;

  lines.push({ l:'계근 실중량', v:kg(wt), n:'STS-07에서 확정' });
  var mDed = Math.round(wt * r.moisture);
  var netW = wt - mDed;
  lines.push({ l:'수분 공제 (' + pc(r.moisture, 1) + ')', v:'− ' + kg(mDed), n:'규칙 설정값' });
  lines.push({ l:'정미중량', v:kg(netW), n:'실중량 − 수분 공제', hi:1 });

  lines.push({ l:'제안 단가', v:won(px) + ' / kg', n:'거래확정 시점 값' });
  var adj = r.gradeAdj ? (g.adj || 0) : 0;
  var apx = Math.round(px * (1 + adj));
  lines.push({ l:'등급 조정 (' + esc(g.n) + ')', v:(adj === 0 ? '± 0%' : pc(adj, 0)), n:'판정등급의 조정률' });
  lines.push({ l:'적용 단가', v:won(apx) + ' / kg', n:'제안 단가 × (1 + 등급 조정)', hi:1 });

  amt = netW * apx;
  lines.push({ l:'소계', v:won(amt), n:'정미중량 × 적용 단가' });

  var imp = Number(d.f['불순물공제'] || r.impurity || 0);
  if (imp > 0) { amt -= imp; lines.push({ l:'불순물 공제', v:'− ' + won(imp), n:'검수에서 입력' }); }

  if (r.freightBy === '판매자') {
    amt -= r.freight;
    lines.push({ l:'운송비 (판매자 부담)', v:'− ' + won(r.freight), n:'규칙 설정값' });
  } else {
    lines.push({ l:'운송비 (' + r.freightBy + ' 부담)', v:'정산 대상 아님', n:'규칙 설정값' });
  }

  amt = Math.round(amt);
  lines.push({ l:'최종금액 (부가세 별도)', v:won(amt), n:'판매자 지급 기준액', hi:2 });
  lines.push({ l:'부가세 ' + pc(r.vat, 0), v:won(Math.round(amt * r.vat)), n:'별도' });
  return { amt:amt, vat:Math.round(amt * r.vat), lines:lines, apx:apx, netW:netW, rule:r, gradeCode:gc };
}

/* 계근 오차 판정 */
function weighDiff(d) {
  var est = Number(d.wt || 0), real = Number(d.f['실중량'] || 0);
  if (!est || !real) return null;
  var diff = real - est, rate = diff / est;
  var r = verOf(d.rv).rule;
  return { diff:diff, rate:rate, over:Math.abs(rate) > r.weighTol, tol:r.weighTol };
}

/* ── notify() — 알림 발송이 반드시 거치는 한 지점 (AUT-04) ── */
function notify(to, kind, dealId, text) {
  S.seq.note++;
  NOTES.unshift({
    id:'N' + pad(S.seq.note, 3), to:to, kind:kind, deal:dealId || '',
    tx:text, at:nowStamp(0), read:false, ch:'서비스 내 알림'
  });
}

/* ── 상태 변경 — changeStatus() 한 지점 (STS-H1~H4) ───────── */
/* 반환: {ok:true} | {ok:false, why:'...', miss:[...]} */
function changeStatus(d, to, actor, reason, back) {
  var vv = verOf(d.rv), tr = vv.tr[d.st] || { next:[], back:[] };
  var allowed = (back ? tr.back : tr.next) || [];
  if (allowed.indexOf(to) < 0) {
    return { ok:false, why:'전이규칙(v' + d.rv + ')이 허용하지 않는 전이입니다 — ' +
      stName(d.rv, d.st) + ' → ' + stName(d.rv, to) };
  }
  var def = vv.sdef.filter(function (x) { return x.c === to; })[0] || { req:[], ev:[] };
  var miss = (def.req || []).filter(function (k) {
    var v = d.f[k];
    return v == null || v === '';
  });
  if (miss.length) {
    return { ok:false, why:'「' + def.n + '」 단계의 필수 입력 항목이 채워지지 않았습니다', miss:miss };
  }
  var evMiss = (def.ev || []).filter(function (t) {
    return !d.ev.some(function (e) { return e.t === t; });
  });
  if (evMiss.length) {
    return { ok:false, why:'「' + def.n + '」 단계의 필수 증빙이 첨부되지 않았습니다', miss:evMiss };
  }
  /* 상태 갱신 + 이력 추가를 한 묶음으로 처리 */
  var from = d.st;
  d.st = to;
  d.hist.push({
    from:from, to:to, by:actor, at:nowStamp(0),
    why:reason || (back ? '되돌리기' : ''), agent:(/^OP/.test(actor) ? actor : null),
    kind:back ? 'back' : 'fwd', rv:d.rv
  });
  notify(d.sel, '상태변경', d.id, d.id + ' — ' + stName(d.rv, from) + ' → ' + stName(d.rv, to));
  notify(d.buy, '상태변경', d.id, d.id + ' — ' + stName(d.rv, from) + ' → ' + stName(d.rv, to));
  return { ok:true, from:from };
}

/* ── 증빙 첨부 (STS-H4 · OPS-10) ──────────────────────────── */
function attach(d, type, name, actor) {
  d.ev.push({ t:type, f:name, st:d.st, by:actor, at:nowStamp(0),
    sz:(Math.round(180 + Math.random() * 2600)) + ' KB' });
  d.hist.push({ from:d.st, to:d.st, by:actor, at:nowStamp(0),
    why:'증빙 첨부 — ' + type + ' (' + name + ')', kind:'ev', rv:d.rv });
}

/* ── 정정 이력 (덮어쓰지 않고 쌓기) ───────────────────────── */
function correct(d, key, oldV, newV, actor, why) {
  d.f[key] = newV;
  d.hist.push({ from:d.st, to:d.st, by:actor, at:nowStamp(0),
    why:'정정 — ' + key + ': ' + (oldV === '' || oldV == null ? '(비어 있음)' : oldV) + ' → ' + newV +
        (why ? ' · 사유: ' + why : ''), kind:'fix', rv:d.rv });
}

/* ── 시드 거래 생성 ───────────────────────────────────────── */
function seedDeals() {
  DEAL_SEED.forEach(function (row, di) {
    var L = lot(row[1]), B = bid(row[2]);
    var d = {
      id:row[0], lot:L.id, bidId:B.id, sel:L.sel, buy:B.buy,
      it:L.it, gr:L.gr, wt:L.wt, qty:B.qty, px:B.px, cond:B.cond, rg:L.rg,
      st:'S01', rv:1, at:row[4], f:{}, ev:[], hist:[], byAgent:B.by || L.by || null,
      snap:null
    };
    d.hist.push({ from:'—', to:'S01', by:(B.by || 'OP1'), at:row[4] + ' 09:30',
      why:'제안 수락 → 거래확정 (거래번호 자동생성)', kind:'fwd', rv:1 });
    DEALS.push(d);

    /* 목표 상태까지 필수 입력을 채우면서 전진 */
    var target = stIdx(1, row[3]);
    var day = Number(row[4].slice(8, 10));
    for (var i = 1; i <= target; i++) {
      var code = SDEF_V1[i].c, hh = 9 + (i % 8);
      if (code === 'S03') {
        d.f['차량번호'] = ['87가 4412', '31로 8827', '55다 1190', '09나 7724'][i % 4];
        d.f['기사명']   = ['정기사', '문기사', '허기사', '류기사'][i % 4];
        d.f['기사연락처'] = ['010-3312-88' + pad((i * 7) % 100, 2)][0];
        d.f['상차예정일'] = row[4].slice(0, 8) + pad(Math.min(day + 2, 28), 2);
        d.f['운송사'] = ['한길운수', '대성로지스'][i % 2];
      }
      if (code === 'S04') {
        d.f['상차시각'] = row[4].slice(0, 8) + pad(Math.min(day + 2, 28), 2) + ' 08:40';
        attach(d, '상차사진', 'load_' + d.id.slice(-4) + '.jpg', 'OP2');
      }
      if (code === 'S06') d.f['도착시각'] = row[4].slice(0, 8) + pad(Math.min(day + 3, 28), 2) + ' 13:10';
      if (code === 'S07') {
        /* 거래별로 오차를 다르게 — 허용 범위 안/밖이 섞이도록 */
        var drift = [-0.0031, 0.0112, -0.0024, 0.0041, -0.0186, 0.0107, -0.0038, 0.0019][di % 8];
        d.f['실중량'] = Math.round(L.wt * (1 + drift) / 10) * 10;
        d.f['계근소'] = ['영남계근소', '중부계근소', '인천공영계근', '호남계근센터'][di % 4];
        attach(d, '계근표', 'weigh_' + d.id.slice(-4) + '.pdf', 'OP2');
      }
      if (code === 'S08') {
        var gs = gradesOf(L.it);
        /* 등록 등급을 유지하는 건과 한 단계 내려가는 건이 섞이도록 */
        var gi = gs.map(function (g) { return g.c; }).indexOf(L.gr);
        if (gi < 0) gi = 0;
        var down = [0, 1, 0, 1, 0, 1, 0, 1][di % 8];
        d.f['판정등급'] = (gs[Math.min(gs.length - 1, gi + down)] || grade(L.gr)).c;
        d.f['검수의견'] = down ? '표면 산화 일부 확인. 등록 등급 대비 한 단계 하향 판정.'
                              : '등록 등급과 일치. 이물 혼입 없음.';
        d.f['불순물공제'] = [0, 0, 0, 120000, 0, 240000, 0, 80000][di % 8];
        attach(d, '검수자료', 'inspect_' + d.id.slice(-4) + '.pdf', 'OP1');
      }
      if (code === 'S09') {
        var c = calcAmount(d);
        d.f['최종금액'] = c.amt;
        d.snap = { rv:d.rv, rule:JSON.parse(JSON.stringify(c.rule)), px:d.px,
                   apx:c.apx, netW:c.netW, grade:c.gradeCode, amt:c.amt, vat:c.vat,
                   by:'OP1', at:nowStamp(0), lines:c.lines };
      }
      if (code === 'S10') d.f['입금일'] = row[4].slice(0, 8) + pad(Math.min(day + 6, 28), 2);
      if (code === 'S11') d.f['지급일'] = row[4].slice(0, 8) + pad(Math.min(day + 8, 28), 2);

      var from = d.st;
      d.st = code;
      d.hist.push({ from:from, to:code, by:(i % 3 === 0 ? 'OP2' : 'OP1'),
        at:row[4].slice(0, 8) + pad(Math.min(day + i, 28), 2) + ' ' + pad(hh, 2) + ':' + pad((i * 13) % 60, 2),
        why:'', kind:'fwd', rv:1 });
    }
  });
  /* 알림 시드 */
  notify('M01', '제안접수', 'L-0031', 'L-0031 구리 1급 — 새 구매 제안 3건이 도착했습니다');
  notify('M06', '상태변경', 'D-2026-0039', 'D-2026-0039 — 상차완료 → 운송중');
  notify('M08', '금액확정', 'D-2026-0035', 'D-2026-0035 — 최종금액이 확정되었습니다');
  notify('M02', '상태변경', 'D-2026-0040', 'D-2026-0040 — 배차대기 → 배차완료');
}
seedDeals();

/* ── 8단 현황판 집계 (OPS-11) ─────────────────────────────── */
function boardCells() {
  return [
    { k:'신규문의',   f:'inq',   n:MEMBERS.filter(function (m) { return m.st === '신규문의'; }).length,
      d:'가입 안내 대기', go:'members' },
    { k:'승인대기',   f:'wait',  n:MEMBERS.filter(function (m) { return m.st === '승인대기'; }).length,
      d:'운영자 승인 필요 (MEM-04)', go:'members', hot:1 },
    { k:'판매중 물량', f:'sale',  n:LOTS.filter(function (l) { return l.st === '판매중'; }).length,
      d:'거래시장 노출 중', go:'lots' },
    { k:'구매제안',   f:'bid',   n:BIDS.filter(function (b) { return b.st === '제안' || b.st === '검토중'; }).length,
      d:'판매자 수락 대기', go:'bidsAll', hot:1 },
    { k:'거래확정',   f:'S01',   n:DEALS.filter(function (d) { return d.st === 'S01' || d.st === 'S02'; }).length,
      d:'배차 착수 대기', go:'deals' },
    { k:'운송중',     f:'run',   n:DEALS.filter(function (d) { return ['S03','S04','S05','S06'].indexOf(d.st) >= 0; }).length,
      d:'배차~도착 구간', go:'deals' },
    { k:'검수대기',   f:'insp',  n:DEALS.filter(function (d) { return d.st === 'S07'; }).length,
      d:'계근 완료, 검수 전', go:'deals', warn:1 },
    { k:'정산대기',   f:'settle', n:DEALS.filter(function (d) { return ['S08','S09','S10'].indexOf(d.st) >= 0; }).length,
      d:'검수~입금 확인 구간', go:'settle', warn:1 }
  ];
}
function boardFilter(f) {
  if (f === 'S01')    return DEALS.filter(function (d) { return d.st === 'S01' || d.st === 'S02'; });
  if (f === 'run')    return DEALS.filter(function (d) { return ['S03','S04','S05','S06'].indexOf(d.st) >= 0; });
  if (f === 'insp')   return DEALS.filter(function (d) { return d.st === 'S07'; });
  if (f === 'settle') return DEALS.filter(function (d) { return ['S08','S09','S10'].indexOf(d.st) >= 0; });
  return DEALS;
}

/* ── 다음 조치사항 (OPS-09) — 상태정의의 필수 항목에서 유도 ─ */
function nextAction(d) {
  var vv = verOf(d.rv), tr = vv.tr[d.st] || { next:[] };
  if (!tr.next.length) return { t:'없음 — 거래 완료', k:'o' };
  var to  = tr.next[0];
  var def = vv.sdef.filter(function (x) { return x.c === to; })[0];
  var miss = (def.req || []).filter(function (k) { return d.f[k] == null || d.f[k] === ''; });
  var evMiss = (def.ev || []).filter(function (t) {
    return !d.ev.some(function (e) { return e.t === t; });
  });
  var need = miss.concat(evMiss);
  if (!need.length) return { t:def.n + ' 로 넘기기 (입력 완료)', k:'k', to:to };
  return { t:def.n + ' — ' + need.join(' · ') + ' 입력', k:'w', to:to, need:need };
}

/* ── 메뉴 (역할별) ────────────────────────────────────────── */
var MENUS = [
  /* 운영자 */
  { g:'운영 현황', id:'board',    n:'전체 현황판',      ic:'▦', roles:['OPS'], key:1 },
  { g:'운영 현황', id:'metrics',  n:'운영지표 · 2차 예시', ic:'▚', roles:['OPS'] },
  { g:'회원',     id:'members',  n:'회원 승인',        ic:'◉', roles:['OPS'] },
  { g:'대행 접수', id:'quickLot', n:'대행 물량 등록',    ic:'⚡', roles:['OPS'], key:1, m:1 },
  { g:'대행 접수', id:'quickBid', n:'대행 구매제안 입력', ic:'⚡', roles:['OPS'], m:1 },
  { g:'거래',     id:'lots',     n:'물량 관리',        ic:'▤', roles:['OPS'] },
  { g:'거래',     id:'bidsAll',  n:'제안 관리',        ic:'≡', roles:['OPS'] },
  { g:'거래',     id:'deals',    n:'거래 목록',        ic:'⇅', roles:['OPS'] },
  { g:'물류·검수', id:'dispatch', n:'배차·상차·운송',    ic:'▭', roles:['OPS'], m:1 },
  { g:'물류·검수', id:'weigh',    n:'계근 입력',        ic:'⚖', roles:['OPS'], m:1, key:1 },
  { g:'물류·검수', id:'inspect',  n:'검수 입력',        ic:'⌕', roles:['OPS'], m:1 },
  { g:'정산',     id:'settle',   n:'최종금액·정산',     ic:'∑', roles:['OPS'], key:1 },
  { g:'운영 설정', id:'codes',    n:'품목·등급 관리',    ic:'⌗', roles:['OPS'], key:1 },
  { g:'운영 설정', id:'states',   n:'상태·전이 설정',    ic:'⊞', roles:['OPS'], key:1 },
  /* 판매자 */
  { g:'내 판매',  id:'sLots',    n:'내 물량',          ic:'▤', roles:['SELLER'] },
  { g:'내 판매',  id:'sLotNew',  n:'물량 등록',        ic:'＋', roles:['SELLER'], m:1 },
  { g:'내 판매',  id:'sBids',    n:'받은 제안',        ic:'≡', roles:['SELLER'] },
  { g:'내 판매',  id:'sDeals',   n:'내 거래',          ic:'⇅', roles:['SELLER'] },
  /* 구매자 */
  { g:'거래시장', id:'market',   n:'거래시장',         ic:'▦', roles:['BUYER'] },
  { g:'거래시장', id:'watch',    n:'관심 품목·조건',    ic:'☆', roles:['BUYER'] },
  { g:'내 구매',  id:'bBids',    n:'내 제안',          ic:'≡', roles:['BUYER'] },
  { g:'내 구매',  id:'bDeals',   n:'내 거래',          ic:'⇅', roles:['BUYER'] },
  /* 공통 */
  { g:'공통',     id:'signup',   n:'가입·승인 흐름',    ic:'◒', roles:['OPS','SELLER','BUYER'] },
  { g:'공통',     id:'notify',   n:'알림',             ic:'◔', roles:['OPS','SELLER','BUYER'] },
  { g:'공통',     id:'me',       n:'내 정보',          ic:'◍', roles:['OPS','SELLER','BUYER'] },
  { g:'공통',     id:'scope',    n:'범위 지도',        ic:'◱', roles:['OPS','SELLER','BUYER'] }
];
function menu(id) { return MENUS.filter(function (m) { return m.id === id; })[0]; }
function canSee(r) {
  var m = menu(r.split(':')[0]);
  if (!m) return true;
  return m.roles.indexOf(S.role) >= 0;
}

window.__PT = { S:S, MENUS:MENUS, DEALS:DEALS, LOTS:LOTS, BIDS:BIDS, MEMBERS:MEMBERS,
                VERS:VERS, ITEMS:ITEMS, GRADES:GRADES, NOTES:NOTES,
                calcAmount:calcAmount, changeStatus:changeStatus, boardCells:boardCells,
                nextAction:nextAction, weighDiff:weighDiff };

/* ── 2.x 마크업 헬퍼 ─────────────────────────────────────── */
function card(title, body, sub, bar, tight) {
  return '<section class="card">' +
    (title ? '<div class="card-hd"><h3>' + title + '</h3>' +
      (sub ? '<span class="sub">' + sub + '</span>' : '') +
      (bar ? '<div class="bar">' + bar + '</div>' : '') + '</div>' : '') +
    '<div class="card-bd' + (tight ? ' tight' : '') + '">' + body + '</div></section>';
}
function rq(text, kind) { return '<div class="rq' + (kind ? ' ' + kind : '') + '">' + text + '</div>'; }
function note(kind, icon, html) {
  return '<div class="note ' + kind + '"><span class="ic">' + icon + '</span><div>' + html + '</div></div>';
}
function bg(kind, text) { return '<span class="bg ' + kind + '"><span class="dot"></span>' + esc(text) + '</span>'; }
/* 다음 조치사항 — 길어서 줄바꿈이 필요한 배지 */
function na1(na) { return '<span class="na ' + na.k + '"><span class="dot"></span>' + esc(na.t) + '</span>'; }
function lotBadge(st) {
  var m = { '판매중':'o', '거래성립':'k', '승인대기':'w', '신규문의':'a', '마감':'g', '등록':'w' };
  return bg(m[st] || 'g', st);
}
function bidBadge(st) {
  var m = { '수락':'o', '검토중':'k', '제안':'w', '거절':'a', '만료':'g' };
  return bg(m[st] || 'g', st);
}
function memBadge(st) {
  var m = { '승인':'o', '승인대기':'w', '신규문의':'a', '정지':'g' };
  return bg(m[st] || 'g', st);
}
function dealBadge(d) {
  var i = stIdx(d.rv, d.st), last = sdefOf(d.rv).length - 1;
  var k = d.st === 'S12' ? 'o' : (i >= 8 ? 'k' : (i >= 3 ? 's' : 'w'));
  return '<span class="bg ' + k + '"><span class="dot"></span>' +
    esc((i + 1) + '/' + (last + 1) + ' ' + stName(d.rv, d.st)) + '</span>';
}
function bars(rows) {
  return '<div class="bars">' + rows.map(function (r) {
    return '<div class="row"><span class="lb">' + esc(r.l) + '</span>' +
      '<span class="tr"><i class="' + (r.k || '') + '" data-w="' + r.p + '"></i></span>' +
      '<span class="vl">' + r.v + '</span></div>';
  }).join('') + '</div>';
}
function dl(rows) {
  return '<div class="dl">' + rows.map(function (r) {
    return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>';
  }).join('') + '</div>';
}
function selOpt(list, val, mapper) {
  return list.map(function (x) {
    var o = mapper(x);
    return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(val) ? ' selected' : '') + '>' +
      esc(o.t) + '</option>';
  }).join('');
}
function tw(head, rows, narrow) {
  return '<div class="tw"><table class="t' + (narrow ? ' narrow' : '') + '"><thead><tr>' + head +
    '</tr></thead><tbody>' + (rows || '<tr><td class="empty" colspan="9">해당 자료가 없습니다</td></tr>') +
    '</tbody></table></div>';
}
function ph(title, desc, badge) {
  return '<div class="ph"><h2>' + title + '</h2>' + (desc ? '<p>' + desc + '</p>' : '') +
    (badge || '') + '</div>';
}
function toast(t, b, k) {
  var el = document.createElement('div');
  el.className = 'toast' + (k ? ' ' + k : '');
  el.innerHTML = '<b>' + esc(t) + '</b>' + (b || '');
  $('#toasts').appendChild(el);
  setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 4200);
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4600);
}
function modal(title, body, foot, wide) {
  $('#ov').innerHTML = '<div class="md' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
    '<div class="md-hd"><h3>' + title + '</h3><button class="x" data-a="mdX" aria-label="닫기">✕</button></div>' +
    '<div class="md-bd">' + body + '</div>' +
    (foot ? '<div class="md-ft">' + foot + '</div>' : '') + '</div>';
  $('#ov').hidden = false;
}
function closeModal() { $('#ov').hidden = true; $('#ov').innerHTML = ''; }
function chips(list, opts) {
  if (!list.length) return '<p class="hint" style="font-size:11.5px;color:var(--tx-3)">첨부된 증빙이 없습니다.</p>';
  return '<div class="chips">' + list.map(function (e, i) {
    return '<span class="chip"><b>' + esc(e.t) + '</b><span>' + esc(e.f) + '</span>' +
      '<em>' + esc(stName(1, e.st)) + ' · ' + esc(e.at) + ' · ' + esc(e.sz) + '</em>' +
      (opts && opts.del ? '<button class="x" data-a="evDel" data-d="' + opts.d + '" data-i="' + i + '" aria-label="삭제">✕</button>' : '') +
      '</span>';
  }).join('') + '</div>';
}

/* ══ 3. 셸 ═══════════════════════════════════════════════════ */

function renderLogin() {
  $('#root').innerHTML =
  '<div class="login">' +
    '<div class="login-l">' +
      '<div class="brand"><span class="mark"><b>Cu</b></span>' +
        '<div><h1>비철금속 B2B 거래 플랫폼</h1><em>PROTOTYPE · 위시켓 158040</em></div></div>' +
      '<div class="lead">' +
        '<h2>전화로 받은 거래 한 건이<br><mark>플랫폼 안에서 정산까지</mark> 이어집니다</h2>' +
        '<p>지금은 조건을 전화·메신저로 주고받고, 배차·계근·검수·정산은 담당자가 따로 관리합니다. ' +
        '이 프로토타입은 <b>그 한 건이 끊기지 않고 흐르는 경로</b>를 화면으로 보여 줍니다.</p>' +
        '<div class="pts">' +
          '<div><b>01</b><span><b>12단계 상태 머신</b> — 허용된 다음 단계만 선택되고, 필수 입력이 비면 넘어가지 않습니다</span></div>' +
          '<div><b>02</b><span><b>변경이력은 쌓기만</b> — 누가·언제·어떤 상태에서 어떤 상태로·왜 바꿨는지가 한 줄씩 남습니다</span></div>' +
          '<div><b>03</b><span><b>대행 등록 1분</b> — 전화를 받으면서 물량을 넣고 저장까지, 화면에서 실측합니다</span></div>' +
          '<div><b>04</b><span><b>최종금액 산출근거</b> — 계근·검수 결과로 자동 계산하고 적용 규칙을 스냅샷으로 남깁니다</span></div>' +
          '<div><b>05</b><span><b>상태 순서는 설정</b> — 단계를 추가하는 일이 개발이 아니라 새 버전 만들기입니다</span></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="login-r"><div class="login-box">' +
      '<h3>로그인</h3>' +
      '<p>프로토타입입니다. 실제 인증은 연결되어 있지 않습니다.</p>' +
      '<div class="login-f">' +
        '<div class="f"><label>아이디</label><input type="text" value="demo" readonly></div>' +
        '<div class="f"><label>비밀번호</label><input type="password" value="demo1234" readonly>' +
          '<span class="hint">실제 구축 시 비밀번호는 복호화 불가능한 방식으로 저장합니다.</span></div>' +
        '<button class="b pri lg" data-a="login" data-r="OPS" data-u="OP1">로그인</button>' +
      '</div>' +
      '<div class="or">또는 역할을 골라 둘러보기</div>' +
      '<div class="demo"><b>역할별 데모 계정 — 화면과 접근 범위가 달라집니다</b>' +
        '<div class="ds">' +
          '<button data-a="login" data-r="OPS" data-u="OP1"><span class="av">조</span>' +
            '<span class="t"><b>조운영 · 거래운영 팀장</b><span>운영자 — 전용 메뉴 14개 · 현황판·대행 접수·계근·검수·정산·설정</span></span>' +
            '<span class="go">→</span></button>' +
          '<button data-a="login" data-r="SELLER" data-u="M01"><span class="av">김</span>' +
            '<span class="t"><b>김대성 · 대성비철</b><span>판매자 — 물량 등록·받은 제안·내 거래 (본인 건만)</span></span>' +
            '<span class="go">→</span></button>' +
          '<button data-a="login" data-r="BUYER" data-u="M06"><span class="av">오</span>' +
            '<span class="t"><b>오제일 · 제일신동</b><span>구매자 — 거래시장·구매 제안·내 거래 (본인 건만)</span></span>' +
            '<span class="go">→</span></button>' +
        '</div>' +
      '</div>' +
      '<p style="margin-top:16px;font-size:11px;color:var(--tx-3);line-height:1.6">' +
      '이 프로토타입의 모든 데이터는 <b>브라우저 메모리에만</b> 있습니다. 새로 고치면 초기 상태로 돌아갑니다.</p>' +
    '</div></div>' +
  '</div>';
}

function renderShell() {
  $('#root').innerHTML =
  '<div class="app">' +
    '<aside class="rail" id="rail">' +
      '<div class="rail-hd"><span class="mark"><b>Cu</b></span>' +
        '<div><h1>비철금속 거래 플랫폼</h1><em>PROTOTYPE</em></div></div>' +
      '<nav class="rail-nav" id="nav" aria-label="주 메뉴"></nav>' +
      '<div class="rail-ft" id="railft"></div>' +
    '</aside>' +
    '<div class="scrim" id="scrim" hidden data-a="railClose"></div>' +
    '<div class="main">' +
      '<header class="top">' +
        '<button class="burger" data-a="rail" aria-label="메뉴">☰</button>' +
        '<div class="crumb"><span class="c1" id="cb1"></span><span class="c2" id="cb2"></span></div>' +
        '<div class="site-sel"><label>역할</label><select id="roleSel" aria-label="역할 선택"></select></div>' +
        '<button class="tbtn" data-a="theme" title="화면 모드">◐<span class="lbl">모드</span></button>' +
        '<div class="who"><span class="av" id="avat"></span>' +
          '<span><span class="nm" id="uname"></span><span class="rl" id="urole"></span></span>' +
          '<button class="tbtn" data-a="logout" title="로그아웃">⏻</button></div>' +
      '</header>' +
      '<main id="page" class="page" tabindex="-1"></main>' +
    '</div>' +
  '</div>';
  renderRail(); renderTop();
}

function renderRail() {
  var groups = [], seen = {};
  MENUS.forEach(function (m) {
    if (m.roles.indexOf(S.role) < 0) return;
    if (!seen[m.g]) { seen[m.g] = []; groups.push(m.g); }
    seen[m.g].push(m);
  });
  $('#nav').innerHTML = groups.map(function (g) {
    return '<div class="g-lbl">' + esc(g) + '</div>' +
      seen[g].map(function (m) {
        var c = navCount(m.id);
        return '<button class="nav-i' + (S.route.split(':')[0] === m.id ? ' on' : '') +
          '" data-a="go" data-r="' + m.id + '">' +
          '<span class="ic">' + m.ic + '</span><span class="tt">' + esc(m.n) + '</span>' +
          (m.key ? '<span class="m">★</span>' : (m.m ? '<span class="m">모바일</span>' : '')) +
          (c ? '<span class="cnt">' + c + '</span>' : '') + '</button>';
      }).join('');
  }).join('');
  var vis = MENUS.filter(function (m) { return m.roles.indexOf(S.role) >= 0; }).length;
  $('#railft').innerHTML =
    '<b style="color:var(--rail-on)">★</b> 표시는 <b style="color:var(--rail-on)">개발 없이 운영자가 직접 바꾸는</b> 화면입니다.<br>' +
    '이 역할의 메뉴 ' + vis + '개 / 전체 ' + MENUS.length + '개 · 설정 <b style="color:var(--rail-on)">v' + ver().v + '</b>';
}
function navCount(id) {
  if (id === 'members')  return MEMBERS.filter(function (m) { return m.st === '승인대기' || m.st === '신규문의'; }).length;
  if (id === 'bidsAll')  return BIDS.filter(function (b) { return b.st === '제안' || b.st === '검토중'; }).length;
  if (id === 'sBids')    return BIDS.filter(function (b) { var L = lot(b.lot); return L && L.sel === S.me.id && (b.st === '제안' || b.st === '검토중'); }).length;
  if (id === 'weigh')    return DEALS.filter(function (d) { return d.st === 'S06'; }).length || '';
  if (id === 'inspect')  return DEALS.filter(function (d) { return d.st === 'S07'; }).length || '';
  if (id === 'settle')   return DEALS.filter(function (d) { return d.st === 'S08'; }).length || '';
  if (id === 'dispatch') return DEALS.filter(function (d) { return ['S01','S02','S03','S04','S05'].indexOf(d.st) >= 0; }).length || '';
  if (id === 'notify')   return NOTES.filter(function (n) { return !n.read && (S.role === 'OPS' || n.to === S.me.id); }).length || '';
  return '';
}
function roleLabel(r) { return { OPS:'운영자', SELLER:'판매자', BUYER:'구매자' }[r] || r; }
function renderTop() {
  var m = menu(S.route.split(':')[0]) || MENUS[0];
  $('#cb1').textContent = m.g + ' /';
  $('#cb2').textContent = m.n + (S.arg ? ' · ' + S.arg : '');
  $('#roleSel').innerHTML = selOpt(
    [{ r:'OPS', u:'OP1' }, { r:'SELLER', u:'M01' }, { r:'BUYER', u:'M06' }],
    S.role, function (x) {
      var nm = x.r === 'OPS' ? opsUser(x.u).nm : mem(x.u).co;
      return { v:x.r, t:roleLabel(x.r) + ' · ' + nm };
    });
  var nm = S.role === 'OPS' ? S.me.nm : S.me.nm;
  var sub = S.role === 'OPS' ? S.me.pos : (S.me.co + ' · ' + roleLabel(S.role));
  $('#avat').textContent = nm.slice(0, 1);
  $('#uname').textContent = nm;
  $('#urole').textContent = sub;
  document.title = m.n + ' — 비철금속 B2B 거래 플랫폼 프로토타입';
}

function go(route, push) {
  var base = route.split(':')[0];
  if (!canSee(route)) route = 'denied:' + base;
  S.route = route;
  S.arg = route.indexOf(':') > 0 ? route.slice(route.indexOf(':') + 1) : '';
  if (push !== false) {
    var h = '#/' + route;
    if (location.hash !== h) history.pushState(null, '', h);
  }
  S.railOpen = false;
  var rail = $('#rail'); if (rail) rail.classList.remove('open');
  var scrim = $('#scrim'); if (scrim) scrim.hidden = true;
  renderRail(); renderTop(); paint();
  var p = $('#page'); if (p) { p.scrollTop = 0; window.scrollTo(0, 0); }
}

function paint() {
  var p = $('#page');
  if (S.route.indexOf('denied:') === 0) {
    var m = menu(S.route.slice(7));
    p.innerHTML = '<div class="deny fade"><div class="ic">⊘</div><h3>이 화면에 접근할 수 없습니다</h3>' +
      '<p>현재 역할 <b>' + esc(roleLabel(S.role)) + '</b>에는 ' +
      (m ? '「' + esc(m.n) + '」' : '이 화면') + ' 권한이 없습니다. ' +
      '<b>이 프로토타입은 역할별 표시 흐름을 시뮬레이션</b>합니다. 실제 구축에서는 서버가 권한을 검증한 뒤 ' +
      '허용된 데이터만 반환합니다 (MEM-05).</p></div>';
    return;
  }
  var base = S.route.split(':')[0];
  var fn = VIEW[base] || VIEW[S.role === 'OPS' ? 'board' : (S.role === 'SELLER' ? 'sLots' : 'market')];
  p.innerHTML = '<div class="fade">' + fn(S.arg) + '</div>';
  $$('[data-w]').forEach(function (el) {
    var w = el.getAttribute('data-w');
    requestAnimationFrame(function () { el.style.setProperty('--w', w + '%'); });
  });
  if (S.qtimer) startQuickTimer();
}

/* ══ 4. 화면 ═════════════════════════════════════════════════ */
var VIEW = {};
window.__PT.VIEW = VIEW;

/* ── 4.1 전체 현황판 (OPS-11 · OPS-09) ★ ─────────────────── */
VIEW.board = function () {
  var cells = boardCells();
  var tiles = '<div class="tiles board8">' + cells.map(function (c) {
    return '<button class="tile' + (c.hot ? ' hot' : (c.warn ? ' warn' : '')) +
      '" data-a="go" data-r="' + c.go + '">' +
      '<span class="k">' + esc(c.k) + '</span>' +
      '<span class="v">' + c.n + '<small>건</small></span>' +
      '<span class="d">' + esc(c.d) + '</span></button>';
  }).join('') + '</div>';

  var act = DEALS.slice().sort(function (a, b) { return stIdx(a.rv, a.st) - stIdx(b.rv, b.st); })
    .map(function (d) {
      var na = nextAction(d), L = lot(d.lot);
      return '<tr><td class="nowrap"><b>' + esc(d.id) + '</b></td>' +
        '<td>' + dealBadge(d) + '</td>' +
        '<td class="nowrap">' + esc(item(d.it).n) + ' · ' + esc(grade(d.gr).n) + '</td>' +
        '<td class="r nowrap">' + ton(d.wt) + '</td>' +
        '<td class="nowrap">' + esc(mem(d.sel).co) + ' → ' + esc(mem(d.buy).co) + '</td>' +
        '<td class="na-c">' + na1(na) + '</td>' +
        '<td class="c"><button class="b sm" data-a="go" data-r="deal:' + d.id + '">열기</button></td></tr>';
    }).join('');

  var byItem = ITEMS.filter(function (i) { return i.act; }).map(function (i) {
    var n = DEALS.filter(function (d) { return d.it === i.c; }).length;
    return { l:i.n, p:Math.round(n / Math.max(1, DEALS.length) * 100), v:n + '건', k:'' };
  });

  return ph('전체 현황판',
      '공고 §10이 요구한 8단 현황판입니다. 각 칸을 누르면 해당 목록으로 바로 들어갑니다. ' +
      '오른쪽 「다음 조치사항」은 별도로 관리하는 값이 아니라 <b>상태정의에 적어 둔 필수 입력 항목에서 자동으로 나옵니다</b>.',
      rq('<b>OPS-11</b> 8단 전체 현황판 · <b>OPS-09</b> 현재상태와 다음 조치사항 · <b>PRN-04</b> 관리자 화면 중시')) +
    tiles +
    note('k', 'i', '<b>두 축을 분리했습니다.</b> 앞의 세 칸(신규문의·승인대기·판매중 물량)은 <b>회원과 물량의 생애주기</b>이고, ' +
      '뒤의 다섯 칸은 <b>거래의 생애주기</b>입니다. 한 컬럼에 섞으면 「판매중인 물량」과 「운송중인 거래」가 같은 상태값에 들어가 ' +
      '이후 현황판과 통계가 전부 어긋납니다.') +
    '<div class="cols c11" style="margin-top:16px">' +
      card('설정 버전 — 이 거래들이 참조하는 상태·규칙', dl([
        ['적용 버전', '<b>v' + ver().v + '</b> · ' + esc(ver().from) + ' 부터'],
        ['상태 단계', sdefOf(ver().v).length + '개'],
        ['버전 대장', VERS.length + '개 버전 (기존 거래는 기존 버전을 계속 참조)'],
        ['금액 규칙', '수분 공제 ' + pc(ver().rule.moisture, 1) + ' · 계근 오차 ±' + pc(ver().rule.weighTol, 1) +
          ' · 운송비 ' + esc(ver().rule.freightBy) + ' 부담']
      ]) + '<div class="bar" style="margin-top:11px">' +
        '<button class="b sm" data-a="go" data-r="states">상태·전이 설정 열기</button>' +
        '<button class="b sm" data-a="go" data-r="codes">품목·등급 관리</button></div>') +
      card('품목별 거래 분포', bars(byItem)) +
    '</div>' +
    '<div style="height:16px"></div>' +
    card('진행 중인 거래 ' + DEALS.length + '건 — 상태 순서대로',
      tw('<th>거래번호</th><th>현재 상태</th><th>품목·등급</th><th class="r">등록중량</th>' +
         '<th>판매자 → 구매자</th><th class="na-c">다음 조치사항</th><th class="c">이동</th>', act),
      '', '', 1);
};

/* ── 4.2 회원 승인 (OPS-01 · MEM-04) ─────────────────────── */
VIEW.members = function () {
  var wait = MEMBERS.filter(function (m) { return m.st === '승인대기' || m.st === '신규문의'; });
  var ok   = MEMBERS.filter(function (m) { return m.st === '승인'; });
  var row = function (m) {
    var on = !!S.reveal['m' + m.id];
    return '<tr><td class="nowrap"><b>' + esc(m.co) + '</b><br><small style="color:var(--tx-3)">' + esc(m.nm) + '</small></td>' +
      '<td>' + bg(m.role === 'SELLER' ? 'k' : 's', m.role === 'SELLER' ? '판매자' : '구매자') + '</td>' +
      '<td>' + memBadge(m.st) + '</td>' +
      '<td><span class="mask"><span class="v' + (on ? '' : ' hid') + '">' + esc(biz(m.biz, on)) + '</span>' +
        '<button class="eye' + (on ? ' on' : '') + '" data-a="reveal" data-k="m' + m.id + '" title="사업자번호 보기">◉</button></span></td>' +
      '<td><span class="mask"><span class="v' + (on ? '' : ' hid') + '">' + esc(tel(m.tel, on)) + '</span></span></td>' +
      '<td class="nowrap">' + esc(m.rg) + '</td><td class="nowrap">' + esc(m.at) + '</td>' +
      '<td class="c nowrap">' + (m.st === '승인'
        ? '<button class="b sm" data-a="memHold" data-i="' + m.id + '">정지</button>'
        : '<button class="b sm pri" data-a="memOk" data-i="' + m.id + '">승인</button> ' +
          '<button class="b sm" data-a="memNo" data-i="' + m.id + '">반려</button>') + '</td></tr>';
  };
  return ph('회원 승인',
      '가입 신청과 활성 상태를 분리했습니다. <b>승인 전 계정은 로그인해도 거래에 참여할 수 없습니다.</b> ' +
      '반려 사유는 이력에 남습니다. 목록에서 사업자번호·연락처는 가려서 표시하고, 전체 값은 눈 버튼으로 확인합니다.',
      rq('<b>MEM-01~05</b> 가입·로그인·승인·권한 · <b>OPS-01</b> 회원승인') +
      rq('<b>Q-06</b> 사업자 확인 절차(사업자등록증 첨부·검증)의 유무는 확인이 필요합니다', 'act')) +
    card('승인이 필요한 신청 ' + wait.length + '건',
      tw('<th>거래처</th><th>구분</th><th>상태</th><th>사업자번호</th><th>연락처</th><th>지역</th><th>신청일</th><th class="c">처리</th>',
        wait.map(row).join('')), '', '', 1) +
    '<div style="height:16px"></div>' +
    card('승인된 회원 ' + ok.length + '명',
      tw('<th>거래처</th><th>구분</th><th>상태</th><th>사업자번호</th><th>연락처</th><th>지역</th><th>승인일</th><th class="c">처리</th>',
        ok.map(row).join('')), '', '', 1);
};

/* ── 4.3 대행 물량 등록 — 1분 입력 (OPS-02 · LOT-09) ★ ───── */
VIEW.quickLot = function () {
  var recent = LOTS.filter(function (l) { return l.by; }).slice(0, 4);
  var itSel = selOpt(ITEMS.filter(function (i) { return i.act; }), 'CU', function (i) {
    return { v:i.c, t:i.n + ' (기준 ' + nf(i.base) + '원/kg)' };
  });
  return ph('대행 물량 등록 <span class="bg a"><span class="dot"></span>1분 입력</span>',
      '전화를 받으면서 품목·등급·중량·지역·희망가격을 순서대로 넣고 저장까지 <b>약 1분</b>에 끝나도록 만든 단일 화면입니다. ' +
      '입력 항목만 남기고 안내문·탭·아코디언을 두지 않았습니다. <b>대행입력자가 함께 기록됩니다.</b>',
      rq('<b>OPS-02</b> 대행 물량등록 1분 · <b>LOT-01~09</b> 물량 항목 · <b>PRN-03</b> 직원 지원 방식 병행') +
      rq('<b>인수 기준</b> 전화 시나리오 5건을 운영자가 입력해 실측합니다 — 항목 수·클릭 수를 함께 기록', 'sec')) +
    '<div class="cols c21">' +
      card('빠른 입력',
        '<div class="qt" id="qtBox"><span class="k">경과</span><b id="qtV">0.0</b><span class="u">초</span>' +
          '<span class="qt-d" id="qtD">첫 항목을 입력하면 측정이 시작됩니다 · 목표 60초</span>' +
          '<button class="b sm" data-a="qtReset">초기화</button></div>' +
        '<form class="fg" id="qForm" onsubmit="return false">' +
          '<div class="f"><label>판매자 <i>*</i></label>' +
            '<select id="qSel" data-a="qTick">' + selOpt(MEMBERS.filter(function (m) { return m.role === 'SELLER' && m.st === '승인'; }), 'M04',
              function (m) { return { v:m.id, t:m.co + ' · ' + m.nm + ' (' + m.rg + ')' }; }) + '</select>' +
            '<span class="hint">최근 통화 순으로 정렬합니다. 반복 거래처는 이전 입력값을 불러옵니다.</span></div>' +
          '<div class="f"><label>품목 <i>*</i></label><select id="qIt" data-a="qItem">' + itSel + '</select>' +
            '<span class="hint">최근 사용 순 정렬 · 코드값 관리에서 추가합니다 (LOT-01)</span></div>' +
          '<div class="f"><label>등급 <i>*</i></label><select id="qGr" data-a="qTick">' +
            selOpt(gradesOf('CU'), 'CU-1', function (g) { return { v:g.c, t:g.n }; }) + '</select></div>' +
          '<div class="f"><label>예상중량 (kg) <i>*</i></label>' +
            '<input type="number" id="qWt" placeholder="예: 9800" data-a="qTick" inputmode="numeric">' +
            '<span class="hint">확정 중량은 계근 단계에서 확정됩니다 (LOT-03 → STS-07)</span></div>' +
          '<div class="f"><label>지역 <i>*</i></label><select id="qRg" data-a="qTick">' +
            selOpt(REGIONS, '영남', function (r) { return { v:r, t:r }; }) + '</select></div>' +
          '<div class="f"><label>희망가격 (원/kg) <i>*</i></label>' +
            '<input type="number" id="qPx" placeholder="예: 11600" data-a="qTick" inputmode="numeric">' +
            '<span class="hint" id="qPxH">기준 단가 11,800원 · 등급 조정 ± 0%</span></div>' +
          '<div class="f"><label>출고 가능일</label><input type="date" id="qOut" value="2026-04-08" data-a="qTick"></div>' +
          '<div class="f"><label>사진</label>' +
            '<button class="b" data-a="qPhoto" style="height:33px">＋ 사진 추가 (모의)</button>' +
            '<span class="hint" id="qPhH">첨부 0장 — 파일 전용 저장 공간으로 올라가고 목록용 축소 이미지가 생성됩니다</span></div>' +
          '<div class="f wide"><label>메모</label><input type="text" id="qMemo" placeholder="통화 중 들은 특이사항" data-a="qTick"></div>' +
          '<div class="f wide"><div class="bar">' +
            '<button class="b pri lg" data-a="qSave">저장 — 판매중으로 등록</button>' +
            '<button class="b lg" data-a="qSaveWait">승인대기로 저장</button>' +
            '<span class="sp"></span>' +
            '<span style="font-size:11.5px;color:var(--tx-3)">대행입력자: <b>' + esc(S.me.nm) + '</b></span>' +
          '</div></div>' +
        '</form>', '', '', 0) +
      '<div class="stack">' +
        card('이 화면을 이렇게 만든 이유',
          '<ul class="why">' +
            '<li><b>한 화면 · 스크롤 없음</b> — 통화 중에 탭을 오가면 1분을 넘깁니다</li>' +
            '<li><b>필수 6항목만</b> — 판매자·품목·등급·중량·지역·희망가격. 나머지는 나중에 채웁니다</li>' +
            '<li><b>품목을 고르면 등급이 그 품목의 것만</b> 남습니다 — 잘못 고를 수 없습니다</li>' +
            '<li><b>기준 단가를 옆에 표시</b> — 희망가격이 시세에서 크게 벗어나면 통화 중에 확인합니다</li>' +
            '<li><b>대행입력자 기록</b> — 나중에 「누가 이 가격을 넣었나」를 추적할 수 있습니다 (PRN-03)</li>' +
          '</ul>') +
        card('최근 대행 등록 ' + recent.length + '건',
          tw('<th>물량</th><th>품목</th><th class="r">중량</th><th>입력자</th>',
            recent.map(function (l) {
              return '<tr><td class="nowrap"><b>' + esc(l.id) + '</b></td>' +
                '<td class="nowrap">' + esc(item(l.it).n) + '</td>' +
                '<td class="r nowrap">' + ton(l.wt) + '</td>' +
                '<td class="nowrap">' + esc(opsUser(l.by).nm) + '</td></tr>';
            }).join(''), 1), '', '', 1) +
      '</div>' +
    '</div>';
};

/* ── 4.4 대행 구매제안 입력 (OPS-03 · BID-05) ────────────── */
VIEW.quickBid = function () {
  var sale = LOTS.filter(function (l) { return l.st === '판매중'; });
  var L = sale[0];
  return ph('대행 구매제안 입력',
      '판매자·구매자를 대신해 제안을 넣습니다. 위 대행 물량 등록과 같은 방식이며 <b>대행입력자를 기록</b>합니다.',
      rq('<b>OPS-03</b> 대행 구매제안 · <b>BID-01~05</b> 수량·단가·조건·상태·대행입력')) +
    '<div class="cols c21">' +
      card('빠른 입력',
        '<form class="fg" onsubmit="return false">' +
          '<div class="f wide"><label>대상 물량 <i>*</i></label><select id="qbLot" data-a="qbLot">' +
            selOpt(sale, L ? L.id : '', function (l) {
              return { v:l.id, t:l.id + ' · ' + item(l.it).n + ' ' + grade(l.gr).n + ' · ' + ton(l.wt) +
                ' · ' + mem(l.sel).co + ' (희망 ' + nf(l.want) + '원/kg)' };
            }) + '</select></div>' +
          '<div class="f"><label>구매자 <i>*</i></label><select id="qbBuy">' +
            selOpt(MEMBERS.filter(function (m) { return m.role === 'BUYER' && m.st === '승인'; }), 'M08',
              function (m) { return { v:m.id, t:m.co + ' · ' + m.nm }; }) + '</select></div>' +
          '<div class="f"><label>구매수량 (kg) <i>*</i></label><input type="number" id="qbQty" value="' +
            (L ? L.wt : 0) + '" inputmode="numeric"></div>' +
          '<div class="f"><label>단가 (원/kg) <i>*</i></label><input type="number" id="qbPx" value="' +
            (L ? L.want : 0) + '" inputmode="numeric">' +
            '<span class="hint" id="qbH">판매자 희망가 ' + (L ? nf(L.want) : 0) + '원/kg</span></div>' +
          '<div class="f wide"><label>거래조건</label>' +
            '<input type="text" id="qbCond" value="계근 기준 정산" placeholder="인수 시점 · 운송 부담 · 결제 기일">' +
            '<span class="hint">「조건」 항목의 정의가 원문에 없습니다 — 확인 필요 (Q-08)</span></div>' +
          '<div class="f wide"><div class="bar">' +
            '<button class="b pri lg" data-a="qbSave">제안 등록</button>' +
            '<span class="sp"></span>' +
            '<span style="font-size:11.5px;color:var(--tx-3)">대행입력자: <b>' + esc(S.me.nm) + '</b></span>' +
          '</div></div>' +
        '</form>') +
      card('가격 협상을 1차에서 빼는 판단',
        note('w', '!', '<b>협상(재제안·역제안)은 1차 범위에 넣지 않았습니다.</b> RFP §6 필수 범위에 협상 기능이 명시되어 있지 않은 반면 ' +
          '§3 비교표는 「구매 제안·가격 협상」을 핵심으로 두었습니다 — 두 곳이 어긋납니다 (Q-10).') +
        '<p style="margin-top:12px;font-size:12.5px;line-height:1.7;color:var(--tx-2)">1차는 <b>제안 → 수락/거절</b>입니다. ' +
        '대신 제안 테이블에 <b>이력 구조를 미리 두어</b>, 2차에서 가격 조정 왕복만 추가하면 되도록 만듭니다. ' +
        '지금 자리를 남기는 비용은 작고, 남기지 않으면 2차에서 같은 코드를 다시 씁니다.</p>') +
    '</div>';
};

/* ── 4.5 거래 상세 · 상태 변경 · 이력 · 증빙 ★★ ──────────── */
/* 이 과업의 공수가 몰리는 화면입니다 (OPS-04/10 · STS 전체) */
VIEW.deal = function (id) {
  var d = deal(id) || DEALS[0];
  if (!d) return ph('거래 상세', '거래가 없습니다.');
  if (!isParty(d)) {
    return '<div class="deny fade"><div class="ic">⊘</div><h3>이 거래를 조회할 수 없습니다</h3>' +
      '<p>판매자·구매자는 <b>본인이 당사자인 거래만</b> 조회하도록 표시 흐름을 구성했습니다. ' +
      '실제 구축에서는 서버의 권한 검증으로 주소를 직접 입력해도 남의 거래 데이터를 반환하지 않습니다 (MEM-05).</p></div>';
  }
  var isOps = S.role === 'OPS';
  var vv = verOf(d.rv), sdef = vv.sdef, tr = vv.tr[d.st] || { next:[], back:[] };
  var cur = stIdx(d.rv, d.st);

  /* 단계 진행 표시 */
  var steps = '<div class="steps">' + sdef.map(function (s, i) {
    var cls = i < cur ? ' done' : (i === cur ? ' now' : '');
    var when = null;
    d.hist.forEach(function (h) { if (h.to === s.c && h.kind === 'fwd') when = h; });
    return '<div class="' + cls.trim() + '">' +
      '<span class="s-n">' + pad(i + 1, 2) + '</span>' +
      '<span class="s-t">' + esc(s.n) + '</span>' +
      '<span class="s-d">' + (when ? esc(when.at.slice(5)) + '<br>' + esc(actorName(when.by))
        : (i === cur ? '진행 중' : '—')) + '</span></div>';
  }).join('') + '</div>';

  /* 다음 상태 · 되돌리기 후보 */
  var na = nextAction(d);
  var nextBtns = tr.next.map(function (c) {
    var def = sdef.filter(function (x) { return x.c === c; })[0];
    var miss = (def.req || []).filter(function (k) { return d.f[k] == null || d.f[k] === ''; })
      .concat((def.ev || []).filter(function (t) { return !d.ev.some(function (e) { return e.t === t; }); }));
    return '<button class="b ' + (miss.length ? '' : 'pri') + '" data-a="stGo" data-d="' + d.id +
      '" data-t="' + c + '"' + (miss.length ? ' data-miss="1"' : '') + '>' +
      esc(def.n) + ' 로 넘기기' + (miss.length ? ' (필수 ' + miss.length + '건 미입력)' : '') + '</button>';
  }).join('');
  var backBtns = tr.back.filter(function (c) { return c !== d.st; }).map(function (c) {
    return '<button class="b sm" data-a="stBack" data-d="' + d.id + '" data-t="' + c + '">↩ ' +
      esc(stName(d.rv, c)) + ' 로 되돌리기</button>';
  }).join('');
  var blocked = sdef.filter(function (x) { return tr.next.indexOf(x.c) < 0 && x.c !== d.st; })
    .slice(0, 3).map(function (x) {
      return '<button class="b sm" disabled title="전이규칙이 허용하지 않습니다">' + esc(x.n) + '</button>';
    }).join('');

  /* 변경이력 (append only) */
  var hist = '<ul class="hist">' + d.hist.slice().reverse().map(function (h) {
    var kindTx = h.kind === 'ev' ? '증빙' : (h.kind === 'fix' ? '정정' : (h.kind === 'back' ? '되돌리기' : '상태변경'));
    var cls = h.kind === 'back' ? ' act' : (h.kind === 'ev' || h.kind === 'fix' ? ' dim' : '');
    return '<li class="' + cls.trim() + '"><span class="pin"></span><div>' +
      '<div class="hh"><b>' + (h.kind === 'fwd' || h.kind === 'back'
        ? esc(stName(h.rv, h.from) === h.from ? h.from : stName(h.rv, h.from)) + ' → ' + esc(stName(h.rv, h.to))
        : esc(kindTx)) + '</b>' +
      bg(h.kind === 'back' ? 'a' : (h.kind === 'ev' ? 's' : (h.kind === 'fix' ? 'w' : 'g')), kindTx) +
      '<time>' + esc(h.at) + '</time>' +
      '<span style="font-size:11px;color:var(--tx-3)">' + esc(actorName(h.by)) +
      (h.agent ? ' · 대행입력' : '') + ' · 설정 v' + h.rv + '</span></div>' +
      (h.why ? '<p>' + esc(h.why) + '</p>' : '') +
      '</div></li>';
  }).join('') + '</ul>';

  /* 단계별 입력값 */
  var fkeys = ['차량번호','기사명','기사연락처','운송사','상차예정일','상차시각','도착시각',
               '계근소','실중량','판정등급','검수의견','불순물공제','최종금액','입금일','지급일'];
  var fRows = fkeys.filter(function (k) { return d.f[k] != null && d.f[k] !== ''; }).map(function (k) {
    var v = d.f[k];
    if (k === '판정등급') v = grade(v).n;
    else if (k === '실중량') v = kg(v);
    else if (k === '최종금액' || k === '불순물공제') v = won(v);
    else if (k === '기사연락처') v = tel(v, !!S.reveal['drv' + d.id]) +
      ' <button class="eye' + (S.reveal['drv' + d.id] ? ' on' : '') + '" data-a="reveal" data-k="drv' + d.id + '">◉</button>';
    return [k, '<b>' + (k === '기사연락처' ? v : esc(v)) + '</b>' +
      (isOps ? ' <button class="b sm gh" data-a="fixOpen" data-d="' + d.id + '" data-k="' + esc(k) + '">정정</button>' : '')];
  });

  /* 계근 차이 */
  var wd = weighDiff(d);
  var wdNote = wd ? note(wd.over ? 'w' : 'o', wd.over ? '!' : '✓',
    '<b>계근 차이 ' + (wd.diff >= 0 ? '+' : '') + nf(wd.diff) + ' kg (' + (wd.rate >= 0 ? '+' : '') +
    pc(wd.rate, 2) + ')</b> — 등록 예상중량 ' + kg(d.wt) + ' → 계근 실중량 ' + kg(d.f['실중량']) + '. ' +
    (wd.over ? '허용 오차 ±' + pc(wd.tol, 1) + '를 넘었습니다. 사람이 먼저 확인해야 합니다.'
             : '허용 오차 ±' + pc(wd.tol, 1) + ' 안입니다.') +
    ' 두 값을 <b>덮어쓰지 않고 나란히 보관</b>합니다.') : '';

  /* 금액 */
  var amtBlock = '';
  if (d.snap) {
    amtBlock = card('최종금액 — 확정본 <span class="bg o"><span class="dot"></span>스냅샷 저장</span>',
      calcTable(d.snap.lines) +
      note('o', '✓', '<b>확정 시점의 규칙을 그대로 복제해 저장했습니다.</b> 확정자 ' + esc(actorName(d.snap.by)) +
        ' · ' + esc(d.snap.at) + ' · 설정 v' + d.snap.rv + '. ' +
        '이후 기준 단가나 계산 규칙이 바뀌어도 <b>이 거래의 금액은 변하지 않습니다.</b>'),
      won(d.snap.amt) + ' (부가세 별도)');
  } else if (d.f['실중량']) {
    var c = calcAmount(d);
    amtBlock = card('최종금액 — 계산값 <span class="bg w"><span class="dot"></span>미확정</span>',
      calcTable(c.lines) +
      note('k', 'i', '<b>계산은 자동, 확정은 사람이 합니다.</b> 아래 「최종금액 확정」을 누르면 그 시점의 규칙이 스냅샷으로 저장됩니다. ' +
        '금액 다툼이 생기는 항목이라 <b>사람의 승인 지점</b>을 남겼습니다.') +
      (isOps && d.st === 'S08' ? '<div class="bar" style="margin-top:11px">' +
        '<button class="b pri" data-a="settleFix" data-d="' + d.id + '">최종금액 확정 (' + won(c.amt) + ')</button></div>' : ''),
      won(c.amt) + ' 예상');
  }

  var L = lot(d.lot);
  return ph('거래 상세 <span class="bg g"><span class="dot"></span>' + esc(d.id) + '</span>',
      isOps
        ? '12단계 상태 변경 · 시간순 변경이력 · 단계별 증빙 첨부 · 관련 물량·제안·거래처 정보가 <b>이 한 화면</b>에 모입니다. ' +
          '상태 변경은 <b>허용된 다음 상태만</b> 선택되고, 그 단계의 <b>필수 입력 항목이 채워지지 않으면 넘어가지 않습니다.</b>'
        : '지금 어느 단계인지, 각 단계가 <b>언제 누구에 의해</b> 지나갔는지, 증빙자료를 확인합니다. ' +
          '당사자에게 공개되는 범위만 표시합니다.',
      rq('<b>STS-01~12</b> 12단계 · <b>STS-H1~H4</b> 변경자·변경시간·이전상태·증빙 · <b>OPS-04/10</b> 거래상태 관리·증빙 첨부') +
      (isOps ? rq('<b>STS-H5</b> 상태 순서는 설정 데이터입니다 — 이 거래는 <b>설정 v' + d.rv + '</b>을 참조합니다', 'sec') : '')) +

    card('진행 상태 — ' + (cur + 1) + ' / ' + sdef.length + ' 단계', steps, '', '', 1) +
    '<div style="height:16px"></div>' +

    (isOps ? card('상태 변경',
      (nextBtns || backBtns ? '<div class="bar">' + nextBtns + backBtns + blocked + '</div>' :
        note('o', '✓', '거래가 완료되었습니다. 더 넘길 상태가 없습니다.')) +
      note(na.k === 'w' ? 'w' : 'k', na.k === 'w' ? '!' : 'i',
        '<b>다음 조치사항: ' + esc(na.t) + '</b><br>' +
        '이 문구는 별도로 관리하는 값이 아니라 <b>상태정의(v' + d.rv + ')에 적어 둔 필수 입력 항목에서 자동으로 나옵니다.</b>' +
        (na.need ? ' 아래 「단계별 입력」에서 채우면 버튼이 활성화됩니다.' : '')) +
      (na.need ? '<div class="bar" style="margin-top:11px">' +
        '<button class="b pri" data-a="fillOpen" data-d="' + d.id + '" data-t="' + na.to + '">' +
        esc(na.need.join(' · ')) + ' 입력하기</button></div>' : ''),
      '전이규칙 v' + d.rv + ' · 허용된 전이만 선택됩니다') + '<div style="height:16px"></div>' : '') +

    '<div class="cols c21">' +
      '<div class="stack">' +
        (wdNote ? wdNote : '') +
        (amtBlock || '') +
        card('단계별 입력', fRows.length ? dl(fRows) :
          '<p style="font-size:12.5px;color:var(--tx-3)">아직 입력된 값이 없습니다.</p>',
          fRows.length + '항목' + (isOps ? ' · 정정은 덮어쓰지 않고 이력에 남습니다' : '')) +
        card('증빙자료 ' + d.ev.length + '건',
          chips(d.ev, isOps ? { del:0, d:d.id } : null) +
          (isOps ? '<div class="bar" style="margin-top:12px">' +
            ['상차사진','계근표','검수자료','증빙사진','기타'].map(function (t) {
              return '<button class="b sm" data-a="evAdd" data-d="' + d.id + '" data-t="' + t + '">＋ ' + t + '</button>';
            }).join('') + '</div>' : ''),
          '프로토타입에서는 모의 파일을 붙입니다. 실제 구축에서는 거래·단계·종류와 함께 파일을 저장하고 이력의 해당 지점에 연결합니다') +
        card('변경이력 ' + d.hist.length + '건 <span class="bg s"><span class="dot"></span>append only</span>',
          hist,
          '덮어쓰지 않고 쌓기만 합니다 — 잘못 넣은 값은 수정이 아니라 정정 이력을 추가합니다') +
      '</div>' +
      '<div class="stack">' +
        card('거래 정보', dl([
          ['거래번호', '<b>' + esc(d.id) + '</b> <small style="color:var(--tx-3)">자동생성 (DEL-02)</small>'],
          ['확정일', esc(d.at)],
          ['품목·등급', esc(item(d.it).n) + ' · ' + esc(grade(d.gr).n)],
          ['등록 예상중량', kg(d.wt)],
          ['거래수량', kg(d.qty)],
          ['제안 단가', won(d.px) + ' / kg'],
          ['거래조건', esc(d.cond)],
          ['지역', esc(d.rg)],
          ['설정 버전', '<b>v' + d.rv + '</b> · 상태 ' + sdef.length + '단계']
        ])) +
        card('당사자', dl([
          ['판매자', esc(mem(d.sel).co) + ' · ' + esc(mem(d.sel).nm)],
          ['구매자', esc(mem(d.buy).co) + ' · ' + esc(mem(d.buy).nm)],
          ['연결 물량', '<a href="#/lot:' + esc(d.lot) + '" data-a="go" data-r="lot:' + esc(d.lot) + '">' + esc(d.lot) + '</a>' +
            ' <small style="color:var(--tx-3)">(' + esc(L ? L.st : '') + ')</small>'],
          ['연결 제안', esc(d.bidId) + ' <small style="color:var(--tx-3)">(수락)</small>'],
          ['대행 입력', d.byAgent ? '<b>' + esc(opsUser(d.byAgent).nm) + '</b> (운영자 대행)' :
            '<span style="color:var(--tx-3)">사용자 직접 등록</span>']
        ]), '물량·제안·회원이 자동 연결됩니다 (DEL-03)') +
      '</div>' +
    '</div>';
};

function calcTable(lines) {
  return '<div class="calc">' + lines.map(function (l) {
    return '<div class="calc-r' + (l.hi === 2 ? ' fin' : (l.hi ? ' hi' : '')) + '">' +
      '<span class="cl">' + l.l + '</span>' +
      '<span class="cv">' + l.v + '</span>' +
      '<span class="cn">' + esc(l.n || '') + '</span></div>';
  }).join('') + '</div>';
}

/* ── 4.6 거래 목록 (OPS) ─────────────────────────────────── */
VIEW.deals = function () {
  var f = S.boardFlt, list = f ? boardFilter(f) : DEALS;
  var rows = list.map(function (d) {
    var na = nextAction(d);
    return '<tr><td class="nowrap"><b>' + esc(d.id) + '</b><br><small style="color:var(--tx-3)">' + esc(d.at) + '</small></td>' +
      '<td>' + dealBadge(d) + '</td>' +
      '<td class="nowrap">' + esc(item(d.it).n) + '<br><small style="color:var(--tx-3)">' + esc(grade(d.gr).n) + '</small></td>' +
      '<td class="r nowrap">' + ton(d.wt) + (d.f['실중량'] ? '<br><small style="color:var(--key-tx)">실 ' + ton(d.f['실중량']) + '</small>' : '') + '</td>' +
      '<td class="r nowrap">' + won(d.px) + '</td>' +
      '<td class="r nowrap">' + (d.snap ? '<b>' + won(d.snap.amt) + '</b><br><small style="color:var(--ok)">확정</small>' :
        (d.f['실중량'] ? '<small style="color:var(--tx-3)">' + won(calcAmount(d).amt) + ' 예상</small>' : '—')) + '</td>' +
      '<td class="nowrap">' + esc(mem(d.sel).co) + '<br><small style="color:var(--tx-3)">→ ' + esc(mem(d.buy).co) + '</small></td>' +
      '<td class="na-c">' + na1(na) + '</td>' +
      '<td class="c"><button class="b sm" data-a="go" data-r="deal:' + d.id + '">열기</button></td></tr>';
  }).join('');
  var fbtn = function (v, t) {
    return '<button class="b sm' + (f === v ? ' pri' : '') + '" data-a="dealFlt" data-v="' + v + '">' + t +
      ' (' + (v ? boardFilter(v).length : DEALS.length) + ')</button>';
  };
  return ph('거래 목록',
      '상태·기간·거래처·품목으로 조회합니다. <b>처리해야 할 건이 위로</b> 옵니다. ' +
      '「다음 조치사항」이 노란색인 건은 필수 입력이 비어 다음 단계로 넘어갈 수 없는 건입니다.',
      rq('<b>OPS-04</b> 거래상태 관리 · <b>OPS-09</b> 현재상태와 다음 조치사항 · <b>DEL-01~03</b> 거래확정·번호생성·정보연결')) +
    '<div class="bar" style="margin-bottom:14px">' + fbtn('', '전체') + fbtn('S01', '거래확정') +
      fbtn('run', '운송중') + fbtn('insp', '검수대기') + fbtn('settle', '정산대기') + '</div>' +
    card('', tw('<th>거래번호</th><th>현재 상태</th><th>품목</th><th class="r">중량</th><th class="r">단가</th>' +
      '<th class="r">최종금액</th><th>당사자</th><th class="na-c">다음 조치사항</th><th class="c">이동</th>', rows), '', '', 1);
};

/* ── 4.7 물량 관리 (OPS) ─────────────────────────────────── */
VIEW.lots = function () {
  var rows = LOTS.map(function (l) {
    return '<tr><td class="nowrap"><b>' + esc(l.id) + '</b><br><small style="color:var(--tx-3)">' + esc(l.at) + '</small></td>' +
      '<td>' + lotBadge(l.st) + '</td>' +
      '<td class="nowrap">' + esc(item(l.it).n) + '<br><small style="color:var(--tx-3)">' + esc(grade(l.gr).n) + '</small></td>' +
      '<td class="r nowrap">' + ton(l.wt) + '</td>' +
      '<td class="r nowrap">' + won(l.want) + '</td>' +
      '<td class="nowrap">' + esc(mem(l.sel).co) + '</td>' +
      '<td class="nowrap">' + esc(l.rg) + '</td>' +
      '<td class="c">' + (l.ph ? '<span class="bg g"><span class="dot"></span>' + l.ph + '장</span>' :
        '<span class="bg a"><span class="dot"></span>없음</span>') + '</td>' +
      '<td class="nowrap">' + (l.by ? '<b>' + esc(opsUser(l.by).nm) + '</b> 대행' : '<span style="color:var(--tx-3)">직접</span>') + '</td>' +
      '<td class="c">' + (l.st === '승인대기'
        ? '<button class="b sm pri" data-a="lotOk" data-i="' + l.id + '">판매중으로</button>'
        : '<button class="b sm" data-a="go" data-r="lot:' + l.id + '">열기</button>') + '</td></tr>';
  }).join('');
  return ph('물량 관리',
      '물량의 생애주기는 <b>등록 → 승인대기 → 판매중 → 거래성립 → 마감</b>입니다. ' +
      '거래의 생애주기(12단계)와 <b>별개의 축</b>으로 관리합니다 — 두 축을 섞으면 현황판과 통계가 어긋납니다.',
      rq('<b>LOT-01~09</b> 물량 항목·등록상태·대행등록 · <b>OPS-09</b> 물량 생애주기')) +
    card('', tw('<th>물량번호</th><th>상태</th><th>품목·등급</th><th class="r">예상중량</th><th class="r">희망가</th>' +
      '<th>판매자</th><th>지역</th><th class="c">사진</th><th>등록 경로</th><th class="c">처리</th>', rows), '', '', 1);
};

/* ── 4.8 제안 관리 (OPS) ─────────────────────────────────── */
VIEW.bidsAll = function () {
  var rows = BIDS.map(function (b) {
    var L = lot(b.lot);
    return '<tr><td class="nowrap"><b>' + esc(b.id) + '</b><br><small style="color:var(--tx-3)">' + esc(b.at) + '</small></td>' +
      '<td>' + bidBadge(b.st) + '</td>' +
      '<td class="nowrap"><a href="#/lot:' + esc(b.lot) + '" data-a="go" data-r="lot:' + esc(b.lot) + '">' + esc(b.lot) + '</a>' +
        '<br><small style="color:var(--tx-3)">' + esc(L ? item(L.it).n : '') + '</small></td>' +
      '<td class="nowrap">' + esc(mem(b.buy).co) + '</td>' +
      '<td class="r nowrap">' + kg(b.qty) + '</td>' +
      '<td class="r nowrap"><b>' + won(b.px) + '</b>' +
        (L ? '<br><small style="color:' + (b.px >= L.want ? 'var(--ok)' : 'var(--act-tx)') + '">희망가 대비 ' +
          (b.px >= L.want ? '+' : '') + pc((b.px - L.want) / L.want, 1) + '</small>' : '') + '</td>' +
      '<td>' + esc(b.cond) + '</td>' +
      '<td class="nowrap">' + (b.by ? '<b>' + esc(opsUser(b.by).nm) + '</b> 대행' : '<span style="color:var(--tx-3)">직접</span>') + '</td>' +
      '<td class="c nowrap">' + (b.st === '제안' || b.st === '검토중'
        ? '<button class="b sm pri" data-a="bidOk" data-i="' + b.id + '">수락 → 거래확정</button>'
        : '—') + '</td></tr>';
  }).join('');
  return ph('제안 관리',
      '제안의 생애주기는 <b>제안 → 검토중 → 수락 / 거절 / 만료</b>입니다. ' +
      '수락하면 <b>거래번호가 자동 생성되고</b> 물량은 「거래성립」으로 넘어갑니다 — 세 축이 연결 지점에서만 서로를 건드립니다.',
      rq('<b>BID-01~05</b> 수량·단가·조건·상태·대행입력 · <b>DEL-01~03</b> 수락·거래확정·번호생성') +
      rq('<b>Q-09</b> 제안 상태값 목록이 원문에 없습니다 — 확인 후 확정', 'act')) +
    card('', tw('<th>제안번호</th><th>상태</th><th>물량</th><th>구매자</th><th class="r">수량</th>' +
      '<th class="r">단가</th><th>조건</th><th>입력 경로</th><th class="c">처리</th>', rows), '', '', 1);
};

/* ── 4.9 배차·상차·운송 (OPS-05 · STS-03~06) ─────────────── */
VIEW.dispatch = function () {
  var list = DEALS.filter(function (d) { return ['S01','S02','S03','S04','S05','S06'].indexOf(d.st) >= 0; });
  var rows = list.map(function (d) {
    var na = nextAction(d);
    return '<tr><td class="nowrap"><b>' + esc(d.id) + '</b></td>' +
      '<td>' + dealBadge(d) + '</td>' +
      '<td class="nowrap">' + esc(item(d.it).n) + ' · ' + ton(d.wt) + '</td>' +
      '<td class="nowrap">' + esc(d.f['차량번호'] || '<span style="color:var(--tx-3)">미입력</span>') + '</td>' +
      '<td class="nowrap">' + esc(d.f['기사명'] || '—') + '</td>' +
      '<td class="nowrap"><span class="mask"><span class="v hid">' +
        esc(d.f['기사연락처'] ? tel(d.f['기사연락처'], false) : '—') + '</span></span></td>' +
      '<td class="nowrap">' + esc(d.f['상차예정일'] || '—') + '</td>' +
      '<td class="na-c">' + na1(na) + '</td>' +
      '<td class="c nowrap"><button class="b sm" data-a="dispOpen" data-d="' + d.id + '">배차 입력</button> ' +
        '<button class="b sm" data-a="go" data-r="deal:' + d.id + '">거래</button></td></tr>';
  }).join('');
  return ph('배차 · 상차 · 운송',
      '차량·기사·일정과 상하차 시각을 입력합니다. <b>자동 배차는 1차 제외 범위</b>입니다(EXC-04) — ' +
      '현장에서 벌어진 일은 시스템이 알 수 없으므로 사람이 넣고 시스템이 기록합니다. ' +
      '<b>기사 연락처는 목록에서 가려서 표시</b>합니다.',
      rq('<b>OPS-05</b> 물류(배차) 관리 · <b>STS-03~06</b> 배차완료·상차완료·운송중·도착') +
      rq('<b>Q-11</b> 배차 정보 항목과 기사 연락처의 개인정보 취급 범위는 확인이 필요합니다', 'act')) +
    '<div class="mob">' +
      '<div style="flex:1 1 380px;min-width:0">' +
        card('배차 대상 ' + list.length + '건',
          tw('<th>거래번호</th><th>상태</th><th>품목·중량</th><th>차량번호</th><th>기사</th><th>연락처</th>' +
            '<th>상차예정</th><th class="na-c">다음 조치</th><th class="c">처리</th>', rows), '', '', 1) +
      '</div>' +
      '<div class="phone">' +
        '<div class="phone-t"><span>09:41</span><span>현장 모드</span></div>' +
        '<div class="phone-b">' +
          '<div class="rq" style="margin-bottom:12px"><b>ENV-01</b> 현장은 스마트폰</div>' +
          '<p style="font-size:12.5px;font-weight:700;margin-bottom:4px">D-2026-0039 · 구리 2급</p>' +
          '<p style="font-size:11.5px;color:var(--tx-3);margin-bottom:12px">대성비철 → 제일신동 · 8.6 t</p>' +
          '<div class="big-in">' +
            '<button class="done">상차완료 <span>08:40 ✓</span></button>' +
            '<button class="go" data-a="phoneStep" data-d="D-2026-0039">도착 기록 <span>→</span></button>' +
            '<button data-a="phonePhoto">사진 첨부 <span>＋</span></button>' +
            '<button disabled>계근 입력 <span>도착 후</span></button>' +
          '</div>' +
          '<p style="font-size:11px;color:var(--tx-3);margin-top:12px;line-height:1.6">' +
          '상차·도착·계근 사진 첨부처럼 <b>이동 중에 하는 일</b>은 손가락으로 끝나도록 만들고, ' +
          '표를 넓게 봐야 하는 정산·현황판은 PC를 기준으로 만듭니다.</p>' +
        '</div>' +
        '<div class="phone-n"><button class="on"><i>▦</i>현황</button><button><i>⇅</i>거래</button>' +
          '<button><i>⚖</i>계근</button><button><i>◔</i>알림</button></div>' +
      '</div>' +
    '</div>';
};

/* ── 4.10 계근 입력 (OPS-06 · STS-07) ★ ──────────────────── */
VIEW.weigh = function () {
  var list = DEALS.filter(function (d) { return ['S06','S07'].indexOf(d.st) >= 0 || d.f['실중량']; });
  var rows = list.map(function (d) {
    var wd = weighDiff(d);
    return '<tr><td class="nowrap"><b>' + esc(d.id) + '</b></td>' +
      '<td>' + dealBadge(d) + '</td>' +
      '<td class="nowrap">' + esc(item(d.it).n) + '</td>' +
      '<td class="r nowrap">' + kg(d.wt) + '<br><small style="color:var(--tx-3)">등록 예상</small></td>' +
      '<td class="r nowrap">' + (d.f['실중량'] ? '<b>' + kg(d.f['실중량']) + '</b><br><small style="color:var(--key-tx)">계근 실측</small>'
        : '<span style="color:var(--tx-3)">미입력</span>') + '</td>' +
      '<td class="r nowrap">' + (wd ? '<b style="color:' + (wd.over ? 'var(--act-tx)' : 'var(--ok)') + '">' +
        (wd.diff >= 0 ? '+' : '') + nf(wd.diff) + ' kg<br><small>' + (wd.rate >= 0 ? '+' : '') + pc(wd.rate, 2) +
        '</small></b>' : '—') + '</td>' +
      '<td class="nowrap">' + esc(d.f['계근소'] || '—') + '</td>' +
      '<td class="c">' + (d.ev.some(function (e) { return e.t === '계근표'; })
        ? '<span class="bg o"><span class="dot"></span>첨부</span>' : '<span class="bg a"><span class="dot"></span>필수</span>') + '</td>' +
      '<td class="c"><button class="b sm' + (d.st === 'S06' ? ' pri' : '') + '" data-a="weighOpen" data-d="' + d.id + '">계근 입력</button></td></tr>';
  }).join('');
  var over = list.filter(function (d) { var w = weighDiff(d); return w && w.over; });
  return ph('계근 입력',
      '계근 실중량을 입력하고 <b>계근표를 첨부</b>합니다. 등록 시 예상중량과의 <b>차이를 화면에 함께 보여 줍니다</b> — ' +
      '차이가 크면 사람이 먼저 확인해야 하기 때문입니다. 두 값은 <b>덮어쓰지 않고 나란히 보관</b>합니다.',
      rq('<b>OPS-06</b> 계근 관리 · <b>STS-07</b> 계근완료 — 예상중량 → 실중량 확정 · <b>OPS-10</b> 계근표 첨부') +
      rq('<b>Q-04</b> 계근표를 사람이 보고 입력하는지, 사진만 첨부하고 수치는 수동인지 확인 필요 — 이 프로토타입은 <b>수동 입력 + 계근표 첨부</b>로 가정했습니다', 'act')) +
    (over.length ? note('w', '!', '<b>허용 오차(±' + pc(ver().rule.weighTol, 1) + ')를 넘는 건 ' + over.length + '건</b> — ' +
      over.map(function (d) { return d.id; }).join(', ') + '. 최종금액 확정 전에 확인이 필요합니다.') + '<div style="height:14px"></div>' : '') +
    card('', tw('<th>거래번호</th><th>상태</th><th>품목</th><th class="r">예상중량</th><th class="r">실중량</th>' +
      '<th class="r">차이</th><th>계근소</th><th class="c">계근표</th><th class="c">처리</th>', rows), '', '', 1);
};

/* ── 4.11 검수 입력 (OPS-07 · STS-08) ────────────────────── */
VIEW.inspect = function () {
  var list = DEALS.filter(function (d) { return ['S07','S08'].indexOf(d.st) >= 0 || d.f['판정등급']; });
  var rows = list.map(function (d) {
    var reg = grade(d.gr), jud = d.f['판정등급'] ? grade(d.f['판정등급']) : null;
    var down = jud && jud.adj < reg.adj;
    return '<tr><td class="nowrap"><b>' + esc(d.id) + '</b></td>' +
      '<td>' + dealBadge(d) + '</td>' +
      '<td class="nowrap">' + esc(item(d.it).n) + '</td>' +
      '<td class="nowrap">' + esc(reg.n) + '<br><small style="color:var(--tx-3)">등록 등급</small></td>' +
      '<td class="nowrap">' + (jud ? '<b>' + esc(jud.n) + '</b><br><small style="color:var(--key-tx)">검수 판정</small>'
        : '<span style="color:var(--tx-3)">미입력</span>') + '</td>' +
      '<td class="r nowrap">' + (jud ? '<b style="color:' + (down ? 'var(--act-tx)' : 'var(--ok)') + '">' +
        (jud.adj === reg.adj ? '± 0%' : pc(jud.adj - reg.adj, 0)) + '</b><br><small>단가 조정</small>' : '—') + '</td>' +
      '<td class="r nowrap">' + (d.f['불순물공제'] ? won(d.f['불순물공제']) : '—') + '</td>' +
      '<td class="c">' + (d.ev.some(function (e) { return e.t === '검수자료'; })
        ? '<span class="bg o"><span class="dot"></span>첨부</span>' : '<span class="bg a"><span class="dot"></span>필수</span>') + '</td>' +
      '<td class="c"><button class="b sm' + (d.st === 'S07' ? ' pri' : '') + '" data-a="inspOpen" data-d="' + d.id + '">검수 입력</button></td></tr>';
  }).join('');
  return ph('검수 입력',
      '검수 판정등급을 입력하고 <b>검수자료를 첨부</b>합니다. 등록 등급과 판정 등급을 나란히 보관하고, ' +
      '<b>등급 차이가 단가에 얼마나 반영되는지</b>를 그 자리에서 보여 줍니다.',
      rq('<b>OPS-07</b> 검수 관리 · <b>STS-08</b> 검수완료 — 등록등급 → 판정등급 확정') +
      rq('<b>Q-05</b> 검수 기준·판정 주체와 판매자 이의 제기 절차는 확인이 필요합니다', 'act')) +
    card('', tw('<th>거래번호</th><th>상태</th><th>품목</th><th>등록 등급</th><th>판정 등급</th>' +
      '<th class="r">등급 조정</th><th class="r">불순물 공제</th><th class="c">검수자료</th><th class="c">처리</th>', rows), '', '', 1) +
    '<div style="height:16px"></div>' +
    card('등급 조정률 — 코드값에서 관리합니다',
      tw('<th>품목</th><th>등급</th><th class="r">기준단가 대비 조정</th><th class="r">적용 단가 예</th>',
        GRADES.filter(function (g) { return g.act; }).map(function (g) {
          var b = item(g.it).base;
          return '<tr><td class="nowrap">' + esc(item(g.it).n) + '</td><td class="nowrap">' + esc(g.n) + '</td>' +
            '<td class="r nowrap">' + (g.adj === 0 ? '± 0%' : pc(g.adj, 0)) + '</td>' +
            '<td class="r nowrap">' + won(Math.round(b * (1 + g.adj))) + ' / kg</td></tr>';
        }).join(''), 1),
      '개발 없이 화면에서 추가·수정합니다 (LOT-02)', '<button class="b sm" data-a="go" data-r="codes">품목·등급 관리</button>', 1);
};

/* ── 4.12 최종금액·정산 (OPS-08 · STS-09~12 · AUT-02) ★ ─── */
VIEW.settle = function () {
  var list = DEALS.filter(function (d) { return stIdx(d.rv, d.st) >= 7; });
  var rows = list.map(function (d) {
    var c = d.snap || calcAmount(d);
    var na = nextAction(d);
    return '<tr><td class="nowrap"><b>' + esc(d.id) + '</b></td>' +
      '<td>' + dealBadge(d) + '</td>' +
      '<td class="r nowrap">' + kg(d.f['실중량'] || 0) + '</td>' +
      '<td class="nowrap">' + esc(d.f['판정등급'] ? grade(d.f['판정등급']).n : '—') + '</td>' +
      '<td class="r nowrap">' + won(d.snap ? d.snap.apx : c.apx) + '</td>' +
      '<td class="r nowrap"><b>' + won(d.snap ? d.snap.amt : c.amt) + '</b>' +
        (d.snap ? '<br><small style="color:var(--ok)">확정 · v' + d.snap.rv + ' 스냅샷</small>'
                : '<br><small style="color:var(--warn)">계산값 (미확정)</small>') + '</td>' +
      '<td class="nowrap">' + esc(d.f['입금일'] || '—') + '</td>' +
      '<td class="nowrap">' + esc(d.f['지급일'] || '—') + '</td>' +
      '<td class="na-c">' + na1(na) + '</td>' +
      '<td class="c nowrap">' + (d.st === 'S08'
        ? '<button class="b sm pri" data-a="settleFix" data-d="' + d.id + '">금액 확정</button>'
        : '<button class="b sm" data-a="calcOpen" data-d="' + d.id + '">산출근거</button>') + '</td></tr>';
  }).join('');
  var fixed = list.filter(function (d) { return d.snap; });
  var sum = fixed.reduce(function (a, d) { return a + d.snap.amt; }, 0);
  return ph('최종금액 · 정산',
      '계근 중량과 판정 등급으로 <b>최종금액을 자동 계산</b>하고, <b>어떤 규칙이 어떻게 적용됐는지 산출 근거를 함께 표시</b>합니다. ' +
      '운영자가 확정하면 그 시점의 규칙이 <b>스냅샷으로 저장</b>됩니다. 이후 구매자 입금확인 → 판매자 지급완료를 기록합니다.',
      rq('<b>OPS-08</b> 정산 관리 · <b>AUT-02</b> 최종금액 계산 · <b>STS-09~12</b> 금액확정·입금·지급·완료') +
      rq('<b>Q-01</b> 계산식이 원문에 없습니다 — 이 프로토타입의 규칙(수분 공제·등급 조정·불순물 공제·운송비 부담)은 <b>가정</b>이며 3주차 게이트에서 확정합니다', 'act')) +
    '<div class="tiles">' +
      '<div class="tile"><span class="k">확정 거래</span><span class="v">' + fixed.length + '<small>건</small></span>' +
        '<span class="d">스냅샷 저장 완료</span></div>' +
      '<div class="tile"><span class="k">확정 금액 합계</span><span class="v">' + nf(Math.round(sum / 10000)) + '<small>만원</small></span>' +
        '<span class="d">부가세 별도</span></div>' +
      '<div class="tile warn"><span class="k">금액 확정 대기</span><span class="v">' +
        list.filter(function (d) { return d.st === 'S08'; }).length + '<small>건</small></span>' +
        '<span class="d">검수 완료, 확정 전</span></div>' +
      '<div class="tile"><span class="k">적용 규칙 버전</span><span class="v">v' + ver().v + '</span>' +
        '<span class="d">수분 ' + pc(ver().rule.moisture, 1) + ' · 운송비 ' + esc(ver().rule.freightBy) + ' 부담</span></div>' +
    '</div>' +
    note('s', '★', '<b>과거 금액이 바뀌지 않는지 직접 확인해 보십시오.</b> 아래 버튼으로 기준 단가와 계산 규칙을 바꾸면, ' +
      '<b>확정된 거래의 금액은 그대로</b>이고 <b>미확정 거래만 새 규칙으로 다시 계산</b>됩니다. ' +
      '규칙을 한 곳에 두고 고쳐 쓰면 작년 거래의 정산서를 다시 뽑았을 때 금액이 달라집니다.' +
      '<div class="bar" style="margin-top:10px">' +
      '<button class="b sm act" data-a="ruleShift">수분 공제율을 0.8% → 2.0%로 올려 봅니다</button>' +
      '<button class="b sm" data-a="ruleReset">규칙 원복</button></div>') +
    '<div style="height:14px"></div>' +
    card('', tw('<th>거래번호</th><th>상태</th><th class="r">실중량</th><th>판정등급</th><th class="r">적용단가</th>' +
      '<th class="r">최종금액</th><th>입금일</th><th>지급일</th><th class="na-c">다음 조치</th><th class="c">처리</th>', rows), '', '', 1);
};

/* ── 4.13 품목·등급 관리 (코드값) ★ ──────────────────────── */
VIEW.codes = function () {
  var t = S.tab.codes || 'item';
  var body;
  if (t === 'item') {
    body = tw('<th>코드</th><th>품목명</th><th class="r">기준 단가</th><th>단위</th><th class="c">사용</th><th class="c">처리</th>',
      ITEMS.map(function (i) {
        return '<tr' + (i.act ? '' : ' class="dim"') + '><td class="nowrap"><b>' + esc(i.c) + '</b></td>' +
          '<td class="nowrap">' + esc(i.n) + '</td>' +
          '<td class="r nowrap"><input type="number" value="' + i.base + '" data-a="itemPx" data-i="' + i.c +
            '" style="width:96px;text-align:right;border:1px solid var(--hair-2);padding:3px 6px;font-size:12px"></td>' +
          '<td class="nowrap">' + esc(i.u) + '</td>' +
          '<td class="c">' + (i.act ? bg('o', '사용') : bg('g', '비활성')) + '</td>' +
          '<td class="c"><button class="b sm" data-a="itemToggle" data-i="' + i.c + '">' +
            (i.act ? '비활성화' : '사용') + '</button></td></tr>';
      }).join(''), 1);
  } else {
    body = tw('<th>코드</th><th>품목</th><th>등급명</th><th class="r">단가 조정률</th><th class="r">적용 단가</th><th class="c">사용</th><th class="c">처리</th>',
      GRADES.map(function (g) {
        return '<tr' + (g.act ? '' : ' class="dim"') + '><td class="nowrap"><b>' + esc(g.c) + '</b></td>' +
          '<td class="nowrap">' + esc(item(g.it).n) + '</td><td class="nowrap">' + esc(g.n) + '</td>' +
          '<td class="r nowrap"><input type="number" step="1" value="' + Math.round(g.adj * 100) + '" data-a="grAdj" data-i="' + g.c +
            '" style="width:70px;text-align:right;border:1px solid var(--hair-2);padding:3px 6px;font-size:12px"> %</td>' +
          '<td class="r nowrap">' + won(Math.round(item(g.it).base * (1 + g.adj))) + '</td>' +
          '<td class="c">' + (g.act ? bg('o', '사용') : bg('g', '비활성')) + '</td>' +
          '<td class="c"><button class="b sm" data-a="grToggle" data-i="' + g.c + '">' +
            (g.act ? '비활성화' : '사용') + '</button></td></tr>';
      }).join(''), 1);
  }
  return ph('품목 · 등급 관리 <span class="bg k"><span class="dot"></span>개발 없이 변경</span>',
      '품목과 등급을 <b>화면에서 등록·수정</b>합니다. 등급 체계가 바뀌어도 개발이 필요하지 않습니다. ' +
      '<b>사용 중인 값은 삭제하지 않고 비활성화</b>합니다 — 과거 거래가 그 값을 참조하고 있기 때문입니다. ' +
      '<b>소스를 고쳐야 바뀌는 값을 남기지 않습니다.</b>',
      rq('<b>LOT-01/02</b> 품목·등급 입력 · <b>§3 「핵심」</b> 품목·등급 구조화 · <b>인수 기준</b> 개발 없이 화면에서 추가') +
      rq('<b>Q-03</b> 실제 품목 몇 종, 등급 몇 단계인지 목록이 원문에 없습니다 — 위 값은 <b>예시</b>입니다', 'act')) +
    '<div class="tabs"><button class="' + (t === 'item' ? 'on' : '') + '" data-a="tab" data-g="codes" data-v="item">품목 ' +
      ITEMS.length + '종</button><button class="' + (t === 'gr' ? 'on' : '') + '" data-a="tab" data-g="codes" data-v="gr">등급 ' +
      GRADES.length + '종</button></div>' +
    note('k', 'i', '<b>기준 단가를 바꿔 보십시오.</b> 대행 물량 등록 화면의 참고 단가와 검수 화면의 적용 단가 예가 즉시 따라 바뀝니다. ' +
      '<b>이미 확정된 거래의 금액은 바뀌지 않습니다</b> — 확정 시점 규칙을 스냅샷으로 복제해 두었기 때문입니다.') +
    '<div style="height:14px"></div>' +
    card('', body, '', '', 1) +
    '<div style="height:16px"></div>' +
    card('참조 무결성 — 비활성화만 허용하는 이유',
      '<p style="font-size:12.5px;line-height:1.7;color:var(--tx-2)">니켈(NI)은 <b>비활성</b> 상태입니다. ' +
      '거래시장과 물량 등록 화면의 선택 목록에서는 사라지지만, <b>과거에 니켈로 등록된 물량과 거래는 그대로 조회</b>됩니다. ' +
      '삭제를 허용하면 과거 거래의 품목명이 코드값만 남고 사라집니다.</p>');
};

/* ── 4.14 상태·전이 설정 (STS-H5) ★★ ────────────────────── */
VIEW.states = function () {
  var v = ver(), sdef = v.sdef;
  var mx = '<div class="mx"><table><thead><tr><th>현재 상태</th>' +
    sdef.map(function (s, i) { return '<th title="' + esc(s.n) + '">' + pad(i + 1, 2) + '</th>'; }).join('') +
    '<th>되돌리기</th></tr></thead><tbody>' +
    sdef.map(function (s, i) {
      var tr = v.tr[s.c] || { next:[], back:[] };
      return '<tr><td>' + pad(i + 1, 2) + '. ' + esc(s.n) +
        ((s.req || []).length ? '<small>필수: ' + esc(s.req.join(' · ')) + '</small>' : '<small>필수 입력 없음</small>') +
        ((s.ev || []).length ? '<small>증빙: ' + esc(s.ev.join(' · ')) + '</small>' : '') + '</td>' +
        sdef.map(function (t) {
          var on = tr.next.indexOf(t.c) >= 0;
          return '<td>' + (on ? '<span style="color:var(--key);font-weight:800">●</span>' :
            (t.c === s.c ? '<span style="color:var(--tx-4)">·</span>' : '')) + '</td>';
        }).join('') +
        '<td class="nowrap" style="text-align:center">' + (tr.back.filter(function (c) { return c !== s.c; }).length
          ? bg('s', '허용') : bg('g', '불가')) + '</td></tr>';
    }).join('') + '</tbody></table></div>';

  var vlist = tw('<th>버전</th><th>적용일</th><th>단계 수</th><th>변경자</th><th>내용</th><th class="c">상태</th>',
    VERS.slice().reverse().map(function (x) {
      var used = DEALS.filter(function (d) { return d.rv === x.v; }).length;
      return '<tr><td class="nowrap"><b>v' + x.v + '</b></td><td class="nowrap">' + esc(x.from) + '</td>' +
        '<td class="r nowrap">' + x.sdef.length + '단계</td><td class="nowrap">' + esc(x.by) + '</td>' +
        '<td>' + esc(x.memo) + '<br><small style="color:var(--tx-3)">이 버전을 참조하는 거래 ' + used + '건</small></td>' +
        '<td class="c">' + (x.act ? bg('o', '적용 중') : bg('g', '보존')) + '</td></tr>';
    }).join(''), 1);

  return ph('상태 · 전이 설정 <span class="bg a"><span class="dot"></span>이 과업의 설계 핵심</span>',
      'RFP §9는 <b>「위 거래 단계는 순서가 변경될 수 있습니다」</b>라고 적었습니다. 그래서 상태 목록과 허용 전이를 ' +
      '<b>소스가 아니라 버전 있는 설정 데이터</b>로 두었습니다. 단계를 추가하는 일이 개발이 아니라 <b>새 버전 만들기</b>입니다.',
      rq('<b>STS-H5</b> 「순서가 변경될 수 있습니다」 — 원문 명시 · <b>AUT-01</b> 상태변경 자동화') +
      rq('<b>Q-12</b> §6은 11개(거래확정 제외), §9는 12개이고 「상차/계근/검수」의 「완료」 접미가 두 절에서 다릅니다 — 명칭과 개수를 계약 전에 하나로 확정해야 합니다', 'act')) +
    note('s', '★', '<b>새 버전을 만들어 보십시오.</b> 「도착」과 「계근완료」 사이에 <b>「하차완료」</b>를 넣은 v2를 만듭니다. ' +
      '<b>이미 시작한 거래 ' + DEALS.filter(function (d) { return d.st !== 'S12'; }).length + '건은 기존 버전(v1)을 계속 참조</b>하고, ' +
      '<b>새 버전은 이후 거래에만 적용</b>됩니다. 진행 중인 업무와 과거 기록이 바뀌지 않습니다.' +
      '<div class="bar" style="margin-top:10px">' +
      (VERS.length < 2
        ? '<button class="b sm act" data-a="verNew">v2 만들기 — 「하차완료」 단계 추가</button>'
        : '<button class="b sm" disabled>v2 생성됨 — 아래 버전 대장 참고</button>') +
      '<button class="b sm" data-a="verTest">새 버전으로 거래 1건 만들어 보기</button>' +
      '<button class="b sm" data-a="verReset">설정 초기화</button></div>') +
    '<div style="height:14px"></div>' +
    card('전이규칙 v' + v.v + ' — ● 표시가 허용된 다음 상태입니다', mx,
      '허용되지 않은 전이는 화면의 선택지에 아예 나오지 않습니다', '', 0) +
    '<div style="height:16px"></div>' +
    '<div class="cols c11">' +
      card('버전 대장', vlist, '', '', 1) +
      card('이 구조가 보장하는 것',
        '<ul class="why">' +
          '<li><b>기록이 빠지지 않습니다</b> — 상태 변경은 <span class="cd">changeStatus()</span> 한 지점만 거치고, ' +
          '상태 갱신과 이력 추가를 <b>한 묶음(트랜잭션)</b>으로 처리합니다. 이력 없이 상태만 바뀌는 경로를 만들지 않습니다</li>' +
          '<li><b>과거가 바뀌지 않습니다</b> — 이력과 금액확정은 <b>덮어쓰지 않고 쌓기만</b> 합니다. 잘못 넣은 값은 ' +
          '수정이 아니라 <b>정정 이력을 추가</b>해 처리하고 원래 값도 남습니다</li>' +
          '<li><b>순서를 바꿀 수 있습니다</b> — 상태 목록과 허용 전이가 버전 있는 설정이므로 2단계에서 단계를 추가하거나 ' +
          '순서를 바꿀 때 <b>소스를 고치지 않습니다</b></li>' +
        '</ul>' +
        '<div class="code" style="margin-top:12px">' +
        '<b>changeStatus</b>(거래번호, 새상태, 변경자, 사유, 입력값)\n' +
        '  1. 전이규칙에서 <i>허용된 전이인지</i> 확인        → 아니면 거절\n' +
        '  2. 그 단계의 <i>필수 입력 항목</i>이 채워졌는지    → 아니면 거절\n' +
        '  3. <i>필수 증빙</i>이 첨부됐는지                  → 아니면 거절\n' +
        '  4. 거래.현재상태 갱신 + <i>이력 행 추가</i>        → 한 묶음\n' +
        '  5. <b>notify</b>() 호출' +
        '</div>') +
    '</div>';
};

/* ── 4.15 운영지표 (AUT-05 · OPT-06) ─────────────────────── */
VIEW.metrics = function () {
  var done = DEALS.filter(function (d) { return d.snap; });
  var vol = done.reduce(function (a, d) { return a + Number(d.f['실중량'] || 0); }, 0);
  var amt = done.reduce(function (a, d) { return a + d.snap.amt; }, 0);
  var agent = LOTS.filter(function (l) { return l.by; }).length;
  var byIt = ITEMS.filter(function (i) { return i.act; }).map(function (i) {
    var ds = DEALS.filter(function (d) { return d.it === i.c; });
    var w = ds.reduce(function (a, d) { return a + Number(d.f['실중량'] || d.wt); }, 0);
    return { l:i.n, p:Math.round(w / Math.max(1, DEALS.reduce(function (a, d) { return a + Number(d.f['실중량'] || d.wt); }, 0)) * 100),
             v:ton(w), k:'' };
  }).filter(function (x) { return x.p > 0; });
  var stDist = sdefOf(1).map(function (s, i) {
    var n = DEALS.filter(function (d) { return d.st === s.c; }).length;
    return { l:pad(i + 1, 2) + ' ' + s.n, p:Math.round(n / Math.max(1, DEALS.length) * 100), v:n + '건',
             k:n ? (i >= 8 ? '' : 'w') : '' };
  }).filter(function (x) { return x.v !== '0건'; });
  var lead = done.map(function (d) {
    var h = d.hist.filter(function (x) { return x.kind === 'fwd'; });
    if (h.length < 2) return null;
    var a = new Date(h[0].at.replace(' ', 'T')), b = new Date(h[h.length - 1].at.replace(' ', 'T'));
    return Math.round((b - a) / 86400000);
  }).filter(function (x) { return x != null; });
  var avg = lead.length ? Math.round(lead.reduce(function (a, b) { return a + b; }, 0) / lead.length) : 0;

  return ph('운영지표 <span class="bg s"><span class="dot"></span>2차 예시</span>',
      '이 화면은 <b>2차 권고 범위의 운영지표 예시</b>입니다. 1차에서는 별도 대시보드를 만들지 않고 <b>현황판의 건수·금액 표시</b>로 운영합니다. ' +
      '집계 구조는 미리 두어 2차에 화면을 추가할 수 있습니다.',
      rq('<b>AUT-05</b> 기본 운영지표 · <b>OPT-06</b> 간단한 거래 통계 (추가범위)') +
      rq('<b>Q-13</b> 지표 항목이 원문에 없습니다 — AUT-05와 OPT-06의 경계도 겹칩니다', 'act')) +
    '<div class="tiles">' +
      '<div class="tile"><span class="k">완주 거래</span><span class="v">' + done.length + '<small>건</small></span>' +
        '<span class="d">금액 확정 이상 도달</span></div>' +
      '<div class="tile"><span class="k">확정 물량</span><span class="v">' + nf1(vol / 1000) + '<small>t</small></span>' +
        '<span class="d">계근 실중량 합계</span></div>' +
      '<div class="tile"><span class="k">확정 금액</span><span class="v">' + nf(Math.round(amt / 10000)) + '<small>만원</small></span>' +
        '<span class="d">부가세 별도</span></div>' +
      '<div class="tile"><span class="k">평균 소요</span><span class="v">' + avg + '<small>일</small></span>' +
        '<span class="d">거래확정 → 최종 단계</span></div>' +
    '</div>' +
    '<div class="cols c11">' +
      card('품목별 물량', bars(byIt)) +
      card('상태별 거래 분포', bars(stDist)) +
    '</div>' +
    '<div style="height:16px"></div>' +
    '<div class="cols c11">' +
      card('대행 입력 비중 (PRN-03)',
        bars([
          { l:'대행 등록 물량', p:Math.round(agent / LOTS.length * 100), v:agent + ' / ' + LOTS.length, k:'a' },
          { l:'대행 입력 제안', p:Math.round(BIDS.filter(function (b) { return b.by; }).length / BIDS.length * 100),
            v:BIDS.filter(function (b) { return b.by; }).length + ' / ' + BIDS.length, k:'a' }
        ]) +
        '<p style="margin-top:12px;font-size:12px;line-height:1.7;color:var(--tx-2)">' +
        '「직원이 대신 입력한 건」과 「사용자가 직접 등록한 건」이 <b>같은 흐름에 들어가되 구분은 남습니다.</b> ' +
        '대행 입력자를 기록하지 않으면 나중에 「누가 이 가격을 넣었나」를 추적할 수 없습니다.</p>') +
      card('계근 오차 분포',
        bars(DEALS.filter(function (d) { return weighDiff(d); }).map(function (d) {
          var w = weighDiff(d);
          return { l:d.id.slice(-4) + ' ' + item(d.it).n, p:Math.min(100, Math.abs(w.rate) / 0.02 * 100),
                   v:(w.rate >= 0 ? '+' : '') + pc(w.rate, 2), k:w.over ? 'a' : '' };
        })) +
        '<p style="margin-top:12px;font-size:12px;line-height:1.7;color:var(--tx-2)">' +
        '허용 오차는 <b>±' + pc(ver().rule.weighTol, 1) + '</b>입니다(설정값). 붉은 막대는 오차를 넘어 ' +
        '<b>사람이 먼저 확인해야 하는 건</b>입니다.</p>') +
    '</div>';
};

/* ── 4.16 거래시장 (MKT-01~04) · 구매자 ─────────────────── */
VIEW.market = function () {
  var f = S.flt;
  var list = LOTS.filter(function (l) { return l.st === '판매중'; })
    .filter(function (l) {
      if (f.it && l.it !== f.it) return false;
      if (f.gr && l.gr !== f.gr) return false;
      if (f.rg && l.rg !== f.rg) return false;
      if (f.min && Number(l.wt) < Number(f.min)) return false;
      if (S.qs) {
        var hay = [l.id, item(l.it).n, grade(l.gr).n, l.rg, mem(l.sel).co].join(' ').toLowerCase();
        if (hay.indexOf(S.qs.toLowerCase()) < 0) return false;
      }
      return true;
    });
  var cards = list.map(function (l) {
    var nb = BIDS.filter(function (b) { return b.lot === l.id; }).length;
    var mine = BIDS.filter(function (b) { return b.lot === l.id && b.buy === S.me.id; }).length;
    return '<div class="lotc" data-a="go" data-r="lot:' + l.id + '" role="button" tabindex="0">' +
      '<div class="lotc-ph"><span>' + esc(l.it) + '</span>' +
        '<em>' + (l.ph ? '사진 ' + l.ph + '장' : '사진 없음') + '</em></div>' +
      '<div class="lotc-b">' +
        '<div class="lotc-t"><b>' + esc(item(l.it).n) + ' · ' + esc(grade(l.gr).n) + '</b>' + lotBadge(l.st) + '</div>' +
        '<div class="lotc-m">' + esc(l.id) + ' · ' + esc(l.rg) + ' · 출고 ' + esc(l.out) + '</div>' +
        '<div class="lotc-k"><span><i>예상중량</i><b>' + ton(l.wt) + '</b></span>' +
          '<span><i>희망가격</i><b>' + nf(l.want) + '<em>원/kg</em></b></span></div>' +
        '<div class="lotc-f"><span>받은 제안 <b>' + nb + '건</b></span>' +
          (mine ? '<span class="me">내 제안 ' + mine + '건</span>' : '') + '</div>' +
      '</div></div>';
  }).join('');
  return ph('거래시장',
      '<b>판매중 상태의 물량만</b> 보입니다. 승인 전 판매자의 물량과 이미 거래가 성립한 물량은 노출되지 않습니다. ' +
      '검색과 <b>품목·등급·지역·수량 4개 조건 필터</b>를 제공합니다. 목록은 축소 이미지를 씁니다.',
      rq('<b>MKT-01~04</b> 물량 목록·상세·검색·필터 · <b>ENV-01</b> PC·모바일 반응형') +
      rq('<b>Q-07</b> 필터 조건 항목이 원문에 없습니다 — 4개 조건으로 가정했습니다', 'act')) +
    '<div class="flt">' +
      '<div class="fi"><span>검색</span><input type="search" id="fQs" value="' + esc(S.qs) +
        '" placeholder="물량번호 · 품목 · 거래처" data-a="fltQs"></div>' +
      '<div class="fi"><span>품목</span><select id="fIt" data-a="fltIt"><option value="">전체</option>' +
        selOpt(ITEMS.filter(function (i) { return i.act; }), f.it, function (i) { return { v:i.c, t:i.n }; }) + '</select></div>' +
      '<div class="fi"><span>등급</span><select id="fGr" data-a="flt" data-k="gr"><option value="">전체</option>' +
        selOpt(f.it ? gradesOf(f.it) : GRADES.filter(function (g) { return g.act; }), f.gr,
          function (g) { return { v:g.c, t:(f.it ? '' : item(g.it).n + ' ') + g.n }; }) + '</select></div>' +
      '<div class="fi"><span>지역</span><select id="fRg" data-a="flt" data-k="rg"><option value="">전체</option>' +
        selOpt(REGIONS, f.rg, function (r) { return { v:r, t:r }; }) + '</select></div>' +
      '<div class="fi"><span>최소 수량 (kg)</span><input type="number" id="fMin" value="' + esc(f.min) +
        '" placeholder="예: 10000" data-a="flt" data-k="min"></div>' +
      '<div class="fi go"><button class="b" data-a="fltClear">조건 해제</button></div>' +
    '</div>' +
    note('k', 'i', '<b>' + list.length + '건</b>이 조건에 맞습니다. ' +
      '이 조건을 <b>관심 조건으로 저장</b>하면 같은 조건의 물량이 새로 올라올 때 알림을 받습니다 (OPT-02).' +
      '<div class="bar" style="margin-top:9px"><button class="b sm" data-a="watchSave">현재 조건 저장</button>' +
      '<button class="b sm" data-a="go" data-r="watch">관심 조건 ' + WATCH.filter(function (w) { return w.mem === S.me.id; }).length + '건</button></div>') +
    '<div style="height:14px"></div>' +
    (list.length ? '<div class="lots">' + cards + '</div>'
      : card('', '<p style="padding:26px 0;text-align:center;color:var(--tx-3);font-size:12.5px">조건에 맞는 물량이 없습니다.</p>'));
};

/* ── 4.17 물량 상세 (MKT-02) ─────────────────────────────── */
VIEW.lot = function (id) {
  var l = lot(id) || LOTS[0];
  if (!l) return ph('물량 상세', '물량이 없습니다.');
  var all = BIDS.filter(function (b) { return b.lot === l.id; });
  var isOps = S.role === 'OPS', isSeller = S.role === 'SELLER' && l.sel === S.me.id;
  /* 구매자에게는 다른 사람의 제안 단가가 보이지 않습니다 */
  var visible = isOps || isSeller ? all : all.filter(function (b) { return b.buy === S.me.id; });
  var hidden = all.length - visible.length;
  var rows = visible.map(function (b) {
    return '<tr><td class="nowrap"><b>' + esc(b.id) + '</b></td>' +
      '<td>' + bidBadge(b.st) + '</td>' +
      '<td class="nowrap">' + esc(isOps || isSeller ? mem(b.buy).co : '내 제안') + '</td>' +
      '<td class="r nowrap">' + kg(b.qty) + '</td>' +
      '<td class="r nowrap"><b>' + won(b.px) + '</b></td>' +
      '<td>' + esc(b.cond) + '</td>' +
      '<td class="nowrap">' + esc(b.at) + '</td>' +
      '<td class="c">' + ((isOps || isSeller) && (b.st === '제안' || b.st === '검토중')
        ? '<button class="b sm pri" data-a="bidOk" data-i="' + b.id + '">수락</button> ' +
          '<button class="b sm" data-a="bidNo" data-i="' + b.id + '">거절</button>'
        : '—') + '</td></tr>';
  }).join('');
  var hist = BIDS.filter(function (b) { return b.st === '수락'; }).map(function (b) {
    var L = lot(b.lot);
    return L && L.it === l.it ? { g:grade(L.gr).n, px:b.px, at:b.at.slice(0, 10), rg:L.rg } : null;
  }).filter(Boolean).slice(0, 6);

  return ph('물량 상세 <span class="bg g"><span class="dot"></span>' + esc(l.id) + '</span>',
      '물량 정보와 사진입니다. ' + (S.role === 'BUYER'
        ? '<b>다른 사람의 제안 단가는 보이지 않도록 표시합니다</b> — 실제 구축에서는 서버 권한 검증으로 처리합니다 (MEM-05).'
        : '제안 목록과 각 제안의 단가를 확인하고 수락·거절합니다.'),
      rq('<b>MKT-02</b> 물량 상세보기 · <b>LOT-01~07</b> 품목·등급·중량·지역·희망가격·출고일·사진') +
      (S.role === 'BUYER' && hidden ? rq('<b>MEM-05</b> 다른 구매자의 제안 ' + hidden + '건은 내려오지 않습니다', 'act') : '')) +
    '<div class="cols c21">' +
      '<div class="stack">' +
        card('물량 정보', dl([
          ['물량번호', '<b>' + esc(l.id) + '</b>'],
          ['상태', lotBadge(l.st)],
          ['품목', esc(item(l.it).n) + ' <small style="color:var(--tx-3)">(' + esc(l.it) + ')</small>'],
          ['등급', esc(grade(l.gr).n) + ' <small style="color:var(--tx-3)">조정 ' +
            (grade(l.gr).adj === 0 ? '± 0%' : pc(grade(l.gr).adj, 0)) + '</small>'],
          ['예상중량', '<b>' + kg(l.wt) + '</b> <small style="color:var(--tx-3)">확정 중량은 계근 단계에서 (STS-07)</small>'],
          ['희망가격', '<b>' + won(l.want) + ' / kg</b> <small style="color:var(--tx-3)">기준 단가 ' +
            won(item(l.it).base) + '</small>'],
          ['지역', esc(l.rg)],
          ['출고 가능일', esc(l.out)],
          ['판매자', esc(mem(l.sel).co) + (isOps || isSeller ? ' · ' + esc(mem(l.sel).nm) : '')],
          ['등록', esc(l.at) + (l.by ? ' · <b>' + esc(opsUser(l.by).nm) + '</b> 대행 입력' : ' · 사용자 직접 등록')],
          ['메모', esc(l.memo || '—')]
        ])) +
        card('사진 ' + l.ph + '장',
          l.ph ? '<div class="gal">' + Array.apply(null, Array(l.ph)).map(function (_, i) {
            return '<div class="gi"><span>' + esc(item(l.it).n) + '</span><em>IMG_' + pad(4210 + i, 4) + '.jpg</em></div>';
          }).join('') + '</div>' +
          '<p style="margin-top:11px;font-size:11.5px;color:var(--tx-3);line-height:1.6">' +
          '원본은 그대로 보관하고 <b>목록용 축소 이미지를 따로 만듭니다</b> — 현장에서 스마트폰으로 올린 사진이 크기 때문입니다. ' +
          '파일 주소는 <b>권한 확인 후 발급되는 한시적 주소</b>로 내려갑니다.'
          : '<p style="font-size:12.5px;color:var(--tx-3)">첨부된 사진이 없습니다.</p>') +
        card('구매 제안 ' + visible.length + '건' + (hidden ? ' <span class="bg a"><span class="dot"></span>비공개 ' + hidden + '건</span>' : ''),
          tw('<th>제안번호</th><th>상태</th><th>구매자</th><th class="r">수량</th><th class="r">단가</th>' +
            '<th>조건</th><th>제안 시각</th><th class="c">처리</th>', rows), '', '', 1) +
      '</div>' +
      '<div class="stack">' +
        (S.role === 'BUYER' && l.st === '판매중' ? card('구매 제안 하기',
          '<form class="fg" onsubmit="return false">' +
            '<div class="f"><label>구매수량 (kg) <i>*</i></label><input type="number" id="nbQty" value="' + l.wt + '"></div>' +
            '<div class="f"><label>단가 (원/kg) <i>*</i></label><input type="number" id="nbPx" value="' + l.want + '">' +
              '<span class="hint">판매자 희망가 ' + nf(l.want) + '원 · 기준 단가 ' + nf(item(l.it).base) + '원</span></div>' +
            '<div class="f wide"><label>거래조건</label><input type="text" id="nbCond" value="계근 기준 정산"></div>' +
            '<div class="f wide"><button class="b pri lg" data-a="bidNew" data-i="' + l.id + '">제안 등록</button></div>' +
          '</form>') : '') +
        card('과거 거래가격 <span class="bg s"><span class="dot"></span>추가범위 OPT-04</span>',
          hist.length ? tw('<th>등급</th><th class="r">체결 단가</th><th>지역</th><th>일자</th>',
            hist.map(function (h) {
              return '<tr><td class="nowrap">' + esc(h.g) + '</td><td class="r nowrap"><b>' + won(h.px) + '</b></td>' +
                '<td class="nowrap">' + esc(h.rg) + '</td><td class="nowrap">' + esc(h.at) + '</td></tr>';
            }).join(''), 1) : '<p style="font-size:12.5px;color:var(--tx-3)">같은 품목의 체결 이력이 없습니다.</p>',
          '단가를 정할 근거를 이 화면에서 함께 제공합니다', '', 1) +
      '</div>' +
    '</div>';
};

/* ── 4.18 판매자 화면 ─────────────────────────────────────── */
VIEW.sLots = function () {
  var list = LOTS.filter(function (l) { return l.sel === S.me.id; });
  var rows = list.map(function (l) {
    var nb = BIDS.filter(function (b) { return b.lot === l.id && (b.st === '제안' || b.st === '검토중'); }).length;
    return '<tr><td class="nowrap"><b>' + esc(l.id) + '</b><br><small style="color:var(--tx-3)">' + esc(l.at) + '</small></td>' +
      '<td>' + lotBadge(l.st) + '</td>' +
      '<td class="nowrap">' + esc(item(l.it).n) + '<br><small style="color:var(--tx-3)">' + esc(grade(l.gr).n) + '</small></td>' +
      '<td class="r nowrap">' + ton(l.wt) + '</td><td class="r nowrap">' + won(l.want) + '</td>' +
      '<td class="nowrap">' + esc(l.out) + '</td>' +
      '<td class="c">' + (nb ? '<b style="color:var(--act-tx)">' + nb + '건</b>' : '—') + '</td>' +
      '<td class="c"><button class="b sm" data-a="go" data-r="lot:' + l.id + '">열기</button></td></tr>';
  }).join('');
  return ph('내 물량',
      '등록한 물량과 각 물량에 들어온 제안 건수를 봅니다. <b>본인이 등록한 물량만</b> 조회됩니다.',
      rq('<b>LOT-08</b> 등록상태 관리 · <b>MEM-05</b> 본인 건만 조회')) +
    card('', tw('<th>물량번호</th><th>상태</th><th>품목·등급</th><th class="r">예상중량</th><th class="r">희망가</th>' +
      '<th>출고 가능일</th><th class="c">새 제안</th><th class="c">이동</th>', rows), '', '', 1);
};

VIEW.sLotNew = function () {
  return ph('물량 등록',
      '품목·등급·예상중량·지역·희망가격·출고 가능일·사진을 입력합니다. ' +
      '<b>품목과 등급은 코드값에서 불러옵니다</b> — 등급 체계가 바뀌어도 개발이 필요하지 않습니다.',
      rq('<b>LOT-01~08</b> 품목·등급·예상중량·지역·희망가격·출고일·사진·등록상태')) +
    '<div class="cols c21">' +
      card('물량 정보',
        '<form class="fg" onsubmit="return false">' +
          '<div class="f"><label>품목 <i>*</i></label><select id="nlIt" data-a="nlItem">' +
            selOpt(ITEMS.filter(function (i) { return i.act; }), 'CU', function (i) {
              return { v:i.c, t:i.n + ' (기준 ' + nf(i.base) + '원/kg)' }; }) + '</select></div>' +
          '<div class="f"><label>등급 <i>*</i></label><select id="nlGr">' +
            selOpt(gradesOf('CU'), 'CU-1', function (g) { return { v:g.c, t:g.n }; }) + '</select>' +
            '<span class="hint">품목을 고르면 그 품목의 등급만 남습니다</span></div>' +
          '<div class="f"><label>예상중량 (kg) <i>*</i></label><input type="number" id="nlWt" placeholder="예: 12000">' +
            '<span class="hint">확정 중량은 계근 단계에서 확정됩니다</span></div>' +
          '<div class="f"><label>지역 <i>*</i></label><select id="nlRg">' +
            selOpt(REGIONS, S.me.rg, function (r) { return { v:r, t:r }; }) + '</select></div>' +
          '<div class="f"><label>희망가격 (원/kg) <i>*</i></label><input type="number" id="nlPx" placeholder="예: 11500">' +
            '<span class="hint" id="nlH">기준 단가 ' + nf(item('CU').base) + '원/kg</span></div>' +
          '<div class="f"><label>출고 가능일 <i>*</i></label><input type="date" id="nlOut" value="2026-04-15"></div>' +
          '<div class="f wide"><label>사진</label><button class="b" data-a="nlPhoto" style="height:33px">＋ 사진 추가 (모의)</button>' +
            '<span class="hint" id="nlPhH">첨부 0장</span></div>' +
          '<div class="f wide"><label>메모</label><input type="text" id="nlMemo" placeholder="특이사항"></div>' +
          '<div class="f wide"><button class="b pri lg" data-a="nlSave">등록 신청</button></div>' +
        '</form>') +
      card('등록 후 흐름',
        '<div class="steps" style="flex-direction:column">' +
          ['등록 — 신청 저장', '승인대기 — 운영자 확인', '판매중 — 거래시장 노출', '거래성립 — 제안 수락', '마감 — 출고일 경과']
            .map(function (t, i) {
              return '<div class="' + (i === 0 ? 'now' : '') + '"><span class="s-n">' + pad(i + 1, 2) + '</span>' +
                '<span class="s-t">' + esc(t.split(' — ')[0]) + '</span>' +
                '<span class="s-d">' + esc(t.split(' — ')[1]) + '</span></div>';
            }).join('') + '</div>' +
        note('k', 'i', '<b>물량의 생애주기는 거래의 12단계와 별개입니다.</b> 제안이 수락되면 거래가 생성되고 ' +
          '물량은 「거래성립」으로 넘어갑니다 — 세 축(물량·제안·거래)이 각자의 상태를 갖고 연결 지점에서만 서로를 건드립니다.')) +
    '</div>';
};

VIEW.sBids = function () {
  var mine = LOTS.filter(function (l) { return l.sel === S.me.id; }).map(function (l) { return l.id; });
  var list = BIDS.filter(function (b) { return mine.indexOf(b.lot) >= 0; });
  var rows = list.map(function (b) {
    var L = lot(b.lot);
    return '<tr><td class="nowrap"><b>' + esc(b.id) + '</b><br><small style="color:var(--tx-3)">' + esc(b.at) + '</small></td>' +
      '<td>' + bidBadge(b.st) + '</td>' +
      '<td class="nowrap"><a href="#/lot:' + esc(b.lot) + '" data-a="go" data-r="lot:' + esc(b.lot) + '">' + esc(b.lot) + '</a>' +
        '<br><small style="color:var(--tx-3)">' + esc(L ? item(L.it).n : '') + '</small></td>' +
      '<td class="nowrap">' + esc(mem(b.buy).co) + '</td>' +
      '<td class="r nowrap">' + kg(b.qty) + '</td>' +
      '<td class="r nowrap"><b>' + won(b.px) + '</b>' +
        (L ? '<br><small style="color:' + (b.px >= L.want ? 'var(--ok)' : 'var(--act-tx)') + '">' +
          (b.px >= L.want ? '희망가 이상' : '희망가 ' + pc((b.px - L.want) / L.want, 1)) + '</small>' : '') + '</td>' +
      '<td>' + esc(b.cond) + '</td>' +
      '<td class="c nowrap">' + (b.st === '제안' || b.st === '검토중'
        ? '<button class="b sm pri" data-a="bidOk" data-i="' + b.id + '">수락</button> ' +
          '<button class="b sm" data-a="bidNo" data-i="' + b.id + '">거절</button>' : '—') + '</td></tr>';
  }).join('');
  return ph('받은 제안',
      '내 물량에 들어온 제안입니다. <b>수락하면 거래번호가 자동 생성</b>되고 12단계 진행이 시작됩니다. ' +
      '1차에서는 <b>제안 → 수락/거절</b>이며 가격 협상(재제안·역제안)은 2차 권고입니다.',
      rq('<b>BID-04</b> 제안상태 관리 · <b>DEL-01~03</b> 수락·거래확정·번호생성·정보연결') +
      rq('<b>Q-10</b> §6 필수 범위에 협상 기능이 없는데 §3은 「가격 협상」을 핵심으로 둡니다 — 확인 필요', 'act')) +
    card('', tw('<th>제안번호</th><th>상태</th><th>물량</th><th>구매자</th><th class="r">수량</th>' +
      '<th class="r">단가</th><th>조건</th><th class="c">처리</th>', rows), '', '', 1);
};

VIEW.sDeals = function () { return dealList('내 거래 (판매자)',
  '내가 판매자인 거래만 조회됩니다. 12단계 중 현재 어디인지, 각 단계가 <b>언제 누구에 의해</b> 지나갔는지 확인합니다.'); };
VIEW.bDeals = function () { return dealList('내 거래 (구매자)',
  '내가 구매자인 거래만 조회됩니다. 계근·검수 결과와 최종금액 산출 근거를 확인할 수 있습니다.'); };

function dealList(title, desc) {
  var list = myDeals();
  var rows = list.map(function (d) {
    return '<tr><td class="nowrap"><b>' + esc(d.id) + '</b><br><small style="color:var(--tx-3)">' + esc(d.at) + '</small></td>' +
      '<td>' + dealBadge(d) + '</td>' +
      '<td class="nowrap">' + esc(item(d.it).n) + '<br><small style="color:var(--tx-3)">' + esc(grade(d.gr).n) + '</small></td>' +
      '<td class="r nowrap">' + ton(d.wt) + (d.f['실중량'] ? '<br><small style="color:var(--key-tx)">실 ' + ton(d.f['실중량']) + '</small>' : '') + '</td>' +
      '<td class="r nowrap">' + won(d.px) + '</td>' +
      '<td class="r nowrap">' + (d.snap ? '<b>' + won(d.snap.amt) + '</b><br><small style="color:var(--ok)">확정</small>' : '—') + '</td>' +
      '<td class="nowrap">' + esc(S.role === 'SELLER' ? mem(d.buy).co : mem(d.sel).co) + '</td>' +
      '<td class="c"><button class="b sm" data-a="go" data-r="deal:' + d.id + '">열기</button></td></tr>';
  }).join('');
  return ph(title, desc,
      rq('<b>STS-01~12</b> 12단계 진행 · <b>MEM-05</b> 본인이 당사자인 거래만')) +
    card('', tw('<th>거래번호</th><th>현재 상태</th><th>품목·등급</th><th class="r">중량</th><th class="r">단가</th>' +
      '<th class="r">최종금액</th><th>상대</th><th class="c">이동</th>', rows), '', '', 1);
}

VIEW.bBids = function () {
  var list = BIDS.filter(function (b) { return b.buy === S.me.id; });
  var rows = list.map(function (b) {
    var L = lot(b.lot);
    return '<tr><td class="nowrap"><b>' + esc(b.id) + '</b><br><small style="color:var(--tx-3)">' + esc(b.at) + '</small></td>' +
      '<td>' + bidBadge(b.st) + '</td>' +
      '<td class="nowrap"><a href="#/lot:' + esc(b.lot) + '" data-a="go" data-r="lot:' + esc(b.lot) + '">' + esc(b.lot) + '</a>' +
        '<br><small style="color:var(--tx-3)">' + esc(L ? item(L.it).n + ' ' + grade(L.gr).n : '') + '</small></td>' +
      '<td class="r nowrap">' + kg(b.qty) + '</td>' +
      '<td class="r nowrap"><b>' + won(b.px) + '</b></td>' +
      '<td>' + esc(b.cond) + '</td>' +
      '<td class="nowrap">' + esc(b.by ? opsUser(b.by).nm + ' 대행' : '직접') + '</td>' +
      '<td class="c">' + (b.st === '수락'
        ? (function () {
            var d = DEALS.filter(function (x) { return x.bidId === b.id; })[0];
            return d ? '<button class="b sm" data-a="go" data-r="deal:' + d.id + '">거래 열기</button>' : '—';
          })() : '—') + '</td></tr>';
  }).join('');
  return ph('내 제안',
      '보낸 제안과 그 결과입니다. 수락된 제안은 거래로 이어집니다. <b>다른 구매자의 제안 단가는 보이지 않습니다.</b>',
      rq('<b>BID-01~04</b> 수량·단가·조건·상태 · <b>MEM-05</b> 접근 범위 격리')) +
    card('', tw('<th>제안번호</th><th>상태</th><th>물량</th><th class="r">수량</th><th class="r">단가</th>' +
      '<th>조건</th><th>입력 경로</th><th class="c">이동</th>', rows), '', '', 1);
};

VIEW.watch = function () {
  var list = WATCH.filter(function (w) { return w.mem === S.me.id; });
  var rows = list.map(function (w) {
    var hit = LOTS.filter(function (l) {
      if (l.st !== '판매중') return false;
      if (w.it && l.it !== w.it) return false;
      if (w.gr && l.gr !== w.gr) return false;
      if (w.rg && l.rg !== w.rg) return false;
      if (w.min && l.wt < w.min) return false;
      return true;
    }).length;
    return '<tr><td class="nowrap"><b>' + esc(w.memo) + '</b></td>' +
      '<td class="nowrap">' + esc(w.it ? item(w.it).n : '전체') + '</td>' +
      '<td class="nowrap">' + esc(w.gr ? grade(w.gr).n : '전체') + '</td>' +
      '<td class="nowrap">' + esc(w.rg || '전체') + '</td>' +
      '<td class="r nowrap">' + (w.min ? kg(w.min) + ' 이상' : '제한 없음') + '</td>' +
      '<td class="c"><b>' + hit + '건</b></td>' +
      '<td class="c"><button class="b sm" data-a="watchDel" data-i="' + w.id + '">삭제</button></td></tr>';
  }).join('');
  return ph('관심 품목 · 조건 <span class="bg s"><span class="dot"></span>추가범위 OPT-02</span>',
      '거래시장 필터가 이미 있으므로 <b>그 조건을 저장·재적용하는 것뿐</b>입니다. 별도 공수가 거의 없어 1차에 포함했습니다. ' +
      '같은 조건의 물량이 새로 올라오면 <span class="cd">notify()</span>가 알림을 만듭니다.',
      rq('<b>OPT-02</b> 관심 품목·조건 저장 (추가범위 · 1차 포함 권고) · <b>AUT-04</b> 주요 알림')) +
    card('', tw('<th>이름</th><th>품목</th><th>등급</th><th>지역</th><th class="r">최소 수량</th>' +
      '<th class="c">현재 해당</th><th class="c">처리</th>', rows), '', '',
      '<button class="b sm" data-a="go" data-r="market">거래시장에서 조건 만들기</button>', 1);
};

/* ── 4.19 알림 (AUT-04) ──────────────────────────────────── */
VIEW.notify = function () {
  var list = NOTES.filter(function (n) { return S.role === 'OPS' || n.to === S.me.id; });
  var rows = list.map(function (n) {
    return '<tr' + (n.read ? ' class="dim"' : '') + '><td class="c">' +
      (n.read ? '<span class="bg g"><span class="dot"></span>읽음</span>' : '<span class="bg a"><span class="dot"></span>새 알림</span>') + '</td>' +
      '<td class="nowrap">' + bg('s', n.kind) + '</td>' +
      '<td>' + esc(n.tx) + '</td>' +
      '<td class="nowrap">' + esc(S.role === 'OPS' ? actorName(n.to) : '') + '</td>' +
      '<td class="nowrap">' + esc(n.ch) + '</td>' +
      '<td class="nowrap">' + esc(n.at) + '</td>' +
      '<td class="c">' + (n.deal ? '<button class="b sm" data-a="go" data-r="' +
        (/^D-/.test(n.deal) ? 'deal:' : 'lot:') + n.deal + '">열기</button>' : '—') + '</td></tr>';
  }).join('');
  return ph('알림',
      '1차는 <b>서비스 내 알림</b>입니다. 제안 접수 · 거래확정 · 상태변경 · 최종금액 확정 · 입금·지급 확인 시점에 알림이 생성됩니다.',
      rq('<b>AUT-04</b> 주요 알림 · <b>OPT-03</b> 문자·카카오 연계는 추가범위') +
      rq('<b>Q-02</b> §6은 「주요 알림」을 필수로, §7은 문자·카카오를 추가범위로 두었습니다 — 1차 채널과 발송 비용 부담 주체를 확인해야 합니다', 'act')) +
    note('k', 'i', '<b>발송은 하나의 지점을 거칩니다.</b> 알림을 부르는 곳이 시스템 곳곳에 흩어져 있으면 ' +
      '2차에서 문자를 붙일 때 그 모든 곳을 고쳐야 합니다. 한 지점을 거치게 만들어 두면 <b>그 함수 안쪽만</b> 바꾸면 되고 ' +
      '화면과 업무 흐름은 손대지 않습니다.' +
      '<div class="code" style="margin-top:10px">상태 변경 · 제안 접수 · 금액 확정\n' +
      '        ↓\n' +
      '    <b>notify</b>(대상, 종류, 거래번호)      <i>★ 이 지점 하나</i>\n' +
      '        ↓\n' +
      '  1차: 서비스 내 알림 저장\n' +
      '  2차: <i>↑ 이 안쪽만</i> 문자 · 카카오 알림톡 발송으로 교체</div>') +
    '<div style="height:14px"></div>' +
    card('알림 ' + list.length + '건',
      tw('<th class="c">읽음</th><th>종류</th><th>내용</th><th>수신자</th><th>채널</th><th>시각</th><th class="c">이동</th>', rows),
      '', '<button class="b sm" data-a="notesRead">모두 읽음</button>', 1);
};

/* ── 4.19b 가입 · 승인 흐름 (MEM-01~04) ─────────────────── */
VIEW.signup = function () {
  var role = S.tab.signup || 'SELLER';
  var seller = role === 'SELLER';
  return ph('가입 · 승인 흐름',
      '<b>가입 신청과 활성 상태를 분리했습니다.</b> 신청하면 「승인대기」로 저장되고, ' +
      '운영자 승인 후에야 거래에 참여할 수 있습니다. 승인 전 계정은 <b>로그인은 되지만 물량 등록·구매 제안이 막힙니다</b> — ' +
      '화면에서 숨기는 방식이 아니라 서버가 거절합니다.',
      rq('<b>MEM-01</b> 판매자 가입 · <b>MEM-02</b> 구매자 가입 · <b>MEM-03</b> 로그인 · <b>MEM-04</b> 운영자 승인') +
      rq('<b>Q-06</b> 사업자 확인 절차(사업자등록증 첨부·검증)의 유무는 원문에 없습니다 — 아래 항목은 <b>가정</b>입니다', 'act')) +
    '<div class="tabs">' +
      '<button class="' + (seller ? 'on' : '') + '" data-a="tab" data-g="signup" data-v="SELLER">판매자 가입</button>' +
      '<button class="' + (!seller ? 'on' : '') + '" data-a="tab" data-g="signup" data-v="BUYER">구매자 가입</button>' +
    '</div>' +
    '<div class="cols c21">' +
      card((seller ? '판매자' : '구매자') + ' 회원가입 신청',
        '<form class="fg" onsubmit="return false">' +
          '<div class="f"><label>거래처명 <i>*</i></label><input type="text" placeholder="사업자등록증상 상호"></div>' +
          '<div class="f"><label>담당자명 <i>*</i></label><input type="text" placeholder="실무 담당자"></div>' +
          '<div class="f"><label>사업자등록번호 <i>*</i></label><input type="text" placeholder="000-00-00000">' +
            '<span class="hint">목록 화면에서는 가려서 표시하고, 전체 값은 권한이 있는 사람이 상세에서 확인합니다</span></div>' +
          '<div class="f"><label>연락처 <i>*</i></label><input type="text" placeholder="010-0000-0000"></div>' +
          '<div class="f"><label>지역 <i>*</i></label><select>' +
            selOpt(REGIONS, '', function (r) { return { v:r, t:r }; }) + '</select></div>' +
          '<div class="f"><label>' + (seller ? '주력 품목' : '주 매입 품목') + '</label><select>' +
            selOpt(ITEMS.filter(function (i) { return i.act; }), '', function (i) { return { v:i.c, t:i.n }; }) +
            '</select></div>' +
          '<div class="f"><label>비밀번호 <i>*</i></label><input type="password" placeholder="8자 이상">' +
            '<span class="hint"><b>복호화가 불가능한 방식</b>으로 저장합니다. 관리자도 볼 수 없습니다</span></div>' +
          '<div class="f"><label>사업자등록증 <span style="color:var(--tx-3)">(확인 필요 — Q-06)</span></label>' +
            '<button class="b" style="height:33px">＋ 파일 첨부</button></div>' +
          '<div class="f wide"><label class="chk"><input type="checkbox"> ' +
            '<span>거래 조건과 개인정보 처리 방침에 동의합니다</span></label></div>' +
          '<div class="f wide"><button class="b pri lg" data-a="signupDemo">가입 신청 (모의)</button></div>' +
        '</form>') +
      '<div class="stack">' +
        card('신청 후 흐름',
          '<div class="steps" style="flex-direction:column">' +
            [['신규문의', '전화·홈페이지 문의 — 운영자가 가입을 안내'],
             ['가입 신청', '신청 저장 · 로그인은 가능하나 거래 참여 불가'],
             ['승인대기', '운영자가 사업자·거래처를 확인'],
             ['승인', '거래 참여 가능 — 물량 등록 / 구매 제안 개시'],
             ['정지', '삭제가 아니라 비활성. 남긴 이력은 보존됩니다']]
              .map(function (t, i) {
                return '<div class="' + (i === 2 ? 'now' : (i < 2 ? 'done' : '')) + '">' +
                  '<span class="s-n">' + pad(i + 1, 2) + '</span>' +
                  '<span class="s-t">' + esc(t[0]) + '</span>' +
                  '<span class="s-d">' + esc(t[1]) + '</span></div>';
              }).join('') + '</div>' +
          note('k', 'i', '<b>승인 전 계정을 왜 남겨 두는가.</b> 신청 기록이 남아야 「누가 언제 신청했고 왜 반려됐나」를 ' +
            '되짚을 수 있습니다. 신청을 지우는 방식으로 만들면 반려 이력이 사라집니다.')) +
        card('역할별 접근 범위',
          tw('<th>기능</th><th class="c">판매자</th><th class="c">구매자</th><th class="c">운영자</th>',
            [['물량 등록', '✓', '—', '✓ 대행'],
             ['거래시장 조회', '✓', '✓', '✓'],
             ['구매 제안', '—', '✓', '✓ 대행'],
             ['제안 수락', '✓ 본인 물량', '—', '✓'],
             ['거래 상세 조회', '✓ 당사자만', '✓ 당사자만', '✓ 전건'],
             ['남의 제안 단가', '✓ 본인 물량', '—', '✓'],
             ['상태 변경', '—', '—', '✓'],
             ['계근·검수 입력', '—', '—', '✓'],
             ['최종금액 확정', '—', '—', '✓ 권한별'],
             ['코드값·상태 설정', '—', '—', '✓']].map(function (r) {
              return '<tr><td class="nowrap">' + esc(r[0]) + '</td>' +
                r.slice(1).map(function (v) {
                  return '<td class="c nowrap" style="color:' +
                    (v === '—' ? 'var(--tx-4)' : 'var(--ok)') + '">' + esc(v) + '</td>';
                }).join('') + '</tr>';
            }).join(''), 1),
          '판매자·구매자는 본인이 당사자인 건만 (MEM-05)', '', 1) +
      '</div>' +
    '</div>';
};

/* ── 4.20 내 정보 ────────────────────────────────────────── */
VIEW.me = function () {
  if (S.role === 'OPS') {
    return ph('내 정보', '운영자 계정입니다. 운영자 안에서도 「조회만」과 「금액 확정 가능」을 나눌 수 있게 설정으로 둡니다.',
        rq('<b>MEM-05</b> 사용자별 권한 · 운영자 권한 세분')) +
      '<div class="cols c11">' +
        card('계정', dl([
          ['이름', '<b>' + esc(S.me.nm) + '</b>'], ['직책', esc(S.me.pos)],
          ['권한', S.me.perm === 'FULL' ? bg('k', '전체 — 금액 확정 가능') : bg('g', '조회만')],
          ['담당 화면', MENUS.filter(function (m) { return m.roles.indexOf('OPS') >= 0; }).length + '개']
        ])) +
        card('운영자 권한 구분',
          tw('<th>담당자</th><th>직책</th><th class="c">조회</th><th class="c">상태 변경</th><th class="c">금액 확정</th>',
            OPS_USERS.map(function (u) {
              var full = u.perm === 'FULL';
              return '<tr><td class="nowrap"><b>' + esc(u.nm) + '</b></td><td class="nowrap">' + esc(u.pos) + '</td>' +
                '<td class="c">✓</td><td class="c">' + (full ? '✓' : '—') + '</td><td class="c">' + (full ? '✓' : '—') + '</td></tr>';
            }).join(''), 1),
          '설정으로 나눕니다 — 개발이 필요하지 않습니다', '', 1) +
      '</div>';
  }
  var m = S.me, on = !!S.reveal['me'];
  var myL = LOTS.filter(function (l) { return l.sel === m.id; }).length;
  var myB = BIDS.filter(function (b) { return b.buy === m.id; }).length;
  return ph('내 정보', '가입 정보와 승인 상태입니다. <b>승인 전 계정은 로그인해도 거래에 참여할 수 없습니다.</b>',
      rq('<b>MEM-01~05</b> 가입·로그인·승인·권한')) +
    '<div class="cols c11">' +
      card('거래처 정보', dl([
        ['거래처', '<b>' + esc(m.co) + '</b>'], ['담당자', esc(m.nm)],
        ['구분', bg(m.role === 'SELLER' ? 'k' : 's', m.role === 'SELLER' ? '판매자' : '구매자')],
        ['승인 상태', memBadge(m.st)],
        ['사업자번호', '<span class="mask"><span class="v' + (on ? '' : ' hid') + '">' + esc(biz(m.biz, on)) +
          '</span><button class="eye' + (on ? ' on' : '') + '" data-a="reveal" data-k="me">◉</button></span>'],
        ['연락처', '<span class="mask"><span class="v' + (on ? '' : ' hid') + '">' + esc(tel(m.tel, on)) + '</span></span>'],
        ['지역', esc(m.rg)], ['가입일', esc(m.at)]
      ])) +
      card('내 활동', dl([
        [m.role === 'SELLER' ? '등록 물량' : '보낸 제안', '<b>' + (m.role === 'SELLER' ? myL : myB) + '건</b>'],
        ['진행 중 거래', '<b>' + myDeals().filter(function (d) { return d.st !== 'S12'; }).length + '건</b>'],
        ['완료 거래', '<b>' + myDeals().filter(function (d) { return d.st === 'S12'; }).length + '건</b>'],
        ['새 알림', '<b>' + NOTES.filter(function (n) { return n.to === m.id && !n.read; }).length + '건</b>']
      ])) +
    '</div>';
};

/* ── 4.21 범위 지도 — 필수 / 추가 / 제외 ─────────────────── */
VIEW.scope = function () {
  var t = S.tab.scope || 'must';
  /* 요구사항 등록부 — ID 단위. [ID, 요구사항, 대응 화면 route, 구현 방법] */
  var REG = [
    ['MEM-01', '판매자 회원가입', 'signup', '역할을 고르고 신청하면 승인대기 상태로 저장'],
    ['MEM-02', '구매자 회원가입', 'signup', '동일. 승인 전에는 거래에 참여할 수 없습니다'],
    ['MEM-03', '로그인', 'signup', '비밀번호는 복호화 불가능한 방식으로 저장 (프로토타입은 모의)'],
    ['MEM-04', '운영자 승인을 거쳐 가입 확정', 'members', '가입 신청과 활성 상태를 분리. 반려 사유가 이력에 남습니다'],
    ['MEM-05', '사용자별 권한 (판매자/구매자/운영자)', 'me', '프로토타입은 역할별 표시·차단 흐름을 시뮬레이션 — 실제 구축에서는 서버 권한 검증과 데이터 필터링'],
    ['LOT-01', '품목 입력', 'sLotNew', '코드값에서 불러옵니다 (품목·등급 관리에서 추가)'],
    ['LOT-02', '등급 입력', 'sLotNew', '품목을 고르면 그 품목의 등급만 남습니다'],
    ['LOT-03', '예상중량 입력', 'sLotNew', '「예상」 — 확정 중량은 계근 단계(STS-07)에서 확정'],
    ['LOT-04', '지역 입력', 'sLotNew', '거래시장 지역 필터와 관심 조건의 입력값'],
    ['LOT-05', '희망가격 입력', 'sLotNew', '기준 단가를 옆에 표시해 시세에서 벗어나면 바로 확인'],
    ['LOT-06', '출고 가능일 입력', 'sLotNew', '경과 시 물량이 「마감」으로 넘어갑니다'],
    ['LOT-07', '사진 첨부', 'lot', '파일 전용 저장 공간 + 목록용 축소 이미지'],
    ['LOT-08', '등록상태 관리', 'lots', '등록 → 승인대기 → 판매중 → 거래성립 → 마감'],
    ['LOT-09', '운영자 대행 등록', 'quickLot', '약 1분 단일 화면 · 대행입력자 기록'],
    ['MKT-01', '물량 목록', 'market', '판매중 상태의 물량만 노출 · 축소 이미지 사용'],
    ['MKT-02', '물량 상세보기', 'lot', '사진·제안 목록. 구매자에게는 남의 제안 단가 미노출'],
    ['MKT-03', '검색', 'market', '물량번호·품목·등급·지역·거래처 통합 검색'],
    ['MKT-04', '조건별 필터', 'market', '품목·등급·지역·최소수량 4개 조건 (Q-07 확인 필요)'],
    ['BID-01', '구매수량 입력', 'lot', '물량 수량이 기본값. 분할 인수도 입력 가능'],
    ['BID-02', '단가 입력', 'lot', '판매자 희망가·기준 단가를 함께 표시'],
    ['BID-03', '조건 입력', 'lot', '인수 시점·운송 부담·결제 기일 (Q-08 정의 확인 필요)'],
    ['BID-04', '제안상태 관리', 'bidsAll', '제안 → 검토중 → 수락 / 거절 / 만료 (Q-09)'],
    ['BID-05', '직원 대행입력', 'quickBid', '대행입력자 기록. 수락 시 거래에도 대행 표시가 남습니다'],
    ['DEL-01', '제안 수락 및 거래확정', 'sBids', '수락 시 물량은 「거래성립」, 같은 물량의 타 제안은 자동 거절'],
    ['DEL-02', '거래번호 자동생성', 'deals', 'D-2026-nnnn 형식으로 수락 시점에 발급'],
    ['DEL-03', '관련 정보 자동 연결', 'deal', '물량·제안·판매자·구매자가 거래에 연결되어 함께 조회'],
    ['STS-01', '거래확정', 'deal', '거래번호·수량·단가·조건 확정'],
    ['STS-02', '배차대기', 'dispatch', '필수 입력 없음 — 바로 배차 착수'],
    ['STS-03', '배차완료', 'dispatch', '필수: 차량번호·기사명·상차예정일 (Q-11 항목 확인 필요)'],
    ['STS-04', '상차완료', 'dispatch', '필수: 상차시각 + 필수 증빙 「상차사진」'],
    ['STS-05', '운송중', 'dispatch', '필수 입력 없음'],
    ['STS-06', '도착', 'dispatch', '필수: 도착시각 — 현장 모바일에서 기록'],
    ['STS-07', '계근완료', 'weigh', '필수: 실중량 + 증빙 「계근표」. 예상중량과 차이·허용 오차 표시'],
    ['STS-08', '검수완료', 'inspect', '필수: 판정등급 + 증빙 「검수자료」. 등록등급과 나란히 보관'],
    ['STS-09', '최종금액확정', 'settle', '필수: 최종금액. 확정 시 규칙을 스냅샷으로 복제 저장'],
    ['STS-10', '구매자 입금확인', 'settle', '필수: 입금일. 플랫폼은 돈을 다루지 않고 상태만 기록'],
    ['STS-11', '판매자 지급완료', 'settle', '필수: 지급일'],
    ['STS-12', '거래완료', 'deals', '더 넘길 상태가 없습니다'],
    ['STS-H1', '변경자 기록', 'deal', '모든 이력 행에 변경자 + 대행입력 여부'],
    ['STS-H2', '변경시간 기록', 'deal', '모든 이력 행에 변경시각'],
    ['STS-H3', '이전 상태와 변경내용 기록', 'deal', '이전 상태 → 새 상태 · 사유. 덮어쓰지 않고 쌓기만'],
    ['STS-H4', '운영자가 증빙사진·계근표·검수자료 첨부', 'deal', '거래·단계·종류와 함께 기록되어 이력의 해당 지점에 붙습니다'],
    ['STS-H5', '「거래 단계는 순서가 변경될 수 있습니다」', 'states', '상태·전이를 버전 있는 설정 데이터로 — 새 버전은 이후 거래에만 적용'],
    ['OPS-01', '회원승인', 'members', '승인·반려·정지. 반려 사유가 이력에 남습니다'],
    ['OPS-02', '대행 물량등록 (약 1분)', 'quickLot', '단일 화면 · 필수 6항목 · 화면에서 경과 시간 실측'],
    ['OPS-03', '대행 구매제안 입력', 'quickBid', '물량을 고르면 수량·단가 기본값이 채워집니다'],
    ['OPS-04', '거래상태 관리', 'deal', 'changeStatus() 한 지점만 거치는 12단계 전이'],
    ['OPS-05', '물류(배차) 관리', 'dispatch', '차량·기사·일정·상하차 시각. 자동 배차는 제외(EXC-04)'],
    ['OPS-06', '계근 관리', 'weigh', '실중량 입력 + 계근표 첨부 + 오차 표시'],
    ['OPS-07', '검수 관리', 'inspect', '판정등급 + 검수자료 + 등급 조정률 표시'],
    ['OPS-08', '정산 관리', 'settle', '최종금액 확정 → 입금확인 → 지급완료'],
    ['OPS-09', '현재상태와 다음 조치사항을 한눈에', 'board', '상태정의의 필수 입력 항목에서 자동 유도 — 별도 관리하지 않습니다'],
    ['OPS-10', '증빙자료 간단 첨부', 'deal', '종류별 버튼 한 번. 현재 단계에 붙고 이력에 남습니다'],
    ['OPS-11', '8단 전체 현황판', 'board', '각 칸을 누르면 해당 목록으로. 물량 축과 거래 축을 분리'],
    ['AUT-01', '상태변경 자동화', 'states', '전이규칙·필수 항목 검사를 자동. 넘기는 판단은 사람'],
    ['AUT-02', '최종금액 계산', 'settle', '실중량·판정등급으로 자동 계산 + 산출근거 줄별 표시 (Q-01)'],
    ['AUT-03', '변경이력 자동 기록', 'deal', '상태 갱신과 이력 추가를 한 묶음으로 — 이력 없는 경로가 없습니다'],
    ['AUT-04', '주요 알림', 'notify', 'notify() 한 지점. 1차는 서비스 내 알림 (Q-02)'],
    ['AUT-05', '기본 운영지표', 'metrics', '완주 거래·확정 물량·금액·평균 소요·대행 비중 (Q-13)'],
    ['ENV-01', 'PC와 모바일 웹에서 모두 사용 가능', 'dispatch', '6개 폭 검증 · 현장 화면은 큰 버튼, 표는 PC 기준'],
    ['ENV-02', '별도 모바일 앱은 제외', 'scope', '반응형 웹만. 앱을 만들지 않습니다']
  ];
  var OPT = [
    ['OPT-01', '잠재 구매자 후보 추천', '2차 권고', '품목·지역·최소수량 조건의 규칙 기반 조회. 거래 데이터가 쌓이기 전에는 추천할 후보 자체가 없습니다', 0],
    ['OPT-02', '관심 품목·조건 저장', '1차 포함', '거래시장 필터가 이미 있으므로 그 조건을 저장·재적용하는 것뿐입니다', 1],
    ['OPT-03', '문자·카카오 알림 연계', '2차 권고', '외부 서비스 계약·심사·발송 비용·발신번호 등록·템플릿 승인이 딸려 옵니다. notify() 한 지점을 남겨 둡니다', 0],
    ['OPT-04', '과거 거래가격 조회', '1차 포함', '거래 데이터가 이미 쌓이므로 조회 화면 하나만 추가하면 됩니다. 구매 제안 화면에서 바로 참고합니다', 1],
    ['OPT-05', '거래처 내부 메모·신뢰도', '2차 권고', '운영자 전용 기능이며 1차 필수 경로에 없습니다', 0],
    ['OPT-06', '간단한 거래 통계', '2차 권고', '1차에서는 현황판의 건수·금액 표시와 운영지표로 대체합니다', 0],
    ['OPT-07', '반복거래 생성', '2차 권고', '완주한 거래가 있어야 복제할 대상이 생깁니다', 0]
  ];
  var EXC = [
    ['EXC-01', 'AI 기반 자동 매칭 및 가격예측'], ['EXC-02', 'ERP 전면 연동'],
    ['EXC-03', '플랫폼 자체 결제 및 에스크로'], ['EXC-04', '자동 배차'],
    ['EXC-05', '별도 모바일 앱'], ['EXC-06', '고도화된 환경·탄소 데이터 관리'],
    ['EXC-07', '거래금융·조기정산'], ['EXC-08', '복잡한 대기업 구매관리 기능'],
    ['EXC-09', '광고·유료회원 중심 구조'], ['EXC-10', '과도한 전사시스템 연동']
  ];
  var body;
  if (t === 'must') {
    var grp = '', rows = '';
    REG.forEach(function (r) {
      var g = r[0].split('-')[0];
      if (g !== grp) {
        grp = g;
        var nm = { MEM:'회원·권한', LOT:'판매 물량 등록', MKT:'거래시장', BID:'구매 제안',
                   DEL:'거래 확정', STS:'거래 진행 12단계 + 공통 요구', OPS:'운영자 관리화면',
                   AUT:'기본 자동화', ENV:'접속환경' }[g] || g;
        var n = REG.filter(function (x) { return x[0].indexOf(g + '-') === 0; }).length;
        rows += '<tr class="sum"><td colspan="4"><b>' + esc(g) + '</b> · ' + esc(nm) +
          ' <small style="color:var(--tx-3);font-weight:400">' + n + '개 ID</small></td></tr>';
      }
      var mm = menu(r[2]) || { n:{ lot:'물량 상세', deal:'거래 상세' }[r[2]] || r[2] };
      rows += '<tr><td class="nowrap"><b>' + esc(r[0]) + '</b></td>' +
        '<td class="nowrap">' + esc(r[1]) + '</td>' +
        '<td style="font-size:11.5px">' + esc(r[3]) + '</td>' +
        '<td class="c nowrap"><button class="b sm" data-a="go" data-r="' + esc(r[2]) + '">' +
        esc(mm.n) + '</button></td></tr>';
    });
    body = tw('<th>ID</th><th>요구사항 (원문 근거)</th><th>이 프로토타입의 구현 방법</th><th class="c">화면</th>', rows);
  } else if (t === 'opt') {
    body = tw('<th>ID</th><th>항목</th><th class="c">판단</th><th>근거</th>',
      OPT.map(function (r) {
        return '<tr><td class="nowrap"><b>' + esc(r[0]) + '</b></td><td class="nowrap">' + esc(r[1]) + '</td>' +
          '<td class="c nowrap">' + bg(r[4] ? 'o' : 'g', r[2]) + '</td>' +
          '<td style="font-size:11.5px">' + esc(r[3]) + '</td></tr>';
      }).join(''), 1);
  } else {
    body = tw('<th>ID</th><th>제외 항목</th><th>이 프로토타입에서</th>',
      EXC.map(function (r) {
        return '<tr><td class="nowrap"><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td>' +
          '<td style="font-size:11.5px;color:var(--tx-3)">구현하지 않았습니다</td></tr>';
      }).join(''), 1);
  }
  var total = REG.length;
  return ph('범위 지도',
      '이 프로토타입이 <b>요구사항 등록부의 어느 ID에 대응하는지</b>를 그대로 적었습니다. ' +
      '「하지 않는다」를 명시해 범위 분쟁을 막는 것도 같은 자리에서 합니다.',
      rq('필수 <b>' + total + '개 ID</b> 전량 대응 · 추가범위 <b>7건</b> · 제외 <b>10건</b> · 개발 원칙 <b>5개</b>') +
      rq('화면 목록은 원문에 없습니다 — 요구사항 등록부에서 유도한 후보이며 <b>3주차 요구범위 확정 게이트</b>에서 확정됩니다', 'act')) +
    '<div class="tabs">' +
      '<button class="' + (t === 'must' ? 'on' : '') + '" data-a="tab" data-g="scope" data-v="must">필수 개발 범위 ' + REG.length + '개 ID</button>' +
      '<button class="' + (t === 'opt' ? 'on' : '') + '" data-a="tab" data-g="scope" data-v="opt">추가 개발 범위 7건</button>' +
      '<button class="' + (t === 'exc' ? 'on' : '') + '" data-a="tab" data-g="scope" data-v="exc">1차 제외 범위 10건</button>' +
    '</div>' +
    card('', body, '', '', 1) +
    '<div style="height:16px"></div>' +
    card('개발 원칙 (PRN) — 발주사가 먼저 선언한 것',
      '<div class="dl">' +
        [['PRN-01 디지털 우선', '정상 거래는 플랫폼에서 직접 처리합니다. 예외 경로(전화·메신저 접수)는 <b>대행 입력으로 같은 흐름에</b> 넣습니다'],
         ['PRN-02 반자동화', '거래번호·상태변경 기록·금액계산·변경이력·알림은 <b>자동</b>. 상태를 다음으로 넘기는 <b>판단은 사람</b>'],
         ['PRN-03 직원 지원 병행', '대행 입력 건과 직접 등록 건이 같은 흐름에 들어가되 <b>대행입력자를 기록해 구분</b>합니다'],
         ['PRN-04 관리자 화면 중시', '8단 현황판과 다음 조치사항을 <b>운영자 첫 화면</b>으로 두었습니다'],
         ['PRN-05 실제 시험운영 중심', '8주차부터 실사용자 시험운영. 이 프로토타입은 그 시험운영에서 <b>운영자가 볼 화면</b>을 미리 확인하는 자료입니다']
        ].map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') +
      '</div>') +
    '<div style="height:16px"></div>' +
    note('w', '!', '<b>이 프로토타입은 화면 확인용입니다.</b> 데이터는 브라우저 메모리에만 있고 서버·데이터베이스·인증은 연결되어 있지 않습니다. ' +
      '따라서 역할별 표시·차단은 시뮬레이션이며, 실제 구축에서는 서버 권한 검증과 데이터 필터링으로 구현합니다. ' +
      '금액 계산 규칙, 품목·등급 목록, 배차 항목, 검수 기준은 <b>원문에 없어 가정한 값</b>이며 계약 후 3주차 게이트에서 확정합니다.');
};

/* ══ 5. 액션 ═════════════════════════════════════════════════ */
var A = {};

/* ── 5.1 셸 ─────────────────────────────────────────────── */
A.login = function (t) {
  var r = t.getAttribute('data-r'), u = t.getAttribute('data-u');
  S.role = r;
  S.me = r === 'OPS' ? opsUser(u) : mem(u);
  S.route = r === 'OPS' ? 'board' : (r === 'SELLER' ? 'sLots' : 'market');
  renderShell();
  go(S.route);
  toast(roleLabel(r) + '로 로그인했습니다', '역할에 따라 <b>보이는 화면과 조회 범위</b>가 달라집니다. ' +
    '상단바의 「역할」에서 즉시 바꿔 볼 수 있습니다.', 'k');
};
A.logout = function () {
  S.role = null; S.me = null;
  history.pushState(null, '', '#/login');
  renderLogin();
};
A.go = function (t) { go(t.getAttribute('data-r')); };
A.rail = function () {
  S.railOpen = !S.railOpen;
  $('#rail').classList.toggle('open', S.railOpen);
  $('#scrim').hidden = !S.railOpen;
};
A.railClose = function () {
  S.railOpen = false;
  $('#rail').classList.remove('open');
  $('#scrim').hidden = true;
};
A.theme = function () {
  var order = ['sys', 'light', 'dark'];
  S.theme = order[(order.indexOf(S.theme) + 1) % 3];
  if (S.theme === 'sys') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', S.theme);
  toast('화면 모드: ' + { sys:'시스템 설정', light:'라이트', dark:'다크' }[S.theme], '', 'g');
};
A.mdX = function () { closeModal(); };
A.reveal = function (t) {
  var k = t.getAttribute('data-k');
  S.reveal[k] = !S.reveal[k];
  paint();
  if (S.reveal[k]) toast('가린 값을 열었습니다', '실제 구축 시에는 <b>가린 값을 열어 본 것도 접근 이력에 남습니다.</b>', 'w');
};
A.tab = function (t) { S.tab[t.getAttribute('data-g')] = t.getAttribute('data-v'); paint(); };
A.dealFlt = function (t) { S.boardFlt = t.getAttribute('data-v'); paint(); };

/* ── 5.2 회원 승인 ──────────────────────────────────────── */
A.memOk = function (t) {
  var m = mem(t.getAttribute('data-i'));
  m.st = '승인'; m.at = today();
  notify(m.id, '가입승인', '', m.co + ' — 가입이 승인되었습니다. 이제 거래에 참여할 수 있습니다.');
  paint(); renderRail();
  toast(m.co + ' 승인 완료', '가입 신청과 활성 상태를 분리했으므로, <b>승인된 지금부터</b> 거래에 참여할 수 있습니다.', 'o');
};
A.memNo = function (t) {
  var m = mem(t.getAttribute('data-i'));
  modal('가입 반려 — ' + esc(m.co),
    '<div class="f"><label>반려 사유 <i>*</i></label>' +
    '<textarea id="rjWhy" rows="3" placeholder="예: 사업자등록증 확인 불가">사업자등록증 확인 불가</textarea>' +
    '<span class="hint">반려 사유는 <b>이력에 남습니다.</b> 나중에 「왜 반려됐나」를 되짚을 수 있어야 합니다.</span></div>',
    '<button class="b" data-a="mdX">취소</button>' +
    '<button class="b act" data-a="memNoDo" data-i="' + m.id + '">반려 처리</button>');
};
A.memNoDo = function (t) {
  var m = mem(t.getAttribute('data-i'));
  m.memo = '반려 (' + today() + '): ' + ($('#rjWhy') ? $('#rjWhy').value : '');
  closeModal(); paint(); renderRail();
  toast(m.co + ' 반려 처리', '사유가 이력에 남았습니다.', 'a');
};
A.memHold = function (t) {
  var m = mem(t.getAttribute('data-i'));
  m.st = '승인대기';
  paint(); renderRail();
  toast(m.co + ' 정지', '<b>삭제가 아니라 비활성</b>이므로 그 거래처가 남긴 물량·제안·거래 이력은 보존됩니다.', 'w');
};

/* ── 5.3 대행 물량 등록 — 1분 타이머 ────────────────────── */
S.qtimer = null; S.qt0 = 0; S.qPhoto = 0;
function startQuickTimer() {
  if (!$('#qtV')) { stopQuickTimer(); return; }
  if (S.qtInt) return;
  S.qtInt = setInterval(function () {
    var el = $('#qtV');
    if (!el) { stopQuickTimer(); return; }
    var s = (Date.now() - S.qt0) / 1000;
    el.textContent = s.toFixed(1);
    var box = $('#qtBox');
    if (box) box.className = 'qt' + (s > 60 ? ' over' : (s > 45 ? ' near' : ' on'));
    var d = $('#qtD');
    if (d) d.textContent = s > 60 ? '목표 60초를 넘었습니다 — 항목 수를 줄여야 합니다'
      : '측정 중 · 목표 60초 · 남은 ' + Math.max(0, 60 - s).toFixed(0) + '초';
  }, 100);
}
function stopQuickTimer() { if (S.qtInt) { clearInterval(S.qtInt); S.qtInt = null; } }
A.qTick = function () {
  if (!S.qtimer) { S.qtimer = 1; S.qt0 = Date.now(); startQuickTimer(); }
};
A.qtReset = function () {
  stopQuickTimer(); S.qtimer = null; S.qPhoto = 0;
  if ($('#qtV')) $('#qtV').textContent = '0.0';
  if ($('#qtBox')) $('#qtBox').className = 'qt';
  if ($('#qtD')) $('#qtD').textContent = '첫 항목을 입력하면 측정이 시작됩니다 · 목표 60초';
  if ($('#qPhH')) $('#qPhH').textContent = '첨부 0장 — 파일 전용 저장 공간으로 올라가고 목록용 축소 이미지가 생성됩니다';
};
A.qItem = function (t) {
  A.qTick();
  var it = t.value, gs = gradesOf(it);
  $('#qGr').innerHTML = selOpt(gs, gs[0] ? gs[0].c : '', function (g) { return { v:g.c, t:g.n }; });
  if ($('#qPxH')) $('#qPxH').textContent = '기준 단가 ' + nf(item(it).base) + '원 · 등급 조정 ' +
    (gs[0] && gs[0].adj ? pc(gs[0].adj, 0) : '± 0%');
};
A.qPhoto = function () {
  A.qTick(); S.qPhoto++;
  $('#qPhH').textContent = '첨부 ' + S.qPhoto + '장 — 원본 보관 + 목록용 축소 이미지 생성';
};
A.qSave     = function () { quickSave('판매중'); };
A.qSaveWait = function () { quickSave('승인대기'); };
function quickSave(st) {
  var sel = $('#qSel').value, it = $('#qIt').value, gr = $('#qGr').value,
      wt = Number($('#qWt').value), rg = $('#qRg').value, px = Number($('#qPx').value),
      out = $('#qOut').value, memo = $('#qMemo').value;
  var miss = [];
  if (!sel) miss.push('판매자'); if (!it) miss.push('품목'); if (!gr) miss.push('등급');
  if (!wt) miss.push('예상중량'); if (!rg) miss.push('지역'); if (!px) miss.push('희망가격');
  if (miss.length) {
    toast('필수 항목이 비어 있습니다', '<b>' + esc(miss.join(' · ')) + '</b> — 6개 항목이 모두 채워져야 저장됩니다.', 'a');
    return;
  }
  var secs = S.qtimer ? (Date.now() - S.qt0) / 1000 : 0;
  S.seq.lot++;
  var id = 'L-' + pad(S.seq.lot, 4);
  LOTS.unshift({ id:id, sel:sel, it:it, gr:gr, wt:wt, rg:rg, want:px, out:out, st:st,
    at:today(), ph:S.qPhoto, by:S.me.id, memo:memo || '전화 접수 — 대행 등록.' });
  notify(sel, '물량등록', id, id + ' — 운영자가 대행 등록했습니다 (' + item(it).n + ' ' + kg(wt) + ')');
  /* 관심 조건에 걸리는 구매자에게 알림 */
  WATCH.forEach(function (w) {
    if (w.it && w.it !== it) return;
    if (w.gr && w.gr !== gr) return;
    if (w.rg && w.rg !== rg) return;
    if (w.min && wt < w.min) return;
    notify(w.mem, '관심조건', id, '관심 조건「' + w.memo + '」에 맞는 물량이 등록되었습니다 — ' + id);
  });
  stopQuickTimer(); S.qtimer = null; S.qPhoto = 0;
  toast(id + ' 등록 완료' + (secs ? ' — ' + secs.toFixed(1) + '초' : ''),
    (secs && secs <= 60 ? '<b>목표 60초 안에 끝났습니다.</b> ' : '') +
    '대행입력자 <b>' + esc(S.me.nm) + '</b>가 함께 기록되었습니다. 상태: <b>' + st + '</b>',
    secs && secs <= 60 ? 'o' : 'k');
  go('lots');
}

/* ── 5.4 대행 구매제안 ──────────────────────────────────── */
A.qbLot = function (t) {
  var L = lot(t.value);
  if (!L) return;
  $('#qbQty').value = L.wt; $('#qbPx').value = L.want;
  $('#qbH').textContent = '판매자 희망가 ' + nf(L.want) + '원/kg';
};
A.qbSave = function () {
  var lid = $('#qbLot').value, buy = $('#qbBuy').value,
      qty = Number($('#qbQty').value), px = Number($('#qbPx').value), cond = $('#qbCond').value;
  if (!lid || !buy || !qty || !px) { toast('필수 항목이 비어 있습니다', '물량·구매자·수량·단가를 확인해 주십시오.', 'a'); return; }
  S.seq.bid++;
  var id = 'B-' + pad(S.seq.bid, 4);
  BIDS.unshift({ id:id, lot:lid, buy:buy, qty:qty, px:px, cond:cond, st:'제안',
    at:nowStamp(0), by:S.me.id, memo:'전화 접수 — 대행 입력.' });
  var L = lot(lid);
  notify(L.sel, '제안접수', lid, lid + ' — 새 구매 제안이 도착했습니다 (' + won(px) + '/kg)');
  toast(id + ' 제안 등록', '대행입력자 <b>' + esc(S.me.nm) + '</b>를 기록했습니다. 판매자에게 알림이 발송되었습니다.', 'o');
  go('bidsAll');
};
A.bidNew = function (t) {
  var L = lot(t.getAttribute('data-i'));
  var qty = Number($('#nbQty').value), px = Number($('#nbPx').value), cond = $('#nbCond').value;
  if (!qty || !px) { toast('수량과 단가를 입력해 주십시오', '', 'a'); return; }
  S.seq.bid++;
  var id = 'B-' + pad(S.seq.bid, 4);
  BIDS.unshift({ id:id, lot:L.id, buy:S.me.id, qty:qty, px:px, cond:cond, st:'제안',
    at:nowStamp(0), by:null, memo:'' });
  notify(L.sel, '제안접수', L.id, L.id + ' — 새 구매 제안이 도착했습니다 (' + won(px) + '/kg)');
  toast(id + ' 제안을 등록했습니다', '판매자가 수락하면 <b>거래번호가 자동 생성</b>되고 12단계 진행이 시작됩니다.', 'o');
  paint(); renderRail();
};

/* ── 5.5 제안 수락 → 거래 생성 (DEL-01~03) ─────────────── */
A.bidOk = function (t) {
  var b = bid(t.getAttribute('data-i')), L = lot(b.lot);
  b.st = '수락';
  L.st = '거래성립';
  BIDS.forEach(function (x) {
    if (x.lot === L.id && x.id !== b.id && (x.st === '제안' || x.st === '검토중')) {
      x.st = '거절'; x.memo = '다른 제안이 수락되어 자동 거절 (' + today() + ')';
      notify(x.buy, '제안결과', L.id, L.id + ' — 다른 제안이 수락되어 종료되었습니다');
    }
  });
  S.seq.deal++;
  var id = 'D-2026-' + pad(S.seq.deal, 4);
  var v = ver();
  var d = { id:id, lot:L.id, bidId:b.id, sel:L.sel, buy:b.buy, it:L.it, gr:L.gr,
    wt:L.wt, qty:b.qty, px:b.px, cond:b.cond, rg:L.rg, st:v.sdef[0].c, rv:v.v,
    at:today(), f:{}, ev:[], hist:[], byAgent:(b.by || L.by || null), snap:null };
  d.hist.push({ from:'—', to:v.sdef[0].c, by:(S.role === 'OPS' ? S.me.id : S.me.id),
    at:nowStamp(0), why:'제안 수락 → 거래확정 (거래번호 자동생성 · 물량·제안·회원 자동 연결)',
    kind:'fwd', rv:v.v });
  DEALS.unshift(d);
  notify(L.sel, '거래확정', id, id + ' — 거래가 확정되었습니다');
  notify(b.buy, '거래확정', id, id + ' — 거래가 확정되었습니다');
  toast(id + ' 거래확정', '거래번호가 <b>자동 생성</b>되고 물량·제안·회원이 자동 연결되었습니다. ' +
    '이 거래는 <b>설정 v' + v.v + '</b>(' + v.sdef.length + '단계)을 참조합니다.', 'o');
  go('deal:' + id);
};
A.bidNo = function (t) {
  var b = bid(t.getAttribute('data-i'));
  b.st = '거절'; b.memo = '판매자 거절 (' + today() + ')';
  notify(b.buy, '제안결과', b.lot, b.lot + ' — 제안이 거절되었습니다');
  paint(); renderRail();
  toast('제안을 거절했습니다', '거절 사유가 이력에 남습니다.', 'a');
};
A.lotOk = function (t) {
  var l = lot(t.getAttribute('data-i'));
  l.st = '판매중';
  notify(l.sel, '물량승인', l.id, l.id + ' — 물량이 판매중으로 전환되어 거래시장에 노출됩니다');
  paint();
  toast(l.id + ' 판매중으로 전환', '거래시장에 노출됩니다. 관심 조건에 맞는 구매자에게 알림이 갑니다.', 'o');
};

/* ── 5.6 상태 변경 (STS) ────────────────────────────────── */
A.stGo = function (t) {
  var d = deal(t.getAttribute('data-d')), to = t.getAttribute('data-t');
  var r = changeStatus(d, to, S.me.id, '', false);
  if (!r.ok) {
    toast('상태를 넘길 수 없습니다', '<b>' + esc(r.why) + '</b>' +
      (r.miss ? '<br>미입력: <b>' + esc(r.miss.join(' · ')) + '</b>' : ''), 'a');
    if (r.miss) A.fillOpen({ getAttribute:function (k) { return k === 'data-d' ? d.id : to; } });
    return;
  }
  paint(); renderRail();
  toast(d.id + ' — ' + stName(d.rv, r.from) + ' → ' + stName(d.rv, to),
    '<b>상태 갱신과 이력 기록을 한 묶음으로</b> 처리했습니다. 변경자·변경시각·이전 상태가 함께 남았고 ' +
    '당사자 2명에게 알림이 발송되었습니다.', 'o');
};
A.stBack = function (t) {
  var d = deal(t.getAttribute('data-d')), to = t.getAttribute('data-t');
  modal('되돌리기 — ' + esc(d.id),
    note('w', '!', '<b>되돌리기도 이력에 남습니다.</b> 「' + esc(stName(d.rv, d.st)) + '」에서 ' +
      '「' + esc(stName(d.rv, to)) + '」로 되돌린 기록과 사유가 지워지지 않습니다.') +
    '<div class="f" style="margin-top:14px"><label>되돌리는 사유 <i>*</i></label>' +
    '<textarea id="bkWhy" rows="3" placeholder="예: 배차 차량 변경으로 재배정 필요">배차 차량 변경으로 재배정 필요</textarea></div>',
    '<button class="b" data-a="mdX">취소</button>' +
    '<button class="b act" data-a="stBackDo" data-d="' + d.id + '" data-t="' + to + '">되돌리기</button>');
};
A.stBackDo = function (t) {
  var d = deal(t.getAttribute('data-d')), to = t.getAttribute('data-t');
  var why = $('#bkWhy') ? $('#bkWhy').value : '';
  if (!why.trim()) { toast('사유를 입력해 주십시오', '되돌리기는 사유 없이 처리되지 않습니다.', 'a'); return; }
  var r = changeStatus(d, to, S.me.id, why, true);
  closeModal();
  if (!r.ok) { toast('되돌릴 수 없습니다', esc(r.why), 'a'); return; }
  paint(); renderRail();
  toast(d.id + ' 되돌리기 완료', '이력에 <b>되돌리기</b>로 표시되어 남았습니다.', 'w');
};

/* ── 5.7 단계별 입력 (필수 항목 채우기) ─────────────────── */
A.fillOpen = function (t) {
  var d = deal(t.getAttribute('data-d')), to = t.getAttribute('data-t');
  var vv = verOf(d.rv), def = vv.sdef.filter(function (x) { return x.c === to; })[0];
  if (!def) return;
  var need = (def.req || []).filter(function (k) { return d.f[k] == null || d.f[k] === ''; });
  var evNeed = (def.ev || []).filter(function (x) { return !d.ev.some(function (e) { return e.t === x; }); });
  var fields = need.map(function (k) {
    var extra = '', input;
    if (k === '판정등급') {
      input = '<select id="fx_' + esc(k) + '">' + selOpt(gradesOf(d.it), d.gr,
        function (g) { return { v:g.c, t:g.n + ' (조정 ' + (g.adj === 0 ? '± 0%' : pc(g.adj, 0)) + ')' }; }) + '</select>';
      extra = '등록 등급은 <b>' + esc(grade(d.gr).n) + '</b>입니다. 두 값을 나란히 보관합니다.';
    } else if (k === '실중량') {
      input = '<input type="number" id="fx_' + esc(k) + '" value="' + d.wt + '">';
      extra = '등록 예상중량 <b>' + kg(d.wt) + '</b> · 허용 오차 ±' + pc(vv.rule.weighTol, 1);
    } else if (k === '최종금액') {
      var c = calcAmount(d);
      input = '<input type="number" id="fx_' + esc(k) + '" value="' + c.amt + '" readonly>';
      extra = '<b>자동 계산값</b>입니다 — 계근 중량과 판정 등급으로 산출했습니다.';
    } else if (/일$/.test(k)) {
      input = '<input type="date" id="fx_' + esc(k) + '" value="' + today() + '">';
    } else if (/시각$/.test(k)) {
      input = '<input type="text" id="fx_' + esc(k) + '" value="' + today() + ' 09:00" placeholder="YYYY-MM-DD HH:MM">';
    } else {
      input = '<input type="text" id="fx_' + esc(k) + '" placeholder="' + esc(k) + '">';
    }
    return '<div class="f"><label>' + esc(k) + ' <i>*</i></label>' + input +
      (extra ? '<span class="hint">' + extra + '</span>' : '') + '</div>';
  }).join('');
  modal('「' + esc(def.n) + '」 필수 입력',
    note('k', 'i', '이 항목들은 <b>상태정의(v' + d.rv + ')에 적어 둔 필수 입력</b>입니다. ' +
      '채워지지 않으면 <span class="cd">changeStatus()</span>가 전이를 거절합니다 — 화면에서 막는 것이 아니라 <b>구조로 막습니다.</b>') +
    '<div class="fg" style="margin-top:14px">' + fields + '</div>' +
    (evNeed.length ? note('w', '!', '<b>필수 증빙: ' + esc(evNeed.join(' · ')) + '</b> — ' +
      '저장하면 함께 첨부됩니다 (모의 파일).') : ''),
    '<button class="b" data-a="mdX">취소</button>' +
    '<button class="b pri" data-a="fillSave" data-d="' + d.id + '" data-t="' + to + '">저장하고 「' + esc(def.n) + '」로 넘기기</button>',
    1);
};
A.fillSave = function (t) {
  var d = deal(t.getAttribute('data-d')), to = t.getAttribute('data-t');
  var vv = verOf(d.rv), def = vv.sdef.filter(function (x) { return x.c === to; })[0];
  var bad = [];
  (def.req || []).forEach(function (k) {
    var el = $('#fx_' + k.replace(/([^\w-])/g, '\\$1'));
    if (!el) return;
    var v = el.value;
    if (v === '' || v == null) { bad.push(k); return; }
    d.f[k] = (k === '실중량' || k === '최종금액' || k === '불순물공제') ? Number(v) : v;
  });
  if (bad.length) { toast('입력이 비어 있습니다', '<b>' + esc(bad.join(' · ')) + '</b>', 'a'); return; }
  (def.ev || []).forEach(function (x) {
    if (!d.ev.some(function (e) { return e.t === x; })) {
      attach(d, x, x.replace(/[^가-힣]/g, '') + '_' + d.id.slice(-4) + (x === '계근표' ? '.pdf' : '.jpg'), S.me.id);
    }
  });
  if (to === 'S09') {
    var c = calcAmount(d);
    d.f['최종금액'] = c.amt;
    d.snap = { rv:d.rv, rule:JSON.parse(JSON.stringify(c.rule)), px:d.px, apx:c.apx,
      netW:c.netW, grade:c.gradeCode, amt:c.amt, vat:c.vat, by:S.me.id, at:nowStamp(0), lines:c.lines };
  }
  var r = changeStatus(d, to, S.me.id, '', false);
  closeModal();
  if (!r.ok) { toast('상태를 넘길 수 없습니다', esc(r.why), 'a'); paint(); return; }
  paint(); renderRail();
  toast(d.id + ' — ' + stName(d.rv, to) + ' 로 넘겼습니다',
    '필수 입력' + ((def.ev || []).length ? '과 증빙' : '') + '을 확인한 뒤 상태와 이력을 한 묶음으로 저장했습니다.', 'o');
};

/* ── 5.8 정정 (덮어쓰지 않고 이력 추가) ─────────────────── */
A.fixOpen = function (t) {
  var d = deal(t.getAttribute('data-d')), k = t.getAttribute('data-k');
  var cur = d.f[k];
  var input = k === '판정등급'
    ? '<select id="fixV">' + selOpt(gradesOf(d.it), cur, function (g) { return { v:g.c, t:g.n }; }) + '</select>'
    : '<input type="' + (typeof cur === 'number' ? 'number' : 'text') + '" id="fixV" value="' + esc(cur) + '">';
  modal('정정 — ' + esc(k),
    note('w', '!', '<b>정정은 덮어쓰기가 아닙니다.</b> 원래 값도 이력에 남습니다. ' +
      '「계근 수치를 잘못 넣어서 고쳤다」가 기록으로 남아야 나중에 금액 다툼이 생겼을 때 무엇이 있었는지 확인할 수 있습니다.') +
    '<div class="fg" style="margin-top:14px">' +
      '<div class="f"><label>현재 값</label><input type="text" value="' + esc(cur) + '" readonly></div>' +
      '<div class="f"><label>정정할 값 <i>*</i></label>' + input + '</div>' +
      '<div class="f wide"><label>정정 사유 <i>*</i></label>' +
        '<input type="text" id="fixWhy" placeholder="예: 계근표 재확인 결과 수치 오기"></div>' +
    '</div>' +
    (d.snap ? note('o', '✓', '이 거래는 <b>금액이 확정</b>되어 스냅샷이 저장되어 있습니다. ' +
      '값을 정정해도 <b>확정된 금액은 자동으로 바뀌지 않습니다</b> — 금액을 다시 산출해야 하면 별도 확정 절차를 거칩니다.') : ''),
    '<button class="b" data-a="mdX">취소</button>' +
    '<button class="b act" data-a="fixSave" data-d="' + d.id + '" data-k="' + esc(k) + '">정정 이력 추가</button>');
};
A.fixSave = function (t) {
  var d = deal(t.getAttribute('data-d')), k = t.getAttribute('data-k');
  var v = $('#fixV').value, why = $('#fixWhy').value;
  if (v === '' || !why.trim()) { toast('값과 사유를 모두 입력해 주십시오', '정정은 사유 없이 처리되지 않습니다.', 'a'); return; }
  var old = d.f[k];
  correct(d, k, (k === '판정등급' ? grade(old).n : old),
    (k === '판정등급' ? grade(v).n : v), S.me.id, why);
  if (k === '실중량' || k === '불순물공제') d.f[k] = Number(v);
  closeModal(); paint();
  toast(k + ' 정정 완료', '<b>원래 값도 이력에 남았습니다.</b> 변경이력에서 「정정」 표시로 확인하실 수 있습니다.', 'w');
};

/* ── 5.9 증빙 첨부 (STS-H4 · OPS-10) ────────────────────── */
A.evAdd = function (t) {
  var d = deal(t.getAttribute('data-d')), ty = t.getAttribute('data-t');
  var ext = ty === '계근표' || ty === '검수자료' ? '.pdf' : '.jpg';
  attach(d, ty, ty.replace(/[^가-힣]/g, '') + '_' + d.id.slice(-4) + '_' + (d.ev.length + 1) + ext, S.me.id);
  paint();
  toast(ty + ' 모의 첨부', '<b>프로토타입용 모의 파일</b>을 거래·단계·종류와 함께 기록했습니다. ' +
    '현재 단계: <b>' + esc(stName(d.rv, d.st)) + '</b>', 'o');
};

/* ── 5.10 계근 · 검수 · 금액 확정 ───────────────────────── */
A.weighOpen = function (t) {
  var d = deal(t.getAttribute('data-d'));
  if (d.st === 'S06') { A.fillOpen({ getAttribute:function (k) { return k === 'data-d' ? d.id : 'S07'; } }); return; }
  A.fixOpen({ getAttribute:function (k) { return k === 'data-d' ? d.id : '실중량'; } });
};
A.inspOpen = function (t) {
  var d = deal(t.getAttribute('data-d'));
  if (d.st === 'S07') { A.fillOpen({ getAttribute:function (k) { return k === 'data-d' ? d.id : 'S08'; } }); return; }
  A.fixOpen({ getAttribute:function (k) { return k === 'data-d' ? d.id : '판정등급'; } });
};
A.settleFix = function (t) {
  var d = deal(t.getAttribute('data-d'));
  var c = calcAmount(d);
  modal('최종금액 확정 — ' + esc(d.id),
    calcTable(c.lines) +
    note('k', 'i', '<b>계산은 자동, 확정은 사람이 합니다.</b> 확정 버튼을 누른 시점의 계산 규칙을 ' +
      '<b>그대로 복제해 저장</b>합니다. 이후 단가나 규칙이 바뀌어도 이 거래의 금액은 변하지 않습니다.') +
    (weighDiff(d) && weighDiff(d).over ? note('w', '!', '<b>계근 오차가 허용 범위를 넘었습니다</b> (' +
      pc(weighDiff(d).rate, 2) + '). 확정 전에 계근표를 다시 확인해 주십시오.') : ''),
    '<button class="b" data-a="mdX">취소</button>' +
    '<button class="b pri" data-a="settleDo" data-d="' + d.id + '">' + won(c.amt) + ' 확정</button>', 1);
};
A.settleDo = function (t) {
  var d = deal(t.getAttribute('data-d'));
  var c = calcAmount(d);
  d.f['최종금액'] = c.amt;
  d.snap = { rv:d.rv, rule:JSON.parse(JSON.stringify(c.rule)), px:d.px, apx:c.apx,
    netW:c.netW, grade:c.gradeCode, amt:c.amt, vat:c.vat, by:S.me.id, at:nowStamp(0), lines:c.lines };
  var r = changeStatus(d, 'S09', S.me.id, '', false);
  closeModal();
  if (!r.ok) { toast('확정할 수 없습니다', esc(r.why), 'a'); paint(); return; }
  notify(d.sel, '금액확정', d.id, d.id + ' — 최종금액 ' + won(c.amt) + '이 확정되었습니다');
  notify(d.buy, '금액확정', d.id, d.id + ' — 최종금액 ' + won(c.amt) + '이 확정되었습니다');
  paint(); renderRail();
  toast(d.id + ' 최종금액 확정 — ' + won(c.amt),
    '적용 규칙을 <b>스냅샷으로 복제 저장</b>했습니다. 아래 「수분 공제율을 올려 봅니다」를 눌러 ' +
    '<b>이 금액이 바뀌지 않는지</b> 확인해 보십시오.', 'o');
};
A.calcOpen = function (t) {
  var d = deal(t.getAttribute('data-d'));
  var c = d.snap || calcAmount(d);
  modal('산출근거 — ' + esc(d.id) + (d.snap ? ' (확정 스냅샷 v' + d.snap.rv + ')' : ' (계산값)'),
    calcTable(c.lines) +
    (d.snap ? note('o', '✓', '확정자 <b>' + esc(actorName(d.snap.by)) + '</b> · ' + esc(d.snap.at) +
      '<br>이 표는 <b>확정 시점에 복제해 둔 규칙</b>으로 만든 것입니다. 지금 규칙이 달라도 이 값은 그대로입니다.')
      : note('w', '!', '아직 확정되지 않은 <b>계산값</b>입니다. 지금 규칙으로 계산했으므로 규칙이 바뀌면 값도 바뀝니다.')),
    '<button class="b" data-a="mdX">닫기</button>', 1);
};

/* ── 5.11 규칙·코드값 변경 (과거 금액 불변 증명) ────────── */
A.ruleShift = function () {
  var before = DEALS.filter(function (d) { return d.snap; }).map(function (d) { return d.snap.amt; });
  ver().rule.moisture = 0.02;
  ITEMS.forEach(function (i) { i.base = Math.round(i.base * 1.06); });
  var after = DEALS.filter(function (d) { return d.snap; }).map(function (d) { return d.snap.amt; });
  var same = before.join(',') === after.join(',');
  paint();
  toast('규칙을 바꿨습니다 — 수분 공제 0.8% → 2.0%, 기준 단가 +6%',
    '확정된 거래 <b>' + before.length + '건의 금액은 ' + (same ? '전부 그대로' : '바뀌었습니다') + '</b>' +
    (same ? ' ✓' : ' ✗') + '<br>미확정 거래는 새 규칙으로 다시 계산됩니다 — 목록의 「계산값」 열을 확인해 보십시오.',
    same ? 'o' : 'a');
};
A.ruleReset = function () {
  ver().rule.moisture = RULE_V1.moisture;
  ITEMS.forEach(function (i, k) {
    i.base = [11800, 2950, 6400, 2250, 2680, 3420, 19500][k];
  });
  paint();
  toast('규칙을 원복했습니다', '확정 거래의 금액은 <b>양쪽 어느 방향으로도 바뀌지 않습니다.</b>', 'k');
};
A.itemPx = function (t) {
  var i = ITEMS.filter(function (x) { return x.c === t.getAttribute('data-i'); })[0];
  if (!i) return;
  i.base = Number(t.value) || 0;
  toast(i.n + ' 기준 단가 변경 — ' + won(i.base),
    '<b>개발 없이 화면에서</b> 바꿨습니다. 확정된 거래의 금액은 스냅샷이므로 바뀌지 않습니다.', 'k');
};
A.grAdj = function (t) {
  var g = GRADES.filter(function (x) { return x.c === t.getAttribute('data-i'); })[0];
  if (!g) return;
  g.adj = (Number(t.value) || 0) / 100;
  paint();
  toast(g.n + ' 조정률 변경 — ' + pc(g.adj, 0), '미확정 거래의 계산값에 즉시 반영됩니다.', 'k');
};
A.itemToggle = function (t) {
  var i = ITEMS.filter(function (x) { return x.c === t.getAttribute('data-i'); })[0];
  i.act = i.act ? 0 : 1;
  paint();
  toast(i.n + (i.act ? ' 사용' : ' 비활성화'),
    i.act ? '선택 목록에 다시 나타납니다.' :
    '<b>삭제가 아니라 비활성화</b>입니다. 선택 목록에서는 사라지지만 <b>과거 물량·거래는 그대로 조회</b>됩니다.', 'w');
};
A.grToggle = function (t) {
  var g = GRADES.filter(function (x) { return x.c === t.getAttribute('data-i'); })[0];
  g.act = g.act ? 0 : 1;
  paint();
  toast(g.n + (g.act ? ' 사용' : ' 비활성화'), '사용 중인 등급은 삭제하지 않고 비활성화합니다.', 'w');
};

/* ── 5.12 설정 버전 (STS-H5) ────────────────────────────── */
A.verNew = function () {
  if (VERS.length >= 2) return;
  var old = ver();
  var sdef = old.sdef.slice();
  var at = stIdx(old.v, 'S06') + 1;   /* 도착 다음 */
  sdef.splice(at, 0, { c:'S06B', n:'하차완료', req:['하차시각'], ev:[], who:'OPS' });
  var tr = JSON.parse(JSON.stringify(old.tr));
  tr.S06 = { next:['S06B'], back:['S05'] };
  tr.S06B = { next:['S07'], back:['S06'] };
  VERS.forEach(function (v) { v.act = 0; });
  VERS.push({ v:old.v + 1, from:today(), by:S.me.nm + '(운영자)',
    memo:'「도착」과 「계근완료」 사이에 「하차완료」 추가 — 화면에서 생성',
    sdef:sdef, tr:tr, rule:JSON.parse(JSON.stringify(old.rule)), act:1 });
  paint(); renderRail();
  toast('설정 v' + (old.v + 1) + '을 만들었습니다 — 13단계',
    '<b>소스를 고치지 않았습니다.</b> 진행 중인 거래 ' +
    DEALS.filter(function (d) { return d.rv === old.v && d.st !== 'S12'; }).length +
    '건은 <b>v' + old.v + '을 계속 참조</b>하고, 새 버전은 <b>이후 거래에만</b> 적용됩니다.', 'o');
};
A.verTest = function () {
  var sale = LOTS.filter(function (l) { return l.st === '판매중'; })[0];
  if (!sale) { toast('판매중 물량이 없습니다', '거래시장에 물량이 있어야 시험 거래를 만들 수 있습니다.', 'a'); return; }
  var b = BIDS.filter(function (x) { return x.lot === sale.id && (x.st === '제안' || x.st === '검토중'); })[0];
  if (!b) { toast('수락할 제안이 없습니다', '대행 구매제안 입력에서 제안을 하나 넣어 주십시오.', 'a'); return; }
  A.bidOk({ getAttribute:function () { return b.id; } });
};
A.verReset = function () {
  VERS.length = 1; VERS[0].act = 1;
  VERS[0].rule.moisture = RULE_V1.moisture;
  paint(); renderRail();
  toast('설정을 초기화했습니다', 'v1(12단계)로 돌아갔습니다. <b>기존 거래의 참조 버전은 그대로</b>입니다.', 'k');
};

/* ── 5.13 필터·관심조건·알림 ────────────────────────────── */
A.fltQs = function (t) { S.qs = t.value; paint(); if ($('#fQs')) { $('#fQs').focus(); } };
A.fltIt = function (t) { S.flt.it = t.value; S.flt.gr = ''; paint(); };
A.flt   = function (t) { S.flt[t.getAttribute('data-k')] = t.value; paint(); };
A.fltClear = function () { S.qs = ''; S.flt = { it:'', gr:'', rg:'', min:'' }; paint();
  toast('조건을 해제했습니다', '', 'g'); };
A.watchSave = function () {
  var f = S.flt;
  if (!f.it && !f.gr && !f.rg && !f.min) {
    toast('저장할 조건이 없습니다', '품목·등급·지역·최소 수량 중 하나 이상을 고른 뒤 저장해 주십시오.', 'a');
    return;
  }
  var nm = [f.it ? item(f.it).n : '', f.gr ? grade(f.gr).n : '', f.rg, f.min ? nf(f.min) + 'kg 이상' : '']
    .filter(Boolean).join(' · ');
  WATCH.push({ id:'W' + (WATCH.length + 1), mem:S.me.id, it:f.it, gr:f.gr, rg:f.rg,
    min:Number(f.min) || 0, memo:nm });
  paint();
  toast('관심 조건을 저장했습니다 — ' + nm,
    '같은 조건의 물량이 새로 올라오면 <span class="cd">notify()</span>가 알림을 만듭니다. ' +
    '운영자의 대행 물량 등록에서도 같은 지점을 거칩니다.', 'o');
};
A.watchDel = function (t) {
  var id = t.getAttribute('data-i');
  for (var i = 0; i < WATCH.length; i++) if (WATCH[i].id === id) { WATCH.splice(i, 1); break; }
  paint();
  toast('관심 조건을 삭제했습니다', '', 'g');
};
A.notesRead = function () {
  NOTES.forEach(function (n) { if (S.role === 'OPS' || n.to === S.me.id) n.read = true; });
  paint(); renderRail();
  toast('모두 읽음 처리했습니다', '', 'g');
};

A.signupDemo = function () {
  toast('가입 신청 (모의)', '실제 구축 시 상태는 <b>승인대기</b>로 저장되고, 운영자가 「회원 승인」 화면에서 확인합니다. ' +
    '<b>승인 전에는 로그인해도 거래에 참여할 수 없습니다.</b>', 'k');
};

/* ── 5.14 물량 등록 (판매자) · 모바일 데모 ──────────────── */
A.nlItem = function (t) {
  var gs = gradesOf(t.value);
  $('#nlGr').innerHTML = selOpt(gs, gs[0] ? gs[0].c : '', function (g) { return { v:g.c, t:g.n }; });
  $('#nlH').textContent = '기준 단가 ' + nf(item(t.value).base) + '원/kg';
};
S.nlPhoto = 0;
A.nlPhoto = function () { S.nlPhoto++; $('#nlPhH').textContent = '첨부 ' + S.nlPhoto + '장'; };
A.nlSave = function () {
  var it = $('#nlIt').value, gr = $('#nlGr').value, wt = Number($('#nlWt').value),
      rg = $('#nlRg').value, px = Number($('#nlPx').value), out = $('#nlOut').value,
      memo = $('#nlMemo').value;
  var miss = [];
  if (!it) miss.push('품목'); if (!gr) miss.push('등급'); if (!wt) miss.push('예상중량');
  if (!rg) miss.push('지역'); if (!px) miss.push('희망가격'); if (!out) miss.push('출고 가능일');
  if (miss.length) { toast('필수 항목이 비어 있습니다', '<b>' + esc(miss.join(' · ')) + '</b>', 'a'); return; }
  S.seq.lot++;
  var id = 'L-' + pad(S.seq.lot, 4);
  LOTS.unshift({ id:id, sel:S.me.id, it:it, gr:gr, wt:wt, rg:rg, want:px, out:out,
    st:'승인대기', at:today(), ph:S.nlPhoto, by:null, memo:memo });
  OPS_USERS.forEach(function (u) { });
  notify('OPS', '물량신청', id, id + ' — 새 물량 등록 신청 (' + mem(S.me.id).co + ')');
  S.nlPhoto = 0;
  toast(id + ' 등록 신청 완료', '상태는 <b>승인대기</b>입니다. 운영자 확인 후 <b>판매중</b>으로 전환되어 거래시장에 노출됩니다.', 'o');
  go('sLots');
};
A.phoneStep = function (t) {
  var d = deal(t.getAttribute('data-d'));
  if (!d) return;
  if (d.st === 'S05') {
    d.f['도착시각'] = nowStamp(0);
    var r = changeStatus(d, 'S06', S.me.id, '현장 모바일에서 기록', false);
    paint();
    toast(r.ok ? d.id + ' 도착 기록' : '기록할 수 없습니다',
      r.ok ? '<b>현장에서 스마트폰으로</b> 기록했습니다. 도착시각 ' + esc(d.f['도착시각']) +
        ' · 변경자 <b>' + esc(S.me.nm) + '</b>가 이력에 남았습니다.' : esc(r.why),
      r.ok ? 'o' : 'a');
  } else {
    toast('이 거래는 ' + stName(d.rv, d.st) + ' 단계입니다',
      '현장 화면은 <b>지금 할 수 있는 일만</b> 큰 버튼으로 보여 줍니다.', 'w');
  }
};
A.phonePhoto = function () {
  var d = deal('D-2026-0039');
  if (!d) return;
  attach(d, '증빙사진', 'field_' + Date.now().toString().slice(-4) + '.jpg', S.me.id);
  paint();
  toast('현장 사진 첨부', '<b>거래·단계·종류와 함께</b> 기록됩니다. 목록용 축소 이미지가 생성됩니다.', 'o');
};

/* ══ 이벤트 배선 ═════════════════════════════════════════════ */
document.addEventListener('click', function (e) {
  var t = e.target.closest ? e.target.closest('[data-a]') : null;
  if (!t) return;
  if (t.matches && t.matches('input,select,textarea')) return;
  var fn = A[t.getAttribute('data-a')];
  if (fn) { e.preventDefault(); fn(t); }
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.id === 'roleSel') {
    var u = { OPS:'OP1', SELLER:'M01', BUYER:'M06' }[t.value];
    A.login({ getAttribute:function (k) { return k === 'data-r' ? t.value : u; } });
    return;
  }
  if (!t.getAttribute || !t.getAttribute('data-a')) return;
  var fn = A[t.getAttribute('data-a')];
  if (fn) fn(t);
});
document.addEventListener('input', function (e) {
  var t = e.target;
  if (t.id === 'fQs') { S.qs = t.value; clearTimeout(S.qsT); S.qsT = setTimeout(function () { paint(); }, 260); return; }
  if (t.id === 'qWt' || t.id === 'qPx' || t.id === 'qMemo') A.qTick();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !$('#ov').hidden) closeModal();
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('lotc')) e.target.click();
});
$('#ov').addEventListener('click', function (e) { if (e.target.id === 'ov') closeModal(); });
window.addEventListener('popstate', function () { boot(false); });

function boot(first) {
  var h = (location.hash || '').replace(/^#\/?/, '');
  if (!S.role) {
    if (h && h !== 'login') {
      history.replaceState(null, '', '#/login');
    }
    renderLogin();
    return;
  }
  if (!h || h === 'login') { A.logout(); return; }
  renderShell(); go(h, false);
}
boot(true);

})();
