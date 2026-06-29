const STORAGE_KEY = "body-daily-v2";
const $ = (selector) => document.querySelector(selector);
const state = loadState();
let installPrompt = null;

function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && Array.isArray(data.entries)) return data;
  } catch {}
  return { entries: [], challenge: null };
}

function saveState() {
  state.entries.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayKey() {
  const d = new Date();
  return dateKey(d);
}

function dateKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function formatDate(key) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(key + "T00:00:00"));
}

function signed(value) {
  if (value === null || Number.isNaN(value)) return "--";
  return (value > 0 ? "+" : "") + value.toFixed(1) + " kg";
}

function latestEntries(limit) {
  return [...state.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

function findToday() {
  return state.entries.find((entry) => entry.date === todayKey());
}

function trend(days) {
  const list = state.entries.slice(-days);
  if (list.length < 2) return null;
  return list[list.length - 1].weight - list[0].weight;
}

function streak() {
  const dates = new Set(state.entries.map((entry) => entry.date));
  const cursor = new Date(todayKey() + "T00:00:00");
  let count = 0;
  while (dates.has(dateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function deltaAt(index) {
  if (index < 1) return null;
  return state.entries[index].weight - state.entries[index - 1].weight;
}

function renderStats() {
  const latest = state.entries[state.entries.length - 1];
  const previous = state.entries[state.entries.length - 2];
  const currentStreak = streak();
  const weekly = trend(7);
  const today = findToday();

  $("#latestWeight").textContent = latest ? latest.weight.toFixed(1) + " kg" : "--";
  $("#latestDate").textContent = latest ? formatDate(latest.date) : "ยังไม่มีข้อมูล";

  if (latest && previous) {
    const daily = latest.weight - previous.weight;
    $("#dailyChange").textContent = signed(daily);
    $("#dailyChangeText").textContent = daily < 0 ? "ลดลงจากครั้งก่อน" : daily > 0 ? "เพิ่มขึ้นจากครั้งก่อน" : "เท่าเดิมจากครั้งก่อน";
  } else {
    $("#dailyChange").textContent = "--";
    $("#dailyChangeText").textContent = "รอบันทึกอย่างน้อย 2 วัน";
  }

  $("#weeklyTrend").textContent = weekly === null ? "--" : signed(weekly);
  $("#weeklyTrendText").textContent = weekly === null ? "ข้อมูลจะนิ่งขึ้นเมื่อบันทึกต่อเนื่อง" : weekly < 0 ? "ภาพรวมกำลังลง" : weekly > 0 ? "ภาพรวมกำลังขึ้น" : "ภาพรวมคงที่";
  $("#streakCount").textContent = currentStreak + " วัน";
  $("#streakText").textContent = currentStreak >= 7 ? "ต่อเนื่องครบสัปดาห์" : currentStreak > 0 ? "รักษาจังหวะตอนเช้าต่อไป" : "บันทึกวันนี้เพื่อเริ่มสตรีค";
  $("#dailyMessage").textContent = latest && latest.date === todayKey() ? "วันนี้บันทึกแล้ว พรุ่งนี้มาดูทิศทางต่อ" : "บันทึกทุกเช้า แล้วดูขึ้น/ลงกับแนวโน้มทันที";
  $("#weightInput").value = today ? today.weight : "";
  $("#noteInput").value = today ? today.note || "" : "";
}

function renderAdvice() {
  const latest = state.entries[state.entries.length - 1];
  const daily = state.entries.length > 1 ? state.entries[state.entries.length - 1].weight - state.entries[state.entries.length - 2].weight : null;
  const weekly = trend(7);
  const items = [];

  if (!latest) items.push(["เริ่มง่ายที่สุด", "ชั่งหลังตื่นและเข้าห้องน้ำ ก่อนกินหรือดื่ม เพื่อให้ตัวเลขเทียบกันยุติธรรม"]);
  else if (daily > 0.7) items.push(["อย่าตกใจจากวันเดียว", "น้ำหนักขึ้นเร็วอาจมาจากเกลือ คาร์บ การนอน หรือปริมาณน้ำ ให้ดูแนวโน้ม 7 วัน"]);
  else if (daily < -0.7) items.push(["ลดเร็วมาก", "วันนี้ดี แต่ยังควรกินโปรตีน ดื่มน้ำ และพักให้พอ"]);
  else items.push(["จังหวะกำลังดี", "ตัวเลขรายวันแกว่งได้ ใช้กราฟกับค่า 7 วันเป็นเข็มทิศ"]);

  if (weekly > 0) items.push(["ปรับเล็กๆ วันนี้", "ลองลดน้ำหวานหนึ่งแก้ว หรือเดินเพิ่ม 10-15 นาที"]);
  if (weekly < 0) items.push(["รักษาแรงส่ง", "ทำสิ่งเดิมที่ทำได้จริงต่ออีก 3 วัน อย่าเพิ่มความยากเกินจำเป็น"]);
  items.push(streak() >= 7 ? ["ครบสัปดาห์แล้ว", "ตั้ง challenge สั้นๆ อีก 7-14 วันเพื่อให้ยังสนุก"] : ["สร้างนิสัย", "วางเครื่องชั่งไว้จุดเดิม แล้วบันทึกทันทีหลังชั่ง"]);

  $("#adviceList").innerHTML = items.slice(0, 3).map(([title, body]) => "<article class='advice-item'><strong>" + title + "</strong><p>" + body + "</p></article>").join("");
}

function renderChart() {
  const canvas = $("#weightChart");
  const ctx = canvas.getContext("2d");
  const entries = state.entries.slice(-Number($("#rangeSelect").value));
  const box = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, Math.floor(box.width * ratio));
  canvas.height = Math.max(240, Math.floor(box.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, box.width, box.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, box.width, box.height);

  const pad = { top: 24, right: 18, bottom: 42, left: 46 };
  const plotW = box.width - pad.left - pad.right;
  const plotH = box.height - pad.top - pad.bottom;
  ctx.strokeStyle = "#e3e8e1";
  for (let i = 0; i < 5; i++) {
    const y = pad.top + (plotH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(box.width - pad.right, y); ctx.stroke();
  }

  if (entries.length < 2) {
    ctx.fillStyle = "#687371";
    ctx.font = "15px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("บันทึกอย่างน้อย 2 วันเพื่อแสดงกราฟ", box.width / 2, box.height / 2);
    return;
  }

  const weights = entries.map((entry) => entry.weight);
  const min = Math.min(...weights) - 0.4;
  const max = Math.max(...weights) + 0.4;
  const x = (i) => pad.left + (plotW / (entries.length - 1)) * i;
  const y = (w) => pad.top + ((max - w) / (max - min || 1)) * plotH;

  ctx.strokeStyle = "#136f63";
  ctx.lineWidth = 3;
  ctx.beginPath();
  entries.forEach((entry, i) => i ? ctx.lineTo(x(i), y(entry.weight)) : ctx.moveTo(x(i), y(entry.weight)));
  ctx.stroke();
  entries.forEach((entry, i) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x(i), y(entry.weight), 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
}

function renderHistory() {
  const list = latestEntries(8);
  if (!list.length) {
    $("#historyList").innerHTML = "<p class='empty-state'>ยังไม่มีประวัติ บันทึกน้ำหนักเช้านี้เพื่อเริ่มดูการเปลี่ยนแปลง</p>";
    return;
  }
  $("#historyList").innerHTML = list.map((entry) => {
    const index = state.entries.findIndex((item) => item.date === entry.date);
    const delta = deltaAt(index);
    const klass = delta === null || delta === 0 ? "same" : delta < 0 ? "drop" : "rise";
    return "<article class='history-item'><div class='history-main'><strong>" + formatDate(entry.date) + "</strong><span>" + (entry.note || "ไม่มีโน้ต") + "</span></div><div class='history-meta'><strong>" + entry.weight.toFixed(1) + " kg</strong><span class='delta " + klass + "'>" + (delta === null ? "เริ่มต้น" : signed(delta)) + "</span></div></article>";
  }).join("");
}

function renderChallenge() {
  if (!state.challenge) {
    $("#challengeStatus").innerHTML = "<p class='empty-state'>ตั้งเป้าหมายสั้นๆ เช่น ลด 1 kg ใน 14 วัน แล้วดูความคืบหน้าทุกเช้า</p>";
    return;
  }
  const latest = state.entries[state.entries.length - 1];
  const start = state.challenge.startWeight;
  const goal = state.challenge.goalWeight;
  const current = latest ? latest.weight : start;
  const total = Math.abs(start - goal) || 1;
  const progress = Math.min(100, Math.max(0, Math.abs(start - current) / total * 100));
  const daysLeft = Math.max(0, Math.ceil((new Date(state.challenge.deadline + "T00:00:00") - new Date(todayKey() + "T00:00:00")) / 86400000));
  $("#goalInput").value = goal;
  $("#deadlineInput").value = state.challenge.deadline;
  $("#challengeStatus").innerHTML = "<article class='challenge-box'><strong>เป้าหมาย " + goal.toFixed(1) + " kg</strong><p>เริ่ม " + start.toFixed(1) + " kg ตอนนี้ " + current.toFixed(1) + " kg เหลือ " + daysLeft + " วัน</p><div class='progress-track'><span style='width:" + progress + "%'></span></div><p>" + progress.toFixed(0) + "% ของ challenge</p></article>";
}

function renderAll() {
  renderStats(); renderAdvice(); renderChart(); renderHistory(); renderChallenge();
}

$("#weightForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const weight = Number($("#weightInput").value);
  if (!Number.isFinite(weight)) return;
  const existing = findToday();
  const entry = { date: todayKey(), weight, note: $("#noteInput").value.trim() };
  if (existing) Object.assign(existing, entry); else state.entries.push(entry);
  saveState(); renderAll();
});

$("#challengeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const latest = state.entries[state.entries.length - 1];
  const goal = Number($("#goalInput").value);
  const deadline = $("#deadlineInput").value;
  if (!latest || !Number.isFinite(goal) || !deadline) {
    $("#challengeStatus").innerHTML = "<p class='empty-state'>ต้องมีน้ำหนักล่าสุด เป้าหมาย และวันสิ้นสุดก่อนตั้ง challenge</p>";
    return;
  }
  state.challenge = { startDate: todayKey(), startWeight: latest.weight, goalWeight: goal, deadline };
  saveState(); renderAll();
});

$("#rangeSelect").addEventListener("change", renderChart);
window.addEventListener("resize", renderChart);

$("#exportButton").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "body-daily-" + todayKey() + ".json"; link.click();
  URL.revokeObjectURL(url);
});

$("#importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.entries)) throw new Error("invalid");
    state.entries = imported.entries.map((entry) => ({ date: entry.date, weight: Number(entry.weight), note: entry.note || "" })).filter((entry) => entry.date && Number.isFinite(entry.weight));
    state.challenge = imported.challenge || null;
    saveState(); renderAll();
  } catch { alert("ไฟล์ข้อมูลไม่ถูกต้อง"); }
  event.target.value = "";
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("#installButton").hidden = false;
});

$("#installButton").addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("#installButton").hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}

renderAll();