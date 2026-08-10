import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright-core";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function printUsage() {
  console.log(`
Usage:
  node importer.mjs <input.md> [options]

Options:
  --output <file.excalidraw>  Output path. Default: beside the input file
  --columns <number>          Number of diagram columns. Default: 1
  --font-size <number>        Mermaid font size. Default: 20
  --heading-size <number>     Markdown heading font size. Default: 32
  --gap-x <number>            Horizontal gap. Default: 240
  --gap-y <number>            Vertical gap. Default: 180
  --open                      Open Excalidraw.com and import the result
  --no-open                   Only create the .excalidraw file
  --browser <path>            Edge/Chrome executable path
  --expected-count <number>   Fail if the Mermaid block count differs
  --help                      Show this help
`);
}

function parsePositiveNumber(value, flag, { integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || (integer && !Number.isInteger(number))) {
    throw new Error(`${flag} must be a positive ${integer ? "integer" : "number"}.`);
  }
  return number;
}

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    columns: 1,
    fontSize: 20,
    headingSize: 32,
    gapX: 240,
    gapY: 180,
    open: true,
    browser: null,
    expectedCount: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value after ${arg}.`);
      }
      return argv[index];
    };

    switch (arg) {
      case "--output":
        args.output = next();
        break;
      case "--columns":
        args.columns = parsePositiveNumber(next(), arg, { integer: true });
        break;
      case "--font-size":
        args.fontSize = parsePositiveNumber(next(), arg);
        break;
      case "--heading-size":
        args.headingSize = parsePositiveNumber(next(), arg);
        break;
      case "--gap-x":
        args.gapX = parsePositiveNumber(next(), arg);
        break;
      case "--gap-y":
        args.gapY = parsePositiveNumber(next(), arg);
        break;
      case "--browser":
        args.browser = next();
        break;
      case "--expected-count":
        args.expectedCount = parsePositiveNumber(next(), arg, { integer: true });
        break;
      case "--open":
        args.open = true;
        break;
      case "--no-open":
        args.open = false;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        if (args.input) {
          throw new Error(`Unexpected argument: ${arg}`);
        }
        args.input = arg;
    }
  }

  if (!args.input) {
    throw new Error("Missing Markdown input file.");
  }

  return args;
}

function parseMarkdownMermaidBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let latestHeading = null;

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index].match(/^#{1,6}\s+(.+?)\s*$/);
    if (headingMatch) {
      latestHeading = headingMatch[1].trim();
      continue;
    }

    if (!/^```mermaid\s*$/i.test(lines[index])) {
      continue;
    }

    const startLine = index + 1;
    const codeLines = [];
    index += 1;

    while (index < lines.length && !/^```\s*$/.test(lines[index])) {
      codeLines.push(lines[index]);
      index += 1;
    }

    if (index >= lines.length) {
      throw new Error(`Unclosed Mermaid block starting near line ${startLine}.`);
    }

    const code = codeLines.join("\n").trim();
    if (!code) {
      throw new Error(`Empty Mermaid block near line ${startLine}.`);
    }

    blocks.push({
      heading: latestHeading || `Diagram ${blocks.length + 1}`,
      code,
      startLine,
    });
  }

  return blocks;
}

function findBrowserExecutable(explicitPath) {
  const candidates = [];

  if (explicitPath) {
    candidates.push(explicitPath);
  }

  if (process.platform === "win32") {
    const roots = [
      process.env["PROGRAMFILES(X86)"],
      process.env.PROGRAMFILES,
      process.env.LOCALAPPDATA,
    ].filter(Boolean);

    for (const root of roots) {
      candidates.push(
        path.join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(root, "Google", "Chrome", "Application", "chrome.exe"),
      );
    }
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  } else {
    candidates.push(
      "/usr/bin/microsoft-edge",
      "/usr/bin/microsoft-edge-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    );
  }

  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) ?? null;
}

function getBounds(elements) {
  const active = elements.filter((element) => !element.isDeleted);
  if (active.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const element of active) {
    const x1 = Number(element.x) || 0;
    const y1 = Number(element.y) || 0;
    const x2 = x1 + (Number(element.width) || 0);
    const y2 = y1 + (Number(element.height) || 0);
    minX = Math.min(minX, x1, x2);
    minY = Math.min(minY, y1, y2);
    maxX = Math.max(maxX, x1, x2);
    maxY = Math.max(maxY, y1, y2);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function shiftElements(elements, deltaX, deltaY) {
  return elements.map((element) => ({
    ...element,
    x: element.x + deltaX,
    y: element.y + deltaY,
  }));
}

function mergeFiles(target, source) {
  for (const [id, file] of Object.entries(source ?? {})) {
    target[id] = file;
  }
}

async function startConverterPage(browserExecutable) {
  const vite = await createServer({
    root: SCRIPT_DIR,
    logLevel: "error",
    define: {
      "process.env.IS_PREACT": JSON.stringify("false"),
    },
    optimizeDeps: {
      include: [
        "@excalidraw/excalidraw",
        "@excalidraw/mermaid-to-excalidraw",
      ],
    },
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
    },
  });

  await vite.listen();
  const address = vite.httpServer?.address();
  if (!address || typeof address === "string") {
    await vite.close();
    throw new Error("Could not determine the local converter port.");
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserExecutable,
  });

  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}/converter.html`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForFunction(() => window.converterReady === true, null, {
    timeout: 120000,
  });

  return {
    page,
    async close() {
      await browser.close();
      await vite.close();
    },
  };
}

async function convertBlocks(page, blocks, options) {
  const converted = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const prefix = `[${index + 1}/${blocks.length}]`;
    console.log(`${prefix} Converting: ${block.heading}`);

    try {
      const [diagram, headingElements] = await Promise.all([
        page.evaluate(
          (payload) => window.convertMermaidDiagram(payload),
          { definition: block.code, fontSize: options.fontSize },
        ),
        page.evaluate(
          (payload) => window.convertHeading(payload),
          { text: block.heading, fontSize: options.headingSize },
        ),
      ]);

      const diagramBounds = getBounds(diagram.elements);
      const headingBounds = getBounds(headingElements);

      converted.push({
        ...block,
        elements: diagram.elements,
        files: diagram.files,
        headingElements,
        diagramBounds,
        headingBounds,
        width: Math.max(diagramBounds.width, headingBounds.width),
        height: headingBounds.height + 45 + diagramBounds.height,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to convert diagram ${index + 1} (${block.heading}) near Markdown line ${block.startLine}: ${details}`,
      );
    }
  }

  return converted;
}

function layoutScene(items, options) {
  const columnWidths = Array.from({ length: options.columns }, () => 0);
  for (let index = 0; index < items.length; index += 1) {
    const column = index % options.columns;
    columnWidths[column] = Math.max(columnWidths[column], items[index].width);
  }

  const columnOffsets = [];
  let currentX = 0;
  for (const width of columnWidths) {
    columnOffsets.push(currentX);
    currentX += width + options.gapX;
  }

  const allElements = [];
  const allFiles = {};
  let currentY = 0;

  for (let rowStart = 0; rowStart < items.length; rowStart += options.columns) {
    const rowItems = items.slice(rowStart, rowStart + options.columns);
    const rowHeight = Math.max(...rowItems.map((item) => item.height));

    rowItems.forEach((item, rowColumn) => {
      const targetX = columnOffsets[rowColumn];
      const targetY = currentY;

      const headingDeltaX = targetX - item.headingBounds.minX;
      const headingDeltaY = targetY - item.headingBounds.minY;
      allElements.push(...shiftElements(item.headingElements, headingDeltaX, headingDeltaY));

      const diagramTargetY = targetY + item.headingBounds.height + 45;
      const diagramDeltaX = targetX - item.diagramBounds.minX;
      const diagramDeltaY = diagramTargetY - item.diagramBounds.minY;
      allElements.push(...shiftElements(item.elements, diagramDeltaX, diagramDeltaY));
      mergeFiles(allFiles, item.files);
    });

    currentY += rowHeight + options.gapY;
  }

  return { elements: allElements, files: allFiles };
}

async function importIntoExcalidraw(outputPath, browserExecutable) {
  console.log("Opening Excalidraw.com…");
  const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), "excalidraw-import-"));
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    executablePath: browserExecutable,
    viewport: null,
    args: ["--start-maximized"],
  });

  const pages = context.pages();
  const page = pages[0] ?? (await context.newPage());

  try {
    await page.goto("https://excalidraw.com/", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(3500);

    const fileInputs = page.locator('input[type="file"]');
    const inputCount = await fileInputs.count();
    let imported = false;

    for (let index = 0; index < inputCount; index += 1) {
      const input = fileInputs.nth(index);
      const accept = (await input.getAttribute("accept")) ?? "";
      const looksLikeDrawingInput =
        accept === "" ||
        accept.includes(".excalidraw") ||
        accept.includes("application/json") ||
        accept.includes("*/*");

      if (!looksLikeDrawingInput) {
        continue;
      }

      try {
        await input.setInputFiles(outputPath);
        imported = true;
        break;
      } catch {
        // Try the next compatible file input.
      }
    }

    if (!imported) {
      const dataBase64 = fs.readFileSync(outputPath).toString("base64");
      const fileName = path.basename(outputPath);
      imported = await page.evaluate(
        ({ dataBase64: encoded, fileName: name }) => {
          const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
          const file = new File([bytes], name, { type: "application/json" });
          const transfer = new DataTransfer();
          transfer.items.add(file);
          const target = document.querySelector(".excalidraw") || document.body;
          const event = new DragEvent("drop", {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
          });
          return target.dispatchEvent(event);
        },
        { dataBase64, fileName },
      );
    }

    if (imported) {
      console.log("The generated file was sent to Excalidraw.com.");
    } else {
      console.warn(`Automatic import was not confirmed. Use Open and select:\n${outputPath}`);
    }

    console.log("Keep this window open while editing. Close the browser window to finish the script.");
    await new Promise((resolve) => context.on("close", resolve));
  } finally {
    try {
      await context.close();
    } catch {
      // Browser may already be closed by the user.
    }
    fs.rmSync(profilePath, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(options.input);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }

  const markdown = fs.readFileSync(inputPath, "utf8");
  const blocks = parseMarkdownMermaidBlocks(markdown);
  if (blocks.length === 0) {
    throw new Error("No ```mermaid code blocks were found in the Markdown file.");
  }

  if (options.expectedCount !== null && blocks.length !== options.expectedCount) {
    throw new Error(
      `Expected ${options.expectedCount} Mermaid blocks, but found ${blocks.length}.`,
    );
  }

  const outputPath = path.resolve(
    options.output ?? path.join(path.dirname(inputPath), `${path.parse(inputPath).name}.excalidraw`),
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const browserExecutable = findBrowserExecutable(options.browser);
  if (!browserExecutable) {
    throw new Error(
      "Microsoft Edge, Google Chrome, or Chromium was not found. Use --browser <full-path-to-browser>.",
    );
  }

  console.log(`Input: ${inputPath}`);
  console.log(`Mermaid blocks: ${blocks.length}`);
  console.log(`Browser: ${browserExecutable}`);
  console.log(`Output: ${outputPath}`);

  const converter = await startConverterPage(browserExecutable);
  let items;
  try {
    items = await convertBlocks(converter.page, blocks, options);
  } finally {
    await converter.close();
  }

  const scene = layoutScene(items, options);
  const document = {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements: scene.elements,
    appState: {
      gridSize: null,
      viewBackgroundColor: "#ffffff",
      currentItemFontFamily: 2,
    },
    files: scene.files,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

  const verification = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  if (verification.type !== "excalidraw" || !Array.isArray(verification.elements)) {
    throw new Error("Output verification failed: invalid Excalidraw document.");
  }

  console.log(`Created ${verification.elements.length} editable Excalidraw elements.`);
  console.log(`Done: ${outputPath}`);

  if (options.open) {
    await importIntoExcalidraw(outputPath, browserExecutable);
  }
}

main().catch((error) => {
  console.error(`\nERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
