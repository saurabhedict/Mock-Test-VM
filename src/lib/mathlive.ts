declare global {
  interface Window {
    MathfieldElement?: unknown;
  }
}

let mathLiveLoader: Promise<void> | null = null;

export const ensureMathLive = () => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.customElements.get("math-field")) {
    return Promise.resolve();
  }

  if (mathLiveLoader) {
    return mathLiveLoader;
  }

  mathLiveLoader = new Promise((resolve, reject) => {
    const existingScript = document.getElementById("mathlive-script") as HTMLScriptElement | null;

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load MathLive.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "mathlive-script";
    script.defer = true;
    script.src = "https://cdn.jsdelivr.net/npm/mathlive";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load MathLive."));
    document.head.appendChild(script);
  });

  return mathLiveLoader;
};
