import { describe, expect, it } from 'vitest'
import { SPINE_STATUS_RIBBON, spineStatusRibbonColor } from './spineStatus'

describe('spine status ribbon', () => {
  it('maps each reading status to the specified ribbon color', () => {
    expect(spineStatusRibbonColor('Want to Read')).toBe('#8a8178')
    expect(spineStatusRibbonColor('Reading')).toBe('#d4af37')
    expect(spineStatusRibbonColor('Paused')).toBe('#64748b')
    expect(spineStatusRibbonColor('Finished')).toBe('#3d8b57')
    expect(spineStatusRibbonColor('Did Not Finish')).toBe('#b7410e')
  })

  it('falls back to the muted Want to Read ribbon for unknown status', () => {
    expect(spineStatusRibbonColor(undefined)).toBe(SPINE_STATUS_RIBBON['Want to Read'])
    expect(spineStatusRibbonColor('')).toBe(SPINE_STATUS_RIBBON['Want to Read'])
    expect(spineStatusRibbonColor('Unknown')).toBe(SPINE_STATUS_RIBBON['Want to Read'])
  })
})
