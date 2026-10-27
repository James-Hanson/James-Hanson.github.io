// Iowa State University version of the UIC Logic Seminar deck.
//
// The slide order, overlays, and animation settings are inherited from
// ../small-large-UIC-2026/generated/manifest.js. Only the title page is local;
// every other UIC-local asset is referenced in place so no media is copied.
(() => {
  const manifest = window.DECK_MANIFEST;
  if (!manifest) {
    throw new Error("UIC manifest must load before the Iowa State manifest");
  }

  const uicRoot = "../small-large-UIC-2026/";
  const localPath = value =>
    typeof value === "string"
      && (value.startsWith("generated/") || value.startsWith("slides/"))
      ? uicRoot + value
      : value;

  const rewrite = node => {
    if (Array.isArray(node)) {
      node.forEach(rewrite);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (["src", "footer", "fallback", "embeddedFooter"].includes(key)) {
        node[key] = localPath(value);
      } else {
        rewrite(value);
      }
    }
  };

  manifest.title =
    "Small, Large Cardinals and Neostability Theory — Iowa State University, October 27, 2026";
  rewrite(manifest.slides);

  // Use the Iowa State title page instead of the shared UIC one.
  manifest.slides[0].steps[0].src = "slides/title.html";
})();
