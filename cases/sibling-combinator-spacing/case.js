globalThis.defineCase({
  setup({ scale }) {
    const style = document.createElement("style");
    style.textContent = `
      .stack > :not([hidden]) ~ :not([hidden]) { margin-block-start: var(--space, 4px); }
      .stack.compact > :not([hidden]) ~ :not([hidden]) { --space: 1px; }
      .row { padding: 1px 4px; border: 1px solid transparent; }
      .row:nth-child(5n) { border-color: #b8c2c8; }
    `;
    document.head.append(style);

    const stack = document.createElement("div");
    stack.className = "stack";

    for (let index = 0; index < scale; index += 1) {
      const row = document.createElement("p");
      row.className = "row";
      row.hidden = index % 11 === 0;
      row.textContent = `Sibling ${index}`;
      stack.append(row);
    }

    document.querySelector("#fixture").replaceChildren(stack);
  },
  run() {
    const stack = document.querySelector(".stack");
    stack.classList.toggle("compact");
    for (const row of stack.children) {
      if (Number(row.textContent.split(" ").at(-1)) % 19 === 0) {
        row.hidden = !row.hidden;
      }
    }
    void document.body.offsetHeight;
  },
  cleanup() {
    document.querySelector("#fixture").replaceChildren();
  },
});
