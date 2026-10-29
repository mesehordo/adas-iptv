// A Főoldal egy képernyőn (minden elrendezésben, asztalon és fekvő kijelzőn): a kiemelt borító a kijelző
// magasságához igazodik (layouts.css – body.home-fit), és ami ezután sem fér ki, az nem lóg le: előbb a
// csatornasorok tűnnek el alulról (a TV oldalon megvannak), utána a többi blokk alulról – az első mindig marad.
// A blokkok tartalma később töltődik be (időjárás, hírek, műsor), ezért méretváltozáskor újra illeszt.

// (az elrendezések Főoldalának blokkjai, a dokumentum sorrendjében – elöl a fő rész: kiemelt borító, csempefal, fókuszsor)
const BLOCKS = '#view > .lay-hero, #view > .wall, #view > .fx, #view > .shelf, #view > .cs, .home-rows > *, .shelf-rest, .md-home > *, .uni-home > *:not(.page-head)';
// (az elrendezés lényege – pl. a Csempék témakör-csempéi –: csak a többi után tűnik el)
const KEEP = '.coll-tiles';
const narrowPortrait = () => !!window.matchMedia?.('(max-width: 700px) and (orientation: portrait)').matches;
const over = () => document.scrollingElement.scrollHeight > window.innerHeight + 2;

let ro = null;
let busy = false;
let view = null;
// (a blokkok illesztés utáni magassága: a saját elrejtésünk ne indítson újabb illesztést)
let sizes = new WeakMap();

function fit() {
  if (!view || busy || document.body.dataset.route !== 'home' || !document.body.classList.contains('home-fit')) return;
  busy = true;
  try {
    view.querySelectorAll('.fit-hide').forEach((el) => el.classList.remove('fit-hide'));
    view.classList.remove('fit-clip');
    if (!over()) return;
    const blocks = [...view.querySelectorAll(BLOCKS)].filter((el) => el.offsetHeight > 0);
    if (!blocks.length) return void view.classList.add('fit-clip');
    const rest = blocks.slice(1);
    // (előbb a csatornasorok alulról, aztán a többi blokk alulról)
    const row = (el) => el.matches('.row');
    const keep = (el) => el.matches(KEEP);
    const order = [...rest.filter(row).reverse(), ...rest.filter((el) => !row(el) && !keep(el)).reverse(), ...rest.filter(keep).reverse()];
    for (const el of order) {
      if (!over()) break;
      el.classList.add('fit-hide');
    }
    // (az első blokk egymagában is magasabb: a nézet a képernyő aljánál véget ér)
    if (over()) view.classList.add('fit-clip');
  } finally {
    sizes = new WeakMap([...view.querySelectorAll(BLOCKS)].map((el) => [el, el.offsetHeight]));
    busy = false;
  }
}

let raf = 0;
const later = () => {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => requestAnimationFrame(fit));
};

/** Az útvonal kirajzolása után (app.js): a Főoldalon bekapcsol, máshol kikapcsol. */
export function fitHome(v, name) {
  const on = name === 'home' && !narrowPortrait();
  document.body.classList.toggle('home-fit', on);
  if (!on) {
    ro?.disconnect();
    v.querySelectorAll('.fit-hide').forEach((el) => el.classList.remove('fit-hide'));
    v.classList.remove('fit-clip');
    return;
  }
  view = v;
  ro ||= new ResizeObserver((entries) => !busy && entries.some((e) => e.target.offsetHeight !== sizes.get(e.target)) && later());
  ro.disconnect();
  // (a blokkok magassága változik – később betöltődő tartalom –, nem a nézeté: azokat figyeljük)
  for (const el of v.querySelectorAll(BLOCKS)) ro.observe(el);
  later();
}
window.addEventListener('resize', () => {
  if (!view) return;
  const name = document.body.dataset.route;
  if ((name === 'home') !== document.body.classList.contains('home-fit') || narrowPortrait() === document.body.classList.contains('home-fit')) fitHome(view, name);
  else later();
});
