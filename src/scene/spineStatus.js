/** Top-spine ribbon fill by reading status. */
export const SPINE_STATUS_RIBBON = {
  'Want to Read': '#8a8178',
  Reading: '#d4af37',
  Paused: '#64748b',
  Finished: '#3d8b57',
  'Did Not Finish': '#b7410e',
}

export function spineStatusRibbonColor(status) {
  return SPINE_STATUS_RIBBON[status] || SPINE_STATUS_RIBBON['Want to Read']
}
