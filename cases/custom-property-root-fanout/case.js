globalThis.defineCase({
  setup({ scale }) {
    const style = document.createElement("style");
    style.textContent = `
      :root { --benchpress-accent: 20; }
      .fanout { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 1px; }
      .node {
        color: hsl(var(--benchpress-accent) 65% 25%);
        background: hsl(calc(var(--benchpress-accent) + 180) 60% 94%);
        border-inline-start: 2px solid hsl(var(--benchpress-accent) 80% 42%);
        padding: 2px;
      }
    `;
    document.head.append(style);

    const fanout = document.createElement("div");
    fanout.className = "fanout";

    for (let index = 0; index < scale; index += 1) {
      const node = document.createElement("span");
      node.className = "node";
      node.textContent = `Node ${index}`;
      fanout.append(node);
    }

    document.querySelector("#fixture").replaceChildren(fanout);
  },
  run() {
    const current = Number(document.documentElement.dataset.hue ?? "20");
    const next = current === 20 ? 210 : 20;
    document.documentElement.dataset.hue = String(next);
    document.documentElement.style.setProperty("--benchpress-accent", String(next));
    void document.body.offsetHeight;
  },
  cleanup() {
    document.documentElement.style.removeProperty("--benchpress-accent");
    document.querySelector("#fixture").replaceChildren();
  },
});
