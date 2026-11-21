'use strict';
// Shared by api/library.js. Mirrors services/sunoSanitizer.js (browser/Vite copy).

const LIM = { title: 80, stylePrompt: 1000, excludeStyles: 1000, lyrics: 5000, brief: 600, tip: 600, lang: 40 };
const MODES = ['create', 'preserve', 'usedna', 'instrumental', 'design'];
// control characters, zero-width and bidi-override characters (keeps \n and \t)
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;
const URL_RE = /(https?:\/\/|www\.)\S+/i;
const MAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

function sanitizeText(v, multi) {
  let s = typeof v === 'string' ? v : (v == null ? '' : String(v));
  s = s.replace(/\r\n?/g, '\n').replace(CTRL, '').replace(/<[^>]*>/g, '');
  s = multi ? s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  return s.trim();
}

// Accepts camelCase (browser) or snake_case (database) keys. Returns { isValid, errors, sanitized } with snake_case keys.
function validateSunoPackage(raw, opts) {
  opts = opts || {};
  const r = raw && typeof raw === 'object' ? raw : {};
  const pick = (a, b) => (r[a] != null ? r[a] : r[b]);
  const sanitized = {
    title: sanitizeText(pick('title', 'title')),
    style_prompt: sanitizeText(pick('stylePrompt', 'style_prompt')),
    exclude_styles: sanitizeText(pick('excludeStyles', 'exclude_styles')),
    lyrics: sanitizeText(r.lyrics, true),
    brief: sanitizeText(r.brief),
    tip: sanitizeText(r.tip),
    mode: MODES.includes(r.mode) ? r.mode : (r.mode ? null : 'create'),
    lang: sanitizeText(r.lang),
  };
  const errors = [];
  if (sanitized.mode === null) errors.push('โหมดไม่ถูกต้อง');
  if (sanitized.title.length > LIM.title) errors.push('ชื่อเพลงยาวเกิน 80 ตัวอักษร');
  if (sanitized.style_prompt.length > LIM.stylePrompt) errors.push('Style prompt ยาวเกิน 1,000 ตัวอักษร');
  if (sanitized.exclude_styles.length > LIM.excludeStyles) errors.push('Exclude Styles ยาวเกิน 1,000 ตัวอักษร');
  if (sanitized.lyrics.length > LIM.lyrics) errors.push('เนื้อร้องยาวเกิน 5,000 ตัวอักษร');
  if (sanitized.brief.length > LIM.brief) errors.push('สรุปยาวเกิน 600 ตัวอักษร');
  if (sanitized.tip.length > LIM.tip) errors.push('เคล็ดลับยาวเกิน 600 ตัวอักษร');
  if (sanitized.lang.length > LIM.lang) errors.push('ภาษายาวเกินไป');
  if (!sanitized.style_prompt && !sanitized.lyrics) errors.push('ต้องมี Style prompt หรือเนื้อร้องอย่างน้อยอย่างใดอย่างหนึ่ง');
  if (opts.forPublic) {
    const all = [sanitized.title, sanitized.style_prompt, sanitized.exclude_styles, sanitized.lyrics, sanitized.brief, sanitized.tip].join('\n');
    if (URL_RE.test(all) || MAIL_RE.test(all)) errors.push('แพ็กเกจสาธารณะห้ามมีลิงก์หรืออีเมล');
  }
  return { isValid: errors.length === 0, errors, sanitized };
}

module.exports = { validateSunoPackage, sanitizeText, LIM, MODES };
