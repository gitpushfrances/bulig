// A short side-to-side shake for a field or form that has an error. Skipped under reduced motion,
// and where the browser can't animate (old WebViews, tests). Fields also shake on their own when
// they turn invalid (Page.module.css, .field); this one is for "same error again" and form-level errors.
const KEYFRAMES: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px)' },
  { transform: 'translateX(5px)' },
  { transform: 'translateX(-3px)' },
  { transform: 'translateX(2px)' },
  { transform: 'translateX(0)' },
]

export function shake(el: Element | null | undefined) {
  if (!el || typeof el.animate !== 'function') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  el.animate(KEYFRAMES, { duration: 360, easing: 'ease-in-out' })
}

// Shakes every invalid field inside a form, after React has drawn the errors.
export function shakeInvalid(form: HTMLElement | null, fieldSelector: string) {
  requestAnimationFrame(() =>
    form?.querySelectorAll('[aria-invalid="true"]').forEach((input) => shake(input.closest(fieldSelector) ?? input)),
  )
}
