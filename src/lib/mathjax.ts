declare global {
  interface Window {
    MathJax?: {
      startup?: {
        promise?: Promise<unknown>;
      };
      typesetPromise?: (elements?: Element[]) => Promise<unknown>;
      typesetClear?: (elements?: Element[]) => void;
      tex?: {
        inlineMath?: string[][];
        displayMath?: string[][];
      };
      options?: {
        skipHtmlTags?: string[];
      };
      chtml?: {
        scale?: number;
      };
    };
  }
}

let mathJaxLoader: Promise<void> | null = null;

export const ensureMathJax = () => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.MathJax?.typesetPromise) {
    return Promise.resolve();
  }

  if (mathJaxLoader) {
    return mathJaxLoader;
  }

  mathJaxLoader = new Promise((resolve, reject) => {
    if (!window.MathJax) {
      window.MathJax = {
        tex: {
          inlineMath: [["$", "$"], ["\\(", "\\)"]],
          displayMath: [["$$", "$$"], ["\\[", "\\]"]],
        },
        options: {
          skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        },
        chtml: {
          scale: 1,
        },
      };
    }

    const existingScript = document.getElementById("mathjax-script") as HTMLScriptElement | null;
    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load MathJax.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "mathjax-script";
    script.async = true;
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load MathJax."));
    document.head.appendChild(script);
  });

  return mathJaxLoader;
};

export const typesetMath = async (element: Element | null) => {
  if (!element) return;

  try {
    await ensureMathJax();
    await window.MathJax?.startup?.promise;
    window.MathJax?.typesetClear?.([element]);
    await window.MathJax?.typesetPromise?.([element]);
  } catch {
    // Leave the original HTML visible if MathJax is unavailable.
  }
};
