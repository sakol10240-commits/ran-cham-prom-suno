// DNA SONG AI - song package library (Supabase). Server side only.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (never put these in the browser), APP_ACCESS_CODE (same code as generate.js),
//      optional LIBRARY_SALT, DEBUG_ERRORS=1.
// Talks to Supabase through its REST interface with fetch, so there is nothing to npm install.
'use strict';
const crypto = require('crypto');
const { validateSunoPackage } = require('./_lib/sanitizer');

const MAX_PER_OWNER = 200;      // saved packages per device
const MAX_NEW_PER_DAY = 30;     // new packages per device per 24 h
const PAGE_MAX = 30;
const COLS = 'id,title,style_prompt,exclude_styles,lyrics,brief,tip,mode,lang,is_public,updated_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEVICE = /^[A-Za-z0-9-]{16,64}$/;

const fail = (status, code, message, extra) => ({ status, body: Object.assign({ ok: false, code, message }, extra || {}) });
const done = (data) => ({ status: 200, body: Object.assign({ ok: true }, data) });

function sbConf() {
  return { url: String(process.env.SUPABASE_URL || '').replace(/\/+$/, ''), key: process.env.SUPABASE_SERVICE_ROLE_KEY || '' };
}

async function sb(path, opt) {
  const { url, key } = sbConf();
  opt = opt || {};
  const r = await fetch(url + '/rest/v1/' + path, {
    method: opt.method || 'GET',
    headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, opt.headers || {}),
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  });
  const text = await r.text();
  let j = null;
  try { j = text ? JSON.parse(text) : null; } catch (_) {}
  if (!r.ok) {
    const e = new Error('supabase');
    e.status = r.status;
    e.detail = String((j && (j.message || j.hint || j.details)) || text).slice(0, 300);
    throw e;
  }
  return j;
}

function codeOk(req) {
  const need = process.env.APP_ACCESS_CODE;
  if (!need) return true; // same behaviour as generate.js: no code configured = open
  const got = String(req.headers['x-access-code'] || '');
  const a = Buffer.from(got), b = Buffer.from(need);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function ownerOf(req) {
  const dev = String(req.headers['x-device-id'] || '');
  if (!DEVICE.test(dev)) return null;
  return crypto.createHash('sha256').update((process.env.LIBRARY_SALT || '') + dev).digest('hex');
}

// PostgREST filter values: keep only letters, digits, spaces and dashes in a search term.
function cleanQuery(q) {
  return String(q || '').replace(/[^\p{L}\p{N} \-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
}

async function act(req, p) {
  const action = String(p.action || '');
  const writes = ['mine', 'save', 'visibility', 'delete'];

  if (action === 'list') {
    const limit = Math.min(PAGE_MAX, Math.max(1, parseInt(p.limit, 10) || 12));
    const offset = Math.min(1000, Math.max(0, parseInt(p.offset, 10) || 0));
    const q = cleanQuery(p.q);
    let path = 'public_song_packages?select=' + COLS.replace(',is_public', '') +
      '&order=updated_at.desc&limit=' + (limit + 1) + '&offset=' + offset;
    if (q) { const t = encodeURIComponent('*' + q + '*'); path += '&or=(title.ilike.' + t + ',style_prompt.ilike.' + t + ')'; }
    const rows = (await sb(path)) || [];
    return done({ items: rows.slice(0, limit), hasMore: rows.length > limit });
  }

  if (!writes.includes(action)) return fail(400, 'bad_request', 'ไม่รู้จักประเภทคำขอ');
  if (!codeOk(req)) return fail(401, 'access_code_required', req.headers['x-access-code'] ? 'รหัสเข้าร้านไม่ถูกต้อง' : 'ต้องใส่รหัสเข้าร้านก่อน');
  const owner = ownerOf(req);
  if (!owner) return fail(400, 'bad_request', 'ไม่พบรหัสเครื่อง รีเฟรชหน้าแล้วลองใหม่');
  const mine = 'owner_hash=eq.' + owner;

  if (action === 'mine') {
    const rows = await sb('song_packages?select=' + COLS + '&' + mine + '&order=updated_at.desc&limit=' + MAX_PER_OWNER);
    return done({ items: rows || [] });
  }

  if (action === 'delete') {
    if (!UUID.test(String(p.id || ''))) return fail(400, 'bad_request', 'ข้อมูลไม่ถูกต้อง');
    const rows = await sb('song_packages?id=eq.' + p.id + '&' + mine + '&select=id', { method: 'DELETE', headers: { Prefer: 'return=representation' } });
    if (!rows || !rows.length) return fail(404, 'not_found', 'ไม่พบรายการนี้ หรือไม่ใช่ของคุณ');
    return done({ deleted: p.id });
  }

  if (action === 'visibility') {
    if (!UUID.test(String(p.id || ''))) return fail(400, 'bad_request', 'ข้อมูลไม่ถูกต้อง');
    const isPublic = p.is_public === true;
    if (isPublic) { // re-check the stored content before it becomes visible to everyone
      const cur = await sb('song_packages?id=eq.' + p.id + '&' + mine + '&select=' + COLS);
      if (!cur || !cur.length) return fail(404, 'not_found', 'ไม่พบรายการนี้ หรือไม่ใช่ของคุณ');
      const chk = validateSunoPackage(cur[0], { forPublic: true });
      if (!chk.isValid) return fail(400, 'invalid', chk.errors[0], { errors: chk.errors });
    }
    const rows = await sb('song_packages?id=eq.' + p.id + '&' + mine + '&select=' + COLS, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { is_public: isPublic } });
    if (!rows || !rows.length) return fail(404, 'not_found', 'ไม่พบรายการนี้ หรือไม่ใช่ของคุณ');
    return done({ item: rows[0] });
  }

  // save (insert or update)
  const isPublic = p.is_public === true;
  const chk = validateSunoPackage(p.pkg, { forPublic: isPublic });
  if (!chk.isValid) return fail(400, 'invalid', chk.errors[0], { errors: chk.errors });
  const row = Object.assign({}, chk.sanitized, { is_public: isPublic });

  if (p.id) {
    if (!UUID.test(String(p.id))) return fail(400, 'bad_request', 'ข้อมูลไม่ถูกต้อง');
    const rows = await sb('song_packages?id=eq.' + p.id + '&' + mine + '&select=' + COLS, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: row });
    if (rows && rows.length) return done({ item: rows[0] });
    // not found for this owner: fall through and create a new row instead of failing
  }
  const all = (await sb('song_packages?select=id&' + mine + '&limit=' + MAX_PER_OWNER)) || [];
  if (all.length >= MAX_PER_OWNER) return fail(400, 'full', 'คลังเต็ม (สูงสุด 200 รายการต่อเครื่อง) ลบบางรายการก่อน');
  const since = encodeURIComponent(new Date(Date.now() - 864e5).toISOString());
  const recent = (await sb('song_packages?select=id&' + mine + '&created_at=gte.' + since + '&limit=' + MAX_NEW_PER_DAY)) || [];
  if (recent.length >= MAX_NEW_PER_DAY) return fail(429, 'daily_limit', 'วันนี้บันทึกครบ 30 รายการแล้ว ลองใหม่พรุ่งนี้');
  const ins = await sb('song_packages?select=' + COLS, { method: 'POST', headers: { Prefer: 'return=representation' }, body: Object.assign({ owner_hash: owner }, row) });
  return done({ item: ins && ins[0] });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  let out;
  try {
    if (req.method !== 'POST' && req.method !== 'GET') out = fail(405, 'method', 'ไม่รองรับวิธีนี้');
    else if (!sbConf().url || !sbConf().key) out = fail(503, 'not_configured', 'ยังไม่ได้ตั้งค่า Supabase ที่เซิร์ฟเวอร์');
    else {
      let p = req.method === 'GET' ? Object.assign({}, req.query || {}, { action: (req.query && req.query.action) || 'list' }) : req.body;
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = {}; } }
      out = await act(req, p && typeof p === 'object' ? p : {});
    }
  } catch (e) {
    console.error('library error', e && e.status, e && e.detail, e && e.message);
    out = fail(502, 'upstream', 'คลังออนไลน์ขัดข้อง ลองอีกครั้ง' + (process.env.DEBUG_ERRORS === '1' ? ' [' + (e && e.status) + ' ' + ((e && e.detail) || (e && e.message) || '') + ']' : ''));
  }
  res.status(out.status).json(out.body);
};
