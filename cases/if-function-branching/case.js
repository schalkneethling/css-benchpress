globalThis.defineCase({
  setup({ scale }) {
    const fixture = document.querySelector("#fixture");
    const list = document.createElement("div");
    for (let index = 0; index < scale; index += 1) {
      const item = document.createElement("span");
      item.textContent = `Experimental ${index}`;
      list.append(item);
    }
    fixture.replaceChildren(list);
  },
  run() {
    document.querySelector("#fixture").classList.toggle("branch");
    void document.body.offsetHeight;
  },
  cleanup() {
    document.querySelector("#fixture").replaceChildren();
  },
});
