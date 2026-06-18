globalThis.defineCase({
  setup({ scale }) {
    const fixture = document.querySelector("#fixture");
    const style = document.createElement("style");
    style.textContent = `
      @function --bench-space(--base, --step) {
        result: calc(var(--base) + (var(--step) * var(--bench-intensity)));
      }
      .function-grid {
        --bench-intensity: 1;
        display: grid;
        grid-template-columns: repeat(10, minmax(0, 1fr));
        gap: 2px;
      }
      .function-grid.computed { --bench-intensity: 4; }
      .function-item {
        min-inline-size: --bench-space(12px, 2px);
        min-block-size: --bench-space(12px, 1px);
        padding-block: --bench-space(1px, 1px);
        padding-inline: --bench-space(2px, 1px);
        border-radius: --bench-space(1px, 0.5px);
        background: hsl(210 60% calc(96% - (var(--bench-intensity) * 4%)));
      }
    `;
    document.head.append(style);

    const list = document.createElement("div");
    list.className = "function-grid";

    for (let index = 0; index < scale; index += 1) {
      const item = document.createElement("span");
      item.className = "function-item";
      item.textContent = `Function ${index}`;
      list.append(item);
    }
    fixture.replaceChildren(list);
  },
  run() {
    document.querySelector(".function-grid").classList.toggle("computed");
    void document.body.offsetHeight;
  },
  cleanup() {
    document.querySelector("#fixture").replaceChildren();
  },
});
