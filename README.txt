DNA SONG AI (Gemini engine) - แทนที่ ran-cham-prom-suno

ไฟล์ในชุดนี้
  index.html, sw.js, manifest.webmanifest, vercel.json, package.json และไฟล์ .png 4 ไฟล์ -> วางชั้นนอกสุดของที่เก็บ GitHub
  api/generate.js -> ต้องอยู่ในโฟลเดอร์ api (เหมือนเดิม)

วิธีแทนของเดิม (ใช้ที่เก็บและโปรเจกต์ Vercel เดิม ลิงก์และ Environment Variables เดิมยังใช้ต่อได้)
  1. เปิดที่เก็บ ran-cham-prom-suno บน GitHub > Add file > Upload files
  2. ลากไฟล์ทั้งหมดในชุดนี้ลงไป โดยไฟล์ชื่อซ้ำจะถูกแทนที่ (api/generate.js ให้ใช้ Add file > Create new file พิมพ์ชื่อ api/generate.js แล้ววางโค้ด หรือลากทั้งโฟลเดอร์ api)
  3. Commit changes แล้วรอ Vercel Deploy ใหม่อัตโนมัติ 1-2 นาที

Environment Variables ใน Vercel (Settings > Environment Variables) ใช้ชุดเดิมได้เลย
  GEMINI_API_KEY   = กุญแจจาก aistudio.google.com   (จำเป็น)
  APP_ACCESS_CODE  = รหัสที่ตั้งเอง                   (แนะนำ ผู้ใช้ต้องใส่ในช่อง "รหัสเข้าร้าน")
  GEMINI_MODEL     = ชื่อโมเดล                        (ไม่บังคับ ถ้าไม่ตั้งจะลองรายการสำรองในโค้ด)
เปลี่ยนค่าแล้วต้อง Redeploy ทุกครั้ง

โควตาต่อวัน (ไม่บังคับ): DAILY_LIMIT_PER_USER (10), DAILY_LIMIT_PER_IP (30), DAILY_LIMIT_GLOBAL (300)
ใส่ 0 = ไม่จำกัด  ถ้าไม่เชื่อม Upstash Redis ตัวนับจะไม่แม่น ใช้ทดลองกับคนใกล้ตัวเท่านั้น

สิ่งที่เปลี่ยนจากเวอร์ชันเดิม
  - หน้าเว็บเป็น DNA SONG AI เต็ม: โหมดใช้พรอมต์จาก DNA, วิเคราะห์ BPM จากไฟล์เสียง, ช่องรายละเอียดเพิ่ม, สลับไทย/EN
  - พรอมต์ระบบและ schema อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น เบราว์เซอร์ส่งแค่ข้อความผู้ใช้
  - อย่าใส่กุญแจในไฟล์หรือ commit ขึ้น GitHub

แก้ปัญหา "ร้านคนแน่นหรือโควตา Gemini เต็ม"
  ข้อความนี้ = Gemini ตอบกลับ 429 (เกินโควตา) ไม่ใช่ตัวนับโควตาของร้านเอง
  - ตั้ง DEBUG_ERRORS = 1 ใน Vercel แล้ว Redeploy จะเห็นสาเหตุจริงต่อท้ายข้อความ เช่น [429 RESOURCE_EXHAUSTED: ... limit: 0 ...]
    ดูแล้วอย่าลืมลบค่านี้ออก
  - ดู Logs: Vercel > โปรเจกต์ > Logs ค้นคำว่า "gemini error" หรือ "model skipped"
  - ดูโควตาจริง: aistudio.google.com > Usage / Rate limits ของโปรเจกต์ที่ออก key
  - โค้ดเวอร์ชันนี้รอแล้วลองใหม่ 1 ครั้งถ้า Gemini บอกให้รอสั้นๆ และข้ามไปลองโมเดลถัดไปเมื่อโมเดลหนึ่งเต็ม
  - ถ้าเต็มทุกโมเดล: รอรีเซ็ต (โควตารายวันรีเซ็ตตามเวลาแปซิฟิก) ตั้ง GEMINI_MODEL เป็นโมเดลที่มีโควตาเหลือ หรือเปิดการเรียกเก็บเงินใน Google AI Studio
