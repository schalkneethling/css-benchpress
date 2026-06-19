globalThis.defineCase({
  setup({ scale }) {
    const style = document.createElement("style");
    style.textContent = `
      @property --inherited-tone {
        syntax: "<number>";
        inherits: true;
        initial-value: 120;
      }
      @property --local-weight {
        syntax: "<number>";
        inherits: false;
        initial-value: 1;
      }
      .grid { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 2px; }
      .cell {
        --local-weight: 1;
        background: hsl(var(--inherited-tone) 55% calc(82% - (var(--local-weight) * 4%)));
        padding: 3px;
      }
    `;
    document.head.append(style);
    document.documentElement.style.setProperty("--inherited-tone", "120");

    const grid = document.createElement("div");
    grid.className = "grid";

    for (let index = 0; index < scale; index += 1) {
      const cell = document.createElement("span");
      cell.className = "cell";
      cell.textContent = String(index);
      grid.append(cell);
    }

    document.querySelector("#fixture").replaceChildren(grid);
  },
  run() {
    const current = Number(document.documentElement.dataset.tone ?? "120");
    const next = current === 120 ? 270 : 120;
    document.documentElement.dataset.tone = String(next);
    document.documentElement.style.setProperty("--inherited-tone", String(next));

    for (const cell of document.querySelectorAll(".cell:nth-child(9n)")) {
      cell.style.setProperty("--local-weight", next === 120 ? "1" : "4");
    }
    void document.body.offsetHeight;
  },
  cleanup() {
    document.documentElement.style.removeProperty("--inherited-tone");
    document.querySelector("#fixture").replaceChildren();
  },
});
