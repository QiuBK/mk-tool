import type { ServiceResponse, ColorResult } from '../types'

function createSuccess<T>(data: T): ServiceResponse<T> {
  return { success: true, data, timestamp: Date.now() }
}

function createError(code: string, message: string, details?: unknown): ServiceResponse<never> {
  return { success: false, error: { code, message, details }, timestamp: Date.now() }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(full.substring(0, 2), 16), parseInt(full.substring(2, 4), 16), parseInt(full.substring(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100, ln = l / 100
  if (sn === 0) { const v = Math.round(ln * 255); return [v, v, v] }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q
  const hn = h / 360
  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  ]
}

export function colorConvert(input: string, fromFormat: 'hex' | 'rgb' | 'hsl'): ServiceResponse<ColorResult> {
  try {
    let r: number, g: number, b: number

    if (fromFormat === 'hex') {
      const match = input.match(/^#?([0-9a-fA-F]{3,6})$/)
      if (!match) return createError('INVALID_COLOR_FORMAT', '无效的HEX颜色格式', { format: 'hex' })
      ;[r, g, b] = hexToRgb(input)
    } else if (fromFormat === 'rgb') {
      const match = input.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
      if (!match) return createError('INVALID_COLOR_FORMAT', '无效的RGB颜色格式', { format: 'rgb' })
      r = parseInt(match[1]); g = parseInt(match[2]); b = parseInt(match[3])
    } else {
      const match = input.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/)
      if (!match) return createError('INVALID_COLOR_FORMAT', '无效的HSL颜色格式', { format: 'hsl' })
      ;[r, g, b] = hslToRgb(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]))
    }

    const hex = rgbToHex(r, g, b)
    const [h, s, l] = rgbToHsl(r, g, b)

    return createSuccess<ColorResult>({
      hex: hex.toUpperCase(),
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: `hsl(${h}, ${s}%, ${l}%)`,
      preview: hex,
    })
  } catch {
    return createError('INVALID_COLOR_FORMAT', '无效的颜色格式')
  }
}
