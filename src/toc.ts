function makeHeadDivs(level: number, root: HTMLElement): void {
  const childNodes = Array.from(root.childNodes);
  const headings = Array.from(root.getElementsByTagName(`h${String(level)}`));
  const slices: Node[][] = [];
  headings.forEach((heading, i) => {
    const startIdx = childNodes.indexOf(heading);
    const endIdx = i === headings.length - 1 ? -1 : childNodes.indexOf(headings[i + 1]);
    slices.push(endIdx < 0 ? childNodes.slice(startIdx) : childNodes.slice(startIdx, endIdx));
  });
  slices.forEach((slice) => {
    const wrap = document.createElement("div");
    wrap.className = `h${String(level)}`;
    wrap.append(...slice);
    root.append(wrap);
    makeHeadDivs(level + 1, wrap);
  });
}

function getTocTree(level: number, root: HTMLElement): any[] {
  const out: any[] = [];
  const headings = Array.from(root.getElementsByClassName(`h${String(level)}`));
  headings.forEach((child, i) => {
    const c = child as HTMLElement;
    out[i] = { 0: c.children[0], 1: getTocTree(level + 1, c) };
  });
  return out;
}

function makeIDs(t: any[], prefix: string): void {
  t.forEach((hs, i) => {
    (hs[0] as HTMLElement).id = `h${prefix}${String(i + 1)}`;
    makeIDs(hs[1], `${prefix}${String(i + 1)}.`);
  });
}

function makeToc(t: any[], container: HTMLElement): void {
  const ul = document.createElement("ul");
  ul.className = "tocUl";
  t.forEach((hs) => {
    const h = hs[0] as HTMLElement;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.innerHTML = h.textContent || "";
    li.append(h.id.slice(1), " ", a);
    ul.append(li);
  });
  if (ul.children.length > 0) container.append(ul);
  t.forEach((hs, i) => makeToc(hs[1], ul.children[i] as HTMLElement));
}

document.addEventListener("DOMContentLoaded", function () {
  const toc = document.getElementById("toc");
  const content = document.getElementById("content");
  if (!toc || !content) return;
  const topLvHead = parseInt(toc.getAttribute("toplvhead") || "2");
  makeHeadDivs(topLvHead, content);
  const tocTree = getTocTree(topLvHead, content);
  makeIDs(tocTree, "");
  const e1 = document.createElement("u");
  const e2 = document.createElement("b");
  const e3 = document.createElement("span");
  const e4 = document.createElement("div");
  const ul = document.createElement("div");
  e3.append("hide");
  (e3.style as CSSStyleDeclaration).cursor = "pointer";
  e2.append("Contents");
  e1.append(e2);
  e4.append(e1, " [", e3, "]");
  (e4.style as CSSStyleDeclaration).textAlign = "center";
  toc.append(e4);
  makeToc(tocTree, ul);
  toc.append(ul);
  e3.addEventListener("click", function (e) {
    const t = e.target as HTMLElement;
    const show = t.innerHTML == "show";
    if (show) {
      t.innerHTML = "hide";
      (ul as HTMLElement).style.display = "";
    } else {
      t.innerHTML = "show";
      (ul as HTMLElement).style.display = "none";
    }
  });
});


