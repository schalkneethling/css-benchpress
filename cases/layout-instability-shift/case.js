globalThis.defineCase({
  setup({ scale }) {
    const style = document.createElement("style");
    style.textContent = `
      .feed { max-inline-size: 680px; }
      .entry { min-block-size: 20px; padding-block: 3px; padding-inline: 6px; border-block-end: 1px solid #d8dddf; }
      .feed.expanded .entry:nth-child(7n) { min-block-size: 96px; }
    `;
    document.head.append(style);

    const feed = document.createElement("ul");
    feed.className = "feed";

    for (let index = 0; index < scale; index += 1) {
      const entry = document.createElement("li");
      entry.className = "entry";
      entry.textContent = `Entry ${index}`;
      feed.append(entry);
    }

    document.querySelector("#fixture").replaceChildren(feed);
  },
  async run() {
    document.querySelector(".feed").classList.toggle("expanded");
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    void document.body.offsetHeight;
  },
  cleanup() {
    document.querySelector("#fixture").replaceChildren();
  },
});
