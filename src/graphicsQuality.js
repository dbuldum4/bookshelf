export const GRAPHICS_QUALITIES = ['low', 'medium', 'high', 'ultra']
export const DEFAULT_GRAPHICS_QUALITY = 'medium'
export const GRAPHICS_QUALITY_STORAGE_KEY = 'bookshelf-graphics-quality'

export const GRAPHICS_PRESETS = {
  low: {
    dpr: [1, 1],
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    contactShadows: false,
    contactShadowOpacity: 0.4,
    contactShadowBlur: 1.5,
    environment: false,
    // Deep-space star shells
    starNearCount: 400,
    starFarCount: 900,
    // Nebula backdrop
    nebulaLayerCount: 1,
    nebulaTextureSize: 256,
    nebulaBlobCount: 12,
    nebulaParticleCount: 2500,
    // Pixelated spiral galaxy
    galaxyCount: 2800,
    galaxyDustCount: 500,
    // Realistic galaxy layers
    realisticCore: 1000,
    realisticArms: 4500,
    realisticHalo: 1400,
    realisticDust: 800,
    realisticFar: 1200,
  },
  medium: {
    dpr: [1, 1.5],
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    contactShadows: true,
    contactShadowOpacity: 0.5,
    contactShadowBlur: 2,
    environment: true,
    starNearCount: 1000,
    starFarCount: 2600,
    nebulaLayerCount: 2,
    nebulaTextureSize: 512,
    nebulaBlobCount: 22,
    nebulaParticleCount: 7000,
    galaxyCount: 6500,
    galaxyDustCount: 1400,
    realisticCore: 2400,
    realisticArms: 10000,
    realisticHalo: 3200,
    realisticDust: 2100,
    realisticFar: 2800,
  },
  high: {
    dpr: [1, 2],
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    contactShadows: true,
    contactShadowOpacity: 0.6,
    contactShadowBlur: 2.5,
    environment: true,
    starNearCount: 1800,
    starFarCount: 5200,
    nebulaLayerCount: 3,
    nebulaTextureSize: 1024,
    nebulaBlobCount: 34,
    nebulaParticleCount: 15000,
    galaxyCount: 11000,
    galaxyDustCount: 2600,
    realisticCore: 4200,
    realisticArms: 19000,
    realisticHalo: 6500,
    realisticDust: 4200,
    realisticFar: 5000,
  },
  // Max detail: denser stars/galaxy, sharper shadows, higher pixel ratio.
  // Expect a meaningful GPU cost vs high — intended for powerful machines.
  ultra: {
    dpr: [1, 3],
    antialias: true,
    shadows: true,
    shadowMapSize: 4096,
    contactShadows: true,
    contactShadowOpacity: 0.72,
    contactShadowBlur: 3.2,
    environment: true,
    starNearCount: 3600,
    starFarCount: 10500,
    nebulaLayerCount: 4,
    nebulaTextureSize: 2048,
    nebulaBlobCount: 56,
    nebulaParticleCount: 30000,
    galaxyCount: 22000,
    galaxyDustCount: 5200,
    realisticCore: 8500,
    realisticArms: 38000,
    realisticHalo: 13000,
    realisticDust: 8500,
    realisticFar: 10000,
  },
}

export function isGraphicsQuality(value) {
  return GRAPHICS_QUALITIES.includes(value)
}

export function getGraphicsPreset(quality) {
  return GRAPHICS_PRESETS[isGraphicsQuality(quality) ? quality : DEFAULT_GRAPHICS_QUALITY]
}

export function loadGraphicsQuality() {
  if (typeof window === 'undefined') return DEFAULT_GRAPHICS_QUALITY
  try {
    const value = window.localStorage.getItem(GRAPHICS_QUALITY_STORAGE_KEY)
    if (isGraphicsQuality(value)) return value
  } catch {
    // Quota errors, private mode, or disabled storage — use default.
  }
  return DEFAULT_GRAPHICS_QUALITY
}

export function saveGraphicsQuality(quality) {
  if (typeof window === 'undefined' || !isGraphicsQuality(quality)) return false
  try {
    window.localStorage.setItem(GRAPHICS_QUALITY_STORAGE_KEY, quality)
    return true
  } catch {
    return false
  }
}
