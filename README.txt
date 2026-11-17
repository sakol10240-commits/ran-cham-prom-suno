ร้านชำ Suno prom (เวอร์ชันไฟล์แบน ใช้โฟลเดอร์เดียวคือ api)

ไฟล์ในชุดนี้
  index.html, sw.js, manifest.webmanifest, vercel.json, package.json, ไฟล์ .png 4 ไฟล์  -> วางชั้นนอกสุดของที่เก็บ GitHub
  api/generate.js                                                                   -> ต้องอยู่ในโฟลเดอร์ api

Environment Variables ที่ต้องตั้งใน Vercel (Settings > Environment Variables)
  GEMINI_API_KEY   = กุญแจจาก aistudio.google.com   (จำเป็น)
  APP_ACCESS_CODE  = รหัสที่ตั้งเอง                   (แนะนำ)
เปลี่ยนค่าแล้วต้อง Redeploy ทุกครั้ง

โควตาต่อวัน (ไม่บังคับ): DAILY_LIMIT_PER_USER (10), DAILY_LIMIT_PER_IP (30), DAILY_LIMIT_GLOBAL (300)
ใส่ 0 = ไม่จำกัด  ถ้าไม่เชื่อม Upstash Redis ตัวนับจะไม่แม่น ใช้ทดลองกับคนใกล้ตัวเท่านั้น
อย่าใส่กุญแจในไฟล์หรือ commit ขึ้น GitHub
