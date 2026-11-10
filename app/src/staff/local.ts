import type { StaffStore } from './api.ts'
import type { Hotline, QueueItem, StaffArea, StaffUserDetail, SubmissionDetail } from './types.ts'

// Dev builds and tests only: made-up people and places, in memory, so the moderator screens can be
// tried without the server. Nothing here reaches the production bundle (api.ts drops it).

const G = 'ph-eastern-samar-guiuan'
const M = 'ph-eastern-samar-mercedes'
const P = 'ph-eastern-samar'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString()
}
function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10)
}

interface Db {
  subs: (QueueItem & {
    detail: Omit<SubmissionDetail, keyof QueueItem | 'sender'>
    senderRole: StaffUserDetail['role']
  })[]
  users: StaffUserDetail[]
  areas: StaffArea[]
  hotlines: Hotline[]
  places: number
}

function hotline(
  id: string,
  area: StaffArea,
  name: string,
  kind: Hotline['kind'],
  phones: string[],
  checkedDaysAgo: number,
): Hotline {
  const verifiedAt = daysAgo(checkedDaysAgo).slice(0, 10)
  return {
    id,
    country: 'PH',
    area: area.id,
    name,
    kind,
    phones,
    verifiedAt,
    source: 'Sample',
    sample: true,
    areaName: area.name,
    areaLevel: area.level ?? 'municipality',
    hidden: checkedDaysAgo > 180,
    hidesOn: addDays(verifiedAt, 181),
  }
}

function seed(): Db {
  const area = (id: string, name: string, level: string, parent: string | null, places: number): StaffArea => ({
    id,
    country: 'PH',
    name,
    region: 'Eastern Samar',
    level,
    parent,
    languages: ['en', 'war'],
    places,
    hotlines: 0,
    inUse: true,
  })
  const areas = [
    area(P, 'Eastern Samar', 'province', null, 0),
    area(G, 'Guiuan', 'municipality', P, 41),
    area(M, 'Mercedes', 'municipality', P, 36),
  ]
  const hotlines = [
    hotline('h-pdrrmo', areas[0], 'PDRRMO Eastern Samar', 'disaster', ['+639170001101'], 60),
    hotline('h-mdrrmo-g', areas[1], 'MDRRMO Guiuan', 'rescue', ['+639170001104', '+639980001105'], 190),
    hotline('h-bfp-g', areas[1], 'BFP Guiuan', 'fire', ['+639190001106'], 20),
    hotline('h-pnp-m', areas[2], 'PNP Mercedes', 'police', ['+639200001107'], 170),
  ]
  for (const a of areas) a.hotlines = hotlines.filter((h) => h.area === a.id).length
  const user = (
    id: string,
    name: string,
    role: StaffUserDetail['role'],
    email: string,
    sent: number,
    staff = false,
  ): StaffUserDetail => ({
    id,
    name,
    role,
    email,
    createdAt: '2026-10-30',
    sent,
    approved: Math.floor(sent / 2),
    photoUrl: null,
    canChangeRole: !staff,
    canRemovePhoto: true,
  })
  const users = [
    user('usr_juan', 'Juan Dela Cruz', 'contributor', 'ju…@gmail.com', 7),
    user('usr_maria', 'Maria Santos', 'user', 'ma…@yahoo.com', 2),
    {
      ...user('usr_leo', 'Leo Pacaña', 'user', 'le…@gmail.com', 1),
      scoutRequest: { area: 'Surok, Guiuan', travel: ['tricycle', 'motorcycle'], why: 'Tricycle driver, Guiuan to Mercedes every day.', createdAt: daysAgo(2) },
    },
    user('usr_mod', 'Test moderator', 'moderator', 'mo…@bulig.com', 1, true),
  ]
  const sub = (
    id: string,
    name: string,
    reason: QueueItem['reason'],
    sender: StaffUserDetail,
    ageDays: number,
    fields: SubmissionDetail['fields'],
    photos = 1,
  ): Db['subs'][number] => ({
    id,
    recordType: 'service',
    recordId: reason === 'new_place' ? null : `ph-sample-${id}`,
    recordName: name,
    reason,
    status: 'pending',
    area: G,
    sender: { id: sender.id, name: sender.name },
    senderRole: sender.role,
    photoCount: photos,
    createdAt: daysAgo(ageDays),
    canReview: sender.role !== 'moderator',
    detail: {
      seenAt: daysAgo(ageDays).slice(0, 10),
      note: reason === 'number_not_working' ? 'Rang 3 times, no answer.' : null,
      fields,
      photos: [],
      reviewNote: null,
    },
  })
  const NEW = (v: unknown) => ({ current: null, proposed: v })
  const subs = [
    sub(
      'sub_1',
      'Aling Nena Vulcanizing',
      'new_place',
      users[0],
      3,
      [
        { key: 'name', ...NEW('Aling Nena Vulcanizing') },
        { key: 'category', ...NEW('tire_repair') },
        { key: 'area', ...NEW(G) },
        { key: 'landmark', ...NEW('Beside the Petron, blue gate') },
        { key: 'weeklyHours', ...NEW({ mon: [['06:00', '20:00']] }) },
        { key: 'location', ...NEW({ lat: 11.0351, lng: 125.7222 }) },
      ],
      2,
    ),
    sub('sub_2', 'Samar Fuel Station', 'changed', users[1], 1, [
      {
        key: 'prices',
        current: [{ item: 'diesel', amount: 70 }],
        proposed: [{ item: 'diesel', amount: 71.5 }],
      },
    ]),
    sub('sub_3', 'Abenoja Motor Works', 'number_not_working', users[2], 0.8, [], 0),
    sub('sub_4', 'Mercedes Bakeshop', 'new_place', users[3], 0.1, [{ key: 'name', ...NEW('Mercedes Bakeshop') }]),
  ]
  return { subs, users, areas, hotlines, places: 77 }
}

// Seeded on first use, so the production build (which never calls it) drops the whole sample.
let seeded: Db | null = null
const db = (): Db => (seeded ??= seed())

// Tests start from the same sample each time (test/setup.ts).
export function resetLocalStaff(): void {
  seeded = null
}

const ok = <T>(value: T) => ({ ok: true as const, value })
const fail = (message: string) => ({ ok: false as const, message })
const clone = <T>(v: T): T => structuredClone(v)

function queueItem(s: Db['subs'][number]): QueueItem {
  const { id, recordType, recordId, recordName, reason, status, area, sender, photoCount, createdAt, canReview } = s
  return clone({ id, recordType, recordId, recordName, reason, status, area, sender, photoCount, createdAt, canReview })
}

function settle(id: string, status: QueueItem['status']) {
  const s = db().subs.find((x) => x.id === id)
  if (!s) return fail('This is gone. Someone may have removed it.')
  if (s.status !== 'pending') return fail('Someone already reviewed this.')
  if (!s.canReview) return fail("You can't review your own update.")
  s.status = status
  s.canReview = false
  return ok(undefined)
}

export const localStaff: StaffStore = {
  async summary() {
    return {
      pendingSubmissions: db().subs.filter((s) => s.status === 'pending' && s.canReview).length,
      places: db().places,
      hiddenEmergencyContacts: db().hotlines.filter((h) => h.hidden).length,
      dueEmergencyContacts: db().hotlines.filter((h) => Date.parse(h.hidesOn) - Date.now() < 30 * 86_400_000).length,
      users: db().users.length,
      scoutRequests: db().users.filter((u) => u.scoutRequest).length,
    }
  },
  async queue({ status = 'pending', reason } = {}) {
    const list = db().subs.filter((s) => s.status === status || (status === 'approved' && s.status === 'partly_approved'))
    const items = list.filter((s) => !reason || s.reason === reason).map(queueItem)
    items.sort((a, b) => (status === 'pending' ? 1 : -1) * a.createdAt.localeCompare(b.createdAt))
    return { items, nextPage: null }
  },
  async submission(id) {
    const s = db().subs.find((x) => x.id === id)
    if (!s) throw new Error('not found')
    return clone({
      ...queueItem(s),
      ...s.detail,
      sender: { ...s.sender, role: s.senderRole },
    })
  },
  async approve(id, fields) {
    if (fields.length === 0) return fail('Tick at least one field, or reject it.')
    const s = db().subs.find((x) => x.id === id)
    const all = s?.detail.fields.length ?? 0
    const r = settle(id, fields.length < all ? 'partly_approved' : 'approved')
    if (r.ok && s?.reason === 'new_place') db().places += 1
    return r
  },
  async confirm(id) {
    return settle(id, 'confirmed')
  },
  async reject(id) {
    return settle(id, 'rejected')
  },
  async rejectMany(ids) {
    const rejected = ids.filter((id) => settle(id, 'rejected').ok)
    return ok({ rejected })
  },
  async addPlace() {
    db().places += 1
    return ok({ id: `ph-local-${Math.random().toString(36).slice(2, 8)}` })
  },
  async users({ q, role, asked } = {}) {
    const needle = q?.trim().toLowerCase() ?? ''
    if (needle && needle.length < 3) throw new Error('Type 3 letters or more.')
    const items = db().users
      .filter((u) => (!role || u.role === role) && (!asked || u.scoutRequest) && (!needle || u.name.toLowerCase().includes(needle)))
      .map(({ id, name, role, email, createdAt, sent, scoutRequest }) => ({
        id,
        name,
        role,
        email,
        createdAt,
        sent,
        asked: !!scoutRequest,
      }))
    return { items, nextPage: null }
  },
  async user(id) {
    const u = db().users.find((x) => x.id === id)
    if (!u) throw new Error('not found')
    return clone(u)
  },
  async setRole(id, role) {
    const u = db().users.find((x) => x.id === id)
    if (!u) return fail('This is gone. Someone may have removed it.')
    if (!u.canChangeRole) return fail("Your account can't do that.")
    u.role = role
    // Saying yes answers their Scout request; the server does the same.
    u.scoutRequest = null
    return ok(clone(u))
  },
  async declineScout(id) {
    const u = db().users.find((x) => x.id === id)
    if (!u) return fail('This is gone. Someone may have removed it.')
    if (!u.scoutRequest) return fail('Someone already answered this request.')
    u.scoutRequest = null
    return ok(clone(u))
  },
  async removePhoto(id) {
    const u = db().users.find((x) => x.id === id)
    if (u) u.photoUrl = null
    return ok(undefined)
  },
  async areas() {
    return clone(db().areas)
  },
  async saveArea(input, id) {
    const parentOf = (pid: string | null) => db().areas.find((a) => a.id === pid)
    const clash = db().areas.some(
      (a) =>
        a.id !== id && a.name.toLowerCase() === input.name.trim().toLowerCase() && (a.parent ?? null) === input.parent,
    )
    if (clash) return fail('That area is already listed.')
    if (id) {
      const a = db().areas.find((x) => x.id === id)
      if (!a) return fail('This is gone. Someone may have removed it.')
      Object.assign(a, { ...input, name: input.name.trim() })
      return ok(clone(a))
    }
    const slug = `${input.parent ?? 'ph'}-${input.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`
    const area: StaffArea = {
      id: slug,
      country: 'PH',
      name: input.name.trim(),
      region: input.region || parentOf(input.parent)?.name || '',
      level: input.level,
      parent: input.parent,
      languages: ['en'],
      places: 0,
      hotlines: 0,
      inUse: false,
    }
    db().areas.push(area)
    return ok(clone(area))
  },
  async hotlines({ area, level, due } = {}) {
    return clone(
      db().hotlines.filter(
        (h) =>
          (!area || h.area === area) &&
          (!level || h.areaLevel === level) &&
          (due === undefined || Date.parse(h.hidesOn) - Date.now() < due * 86_400_000),
      ),
    )
  },
  async saveHotline(input, id) {
    const a = db().areas.find((x) => x.id === input.area)
    if (!a) return fail('Pick the area this number covers.')
    const existing = id ? db().hotlines.find((h) => h.id === id) : undefined
    const days =
      input.checkedToday || !existing ? 0 : Math.round((Date.now() - Date.parse(existing.verifiedAt)) / 86_400_000)
    const next = {
      ...hotline(
        id ?? `h-${Math.random().toString(36).slice(2, 8)}`,
        a,
        input.name.trim(),
        input.kind,
        input.phones,
        days,
      ),
      source: input.source,
    }
    if (existing) Object.assign(existing, next)
    else db().hotlines.push(next)
    a.hotlines = db().hotlines.filter((h) => h.area === a.id).length
    return ok(clone(next))
  },
  async verifyHotline(id) {
    const h = db().hotlines.find((x) => x.id === id)
    if (!h) return fail('This is gone. Someone may have removed it.')
    Object.assign(h, {
      verifiedAt: today(),
      hidden: false,
      hidesOn: addDays(today(), 181),
    })
    return ok(undefined)
  },
}
