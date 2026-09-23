// True on coarse-pointer (touch-first) devices — phones and tablets.
export const IS_TOUCH =
  typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
