import "@excalidraw/excalidraw/index.css";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

const cloneForTransport = (value) => JSON.parse(JSON.stringify(value));

// Use Excalidraw's legacy Normal/Helvetica font instead of the hand-drawn
// font. It is available locally in the browser and has stable text metrics,
// so text is measured with the same font that Excalidraw later renders.
const STABLE_FONT_FAMILY = 2;
const STABLE_CSS_FONT = "Helvetica, Arial, sans-serif";

const normalizeTextSkeletons = (elements) =>
  (elements ?? []).map((element) => {
    if (element.type !== "text") {
      return element;
    }

    // Mermaid may provide dimensions measured using a different font. Remove
    // those dimensions so convertToExcalidrawElements recalculates them using
    // the stable font selected above.
    const normalized = {
      ...element,
      fontFamily: STABLE_FONT_FAMILY,
      lineHeight: 1.25,
    };

    delete normalized.width;
    delete normalized.height;

    return normalized;
  });

const stabilizeConvertedText = (elements) =>
  elements.map((element) => {
    if (element.type !== "text") {
      return element;
    }

    return {
      ...element,
      fontFamily: STABLE_FONT_FAMILY,
      lineHeight: Math.max(Number(element.lineHeight) || 1.25, 1.25),
      originalText: element.originalText ?? element.text,
    };
  });

const waitForFonts = async (fontSize) => {
  if (!document.fonts) {
    return;
  }

  // Explicitly request the exact font used for conversion before measuring.
  await document.fonts.load(`${fontSize}px ${STABLE_CSS_FONT}`);
  await document.fonts.ready;
};

window.convertMermaidDiagram = async ({ definition, fontSize }) => {
  await waitForFonts(fontSize);

  const parsed = await parseMermaidToExcalidraw(definition, {
    startOnLoad: false,
    themeVariables: {
      fontSize: `${fontSize}px`,
      fontFamily: STABLE_CSS_FONT,
    },
    maxEdges: 5000,
    maxTextSize: 500000,
  });

  const normalizedSkeletons = normalizeTextSkeletons(parsed.elements);
  const elements = stabilizeConvertedText(
    convertToExcalidrawElements(normalizedSkeletons, {
      regenerateIds: true,
    }),
  );

  return cloneForTransport({
    elements,
    files: parsed.files ?? {},
  });
};

window.convertHeading = async ({ text, fontSize }) => {
  await waitForFonts(fontSize);

  const elements = convertToExcalidrawElements(
    [
      {
        type: "text",
        x: 0,
        y: 0,
        text,
        fontSize,
        fontFamily: STABLE_FONT_FAMILY,
        lineHeight: 1.25,
        textAlign: "left",
        verticalAlign: "top",
        strokeColor: "#1b1b1f",
      },
    ],
    { regenerateIds: true },
  );

  return cloneForTransport(stabilizeConvertedText(elements));
};

window.converterReady = true;
document.querySelector("#status").textContent = "Ready";
