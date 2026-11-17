const path = require("path");
const pptxgen = require("pptxgenjs");

const OUT = process.argv[2];
if (!OUT || path.basename(OUT).toLowerCase() === "agentic-workshop.pptx") {
  console.error("Refusing to write the real deck: it contains manual edits. Build to a temp file and use replace-slides.ps1.");
  process.exit(1);
}
const ASSETS = __dirname;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "Agentic Development Workshop";

const W = 13.333;
const M = 0.6;
const CW = W - 2 * M;
const C = {
  ink: "193B33", muted: "55665F", green: "2E6B57", lime: "B9DA78", tint: "EEF4EC",
  white: "FFFFFF", dark: "12302A", amber: "A8620F", amberTint: "FBF0E1", soft: "DCE8DE",
};
const HF = "Cambria";
const BF = "Calibri";
let pageNo = 0;

function newSlide(section, dark = false) {
  const s = pres.addSlide();
  pageNo += 1;
  s.background = { color: dark ? C.dark : C.white };
  const footColor = dark ? "A9C3B5" : C.muted;
  if (section) s.addText(section, { x: M, y: 7.0, w: 9, h: 0.3, fontFace: BF, fontSize: 10, color: footColor, margin: 0 });
  s.slideNumber = { x: W - M - 1, y: 7.0, w: 1, h: 0.3, fontFace: BF, fontSize: 10, color: footColor, align: "right", margin: 0 };
  return s;
}

function content(title, lead, section) {
  const s = newSlide(section);
  s.addText(title, { x: M, y: 0.4, w: CW, h: 0.75, fontFace: HF, fontSize: 30, bold: true, color: C.ink, margin: 0, valign: "middle" });
  if (lead) s.addText(lead, { x: M, y: 1.18, w: CW, h: 0.62, fontFace: BF, fontSize: 16, color: C.muted, margin: 0, valign: "top" });
  return s;
}

function circle(s, x, y, d, label, fill = C.green, color = C.white, size = 14) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
  s.addText(String(label), { x, y, w: d, h: d, fontFace: BF, fontSize: size, bold: true, color, align: "center", valign: "middle", margin: 0 });
}

function box(s, x, y, w, h, fill = C.tint) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.08 });
}

function runsFor(title, body, o = {}) {
  const size = o.size || 13;
  const color = o.color || C.ink;
  const runs = [];
  if (title) runs.push({ text: title, options: { bold: true, fontSize: o.titleSize || 16, color: o.titleColor || color, breakLine: !!body } });
  if (Array.isArray(body)) {
    body.forEach((item, i) => {
      const last = i === body.length - 1;
      const para = { bullet: { indent: 14 }, fontSize: size, color, paraSpaceBefore: i === 0 && title ? 6 : 3 };
      if (typeof item === "string") runs.push({ text: item, options: { ...para, breakLine: !last } });
      else {
        runs.push({ text: item.b, options: { ...para, bold: true } });
        runs.push({ text: item.t, options: { fontSize: size, color, breakLine: !last } });
      }
    });
  } else if (body) {
    runs.push({ text: body, options: { fontSize: size, color, paraSpaceBefore: title ? 6 : 0 } });
  }
  return runs;
}

function card(s, o) {
  const fill = o.fill || C.tint;
  box(s, o.x, o.y, o.w, o.h, fill);
  let tx = o.x;
  let ty = o.y;
  let tw = o.w;
  let th = o.h;
  if (o.num !== undefined && o.numTop) {
    circle(s, o.x + 0.2, o.y + 0.2, 0.55, o.num, o.numFill || C.green);
    ty = o.y + 0.82;
    th = o.h - 0.82;
  } else if (o.num !== undefined) {
    circle(s, o.x + 0.18, o.y + 0.2, 0.48, o.num, o.numFill || C.green);
    tx = o.x + 0.72;
    tw = o.w - 0.72;
  }
  s.addText(runsFor(o.title, o.body, o), { x: tx, y: ty, w: tw, h: th, fontFace: BF, valign: "top", margin: 10 });
}

function labelled(s, o) {
  const fill = o.fill || C.tint;
  box(s, o.x, o.y, o.w, o.h, fill);
  let ty = o.y;
  let th = o.h;
  if (o.num !== undefined) {
    circle(s, o.x + 0.2, o.y + 0.2, 0.55, o.num, o.numFill || C.green);
    ty = o.y + 0.8;
    th = o.h - 0.8;
  }
  const size = o.size || 13;
  const runs = [];
  if (o.title) runs.push({ text: o.title, options: { bold: true, fontSize: o.titleSize || 16, color: C.ink, breakLine: true } });
  o.rows.forEach((r, i) => {
    const last = i === o.rows.length - 1;
    runs.push({ text: r[0] + "  ", options: { bold: true, fontSize: size, color: C.green, paraSpaceBefore: 6 } });
    runs.push({ text: r[1], options: { fontSize: size, color: C.ink, breakLine: !last } });
  });
  s.addText(runs, { x: o.x, y: ty, w: o.w, h: th, fontFace: BF, valign: "top", margin: 10 });
}

function numberedRows(s, items, o) {
  items.forEach((item, i) => {
    const y = o.y + i * o.step;
    circle(s, o.x, y, o.d || 0.48, i + 1, o.fill || C.green);
    const runs = typeof item === "string"
      ? [{ text: item, options: { fontSize: o.size || 15, color: C.ink } }]
      : [{ text: item[0] + " ", options: { bold: true, fontSize: o.size || 15, color: C.ink } }, { text: item[1], options: { fontSize: o.size || 15, color: C.ink } }];
    s.addText(runs, { x: o.x + (o.d || 0.48) + 0.2, y: y - 0.06, w: o.w, h: o.step - 0.04, fontFace: BF, valign: "top", margin: 2 });
  });
}

function placeholder(s, x, y, w, h, label) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: C.amberTint }, line: { color: C.amber, width: 1.25, dashType: "dash" }, rectRadius: 0.08 });
  s.addText([
    { text: "PLACEHOLDER", options: { bold: true, fontSize: 12, color: C.amber, breakLine: true, charSpacing: 2 } },
    { text: label, options: { fontSize: 13, color: C.ink } },
  ], { x, y, w, h, fontFace: BF, align: "center", valign: "middle", margin: 12 });
}

const ORIG = path.join(ASSETS, "orig");

function fitImage(s, file, x, y, maxW, maxH, ratio, crop = {}) {
  const top = crop.top || 0;
  const bottom = crop.bottom || 0;
  const visRatio = ratio / (1 - top - bottom);
  let w = maxW;
  let h = w / visRatio;
  if (h > maxH) { h = maxH; w = h * visRatio; }
  const ix = crop.alignLeft ? x : x + (maxW - w) / 2;
  const iy = y + (maxH - h) / 2;
  if (!top && !bottom) {
    s.addImage({ path: path.join(ORIG, file), x: ix, y: iy, w, h });
    return;
  }
  const fullH = h / (1 - top - bottom);
  s.addImage({ path: path.join(ORIG, file), x: ix, y: iy, w, h: fullH, sizing: { type: "crop", x: 0, y: top * fullH, w, h } });
}

function termTable(s, rows) {
  const head = [
    { text: "Term", options: { bold: true, color: C.white, fill: { color: C.green }, fontSize: 13 } },
    { text: "What it actually means", options: { bold: true, color: C.white, fill: { color: C.green }, fontSize: 13 } },
  ];
  const body = rows.map((r, i) => [
    { text: [{ text: r[0], options: { bold: true, breakLine: !!r[2] } }, ...(r[2] ? [{ text: r[2], options: { fontSize: 10.5, color: C.amber, bold: true } }] : [])], options: { color: C.ink, fill: { color: i % 2 ? C.white : C.tint }, fontSize: 13 } },
    { text: r[1], options: { color: C.ink, fill: { color: i % 2 ? C.white : C.tint }, fontSize: 12.5 } },
  ]);
  s.addTable([head, ...body], { x: M, y: 1.95, w: CW, colW: [2.75, CW - 2.75], fontFace: BF, valign: "middle", margin: 6, border: { type: "solid", color: "FFFFFF", pt: 1 } });
}

function arrow(s, x, y, w = 0.45, h = 0.32, color = C.lime) {
  s.addShape(pres.shapes.RIGHT_ARROW, { x, y, w, h, fill: { color }, line: { color } });
}

function chip(s, x, y, w, h, text, fill = C.soft, color = C.ink, size = 13) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.12 });
  s.addText(text, { x, y, w, h, fontFace: BF, fontSize: size, color, bold: true, align: "center", valign: "middle", margin: 4 });
}

function darkBand(s, x, y, w, h, text, size = 17) {
  box(s, x, y, w, h, C.dark);
  s.addText(text, { x, y, w, h, fontFace: BF, fontSize: size, color: C.white, valign: "middle", margin: 14 });
}

function table(s, header, rows, o) {
  const head = header.map((t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.green }, fontSize: o.size || 13 } }));
  const body = rows.map((r, ri) => r.map((t, ci) => ({ text: t, options: { color: C.ink, fill: { color: ri % 2 ? C.white : C.tint }, fontSize: o.size || 13, bold: ci === 0 && !!o.boldFirst } })));
  s.addTable([head, ...body], { x: o.x, y: o.y, w: o.w, colW: o.colW, rowH: o.rowH, fontFace: BF, valign: "middle", margin: 6, border: { type: "solid", color: "FFFFFF", pt: 1 } });
}

function section(title, sub, label) {
  const s = newSlide(label, true);
  s.addShape(pres.shapes.OVAL, { x: 8.9, y: 1.1, w: 4.6, h: 4.6, fill: { color: C.dark }, line: { color: C.lime, width: 2 } });
  s.addShape(pres.shapes.OVAL, { x: 10.2, y: 3.4, w: 2.8, h: 2.8, fill: { color: "1E4A3F" }, line: { color: "1E4A3F" } });
  s.addText(title, { x: M, y: 2.4, w: 8, h: 1.2, fontFace: HF, fontSize: 44, bold: true, color: C.white, margin: 0 });
  s.addText(sub, { x: M, y: 3.7, w: 8, h: 0.9, fontFace: BF, fontSize: 20, color: C.lime, margin: 0 });
  return s;
}

// Title
{
  const s = newSlide(null, true);
  s.addShape(pres.shapes.OVAL, { x: 8.6, y: 0.7, w: 5.2, h: 5.2, fill: { color: C.dark }, line: { color: C.lime, width: 2 } });
  s.addShape(pres.shapes.OVAL, { x: 10.0, y: 3.3, w: 3.2, h: 3.2, fill: { color: "1E4A3F" }, line: { color: "1E4A3F" } });
  circle(s, 9.3, 2.1, 1.1, "A", C.lime, C.dark, 26);
  s.addText("TEAM AI WORKSHOP · FULL DAY", { x: M, y: 1.5, w: 8, h: 0.4, fontFace: BF, fontSize: 14, bold: true, color: C.lime, charSpacing: 2, margin: 0 });
  s.addText("Agentic Development", { x: M, y: 2.0, w: 8.2, h: 1.3, fontFace: HF, fontSize: 52, bold: true, color: C.white, margin: 0 });
  s.addText("Try four ways. Make one your own.", { x: M, y: 3.35, w: 8, h: 0.7, fontFace: BF, fontSize: 26, color: C.lime, margin: 0 });
  s.addText("Facilitators: Moshe & Tom", { x: M, y: 4.6, w: 8, h: 0.5, fontFace: BF, fontSize: 16, color: "C9DACF", margin: 0 });
  s.addNotes("Welcome. Today is not a lecture about AI in general. It is a practical day: short teaching, then hands-on work with an agent on your own laptop. By the end of the day every one of you will have tried four different ways of working with an agent, compared them on evidence, and adapted one of them to your own work.");
}

// Why we are here
{
  const s = content("Why we are here", "Most of us have heard about agents, skills and workflows. Today we turn that into a working habit.", "Opening");
  const xs = [0.6, 4.745, 8.89];
  const items = [
    ["Practice over slides", "Short teaching, then you work with an agent on your own laptop. You leave having done it, not just heard about it."],
    ["Four ways to work", "You try all four workflows on comparable tasks and see what each one helps you notice, and what it costs."],
    ["Make one your own", "In the afternoon you pick a workflow, adapt one instruction, skill or agent, and use it on a real task."],
  ];
  items.forEach((it, i) => card(s, { x: xs[i], y: 1.95, w: 3.845, h: 2.7, num: i + 1, numTop: true, title: it[0], body: it[1], size: 14 }));
  darkBand(s, 0.6, 4.95, CW, 1.45, "Goal for today:  “I completed a real task with an agent, understood how to steer and verify it, and know which workflow I will use next.”", 19);
  s.addNotes("Explain why this workshop is built differently. Many trainings give information and people leave feeling they checked a box. Knowing that a skill exists is not the same as having used it. That is why most of the day is hands-on, why everyone tries all four workflows, and why the afternoon is about making one of them yours. The sentence at the bottom is the outcome we are aiming for; come back to it in the closing.");
}

// The big idea
{
  const s = newSlide("Opening", true);
  s.addText("THE MAIN IDEA OF TODAY", { x: M, y: 0.9, w: CW, h: 0.4, fontFace: BF, fontSize: 14, bold: true, color: C.lime, charSpacing: 2, margin: 0 });
  s.addText("Agentic coding is still software engineering.", { x: M, y: 1.45, w: CW, h: 1.0, fontFace: HF, fontSize: 40, bold: true, color: C.white, margin: 0 });
  s.addText("The principles we already trust are exactly what make agents work well. Most of today's techniques are old practices, applied to a new kind of teammate.", { x: M, y: 2.6, w: 11.2, h: 1.0, fontFace: BF, fontSize: 20, color: "C9DACF", margin: 0 });
  const chips = ["Clear requirements", "Design before code", "Small steps", "Tests", "Code review", "Version control", "Definition of done"];
  let x = M;
  let y = 4.2;
  chips.forEach((c) => {
    const w = 0.3 + c.length * 0.095;
    if (x + w > W - M) { x = M; y += 0.75; }
    chip(s, x, y, w, 0.55, c, "1E4A3F", C.lime, 14);
    x += w + 0.12;
  });
  s.addNotes("This is the central message of the day, so say it explicitly and come back to it. The best results with agents do not come from magic prompts. They come from applying the engineering discipline we already know: clear requirements, design before implementation, small verifiable steps, tests, code review, version control and a definition of done. Every technique today, from planning to skills to reviewer agents, maps to one of these. We will show the mapping in detail in the foundations part.");
}

// Meme: quality work
{
  const s = content("What we want to avoid", "Agents make it easy to produce a lot of code very quickly.", "Opening");
  fitImage(s, "s02-image16.gif", 0.6, 1.95, 6.0, 4.6, 640 / 480);
  card(s, { x: 7.0, y: 1.95, w: 5.73, h: 2.1, title: "Accept all. Ship it.", body: "The agent says it's done, the demo works, we commit. Nobody read the diff.", size: 15, fill: C.amberTint, titleColor: C.amber });
  card(s, { x: 7.0, y: 4.25, w: 5.73, h: 2.3, title: "Today's goal instead", body: "Code you can stand behind: you know what changed, why, and what proves it works.", size: 15 });
  s.addNotes("A light opening joke from the original deck. The point: the risk with agents is not that they can't produce code, it's that they produce a lot of it, quickly, and it is tempting to accept it without reading. Today is about producing code you can stand behind.");
}

// Day at a glance
{
  const s = content("The day at a glance", "Two workflow trials before lunch, two after. The afternoon ends with your own adaptation.", "Opening");
  table(s, ["Time", "Morning"], [
    ["08:30–09:00", "Coffee and mingling"],
    ["09:00–09:15", "Setup and readiness"],
    ["09:15–10:10", "Foundations"],
    ["10:10–10:35", "Trial A · Native"],
    ["10:35–10:50", "Break"],
    ["10:50–11:25", "Trial B · Stack-aware"],
    ["11:25–11:40", "Choosing a model"],
    ["11:40–12:00", "When the agent loops or drifts"],
  ], { x: 0.6, y: 1.95, w: 5.9, colW: [1.7, 4.2], rowH: 0.47, boldFirst: true });
  table(s, ["Time", "Afternoon"], [
    ["12:00–12:40", "Lunch"],
    ["12:40–13:20", "Trial C · Superpowers"],
    ["13:20–14:00", "Trial D · Agentcraft"],
    ["14:00–14:15", "Compare the four"],
    ["14:15–14:30", "Break"],
    ["14:30–15:30", "Choose, adapt, apply"],
    ["15:30–15:35", "Possibilities: agents + APIs"],
    ["15:35–16:00", "Share, next step, questions"],
  ], { x: 6.83, y: 1.95, w: 5.9, colW: [1.7, 4.2], rowH: 0.47, boldFirst: true });
  s.addNotes("Walk through the day quickly. Point out the rhythm: foundations first so everyone has the same vocabulary, then the four trials, then comparison and adaptation. Coffee may move to 08:00; the teaching starts at 09:00 either way. The last 10 minutes are a buffer for questions or overruns.");
}

// How every lab works
{
  const s = content("How every lab works", "The same rhythm in every trial, so the main thing that changes is the workflow.", "Opening");
  const steps = [["Demo", "See the workflow once"], ["Practice", "Run it yourself"], ["Verify", "Run the checks"], ["Record", "Fill in your trial row"], ["Debrief", "What did it help you notice?"]];
  const slot = CW / 5;
  steps.forEach((st, i) => {
    const cx = M + i * slot + (slot - 0.8) / 2;
    circle(s, cx, 1.95, 0.8, i + 1, C.green, C.white, 18);
    if (i < 4) arrow(s, cx + 0.8 + 0.45, 2.2, 0.7, 0.3);
    s.addText([{ text: st[0], options: { bold: true, fontSize: 16, color: C.ink, breakLine: true } }, { text: st[1], options: { fontSize: 13, color: C.muted } }], { x: M + i * slot + 0.05, y: 2.85, w: slot - 0.1, h: 0.9, fontFace: BF, align: "center", valign: "top", margin: 2 });
  });
  const xs = [0.6, 4.745, 8.89];
  const levels = [
    ["Guided", "Pointers to the main files and hints on request. You still make the decisions."],
    ["Independent", "The task only. You decide how to work and what to check."],
    ["Stretch", "Finish, then improve the workflow's skill or instructions so it does better next time."],
  ];
  levels.forEach((l, i) => card(s, { x: xs[i], y: 4.05, w: 3.845, h: 1.9, title: l[0], body: l[1], size: 14 }));
  s.addText("Choose your support level for each trial. It is about what you need today, not about seniority.", { x: M, y: 6.15, w: CW, h: 0.5, fontFace: BF, fontSize: 14, italic: true, color: C.muted, margin: 0 });
  s.addNotes("Every trial has the same five steps. A short demo shows the workflow once, then everyone runs it on their own laptop, runs the checks, records a row of evidence, and joins a short debrief. Support levels address the mix in the room: students, juniors, mid-level and seniors. The guided path gives navigation help but keeps the decisions with the participant. The stretch path keeps experienced developers busy improving the workflow itself. People can switch level between trials.");
}

// Get ready
{
  const s = content("Get ready  ·  09:00–09:15", "One setup script prepares the instructions, skills and agents for the harness you chose.", "Setup");
  numberedRows(s, [
    ["Run", "the workshop setup script (Windows)."],
    ["Choose", "your harness: OpenCode or GitHub Copilot (IDE or CLI)."],
    ["Confirm", "sign-in and that the workshop models are available."],
    ["Check", "the workflow loaded: ask “Which skills and agents are available?”"],
    ["Try", "a tiny task and its check in the exercise repository."],
  ], { x: 0.6, y: 2.0, step: 0.82, w: 5.7, size: 15 });
  placeholder(s, 7.2, 1.95, 5.53, 4.2, "Setup command and a screenshot of a successful run.\nAdd after the script is adapted to our enterprise paths.");
  darkBand(s, 0.6, 6.25, 6.3, 0.6, "Stuck?  OpenCode → Moshe   ·   Copilot → Tom", 15);
  s.addNotes("Most installation and sign-in should be done before the day; this slot is for running or confirming the setup script and checking that everything loads. The script links shared instructions, skills and agents into each harness's configuration, so both OpenCode and Copilot users start from the same material. Ask everyone to confirm the workflow actually loaded, not just that the script finished. Moshe supports OpenCode users, Tom supports Copilot users.");
}

// Section: Foundations
{
  const s = section("Foundations", "09:15–10:10 · What you need before you start", "Foundations");
  s.addNotes("This part gives everyone the same vocabulary and the judgement to evaluate what happens in the labs. Keep it interactive: short demos and a few questions to the room.");
}

// From suggestions to delegated work
{
  const s = content("From suggestions to delegated work", "The model can be the same in all three modes. What changes is how much of the task you hand over, and how much you check.", "Foundations · 09:15–09:25");
  box(s, 0.6, 1.95, CW, 0.45, C.soft);
  s.addText("More of the task delegated  →  more evidence to review", { x: 0.6, y: 1.95, w: CW, h: 0.45, fontFace: BF, fontSize: 14, bold: true, color: C.ink, align: "center", valign: "middle", margin: 0 });
  const xs = [0.6, 4.745, 8.89];
  const modes = [
    ["Autocomplete", [["What it does", "Predicts the next lines while you type."], ["You review", "Each suggestion as you accept it."], ["Good for", "Boilerplate, repetitive code, tests."]]],
    ["Chat", [["What it does", "Answers using the files you point it at."], ["You review", "The answer before you apply it."], ["Good for", "Questions about existing code, explanations, options."]]],
    ["Agent", [["What it does", "Reads files, edits, runs commands and reacts to the results."], ["You review", "The plan, the diff and the evidence."], ["Good for", "Multi-file changes, investigations, fixes with checks."]]],
  ];
  modes.forEach((m, i) => labelled(s, { x: xs[i], y: 2.6, w: 3.845, h: 3.9, num: i + 1, title: m[0], rows: m[1], size: 14 }));
  s.addNotes("Most of the team already uses autocomplete and chat. With an agent, you describe an outcome and the agent investigates, edits files, runs commands and responds to failures. That changes your job: you communicate the goal and context, make the decisions that need your judgement, and evaluate the result. The more you delegate, the more important it is to review the plan, the diff and the evidence instead of the final message.");
}

// An agent at work
{
  const s = content("An agent at work", "A real Copilot agent session: the request, the investigation, the edits, and the checks.", "Foundations · 09:15–09:25");
  s.addImage({ path: path.join(ASSETS, "agent-mode.png"), x: 0.6, y: 1.95, w: 7.9, h: 4.25 });
  const callouts = [
    ["The request", "Add a value to an enum and update its usages."],
    ["Investigation", "Searched the code, then read the related files."],
    ["Action", "Edited three files with a patch tool."],
    ["Evidence", "Ran the error check and the test suite."],
    ["Your decision", "Keep or undo, file by file."],
  ];
  numberedRows(s, callouts, { x: 8.8, y: 2.0, step: 0.85, w: 3.45, size: 13.5, d: 0.42 });
  s.addNotes("Use this screenshot to show what an agent actually does. Point at the chat panel: it searched for the enum, read five files, edited three, then ran the error check and the tests. At the bottom you decide to keep or undo each change. Ask the room: what would you need to see before accepting this change? The answer we want: the diff and the check results, not just the final message.");
}

// What an LLM is
{
  const s = content("What an LLM actually is", "Large Language Model: three words, three ideas worth knowing.", "Foundations · 09:15–09:25");
  const xs = [0.6, 4.745, 8.89];
  const parts = [
    ["Large", "Billions of parameters (weights). The size is what lets it capture complex patterns of language, code and logic."],
    ["Language", "Trained on enormous amounts of human text and source code."],
    ["Model", "A transformer that builds each answer anew, one token at a time. It is not a database: it doesn't look answers up."],
  ];
  parts.forEach((p, i) => card(s, { x: xs[i], y: 1.95, w: 3.845, h: 2.75, num: p[0][0], numTop: true, title: p[0], body: p[1], size: 14 }));
  card(s, { x: 0.6, y: 4.9, w: 7.6, h: 1.65, title: "How it answers", body: "It predicts the most likely next token given everything written so far, then repeats. Fluent output is the default, whether or not it is correct.", size: 14 });
  darkBand(s, 8.45, 4.9, 4.28, 1.65, "Fluent is not the same as correct. Give it the facts through context.", 16);
  s.addNotes("From the original deck. Large: billions of parameters, the weights that encode patterns. Language: trained on huge amounts of text and code. Model: a transformer that generates the answer token by token; it does not retrieve stored answers from a table. The practical consequence: the model always produces something fluent. Whether it is correct depends a lot on the information we give it, which is why context matters so much.");
}

// Four building blocks
{
  const s = content("Four building blocks", "When a result surprises you, ask which of these four produced it.", "Foundations · 09:15–09:25");
  const w = (CW - 3 * 0.25) / 4;
  const blocks = [
    ["Model", "Generates the next response and decides which tool to call. For example GPT, Claude or Gemini models."],
    ["Harness", "The tool around the model: file access, terminal, permissions, sessions. For example OpenCode or Copilot (IDE and CLI)."],
    ["Context", "Everything the model sees in this request: instructions, conversation, files it read, tool output."],
    ["Workflow", "How the work is organised: clarify, plan, implement, review, verify. Today you try four of them."],
  ];
  blocks.forEach((b, i) => card(s, { x: 0.6 + i * (w + 0.25), y: 1.95, w, h: 3.45, num: i + 1, numTop: true, title: b[0], body: b[1], size: 14 }));
  darkBand(s, 0.6, 5.65, CW, 0.9, "Same model + different context or workflow = a different result.", 19);
  s.addNotes("These four words come back all day. The model is the engine. The harness is the environment it runs in: which tools it has, what it is allowed to do, how sessions are managed. Context is everything the model sees for the current response. The workflow is the process around it. When an agent does something unexpected, it is usually more useful to ask what context it had or which workflow it followed than to blame the model.");
}

// Agent loop and evidence
{
  const s = content("The agent loop, and what counts as evidence", "The model only writes text. The harness turns it into actions, and the results go into the next request.", "Foundations · 09:15–09:25");
  const loop = [
    ["Decide", "Model", "Asks for a tool: read a file, run the tests"],
    ["Run", "Harness", "Executes it, within your permissions"],
    ["Record", "Context", "Output or error is added to the context"],
    ["Read", "Model", "Reads the updated context, decides again"],
  ];
  loop.forEach((l, i) => {
    const x = 0.7 + i * 1.6;
    circle(s, x, 2.05, 1.1, l[0], C.green, C.white, 14);
    if (i < 3) arrow(s, x + 1.14, 2.45, 0.42, 0.3);
    s.addText([
      { text: l[1], options: { bold: true, color: C.ink, breakLine: true } },
      { text: l[2], options: { color: C.muted } },
    ], { x: x - 0.22, y: 3.25, w: 1.54, h: 1.15, fontFace: BF, fontSize: 12, align: "center", valign: "top", margin: 0 });
  });
  box(s, 0.6, 4.5, 6.1, 0.5, C.soft);
  s.addText("↻  Back to Decide, with a longer context each turn", { x: 0.6, y: 4.5, w: 6.1, h: 0.5, fontFace: BF, fontSize: 14, bold: true, color: C.ink, align: "center", valign: "middle", margin: 0 });
  s.addText([
    { text: "It stops ", options: { bold: true, color: C.ink } },
    { text: "when the model answers instead of asking for a tool. That is its judgement, not a check.", options: { color: C.ink } },
  ], { x: 0.6, y: 5.15, w: 6.1, h: 0.6, fontFace: BF, fontSize: 13, valign: "top", margin: 0 });
  s.addText("Every turn resends the growing context, so long tasks fill the window.", { x: 0.6, y: 5.8, w: 6.1, h: 0.45, fontFace: BF, fontSize: 13, italic: true, color: C.muted, margin: 0 });
  card(s, { x: 7.0, y: 1.95, w: 5.73, h: 2.05, title: "It only knows what it read", body: "Access to the repository does not mean the agent read every file. Check which files it actually opened before trusting its conclusions.", size: 14 });
  card(s, { x: 7.0, y: 4.2, w: 5.73, h: 2.05, title: "“Done” is a claim", body: "The diff and the check results are the evidence. Read them before you accept the change.", size: 14, fill: C.amberTint });
  s.addNotes("The model never touches your machine; it only writes text. When it wants to act, it writes a tool request, for example 'run the tests'. The harness executes it, subject to your permissions, and appends the output to the context. The next request sends the whole, longer context back to the model, which reads the result and decides again. One concrete pass: the model asks to run the tests, the harness runs them, the failure output lands in the context, the model reads it and asks to edit the file. The loop ends when the model writes an answer instead of a tool request; that is its own judgement that the work is done, not a verification, unless the workflow adds one. Because every turn resends the growing context, long tasks fill the window, which is where the next slides go. Two practical consequences. First, it only knows what it actually read in this session; having access to the whole repository is not the same as having read it. Second, the final message is a claim. Teach people to look at what changed and what was checked.");
}

// Tokens
{
  const s = content("Tokens: the unit of everything", "Models read and write tokens, which are pieces of words. Limits, speed and cost are all measured in tokens.", "Foundations · 09:15–09:25");
  const xs = [0.6, 4.745, 8.89];
  const stats = [
    ["≈ 4 chars", "≈ 1 English token (about 0.75 words)"],
    ["1.5–4", "tokens per Hebrew word, depending on the model's tokenizer"],
    ["Everything", "you send counts: instructions, files, tool output, history"],
  ];
  stats.forEach((st, i) => {
    box(s, xs[i], 1.95, 3.845, 2.45, C.tint);
    s.addText([{ text: st[0], options: { fontFace: HF, fontSize: 36, bold: true, color: C.green, breakLine: true } }, { text: st[1], options: { fontSize: 15, color: C.ink } }], { x: xs[i], y: 1.95, w: 3.845, h: 2.45, fontFace: BF, align: "center", valign: "middle", margin: 14 });
  });
  s.addText("Example:", { x: 0.6, y: 4.85, w: 1.3, h: 0.55, fontFace: BF, fontSize: 15, bold: true, color: C.ink, valign: "middle", margin: 0 });
  chip(s, 1.95, 4.85, 1.0, 0.55, "cat");
  s.addText("= 1 token", { x: 3.05, y: 4.85, w: 1.4, h: 0.55, fontFace: BF, fontSize: 15, color: C.muted, valign: "middle", margin: 0 });
  chip(s, 4.7, 4.85, 0.8, 0.55, "un");
  chip(s, 5.55, 4.85, 1.1, 0.55, "happy");
  s.addText("= 2 tokens", { x: 6.75, y: 4.85, w: 1.5, h: 0.55, fontFace: BF, fontSize: 15, color: C.muted, valign: "middle", margin: 0 });
  s.addText("Hebrew and other non-Latin scripts usually cost more tokens per word. Newer tokenizers are more efficient; check with a tokenizer tool.", { x: 0.6, y: 5.75, w: CW, h: 0.7, fontFace: BF, fontSize: 14, color: C.muted, margin: 0 });
  s.addNotes("Updated from the original deck. English is roughly 4 characters or 0.75 words per token (OpenAI's rule of thumb). Hebrew depends on the tokenizer: older tokenizers often used 2 to 4 or more tokens per word, newer ones (for example o200k used by recent GPT models) are more efficient, often under 2. Why it matters: the context limit, the cost and the latency are all counted in tokens, and in agent mode most tokens come from files and tool output, not from what you typed. Sources: help.openai.com/en/articles/4936856 and platform.openai.com/tokenizer.");
}

// Context window
{
  const s = content("The context window", "The context window is the token budget of a single request. It is not long-term memory.", "Foundations · 09:15–09:25");
  const layers = [
    ["System prompt and tool definitions", C.green, C.white],
    ["Instructions and loaded skills", "4F8A6E", C.white],
    ["Files the agent read and tool output", "7FAE8A", C.ink],
    ["Conversation history", C.lime, C.ink],
    ["Room for the reply", C.tint, C.muted],
  ];
  layers.forEach((l, i) => {
    const y = 1.95 + i * 0.85;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 5.2, h: 0.75, fill: { color: l[1] }, line: { color: i === 4 ? C.green : l[1], dashType: i === 4 ? "dash" : "solid" }, rectRadius: 0.06 });
    s.addText(l[0], { x: 0.6, y, w: 5.2, h: 0.75, fontFace: BF, fontSize: 14, bold: true, color: l[2], align: "center", valign: "middle", margin: 4 });
  });
  card(s, { x: 6.2, y: 1.95, w: 6.53, h: 1.3, title: "The model is stateless", body: "It remembers nothing between requests. The harness sends the history again with every request.", size: 14 });
  card(s, { x: 6.2, y: 3.4, w: 6.53, h: 1.3, title: "It fills fast in agent mode", body: "File contents, logs and command output are often the largest part.", size: 14 });
  card(s, { x: 6.2, y: 4.85, w: 6.53, h: 1.3, title: "Bigger is not automatically better", body: "Irrelevant or outdated content competes with what matters.", size: 14 });
  s.addNotes("Updated from the original deck. Everything sent in a request counts: system prompt, tool definitions, instructions, loaded skills, file contents, tool output, earlier turns and the reply. The model does not remember the conversation; the harness resends it each time, which is why the context grows. In agent mode, file reads and command output are usually the biggest consumers. Sources: docs.anthropic.com/en/docs/build-with-claude/context-windows and platform.openai.com/docs/guides/conversation-state.");
}

// Kinds of tokens
{
  const s = content("Not all tokens are equal", "Every request is billed and limited by four kinds of tokens, and they are priced differently.", "Foundations · 09:15–09:25");
  const w = (CW - 3 * 0.25) / 4;
  const kinds = [
    ["Input", "1×", "Everything sent in the request: the whole context, again on every turn."],
    ["Cached input", "≈ 0.1×", "The unchanged start of a request (system prompt, instructions) that the provider reuses. Cheaper and faster."],
    ["Output", "≈ 5×", "What the model writes, including tool requests. Generated one token at a time, so it is also the slow part."],
    ["Reasoning", "= output", "Hidden working-out before the answer. Billed as output and takes room in the window, though you never see it."],
  ];
  kinds.forEach((k, i) => {
    const x = 0.6 + i * (w + 0.25);
    box(s, x, 1.95, w, 3.45, i === 3 ? C.amberTint : C.tint);
    s.addText([
      { text: k[0], options: { fontFace: HF, fontSize: 20, bold: true, color: C.ink, breakLine: true } },
      { text: k[1], options: { fontFace: HF, fontSize: 26, bold: true, color: i === 3 ? C.amber : C.green, breakLine: true } },
      { text: " ", options: { fontSize: 8, breakLine: true } },
      { text: k[2], options: { fontSize: 14, color: C.ink } },
    ], { x, y: 1.95, w, h: 3.45, fontFace: BF, valign: "top", margin: 14 });
  });
  darkBand(s, 0.6, 5.65, CW, 0.9, "In agent mode, input dominates: every turn resends the growing context.", 19);
  s.addNotes("Prices relative to normal input, typical of current API price lists; check the exact rates for your model. Input: everything in the request, and because the model is stateless, the whole conversation is input again on every turn. Cached input: when the start of a request is identical to a recent one, the provider reuses it; current price lists put cached reads at about a tenth of the input price (for example Claude Sonnet 300 vs 30 credits per million, Gemini Flash $1.50 vs $0.15). Output: typically about five times the input price (Claude Sonnet $3 vs $15 per million), and it is generated sequentially, which is why long answers are slow. Reasoning tokens: models that reason internally produce tokens you don't see; they are billed as output and count towards the window. In an agent session, many turns each resend a large context, so input tokens are usually the largest part of the bill even though each output token costs more. Sources: docs.github.com/copilot/reference/copilot-billing/models-and-pricing; platform.openai.com/docs/guides/reasoning; docs.anthropic.com/en/docs/build-with-claude/prompt-caching.");
}

// Where cached tokens live
{
  const s = content("Where cached tokens live", "The cache sits with the model provider, not on your machine. It only works while the start of the request stays exactly the same.", "Foundations · 09:15–09:25");
  const segs = [
    ["Tools + system prompt", 2.55, C.green, C.white],
    ["Instructions + skills", 2.45, "4F8A6E", C.white],
    ["Earlier turns + tool output", 4.6, "7FAE8A", C.ink],
    ["New message", 2.533, C.amberTint, C.ink],
  ];
  let x = 0.6;
  segs.forEach((g) => {
    const isNew = g[2] === C.amberTint;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.95, w: g[1], h: 0.75, fill: { color: g[2] }, line: { color: isNew ? C.amber : g[2], dashType: isNew ? "dash" : "solid" } });
    s.addText(g[0], { x, y: 1.95, w: g[1], h: 0.75, fontFace: BF, fontSize: 14, bold: true, color: g[3], align: "center", valign: "middle", margin: 4 });
    x += g[1];
  });
  s.addText("◀  Same as the last request: read from the cache (≈ 0.1×)  ▶", { x: 0.6, y: 2.8, w: 9.6, h: 0.4, fontFace: BF, fontSize: 13, bold: true, color: C.green, align: "center", margin: 0 });
  s.addText("New: full price", { x: 10.2, y: 2.8, w: 2.533, h: 0.4, fontFace: BF, fontSize: 13, bold: true, color: C.amber, align: "center", margin: 0 });
  const xs = [0.6, 4.745, 8.89];
  const cards = [
    ["Where", "On the provider's servers, next to the model. Not on your laptop and not in Copilot or OpenCode. It holds the model's already-computed state for that prefix, not your text, separately per organisation."],
    ["How long", "Minutes: typically 5 to 30, restarted every time it is reused. Some providers offer hours for a higher one-time write price."],
    ["What breaks it", "Any change near the start: edited instructions, a different model, compaction. Everything after the first changed token is processed again at full price."],
  ];
  cards.forEach((c, i) => card(s, { x: xs[i], y: 3.45, w: 3.845, h: 2.05, title: c[0], body: c[1], size: 13, titleSize: 16, fill: i === 2 ? C.amberTint : C.tint }));
  darkBand(s, 0.6, 5.7, CW, 0.85, "An agent session stays cheap per turn only while the start of the request doesn't change.", 18);
  s.addNotes("The model is stateless, so every turn resends the whole context. To avoid recomputing it, the provider keeps the model's intermediate state for the start of the request (the KV cache) on its own machines. If the next request starts with exactly the same tokens, that part is read from the cache at about a tenth of the input price and is faster; only the new part is processed. Order matters: tools, then system prompt, then messages. A change at any point invalidates everything after it, which is why editing instructions mid-session, switching model or compacting the history makes the next turn expensive. Lifetimes: Anthropic 5 minutes by default, refreshed on every hit, optional 1 hour at a higher write price; OpenAI 30 minutes by default on current models, optional 12 hours. Caches are not shared across organisations. Your harness decides the order of the request; you decide whether the start stays stable. Sources: platform.openai.com/docs/guides/prompt-caching; docs.anthropic.com/en/docs/build-with-claude/prompt-caching.");
}

// Tokens in practice
{
  const s = content("What tokens mean for you", "Since June 2026 Copilot bills by tokens too, so how you work shows up directly in cost and speed.", "Foundations · 09:15–09:25");
  card(s, { x: 0.6, y: 1.95, w: 5.95, h: 2.0, title: "How our tools charge", body: "Copilot: AI Credits based on input, cached and output tokens at each model's rate (1 credit = $0.01). OpenCode and direct APIs: per token from the provider.", size: 14 });
  card(s, { x: 0.6, y: 4.15, w: 5.95, h: 2.0, title: "Why a session costs more than a question", body: "A quick chat question is one small request. An hour of agent work is dozens of requests, each carrying the whole context.", size: 14, fill: C.amberTint });
  numberedRows(s, [
    ["Keep instructions stable.", "An unchanged start of the request gets cached, so it is cheaper on every turn."],
    ["Ask for the change, not an essay.", "Output is the expensive, slow part."],
    ["Match the model to the task.", "A lighter model is fine for small, clear changes."],
  ], { x: 6.85, y: 2.05, step: 1.25, w: 5.2, size: 15 });
  s.addNotes("Since June 1, 2026 all GitHub Copilot plans moved from premium requests to usage-based billing: GitHub AI Credits, consumed by input, output and cached tokens at each model's published rate (github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing). This makes the previous slide practical: a long agent session can cost tens of times more than a quick question. The habits on the right are not about being stingy; a smaller, cleaner context is also what gives better results, which is where the next slides go.");
}

// When it fills up
{
  const s = content("What happens when it fills up", "There is no silent sliding window. Either the request fails, or the tool compacts the history.", "Foundations · 09:15–09:25");
  card(s, { x: 0.6, y: 1.95, w: 5.95, h: 1.55, title: "At the API", body: "A request over the limit is rejected with an error. Older messages do not quietly fall off.", size: 14 });
  card(s, { x: 6.78, y: 1.95, w: 5.95, h: 1.55, title: "In coding tools: compaction", body: "Older turns are replaced with a summary so work can continue. Details from the summarised part can be lost.", size: 14 });
  const xs = [0.6, 4.745, 8.89];
  const tools = [
    ["Copilot CLI", "Compacts automatically in the background as the window nears its limit (about 80%)."],
    ["OpenCode", "Automatic compaction, configurable in opencode.json."],
    ["Claude Code", "Auto-compact near the limit, plus /compact and /clear."],
  ];
  tools.forEach((t, i) => card(s, { x: xs[i], y: 3.7, w: 3.845, h: 1.4, title: t[0], body: t[1], size: 13, titleSize: 15, fill: C.soft }));
  darkBand(s, 0.6, 5.3, CW, 1.25, "Quality declines gradually as the context grows. There is no magic percentage. Relevant details buried in the middle of a long context are used less reliably (Lost in the Middle, 2023; Context Rot, 2025).", 15);
  s.addNotes("This replaces slides 7 and 8 of the original deck, which described a FIFO sliding window and an 85% degradation zone. What the sources show: at the API level a request over the limit is rejected, not silently trimmed. Coding tools summarise older turns (compaction); the thresholds you see are product settings, for example Copilot CLI starts background compaction at about 80%. Research shows accuracy dropping gradually with length and with distracting content, not at a fixed cliff: Liu et al. 2023, arxiv.org/abs/2307.03172; Chroma, research.trychroma.com/context-rot. Copilot: docs.github.com/en/copilot/concepts/prompting-and-context/context-management. OpenCode: opencode.ai/v2/docs/config (compaction).");
}

// Keep the context clean
{
  const s = content("Keep the context clean", "You manage the context. These habits keep the agent focused.", "Foundations · 09:15–09:25");
  numberedRows(s, [
    ["One task, one session.", "Start fresh when you switch tasks."],
    ["Point at what matters:", "specific files or symbols, not the whole workspace."],
    ["Trim the noise:", "paste the failing part of a log, not the whole log."],
    ["Put stable rules in instruction files.", "They load every session, so you don't repeat them in chat."],
    ["Compact on purpose,", "at a natural breakpoint, not in the middle of a hard problem."],
  ], { x: 0.6, y: 2.0, step: 0.86, w: 5.9, size: 15 });
  card(s, { x: 7.4, y: 1.95, w: 5.33, h: 4.0, title: "Handoff summary, then start fresh", body: ["Goal and why", "Decisions made, and options rejected", "Current state: done, in progress, failing", "Files involved", "Next steps and open questions"], size: 15 });
  s.addText("From the original deck, and still the best manual reset: ask for this summary, open a new session, paste it.", { x: 7.4, y: 6.05, w: 5.33, h: 0.7, fontFace: BF, fontSize: 13, italic: true, color: C.muted, margin: 0 });
  s.addNotes("Practical habits that all sources agree on. Start a new session per task. Reference the specific files rather than the whole workspace. Trim logs. Keep stable rules in instruction files such as AGENTS.md or copilot-instructions.md. Compact or restart at a natural breakpoint. The handoff summary from the original deck is still valid: ask the agent to write the goal, decisions, current state, files and next steps, then start a new session with it. Built-in /compact does something similar automatically, but a handoff you read yourself lets you correct it.");
}

// Handoff in practice
{
  const s = content("Handoff in practice", "Before starting a new session, ask the agent to write down what the next one needs to know.", "Foundations · 09:15–09:25");
  fitImage(s, "s08-image29.png", 0.6, 1.95, 7.6, 3.2, 791 / 325);
  card(s, { x: 0.6, y: 5.35, w: 7.6, h: 1.25, title: "The prompt", body: "“Summarise the system architecture, the decisions and the current state. I want the new chat to know everything.”", size: 14 });
  fitImage(s, "s41-image174.gif", 8.5, 1.95, 4.23, 2.6, 498 / 304);
  card(s, { x: 8.5, y: 4.75, w: 4.23, h: 1.85, title: "Pro move", body: "Read the summary before you paste it. It is your chance to correct what the agent got wrong.", size: 14 });
  s.addNotes("A real example from the original deck: asking the model for a full summary of the architecture and decisions, to carry into a new chat. Recommend reading the summary before using it: it is the cheapest moment to fix a wrong assumption, because the new session will treat it as fact.");
}

// Section: same principles
{
  const s = section("Same engineering, new teammate", "The principles we already know, applied to agents", "Foundations · principles");
  s.addNotes("This short part explains the main idea of the day in detail. Everything we teach maps back to a practice the team already knows.");
}

// Treat the agent like a new teammate
{
  const s = content("Treat the agent like a fast new teammate", "Capable, fast and well-read. But new to our codebase, our conventions and our history.", "Foundations · principles");
  card(s, { x: 0.6, y: 1.95, w: 5.4, h: 4.6, title: "What the agent is like", body: [
    "Fast and tireless",
    "Knows a lot of public code and patterns",
    "Doesn't know our codebase, conventions or history",
    "Doesn't remember yesterday's session",
    "Sounds confident, even when it is wrong",
  ], size: 15 });
  const map = [
    ["Onboarding document", "Instructions (AGENTS.md)"],
    ["A clear ticket with acceptance criteria", "The task brief"],
    ["A design discussion before big changes", "Plan review"],
    ["Small PRs and code review", "Small tasks, inspect the diff"],
    ["No direct push to main on day one", "Branches, worktrees, approvals"],
  ];
  s.addText("What we'd give any new hire  →  what we give the agent", { x: 6.3, y: 1.95, w: 6.43, h: 0.45, fontFace: BF, fontSize: 15, bold: true, color: C.ink, margin: 0 });
  map.forEach((m, i) => {
    const y = 2.55 + i * 0.8;
    chip(s, 6.3, y, 2.95, 0.65, m[0], C.soft, C.ink, 12.5);
    arrow(s, 9.33, y + 0.17, 0.4, 0.3, C.green);
    chip(s, 9.8, y, 2.93, 0.65, m[1], C.lime, C.ink, 12.5);
  });
  s.addNotes("A helpful mental model: the agent is a very fast new teammate who has read a lot of code but knows nothing about our project and forgets everything between sessions. We already know how to make a new teammate productive: an onboarding document, clear tickets, design discussions for big changes, small PRs with review, and no direct push to main. Each of these has a direct agentic equivalent.");
}

// Principles mapping 1
{
  const s = content("Old principles, applied to agents: before the code", "The practices that make a team effective make an agent effective too.", "Foundations · principles");
  table(s, ["What we already know", "How it shows up in agentic work"], [
    ["Requirements and acceptance criteria", "A task brief with success criteria; clarify first (grill-me) when it's vague"],
    ["Design before implementation, design review", "Plan mode and plan review before any code"],
    ["Onboarding docs and coding standards", "Instructions: AGENTS.md, copilot-instructions.md, SHARED.md"],
    ["Reusable libraries, don't repeat yourself", "Skills: write the procedure once, reuse it on every task"],
    ["Separation of concerns, single responsibility", "Focused agents and subagents, one role each"],
    ["YAGNI and scope control", "Explicit boundaries and an out-of-scope list in the brief"],
  ], { x: 0.6, y: 1.95, w: CW, colW: [4.6, 7.533], rowH: 0.68, boldFirst: true, size: 14 });
  s.addNotes("Walk through each row and ask the room for the agentic equivalent before revealing it. The point is that none of this is new. Requirements become the brief, design review becomes plan review, onboarding docs become instructions, reusable libraries become skills, single responsibility becomes focused agents, and YAGNI becomes explicit scope boundaries.");
}

// Principles mapping 2
{
  const s = content("Old principles, applied to agents: during and after", "The same discipline that protects a codebase from people protects it from agents.", "Foundations · principles");
  table(s, ["What we already know", "How it shows up in agentic work"], [
    ["Small batches, vertical slices", "Small tasks, each one verifiable on its own"],
    ["TDD, tests as a specification", "A failing test first; checks the agent must run"],
    ["Code review, four eyes", "Inspect the diff; a reviewer agent for a second look"],
    ["Version control, atomic commits", "Checkpoints you can revert; branches and worktrees"],
    ["CI and a definition of done", "Verification evidence before “done”"],
    ["Documentation and ADRs", "Handoff summaries; decisions written down for the next session"],
    ["Interfaces and contracts", "A spec as the contract between agents (frontend, backend)"],
  ], { x: 0.6, y: 1.95, w: CW, colW: [4.6, 7.533], rowH: 0.6, boldFirst: true, size: 14 });
  s.addNotes("Second half of the mapping. Small batches, tests, review, version control, CI and documentation all carry over directly. When an agentic session goes wrong, the cause is very often a skipped practice: no clear requirement, no small steps, no tests, no review. That is the main lesson behind doing better agentic coding.");
}

// Useful task
{
  const s = content("Give the agent a task it can finish", "A short brief with five parts usually beats a long conversation of corrections.", "Foundations · 09:25–09:40");
  const w = (CW - 4 * 0.2) / 5;
  const parts = [
    ["Goal", "What should change, and why?"],
    ["Context", "What should it read or know first?"],
    ["Boundaries", "What is in scope, and what is not?"],
    ["Success", "What observable result means done?"],
    ["Verification", "Which check proves it?"],
  ];
  parts.forEach((p, i) => card(s, { x: 0.6 + i * (w + 0.2), y: 1.95, w, h: 2.6, num: i + 1, numTop: true, title: p[0], body: p[1], size: 14 }));
  darkBand(s, 0.6, 4.85, CW, 1.1, "Not every task needs all five spelled out. The less obvious the task, the more they matter.", 17);
  s.addNotes("This is a structure to adapt, not a magic template. Goal: what should change and why. Context: what the agent should read or know; it can discover a lot itself, so point it at what it cannot guess. Boundaries: what is in scope and what must not be touched, which is the main protection against scope drift. Success: an observable result. Verification: the check that proves it. For a trivial change, one sentence covers it. For anything involving existing behaviour, these five parts save several rounds of corrections.");
}

// Prompt principles
{
  const s = content("Prompt principles that still hold", "A prompt is the instruction you give the model. A vague prompt gets a vague result.", "Foundations · 09:25–09:40");
  numberedRows(s, [
    ["Give context:", "who you are, what the goal is."],
    ["Be specific", "about the result and its format."],
    ["Say what you don't want.", ""],
    ["Don't be afraid of a long prompt", "when the task needs it."],
  ], { x: 0.6, y: 2.05, step: 0.95, w: 4.6, size: 15 });
  fitImage(s, "s05-image6.png", 5.9, 1.95, 6.83, 3.95, 838 / 483);
  s.addText("A real planning prompt from the original deck: long, detailed, and full of context.", { x: 5.9, y: 6.0, w: 6.83, h: 0.5, fontFace: BF, fontSize: 13, italic: true, color: C.muted, margin: 0 });
  s.addNotes("From the original deck. These basics still apply in agentic work: give context, be specific about the result, say what you don't want, and don't be afraid of a long prompt when the task is complex. The screenshot is a real, long planning prompt; length is fine when every part carries information the model could not guess.");
}

// Same request, two briefs
{
  const s = content("Same request, two briefs", "The second brief is longer, but every added sentence removes a guess.", "Foundations · 09:25–09:40");
  box(s, 0.6, 1.95, 5.95, 3.6, C.amberTint);
  s.addText([
    { text: "Vague", options: { bold: true, fontSize: 16, color: C.amber, breakLine: true } },
    { text: "“Improve this code. Use clean code and best practices.”", options: { italic: true, fontSize: 16, color: C.ink, breakLine: true, paraSpaceBefore: 8 } },
    { text: "The agent has to guess what “improve” means, may rewrite more than you wanted, and has no way to show it kept the behaviour.", options: { fontSize: 14, color: C.ink, paraSpaceBefore: 12 } },
  ], { x: 0.6, y: 1.95, w: 5.95, h: 3.6, fontFace: BF, valign: "top", margin: 14 });
  box(s, 6.78, 1.95, 5.95, 3.6, C.tint);
  s.addText([
    { text: "Useful", options: { bold: true, fontSize: 16, color: C.green, breakLine: true } },
    { text: "“Simplify the validation logic in this component while keeping its behaviour and public props. Read the component and its tests first. Follow the existing patterns, keep changes inside the validation, run the tests, and tell me anything you could not verify.”", options: { italic: true, fontSize: 15, color: C.ink, paraSpaceBefore: 8 } },
  ], { x: 6.78, y: 1.95, w: 5.95, h: 3.6, fontFace: BF, valign: "top", margin: 14 });
  const tags = [["Goal", 0.85], ["Context", 1.05], ["Boundaries", 1.3], ["Success", 1.0], ["Verification", 1.3]];
  let x = 6.78;
  tags.forEach((t) => { chip(s, x, 5.75, t[1], 0.5, t[0], C.soft, C.ink, 12); x += t[1] + 0.1; });
  s.addNotes("Read both briefs aloud. Ask the room which missing detail in the vague version would most affect the result. Then map the useful brief to the five parts: the goal is simpler validation with the same behaviour, the context is the component and its tests, the boundaries are inside the validation and the existing patterns, and the verification is running the tests and reporting what could not be verified.");
}

// Open the design, constrain the implementation
{
  const s = content("Open the design, constrain the implementation", "Match the brief to the phase you are in.", "Foundations · 09:25–09:40");
  const cards = [
    { x: 0.6, title: "Exploring a design: give it room", desc: "When you are not sure of the solution, don't lock it down. Ask for options and trade-offs.", bad: "“Write a script that saves uploaded images to a local folder on the server.”", good: "“We need to store and serve user images. What are the options in our cloud setup, and their trade-offs?”" },
    { x: 6.78, title: "Implementing: give context and constraints", desc: "Once the direction is chosen, supply the existing code, the hard constraints and what you already tried.", bad: "“Write a function that applies a 10% discount to the cart.”", good: "“We use TypeScript. The Cart interface is attached. Add a VIP discount without mutating the original object, and add tests.”" },
  ];
  cards.forEach((c) => {
    box(s, c.x, 1.95, 5.95, 4.65, C.tint);
    s.addText([
      { text: c.title, options: { bold: true, fontSize: 16, color: C.ink, breakLine: true } },
      { text: c.desc, options: { fontSize: 14, color: C.ink, breakLine: true, paraSpaceBefore: 6 } },
      { text: "Instead of", options: { bold: true, fontSize: 13, color: C.amber, breakLine: true, paraSpaceBefore: 14 } },
      { text: c.bad, options: { italic: true, fontSize: 14, color: C.ink, breakLine: true } },
      { text: "Try", options: { bold: true, fontSize: 13, color: C.green, breakLine: true, paraSpaceBefore: 12 } },
      { text: c.good, options: { italic: true, fontSize: 14, color: C.ink } },
    ], { x: c.x, y: 1.95, w: 5.95, h: 4.65, fontFace: BF, valign: "top", margin: 14 });
  });
  s.addNotes("This comes from the original deck. When the solution is open, constraining too early closes off options the model could have proposed; ask for options and trade-offs instead. When you are implementing, the opposite applies: give it as much relevant context as possible, including existing code, hard constraints and what you already tried. Don't expect it to read your mind.");
}

// Architecture conversation
{
  const s = content("Ask for the architecture before the implementation", "A real conversation: a focused question that still leaves room for the model to propose.", "Foundations · 09:25–09:40");
  fitImage(s, "s18-image68.png", 0.6, 1.95, 5.6, 4.65, 815 / 689, { bottom: 0.13 });
  card(s, { x: 6.6, y: 1.95, w: 6.13, h: 4.65, title: "Why it works", body: [
    "The question is focused: the stack and the problem are stated.",
    "It leaves the solution open, so the model can propose options.",
    "The answer gets to the point instead of explaining basics.",
    "It offers trade-offs, not a single answer you have to trust blindly.",
  ], size: 15 });
  s.addNotes("From the original deck: a real question about role-based authorisation in a Spring Boot and GraphQL project. Use it to show the 'open the design' advice in practice. The question states the stack and the problem but does not dictate the solution, and the answer compares approaches with their trade-offs. Decide on the direction first, then switch to a constrained implementation brief.");
}

// Make clean code concrete
{
  const s = content("Turn “clean code” into expectations the agent can follow", "Words like “clean code” do steer the model. Concrete expectations steer it more consistently, and you can check them.", "Foundations · 09:25–09:40");
  const labels = ["clean code", "best practices", "production-ready", "SOLID"];
  labels.forEach((l, i) => chip(s, 0.9, 2.1 + i * 0.85, 3.6, 0.62, "“" + l + "”", C.amberTint, C.ink, 15));
  arrow(s, 4.85, 3.35, 0.9, 0.5, C.green);
  card(s, { x: 6.1, y: 1.95, w: 6.63, h: 4.25, title: "Concrete expectations", body: [
    "Read the relevant code before changing it.",
    "Stay on task: no unrequested refactors or features.",
    "Keep the surrounding formatting and conventions.",
    "Name methods and conditions in domain language.",
    "Verify it builds and behaves correctly before saying it is done.",
  ], size: 15 });
  s.addText("Examples from our shared instructions: instructions/SHARED.md", { x: 6.1, y: 6.3, w: 6.63, h: 0.4, fontFace: BF, fontSize: 13, italic: true, color: C.muted, margin: 0 });
  s.addNotes("This answers a question from the interviews: which keywords push the agent in the right direction. Labels like clean code or best practices do have an effect, but different models and people read them differently. Writing down what you actually mean is more reliable and also checkable in a review. The examples on the right are taken from our shared instructions file. Personal preferences are fine; just present them as preferences, and use the project's real conventions for project rules.");
}

// Instructions, skills, agents
{
  const s = content("Instructions, skills and agents", "Three ways to make good behaviour reusable. Each answers a different question.", "Foundations · 09:40–10:00");
  const xs = [0.6, 4.745, 8.89];
  const kinds = [
    ["I", "Instructions", [["Answers", "What always applies here?"], ["Loaded", "Every session, automatically."], ["Examples", "SHARED.md, AGENTS.md, copilot-instructions.md"], ["Keep it", "Short. It costs context in every session."]]],
    ["S", "Skills", [["Answers", "How do we handle this kind of task?"], ["Loaded", "On demand, when the task matches its description or you invoke it."], ["Examples", "grill-me, backend-dev-guidelines"], ["Keep it", "Focused on one kind of task."]]],
    ["A", "Agents", [["Answers", "Who handles this responsibility?"], ["Loaded", "When you select it, or the main agent delegates to it."], ["Examples", "plan-reviewer, a code reviewer"], ["Keep it", "One clear role and a clear output."]]],
  ];
  kinds.forEach((k, i) => labelled(s, { x: xs[i], y: 1.95, w: 3.845, h: 4.65, num: k[0], title: k[1], rows: k[2], size: 14 }));
  s.addNotes("This is the map for the next slides. Instructions are standing rules loaded in every session. Skills are procedures loaded only when relevant, which keeps the context light. Agents are roles: you can switch to one, or the main agent can delegate a bounded task to it. The categories overlap a little, and that is fine. The useful question is which one answers the problem you have.");
}

// Instructions
{
  const s = content("Instructions", "Standing rules the harness adds to every session. Define them once instead of repeating them.", "Foundations · 09:40–10:00");
  card(s, { x: 0.6, y: 1.95, w: 6.85, h: 1.95, title: "Layers", body: [
    { b: "Personal / global: ", t: "your style and habits, in every project." },
    { b: "Repository: ", t: "stack, conventions and commands, for everyone on the project." },
    { b: "Path-specific (where supported): ", t: "rules for one area, such as the frontend folder." },
  ], size: 13 });
  card(s, { x: 0.6, y: 4.05, w: 6.85, h: 1.3, title: "What to include", body: "Stack and versions, conventions the code doesn't show, how to build and test, and what not to do.", size: 13 });
  card(s, { x: 0.6, y: 5.5, w: 6.85, h: 1.15, title: "Where the harness reads them", body: "OpenCode: AGENTS.md (global and project).  Copilot: .github/copilot-instructions.md, AGENTS.md, personal instructions.", size: 13, fill: C.soft });
  fitImage(s, "s22-image84.jpg", 7.75, 1.95, 4.98, 4.0, 1920 / 1040);
  s.addText("Our global instructions file, source next to the rendered preview.", { x: 7.75, y: 6.0, w: 4.98, h: 0.6, fontFace: BF, fontSize: 12, italic: true, color: C.muted, margin: 0 });
  s.addNotes("Explain the layers and their scope. Personal instructions travel with you; repository instructions are shared with everyone on the project; some harnesses also support rules for a specific path. Good instructions contain what the agent cannot infer from the code: who you are, the stack and versions, unwritten conventions, how to build and test, and things to avoid (for example 'don't explain basic concepts'). Keep them lean, because they are loaded in every session and cost context. The screenshot is our real global instructions file from the original deck.");
}

// Anatomy of a skill
{
  const s = content("Anatomy of a skill", "Our frontend skill: a Markdown file that tells the agent how we build React features here.", "Foundations · 09:40–10:00");
  s.addImage({ path: path.join(ASSETS, "skill-structure.jpg"), x: 0.6, y: 1.95, w: 7.4, h: 4.07 });
  numberedRows(s, [
    ["name + description:", "the harness reads this to decide when the skill is relevant. Write it as “use when…”."],
    ["When to use:", "makes the trigger explicit for the agent and for teammates."],
    ["Decision tree:", "how we do this kind of task here, with the choices and conventions."],
    ["Checklists and resources:", "detail files loaded only when needed, so the skill stays light."],
  ], { x: 8.3, y: 2.0, step: 1.05, w: 3.75, size: 13.5, d: 0.42 });
  s.addNotes("Walk through the frontend-dev-guidelines skill. The frontmatter name and description are what the harness uses to decide when to load the skill, so the description should say when to use it. The body explains how we do this kind of work in our stack: a decision tree, conventions and checklists. Larger details live in resource files that are loaded only when needed. A useful skill can be very short, like grill-me, which is only a few lines.");
}

// Skill resources
{
  const s = content("Skills can carry resource files", "The main SKILL.md stays short. Details live in separate files, loaded only when the task needs them.", "Foundations · 09:40–10:00");
  fitImage(s, "s29-image82.jpg", 0.6, 1.95, 7.6, 4.15, 1920 / 1038);
  card(s, { x: 8.5, y: 1.95, w: 4.23, h: 2.1, title: "Main file", body: "When to use the skill, the decision tree, and links to the resources.", size: 14 });
  card(s, { x: 8.5, y: 4.2, w: 4.23, h: 1.9, title: "Resource files", body: "Deep detail on one topic, such as data fetching with Apollo GraphQL.", size: 14, fill: C.soft });
  s.addText("Our frontend skill's data-fetching resource file.", { x: 0.6, y: 6.15, w: 7.6, h: 0.45, fontFace: BF, fontSize: 12, italic: true, color: C.muted, margin: 0 });
  s.addNotes("From the original deck. Our frontend skill keeps the main file short and links to resource files such as data-fetching.md. The agent reads a resource only when the task touches that topic, so the skill doesn't flood the context. This is the same idea as progressive disclosure in documentation.");
}

// Seeing a skill in use
{
  const s = content("Seeing a skill in use", "Copilot CLI on a backend task: the harness lists what is available, and the agent loads the matching skill.", "Foundations · 09:40–10:00");
  s.addImage({ path: path.join(ASSETS, "copilot-cli.jpg"), x: 0.6, y: 1.95, w: 7.4, h: 4.16 });
  numberedRows(s, [
    ["“Environment loaded: 7 skills, 1 agent”:", "the harness shows what is available."],
    ["skill(backend-dev-guidelines):", "the agent loaded the skill for this task."],
    ["Then it searched and read", "the relevant files before proposing a change."],
  ], { x: 8.3, y: 2.0, step: 1.0, w: 3.75, size: 13.5, d: 0.42 });
  card(s, { x: 8.3, y: 5.05, w: 4.43, h: 1.4, title: "Tip", body: "Expected a skill and don't see it? Ask “Which skills did you use?”, or invoke it by name.", size: 13, titleSize: 14, fill: C.soft });
  s.addNotes("Show how to confirm that guidance was actually used. At the top Copilot CLI reports what it loaded. In the session you can see skill(backend-dev-guidelines) being called before the agent reads the code. If a skill you expected did not load, check its description, ask the agent which skills it used, or invoke it explicitly.");
}

// Three ways a skill gets loaded
{
  const s = content("Three ways a skill gets loaded", "Usually the agent decides from the description. You can also name the skill yourself, or let a hook load it every time.", "Foundations · 09:40–10:00");
  const xs = [0.6, 4.745, 8.89];
  card(s, { x: xs[0], y: 1.95, w: 3.845, h: 2.75, num: 1, numTop: true, title: "The agent decides", body: "It matches your task to the skill's description. Convenient, but it can miss.", size: 14 });
  card(s, { x: xs[1], y: 1.95, w: 3.845, h: 2.75, num: 2, numTop: true, title: "You decide", body: "Name it in the prompt: “Use backend-dev-guidelines.” Reliable, but you must remember.", size: 14 });
  card(s, { x: xs[2], y: 1.95, w: 3.845, h: 2.75, num: 3, numTop: true, title: "A hook decides", body: "A script the harness runs at a fixed point, such as session start or every prompt. It adds the skill to the context.", size: 14, fill: C.soft });
  box(s, 0.6, 4.95, CW, 1.6, C.dark);
  s.addText([
    { text: "Real examples", options: { bold: true, color: C.lime, breakLine: true } },
    { text: "Superpowers: a session-start hook loads its using-superpowers skill in every session.", options: { color: C.white, bullet: { indent: 14 }, breakLine: true } },
    { text: "Our skill-developer skill: a prompt hook checks keywords in skill-rules.json and suggests the matching skill.", options: { color: C.white, bullet: { indent: 14 } } },
  ], { x: 0.6, y: 4.95, w: CW, h: 1.6, fontFace: BF, fontSize: 14, valign: "middle", margin: 14 });
  s.addNotes("Three ways a skill ends up in the context. 1) Automatic: the harness lists each skill's name and description, and the model decides to load one when the task matches. This is what we saw on the previous slide, and it can miss, as the first run did. 2) Explicit: you name the skill in the prompt. 3) Hooks: scripts the harness runs at fixed lifecycle points. Copilot CLI and VS Code support sessionStart and userPromptSubmitted hooks that return additionalContext, which the harness injects into the conversation (docs.github.com/en/copilot/reference/hooks-reference). Claude Code has the same events as SessionStart and UserPromptSubmit (code.claude.com/docs/en/hooks). OpenCode does this through plugins. Superpowers uses a session-start hook to inject its using-superpowers skill, which is why it shows up in every session. Our skill-developer skill describes a UserPromptSubmit hook that reads skill-rules.json, matches keywords and intent patterns in the prompt, and adds a skill suggestion before the model sees it. A hook guarantees the text reaches the context; the model still has to follow it.");
}

// Writing skills with AI
{
  const s = content("Let AI help you write the skill", "Writing a good skill from scratch takes time. Let a skill-writing skill interview you, then review what it produces.", "Foundations · 09:40–10:00");
  fitImage(s, "s09-image30.jpg", 0.6, 1.95, 7.6, 3.85, 1920 / 972);
  s.addText("Comparing two versions of a SKILL.md with Claude: optimised versus comprehensive.", { x: 0.6, y: 5.9, w: 7.6, h: 0.5, fontFace: BF, fontSize: 12, italic: true, color: C.muted, margin: 0 });
  card(s, { x: 8.5, y: 1.95, w: 4.23, h: 2.6, title: "Interview first", body: ["Tailwind or CSS modules?", "How do you manage state?", "Anti-patterns the agent must avoid?"], size: 14 });
  card(s, { x: 8.5, y: 4.7, w: 4.23, h: 1.9, title: "Then try it", body: "Run it on a task where it should load, and one where it shouldn't.", size: 14, fill: C.soft });
  s.addNotes("From the original deck. Tools like Anthropic's Skill Creator are themselves skills: they interview you about your project, your stack and your preferences, then write the SKILL.md for you. Ten minutes of conversation produces a usable first draft. You can also ask a model to compare or tighten two versions of a skill, as in the screenshot. Then try the skill on real tasks and adjust.");
}

// Extending the harness
{
  const s = content("Extending the harness", "Harnesses can be extended with plugins: packaged skills, agents, commands and hooks.", "Foundations · 09:40–10:00");
  const xs = [0.6, 4.745, 8.89];
  card(s, { x: xs[0], y: 1.95, w: 3.845, h: 3.0, num: 1, numTop: true, title: "Plugins from a marketplace", body: "Install a bundle of skills and agents in one step, for example Superpowers.", size: 14 });
  card(s, { x: xs[1], y: 1.95, w: 3.845, h: 3.0, num: 2, numTop: true, title: "Skill Creator", body: "A skill for creating skills: it interviews you and writes the SKILL.md.", size: 14 });
  card(s, { x: xs[2], y: 1.95, w: 3.845, h: 3.0, num: 3, numTop: true, title: "Language server (LSP)", body: "Where supported, compile and type errors reach the agent directly, so it notices its own mistakes sooner.", size: 14 });
  box(s, 0.6, 5.2, CW, 1.35, C.dark);
  s.addText([
    { text: "Copilot CLI", options: { bold: true, color: C.lime, breakLine: true } },
    { text: "copilot plugin marketplace add obra/superpowers-marketplace", options: { fontFace: "Courier New", color: C.white, breakLine: true } },
    { text: "copilot plugin install superpowers@superpowers-marketplace", options: { fontFace: "Courier New", color: C.white } },
  ], { x: 0.6, y: 5.2, w: CW, h: 1.35, fontFace: BF, fontSize: 14, valign: "middle", margin: 14 });
  s.addNotes("From the original deck, slide 31. Plugins package skills, agents, commands and hooks, and install from a marketplace with one command. Skill Creator helps write new skills. A language server integration gives the agent compile and type errors directly. The command shown is the documented Superpowers install for Copilot CLI; OpenCode installs Superpowers through its own plugin configuration.");
}

// Agents and subagents
{
  const s = content("Agents and subagents", "An agent is a role you can switch to or delegate to. Delegation starts a fresh context, so the handoff matters.", "Foundations · 09:40–10:00");
  const xs = [0.6, 4.745, 8.89];
  card(s, { x: xs[0], y: 1.95, w: 3.845, h: 3.3, title: "A custom agent defines", body: ["Its role and instructions", "Tools and permissions, for example a read-only reviewer", "Optionally, the model", "The output it should return"], size: 14 });
  card(s, { x: xs[1], y: 1.95, w: 3.845, h: 3.3, title: "When work is delegated", body: ["The subagent starts with a fresh context", "It sees only the task it is handed, not your conversation", "It returns a report; the caller decides what to do with it"], size: 14 });
  card(s, { x: xs[2], y: 1.95, w: 3.845, h: 3.3, title: "A good handoff", body: ["Goal and scope", "Relevant files and decisions", "What “done” looks like", "What to report back"], size: 14 });
  placeholder(s, 0.6, 5.45, CW, 1.15, "Screenshot: agents/plan-reviewer.md, and a delegation to it in your harness.");
  s.addNotes("A custom agent is a configured role: instructions, allowed tools, possibly its own model, and the output it should produce. Delegation is different from just switching agents: a delegated subagent starts with a fresh context and does not know your conversation, so the handoff must be self-contained. The caller then reviews the report. Splitting work between roles can keep each one focused; whether it is worth the extra coordination depends on the task.");
}

// A team of agents
{
  const s = content("A team of agents", "When the work splits cleanly, you become the one who coordinates the roles.", "Foundations · 09:40–10:00");
  const roles = [
    ["Tech lead", "Turns a vague business requirement into a technical spec: architecture, signatures, schemas."],
    ["Backend", "Reads the spec only. Builds the logic and exposes the API exactly as agreed."],
    ["Frontend", "Reads the same spec. Builds the UI against the agreed API."],
    ["QA", "Reads the spec and writes integration tests to find where the others went wrong."],
  ];
  roles.forEach((r, i) => {
    const y = 1.95 + i * 1.15;
    card(s, { x: 0.6, y, w: 7.2, h: 1.0, num: i + 1, title: r[0], body: r[1], size: 13, titleSize: 14 });
  });
  fitImage(s, "s39-image165.gif", 8.2, 1.95, 4.53, 3.0, 262 / 203);
  card(s, { x: 8.2, y: 5.1, w: 4.53, h: 1.45, title: "The spec is the contract", body: "Each agent works only in its own area, against the same written source of truth.", size: 13, fill: C.soft });
  s.addNotes("From the original deck, slides 39 and 40. A single agent trying to do frontend, backend and tests in one long session tends to lose track; splitting the work by role, with a spec as the shared contract, keeps each part focused. This is a suggestion for when the work splits cleanly along an interface, like a frontend and backend agreeing on an API. Agentcraft, which we try after lunch, is built on this idea of specialist roles.");
}

// Quick check
{
  const s = content("Quick check: where does it belong?", "Discuss with your neighbour: each of these comes from our toolkit. Where would you put it?", "Foundations · 09:40–10:00");
  const w = 2.92;
  const qs = [
    "“Commit messages use type: subject, at most 50 characters, imperative mood.”",
    "“To fetch data in React: write a .graphql file, run typegen, use the generated hook.”",
    "“A read-only reviewer that checks a plan and reports the critical issues.”",
    "“Every session must start with our core skill loaded, without anyone asking.”",
  ];
  qs.forEach((q, i) => card(s, { x: 0.6 + i * (w + 0.15), y: 1.95, w, h: 2.75, num: i + 1, numTop: true, body: q, size: 15 }));
  s.addText("Options:", { x: 0.6, y: 5.05, w: 1.3, h: 0.55, fontFace: BF, fontSize: 16, bold: true, color: C.ink, valign: "middle", margin: 0 });
  chip(s, 2.0, 5.05, 2.0, 0.55, "Instruction");
  chip(s, 4.15, 5.05, 1.6, 0.55, "Skill");
  chip(s, 5.9, 5.05, 1.6, 0.55, "Agent");
  chip(s, 7.65, 5.05, 1.6, 0.55, "Hook");
  s.addNotes("Suggested answers, all from our own toolkit. 1: an instruction. It applies to every change, so it belongs in the always-loaded file; ours is in SHARED.md and GIT_COMMIT.md. 2: a skill. It is a procedure for one kind of task, needed only when fetching data; ours is the data-fetching resource of the frontend skill. 3: an agent. It is a role with its own tools (read-only), its own fresh context and a defined report; ours is plan-reviewer, shown on slide 40. 4: a hook. Only a hook guarantees something happens at a fixed point regardless of what the model decides; Superpowers loads its core skill this way. If people argue for another answer, ask what would happen if the model forgot or skipped it.");
}

// Choose how to start
{
  const s = content("Choose how to start", "Match the amount of process to how uncertain the task is.", "Foundations · 10:00–10:10");
  table(s, ["Situation", "Start with", "Example"], [
    ["Clear, small, local change", "Ask directly, then check the build and tests", "Rename projectName to name in the project DTO"],
    ["Unclear or open to interpretation", "Let the agent interview you first", "“Add archiving”: restorable? Who may archive?"],
    ["Known outcome, several changes", "A short plan, then implement", "Add archived through the database, API and UI"],
    ["Risky or hard to reverse", "Plan, have it reviewed, then act", "A migration that archives old projects in production"],
    ["Repeated failure with no new evidence", "Stop, inspect, change strategy", "Third attempt at the same failing test"],
  ], { x: 0.6, y: 1.95, w: CW, colW: [3.6, 3.9, 4.633], rowH: 0.6, boldFirst: true, size: 14 });
  darkBand(s, 0.6, 6.0, CW, 0.7, "Planning pays off when it settles a decision. A longer plan is not a better plan.", 16);
  s.addNotes("One running example: archiving projects, the same task from slides 36 and 40. A rename is clear and local, so just ask and check. “Add archiving” sounds clear but hides decisions: can archived projects be restored, who may archive, what happens to their tasks, do they still appear in search. Ask the agent to interview you one question at a time, with its recommended answer for each, and to look in the code instead of asking when it can. Once the behaviour is settled, adding the field through three layers needs a short plan so nothing is missed. A production migration is hard to undo, so the plan gets a review first, for example by a reviewer agent. When the agent keeps failing without learning anything new, stop; we cover that properly at 11:40.");
}

// Spec-driven development
{
  const s = content("Spec-driven development", "When agents type fast, the bottleneck moves from writing code to defining it precisely.", "Foundations · 10:00–10:10");
  const flow = ["Spec", "Plan", "Tasks", "Implement"];
  const w = 2.55;
  const gap = (CW - 4 * w) / 3;
  flow.forEach((f, i) => {
    const x = 0.6 + i * (w + gap);
    chip(s, x, 1.95, w, 0.85, f, i === 3 ? C.green : C.soft, i === 3 ? C.white : C.ink, 17);
    if (i < 3) arrow(s, x + w + (gap - 0.45) / 2, 2.22, 0.45, 0.32, C.green);
  });
  card(s, { x: 0.6, y: 3.1, w: 7.3, h: 3.45, title: "What changes for the developer", body: [
    "From “how” to “what”: less syntax, more architecture, dependencies and side effects.",
    "Typing is no longer the bottleneck; defining the problem sharply is.",
    "The spec, not the chat history, is the source of truth the agent works from.",
  ], size: 15 });
  card(s, { x: 8.15, y: 3.1, w: 4.58, h: 3.45, title: "In practice", body: "GitHub Spec Kit formalises spec → plan → tasks → implement. Keep each spec small enough to review, so it stays a living document rather than a big upfront phase.", size: 14, fill: C.soft });
  s.addNotes("From the original deck, slide 38, updated. The idea: when an agent can write thousands of lines a minute, the valuable skill is specifying precisely what the code should do. Spec-driven development makes the spec the interface you run the agent through. GitHub's open-source Spec Kit is one well-known implementation. Keep specs small and iterative; a huge upfront spec has the same problems waterfall had.");
}

// Useful plan
{
  const s = content("What a useful plan contains", "A plan is worth reading when it makes decisions you can agree with, correct or reject.", "Foundations · 10:00–10:10");
  card(s, { x: 0.6, y: 1.95, w: 6.1, h: 4.65, title: "Ask the plan to include", body: [
    { b: "Goal and why: ", t: "what changes and for whom." },
    { b: "Decisions and assumptions: ", t: "what it resolved, and what it is asking you." },
    { b: "Affected areas: ", t: "files, APIs, data." },
    { b: "Steps: ", t: "small slices, each one verifiable." },
    { b: "Verification: ", t: "which tests or checks prove each step." },
    { b: "Out of scope: ", t: "what it will not touch." },
  ], size: 14 });
  card(s, { x: 6.95, y: 1.95, w: 5.78, h: 1.6, title: "Generic plan", body: "1. Analyse the code  2. Implement the feature  3. Write tests.  Nothing to review: no decisions.", size: 13, fill: C.amberTint });
  card(s, { x: 6.95, y: 3.7, w: 5.78, h: 2.9, title: "Useful plan (excerpt)", body: [
    "Archived projects are excluded from the default list query.",
    "PATCH /projects/{id} accepts archived; existing clients unaffected.",
    "UI toggle shows archived; hidden by default.",
    "Checks: repository test, API contract test, UI test.",
    "Out of scope: deleting projects.",
  ], size: 13 });
  s.addNotes("Built on the PLAN.md slide from the original deck. A plan is useful when it records decisions you can review: what it assumed, what it will change, how each step will be checked, and what it will not touch. A generic list of phases looks like planning but gives you nothing to approve or correct. The example on the right is deliberately from a different domain than the exercise.");
}

// Stay in control
{
  const s = content("Stay in control while it runs", "You don't need to watch every keystroke, but you do need checkpoints.", "Foundations · 10:00–10:10");
  box(s, 0.6, 1.95, 5.95, 4.65, C.tint);
  s.addText("Checkpoints", { x: 0.75, y: 1.99, w: 5.6, h: 0.5, fontFace: BF, fontSize: 17, bold: true, color: C.ink, margin: 0 });
  numberedRows(s, [
    "Review the plan or the questions before any code.",
    "Glance at the first edits: right files, right direction?",
    "Inspect the full diff.",
    "Run the checks yourself, or read their output.",
  ], { x: 0.85, y: 2.75, step: 0.9, w: 4.7, size: 15, d: 0.44 });
  card(s, { x: 6.78, y: 1.95, w: 5.95, h: 4.65, title: "Signals to step in", body: [
    "It repeats the same fix without new information.",
    "It touches files unrelated to the task.",
    "It invents APIs, configuration or requirements.",
    "It changes the requirement to make a test pass.",
    "It says “done” without evidence.",
  ], size: 15, fill: C.amberTint, titleColor: C.amber });
  s.addNotes("Give people concrete checkpoints. The cheapest moment to correct an agent is before it writes code, at the plan or the clarifying questions. The second cheapest is the first few edits. Then the diff and the checks. The signals on the right mean it is time to interrupt; we practise recovering from them before lunch.");
}

// Mermaid
{
  const s = content("Keep the mental model: diagrams as code", "An agent can change dozens of files a minute. A diagram helps you keep up, and gives the next session a map.", "Foundations · 10:00–10:10");
  box(s, 0.6, 1.95, 5.6, 4.6, C.dark);
  s.addText([
    { text: "architecture.mmd", options: { bold: true, color: C.lime, breakLine: true, fontFace: BF } },
    { text: "graph LR", options: { breakLine: true } },
    { text: "  UI[React app] -->|GraphQL| API[Backend]", options: { breakLine: true } },
    { text: "  API --> Auth{Auth service}", options: { breakLine: true } },
    { text: "  Auth -->|valid| DB[(Database)]", options: { breakLine: true } },
    { text: "  Auth -->|invalid| Err[401]", options: {} },
  ], { x: 0.6, y: 1.95, w: 5.6, h: 4.6, fontFace: "Courier New", fontSize: 13.5, color: C.white, valign: "top", margin: 18 });
  card(s, { x: 6.5, y: 1.95, w: 6.23, h: 1.4, title: "Diagram as code", body: "Mermaid draws flowcharts and architecture from plain text inside Markdown.", size: 14 });
  card(s, { x: 6.5, y: 3.5, w: 6.23, h: 1.45, title: "Ask the agent to keep it current", body: "“After every significant change, update architecture.mmd to match.”", size: 14 });
  card(s, { x: 6.5, y: 5.1, w: 6.23, h: 1.45, title: "It works both ways", body: "A picture for you, and a compact map of the system for the agent next session.", size: 14, fill: C.soft });
  s.addNotes("From the original deck, slide 34. Humans lose the mental model when an agent changes many files quickly. Mermaid diagrams are plain text, so the agent can maintain them as part of the work. The same file gives you a visual overview and gives the next agent session a compact description of the architecture.");
}

// You own the result
{
  const s = content("You own the result", "Match the review effort to the risk. The agent proposes; you approve.", "Foundations · 10:00–10:10");
  table(s, ["Risk", "Approach", "Typical size"], [
    ["Low", "Autocomplete and a quick look", "A few lines"],
    ["Medium", "Chat or agent, with a careful code review", "A function or class"],
    ["High", "Agent with a plan and staged approval", "A feature"],
  ], { x: 0.6, y: 1.95, w: 7.3, colW: [1.3, 4.0, 2.0], rowH: 0.68, boldFirst: true, size: 14 });
  darkBand(s, 0.6, 4.95, 7.3, 1.6, "Don't ask for code you couldn't review yourself.", 22);
  card(s, { x: 8.2, y: 1.95, w: 4.53, h: 4.6, title: "A real story: the video feature", body: "A demo deadline. The agent produced the code, it ran, we committed. It worked, but it was not maintainable or up to our standards. Two weeks of refactoring followed.\n\nWorks is not the same as right.", size: 15, fill: C.amberTint });
  s.addNotes("From the original deck. The risk table is a rule of thumb for how much process and review to apply. The video feature story makes the point concrete: working code is not necessarily maintainable code. And the rule at the bottom: be more sceptical the further the generated code is from your own expertise. A backend developer can easily trust frontend code they would never accept in their own area, and the other way round.");
}

// Section: Buzzwords
{
  const s = section("Buzzwords, decoded", "The terms you keep hearing, and what they actually mean", "Buzzwords");
  s.addNotes("A reference section. Use as much of it as time allows, or leave it as a handout. Terms marked 'hype' are loosely defined or used mostly for marketing.");
}

// Vibe coding vs agentic engineering
{
  const s = content("Vibe coding vs. agentic engineering", "Both use agents to write the code. The difference is whether anyone engineers the result.", "Buzzwords");
  box(s, 0.6, 1.95, 5.95, 3.9, C.amberTint);
  s.addText([
    { text: "Vibe coding", options: { bold: true, fontSize: 20, color: C.amber, breakLine: true } },
    { text: "Andrej Karpathy, February 2025", options: { fontSize: 12, italic: true, color: C.muted, breakLine: true } },
    { text: "Build by prompting and never read the code. Accept the changes, paste errors back, see if it works.", options: { fontSize: 15, color: C.ink, breakLine: true, paraSpaceBefore: 10 } },
    { text: "Fine for throwaway prototypes. Risky for anything you have to maintain.", options: { fontSize: 15, bold: true, color: C.ink, paraSpaceBefore: 10 } },
  ], { x: 0.6, y: 1.95, w: 5.95, h: 3.9, fontFace: BF, valign: "top", margin: 16 });
  box(s, 6.78, 1.95, 5.95, 3.9, C.tint);
  s.addText([
    { text: "Agentic engineering", options: { bold: true, fontSize: 20, color: C.green, breakLine: true } },
    { text: "Karpathy, February 2026", options: { fontSize: 12, italic: true, color: C.muted, breakLine: true } },
    { text: "Professionals direct agents to write most of the code, then review and verify it themselves.", options: { fontSize: 15, color: C.ink, breakLine: true, paraSpaceBefore: 10 } },
    { text: "This is what today is about.", options: { fontSize: 15, bold: true, color: C.ink, paraSpaceBefore: 10 } },
  ], { x: 6.78, y: 1.95, w: 5.95, h: 3.9, fontFace: BF, valign: "top", margin: 16 });
  s.addText("“Vibe coding” is now often used loosely for any AI-assisted coding, so check what people mean.", { x: 0.6, y: 6.05, w: CW, h: 0.5, fontFace: BF, fontSize: 14, italic: true, color: C.muted, margin: 0 });
  s.addNotes("Karpathy coined 'vibe coding' in February 2025 for building software by prompting without reading the code. A year later he used 'agentic engineering' for the professional version: agents write most of the code, and engineers direct, review and verify. Martin Fowler notes that 'vibe coding' is now often used loosely for any AI-assisted coding. Sources: martinfowler.com/bliki/VibeCoding.html and x.com/karpathy/status/2019137879310836075.");
}

// Buzzwords: ways of working
{
  const s = content("Buzzwords: ways of working", null, "Buzzwords");
  termTable(s, [
    ["Agentic engineering", "Agents write most of the code; engineers direct, review and verify it."],
    ["Context engineering", "Deciding what goes into the context window: instructions, files, tool results, memory. The successor to “prompt engineering”."],
    ["Spec-driven development", "Spec, then plan, then tasks, then implementation. The spec, not the chat, is the source of truth (e.g. GitHub Spec Kit)."],
    ["Harness engineering", "Shaping the environment around the agent so it works reliably: docs, linters, tests, feedback loops (OpenAI, February 2026)."],
    ["Human-in-the-loop", "A person approves risky actions or reviews results at checkpoints."],
    ["Software 3.0", "Natural-language prompts as a kind of program, after hand-written code (1.0) and neural-network weights (2.0).", "HYPE"],
  ]);
  s.addNotes("Context engineering replaced 'prompt engineering' as the popular term in 2025: the skill is less about wording and more about what information the model has. Harness engineering is OpenAI's term from February 2026 (openai.com/index/harness-engineering) for building the docs, tests and checks around an agent. Software 3.0 is Karpathy's framing; useful as an idea, but mostly a talking point.");
}

// Buzzwords: building blocks
{
  const s = content("Buzzwords: building blocks", null, "Buzzwords");
  termTable(s, [
    ["Agent loop", "Reason, call a tool, read the result, repeat until done. The core of every coding agent."],
    ["Harness", "The runtime around the model: tools, permissions, context, approvals. Copilot CLI, OpenCode, Claude Code."],
    ["Tool / function calling", "The model outputs a structured request to call a function; the harness runs it and returns the result."],
    ["MCP", "Model Context Protocol: an open protocol for connecting agents to tools and data through servers."],
    ["Agent Skills (SKILL.md)", "A folder with a SKILL.md (name, description, instructions) and optional scripts, loaded only when relevant. An open standard."],
    ["AGENTS.md", "A README written for agents: build commands, conventions, rules. A cross-tool convention; keep it short: a map, not an encyclopedia."],
  ]);
  s.addNotes("These are the parts every harness is built from. MCP is the protocol for plugging tools and data in; we don't have MCP servers in our environment yet, which is why the API demo later uses direct API calls. Agent Skills started at Anthropic and are now an open standard supported by Copilot, VS Code and others (agentskills.io). AGENTS.md is a shared convention (agents.md); OpenAI advises keeping it around a hundred lines.");
}

// Buzzwords: more building blocks
{
  const s = content("Buzzwords: more building blocks", null, "Buzzwords");
  termTable(s, [
    ["Subagents", "Child agents with their own clean context for a subtask, such as research or review. They return a summary, keeping the main context small."],
    ["RAG", "Retrieval-augmented generation: fetch relevant documents and add them to the prompt. In coding agents, plain file search often does this job."],
    ["Reasoning models", "Models that reason before answering, with a configurable effort or thinking budget. More reasoning means more cost and latency."],
    ["A2A", "Agent2Agent: a protocol for agents from different vendors to talk to each other. Much less relevant to coding than MCP."],
  ]);
  s.addNotes("Subagents are what Superpowers and Agentcraft use for their roles. RAG is an older term (2020) that people still use; coding agents mostly do retrieval by searching files. Reasoning effort is a setting worth knowing: higher effort helps hard problems and costs more.");
}

// Buzzwords: running agents
{
  const s = content("Buzzwords: running agents", null, "Buzzwords");
  termTable(s, [
    ["Plan mode", "The agent reads and proposes a plan without editing; you approve before it implements."],
    ["YOLO / autopilot", "The agent runs tools without asking each time. Only inside a sandbox or container.", "SLANG"],
    ["Cloud coding agents", "Assign an issue; an agent works in a cloud environment and opens a PR (e.g. Copilot coding agent)."],
    ["GitHub Agentic Workflows", "Repository automation written in Markdown and compiled into GitHub Actions, with “safe outputs” for write actions."],
    ["Parallel agents + worktrees", "Several agents at once, each in its own git worktree or branch. Your job becomes reviewing."],
    ["Compaction", "When the context fills, the harness summarises the conversation so the session can continue. Some detail is lost."],
    ["Ralph loop", "A script that feeds the same prompt to an agent repeatedly, with progress kept in files and git.", "FOLK"],
  ]);
  s.addNotes("Plan mode is built into Copilot CLI, Claude Code and OpenCode. YOLO or autopilot modes skip approvals; use them only where nothing important can be damaged. Cloud coding agents and GitHub Agentic Workflows move agents into CI and pull requests (docs.github.com/en/copilot/concepts/agents/about-github-agentic-workflows). Worktrees let several agents work in parallel without stepping on each other. The Ralph loop is a folk technique, popular but informal.");
}

// Buzzwords: quality and risk
{
  const s = content("Buzzwords: quality and risk", null, "Buzzwords");
  termTable(s, [
    ["Context rot", "Output quality drops as the input grows, even below the advertised limit."],
    ["Hallucination", "Confident but wrong output, such as invented APIs or packages. Fake package names enable “slopsquatting” attacks."],
    ["AI slop", "Low-quality AI output: unreviewed PRs, bloated code, junk bug reports.", "PEJORATIVE"],
    ["Prompt injection", "Untrusted text (an issue, a web page, a tool result) takes over the agent's instructions."],
    ["Lethal trifecta", "Private data + untrusted content + a way to send data out = a data-exfiltration risk (Simon Willison)."],
    ["Evals", "Repeatable test suites that measure how well an agent or prompt performs. Unit tests for AI behaviour."],
    ["LLM-as-judge", "Using a model to grade another model's output. Cheap, but biased; check it against human judgement."],
  ]);
  s.addNotes("The risk vocabulary. Context rot connects back to the context window slides. Prompt injection matters as soon as an agent reads content you don't control, such as issues, web pages or API results; Simon Willison's lethal trifecta (simonwillison.net/2025/Jun/16/the-lethal-trifecta) is a simple test for when it becomes dangerous. Evals and LLM-as-judge are how teams measure agent quality systematically.");
}

// Buzzwords v2: one idea per slide, built around the "___ engineering" ladder
const RUNGS = ["Prompt", "Context", "Harness", "Loop", "Graph"];

// "**term**" in slide text renders the engineering term in bold
function para(text, opts, breakLine = false) {
  const runs = text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => (p.startsWith("**")
    ? { text: p.slice(2, -2), options: { ...opts, bold: true } }
    : { text: p, options: { ...opts } }));
  runs.forEach((r, i) => { if (i > 0) { delete r.options.paraSpaceBefore; delete r.options.bullet; } });
  if (breakLine) runs[runs.length - 1].options.breakLine = true;
  return runs;
}

function rungStrip(s, active) {
  const w = 0.98;
  const x0 = W - M - RUNGS.length * w - (RUNGS.length - 1) * 0.06;
  RUNGS.forEach((r, i) => {
    const on = i === active;
    chip(s, x0 + i * (w + 0.06), 0.52, w, 0.34, r, on ? C.green : C.soft, on ? C.white : C.muted, 10.5);
  });
}

function forYouBand(s, text, y = 5.3, h = 1.35) {
  box(s, M, y, CW, h, C.soft);
  s.addText([
    { text: "What it means for you", options: { bold: true, fontSize: 12, color: C.green, charSpacing: 1, breakLine: true } },
    ...para(text, { fontSize: 16, color: C.ink, paraSpaceBefore: 4 }),
  ], { x: M, y, w: CW, h, fontFace: BF, valign: "middle", margin: 14 });
}

function termSlide(o) {
  const s = content(o.title, o.lead, "Buzzwords");
  if (o.rung !== undefined) rungStrip(s, o.rung);
  box(s, M, 1.95, 7.25, 3.15, C.tint);
  const left = para(o.what, { fontSize: 19, color: C.ink }, !!o.detail);
  if (o.detail) left.push(...para(o.detail, { fontSize: 14, color: C.muted, paraSpaceBefore: 12 }));
  s.addText(left, { x: M, y: 1.95, w: 7.25, h: 3.15, fontFace: BF, valign: "middle", margin: 16 });
  box(s, M + 7.45, 1.95, CW - 7.45, 3.15, C.dark);
  s.addText([
    { text: o.quote, options: { fontSize: 17, italic: true, color: C.white, breakLine: true } },
    { text: o.who, options: { fontSize: 12, color: C.lime, paraSpaceBefore: 12 } },
  ], { x: M + 7.45, y: 1.95, w: CW - 7.45, h: 3.15, fontFace: BF, valign: "middle", margin: 16 });
  forYouBand(s, o.forYou);
  s.addNotes(o.notes);
  return s;
}

function listCard(s, x, title, sub, items, fill) {
  box(s, x, 1.95, 3.55, 3.15, fill);
  s.addText([
    { text: title, options: { bold: true, fontSize: 20, color: C.ink, breakLine: true } },
    ...para(sub, { fontSize: 12.5, italic: true, color: C.muted }, true),
    ...items.flatMap((it, i) => para(it, { bullet: { indent: 14 }, fontSize: 14.5, color: C.ink, paraSpaceBefore: i === 0 ? 10 : 6 }, i < items.length - 1)),
  ], { x, y: 1.95, w: 3.55, h: 3.15, fontFace: BF, valign: "top", margin: 14 });
}

// Section
{
  const s = section("What they're all talking about", "Buzzwords, decoded: the terms behind the hype, and what they mean for you", "Buzzwords");
  s.addNotes("This section follows the vocabulary the people building the tools actually use in 2026: Karpathy, the Claude Code and Codex teams, Andrew Ng. The backbone is the '___ engineering' ladder. For each term: what it means, who says it, and what it changes for you tomorrow.");
}

// Floor and ceiling
{
  const s = content("Vibe coding raises the floor", "Same agents, same speed. The difference is whether anyone engineers the result.", "Buzzwords");
  box(s, M, 1.95, 5.95, 3.15, C.amberTint);
  s.addText([
    { text: "Vibe coding", options: { bold: true, fontSize: 22, color: C.amber, breakLine: true } },
    { text: "Karpathy, February 2025 · Collins Word of the Year 2025", options: { fontSize: 12, italic: true, color: C.muted, breakLine: true } },
    ...para("Describe it, accept everything, never read the code: **no code review**, **no tests**. Now anyone can build something.", { fontSize: 16, color: C.ink, paraSpaceBefore: 10 }, true),
    { text: "Great for prototypes and personal tools.", options: { fontSize: 16, bold: true, color: C.ink, paraSpaceBefore: 10 } },
  ], { x: M, y: 1.95, w: 5.95, h: 3.15, fontFace: BF, valign: "middle", margin: 16 });
  box(s, 6.78, 1.95, 5.95, 3.15, C.tint);
  s.addText([
    { text: "Agentic engineering", options: { bold: true, fontSize: 22, color: C.green, breakLine: true } },
    { text: "Karpathy, February 2026", options: { fontSize: 12, italic: true, color: C.muted, breakLine: true } },
    ...para("Agents write most of the code. You own the **spec** and the **acceptance criteria**, **review the diff**, run the **tests** and answer for the result.", { fontSize: 16, color: C.ink, paraSpaceBefore: 10 }, true),
    { text: "This is what today is about.", options: { fontSize: 16, bold: true, color: C.ink, paraSpaceBefore: 10 } },
  ], { x: 6.78, y: 1.95, w: 5.95, h: 3.15, fontFace: BF, valign: "middle", margin: 16 });
  box(s, M, 5.3, CW, 1.35, C.dark);
  s.addText([
    { text: "“Vibe coding raises the floor. Agentic engineering raises the ceiling.”", options: { fontSize: 22, italic: true, color: C.white, breakLine: true } },
    { text: "Andrej Karpathy, Sequoia Ascent, April 2026", options: { fontSize: 12, color: C.lime, paraSpaceBefore: 6 } },
  ], { x: M, y: 5.3, w: CW, h: 1.35, fontFace: BF, valign: "middle", margin: 16 });
  s.addNotes("Karpathy coined 'vibe coding' in February 2025; Collins named it Word of the Year 2025. A year later he proposed 'agentic engineering' for the professional version. At Sequoia Ascent (April 2026) he put it as: vibe coding raises the floor, so anyone can build; agentic engineering raises the ceiling, preserving the quality bar of professional software. 'You are still responsible for your software, just as before. But can you go faster? Spoiler: you can.' Sources: karpathy.bearblog.dev/sequoia-ascent-2026, x.com/karpathy/status/2019137879310836075.");
}

// The ladder
{
  const s = content("The “___ engineering” ladder", "Each rung contains the one below it. What changes is the unit you design.", "Buzzwords");
  const steps = [
    ["Prompt", "2023", "**One instruction**: write it clearly.", C.soft, C.ink, C.muted],
    ["Context", "2025", "**One model call**: what it sees.", C.lime, C.ink, C.ink],
    ["Harness", "Feb 2026", "**One agent run**: its tools, rules and checks.", "7FA88F", C.white, C.white],
    ["Loop", "Jun 2026", "**Many runs**: who starts them, when they stop.", C.green, C.white, "DCE8DE"],
    ["Graph", "Jul 2026", "**Many steps**: the route, fixed in code.", C.dark, C.white, "A9C3B5"],
  ];
  const stepW = 2.33;
  const gap = 0.12;
  const bottom = 6.65;
  steps.forEach(([name, year, meaning, fill, color, sub], i) => {
    const h = 1.45 + i * 0.82;
    const x = M + i * (stepW + gap);
    const y = bottom - h;
    box(s, x, y, stepW, h, fill);
    s.addText([
      { text: name, options: { bold: true, fontSize: 20, color, breakLine: true } },
      { text: "engineering · " + year, options: { fontSize: 11.5, color: sub, breakLine: true } },
      ...para(meaning, { fontSize: 13.5, color, paraSpaceBefore: 6 }),
    ], { x, y, w: stepW, h: 1.45, fontFace: BF, valign: "top", margin: 10 });
  });
  s.addNotes("The backbone of this section. The clearest way to tell the terms apart is the unit each one designs, as laid out in the August 2026 paper 'Loop Engineering: Building Blocks, Adoption, and Impact' (Treude, Baltes and others), where each layer subsumes the previous one. Prompt engineering: one instruction. Context engineering (June 2025, Tobi Lütke's term, popularised by Karpathy): everything the model sees in one call, such as AGENTS.md, files read and history. Harness engineering (OpenAI, February 2026): the layer around one agent run, such as skills, subagents, hooks, settings, MCP, tests and linters. Loop engineering (June 2026, Addy Osmani's name after posts by Boris Cherny and Peter Steinberger): many runs over time, with a trigger, a machine-checkable stop condition, state files, a verifier and a budget. Graph engineering (July 2026, after a Steinberger post; Hamel Husain's article named it): the route through many steps, written down as nodes and edges; LangChain's verdict is that it 'isn't a new idea', it is how LangGraph has worked since 2024. Be honest with the room: each new name is partly hype, and critics call loops 'a renamed cron job'. The ideas underneath are still worth knowing. Sources: arxiv.org/abs/2608.21884, openai.com/index/harness-engineering, addyosmani.com/blog/loop-engineering, langchain.com/blog/3-years-of-graph-engineering-with-langgraph.");
}

// Context engineering: what goes in, what stays out
{
  const s = content("Context engineering", "Unit: one model call. What does the model see right now? The right information, not the magic words.", "Buzzwords");
  rungStrip(s, 1);
  listCard(s, M, "Give it", "What a new teammate would need", [
    "The **ticket**: goal and **acceptance criteria**",
    "The relevant files, not the whole repo",
    "Our **coding standards** (AGENTS.md)",
    "The **design decisions** already made",
  ], C.tint);
  listCard(s, M + 3.7, "Keep it out", "Noise that crowds out the task", [
    "Full logs: paste the failing part",
    "Unrelated files and earlier tasks",
    "Stale **docs** that contradict the code",
    "A 1,000-line instructions file",
  ], C.amberTint);
  box(s, M + 7.45, 1.95, CW - 7.45, 3.15, C.dark);
  s.addText([
    { text: "“The delicate art and science of filling the context window with just the right information for the next step.”", options: { fontSize: 16, italic: true, color: C.white, breakLine: true } },
    { text: "Andrej Karpathy, June 2025, backing Shopify CEO Tobi Lütke's term", options: { fontSize: 12, color: C.lime, breakLine: true, paraSpaceBefore: 10 } },
    { text: "Why less is more: context rot. Quality drops as the window fills, well before the limit.", options: { fontSize: 12.5, color: "A9C3B5", paraSpaceBefore: 10 } },
  ], { x: M + 7.45, y: 1.95, w: CW - 7.45, h: 3.15, fontFace: BF, valign: "middle", margin: 16 });
  forYouBand(s, "Brief the agent like a good **ticket**: goal, **acceptance criteria**, relevant files, constraints. One task, one session; start fresh when the task changes.");
  s.addNotes("Context engineering replaced 'prompt engineering' as the popular term in mid-2025. Shopify CEO Tobi Lütke used it first (June 18, 2025: 'the art of providing all the context for the task to be plausibly solvable by the LLM'); a week later Karpathy backed it: '+1 for context engineering over prompt engineering', calling it 'the delicate art and science of filling the context window with just the right information for the next step', and warning that too little and the model lacks what it needs, too much or too irrelevant and costs go up and performance comes down. The engineering parallel is onboarding: you would give a new teammate the ticket with its acceptance criteria, the relevant code, the coding standards and the decisions already made, and you would not hand them every log and every old document. OpenAI's harness engineering team put the same lesson as 'give Codex a map, not a 1,000-page instruction manual': a short AGENTS.md of about 100 lines that points to deeper docs. Context rot is why less is more: Chroma's 2025 study of 18 models found performance dropped as input length grew, even on simple tasks. This is what the room practised in the morning context-window slides. Sources: simonwillison.net/2025/Jun/27/context-engineering (quotes both posts), openai.com/index/harness-engineering, research.trychroma.com/context-rot.");
}

// Harness engineering: guides and sensors
{
  const s = content("Harness engineering", "Unit: one agent run. What surrounds it? The tool ships a harness; you build the outer one around it.", "Buzzwords");
  rungStrip(s, 2);
  listCard(s, M, "Guides", "Like **coding standards** and **design docs**: steer it before it acts", [
    "AGENTS.md and SHARED.md: our **conventions**",
    "Our backend and frontend skills",
    "A **spec** or plan it works from",
    "Language server: types up front",
  ], C.tint);
  listCard(s, M + 3.7, "Sensors", "Like **CI** and **quality gates**: let it fix itself after it acts", [
    "**Build**, **tests** and type checks it must run",
    "**Linters** whose messages say how to fix",
    "A read-only reviewer agent: **code review**",
    "Hooks that run checks on every edit",
  ], C.soft);
  box(s, M + 7.45, 1.95, CW - 7.45, 3.15, C.dark);
  s.addText([
    { text: "“Our most difficult challenges now center on designing environments, feedback loops, and control systems.”", options: { fontSize: 16, italic: true, color: C.white, breakLine: true } },
    { text: "Ryan Lopopolo, OpenAI, February 2026", options: { fontSize: 12, color: C.lime, breakLine: true, paraSpaceBefore: 10 } },
    { text: "His team shipped about a million lines in five months, with zero lines written by hand.", options: { fontSize: 12.5, color: "A9C3B5", paraSpaceBefore: 10 } },
  ], { x: M + 7.45, y: 1.95, w: CW - 7.45, h: 3.15, fontFace: BF, valign: "middle", margin: 16 });
  forYouBand(s, "Guides alone: rules it never verifies. Sensors alone: the same bug, again and again. Treat a repeated mistake like a **postmortem** action item: add a guide or a sensor so it can't happen twice.");
  s.addNotes("Two meanings of 'harness'. Every tool ships a built-in harness: its system prompt, tools and way of reading files; that is what we called the harness in the building-blocks slide. Harness engineering, as OpenAI named it in February 2026, is the outer harness you build around it for your codebase. Birgitta Böckeler (Thoughtworks, martinfowler.com, April 2026) splits it into guides, which steer the agent before it acts (AGENTS.md, skills, specs, language servers), and sensors, which let it correct itself after it acts (tests, type checks, linters, structural tests, review agents). Sensors work best when their output is written for the agent, for example lint messages that say how to fix the problem; OpenAI did exactly that with custom linters. Your job is the steering loop: whenever an issue happens more than once, improve a guide or a sensor. OpenAI's team: five months, about a million lines, 0 lines of manually written code, three engineers growing to seven; when the agent struggled, they asked what capability was missing and how to make it legible and enforceable for the agent. Everything on the left is something we set up this morning. Honest overlap: Böckeler calls the user harness 'a specific form of context engineering', and a 2026 study of 2,853 repositories found harness engineering in open source is 'mostly context engineering', because people write context files and rarely add executable checks. The difference is the sensors: context only steers, a harness also checks. Sources: openai.com/index/harness-engineering, martinfowler.com/articles/harness-engineering.html.");
}

function flowNode(s, x, y, w, kind, name, fill, color = C.ink, h = 0.7) {
  box(s, x, y, w, h, fill);
  s.addText([
    { text: kind, options: { fontSize: 9, bold: true, color: color === C.ink ? C.muted : C.lime, charSpacing: 1, breakLine: true } },
    { text: name, options: { fontSize: 13, bold: true, color } },
  ], { x, y, w, h, fontFace: BF, align: "center", valign: "middle", margin: 3 });
}

function line(s, x, y, w, h, color, arrowAt) {
  const l = { color, width: 2 };
  if (arrowAt === "end") l.endArrowType = "triangle";
  if (arrowAt === "begin") l.beginArrowType = "triangle";
  s.addShape(pres.shapes.LINE, { x, y, w, h, line: l });
}

// Loop engineering: many runs, started and stopped by a system
{
  const s = content("Loop engineering", "Unit: many runs over time. You stop being the one who starts each run; a system does it.", "Buzzwords");
  rungStrip(s, 3);
  box(s, M, 1.95, 7.25, 3.15, C.tint);
  const y = 2.2;
  flowNode(s, 0.8, y, 1.6, "TRIGGER", "Schedule or event", C.white);
  arrow(s, 2.45, y + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 2.85, y, 1.6, "ONE RUN", "Agent + harness", C.white);
  arrow(s, 4.5, y + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 4.9, y, 1.6, "VERIFIER", "Stop condition met?", C.soft);
  arrow(s, 6.55, y + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 6.95, y, 0.75, "YES", "Done", C.dark, C.white);
  const retryY = 3.3;
  line(s, 5.4, y + 0.7, 0, retryY - y - 0.7, C.green);
  line(s, 3.65, retryY, 1.75, 0, C.green);
  line(s, 3.65, y + 0.7, 0, retryY - y - 0.7, C.green, "begin");
  s.addText("no: run again, within a budget", { x: 3.75, y: retryY + 0.03, w: 2.6, h: 0.3, fontFace: BF, fontSize: 11.5, italic: true, color: C.green, margin: 0 });
  line(s, 6.1, y + 0.7, 0, 3.95 - y - 0.7, C.amber, "end");
  flowNode(s, 5.1, 3.95, 2.6, "STUCK OR RISKY", "Escalate to a person", C.amberTint);
  s.addText([
    ...para("**Trigger:** nightly, a failing build, a new issue.", { fontSize: 12, color: C.ink }, true),
    ...para("**State:** a progress file in the repo. The agent forgets; the repo doesn't.", { fontSize: 12, color: C.ink }),
  ], { x: 0.8, y: 3.75, w: 4.15, h: 1.2, fontFace: BF, valign: "middle", margin: 0 });
  box(s, M + 7.45, 1.95, CW - 7.45, 3.15, C.dark);
  s.addText([
    { text: "“Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead.”", options: { fontSize: 16, italic: true, color: C.white, breakLine: true } },
    { text: "Addy Osmani, who named it, June 2026", options: { fontSize: 12, color: C.lime, breakLine: true, paraSpaceBefore: 10 } },
    { text: "Sparked by Boris Cherny (Claude Code): “My job is to write loops.” Critics: “a renamed cron job.”", options: { fontSize: 12.5, color: "A9C3B5", paraSpaceBefore: 10 } },
  ], { x: M + 7.45, y: 1.95, w: CW - 7.45, h: 3.15, fontFace: BF, valign: "middle", margin: 16 });
  forYouBand(s, "Design the **verifier** first: a loop satisfies the check you wrote, not the goal behind it. Start **report-only**, such as a nightly run that opens an issue, and allow unattended changes only once the verifier has earned trust.");
  s.addNotes("Loop engineering is about many agent runs over time, not the agent's own tool-calling loop inside one run. The definition the sources converge on: the developer stops deciding what the agent does next and designs the system that decides instead. Addy Osmani named it on 7 June 2026: 'Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead.' It followed Boris Cherny's interview ('I don't prompt Claude anymore. I have loops that are running... My job is to write loops') and Peter Steinberger's post ('You should be designing loops that prompt your agents'). The August 2026 paper by Treude, Baltes and others gives the working definition: automated control structures that repeatedly invoke coding agents, triggered on a schedule or by events, with each run bounded by a machine-checkable stop condition; a good loop persists state across runs, verifies results independently of the implementing agent, bounds cost, restricts what an unattended run may change, and defines when humans step in. Tools ship it now: /loop and /goal in Claude Code, /goal in Codex. The honest part: critics call it 'a renamed cron job'; Gergely Orosz found most real examples are cron jobs and event triggers with a smarter worker, and the paper found it in 217 of 36,710 repositories, mostly automatic pull-request review. Practical advice from the sources: design the verifier first (André Lindenberg: a loop 'satisfies the gate you wrote'), start report-only and raise autonomy only when the verifier has proven reliable (Cobus Greyling's readiness levels), and watch costs and review fatigue. Sources: addyosmani.com/blog/loop-engineering, arxiv.org/abs/2608.21884.");
}

// Graph engineering: the route, written down
{
  const s = content("Graph engineering", "Unit: many steps. Who decides what runs next: the model, or your code?", "Buzzwords");
  rungStrip(s, 4);
  const y = 2.45;
  const label = (x, yy, w, text, color = C.muted) => s.addText(text, { x, y: yy, w, h: 0.26, fontFace: BF, fontSize: 10.5, italic: true, color, align: "center", margin: 0 });
  flowNode(s, M, y, 2.05, "LLM CALL", "Classify the issue", C.tint);
  arrow(s, 2.7, y + 0.19, 0.4, 0.32, C.green);
  label(2.55, y - 0.3, 0.7, "bug");
  flowNode(s, 3.15, y, 2.2, "AGENT", "Fix it (a full run)", C.tint);
  arrow(s, 5.4, y + 0.19, 0.4, 0.32, C.green);
  flowNode(s, 5.85, y, 1.9, "CODE", "Run the tests", C.soft);
  arrow(s, 7.8, y + 0.19, 0.4, 0.32, C.green);
  label(7.65, y - 0.3, 0.7, "pass");
  flowNode(s, 8.25, y, 2.2, "HUMAN", "Approve the PR", C.amberTint);
  arrow(s, 10.5, y + 0.19, 0.4, 0.32, C.green);
  flowNode(s, 10.95, y, 1.78, "CODE", "Merge", C.dark, C.white);
  const failY = y + 1.15;
  line(s, 6.8, y + 0.7, 0, failY - y - 0.7, C.amber);
  line(s, 4.25, failY, 2.55, 0, C.amber);
  line(s, 4.25, y + 0.7, 0, failY - y - 0.7, C.amber, "begin");
  s.addText("fail: back to the agent, at most twice", { x: 4.35, y: failY + 0.03, w: 3.4, h: 0.28, fontFace: BF, fontSize: 11, italic: true, color: C.amber, margin: 0 });
  line(s, 1.6, y + 0.7, 0, 0.95, C.green, "end");
  label(1.65, y + 0.95, 1.1, "not a bug", C.muted);
  flowNode(s, M, y + 1.65, 2.05, "LLM CALL", "Reply and close", C.tint);
  box(s, M, 5.2, 7.25, 1.45, C.tint);
  s.addText([
    ...para("In a **loop**, the agent picks its own route to the goal. In a **graph**, you fix the route and the checkpoints in code, like a **state machine**.", { fontSize: 14.5, color: C.ink }, true),
    { text: "“Graph engineering isn't a new idea. It's the latest name for a well established approach to building reliable agents.” LangChain, July 2026", options: { fontSize: 11.5, italic: true, color: C.muted, paraSpaceBefore: 6 } },
  ], { x: M, y: 5.2, w: 7.25, h: 1.45, fontFace: BF, valign: "middle", margin: 14 });
  box(s, M + 7.45, 5.2, CW - 7.45, 1.45, C.soft);
  s.addText([
    { text: "What it means for you", options: { bold: true, fontSize: 12, color: C.green, charSpacing: 1, breakLine: true } },
    { text: "Superpowers is a route the agent chooses to follow. A graph enforces it. Use one when the order must hold every time.", options: { fontSize: 14, color: C.ink, paraSpaceBefore: 4 } },
  ], { x: M + 7.45, y: 5.2, w: CW - 7.45, h: 1.45, fontFace: BF, valign: "middle", margin: 14 });
  s.addNotes("Graph engineering is about who decides the next step. An agent decides its own next step, which suits open-ended work. A graph writes the control flow down: nodes do the work (plain code, one LLM call, a tool call, a human approval, or a whole agent run with its own harness), edges decide what runs next, some fixed and some conditional on the result, and a shared state travels along them. LangChain: 'You can think of this as a state machine', and 'a loop is just a directed, cyclic graph'. The diagram shows all node kinds: an LLM call classifies the issue and a conditional edge routes it; a full coding-agent run fixes bugs; plain code runs the tests and sends failures back at most twice; a person approves before the merge. Where the name came from: Itamar Friedman (CodiumAI) talked about 'flow (/graph) engineering' in 2024 after the AlphaCodium paper; Josh Simmons proposed 'graph engineering' on 4 July 2026; Peter Steinberger asked on 18 July 2026 'Are we still talking loops or did we shift to graphs yet?' and Hamel Husain's article named it hours later. Both later admitted it was partly a joke about how fast the field mints names. Harrison Chase asked whether it was 'basically just langgraph?', and LangChain wrote that it 'isn't a new idea'. Anthropic made the same distinction in 2024: workflows run models and tools through predefined code paths; agents direct their own process. For the room: Superpowers is a set of skills that the agent chooses to follow, so the route lives in instructions; a graph, for example in LangGraph, enforces the route in code. Sources: langchain.com/blog/3-years-of-graph-engineering-with-langgraph, anthropic.com/research/building-effective-agents.");
}

// What is a graph: nodes, edges, state
{
  const s = content("What is a graph?", "A flowchart that actually runs. You write the boxes and the arrows in code; the LLM only works inside some of the boxes.", "Buzzwords");
  rungStrip(s, 4);
  const parts = [
    ["Node", "A step that does work: plain code, one LLM call, a whole agent run, or a person approving."],
    ["Edge", "The arrow to the next step. Fixed (“after implement, always test”) or conditional (“if tests fail, go back”)."],
    ["State", "The data carried from step to step: the plan, the diff, the test results, the retry count."],
  ];
  parts.forEach(([t, d], i) => {
    const y = 1.95 + i * 1.07;
    box(s, M, y, 4.55, 0.97, C.tint);
    s.addText([
      { text: t, options: { bold: true, fontSize: 16, color: C.green, breakLine: true } },
      { text: d, options: { fontSize: 12.5, color: C.ink, paraSpaceBefore: 2 } },
    ], { x: M, y, w: 4.55, h: 0.97, fontFace: BF, valign: "middle", margin: 10 });
  });

  const px = M + 4.7, pw = CW - 4.7;
  box(s, px, 1.95, pw, 3.11, C.soft);
  s.addText("Example: every feature, the same route", { x: px + 0.2, y: 2.02, w: pw - 0.4, h: 0.3, fontFace: BF, fontSize: 12, bold: true, color: C.green, margin: 0 });
  const nodes = [["LLM", "Plan"], ["AGENT", "Implement"], ["CODE", "Run tests"], ["HUMAN", "Approve"], ["CODE", "Merge"]];
  const gap = 0.3, nw = (pw - 0.4 - 4 * gap) / 5, ny = 2.75;
  const nx = (i) => px + 0.2 + i * (nw + gap);
  nodes.forEach(([k, n], i) => {
    flowNode(s, nx(i), ny, nw, k, n, k === "HUMAN" ? C.amberTint : C.white);
    if (i < nodes.length - 1) line(s, nx(i) + nw, ny + 0.35, gap, 0, C.green, "end");
  });
  s.addText("pass", { x: nx(2) + nw - 0.1, y: ny + 0.03, w: gap + 0.2, h: 0.25, fontFace: BF, fontSize: 10, italic: true, color: C.green, align: "center", margin: 0 });
  const backY = ny + 1.05;
  line(s, nx(2) + nw / 2, ny + 0.7, 0, backY - ny - 0.7, C.amber);
  line(s, nx(1) + nw / 2, backY, nx(2) - nx(1), 0, C.amber);
  line(s, nx(1) + nw / 2, ny + 0.7, 0, backY - ny - 0.7, C.amber, "begin");
  s.addText("fail: back to implement (max 2)", { x: nx(1) + nw / 2, y: backY + 0.03, w: 2.6, h: 0.26, fontFace: BF, fontSize: 10.5, italic: true, color: C.amber, margin: 0 });
  box(s, px + 0.2, 4.4, pw - 0.4, 0.5, C.white);
  s.addText([
    { text: "STATE  ", options: { bold: true, fontSize: 10.5, color: C.muted, charSpacing: 1 } },
    { text: "plan · diff · test results · retry count, passed along every edge", options: { fontSize: 12, color: C.ink } },
  ], { x: px + 0.2, y: 4.4, w: pw - 0.4, h: 0.5, fontFace: BF, valign: "middle", margin: 10 });

  box(s, M, 5.3, CW, 1.35, C.dark);
  s.addText([
    { text: "You already know graphs", options: { bold: true, fontSize: 12, color: C.lime, charSpacing: 1, breakLine: true } },
    ...para("A CI workflow with **needs:** and **if:**, a **state machine**, a Jira workflow. Graph engineering puts LLMs inside some boxes. The point: **your code decides the next step, not the model.** In an agent or a loop, the model picks its own route.", { fontSize: 15, color: C.white, paraSpaceBefore: 4 }),
  ], { x: M, y: 5.3, w: CW, h: 1.35, fontFace: BF, valign: "middle", margin: 14 });
  s.addNotes("Define the word before comparing it with anything. A graph is a flowchart that runs. Three parts. Nodes are the steps that do work: a node can be plain code, a single LLM call, a tool call, a full agent run with its own harness, or a human approval. Edges decide what runs next: some are fixed (after implement, always run tests), some are conditional on the result (if the tests fail, go back to implement; if they pass, go on). State is the shared data that travels along the edges: the plan, the diff, the test results, a retry counter. LangChain: 'You can think of this as a state machine.' Walk through the example: an LLM call writes the plan, an agent implements, plain code runs the tests and routes the result, failures go back to implement at most twice, a person approves, code merges. The model never chooses the route; it cannot skip the tests because there is no arrow around them. Engineers already know graphs: a GitHub Actions workflow with needs: and if:, a state machine, a Jira ticket workflow. Graph engineering is the same thing with LLMs inside some of the boxes. The contrast: in an agent, and in a loop around an agent, the model decides its own next step; in a graph, your code does. Anthropic made the same split in 2024: workflows follow predefined code paths, agents direct their own process. The name is new (July 2026) and LangChain admits it 'isn't a new idea'. Sources: langchain.com/blog/3-years-of-graph-engineering-with-langgraph, anthropic.com/research/building-effective-agents.");
}

// Six more terms
{
  const s = content("Six more terms, one sentence each", "You will hear these all the time. Here is all you need to know.", "Buzzwords");
  const terms = [
    ["Agent Skills", "A **runbook** for one kind of task: a SKILL.md the agent loads only when the task matches. An open standard."],
    ["MCP", "Model Context Protocol: a standard **adapter** between agents and tools, like a **driver**. Jira, a database, a browser."],
    ["RAG", "Retrieval-augmented generation: a **search** before the answer. Fetch the relevant documents, add them to the prompt."],
    ["Worktrees", "A **feature branch** in its own folder, so two agents can work in parallel without overwriting each other."],
    ["Subagents", "**Delegation** with a clear **interface**: hand over one task, get back a report. Its context stays out of yours."],
    ["Spec-driven development", "**Requirements** and **acceptance criteria** first, then design, tasks and code. The spec is the source of truth."],
  ];
  terms.forEach(([t, d], i) => {
    const x = M + (i % 3) * 4.09;
    const y = 1.95 + Math.floor(i / 3) * 2.4;
    box(s, x, y, 3.95, 2.25, C.tint);
    s.addText([
      { text: t, options: { bold: true, fontSize: 19, color: C.ink, breakLine: true } },
      ...para(d, { fontSize: 16, color: C.ink, paraSpaceBefore: 6 }),
    ], { x, y, w: 3.95, h: 2.25, fontFace: BF, valign: "top", margin: 10 });
  });
  s.addNotes("One sentence each. Agent Skills started at Anthropic and are now an open standard used by Copilot, VS Code, Codex, OpenCode and others (agentskills.io); we built some this morning. MCP (Anthropic, November 2024) is the common protocol for connecting agents to tools; we don't run MCP servers in our environment yet. RAG is a 2020 research term; coding agents mostly retrieve by searching files rather than with a vector database. Worktrees are plain git: each agent gets its own checkout and branch, which is what makes parallel agents and loops possible. Subagents start with a fresh context and only know what they are handed. Spec-driven development: GitHub Spec Kit is the best-known implementation.");
}

// Jagged intelligence
{
  const s = content("Jagged intelligence", "Brilliant and strangely dumb, sometimes in the same session.", "Buzzwords");
  box(s, M, 1.95, 5.95, 2.4, C.tint);
  s.addText([
    { text: "Can do", options: { bold: true, fontSize: 13, color: C.green, charSpacing: 1, breakLine: true } },
    { text: "Refactor a 100,000-line codebase. Find zero-day vulnerabilities.", options: { fontSize: 20, color: C.ink, paraSpaceBefore: 6 } },
  ], { x: M, y: 1.95, w: 5.95, h: 2.4, fontFace: BF, valign: "middle", margin: 16 });
  box(s, 6.78, 1.95, 5.95, 2.4, C.amberTint);
  s.addText([
    { text: "Also does", options: { bold: true, fontSize: 13, color: C.amber, charSpacing: 1, breakLine: true } },
    { text: "Tells you to walk to the car wash 50 metres away, because it's close.", options: { fontSize: 20, color: C.ink, paraSpaceBefore: 6 } },
  ], { x: 6.78, y: 1.95, w: 5.95, h: 2.4, fontFace: BF, valign: "middle", margin: 16 });
  s.addText("Models are strongest where results are easy to verify and the labs trained hard: code, tests, maths. Outside that, they can fail in surprisingly basic ways. (Andrej Karpathy, Sequoia Ascent 2026)", { x: M, y: 4.5, w: CW, h: 0.7, fontFace: BF, fontSize: 14, italic: true, color: C.muted, margin: 0 });
  forYouBand(s, "Don't judge the agent by its best moment. **Code review** matters most where **tests** can't reach: design, naming, product sense.");
  s.addNotes("Karpathy's explanation for why models are so uneven: traditional software automates what you can specify; LLMs automate what you can verify, and labs train hardest where verification is easy and economically valuable. So the same model that can refactor a 100,000-line codebase or find zero-day vulnerabilities may tell you to walk to a car wash 50 metres away. His conclusion: to the extent models remain jagged, you need to be in the loop. He also notes agents still write code that 'works, but it is gross': bloated, copy-pasted, awkwardly abstracted. Source: karpathy.bearblog.dev/sequoia-ascent-2026.");
}

// Prompt debt: how it builds, what it costs, how to pay it down
{
  const s = content("Prompt debt", "Technical debt in plain English. Every quick fix becomes a rule, until nobody dares touch the prompt.", "Buzzwords");
  const colW = (CW - 0.3) / 3;
  const col = (i) => M + i * (colW + 0.15);
  const head = (i, title, color = C.ink) => s.addText(title, { x: col(i) + 0.15, y: 2.0, w: colW - 0.3, h: 0.4, fontFace: BF, fontSize: 18, bold: true, color, margin: 0 });

  box(s, col(0), 1.95, colW, 3.15, C.tint);
  head(0, "How it builds");
  const rules = [
    ["Return the answer as JSON.", C.ink, false],
    ["IMPORTANT: always return JSON.", C.ink, false],
    ["CRITICAL: you MUST return valid JSON.", C.amber, true],
    ["MANDATORY: NEVER answer without JSON!!", C.amber, true],
  ];
  s.addText(rules.map(([t, c, b], i) => ({ text: t, options: { fontFace: "Consolas", fontSize: 11, color: c, bold: b, breakLine: i < rules.length - 1, paraSpaceBefore: i ? 4 : 0 } })),
    { x: col(0) + 0.15, y: 2.45, w: colW - 0.3, h: 1.25, fill: { color: C.white }, valign: "middle", margin: 8 });
  s.addText(para("Real example: Claude Code's system prompt tells the model **seven times** to batch its tool calls. Breunig calls this **fighting the weights**.", { fontSize: 12, color: C.ink }),
    { x: col(0) + 0.15, y: 3.8, w: colW - 0.3, h: 1.2, fontFace: BF, valign: "middle", margin: 0 });

  box(s, col(1), 1.95, colW, 3.15, C.soft);
  head(1, "What it costs");
  s.addText([
    ...para("**Slow iteration.** Each new rule can break an old one, so every edit risks a **regression**.", { fontSize: 13, color: C.ink }, true),
    ...para("**No collaboration.** Nobody knows why a rule is there, so nobody deletes it. Only one person can touch the prompt.", { fontSize: 13, color: C.ink, paraSpaceBefore: 8 }, true),
    ...para("**Model lock-in.** The hacks were tuned to one model; a newer model breaks them, so teams stay on old ones.", { fontSize: 13, color: C.ink, paraSpaceBefore: 8 }),
  ], { x: col(1) + 0.15, y: 2.45, w: colW - 0.3, h: 2.55, fontFace: BF, valign: "top", margin: 0 });

  box(s, col(2), 1.95, colW, 3.15, C.dark);
  head(2, "How to pay it down", C.white);
  s.addText([
    ...para("**Write checks, not more rules:** tests, evals and types that pass or fail.", { fontSize: 13, color: C.white }, true),
    ...para("**Split the task** into small, checkable steps instead of one giant prompt.", { fontSize: 13, color: C.white, paraSpaceBefore: 8 }, true),
    { text: "“Natural language was never meant to be a specification language for engineering.”", options: { fontSize: 12.5, italic: true, color: C.lime, paraSpaceBefore: 12, breakLine: true } },
    { text: "Drew Breunig, The Problem is Prompt Debt, June 2026", options: { fontSize: 10.5, color: "A9C3B5", paraSpaceBefore: 4 } },
  ], { x: col(2) + 0.15, y: 2.45, w: colW - 0.3, h: 2.55, fontFace: BF, valign: "top", margin: 0 });

  forYouBand(s, "Your AGENTS.md and skills collect debt too. **Smells:** the same rule twice, rules in CAPS, rules nobody can explain. Delete them, or turn them into a **test**, a **lint rule** or a **hook**.");
  s.addNotes("Drew Breunig named prompt debt in June 2026 ('The Problem is Prompt Debt'; republished by O'Reilly). How it builds: a prompt starts short; each time users flag an error, a rule is added; if the behaviour persists, the rule is repeated in stronger words. The JSON lines on the slide are illustrative, but the pattern is real: Breunig and Srihari Sriraman analysed coding-agent system prompts and found every one had repeated instructions and all-caps demands; Claude Code tells the model seven times to return multiple tool calls in one response; ChatGPT's image prompt once told the model eight times not to reply after an image. He calls it 'fighting the weights': you repeat a rule because the behaviour you want goes against how the model was trained. Why it gets brittle: unrelated words in a prompt change the output in ways you can't predict, so each new rule can change how an old one is read. The three costs, in his words: it slows iteration (you're afraid to touch the prompt), it blocks collaboration (another person's prompt 'may look completely random... But it works, so I don't want to touch it'), and it locks you to a model (Datadog found GPT-4o still the most-used model in traffic in March 2026, after it was retired from ChatGPT). How to pay it down: specify behaviour with measurements, not prose (evals, metrics, typed specs, tests); split tasks into small evaluable steps; treat prompts as perishable; in production apps, tools such as DSPy and GEPA search for the prompt automatically against your evals. Smells he lists: repeated instructions, one-off edge-case patches, increasingly desperate wording, prompts only one person may edit, and being stuck on an old model. For this room: the same applies to AGENTS.md and skills. Sources: dbreunig.com/2026/06/22/the-problem-is-prompt-debt.html, oreilly.com/radar/prompt-debt-and-fighting-the-weights.");
}

termSlide({
  title: "Workslop",
  lead: "When AI saves the sender time and costs the receiver more.",
  what: "AI output that looks polished but nobody checked: the **unreviewed PR**, the document nobody read. The receiver ends up doing the real work.",
  detail: "Its cousin, the “slop grenade”: tossing unverified AI output at a colleague and walking away.",
  quote: "Measure the time to the final result and the burden on the receiver, not how much AI produced.",
  who: "The idea from BetterUp Labs and Stanford, Harvard Business Review, 2025",
  forYou: "**Review your own PR** before you request a review. If you didn't check it, don't put your name on it.",
  notes: "'Workslop' was coined by researchers at BetterUp Labs and the Stanford Social Media Lab in Harvard Business Review in September 2025 (hbr.org/2025/09/ai-generated-workslop-is-destroying-productivity), and spread widely in 2026. 'Slop grenade' focuses on the act of sending it; it became widely known after Shopify's CEO used it in September 2026. In code, workslop is a 2,000-line PR nobody on the sending side has read. This is the 'you own the result' slide from the morning, said in the industry's words.",
});

// Workslop: definition, numbers, what it looks like in code
{
  const s = content("What workslop looks like", "Work that looks finished, but isn't. The sender saves time; the receiver pays for it.", "Buzzwords");
  const colW = (CW - 0.3) / 3;
  const col = (i) => M + i * (colW + 0.15);
  const head = (i, title, color = C.ink) => s.addText(title, { x: col(i) + 0.15, y: 2.0, w: colW - 0.3, h: 0.4, fontFace: BF, fontSize: 18, bold: true, color, margin: 0 });

  box(s, col(0), 1.95, colW, 3.15, C.dark);
  head(0, "The definition", C.white);
  s.addText([
    { text: "“AI generated work content that masquerades as good work, but lacks the substance to meaningfully advance a given task.”", options: { fontSize: 15, italic: true, color: C.white, breakLine: true } },
    { text: "Kate Niederhoffer (BetterUp Labs), Jeff Hancock (Stanford) and others, Harvard Business Review, September 2025", options: { fontSize: 11, color: C.lime, paraSpaceBefore: 10 } },
  ], { x: col(0) + 0.15, y: 2.45, w: colW - 0.3, h: 2.55, fontFace: BF, valign: "top", margin: 0 });

  box(s, col(1), 1.95, colW, 3.15, C.tint);
  head(1, "How common");
  const stats = [["40%", "received workslop in the last month"], ["1h 56m", "to deal with each case"], ["53%", "admit sending some themselves"]];
  stats.forEach(([n, t], i) => {
    s.addText([
      { text: n, options: { bold: true, fontSize: 22, color: C.green, breakLine: true } },
      { text: t, options: { fontSize: 12, color: C.ink } },
    ], { x: col(1) + 0.15, y: 2.45 + i * 0.75, w: colW - 0.3, h: 0.72, fontFace: BF, valign: "top", margin: 0 });
  });
  s.addText("Survey of 1,150 US desk workers, self-reported.", { x: col(1) + 0.15, y: 4.7, w: colW - 0.3, h: 0.3, fontFace: BF, fontSize: 10, italic: true, color: C.muted, margin: 0 });

  box(s, col(2), 1.95, colW, 3.15, C.amberTint);
  head(2, "In our work, it looks like");
  const items = [
    "A big **PR** the author never read",
    "**Tests** that pass but check nothing",
    "A PR description that just restates the diff",
    "A **code review** comment pasted from a chatbot",
    "**Docs** that don't match the code",
  ];
  s.addText(items.flatMap((it, i) => para(it, { bullet: { indent: 14 }, fontSize: 13, color: C.ink, paraSpaceBefore: i ? 6 : 0 }, i < items.length - 1)),
    { x: col(2) + 0.15, y: 2.45, w: colW - 0.3, h: 2.55, fontFace: BF, valign: "top", margin: 0 });

  forYouBand(s, "Before you send it, ask: did I **read** it, did I **run** it, and could I **explain** it? If not, it's workslop, whoever wrote it.");
  s.addNotes("Workslop was named in Harvard Business Review on 22 September 2025 ('AI-Generated Workslop Is Destroying Productivity') by Kate Niederhoffer, Gabriella Rosen Kellerman, Angela Lee, Alex Liebscher, Kristina Rapuano and Jeffrey T. Hancock (BetterUp Labs and the Stanford Social Media Lab). Their definition, word for word: 'AI generated work content that masquerades as good work, but lacks the substance to meaningfully advance a given task.' It shifts the work downstream: the receiver has to interpret, check and often redo it. Numbers from their survey of 1,150 full-time US desk workers: 40% received workslop in the last month; each case took on average 1 hour 56 minutes to deal with; 53% admitted that at least some of what they send may be workslop; respondents estimated 15.4% of the work they receive is workslop; the researchers estimate an 'invisible tax' of $186 per employee per month. Be honest about the limits: the figures are self-reported, US only, not peer reviewed, and BetterUp sells coaching services. Treat them as a signal, not a precise cost. For developers, workslop is the unread PR, tests that assert nothing, a description that only restates the diff, a pasted review comment, docs that drift from the code. The rule for the room: read it, run it, be able to explain it before you send it. Sources: hbr.org/2025/09/ai-generated-workslop-is-destroying-productivity, betterup.com/workslop.");
}

// Three-column topic slide: { title, lead, cols: [{ title, fill, dark, body: [para strings] , quote?, who? }], forYou, notes }
function threeColSlide(o) {
  const s = content(o.title, o.lead, o.section || "Buzzwords");
  const colW = (CW - 0.3) / 3;
  o.cols.forEach((c, i) => {
    const x = M + i * (colW + 0.15);
    const ink = c.dark ? C.white : C.ink;
    box(s, x, 1.95, colW, 3.15, c.fill);
    s.addText(c.title, { x: x + 0.15, y: 2.0, w: colW - 0.3, h: 0.4, fontFace: BF, fontSize: 18, bold: true, color: ink, margin: 0 });
    const runs = c.body.flatMap((p, j) => para(p, { fontSize: 13, color: ink, paraSpaceBefore: j ? 8 : 0 }, j < c.body.length - 1 || !!c.quote));
    if (c.quote) {
      runs.push({ text: c.quote, options: { fontSize: 12.5, italic: true, color: c.dark ? C.lime : C.green, paraSpaceBefore: 10, breakLine: true } });
      runs.push({ text: c.who, options: { fontSize: 10.5, color: c.dark ? "A9C3B5" : C.muted, paraSpaceBefore: 4 } });
    }
    s.addText(runs, { x: x + 0.15, y: 2.45, w: colW - 0.3, h: 2.55, fontFace: BF, valign: "top", margin: 0 });
  });
  forYouBand(s, o.forYou);
  s.addNotes(o.notes);
  return s;
}

// Evals
threeColSlide({
  section: "Evals",
  title: "Evals",
  lead: "Evals are tests for AI behaviour: run the model, prompt or agent on real examples and check whether it did what you wanted.",
  cols: [
    {
      title: "Like unit tests, but…",
      fill: C.tint,
      body: [
        "A **unit test**: same input, same output, pass or fail.",
        "An **eval**: the output varies, so you run many examples and track a **pass rate**.",
        "What pass rate is good enough is a product decision, not 100% by default.",
      ],
    },
    {
      title: "Two kinds of sensor",
      fill: C.soft,
      body: [
        "**Deterministic:** tests, types, linters, scripts. Same input, same verdict. Cheap; run on every edit.",
        "**LLM-based:** a reviewer agent, an LLM as judge. Sees design and intent, but slower and can be wrong.",
      ],
      quote: "“Computational sensors catch the structural stuff reliably… These are cheap, proven, and deterministic.”",
      who: "Birgitta Böckeler, martinfowler.com, April 2026",
    },
    {
      title: "Benchmarks are not your evals",
      fill: C.dark,
      dark: true,
      body: [
        "**Benchmarks** (SWE-bench, Terminal-Bench) compare models on shared tasks.",
        "**Product evals** check your tasks and your failures. A high benchmark score says little about either.",
      ],
      quote: "“We also didn’t have specific deployment evaluations tracking sycophancy.”",
      who: "OpenAI, after rolling back GPT-4o, May 2025",
    },
  ],
  forYou: "For coding agents, your **test suite** and **CI** are the evals. When you change AGENTS.md, a skill or the model, rerun a few real tasks and compare. Start by reading where it failed, then write the check.",
  notes: "Define evals before anything else: tests for AI behaviour. Hamel Husain and Shreya Shankar (evals FAQ, September 2026): 'AI evals are tests that tell you whether an AI system is doing what you want.' They distinguish model benchmarks, which compare general-purpose models on shared tasks such as GPQA Diamond or Terminal-Bench, from product evals, which measure whether your specific product does what you want. The difference from unit tests: LLM output is non-deterministic, so you run many examples and track a pass rate; Husain notes you don't necessarily need 100%, the pass rate is a product decision. Two kinds of evaluator: code-based checks for objective failures (valid JSON, correct date, tests pass), cheap enough to run on every commit; and LLM-as-judge for subjective ones (tone, when to hand off to a human), which need around 100 labelled examples and ongoing maintenance. Quote from Gergely Orosz and Hamel Husain, 'A pragmatic guide to LLM evals for devs', Pragmatic Engineer, December 2025. Their method starts with error analysis: read real traces, find the failures, then write evals for the ones that matter. The OpenAI line links to the next slide: in their May 2025 post-mortem on the sycophantic GPT-4o update, offline evals and A/B tests looked good, and they admitted they had no deployment eval for sycophancy. Link back to prompt debt: Breunig's fix was to specify behaviour with measurements, which means evals. Sources: hamel.dev/blog/posts/evals-faq, newsletter.pragmaticengineer.com/p/evals, openai.com/index/expanding-on-sycophancy.",
});

// Sycophancy
threeColSlide({
  title: "Sycophancy",
  lead: "Sycophancy is when the model tells you what you want to hear: it agrees, praises and backs down, even when you are wrong.",
  cols: [
    {
      title: "Why it happens",
      fill: C.tint,
      body: [
        "Models are trained on **human ratings**, and people tend to rate agreement higher.",
        "Anthropic tested five assistants in 2023: all were consistently sycophantic.",
      ],
      quote: "“Both humans and preference models prefer convincingly-written sycophantic responses over correct ones a non-negligible fraction of the time.”",
      who: "Sharma et al., Anthropic, 2023",
    },
    {
      title: "A real case",
      fill: C.soft,
      body: [
        "April 2025: an update to GPT-4o in ChatGPT gave more weight to thumbs-up feedback.",
        "It became “overly supportive but disingenuous”, praising bad ideas. OpenAI **rolled it back** four days later.",
        "Its evals and A/B tests had looked good.",
      ],
    },
    {
      title: "In our work, it looks like",
      fill: C.amberTint,
      body: [
        "“You're absolutely right!”, then it changes a **correct** answer because you pushed back",
        "It praises your design instead of finding the flaw",
        "A reviewer agent that approves the PR you clearly wanted approved",
      ],
    },
  ],
  forYou: "Agreement is not evidence. Ask neutral questions (“what's wrong with this?”, not “this is fine, right?”), ask it to argue the other side, and let **tests** and a fresh-context **reviewer** decide.",
  notes: "Define it first: sycophancy is the model telling you what you want to hear, matching your views over the truth. Why: assistants are fine-tuned with human feedback, and human raters tend to prefer answers that agree with them. Anthropic's paper 'Towards Understanding Sycophancy in Language Models' (Sharma et al., October 2023, ICLR 2024) showed five AI assistants consistently exhibit sycophancy across four tasks, and that when a response matches a user's views it is more likely to be preferred. The quote on the slide is from its abstract. They conclude sycophancy is a general behaviour of AI assistants, likely driven in part by human preference judgments. The real case: on 25 April 2025 OpenAI shipped a GPT-4o update to ChatGPT; it added a reward signal from thumbs-up and thumbs-down feedback, and the model 'skewed towards responses that were overly supportive but disingenuous' (OpenAI, 29 April 2025). It was rolled back from 28 April. Their post-mortem: offline evals and A/B tests looked good, some expert testers felt it was 'slightly off', and they had no deployment eval for sycophancy; they now treat behaviour issues as launch-blocking. For developers: the coding-agent version is 'You're absolutely right!' followed by abandoning a correct answer, praising a weak design, or a reviewer agent that approves what you obviously wanted approved. Habits: ask neutral questions, ask it to argue the other side or list what's wrong, and rely on tests and a reviewer in a fresh context, not on its agreement. Sources: arxiv.org/abs/2310.13548, openai.com/index/sycophancy-in-gpt-4o, openai.com/index/expanding-on-sycophancy.",
});

// Lethal trifecta
{
  const s = content("The lethal trifecta", "A one-minute threat model: three things that are fine on their own, and dangerous together.", "Buzzwords");
  const legs = ["Private data", "Untrusted content", "A way to send data out"];
  const examples = ["Your repo, secrets, customer data", "A public issue, a web page, a tool result", "Internet access, a PR comment, an email"];
  legs.forEach((leg, i) => {
    const x = M + i * 3.2;
    box(s, x, 1.95, 2.75, 2.2, C.tint);
    s.addText([
      { text: leg, options: { bold: true, fontSize: 19, color: C.ink, breakLine: true } },
      { text: examples[i], options: { fontSize: 13, color: C.muted, paraSpaceBefore: 8 } },
    ], { x, y: 1.95, w: 2.75, h: 2.2, fontFace: BF, valign: "middle", margin: 14 });
    s.addText(i < 2 ? "+" : "=", { x: x + 2.75, y: 1.95, w: 0.45, h: 2.2, fontFace: HF, fontSize: 30, bold: true, color: C.green, align: "center", valign: "middle", margin: 0 });
  });
  box(s, M + 9.6, 1.95, CW - 9.6, 2.2, C.amber);
  s.addText("Someone else can steer your agent into leaking your data", { x: M + 9.6, y: 1.95, w: CW - 9.6, h: 2.2, fontFace: BF, fontSize: 17, bold: true, color: C.white, valign: "middle", margin: 12 });
  s.addText("Prompt injection: text the agent reads, such as a comment in an issue, quietly becomes instructions. “Lethal trifecta” is Simon Willison's term, June 2025.", { x: M, y: 4.35, w: CW, h: 0.7, fontFace: BF, fontSize: 14, italic: true, color: C.muted, margin: 0 });
  forYouBand(s, "An agent with your repo, reading a public issue, with internet access, has all three. Apply **least privilege**: remove one leg. No secrets, no untrusted input, or no way out.");
  s.addNotes("Simon Willison's lethal trifecta (simonwillison.net/2025/Jun/16/the-lethal-trifecta): an agent that has access to private data, is exposed to untrusted content, and can communicate externally can be tricked by prompt injection into sending the data to an attacker. Each leg alone is normal; all three together is the risk. The practical defence is to remove a leg for the task: run without secrets, avoid reading untrusted content, or cut external access. Relevant as soon as agents read issues, web pages or API results, and especially for unattended loops.");
}

// Lethal trifecta: one real attack, step by step
{
  const s = content("The lethal trifecta", "The lethal trifecta: an agent with private data, untrusted input and a way to send data out can be tricked into leaking. A real case, GitHub's MCP server, May 2025:", "Buzzwords");
  const steps = [
    ["1", "Attacker", "Files a public issue with hidden instructions, telling the agent to read the owner's private repos.", "UNTRUSTED CONTENT"],
    ["2", "You", "Ask the agent: “Have a look at the open issues and fix them.”", null],
    ["3", "Agent", "Reads the issue, follows it, and opens your private repos.", "PRIVATE DATA"],
    ["4", "Agent", "Opens a public pull request containing the private data.", "WAY OUT"],
  ];
  const sw = (CW - 3 * 0.15) / 4;
  steps.forEach(([n, who, what, leg], i) => {
    const x = M + i * (sw + 0.15);
    box(s, x, 1.95, sw, 1.95, i === 1 ? C.soft : C.tint);
    s.addText([
      { text: `${n}  ${who}`, options: { bold: true, fontSize: 16, color: C.ink, breakLine: true } },
      { text: what, options: { fontSize: 12.5, color: C.ink, paraSpaceBefore: 6 } },
    ], { x, y: 1.95, w: sw, h: 1.55, fontFace: BF, valign: "top", margin: 12 });
    if (leg) chip(s, x + 0.12, 3.5, sw - 0.24, 0.3, leg, C.amberTint, C.amber, 10);
    if (i < steps.length - 1) arrow(s, x + sw - 0.05, 2.75, 0.25, 0.3, C.green);
  });

  box(s, M, 4.05, 6.0, 1.05, C.dark);
  s.addText([
    { text: "“LLMs follow instructions in content.” They can't reliably tell your instructions from an attacker's.", options: { fontSize: 13.5, color: C.white, breakLine: true } },
    { text: "Simon Willison, who named the trifecta, June 2025", options: { fontSize: 10.5, color: C.lime, paraSpaceBefore: 4 } },
  ], { x: M, y: 4.05, w: 6.0, h: 1.05, fontFace: BF, valign: "middle", margin: 12 });
  box(s, M + 6.15, 4.05, CW - 6.15, 1.05, C.amberTint);
  s.addText(para("**Why “tell it not to” fails:** guardrail products claim to catch 95% of attacks. In security, 95% is a failing grade.", { fontSize: 13.5, color: C.ink }),
    { x: M + 6.15, y: 4.05, w: CW - 6.15, h: 1.05, fontFace: BF, valign: "middle", margin: 12 });

  forYouBand(s, "Break the chain, don't trust the prompt. Use a **least-privilege** token that can't see other repos, keep untrusted input away from agents with secrets, and block the way out: no network, no public writes.");
  s.addNotes("The lethal trifecta was named by Simon Willison on 16 June 2025: an agent is exploitable when it combines access to private data, exposure to untrusted content, and the ability to communicate externally. If all three are present, an attacker can trick it into reading your data and sending it to them. The example on the slide is the GitHub MCP exploit reported by Invariant Labs in May 2025, which Willison uses in his post: one MCP server mixed all three. It could read public issues (filed by anyone), read private repositories, and create pull requests. An attacker filed an issue on a public repo with instructions; when the owner asked their agent to look at the open issues, the agent followed the hidden instructions, read the owner's private repos and published the data in a pull request on the public repo. Why it works: 'LLMs follow instructions in content', and they can't reliably tell where an instruction came from; everything becomes one sequence of tokens. This is prompt injection, a term Willison coined in 2022 by analogy with SQL injection; it is not the same as jailbreaking. Why prompting it to be careful isn't enough: vendors sell guardrails that claim to catch '95% of attacks', and Willison's point is that in web application security 95% is a failing grade. The only reliable defence when you combine tools yourself is to remove one leg: a scoped token, no untrusted input for agents with secrets, or no way to send data out. Sources: simonwillison.net/2025/Jun/16/the-lethal-trifecta, simonwillison.net/2025/May/26/github-mcp-exploited.");
}

// Evals section
{
  const s = section("Checking AI work", "Evals: how you know the agent did what you wanted", "Evals");
  s.addNotes("This section is about checking AI work. Buzzwords showed how models and work go wrong; evals are how you catch it. Philosophy and practice only: what an eval is, which checks you already own, where checks belong in the workflow, and how to grow them from real failures.");
}

threeColSlide({
  section: "Evals",
  title: "Tests are your evals",
  lead: "For a coding agent, the checks you already own are its evals: tests, types, linters, the build and CI. They pass or fail without asking the model.",
  cols: [
    {
      title: "Checks you already own",
      fill: C.tint,
      body: [
        "**Tests:** does it behave as specified?",
        "**Types and linters:** does it follow the rules?",
        "**Build and CI:** does it still fit with everything else?",
        "None of them care how confident the agent sounds.",
      ],
    },
    {
      title: "Who checks the checker?",
      fill: C.soft,
      body: [
        "When the same agent writes the code and the tests, the tests may only confirm what the code already does.",
        "Write or review the tests **first**. See them **fail** before the fix, pass after it.",
        "Watch for an agent that edits a test to make it pass.",
      ],
    },
    {
      title: "Done means proven",
      fill: C.dark,
      dark: true,
      body: [
        "“Done” from the agent is a claim, not evidence.",
        "Ask for the command it ran and the output it got.",
        "No check, no done.",
      ],
    },
  ],
  forYou: "Before you hand over a task, decide which **check** will prove it is finished. If no check exists, writing one is the first task.",
  notes: "Link back to the Evals slide: evals are tests for AI behaviour. For coding agents most of the evals already exist: tests, type checks, linters, the build and CI. They are code checks, cheap and objective, and they do not depend on the model's own opinion of its work. The weak spot is the checker itself: if the agent writes both the implementation and the tests, the tests can simply mirror the implementation, including its mistakes. Habits: write or review the tests before the implementation, see them fail first (red, then green), and treat changes to existing tests as something to review carefully. Finally, 'done' is a claim; ask for the commands and their output. This is the same idea as the verification step in Superpowers and Agentcraft that participants will see in the trials.",
});

{
  const s = content("Checks in the workflow", "A good agent workflow puts a check at every step, so mistakes are caught where they are cheapest to fix.", "Evals");
  const steps = [
    ["Plan", "You read the plan before any code. A wrong decision costs one sentence here."],
    ["Test first", "The new test fails for the right reason before the change."],
    ["Implement", "Tests, types and lint pass after each small step."],
    ["Review", "A reviewer in a fresh context checks scope and quality. It didn't write the code."],
    ["Verify", "The commands are run and the output is shown. Then it is done."],
  ];
  const cw = (CW - 4 * 0.12) / 5;
  steps.forEach(([t, d], i) => {
    const x = M + i * (cw + 0.12);
    box(s, x, 1.95, cw, 3.15, i % 2 ? C.soft : C.tint);
    s.addText([
      { text: `${i + 1}`, options: { bold: true, fontSize: 22, color: C.green, breakLine: true } },
      { text: t, options: { bold: true, fontSize: 17, color: C.ink, paraSpaceBefore: 4, breakLine: true } },
      { text: d, options: { fontSize: 14, color: C.ink, paraSpaceBefore: 10 } },
    ], { x, y: 1.95, w: cw, h: 3.15, fontFace: BF, valign: "top", margin: 12 });
  });
  forYouBand(s, "In today's trials, notice which of these checks each workflow has, and which ones it leaves to you.");
  s.addNotes("Define the idea: checks belong at every step of the workflow, not only at the end. The earlier a check runs, the cheaper the mistake it catches: a wrong design caught in the plan costs a sentence; caught in review it costs a rewrite. Plan: the human reads and approves the plan. Test first: the failing test proves the test can detect the problem. Implement: fast code checks after each small step. Review: a reviewer in a fresh context, so it doesn't share the author's assumptions and isn't inclined to agree (link to sycophancy). Verify: the agent runs the commands and shows the output before claiming it is done. Use this as a lens for the four workflow trials: Native, Stack-aware, Superpowers and Agentcraft each put these checks in different places, or leave them to you.");
}

threeColSlide({
  section: "Evals",
  title: "Start from failures",
  lead: "Error analysis means reading real agent runs, naming what went wrong, and writing checks for the failures that keep coming back.",
  cols: [
    {
      title: "1  Read",
      fill: C.tint,
      body: [
        "Look at real sessions and diffs where the result was wrong or needed corrections.",
        "Read what the agent actually did, not what it said it did.",
      ],
    },
    {
      title: "2  Name",
      fill: C.soft,
      body: [
        "Group the failures into kinds:",
        "skipped the tests · touched unrelated files · ignored our conventions · invented an API · stopped too early",
        "A few kinds usually cover most of the pain.",
      ],
    },
    {
      title: "3  Check",
      fill: C.dark,
      dark: true,
      body: [
        "Turn a repeated failure into a check: a test, a lint rule, a hook, a review step.",
        "Add a rule to AGENTS.md only when no check can catch it.",
      ],
    },
  ],
  forYou: "Keep a short **failure log** during today's trials: what went wrong, and what would have caught it. That log is your first eval set.",
  notes: "Define error analysis: reading real outputs, naming the failures and counting which kinds repeat, before writing any eval. Hamel Husain and Shreya Shankar's evals course is built on this order: look at the data first, then write the checks for the failures that matter, instead of inventing generic metrics up front. For coding agents the 'data' is your sessions and diffs. Read what the agent did, not its summary. Name the failures in your own words and group them. Then turn the repeated ones into checks, preferring something that passes or fails (test, lint rule, pre-commit hook, reviewer step) over another sentence in the instructions. This ties back to prompt debt: every incident that becomes one more rule makes the prompt heavier; a check carries the weight instead.",
});

threeColSlide({
  section: "Evals",
  title: "Evals for your agent setup",
  lead: "Your agent setup (instructions, skills, model and workflow) is code too. When you change it, rerun a few real tasks and compare before you trust the change.",
  cols: [
    {
      title: "A small task set",
      fill: C.tint,
      body: [
        "Three to five real tasks you already finished, with a known good result.",
        "Mix them: a bug fix, a feature, a refactor.",
      ],
    },
    {
      title: "Change one thing",
      fill: C.soft,
      body: [
        "A line in AGENTS.md, a skill, the model or the workflow.",
        "Run the same tasks before and after. Change several things at once and you won't know which one helped.",
      ],
    },
    {
      title: "Compare evidence",
      fill: C.dark,
      dark: true,
      body: [
        "Do the tests pass?",
        "Did it stay in scope?",
        "Did it follow our conventions?",
        "How many times did you have to step in?",
      ],
    },
  ],
  forYou: "This afternoon's **compare the four** is exactly this: one task, four setups, judged on evidence instead of impressions.",
  notes: "Define it: an eval for the setup, not for the product. Instructions, skills, the chosen model and the workflow all change agent behaviour, so a change to any of them should be tested like a code change. Keep a small set of real tasks with known good outcomes; rerun them before and after a change, one change at a time; and compare on evidence: tests, scope, conventions, and how often a human had to correct the agent. It doesn't need tooling to start: a short table is enough. This is the same method as the workshop's trial rows and the 'Compare the four' slot in the afternoon.",
});

// Evals: concrete practice
function codePane(s, x, y, w, h, label, code, size = 12) {
  box(s, x, y, w, h, C.dark);
  s.addText(label, { x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.32, fontFace: BF, fontSize: 11, bold: true, color: C.lime, charSpacing: 1, margin: 0 });
  s.addText(code, { x: x + 0.15, y: y + 0.42, w: w - 0.3, h: h - 0.5, fontFace: "Courier New", fontSize: size, color: C.white, valign: "top", margin: 0 });
}



{
  const s = content("A reviewer with a checklist", "A reviewer agent is an LLM as judge for code: a second agent, in a fresh context, that checks the diff against a fixed list.", "Evals");
  codePane(s, M, 1.95, 7.3, 4.7, ".github/agents/reviewer.md",
    `---
description: Reviews the current branch. Never edits code.
tools: read-only (read, search, git diff)
---
Review git diff main...HEAD against docs/plan.md.
For each item, answer PASS or FAIL with file:line evidence.

1. Every changed file is needed by the plan.
2. New behaviour has a test that fails without it.
3. No test was weakened, skipped or deleted.
4. Errors are handled, not swallowed.
5. Names and structure follow AGENTS.md.

End with VERDICT: PASS or FAIL.
Do not praise. Do not suggest extras.`, 12.5);
  box(s, M + 7.45, 1.95, CW - 7.45, 4.7, C.tint);
  s.addText([
    { text: "What makes it work", options: { bold: true, fontSize: 18, color: C.ink, breakLine: true } },
    ...["**Fresh context:** it didn't write the code, so it doesn't share the author's assumptions.", "**Read-only:** it judges; it doesn't fix.", "**Yes or no items** with evidence, not a score from 1 to 10.", "**No praise:** fights sycophancy.", "**Test the judge:** run it on a branch you know is bad. If it passes, fix the checklist."]
      .flatMap((t, i, a) => para(t, { bullet: { indent: 14 }, fontSize: 14.5, color: C.ink, paraSpaceBefore: 8 }, i < a.length - 1)),
  ], { x: M + 7.45, y: 1.95, w: CW - 7.45, h: 4.7, fontFace: BF, valign: "top", margin: 16 });
  s.addNotes("This is the LLM-as-judge idea from the Evals slide, applied to code review. The reviewer is a separate agent definition (Copilot uses .github/agents/*.md; OpenCode and Claude Code have equivalent agent files; the frontmatter fields differ by harness, so treat the header as a sketch). Key choices: it runs in a fresh context so it doesn't inherit the implementer's reasoning; it has read-only tools; the checklist items are binary with evidence, because vague scores drift and can't be acted on; and it is told not to praise, which counters sycophancy. Finally, evaluate the judge itself: give it a branch with a known problem, for example a deleted test or an unrelated file change, and confirm it fails. Superpowers' requesting-code-review and Agentcraft's scope and quality reviewers are full versions of this pattern; participants will see them in the trials.");
}


{
  const s = content("A setup eval you can run", "A setup eval reruns a few real tasks with your agent and checks each result with a script, so you can compare before and after a change.", "Evals");
  codePane(s, M, 1.95, 4.6, 3.3, "evals/",
    `tasks/
  fix-date-parsing/
    task.md   the prompt
    start     a1b2c3d
    check.sh  mvn -q test
              -Dtest=DateParserTest
  add-archived-flag/
    ...
run.sh`, 12.5);
  codePane(s, M + 4.75, 1.95, CW - 4.75, 3.3, "evals/run.sh",
    `for t in evals/tasks/*/; do
  git worktree add -f ../ev "$(cat $t/start)"
  (cd ../ev && copilot -p "$(cat $t/task.md)" --allow-all-tools)
  (cd ../ev && bash "$OLDPWD/$t/check.sh") && r=PASS || r=FAIL
  echo "$t $r $(git -C ../ev diff --name-only | wc -l) files"
  git worktree remove -f ../ev
done`, 11.5);
  box(s, M, 5.4, CW, 1.25, C.soft);
  s.addText([
    { text: "When to run it", options: { bold: true, fontSize: 12, color: C.green, charSpacing: 1, breakLine: true } },
    ...para("After you change **AGENTS.md**, a **skill**, the **model** or the **workflow**. Not on every commit. Run each task two or three times, because the output varies. Other harnesses: **opencode run** or **claude -p**.", { fontSize: 15, color: C.ink, paraSpaceBefore: 4 }),
  ], { x: M, y: 5.4, w: CW, h: 1.25, fontFace: BF, valign: "middle", margin: 14 });
  s.addNotes("A concrete, minimal version of 'Evals for your agent setup'. Each task is a folder: the prompt as a developer would write it, the commit to start from, and a check script that passes or fails. Pick tasks you already solved, so you know a good result exists. run.sh starts each task in a fresh worktree at the start commit, runs the agent non-interactively (Copilot CLI with -p; OpenCode with opencode run; Claude Code with claude -p), runs the check, and prints pass or fail plus the number of changed files as a rough scope signal. Run it before and after one change to your setup. Because agent output varies, run each task two or three times and look at the pattern, not one result. Keep it small: three to five tasks is enough to catch a setup change that makes things worse. Read the diffs of the failures; that feeds back into 'Start from failures'.");
}


{
  const s = content("Three layers of enforcement", "Checks run in three layers: while the agent edits, before it says done, and before the code merges. Only the last layer is out of the agent's reach.", "Evals");
  table(s, ["Layer", "When", "What runs", "Can the agent get around it?"], [
    ["1  Edit", "Before and after every tool call", "preToolUse blocks protected paths and commands; postToolUse runs format, lint and types", "Yes: shell tricks, or editing the hook config"],
    ["2  Done", "Before it stops, before every commit", "The stop hook runs make verify; the pre-commit hook runs lint, gitleaks and the commit message check", "Yes: --no-verify, unless a hook denies it"],
    ["3  Merge", "On every pull request", "CI runs make verify, static analysis and security scans; branch protection, CODEOWNERS, human review", "No"],
    ["Around it", "Always", "A sandbox or devcontainer: limited network, no production secrets", "No"],
  ], { x: M, y: 1.95, w: CW, colW: [1.5, 2.4, 5.3, 2.933], rowH: 0.6, size: 12.5, boldFirst: true });
  forYouBand(s, "Layers 1 and 2 give fast feedback; layer 3 is the guarantee. Every check that really matters must also run in **CI**.");
  s.addNotes("This slide replaces the earlier 'When to run which check' table with the same content grouped into layers. Layer 1, edit: harness hooks. preToolUse can deny a tool call before it happens (protected paths, dangerous commands); postToolUse runs fast checks after edits and feeds errors back. These are guardrails against accidents, not security: an agent can work around them with shell commands such as sed, or by editing the hook files. Layer 2, done: the stop hook (agentStop in Copilot CLI, Stop in Claude Code) runs one definition-of-done script such as make verify, and git pre-commit and commit-msg hooks run lint, gitleaks and commit message rules. git commit --no-verify skips git hooks, so deny it in preToolUse. Layer 3, merge: CI reruns everything, plus slower static analysis and security scans; branch protection requires green CI and a human approval; CODEOWNERS protects tests, hooks, baselines and CI config. This is the only layer the agent cannot change. Around it: run agents in a sandbox or devcontainer with limited network access and no production secrets, which also breaks the lethal trifecta.");
}

{
  const s = content("Hooks: checks the agent can't skip", "A hook is a command the harness runs at a fixed moment, such as before a tool call or when the agent wants to stop. An instruction asks; a hook enforces.", "Evals");
  codePane(s, M, 1.95, 6.6, 3.25, ".github/hooks/protect.sh  (preToolUse: before every tool call)",
    `#!/bin/bash
path=$(jq -r '.toolArgs | (fromjson? // .) | .path // ""')
if [[ $path =~ src/test/|db/migration/|\\.github/hooks/ ]]; then
  echo '{"permissionDecision": "deny",
    "permissionDecisionReason": "Protected path. Ask a human."}'
fi`, 11);
  codePane(s, M + 6.75, 1.95, CW - 6.75, 3.25, ".github/hooks/must-pass.sh  (agentStop)",
    `#!/bin/bash
if ! mvn -q test > test.log 2>&1; then
  echo '{"decision": "block",
    "reason": "Tests fail. Fix code, not tests."}'
fi`, 11);
  box(s, M, 5.35, CW, 1.3, C.soft);
  s.addText([
    { text: "Also worth blocking", options: { bold: true, fontSize: 12, color: C.green, charSpacing: 1, breakLine: true } },
    ...para("**git push --force**, **--no-verify**, **rm -rf**, **npm install** without approval, and code edits before an approved plan exists. Keep preToolUse hooks under a second: in Copilot CLI, a hook that times out lets the action through.", { fontSize: 15, color: C.ink, paraSpaceBefore: 4 }),
  ], { x: M, y: 5.35, w: CW, h: 1.3, fontFace: BF, valign: "middle", margin: 14 });
  s.addNotes("Both scripts are wired in .github/hooks/checks.json under preToolUse and agentStop (Copilot CLI; docs.github.com/en/copilot/reference/hooks-reference). preToolUse receives the tool name and its arguments as JSON on stdin and can return permissionDecision 'deny' with a reason; the agent sees the reason and adjusts. The exact argument field for the file path differs per tool, so test the script with a real session before relying on it. Protect the tests, the migrations that already ran, and the hook files themselves, otherwise the agent can edit its own guard. agentStop runs when the agent finishes a turn; decision 'block' forces it to continue. Guard against endless loops: Claude Code overrides a Stop hook after eight consecutive blocks; in Copilot, check stop_hook_active or count retries. Claude Code has the same pattern with PreToolUse (exit code 2 blocks) and Stop; Copilot CLI also reads .claude/settings.json hooks. Caveats: a preToolUse command hook fails closed if it crashes, but fails open on timeout; hooks are guardrails against accidents, not a security boundary, because the agent can use shell commands; CI is the real gate.");
}

{
  const s = content("Tests the agent can't cheat", "An agent under pressure to get green can weaken the test instead of fixing the code. These checks make that visible or impossible.", "Evals");
  codePane(s, M, 1.95, 6.9, 4.7, "ci/test-integrity.sh  (runs on every PR)",
    `#!/bin/bash
base=origin/main
tests=('*Test.java' '*.test.ts' '*.test.tsx')

if git diff -U0 $base...HEAD -- "\${tests[@]}" \\
  | grep -E '^\\+.*(@Disabled|\\.skip\\(|\\.only\\(|xit\\()'; then
  echo "A test was skipped or focused"; exit 1
fi

if git diff --diff-filter=D --name-only $base...HEAD \\
  -- "\${tests[@]}" | grep .; then
  echo "A test file was deleted"; exit 1
fi`, 11);
  box(s, M + 7.05, 1.95, CW - 7.05, 4.7, C.tint);
  s.addText([
    { text: "And three more", options: { bold: true, fontSize: 18, color: C.ink, breakLine: true } },
    ...["**Coverage on changed lines:** diff-cover fails the PR if new code isn't tested.", "**Golden master before a refactor:** record today's output with approval tests. The approved files are protected.", "**Hidden tests:** acceptance scenarios in a repo the agent can't see or edit. CI runs them."]
      .flatMap((t, i, a) => para(t, { bullet: { indent: 14 }, fontSize: 14.5, color: C.ink, paraSpaceBefore: 10 }, i < a.length - 1)),
  ], { x: M + 7.05, y: 1.95, w: CW - 7.05, h: 4.7, fontFace: BF, valign: "top", margin: 16 });
  s.addNotes("The failure: an agent asked to make tests pass may take the shortest path, which is to skip, loosen or delete the test. Kent Beck lists 'disabling or deleting tests' as a sign the agent is cheating (Augmented Coding: Beyond the Vibes, June 2025). StrongDM: 'A test, stored in the codebase, can be lazily rewritten to match the code' (factory.strongdm.ai, February 2026). The script runs in CI and fails if a diff adds @Disabled, .skip, .only or xit, or deletes a test file; add a label override for legitimate deletions. Coverage on changed lines: diff-cover reads a coverage report (Cobertura or JaCoCo XML) and compares against the base branch, for example diff-cover coverage.xml --compare-branch=origin/main --fail-under=80. Golden master: before an agent refactors, capture current behaviour with approval tests (ApprovalTests.Java, Jest snapshots run with --ci) and protect the approved files; a pure refactor must keep them identical. Hidden tests: StrongDM keeps scenarios outside the repository, like a holdout set in model training, so the agent cannot rewrite them; CI checks them out with a token the agent does not have. A simpler version for teams: a test-writer agent that may only edit src/test, and an implementer that may not.");
}

{
  const s = content("Static analysis and code health", "Static analysis checks the code without running it: complexity, duplication, types and security. Agents copy patterns, so these limits matter more than before.", "Evals");
  codePane(s, M, 1.95, 6.6, 3.25, "eslint.config.js  (rules excerpt)",
    `rules: {
  complexity: ["error", 10],
  "max-lines-per-function": ["error", { max: 50 }],
  "sonarjs/cognitive-complexity": ["error", 15],
  "@typescript-eslint/no-explicit-any": "error",
}
// Java: PMD or Checkstyle limits, Error Prone + NullAway
// Duplication: npx jscpd src, mvn pmd:cpd-check`, 11);
  box(s, M + 6.75, 1.95, CW - 6.75, 3.25, C.tint);
  s.addText([
    ...["**Off by default:** complexity and length limits aren't in the recommended presets. Turn them on.", "**Ratchet:** eslint --suppress-all records today's problems; only new ones fail. Protect the baseline file.", "**Security on new code:** CodeQL or a SonarQube quality gate in CI."]
      .flatMap((t, i, a) => para(t, { bullet: { indent: 14 }, fontSize: 14, color: C.ink, paraSpaceBefore: i ? 10 : 0 }, i < a.length - 1)),
  ], { x: M + 6.75, y: 1.95, w: CW - 6.75, h: 3.25, fontFace: BF, valign: "top", margin: 16 });
  box(s, M, 5.35, CW, 1.3, C.dark);
  s.addText([
    { text: "Write the error message for the agent: say how to fix it", options: { bold: true, fontSize: 12, color: C.lime, charSpacing: 1, breakLine: true } },
    { text: "“Because the lints are custom, we write the error messages to inject remediation instructions into agent context.” OpenAI, Harness engineering, February 2026", options: { fontSize: 15, color: C.white, paraSpaceBefore: 4 } },
  ], { x: M, y: 5.35, w: CW, h: 1.3, fontFace: BF, valign: "middle", margin: 14 });
  s.addNotes("Define static analysis: checking code without running it. Birgitta Böckeler (Maintainability sensors for coding agents, martinfowler.com, May 2026) calls oversized functions, deep nesting and long parameter lists 'the AI failure modes that are the most low-hanging fruit for static code analysis', notes these limits weren't active in ESLint's default preset, and observes agents are 'quite happy to copy and paste'. TypeScript: ESLint core rules complexity, max-lines-per-function, max-params, max-depth, plus eslint-plugin-sonarjs cognitive-complexity, and @typescript-eslint/no-explicit-any with tsconfig strict. Java: PMD (CognitiveComplexity, NcssCount) or Checkstyle (CyclomaticComplexity, MethodLength), Error Prone with NullAway for null safety. Duplication: jscpd for TS, PMD CPD for Java. Ratchet: in an existing codebase you can't fix everything first; ESLint's bulk suppressions (eslint --suppress-all writes eslint-suppressions.json) let old violations pass and new ones fail; SonarQube's 'clean as you code' gate applies conditions to new code only. Protect baseline files and thresholds with CODEOWNERS, otherwise the agent raises the limit. Böckeler saw the agent move complexity elsewhere (prop chains) to satisfy length limits, so combine several metrics and still review. Security: CodeQL code scanning or a SonarQube quality gate as a required check. Agent-readable messages: OpenAI's harness engineering post (February 2026) writes custom lint messages that tell the agent how to fix the problem. Verify flags against your installed versions.");
}

{
  const s = content("Commit and PR gates", "Commit and PR gates check the shape of the work, not just the code: what each commit is, how big the change is, and who must approve it.", "Evals");
  codePane(s, M, 1.95, 6.9, 3.25, "Structural vs. behavioural commits",
    `# lefthook.yml: every commit says what kind it is
commit-msg:
  commands:
    kind:
      run: grep -qE '^(structural|behavioral): ' {1}

# CI: a structural commit must not change tests
for c in $(git rev-list origin/main..HEAD); do
  git log -1 --format=%s $c | grep -q '^structural:' &&
  git diff-tree --no-commit-id --name-only -r $c |
    grep -q 'src/test/' && { echo "$c changes tests"; exit 1; }
done`, 10.5);
  box(s, M + 7.05, 1.95, CW - 7.05, 3.25, C.tint);
  s.addText([
    { text: "PR gates", options: { bold: true, fontSize: 18, color: C.ink, breakLine: true } },
    ...["**Size limit:** a PR over about 400 changed lines fails; split it.", "**Links a plan or issue** in its description.", "**Branch protection:** green CI and a human approval.", "**CODEOWNERS** on tests, hooks, baselines and CI config."]
      .flatMap((t, i, a) => para(t, { bullet: { indent: 14 }, fontSize: 14, color: C.ink, paraSpaceBefore: 8 }, i < a.length - 1)),
  ], { x: M + 7.05, y: 1.95, w: CW - 7.05, h: 3.25, fontFace: BF, valign: "top", margin: 16 });
  box(s, M, 5.35, CW, 1.3, C.dark);
  s.addText([
    { text: "Kent Beck's rule for working with agents", options: { bold: true, fontSize: 12, color: C.lime, charSpacing: 1, breakLine: true } },
    { text: "“Never mix structural and behavioral changes in the same commit.” A refactor that also changes behaviour can't be checked; split, and each half can.", options: { fontSize: 15, color: C.white, paraSpaceBefore: 4 } },
  ], { x: M, y: 5.35, w: CW, h: 1.3, fontFace: BF, valign: "middle", margin: 14 });
  s.addNotes("Commit and PR gates check the shape of the work. Structural vs behavioural: Kent Beck's system prompt for augmented coding (Augmented Coding: Beyond the Vibes, June 2025) says 'Never mix structural and behavioral changes in the same commit' and that commit messages must state which kind they are. Why it matters with agents: a structural commit (rename, extract, move) should change no behaviour, so the existing tests must pass unchanged; a commit that mixes both is hard to review. The lefthook commit-msg hook rejects commits without a structural: or behavioral: prefix ({1} is the commit message file). The CI loop fails if a structural commit touches test files. Teams on Conventional Commits can map this to commitlint types, for example refactor for structural. PR gates: a size limit keeps changes reviewable (GitHub has no built-in one; use a small script or Danger); require each PR to link its plan or issue; branch protection or rulesets require green CI and at least one human approval; CODEOWNERS on tests, hook files, lint baselines and CI workflows means the agent cannot change its own gates without a human. The 400-line figure is a common rule of thumb, not a standard; pick your own.");
}

{
  const s = content("Checks for typical agent failures", "Each common agent failure has a check that catches it without asking the model.", "Evals");
  table(s, ["The agent…", "The check", "Tools"], [
    ["Edits a test to make it pass", "Block test paths while implementing", "preToolUse hook, CODEOWNERS"],
    ["Writes tests that check nothing", "Mutation testing: change the code, a test must fail", "PIT (Java), Stryker (JS/TS)"],
    ["Touches files outside the plan", "Changed files must match the plan's list", "Scope script in the stop hook and CI"],
    ["Invents an API or a package", "Compile, type-check, review new dependencies", "tsc, mvn compile, dependency review"],
    ["Breaks our architecture", "Layer rules as tests", "ArchUnit, dependency-cruiser"],
    ["Breaks the API for clients", "Diff the generated spec against main", "oasdiff, graphql-inspector"],
    ["Writes an unsafe migration", "Lint migrations; old ones are read-only", "squawk, preToolUse hook"],
    ["Silences a warning", "Ban suppression comments", "eslint-comments/no-use, grep in CI"],
    ["Skips the git hooks", "Deny --no-verify; CI runs it all again", "preToolUse hook, CI"],
    ["Commits a secret", "Scan staged files", "gitleaks in pre-commit"],
    ["Says “done” too early", "Tests must pass before it may stop", "agentStop / Stop hook"],
  ], { x: M, y: 1.95, w: CW, colW: [3.3, 4.8, 4.033], rowH: 0.39, size: 12.5, boldFirst: true });
  s.addNotes("A lookup table: each failure most teams see, with a deterministic check. New rows compared with the earlier version: files outside the plan (the plan lists allowed paths; a script compares git diff --name-only against it and also caps diff size), breaking API changes (generate the OpenAPI spec with springdoc and compare with main using oasdiff; graphql-inspector diff for GraphQL schemas), unsafe migrations (squawk lints Postgres SQL such as Flyway files; a preToolUse hook makes applied migrations read-only), silenced warnings (eslint-plugin-eslint-comments no-use or a CI grep for eslint-disable and @SuppressWarnings), and skipped git hooks (deny git commit --no-verify in preToolUse; CI reruns everything anyway). Mutation testing is slow, so run it on changed code in CI. Ask participants to add rows from their failure log during the trials. Verify tool flags against current docs before use.");
}

{
  const s = content("The checks that matter most", "If you add only six things to your workflow, add these.", "Evals");
  const items = [
    ["Name the check in the brief", "“Done when mvn test -Dtest=DateParserTest passes.” No check, no task."],
    ["Run checks outside the model", "Hooks for fast feedback, CI for the guarantee."],
    ["Tests fail first, and stay protected", "Red before green. The agent may add tests, not weaken them."],
    ["Protect the gates themselves", "Hooks, baselines and CI config behind CODEOWNERS."],
    ["Ratchet, don't rewrite", "New problems fail; old ones get fixed over time."],
    ["A fresh-context reviewer", "Read-only, with a checklist. Then you judge design, naming, security."],
  ];
  items.forEach(([t, d], i) => {
    const y = 1.95 + i * 0.78;
    box(s, M, y, CW, 0.68, i % 2 ? C.soft : C.tint);
    s.addText([
      { text: `${i + 1}   `, options: { bold: true, fontSize: 20, color: C.green } },
      { text: t + "   ", options: { bold: true, fontSize: 16, color: C.ink } },
      { text: d, options: { fontSize: 15, color: C.ink } },
    ], { x: M, y, w: CW, h: 0.68, fontFace: BF, valign: "middle", margin: 16 });
  });
  s.addNotes("The section in one slide. One: every brief names the check that proves the task is done. Two: important checks run outside the model; hooks give fast feedback, CI is the guarantee. Three: a new test must fail before the change, and the agent can add tests but not skip, loosen or delete them. Four: the agent must not be able to edit its own gates, so hook files, lint baselines, thresholds and CI config sit behind CODEOWNERS. Five: in existing code, use a ratchet: block new problems and fix old ones over time, instead of a big cleanup. Six: a read-only reviewer agent in a fresh context with a binary checklist, and then a human reviews what checks can't judge. Ask the room which of the six their workflow already has.");
}

{
  const s = content("More checks to explore", "Backup: more deterministic checks, one line each, for teams that want to go further.", "Evals");
  const groups = [
    ["Stronger tests", "Property-based tests (fast-check, jqwik), contract tests (Pact, Spring Cloud Contract), differential testing of old vs. new code."],
    ["Supply chain", "OSV-Scanner for known vulnerabilities, an SBOM, license checks, Socket for made-up or typo packages."],
    ["Budgets", "Bundle size (size-limit), Lighthouse CI, JMH benchmarks, startup time."],
    ["Accessibility", "jsx-a11y on every edit, axe in Playwright tests."],
    ["Process", "A test-first guard (tdd-guard), an ADR required when architecture config changes, plans kept as files."],
    ["Agent metrics", "Revert rate and churn of AI-assisted commits, cost per task, a transcript check that tests were really run."],
  ];
  const cw = (CW - 0.3) / 3;
  groups.forEach(([t, d], i) => {
    const x = M + (i % 3) * (cw + 0.15);
    const y = 1.95 + Math.floor(i / 3) * 2.4;
    box(s, x, y, cw, 2.25, i % 2 ? C.soft : C.tint);
    s.addText([
      { text: t, options: { bold: true, fontSize: 17, color: C.ink, breakLine: true } },
      { text: d, options: { fontSize: 14, color: C.ink, paraSpaceBefore: 8 } },
    ], { x, y, w: cw, h: 2.25, fontFace: BF, valign: "top", margin: 14 });
  });
  s.addNotes("Backup slide, not presented by default. Ideas from the research that didn't make the main section. Stronger tests: property-based tests generate many inputs and check a rule that must always hold; contract tests check that services agree on their API; differential testing runs the old and the new implementation on the same inputs and compares the results. Supply chain: OSV-Scanner checks lockfiles against known vulnerabilities; an SBOM lists what you ship; Socket flags new, suspicious or non-existent packages, which matters because models sometimes invent package names. Budgets: fail the build when the bundle, page performance, a benchmark or the startup time gets worse. Accessibility: jsx-a11y and axe catch part of WCAG issues automatically. Process: tdd-guard blocks production edits until a failing test exists (its decision is partly made by an LLM); require an ADR when architecture config changes; keep plans as files in the repo. Agent metrics: use Co-authored-by trailers to compare revert rate and churn, track cost per task, and check the session transcript that tests were actually run. All tool names should be checked against current docs before use.");
}


// Where it's heading section
{
  const s = section("Where it's heading", "An open debate about the future of our craft", "Future");
  s.addNotes("A short discussion section with no verdict. The goal is to show the main views on where software development is going with agents, and to let the room talk.");
}

// Future of software development: camps, reading code, open questions
{
  const s = content("The future of software development", "The future of software development is an open debate. Each camp below is a serious view, and none has been proven right. The world is still being built.", "Buzzwords");
  const camps = [
    ["Don't read the code", "Code becomes like compiler output. You judge the result by specs, tests and behaviour, not by reading it."],
    ["You own every line", "AI can type the code, but you must understand it. If you can't explain a change, you shouldn't ship it."],
    ["Manager of agents", "Your job moves up a level: you describe the work, split it, and decide what is good enough."],
    ["Craft", "Writing code is how you think. Hand all of it away and you slowly lose the understanding you need to judge it."],
    ["More builders", "If code becomes cheap, more people build more software. The hard part moves to deciding what to build."],
  ];
  const cw = (CW - 4 * 0.12) / 5;
  camps.forEach(([t, d], i) => {
    const x = M + i * (cw + 0.12);
    box(s, x, 1.95, cw, 3.15, i % 2 ? C.soft : C.tint);
    s.addText([
      { text: t, options: { bold: true, fontSize: 17, color: C.ink, breakLine: true } },
      { text: d, options: { fontSize: 14, color: C.ink, paraSpaceBefore: 10 } },
    ], { x, y: 1.95, w: cw, h: 3.15, fontFace: BF, valign: "top", margin: 12 });
  });
  box(s, M, 5.3, CW, 1.35, C.dark);
  s.addText([
    { text: "The camps overlap", options: { bold: true, fontSize: 12, color: C.lime, charSpacing: 1, breakLine: true } },
    { text: "Most people hold more than one view at once: let the agent write a throwaway script unread, and read every line of the payment service.", options: { fontSize: 15, color: C.white, paraSpaceBefore: 4 } },
  ], { x: M, y: 5.3, w: CW, h: 1.35, fontFace: BF, valign: "middle", margin: 14 });
  s.addNotes("Present this as a map of views, not a verdict. Don't read the code: if the specification and tests are good enough, code is an implementation detail, like compiler output; some teams already try to work this way. You own every line: the AI types, but responsibility and understanding stay with the person who ships it. Manager of agents: the developer's work moves up a level, from writing code to describing work, splitting it across agents, and judging the result. Craft: writing code is how many people think through a problem; if you never write it, you may lose the understanding and judgement needed to review it. More builders: when code gets cheaper, demand usually grows; more people build more software, and the scarce skill becomes deciding what is worth building. Ask the room which camp they lean toward, and for which kind of code.");
}

{
  const s = content("Reading code", "Reading code is the sharpest split: will developers still read what agents write, or judge it only by what it does?", "Buzzwords");
  const side = (x, w, fill, title, argument, pushback) => {
    box(s, x, 1.95, w, 3.15, fill);
    s.addText([
      { text: title, options: { bold: true, fontSize: 20, color: C.ink, breakLine: true } },
      { text: argument, options: { fontSize: 16, color: C.ink, paraSpaceBefore: 10, breakLine: true } },
      { text: "The pushback: ", options: { bold: true, fontSize: 15, color: C.amber, paraSpaceBefore: 16 } },
      { text: pushback, options: { fontSize: 15, color: C.ink } },
    ], { x, y: 1.95, w, h: 3.15, fontFace: BF, valign: "top", margin: 16 });
  };
  const hw = (CW - 0.15) / 2;
  side(M, hw, C.tint, "Don't read it",
    "We don't read compiler output. If the spec and the tests are good enough, the code is an implementation detail.",
    "The same agent often writes the code and the tests. Who checks the checker?");
  side(M + hw + 0.15, hw, C.soft, "Own every line",
    "Code is something you will maintain, debug and answer for. Understanding it is the job, not overhead.",
    "Agents write faster than anyone can read. Reading everything doesn't scale.");
  box(s, M, 5.3, CW, 1.35, C.dark);
  s.addText([
    { text: "The open question", options: { bold: true, fontSize: 12, color: C.lime, charSpacing: 1, breakLine: true } },
    { text: "What would make you trust code you haven't read? The same things that make you trust a colleague's code, or something new?", options: { fontSize: 16, color: C.white, paraSpaceBefore: 4 } },
  ], { x: M, y: 5.3, w: CW, h: 1.35, fontFace: BF, valign: "middle", margin: 14 });
  s.addNotes("Define the question: will developers keep reading the code agents write, or judge it only by its behaviour? Don't read it: we already trust layers we never read, such as compiler output and most libraries; if specifications and tests are strong enough, the code itself matters less. The pushback: when the same agent writes both the code and the tests, the tests may only confirm what the code already does. Own every line: code is a long-lived liability; someone has to maintain, debug and answer for it, so understanding it is the work itself. The pushback: agents produce code faster than people can read it, so reading everything becomes the bottleneck. Ask the room where they draw the line: which code would they ship without reading, and why?");
}

{
  const s = content("Open questions", "Open questions for the room. Nobody has the answers yet, including the people building the tools.", "Buzzwords");
  const qs = [
    "Will we still read code, or only specs and tests?",
    "Who is in the loop, and at which step: every change, every merge, or only when something breaks?",
    "How do juniors learn the craft if agents write most of the code?",
    "If code becomes cheap, what becomes valuable?",
    "Where will your team be in ten years, and what would you need to believe to get there?",
  ];
  qs.forEach((q, i) => {
    const y = 1.95 + i * 0.92;
    box(s, M, y, CW, 0.8, i % 2 ? C.soft : C.tint);
    s.addText([
      { text: `${i + 1}   `, options: { bold: true, fontSize: 22, color: C.green } },
      { text: q, options: { fontSize: 18, color: C.ink } },
    ], { x: M, y, w: CW, h: 0.8, fontFace: BF, valign: "middle", margin: 16 });
  });
  s.addNotes("Discussion slide. Open questions with no right answer yet; the point is awareness of the debate. Suggested format: pick two questions, give pairs three minutes, then take a few answers. Useful prompts: for question 1, ask where they would draw the line between code they read and code they only test. For question 2, connect to the human checkpoints in the graph engineering slide and the approval gates in the workflows they ran. For question 3, mention the worry that juniors lose the practice that builds judgement, and the counter-view that agents are also patient tutors. For question 4, candidates people raise include judgement, taste, product sense, domain knowledge, specification and verification. For question 5, refer back to the camps slide.");
}



// Closing quote
{
  const s = newSlide("Buzzwords", true);
  s.addShape(pres.shapes.OVAL, { x: 9.6, y: 3.3, w: 4.2, h: 4.2, fill: { color: C.dark }, line: { color: C.lime, width: 2 } });
  s.addText("“You can outsource your thinking, but you can't outsource your understanding.”", { x: M, y: 1.7, w: 10.2, h: 2.6, fontFace: HF, fontSize: 38, bold: true, color: C.white, valign: "middle", margin: 0 });
  s.addText("A line Andrej Karpathy keeps coming back to, Sequoia Ascent 2026", { x: M, y: 4.4, w: 9, h: 0.5, fontFace: BF, fontSize: 18, color: C.lime, margin: 0 });
  s.addNotes("End the section here. Whatever the next buzzword is, the constant is that you have to understand what the agents built in order to direct them. Karpathy quoted this line from a post he saw and says he keeps thinking about it: 'I am becoming the bottleneck of even knowing what we are trying to build, why it is worth doing, and how to direct my agents.' Source: karpathy.bearblog.dev/sequoia-ascent-2026.");
}

// Section: Toolbox
{
  const s = section("The wider toolbox", "Not every task needs the coding agent", "Toolbox");
  s.addNotes("A short tour of the tools around the coding agent, from the original deck. Present as advice; which tools are approved depends on our organisation.");
}

// Right tool for the job
{
  const s = content("Pick the tool for the job", "No single tool wins everywhere. Part of the work is choosing where to ask.", "Toolbox");
  table(s, ["Task", "A good fit", "Why"], [
    ["Find and summarise requirements in company documents", "Microsoft 365 Copilot", "Connected to SharePoint, Teams and Outlook, within your permissions"],
    ["Change code in the repository", "Copilot (IDE or CLI), OpenCode", "Sees and edits your files, runs the checks"],
    ["Explore architecture and trade-offs", "A chat model (Copilot Chat, Claude, ChatGPT)", "Room to compare options before any code"],
    ["Learn a topic from your own sources", "NotebookLM", "Answers grounded in the documents you give it: summaries, quizzes, audio overviews"],
    ["Media, and Google Workspace documents", "Gemini", "Strong with media and Google Docs and Drive"],
  ], { x: 0.6, y: 1.95, w: CW, colW: [4.0, 3.6, 4.533], rowH: 0.72, boldFirst: true, size: 13.5 });
  s.addText("Use what our organisation approves for each kind of data.", { x: 0.6, y: 6.25, w: CW, h: 0.45, fontFace: BF, fontSize: 13, italic: true, color: C.muted, margin: 0 });
  s.addNotes("Adapted from the original deck's tool overview, slides 14 and 15. A question from a newer developer was: I have questions I don't even know how to phrase, which tool should I use? The answer depends on the task: organisational knowledge, code changes, design discussion, or learning. Treat the table as a starting point and stick to tools approved for our data.");
}

// Copilot 365 for requirements
{
  const s = content("Requirements from documents: Microsoft 365 Copilot", "The morning ticket points to a 51-page requirements document. Instead of searching it by hand, ask.", "Toolbox");
  card(s, { x: 0.6, y: 1.95, w: 3.85, h: 4.6, title: "Tips", body: ["Name the specific file (type / to pick it) for precise results.", "Compare documents: “Compare requirement X with architecture Y.”", "Ask about email and meetings: “What did we decide in the last customer meeting?”"], size: 14 });
  card(s, { x: 4.65, y: 1.95, w: 3.85, h: 4.6, title: "Limits", body: ["Sees only what you are allowed to see.", "Can miss nuance in very complex documents or huge tables.", "Doesn't replace careful reading of truly critical requirements."], size: 14, fill: C.amberTint, titleColor: C.amber });
  placeholder(s, 8.7, 1.95, 4.03, 4.6, "Screenshot: Microsoft 365 Copilot extracting requirements from a document. Recreate with non-sensitive content; the original was in Hebrew with internal IDs.");
  s.addNotes("From the original deck, slides 10 to 12. Microsoft 365 Copilot is connected to SharePoint, Teams and Outlook and can read files you have access to without opening them. Point it at a specific file for precise answers, compare documents, or ask about decisions in meetings and email. It only sees what you are permitted to see and can miss nuance in very complex material, so critical requirements still need careful reading.");
}

// CLI harnesses and chat context
{
  const s = content("Working in the terminal and the IDE chat", "Two everyday entry points, each with its own way of getting the right context.", "Toolbox");
  card(s, { x: 0.6, y: 1.95, w: 5.95, h: 4.6, title: "CLI harnesses", body: [
    { b: "Copilot CLI: ", t: "Copilot's agent in the terminal; asks before running commands or editing files." },
    { b: "OpenCode: ", t: "open source; works with the models you connect to it." },
    { b: "Claude Code: ", t: "Anthropic's terminal agent." },
    { b: "Each session has its own context. ", t: "Several can run in parallel; give each its own worktree so they don't collide." },
  ], size: 14 });
  card(s, { x: 6.78, y: 1.95, w: 5.95, h: 4.6, title: "Chat in the IDE", body: [
    { b: "It sees your project: ", t: "no copying hundreds of lines into a web chat." },
    { b: "Point it at context: ", t: "#file, #selection, and a whole-codebase reference such as @workspace or #codebase (names vary by IDE and version)." },
    { b: "Great for: ", t: "questions about existing local code." },
  ], size: 14, fill: C.soft });
  s.addNotes("From the original deck, slides 21 and 27. CLI harnesses work outside the editor and are where most agentic workflows run today; each terminal session holds its own context, and you can run several in parallel if each has its own worktree. The IDE chat has the advantage of seeing your project; explicit references to files or the selection keep the context focused.");
}

// Commit messages
{
  const s = content("Small wins: commit messages with AI", "“I don't feel like writing a proper commit message right now.”", "Toolbox");
  fitImage(s, "s22-image60.png", 0.6, 1.95, 6.2, 4.6, 553 / 340, { top: 0.045 });
  card(s, { x: 7.1, y: 1.95, w: 5.63, h: 2.4, title: "How", body: "Define your commit format once in a commit-message instructions file (ours: GIT_COMMIT.md). Copilot reads the diff and writes the message.", size: 14 });
  card(s, { x: 7.1, y: 4.5, w: 5.63, h: 2.05, title: "Why", body: "A few minutes saved at the end of every task, and a cleaner history. Still read it before you commit.", size: 14, fill: C.soft });
  s.addNotes("From the original deck, slide 22. A small, everyday win. Our setup script already points Copilot's commit-message generation at GIT_COMMIT.md, so messages follow the team format automatically.");
}

// Section: Workflows
{
  const s = section("Four workflows", "Try each one. Notice what it helps with, and what it costs.", "Workflow trials");
  s.addNotes("Introduce the four workflows. They overlap: several of them use clarification, planning and review. Compare how each handles decisions, context, scope and verification, not just the names.");
}

// Four at a glance
{
  const s = content("Four workflows at a glance", "Same task, four ways of organising the work.", "Workflow trials");
  table(s, ["Workflow", "How you start", "Where you decide", "What it adds"], [
    ["A · Native", "A prompt, or the harness's plan mode", "Throughout: you steer", "Speed and no setup"],
    ["B · Stack-aware", "grill-me, then implement with stack skills", "Answering questions up front", "Our React and Java conventions, lean instructions"],
    ["C · Superpowers", "Describe what you want; skills trigger", "Design, plan, and how to finish", "A full methodology: design, plan, TDD, reviews"],
    ["D · Agentcraft", "/code-workflow with the request", "The request, blockers, the final result", "Specialist roles and quality gates"],
  ], { x: 0.6, y: 1.95, w: CW, colW: [2.2, 3.5, 3.0, 3.433], rowH: 0.76, boldFirst: true, size: 14 });
  darkBand(s, 0.6, 6.0, CW, 0.7, "There is no winner by default. The question is which one fits this kind of task, for you.", 16);
  s.addNotes("A one-slide comparison to refer back to. The native workflow is a legitimate way to work, not a setup to fail. Moshe's workflow is lean and stack-specific. Superpowers is a full, language-agnostic methodology. Tom's Agentcraft is a language-agnostic workflow with specialist roles and strict quality gates. Moshe and Tom have different philosophies, and participants should choose for themselves.");
}

// Trial routine
{
  const s = content("Every trial follows the same routine", "So that the comparison is about the workflow, not about the setup.", "Workflow trials");
  numberedRows(s, [
    "Reset the exercise code to the starting point.",
    "Switch to the trial's workflow.",
    "Start a fresh agent session.",
    "Work the task. Answer the agent's questions from your own judgement.",
    "Run the checks.",
    "Record your row.",
  ], { x: 0.6, y: 2.0, step: 0.72, w: 5.9, size: 15 });
  card(s, { x: 7.4, y: 1.95, w: 5.33, h: 3.2, title: "Your trial row", body: ["Checks passed", "Minutes spent", "Times you had to step in", "Decisions the agent asked you about", "Changes outside the task", "Worth it for this task?"], size: 14 });
  placeholder(s, 7.4, 5.3, 5.33, 1.3, "Reset, switch and verify commands, taken from the exercise handout.");
  s.addNotes("Explain the routine once; it repeats in every trial. Resetting the code and starting a fresh session keeps the trials independent. The trial row is the evidence we compare at 14:00. Exact commands and the exercise rules come from the exercise handout, which is being finalised separately.");
}

// Trial A
{
  const s = content("Trial A · Native  ·  10:10–10:35", "Your harness as it comes: a direct request, or its built-in plan mode.", "Workflow trials · Trial A");
  card(s, { x: 0.6, y: 1.95, w: 5.95, h: 3.4, title: "How it works", body: ["Give the agent the task.", "Optionally start in the harness's plan mode.", "You supply the context and the steering.", "Follow the trial rules in the exercise handout."], size: 15 });
  card(s, { x: 6.78, y: 1.95, w: 5.95, h: 3.4, title: "Watch for", body: ["What did it decide on its own?", "What did you have to correct?", "What evidence did you get that it works?"], size: 15, fill: C.soft });
  darkBand(s, 0.6, 5.6, CW, 0.9, "This is the baseline: a legitimate way to work, and often enough for clear tasks.", 17);
  s.addNotes("Trial A uses the harness without any added workflow. Make it clear this is not designed to fail; for clear tasks it is often the fastest path. What we want people to notice is which decisions the agent made silently and how much steering they needed.");
}

// Trial B
{
  const s = content("Trial B · Stack-aware workflow  ·  10:50–11:25", "Moshe's approach: lean shared instructions, and skills written for our actual stack.", "Workflow trials · Trial B");
  const flow = [
    ["grill-me", "Interviews you one question at a time, recommends an answer, and checks the code instead of asking when it can."],
    ["Stack skills", "frontend-dev-guidelines and backend-dev-guidelines: how we build React and Spring Boot features here."],
    ["Targeted agents", "A plan reviewer or code reviewer for a focused second look."],
  ];
  const xs = [0.6, 4.84, 9.08];
  flow.forEach((f, i) => {
    card(s, { x: xs[i], y: 1.95, w: 3.65, h: 2.45, num: i + 1, numTop: true, title: f[0], body: f[1], size: 13.5 });
    if (i < 2) arrow(s, xs[i] + 3.72, 3.0, 0.45, 0.32, C.green);
  });
  card(s, { x: 0.6, y: 4.6, w: 7.3, h: 2.0, title: "Watch for", body: ["Which questions surfaced decisions you hadn't considered?", "Did the stack skill change how the code was written?"], size: 14, fill: C.soft });
  placeholder(s, 8.15, 4.6, 4.58, 2.0, "Demo screenshot: grill-me questions and the stack skill loading.");
  s.addNotes("Moshe presents this one. The idea: keep shared instructions relatively lean and put the real value into skills that describe our own React and Java stack. grill-me does the clarification: one question at a time, with a recommended answer, and it explores the codebase instead of asking when it can. Targeted agents give a focused second look. Tom supports the Copilot users during this trial.");
}

// Choosing a model
{
  const s = content("Choosing a model  ·  11:25–11:40", "No single model wins everywhere. Choose per task, and judge by results on your own work.", "Model selection");
  const cards = [
    [0.6, 1.95, "Start with the team default", "for everyday tasks."],
    [4.35, 1.95, "A stronger reasoning model", "for ambiguous design, planning, hard debugging and reviews."],
    [0.6, 3.65, "A faster model", "for well-defined, mechanical steps once the plan is clear."],
    [4.35, 3.65, "Before switching, fix the brief", "Missing context fails on every model."],
  ];
  cards.forEach((c) => card(s, { x: c[0], y: c[1], w: 3.55, h: 1.5, title: c[2], body: c[3], size: 14, titleSize: 15 }));
  s.addText("Judge by:", { x: 0.6, y: 5.45, w: 1.3, h: 0.5, fontFace: BF, fontSize: 15, bold: true, color: C.ink, valign: "middle", margin: 0 });
  const judge = [["Correct", 0.95], ["In scope", 1.0], ["Review effort", 1.35], ["Speed", 0.8], ["Cost", 0.75]];
  let x = 1.9;
  judge.forEach((j) => { chip(s, x, 5.45, j[1], 0.5, j[0], C.soft, C.ink, 13); x += j[1] + 0.1; });
  placeholder(s, 8.2, 1.95, 4.53, 4.6, "The models available in our Copilot Enterprise plan, with their premium request multipliers.");
  s.addNotes("From the interviews: people want rules of thumb for choosing a model, and some see models as better at planning or at execution. Treat that as a hypothesis to test on your own tasks: a stronger reasoning model for planning and review, a faster one for executing a clear plan is a common pattern. Before switching models, check the brief and the context, because missing information fails on every model. Fill in the placeholder with the models actually enabled for us and their request costs.");
}

// Loops and drift
{
  const s = content("When the agent loops or drifts  ·  11:40–12:00", "Hours can disappear when an agent keeps going in the wrong direction. Stopping early is a skill.", "Recovery");
  const xs = [0.6, 4.745, 8.89];
  card(s, { x: xs[0], y: 1.95, w: 3.845, h: 3.45, title: "Signals", body: ["The same error three times, with no new evidence", "The plan keeps growing", "Changes in unrelated files", "You no longer understand the diff"], size: 14, fill: C.amberTint, titleColor: C.amber });
  card(s, { x: xs[1], y: 1.95, w: 3.845, h: 3.45, title: "Do", body: ["Stop the run", "Inspect the diff: keep, revert or narrow", "Name the blocker in one sentence", "Decide: continue with new information, or restart"], size: 14 });
  card(s, { x: xs[2], y: 1.95, w: 3.845, h: 3.45, title: "Restart well", body: ["A fresh session", "A handoff summary", "A tighter scope and an explicit “don't touch” list", "One verifiable step at a time"], size: 14 });
  darkBand(s, 0.6, 5.6, CW, 0.95, "From our team: an agent left the original scope and built things nobody asked for, and it cost hours. Bound the task, and restart earlier than feels comfortable.", 15);
  s.addNotes("This comes directly from an interview: a teammate's agent went into a loop, left the scope and implemented many unrelated things, and it took hours. Two lessons. First, bound the prompt and tell the agent explicitly not to leave the scope. Second, as a developer, know when to stop: when you see the signals, it is usually faster to restart with a better brief than to keep correcting, even if you feel you were already clear. Use a prepared transcript or an incident from the morning labs for the exercise.");
}

// Trial C: Superpowers intro
{
  const s = content("Trial C · Superpowers  ·  12:40–13:20", "A complete development methodology for coding agents, built from composable skills that trigger automatically.", "Workflow trials · Trial C");
  const phil = [
    [0.6, 1.95, "Tests first", "Write the failing test before the code."],
    [3.65, 1.95, "Systematic over ad hoc", "Follow a process instead of guessing."],
    [0.6, 3.7, "Reduce complexity", "Simplicity first; build only what is needed."],
    [3.65, 3.7, "Evidence over claims", "Verify before declaring success."],
  ];
  phil.forEach((p) => card(s, { x: p[0], y: p[1], w: 2.85, h: 1.55, title: p[2], body: p[3], size: 13, titleSize: 15 }));
  card(s, { x: 6.8, y: 1.95, w: 5.93, h: 3.3, title: "What makes it different", body: [
    "Questions before code: it draws out what you want and plays its understanding back to you.",
    "A plan written for an engineer with no context: small tasks with exact files and verification steps.",
    "Its skills are meant as mandatory workflows, not suggestions.",
  ], size: 14 });
  placeholder(s, 0.6, 5.45, CW, 1.1, "Demo: from a request to brainstorming questions and a written plan, in your harness.");
  s.addNotes("Superpowers is by Jesse Vincent (github.com/obra/superpowers, MIT). It describes itself as a complete software development methodology for coding agents, built on composable skills plus initial instructions that make the agent use them. Its principles: test-driven development, systematic over ad hoc, reducing complexity, and evidence over claims. Compared to the native workflow, the big difference is that the agent asks before it builds and works from a written plan.");
}

// Superpowers workflow
{
  const s = content("Superpowers: the workflow", "Each step is a skill. The steps marked “You” are where you decide.", "Workflow trials · Trial C");
  const steps = [
    ["brainstorming", "Clarifies what you want and why. Small changes are agreed in chat; projects get a design doc.", "You: approve the design"],
    ["using-git-worktrees", "Creates an isolated branch or worktree and checks that tests start clean.", null],
    ["writing-plans", "2–5 minute tasks with exact files, code and verification steps.", "You: review the plan, say go"],
    ["subagent-driven-development or executing-plans", "Executes the plan task by task.", null],
    ["test-driven-development", "RED, GREEN, REFACTOR for each task.", null],
    ["requesting-code-review", "Reviews during the work; critical issues block progress.", null],
    ["finishing-a-development-branch", "Verifies the tests, then offers merge, PR, keep or discard.", "You: choose how to finish"],
  ];
  const w = (CW - 3 * 0.25) / 4;
  steps.forEach((st, i) => {
    const row = i < 4 ? 0 : 1;
    const col = i < 4 ? i : i - 4;
    const x = 0.6 + col * (w + 0.25);
    const y = row === 0 ? 1.95 : 4.3;
    box(s, x, y, w, 2.15, st[2] ? C.amberTint : C.tint);
    circle(s, x + 0.15, y + 0.15, 0.42, i + 1, st[2] ? C.amber : C.green, C.white, 13);
    const runs = [
      { text: st[0], options: { bold: true, fontSize: 12.5, color: C.ink, breakLine: true } },
      { text: st[1], options: { fontSize: 12, color: C.ink, breakLine: !!st[2], paraSpaceBefore: 4 } },
    ];
    if (st[2]) runs.push({ text: st[2], options: { bold: true, fontSize: 12, color: C.amber, paraSpaceBefore: 6 } });
    s.addText(runs, { x: x + 0.05, y: y + 0.6, w: w - 0.1, h: 1.5, fontFace: BF, valign: "top", margin: 6 });
  });
  const lx = 0.6 + 3 * (w + 0.25);
  box(s, lx, 4.3, w, 2.15, C.dark);
  s.addText("Amber = a point where you decide. In between, the agent works through the steps.", { x: lx, y: 4.3, w, h: 2.15, fontFace: BF, fontSize: 14, color: C.white, valign: "middle", margin: 12 });
  s.addNotes("This is the basic workflow from the Superpowers README. The human checkpoints are approving the design, reviewing the plan and saying go, and choosing how to finish the branch. It also stops for destructive or security-sensitive actions. Note that the README advises against starting implementation on main without your explicit consent, which is why it creates a worktree or branch. Source: github.com/obra/superpowers README, The Basic Workflow.");
}

// Superpowers execution
{
  const s = content("Superpowers: how execution works", "Two ways to execute the plan, plus rules it gives the agent.", "Workflow trials · Trial C");
  card(s, { x: 0.6, y: 1.95, w: 4.6, h: 3.75, title: "subagent-driven-development", body: [
    "A fresh implementer subagent for each task.",
    "One task at a time: implementers never run in parallel.",
    "Each task reviewed for spec and quality; a final review of the whole branch.",
    "Doesn't pause between tasks. Stops for destructive, security-sensitive or outside-the-worktree actions, or a broken plan.",
  ], size: 13.5, titleSize: 15 });
  card(s, { x: 5.4, y: 1.95, w: 3.3, h: 3.75, title: "executing-plans", body: "The cheaper alternative: implements all tasks in the current session, with one fresh review of the whole branch at the end.", size: 13.5, titleSize: 15, fill: C.soft });
  card(s, { x: 8.9, y: 1.95, w: 3.83, h: 3.75, title: "Rules it gives the agent", body: [
    "“No production code without a failing test first.”",
    "“No completion claims without fresh verification evidence.”",
  ], size: 14, titleSize: 15 });
  box(s, 0.6, 5.9, CW, 0.75, C.tint);
  s.addText([
    { text: "Install  ", options: { bold: true, color: C.green } },
    { text: "Copilot CLI: copilot plugin marketplace add obra/superpowers-marketplace, then copilot plugin install superpowers@superpowers-marketplace.   OpenCode: follow .opencode/INSTALL.md in the repository.", options: { color: C.ink } },
  ], { x: 0.6, y: 5.9, w: CW, h: 0.75, fontFace: BF, fontSize: 12, valign: "middle", margin: 10 });
  s.addNotes("Details from the skill files. In subagent-driven development each task gets a fresh implementer subagent, tasks run one after another, and each task is reviewed for both spec compliance and quality, with a final whole-branch review. It does not stop to check in between tasks unless there is a destructive, security-sensitive or outside-the-worktree action, or the plan is broken. executing-plans is an equal alternative that is cheaper. TDD and verification are strongly worded instructions to the agent. Parallel agents exist only in a separate skill, dispatching-parallel-agents, for independent problems. Sources: github.com/obra/superpowers skills/subagent-driven-development, test-driven-development, verification-before-completion; docs/README.opencode.md.");
}

// Trial D: Agentcraft
{
  const s = content("Trial D · Agentcraft  ·  13:20–14:00", "Tom's approach: language-agnostic engineering standards, enforced through specialist roles and quality gates.", "Workflow trials · Trial D");
  const roles = [
    ["Builder", "Implements the request"],
    ["Scope review", "Matches the request? Nothing missing or extra"],
    ["Quality review", "Code quality, tests, security, architecture"],
    ["Refactorer", "Measures complexity and duplication; changes only if it helps"],
    ["Verification", "Build, lint, full tests, behaviour evidence"],
  ];
  const w = 2.15;
  const gap = (CW - 5 * w) / 4;
  roles.forEach((r, i) => {
    const x = 0.6 + i * (w + gap);
    card(s, { x, y: 1.95, w, h: 2.15, num: i + 1, numTop: true, title: r[0], body: r[1], size: 12.5, titleSize: 14 });
    if (i < 4) arrow(s, x + w + (gap - 0.22) / 2, 2.85, 0.22, 0.3, C.green);
  });
  const xs = [0.6, 4.745, 8.89];
  card(s, { x: xs[0], y: 4.3, w: 3.845, h: 1.85, title: "Sequential, fresh sessions", body: "Roles run one after another. Each gets a self-contained handoff.", size: 13.5, fill: C.soft });
  card(s, { x: xs[1], y: 4.3, w: 3.845, h: 1.85, title: "Findings are tracked", body: "IDs, evidence and resolution conditions; targeted re-review after fixes; a blocker is reported after five cycles.", size: 13.5, fill: C.soft });
  card(s, { x: xs[2], y: 4.3, w: 3.845, h: 1.85, title: "For bigger work", body: "/planner and /implementer for approved plans and tracked deliverables.", size: 13.5, fill: C.soft });
  s.addText("github.com/tom-dorofeyev/td-agentcraft-kit", { x: 0.6, y: 6.25, w: CW, h: 0.4, fontFace: BF, fontSize: 13, italic: true, color: C.muted, margin: 0 });
  s.addNotes("Tom presents this one. Every code change goes through /code-workflow: a Builder implements, a Reviewer checks scope and then separately checks quality and architecture, a Refactorer measures complexity and duplication and changes code only when it measurably helps, and the change is verified with the build, lint, the full test suite and behaviour evidence. Roles run sequentially, each in a fresh session with a self-contained handoff. Findings get IDs and resolution conditions, and after five correction cycles it reports a blocker instead of looping. Moshe supports the OpenCode users during this trial.");
}

// Compare
{
  const s = content("Compare the four  ·  14:00–14:15", "Compare evidence, not impressions.", "Comparison");
  card(s, { x: 0.6, y: 1.95, w: 6.6, h: 4.15, title: "Look at your trial rows", body: [
    "Were the requirements met, and how do you know?",
    "Did it stay in scope?",
    "How much steering did you need?",
    "What did it surface that you hadn't thought of?",
    "Was the process worth the effort for this task?",
  ], size: 15 });
  darkBand(s, 7.45, 1.95, 5.28, 4.15, "“For this task, what did the workflow help you notice or prevent, and what extra effort did it require?”", 20);
  s.addText("Single runs are noisy, so we look at the whole room together.", { x: 0.6, y: 6.25, w: CW, h: 0.45, fontFace: BF, fontSize: 14, italic: true, color: C.muted, margin: 0 });
  s.addNotes("Run the comparison from the trial rows, not from feelings. Pair discussion first, then a few observations from the room. Keep it task-specific: the same workflow can be worth it for one task and too heavy for another. Remind people that by the later trials they already knew the task better, so not every improvement comes from the workflow.");
}

// Section: Make it yours
{
  const s = section("Make it yours", "14:30–15:30 · Choose a workflow, adapt it, use it", "Make it yours");
  s.addNotes("The most important hour of the day: turning exposure into a habit.");
}

// Choose, adapt, apply
{
  const s = content("Choose, adapt, apply  ·  14:30–15:30", "Leave with a working customisation and a real task to use it on.", "Make it yours");
  const blocks = [["10 min", "Choose", "A workflow and a bounded task: the exercise, or your own ready-to-run project."], ["10 min", "Adapt", "One instruction, skill or agent."], ["30 min", "Apply", "Run it, inspect the diff, verify."], ["10 min", "Share", "Show a neighbour what changed and why."]];
  const w = (CW - 3 * 0.2) / 4;
  blocks.forEach((b, i) => {
    const x = 0.6 + i * (w + 0.2);
    box(s, x, 1.95, w, 1.85, C.tint);
    s.addText([
      { text: b[0], options: { fontSize: 12, bold: true, color: C.green, breakLine: true } },
      { text: b[1], options: { fontFace: HF, fontSize: 20, bold: true, color: C.ink, breakLine: true } },
      { text: b[2], options: { fontSize: 13, color: C.ink, paraSpaceBefore: 4 } },
    ], { x, y: 1.95, w, h: 1.85, fontFace: BF, valign: "top", margin: 12 });
  });
  card(s, { x: 0.6, y: 4.05, w: 7.4, h: 2.55, title: "Adaptation ideas", body: [
    "Add a convention your team keeps repeating in code reviews.",
    "Add a question grill-me should always ask in your domain.",
    "Make the reviewer check something you care about.",
    "Sharpen a skill's description so it loads at the right time.",
  ], size: 14 });
  darkBand(s, 8.25, 4.05, 4.48, 2.55, "Leave with: a working customisation, and a task where you'll use it next week.", 17);
  s.addNotes("Participants pick the workflow they want to keep, make one small change to an instruction, skill or agent, and use it on a bounded task. Encourage real projects only if they are ready to run; otherwise use the exercise. The point is to observe the effect of the customisation, so ask them to compare the behaviour before and after the change. Advanced participants can build a new skill or agent and test it on a case where it should and one where it should not apply.");
}

// Possibilities: APIs
{
  const s = content("Possibilities: agents + APIs  ·  15:30–15:35", "No MCP server? An agent can still call an API, using an access token you control.", "Possibilities demo");
  const flow = ["Figma file", "API call with an access token", "Design data: frames, text, colours", "Agent implements the UI"];
  const w = 2.6;
  flow.forEach((f, i) => {
    const x = 0.6 + i * (w + 0.577);
    chip(s, x, 1.95, w, 1.0, f, i === 3 ? C.green : C.soft, i === 3 ? C.white : C.ink, 14);
    if (i < 3) arrow(s, x + w + 0.07, 2.3, 0.44, 0.32, C.green);
  });
  card(s, { x: 0.6, y: 3.25, w: 5.95, h: 1.6, title: "Same idea elsewhere", body: "Azure DevOps work items and pull requests, or any internal service with an API.", size: 14 });
  card(s, { x: 6.78, y: 3.25, w: 5.95, h: 1.6, title: "Handle tokens safely", body: "Keep the token in an environment variable, never in prompts or the repository. Use the narrowest scope and a short expiry.", size: 14, fill: C.amberTint });
  placeholder(s, 0.6, 5.05, CW, 1.5, "Live demo: a prepared Figma API request, and the agent using its result.");
  s.addNotes("A five-minute demo only, to open minds. We do not support MCP yet, but an agent with a terminal can call a REST API directly using a personal access token, for example to read design data from Figma and use it while implementing a UI. The same pattern works for Azure DevOps. No participant setup is needed. Mention token hygiene: environment variables, narrow scopes, short expiry.");
}

// Take it with you
{
  const s = newSlide("Closing", true);
  s.addText("Take it with you", { x: M, y: 0.6, w: CW, h: 0.9, fontFace: HF, fontSize: 36, bold: true, color: C.white, margin: 0 });
  const items = [["Define the task", "Goal, boundaries, success and the check that proves it."], ["Know the guidance you run with", "Which instructions, skills and agents are shaping the result."], ["Verify before you accept", "The diff and the checks, not the final message."]];
  items.forEach((it, i) => {
    const y = 1.9 + i * 1.25;
    circle(s, M, y, 0.75, i + 1, C.lime, C.dark, 20);
    s.addText([{ text: it[0], options: { bold: true, fontSize: 22, color: C.white, breakLine: true } }, { text: it[1], options: { fontSize: 16, color: "C9DACF" } }], { x: M + 1.0, y: y - 0.1, w: 10.5, h: 1.05, fontFace: BF, valign: "top", margin: 0 });
  });
  box(s, M, 5.85, CW, 0.85, "1E4A3F");
  s.addText("Before you leave: write down the next real task where you'll use your workflow.", { x: M, y: 5.85, w: CW, h: 0.85, fontFace: BF, fontSize: 17, bold: true, color: C.lime, valign: "middle", margin: 14 });
  s.addNotes("Close with the three habits and the commitment. Ask a few people to share their next task. Suggest a short follow-up in a week to hear what people reused, what helped and where they got stuck.");
}

// Bonus: decks with AI
{
  const s = content("Bonus: making presentations with AI", "Need a deck and no energy to design it?", "Bonus");
  numberedRows(s, [
    ["Ask a chat model:", "“Write a prompt for generating a presentation about X with an AI tool.”"],
    ["Paste the result", "into a tool like Gamma, Canva AI or Tome."],
    ["The tool produces", "structure and design; you fine-tune."],
    ["This workshop deck:", "an agent generated it from our workshop plan, then we reviewed every slide."],
  ], { x: 0.6, y: 2.05, step: 1.0, w: 5.4, size: 15 });
  fitImage(s, "s44-image175.png", 7.0, 1.95, 5.73, 4.65, 874 / 780);
  s.addNotes("From the original deck's bonus section. The original presentation was created this way: ask a model to write a structured deck prompt, then paste it into a presentation tool. This workshop deck was generated by an agent from the workshop plan, then reviewed slide by slide, which is itself an example of the workflow we teach.");
}

// Bonus: push back
{
  const s = content("Bonus: push back when the model is wrong", "Gemini first said it can't create a presentation. One sentence of pushback, and it did.", "Bonus");
  fitImage(s, "s44-image169.png", 0.6, 1.95, 4.4, 4.65, 707 / 882, { bottom: 0.035, alignLeft: true });
  card(s, { x: 5.4, y: 1.95, w: 7.33, h: 2.1, title: "Models are wrong about themselves too", body: "They can underestimate what the harness lets them do, or overestimate what they did.", size: 15 });
  darkBand(s, 5.4, 4.3, 7.33, 2.3, "If an answer contradicts what you know, say so, with the evidence. Then check the new answer the same way.", 18);
  s.addNotes("From the original deck: Gemini claimed it was only a language model and could not create a presentation; a short pushback pointing to its Canvas feature changed the answer. The same applies to coding agents in both directions: they can claim they can't do something they can, or claim they did something they didn't. Push back with evidence, and verify again. The screenshot is in Hebrew.");
}

// Questions
{
  const s = newSlide(null, true);
  s.addShape(pres.shapes.OVAL, { x: 8.6, y: 0.9, w: 4.8, h: 4.8, fill: { color: C.dark }, line: { color: C.lime, width: 2 } });
  s.addText("Questions?", { x: M, y: 2.3, w: 8, h: 1.2, fontFace: HF, fontSize: 52, bold: true, color: C.white, margin: 0 });
  s.addText("Thank you", { x: M, y: 3.5, w: 8, h: 0.7, fontFace: BF, fontSize: 24, color: C.lime, margin: 0 });
  s.addText("github.com/obra/superpowers   ·   github.com/tom-dorofeyev/td-agentcraft-kit", { x: M, y: 5.2, w: 9, h: 0.5, fontFace: BF, fontSize: 14, color: "C9DACF", margin: 0 });
  s.addNotes("Open the floor. Point to the repositories and the workshop toolkit for later reference.");
}

pres.writeFile({ fileName: OUT }).then((f) => console.log("Wrote " + f + " with " + pageNo + " slides"));
