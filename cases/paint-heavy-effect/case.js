globalThis.defineCase({
  setup({ scale }) {
    const style = document.createElement("style");
    style.textContent = `
      .tiles { display: grid; grid-template-columns: repeat(20, 24px); gap: 3px; }
      .tile {
        width: 24px;
        height: 24px;
        background: linear-gradient(135deg, #f0f6f8, #3b7c8f);
        border-radius: 3px;
      }
      .tiles.heavy .tile:nth-child(3n) {
        filter: blur(1px) saturate(1.4);
        box-shadow: 0 0 12px rgb(29 37 44 / 35%);
      }
    `;
    document.head.append(style);

    const tiles = document.createElement("div");
    tiles.className = "tiles";

    for (let index = 0; index < scale; index += 1) {
      const tile = document.createElement("span");
      tile.className = "tile";
      tiles.append(tile);
    }

    document.querySelector("#fixture").replaceChildren(tiles);
  },
  async run() {
    document.querySelector(".tiles").classList.toggle("heavy");
    void document.body.offsetHeight;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  },
  cleanup() {
    document.querySelector("#fixture").replaceChildren();
  },
});
