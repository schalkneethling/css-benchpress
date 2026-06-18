const activeToggleStride = 17;

globalThis.defineCase({
  setup({ scale }) {
    const fixture = document.querySelector("#fixture");
    const style = document.createElement("style");
    style.textContent = `
      .board { display: grid; gap: 2px; }
      .section:has(.item.is-active) { outline: 1px solid #376996; background: #eef6ff; }
      .section:has(.item.is-active) .label { color: #1d4b73; font-weight: 700; }
      .item { display: grid; grid-template-columns: 1fr auto; padding: 2px 4px; }
    `;
    document.head.append(style);

    const board = document.createElement("div");
    board.className = "board";

    for (let index = 0; index < scale; index += 1) {
      const section = document.createElement("section");
      section.className = "section";
      section.innerHTML = `
        <p class="label">Group ${index}</p>
        <div class="item"><span>Alpha</span><button type="button">Toggle</button></div>
        <div class="item"><span>Beta</span><button type="button">Toggle</button></div>
      `;
      board.append(section);
    }

    fixture.replaceChildren(board);
  },
  run() {
    const items = document.querySelectorAll(".item");
    for (let index = 0; index < items.length; index += activeToggleStride) {
      items[index].classList.toggle("is-active");
    }
    void document.body.offsetHeight;
  },
  cleanup() {
    document.querySelector("#fixture").replaceChildren();
  },
});
