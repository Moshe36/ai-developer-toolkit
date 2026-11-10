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
  const s = content("The “___ engineering” ladder", "Every few months the industry names a new layer. Each one wraps the one before; none replaces it.", "Buzzwords");
  const steps = [
    ["Prompt", "2023", "Write a clear **ticket**.", C.soft, C.ink, C.muted],
    ["Context", "2025", "Hand over the **docs** and code it needs.", C.lime, C.ink, C.ink],
    ["Harness", "Feb 2026", "**Coding standards**, **CI** and **quality gates**.", "7FA88F", C.white, C.white],
    ["Loop", "Jun 2026", "Retry until the **acceptance criteria** pass.", C.green, C.white, "DCE8DE"],
    ["Graph", "2026", "The **pipeline**: stages and **approval gates**.", C.dark, C.white, "A9C3B5"],
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
  s.addNotes("The backbone of this section. Prompt engineering (2023-24) was about wording. Context engineering (2025, named by Shopify's Tobi Lütke and popularised by Karpathy) is about what information the model has. Harness engineering (OpenAI, February 2026) is the environment around the model: tools, permissions, tests, checks. Loop engineering (June 2026, viral after Boris Cherny and Peter Steinberger) is designing the loop that prompts the agent instead of prompting it yourself. Graph engineering (later in 2026, mostly from consultancies and vendors) is connecting several loops into one workflow. The point to make: each layer wraps the previous one. You still need good prompts and good context inside a loop. Sources: blog.codacy.com/graph-harnesses-and-loop-engineering-explained, addyosmani.com/blog/loop-engineering.");
}

// Context engineering: what goes in, what stays out
{
  const s = content("Context engineering", "Not the magic words, but the right information. Like onboarding a new hire, on every single turn.", "Buzzwords");
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
  const s = content("Harness engineering", "Agent = model + harness. The tool ships one harness; harness engineering is the one you build around it.", "Buzzwords");
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
  s.addNotes("Two meanings of 'harness'. Every tool ships a built-in harness: its system prompt, tools and way of reading files; that is what we called the harness in the building-blocks slide. Harness engineering, as OpenAI named it in February 2026, is the outer harness you build around it for your codebase. Birgitta Böckeler (Thoughtworks, martinfowler.com, April 2026) splits it into guides, which steer the agent before it acts (AGENTS.md, skills, specs, language servers), and sensors, which let it correct itself after it acts (tests, type checks, linters, structural tests, review agents). Sensors work best when their output is written for the agent, for example lint messages that say how to fix the problem; OpenAI did exactly that with custom linters. Your job is the steering loop: whenever an issue happens more than once, improve a guide or a sensor. OpenAI's team: five months, about a million lines, 0 lines of manually written code, three engineers growing to seven; when the agent struggled, they asked what capability was missing and how to make it legible and enforceable for the agent. Everything on the left is something we set up this morning. Sources: openai.com/index/harness-engineering, martinfowler.com/articles/harness-engineering.html.");
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

// Loop engineering: one loop, drawn
{
  const s = content("Loop engineering", "Like a CI pipeline for the agent: it keeps going until the acceptance criteria pass, or it escalates.", "Buzzwords");
  rungStrip(s, 3);
  box(s, M, 1.95, 7.25, 3.15, C.tint);
  const y = 2.2;
  flowNode(s, 0.8, y, 1.6, "START", "Trigger", C.white);
  arrow(s, 2.45, y + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 2.85, y, 1.6, "AGENT", "Does the work", C.white);
  arrow(s, 4.5, y + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 4.9, y, 1.6, "CHECK", "Acceptance criteria", C.soft);
  arrow(s, 6.55, y + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 6.95, y, 0.75, "PASS", "Done", C.dark, C.white);
  const retryY = 3.3;
  line(s, 5.4, y + 0.7, 0, retryY - y - 0.7, C.green);
  line(s, 3.65, retryY, 1.75, 0, C.green);
  line(s, 3.65, y + 0.7, 0, retryY - y - 0.7, C.green, "begin");
  s.addText(para("fail: retry, up to a **retry limit**", { fontSize: 11.5, italic: true, color: C.green }), { x: 3.75, y: retryY + 0.03, w: 2.6, h: 0.3, fontFace: BF, margin: 0 });
  line(s, 6.1, y + 0.7, 0, 3.95 - y - 0.7, C.amber, "end");
  flowNode(s, 5.1, 3.95, 2.6, "STUCK", "Escalate to you", C.amberTint);
  s.addText([
    ...para("**Trigger:** your prompt, a schedule like a **cron job**, a new issue.", { fontSize: 12, color: C.ink }, true),
    ...para("**Memory:** a progress file in the repo, so the next run knows what's done.", { fontSize: 12, color: C.ink }),
  ], { x: 0.8, y: 3.75, w: 4.15, h: 1.2, fontFace: BF, valign: "middle", margin: 0 });
  box(s, M + 7.45, 1.95, CW - 7.45, 3.15, C.dark);
  s.addText([
    { text: "“I don't prompt Claude anymore. I have loops running that prompt Claude… My job is to write loops.”", options: { fontSize: 16, italic: true, color: C.white, breakLine: true } },
    { text: "Boris Cherny, head of Claude Code, June 2026", options: { fontSize: 12, color: C.lime, breakLine: true, paraSpaceBefore: 10 } },
    { text: "Peter Steinberger (OpenClaw), the same week: “You should be designing loops that prompt your agents.”", options: { fontSize: 12.5, color: "A9C3B5", paraSpaceBefore: 10 } },
  ], { x: M + 7.45, y: 1.95, w: CW - 7.45, h: 3.15, fontFace: BF, valign: "middle", margin: 16 });
  forYouBand(s, "You run two loops today: Superpowers reviews every task before the next one, and Agentcraft stops after five cycles. Building your own? Write **acceptance criteria** it can't fake, set a **retry limit**, and decide where it **escalates**.");
  s.addNotes("Loop engineering went viral in June 2026 after Boris Cherny (head of Claude Code) and Peter Steinberger (OpenClaw) posted about it; Andrew Ng called it a hot buzzphrase. The Cherny quote is as reported by Addy Osmani. Walk the diagram: something triggers the agent (you, a schedule, a new issue); it works; a check it cannot talk its way past decides: pass means done, fail means try again, and after a few failed attempts it stops and hands over to a person. Progress lives in a file in the repo, because the agent forgets between runs and the repo does not. Codacy's version: the loop decides when the agent retries, escalates or stops; in their own agents, retries beyond about two rounds stopped helping and started creating new problems. Osmani: keep the maker away from the checker, because the model that wrote the code grades its own homework too kindly. Products now ship this: /loop and /goal in Claude Code, Automations and /goal in Codex. Today's loops: Superpowers runs a fresh implementer per task with a spec review and a quality review before moving on; Agentcraft runs builder, reviews, refactorer and verification with a five-cycle cap. 'Build the loop. Stay the engineer.' (Osmani). Sources: addyosmani.com/blog/loop-engineering, blog.codacy.com/graph-harnesses-and-loop-engineering-explained, x.com/AndrewYNg/status/2071988145667928442.");
}

// Graph engineering: Superpowers as a graph
{
  const s = content("Graph engineering", "The newest rung: draw the workflow like a CI/CD pipeline, with stages, quality gates and approval gates.", "Buzzwords");
  rungStrip(s, 4);
  const y1 = 2.0;
  flowNode(s, M, y1, 2.55, "AGENT", "Brainstorm", C.tint);
  arrow(s, 3.2, y1 + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 3.6, y1, 2.55, "APPROVAL GATE", "Approve the design", C.amberTint);
  arrow(s, 6.2, y1 + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 6.6, y1, 2.55, "AGENT", "Write the plan", C.tint);
  arrow(s, 9.2, y1 + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 9.6, y1, 3.13, "APPROVAL GATE", "Review the plan, say go", C.amberTint);
  const frameY = 3.15;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: frameY, w: 7.65, h: 1.75, fill: { color: C.white }, line: { color: C.green, width: 1.25, dashType: "dash" }, rectRadius: 0.08 });
  s.addText("For each task, a fresh subagent", { x: M + 0.15, y: frameY + 0.05, w: 4, h: 0.3, fontFace: BF, fontSize: 11, bold: true, color: C.green, margin: 0 });
  const y2 = frameY + 0.42;
  flowNode(s, 0.8, y2, 2.1, "AGENT", "Implement", C.tint);
  arrow(s, 2.95, y2 + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 3.35, y2, 2.0, "QUALITY GATE", "Spec review", C.soft);
  arrow(s, 5.4, y2 + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 5.8, y2, 2.2, "QUALITY GATE", "Code review", C.soft);
  const failY = y2 + 1.0;
  line(s, 6.9, y2 + 0.7, 0, failY - y2 - 0.7, C.amber);
  line(s, 1.85, failY, 5.05, 0, C.amber);
  line(s, 1.85, y2 + 0.7, 0, failY - y2 - 0.7, C.amber, "begin");
  s.addText("fail: back to Implement", { x: 2.0, y: failY - 0.3, w: 2.5, h: 0.28, fontFace: BF, fontSize: 11, italic: true, color: C.amber, margin: 0 });
  line(s, 11.15, y1 + 0.7, 0, 0.3, C.green);
  line(s, 4.6, y1 + 1.0, 6.55, 0, C.green);
  line(s, 4.6, y1 + 1.0, 0, frameY - y1 - 1.0, C.green, "end");
  arrow(s, 8.3, y2 + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 8.7, y2, 1.85, "QUALITY GATE", "Final review", C.soft);
  arrow(s, 10.6, y2 + 0.19, 0.35, 0.32, C.green);
  flowNode(s, 11.0, y2, 1.73, "APPROVAL GATE", "Merge, PR or keep", C.amberTint);
  box(s, M, 5.2, 7.25, 1.45, C.tint);
  s.addText(para("Each box is a **stage**; the loop lives inside one. A failed **quality gate** sends work back. At an **approval gate**, a person signs off.", { fontSize: 15, color: C.ink }), { x: M, y: 5.2, w: 7.25, h: 1.45, fontFace: BF, valign: "middle", margin: 14 });
  box(s, M + 7.45, 5.2, CW - 7.45, 1.45, C.soft);
  s.addText([
    { text: "What it means for you", options: { bold: true, fontSize: 12, color: C.green, charSpacing: 1, breakLine: true } },
    { text: "This is Superpowers, which you run after lunch. The amber boxes are your approval gates.", options: { fontSize: 14.5, color: C.ink, paraSpaceBefore: 4 } },
  ], { x: M + 7.45, y: 5.2, w: CW - 7.45, h: 1.45, fontFace: BF, valign: "middle", margin: 14 });
  s.addNotes("Graph engineering is the newest and least settled rung: mostly consultancies and tool vendors, no single famous author, so present it as an idea rather than an established discipline. The idea: once several agents, loops and people work together, make the workflow explicit. Nodes do the work: an agent, a check, a person. Edges decide what happens next, always or based on the result. Codacy's split: the graph decides the order and where work goes after each step; the loop decides when to retry or stop; the harness decides what the agent can touch. The diagram is Superpowers, simplified: brainstorming, then you approve the design; writing-plans, then you review the plan and say go; subagent-driven development runs a fresh implementer subagent per task, sequentially, with a spec-compliance review and a quality review, sending failures back; a final whole-branch review; and you choose how to finish. The loop sits inside the dashed box; the graph is the whole picture. Agentcraft is another small graph: builder, scope review, quality review, refactorer, verification, with a five-cycle cap. Sources: blog.codacy.com/graph-harnesses-and-loop-engineering-explained, github.com/obra/superpowers.");
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

termSlide({
  title: "Prompt debt",
  lead: "Technical debt, written in plain English.",
  what: "Every time the agent fails, someone adds a rule. Then a stronger rule. Soon the rules contradict each other: **dead code** and **duplication**, in your instructions.",
  quote: "Important behaviour shouldn't live in instruction text alone. Move it into tests, types, permissions and checks.",
  who: "The idea from Drew Breunig, The Problem is Prompt Debt, June 2026",
  forYou: "**Refactor** AGENTS.md and your skills like code: delete dead rules, merge duplicates, and turn every hard rule you can into a **test** or a **lint rule**.",
  notes: "Drew Breunig named the problem in June 2026 (dbreunig.com/2026/06/22/the-problem-is-prompt-debt.html). A system prompt starts short and clear, gets a new exception every time something fails, then the same warning in stronger words, until rules contradict each other and model-specific tweaks make it impossible to switch models. The fix is the same as for code debt: review and prune, and move important behaviour into mechanisms such as tests, types, permissions and evaluations. This connects to the instructions and skills we wrote this morning: keep them short.",
});

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
