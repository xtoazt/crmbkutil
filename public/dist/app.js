"use strict";
const owner = "S-PScripts";
const repo = "chromebook-utilities";
const branch = "main";
const gitTreeApi = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
const $ = (id) => document.getElementById(id);
const elements = {
    tree: $("folder-tree"),
    fileList: $("file-list"),
    breadcrumbs: $("breadcrumbs"),
    search: $("search-input"),
    resultCount: $("result-count"),
    sectionTitle: $("section-title"),
    modal: $("preview-modal"),
    modalTitle: $("preview-title"),
    modalBody: $("preview-body"),
    openRaw: $("open-raw"),
    openSite: $("open-site"),
    copyLink: $("copy-link"),
    closeModal: $("close-modal"),
};
let allFiles = [];
let rootNode = null;
let currentPath = "";
let searchQuery = "";
function encodePath(path) {
    return path
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/");
}
function buildTree(files) {
    const root = { name: "/", children: new Map(), files: [] };
    for (const file of files) {
        let node = root;
        for (const part of file.dirParts) {
            if (!node.children.has(part))
                node.children.set(part, { name: part, children: new Map(), files: [] });
            node = node.children.get(part);
        }
        node.files.push(file);
    }
    return root;
}
function getNodeByPath(root, path) {
    if (!path)
        return root;
    const parts = path.split("/").filter(Boolean);
    let node = root;
    for (const p of parts) {
        const next = node.children.get(p);
        if (!next)
            return null;
        node = next;
    }
    return node;
}
function renderBreadcrumbs(path) {
    const crumbs = [{ name: "Home", path: "" }];
    const parts = path.split("/").filter(Boolean);
    let accum = "";
    for (const part of parts) {
        accum = accum ? `${accum}/${part}` : part;
        crumbs.push({ name: part, path: accum });
    }
    elements.breadcrumbs.innerHTML = crumbs
        .map((c, i) => `<a href="#" data-path="${c.path}" class="crumb${i === crumbs.length - 1 ? " active" : ""}">${c.name}</a>`)
        .join('<span class="crumb-sep">/</span>');
}
function countFiles(node) {
    let count = node.files.length;
    for (const child of node.children.values())
        count += countFiles(child);
    return count;
}
function renderTree(node, parentUl, basePath = "") {
    parentUl.innerHTML = "";
    const entries = Array.from(node.children.keys()).sort((a, b) => a.localeCompare(b));
    for (const name of entries) {
        const child = node.children.get(name);
        const path = basePath ? `${basePath}/${name}` : name;
        const li = document.createElement("li");
        li.className = "tree-item";
        li.innerHTML = `
      <button class="tree-toggle" aria-label="Toggle folder" aria-expanded="false">▶</button>
      <a href="#" class="tree-folder" data-path="${path}">📁 ${name} <span class="count">${countFiles(child)}</span></a>
      <ul class="tree-children hidden"></ul>
    `;
        const toggle = li.querySelector(".tree-toggle");
        const childrenUl = li.querySelector(".tree-children");
        toggle.addEventListener("click", () => {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!expanded));
            toggle.textContent = expanded ? "▶" : "▼";
            childrenUl.classList.toggle("hidden", expanded);
            if (!expanded && childrenUl.childElementCount === 0)
                renderTree(child, childrenUl, path);
        });
        li.querySelector(".tree-folder").addEventListener("click", (e) => {
            e.preventDefault();
            navigateTo(path);
        });
        parentUl.appendChild(li);
    }
}
function collectFiles(node) {
    const out = [...node.files];
    for (const child of node.children.values())
        out.push(...collectFiles(child));
    return out;
}
function renderFiles(node) {
    elements.fileList.innerHTML = "";
    const files = searchQuery
        ? allFiles.filter((f) => f.name.toLowerCase().includes(searchQuery) || f.path.toLowerCase().includes(searchQuery))
        : collectFiles(node);
    elements.resultCount.textContent = searchQuery ? `${files.length} match${files.length === 1 ? "" : "es"}` : "";
    elements.sectionTitle.textContent = searchQuery ? `Search results` : node === rootNode ? "All files" : node.name;
    files
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((file) => {
        const item = document.createElement("a");
        item.href = `/${encodePath(file.path)}`;
        item.target = "_blank";
        item.rel = "noopener";
        item.className = "file-item";
        item.innerHTML = `
        <div class="file-icon">📄</div>
        <div class="file-meta">
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-path">/${file.path}</div>
        </div>
        <button class="button small ghost preview-btn" type="button">Preview</button>
      `;
        item.querySelector(".preview-btn").addEventListener("click", (e) => {
            e.preventDefault();
            openPreview(file);
        });
        elements.fileList.appendChild(item);
    });
}
function navigateTo(path) {
    currentPath = path;
    renderBreadcrumbs(path);
    const node = getNodeByPath(rootNode, path) ?? rootNode;
    renderFiles(node);
}
function openPreview(file) {
    const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodePath(file.path)}`;
    const site = `/${encodePath(file.path)}`;
    elements.modalTitle.textContent = file.name;
    elements.openRaw.href = raw;
    elements.openSite.href = site;
    elements.copyLink.onclick = async () => {
        try {
            await navigator.clipboard.writeText(site);
            elements.copyLink.textContent = "Copied";
            setTimeout(() => (elements.copyLink.textContent = "Copy link"), 1200);
        }
        catch {
            elements.copyLink.textContent = "Failed";
            setTimeout(() => (elements.copyLink.textContent = "Copy link"), 1200);
        }
    };
    elements.modal.classList.remove("hidden");
    elements.modal.setAttribute("aria-hidden", "false");
    elements.modalBody.textContent = "Loading...";
    fetch(raw)
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error("Failed to load"))))
        .then((text) => (elements.modalBody.textContent = text))
        .catch(() => (elements.modalBody.textContent = "Unable to preview this file."));
}
function closePreview() {
    elements.modal.classList.add("hidden");
    elements.modal.setAttribute("aria-hidden", "true");
    elements.modalBody.textContent = "";
}
function attachGlobalHandlers() {
    elements.breadcrumbs.addEventListener("click", (e) => {
        const a = e.target.closest("a[data-path]");
        if (!a)
            return;
        e.preventDefault();
        navigateTo(a.getAttribute("data-path") || "");
    });
    elements.search.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        const node = getNodeByPath(rootNode, currentPath) ?? rootNode;
        renderFiles(node);
    });
    elements.closeModal.addEventListener("click", closePreview);
    elements.modal.addEventListener("click", (e) => {
        if (e.target === elements.modal)
            closePreview();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape")
            closePreview();
    });
}
async function init() {
    attachGlobalHandlers();
    renderBreadcrumbs("");
    try {
        const resp = await fetch(gitTreeApi);
        if (!resp.ok)
            throw new Error("Failed to load repository tree");
        const data = await resp.json();
        const txtFiles = (data.tree || [])
            .filter((t) => t.type === "blob" && t.path.toLowerCase().endsWith(".txt"))
            .map((t) => {
            const parts = t.path.split("/");
            const name = parts[parts.length - 1];
            const dirParts = parts.slice(0, -1);
            return { path: t.path, name, dirParts };
        });
        allFiles = txtFiles;
        rootNode = buildTree(allFiles);
        renderTree(rootNode, elements.tree, "");
        navigateTo("");
    }
    catch (err) {
        console.error(err);
        elements.fileList.innerHTML = `<div class="error">Failed to load files. Please try again later.</div>`;
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
}
else {
    init();
}
