// Row action menus live inside scrolling table wrappers, which clip anything hanging below the last row.
// Used as a ref callback, this pins the open menu to the viewport next to its button instead.
const cleanups = new WeakMap<HTMLElement, () => void>();
let current: HTMLElement | null = null;

function place(menu: HTMLElement) {
  const anchor = menu.parentElement;
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const height = menu.offsetHeight;
  const below = rect.bottom + 4;
  const fitsBelow = below + height <= window.innerHeight - 8;
  const fitsAbove = rect.top - height - 4 >= 8;
  menu.style.position = 'fixed';
  menu.style.right = `${Math.max(8, viewportWidth - rect.right)}px`;
  menu.style.left = 'auto';
  menu.style.top = `${!fitsBelow && fitsAbove ? rect.top - height - 4 : below}px`;
  menu.style.marginTop = '0';
}

export function floatMenu(menu: HTMLElement | null) {
  if (!menu) {
    if (current) {
      cleanups.get(current)?.();
      cleanups.delete(current);
      current = null;
    }
    return;
  }
  place(menu);
  const update = () => place(menu);
  window.addEventListener('scroll', update, true);
  window.addEventListener('resize', update);
  cleanups.set(menu, () => {
    window.removeEventListener('scroll', update, true);
    window.removeEventListener('resize', update);
  });
  current = menu;
}
