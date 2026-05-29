// client/src/engine/compiler.test.ts — run with `bun test`
import { describe, expect, test } from 'bun:test'
import type { ModuleDef, ModuleInstance, ModuleEdge, ModuleType } from '@shared/index'
import { compile, compileChains, compileSession, formatValue, interpolate } from './compiler'

// ── fixtures ──────────────────────────────────────────────────────────────────
function def(partial: Partial<ModuleDef> & { id: string; type: ModuleType; strudelCode: string }): ModuleDef {
  return {
    name: partial.id,
    author: 'test',
    version: '1.0.0',
    tags: [],
    description: '',
    params: [],
    visual: { panelColor: '#000', accentColor: '#fff', knobStyle: 'aluminum', panelWidthHP: 8 },
    ports: { inputs: [], outputs: [] },
    createdAt: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

function inst(
  partial: Partial<ModuleInstance> & { instanceId: string; defId: string },
): ModuleInstance {
  return {
    userId: 'u1',
    paramValues: {},
    active: true,
    position: 0,
    generatedCode: '',
    nodePosition: { x: 0, y: 0 },
    ...partial,
  }
}

function edge(source: string, target: string): ModuleEdge {
  return {
    id: `${source}->${target}`,
    sourceInstanceId: source,
    sourcePortId: 'out',
    targetInstanceId: target,
    targetPortId: 'in',
  }
}

// ── formatValue ─────────────────────────────────────────────────────────────
describe('formatValue', () => {
  test('numbers', () => {
    expect(formatValue(800)).toBe('800')
    expect(formatValue(0.6)).toBe('0.6')
    expect(formatValue(0.1 + 0.2)).toBe('0.3') // float noise trimmed
  })
  test('booleans', () => {
    expect(formatValue(true)).toBe('true')
    expect(formatValue(false)).toBe('false')
  })
  test('strings pass through raw', () => {
    expect(formatValue('<c3 eb3 g3>')).toBe('<c3 eb3 g3>')
  })
  test('steps arrays become mini-notation with rests', () => {
    expect(formatValue(['0', '', '3', '0', '7', '', '', '0'])).toBe('0 ~ 3 0 7 ~ ~ 0')
    expect(formatValue([])).toBe('')
  })
})

// ── interpolate ───────────────────────────────────────────────────────────────
describe('interpolate', () => {
  test('replaces simple placeholders', () => {
    expect(interpolate('cutoff({{c}})', { c: 800 })).toBe('cutoff(800)')
  })
  test('supports whitespace inside braces', () => {
    expect(interpolate('gain({{  g  }})', { g: 0.9 })).toBe('gain(0.9)')
  })
  test('ternary on boolean param', () => {
    expect(interpolate('.coarse({{vinyl ? 8 : 1}})', { vinyl: true })).toBe('.coarse(8)')
    expect(interpolate('.coarse({{vinyl ? 8 : 1}})', { vinyl: false })).toBe('.coarse(1)')
  })
  test('unknown placeholder leaves a marker, not broken syntax', () => {
    expect(interpolate('x({{nope}})', {})).toBe('x(/*?nope*/)')
  })
})

// ── compile (single module, with defaults) ─────────────────────────────────────
describe('compile', () => {
  const acid = def({
    id: 'acid',
    type: 'instrument',
    strudelCode: 'note("{{steps}}").s("sawtooth").cutoff({{cutoff}}).resonance({{res}}).gain({{gain}})',
    params: [
      { id: 'steps', label: 'Steps', type: 'steps', default: ['0'], stepCount: 8 },
      { id: 'cutoff', label: 'Cutoff', type: 'knob', default: 500 },
      { id: 'res', label: 'Res', type: 'knob', default: 0.2 },
      { id: 'gain', label: 'Gain', type: 'knob', default: 0.8 },
    ],
  })

  test('interpolates provided values', () => {
    const out = compile(acid, {
      steps: ['0', '', '3', '0', '7', '', '', '0'],
      cutoff: 800,
      res: 0.6,
      gain: 0.9,
    })
    expect(out).toBe('note("0 ~ 3 0 7 ~ ~ 0").s("sawtooth").cutoff(800).resonance(0.6).gain(0.9)')
  })

  test('fills missing values from param defaults', () => {
    const out = compile(acid, { cutoff: 1200 })
    expect(out).toBe('note("0").s("sawtooth").cutoff(1200).resonance(0.2).gain(0.8)')
  })

  test('drum machine: select + struct pattern (onValue="1")', () => {
    const drum = def({
      id: 'drum',
      type: 'instrument',
      strudelCode: 's("{{machine}}").struct("{{pattern}}").speed({{tune}})',
      params: [
        { id: 'machine', label: 'Machine', type: 'select', options: ['808bd', '909'], default: '909' },
        { id: 'pattern', label: 'Pattern', type: 'steps', stepCount: 4, onValue: '1', default: ['1', '', '', ''] },
        { id: 'tune', label: 'Tune', type: 'knob', default: 1 },
      ],
    })
    expect(compile(drum, { machine: '808bd', pattern: ['1', '', '1', ''], tune: 1.5 })).toBe(
      's("808bd").struct("1 ~ 1 ~").speed(1.5)',
    )
  })
})

// ── effect bodies + edge chaining ──────────────────────────────────────────────
describe('compileChains / compileSession', () => {
  const acid = def({
    id: 'acid',
    type: 'instrument',
    strudelCode: 'note("0 ~ 3 0").s("sawtooth").cutoff({{cutoff}})',
    params: [{ id: 'cutoff', label: 'Cutoff', type: 'knob', default: 800 }],
  })
  const kick = def({ id: 'kick', type: 'instrument', strudelCode: 's("bd").euclid(3,8)' })
  const delay = def({
    id: 'delay',
    type: 'effect',
    strudelCode: '.delay({{wet}}).delaytime({{time}}).delayfeedback({{fb}})',
    params: [
      { id: 'wet', label: 'Wet', type: 'knob', default: 0.5 },
      { id: 'time', label: 'Time', type: 'knob', default: 0.4 },
      { id: 'fb', label: 'FB', type: 'knob', default: 0.5 },
    ],
  })
  const lofi = def({
    id: 'lofi',
    type: 'effect',
    strudelCode: '.cutoff({{cutoff}}).crush({{crush}})',
    params: [
      { id: 'cutoff', label: 'Cutoff', type: 'knob', default: 400 },
      { id: 'crush', label: 'Crush', type: 'knob', default: 6 },
    ],
  })
  const defs = new Map([acid, kick, delay, lofi].map((d) => [d.id, d]))

  test('standalone instrument, no edges', () => {
    const chains = compileChains([inst({ instanceId: 'a', defId: 'acid', paramValues: { cutoff: 800 } })], [], defs)
    expect(chains).toEqual(['note("0 ~ 3 0").s("sawtooth").cutoff(800)'])
  })

  test('instrument piped through two effects in chain order', () => {
    const instances = [
      inst({ instanceId: 'a', defId: 'acid', paramValues: { cutoff: 800 }, position: 0 }),
      inst({ instanceId: 'd', defId: 'delay', paramValues: { wet: 0.4, time: 0.4, fb: 0.5 } }),
      inst({ instanceId: 'l', defId: 'lofi', paramValues: { cutoff: 400, crush: 6 } }),
    ]
    const edges = [edge('a', 'd'), edge('d', 'l')]
    const chains = compileChains(instances, edges, defs)
    expect(chains).toEqual([
      'note("0 ~ 3 0").s("sawtooth").cutoff(800)\n' +
        '  .delay(0.4).delaytime(0.4).delayfeedback(0.5)\n' +
        '  .cutoff(400).crush(6)',
    ])
  })

  test('inactive instrument is muted (dropped)', () => {
    const chains = compileChains(
      [inst({ instanceId: 'a', defId: 'acid', active: false })],
      [],
      defs,
    )
    expect(chains).toEqual([])
  })

  test('inactive effect in chain is skipped but chain continues', () => {
    const instances = [
      inst({ instanceId: 'a', defId: 'acid', paramValues: { cutoff: 800 } }),
      inst({ instanceId: 'd', defId: 'delay', active: false }),
      inst({ instanceId: 'l', defId: 'lofi', paramValues: { cutoff: 400, crush: 6 } }),
    ]
    const chains = compileChains(instances, [edge('a', 'd'), edge('d', 'l')], defs)
    expect(chains).toEqual([
      'note("0 ~ 3 0").s("sawtooth").cutoff(800)\n  .cutoff(400).crush(6)',
    ])
  })

  test('effects are never emitted as standalone roots', () => {
    const chains = compileChains([inst({ instanceId: 'd', defId: 'delay' })], [], defs)
    expect(chains).toEqual([])
  })

  test('roots ordered by position', () => {
    const instances = [
      inst({ instanceId: 'k', defId: 'kick', position: 1 }),
      inst({ instanceId: 'a', defId: 'acid', paramValues: { cutoff: 800 }, position: 0 }),
    ]
    const chains = compileChains(instances, [], defs)
    expect(chains[0]).toContain('sawtooth')
    expect(chains[1]).toContain('bd')
  })

  test('cycle is guarded (no infinite loop)', () => {
    const instances = [
      inst({ instanceId: 'a', defId: 'acid', paramValues: { cutoff: 800 } }),
      inst({ instanceId: 'd', defId: 'delay' }),
    ]
    // a -> d -> a (illegal but must not hang)
    const chains = compileChains(instances, [edge('a', 'd'), edge('d', 'a')], defs)
    expect(chains.length).toBe(1)
  })

  test('compileSession wraps in stack().cpm()', () => {
    const instances = [
      inst({ instanceId: 'a', defId: 'acid', paramValues: { cutoff: 800 }, position: 0 }),
      inst({ instanceId: 'k', defId: 'kick', position: 1 }),
    ]
    const out = compileSession(instances, [], defs, 130)
    expect(out).toBe(
      'stack(\n' +
        '  note("0 ~ 3 0").s("sawtooth").cutoff(800),\n' +
        '  s("bd").euclid(3,8)\n' +
        ').cpm(130/4)',
    )
  })

  test('empty session compiles to silence', () => {
    expect(compileSession([], [], defs, 120)).toBe('silence')
  })
})
