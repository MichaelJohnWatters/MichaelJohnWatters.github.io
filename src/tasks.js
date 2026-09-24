// Garage task list — the whiteboard achievements. Tiny external store:
// complete(id) from anywhere; the whiteboard subscribes via useTasks().
// Progress persists in localStorage.
import { useSyncExternalStore } from 'react'

export const TASKS = [
  { id: 'lights', label: 'hit a light switch' },
  { id: 'stepaway', label: 'step away from the desk' },
  { id: 'underlift', label: 'walk under the MX-5' },
  { id: 'terminal', label: 'ask the terminal something' },
  { id: 'search', label: 'noogle something' },
  { id: 'cv', label: 'grab the CV' },
  { id: 'tv', label: 'watch some telly' },
  { id: 'garage', label: 'open the garage door' },
  { id: 'drive', label: 'take the civic for a spin' },
]

const KEY = 'garage-tasks-v1'
let state = {}
try {
  state = JSON.parse(localStorage.getItem(KEY)) || {}
} catch {
  state = {}
}
const subs = new Set()
const completeSubs = new Set()

// Fires with the task object whenever one completes (for the toast).
export function onComplete(cb) {
  completeSubs.add(cb)
  return () => completeSubs.delete(cb)
}

export function complete(id) {
  if (state[id]) return
  state = { ...state, [id]: true }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
  // success ding (lazy import avoids cycles)
  import('./sfx').then((m) => m.taskDing?.()).catch(() => {})
  const task = TASKS.find((t) => t.id === id)
  completeSubs.forEach((f) => f(task))
  subs.forEach((f) => f())
}

// The whiteboard eraser: wipe everything clean.
export function resetTasks() {
  state = {}
  try {
    localStorage.removeItem(KEY)
  } catch {}
  subs.forEach((f) => f())
}

export function useTasks() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => state,
  )
}
