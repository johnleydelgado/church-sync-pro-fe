/**
 * Work the person would lose by closing the tab or signing out: saves still on their way, and
 * edits a page hasn't sent yet (waiting for its auto-save delay, or left behind by a failed
 * save). Module level, so it outlives the page that started a save: leaving the Mapping page
 * doesn't stop the close-tab question while its last bank or fund save is still on its way.
 */

/** A page's edits that haven't reached the server yet. */
export interface UnsentEdits {
  hasUnsent: () => boolean
  /** Send them now (signing out). */
  flush: () => void
}

let savesOnTheirWay = 0
const whenAllSettled = new Set<() => void>()
const pages = new Set<UnsentEdits>()
let leavingOnPurpose = false

/** Counts `save` until it settles, and returns it. */
export const trackSave = <T>(save: Promise<T>): Promise<T> => {
  savesOnTheirWay += 1
  const settled = () => {
    savesOnTheirWay -= 1
    if (savesOnTheirWay === 0) whenAllSettled.forEach((notify) => notify())
  }
  save.then(settled, settled)
  return save
}

/** For as long as a page is open; returns the call that removes it. */
export const registerUnsentEdits = (page: UnsentEdits) => {
  pages.add(page)
  return () => {
    pages.delete(page)
  }
}

export const hasSavesOnTheirWay = () => savesOnTheirWay > 0

export const hasUnsavedWork = () =>
  savesOnTheirWay > 0 || Array.from(pages).some((page) => page.hasUnsent())

/** Every open page sends what it hasn't sent yet. */
export const flushUnsentEdits = () => pages.forEach((page) => page.flush())

/** True once no save is on its way, or false if some still are after `timeoutMs`. */
export const savesSettled = (timeoutMs: number): Promise<boolean> =>
  new Promise((resolve) => {
    if (savesOnTheirWay === 0) {
      resolve(true)
      return
    }
    const finish = (allSettled: boolean) => {
      clearTimeout(timer)
      whenAllSettled.delete(onSettled)
      resolve(allSettled)
    }
    const onSettled = () => finish(true)
    const timer = setTimeout(() => finish(false), timeoutMs)
    whenAllSettled.add(onSettled)
  })

/** The page is about to unload on purpose (signing out): don't ask "Leave site?". */
export const leaveWithoutAsking = () => {
  leavingOnPurpose = true
}

// Closing or reloading the tab with unsaved work: ask first.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (leavingOnPurpose || !hasUnsavedWork()) return
    e.preventDefault()
    e.returnValue = ''
  })
}
