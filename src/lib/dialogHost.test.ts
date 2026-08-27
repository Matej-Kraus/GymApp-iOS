import {
  askChoice,
  askConfirm,
  registerDialogHost,
  type DialogRequest,
} from './dialogHost'

/** Falešný host = to, co v appce dělá ConfirmProvider. */
function fakeHost() {
  const seen: DialogRequest<unknown>[] = []
  let resolve: ((value: unknown) => void) | null = null
  const host = (req: DialogRequest<unknown>, done: (value: unknown) => void) => {
    seen.push(req)
    resolve = done
  }
  return {
    host,
    seen,
    /** Simuluje ťuknutí uživatele na tlačítko s danou hodnotou. */
    answer(value: unknown) {
      const r = resolve
      resolve = null
      r?.(value)
    },
  }
}

afterEach(() => registerDialogHost(null))

describe('askChoice', () => {
  it('předá požadavek hostu a vrátí, co uživatel vybral', async () => {
    const h = fakeHost()
    registerDialogHost(h.host)

    const promise = askChoice({
      title: 'Leave this session?',
      options: [
        { label: 'Stay', value: 'stay', style: 'cancel' },
        { label: 'Leave and keep', value: 'keep' },
        { label: 'Discard', value: 'discard', style: 'destructive' },
      ],
    })

    expect(h.seen).toHaveLength(1)
    expect(h.seen[0].options).toHaveLength(3) // tři tlačítka window.confirm neumí
    h.answer('keep')
    await expect(promise).resolves.toBe('keep')
  })

  it('zavření bez volby → null', async () => {
    const h = fakeHost()
    registerDialogHost(h.host)
    const promise = askChoice({
      title: 'Delete split?',
      options: [{ label: 'Cancel', value: 'no', style: 'cancel' }],
    })
    h.answer(null)
    await expect(promise).resolves.toBeNull()
  })

  it('druhý dotaz počká, než se vyřídí první (nesmí zmizet)', async () => {
    const h = fakeHost()
    registerDialogHost(h.host)

    const first = askChoice({ title: 'First', options: [{ label: 'OK', value: 1 }] })
    const second = askChoice({ title: 'Second', options: [{ label: 'OK', value: 2 }] })

    expect(h.seen.map((r) => r.title)).toEqual(['First'])
    h.answer(1)
    await expect(first).resolves.toBe(1)

    // Až teď se druhý zobrazí.
    await Promise.resolve()
    expect(h.seen.map((r) => r.title)).toEqual(['First', 'Second'])
    h.answer(2)
    await expect(second).resolves.toBe(2)
  })

  it('bez registrovaného hosta nespadne a vrátí null', async () => {
    await expect(
      askChoice({ title: 'Nikdo neposlouchá', options: [{ label: 'OK', value: 'x' }] }),
    ).resolves.toBeNull()
  })
})

describe('askConfirm', () => {
  it('potvrzení → true', async () => {
    const h = fakeHost()
    registerDialogHost(h.host)
    const promise = askConfirm({ title: 'Delete ALL data?', confirmLabel: 'Delete everything' })
    h.answer(true)
    await expect(promise).resolves.toBe(true)
  })

  it('zrušení → false, nikdy null', async () => {
    const h = fakeHost()
    registerDialogHost(h.host)
    const promise = askConfirm({ title: 'Delete split?' })
    h.answer(null)
    await expect(promise).resolves.toBe(false)
  })

  it('destruktivní potvrzení dostane vlastní styl, zrušení styl cancel', async () => {
    const h = fakeHost()
    registerDialogHost(h.host)
    void askConfirm({ title: 'Delete split?', confirmLabel: 'Delete', destructive: true })
    const [cancel, confirm] = h.seen[0].options
    expect(cancel.style).toBe('cancel')
    expect(confirm.style).toBe('destructive')
    expect(confirm.label).toBe('Delete')
    h.answer(null)
  })

  it('výchozí popisky, když se nezadají', async () => {
    const h = fakeHost()
    registerDialogHost(h.host)
    void askConfirm({ title: 'Something?' })
    expect(h.seen[0].options.map((o) => o.label)).toEqual(['Cancel', 'OK'])
    h.answer(null)
  })
})
