const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".main-nav a");

window.addEventListener("scroll", () => {
  let current = "home";
  sections.forEach((section) => {
    const top = section.offsetTop - 130;
    if (window.scrollY >= top) current = section.id;
  });

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
  });
});

const DOCUMENTS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyCSrlm5GNW3HKRVrrmfCSgoF0L0S7fjR-hkybm2cEf1CDDOpf3d-sLiFP335L8ffwXlDKS0xOaLkh/pub?gid=0&single=true&output=csv";
const documentsGrid = document.querySelector(".documents-grid");

function setDocumentsState(message, isError = false) {
  if (!documentsGrid) {
    return;
  }

  documentsGrid.innerHTML = "";

  const state = document.createElement("div");
  state.className = isError ? "documents-state documents-state--error" : "documents-state";
  state.textContent = message;

  documentsGrid.appendChild(state);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseDocumentsCsv(csvText) {
  const cleanedText = csvText.replace(/^\uFEFF/, "").trim();

  if (!cleanedText) {
    return [];
  }

  const lines = cleanedText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return {
      title: row.title?.trim() || "",
      description: row.description?.trim() || "",
      url: row.url?.trim() || "",
      category: row.category?.trim() || ""
    };
  }).filter((row) => row.title && row.url);
}

function createDocumentCard(documentData) {
  const card = document.createElement("a");
  card.href = documentData.url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.className = "doc-tile";

  const badge = document.createElement("span");
  badge.className = "doc-icon";
  badge.textContent = "PDF";

  const title = document.createElement("strong");
  title.textContent = documentData.title;

  if (documentData.category) {
    const category = document.createElement("small");
    category.className = "doc-category";
    category.textContent = documentData.category;
    card.appendChild(badge);
    card.appendChild(category);
    card.appendChild(title);
  } else {
    card.appendChild(badge);
    card.appendChild(title);
  }

  const description = document.createElement("p");
  description.textContent = documentData.description || "";

  const action = document.createElement("span");
  action.className = "doc-action";
  action.textContent = "Отвори документ";

  card.appendChild(description);
  card.appendChild(action);

  return card;
}

function renderDocuments(documents) {
  if (!documentsGrid) {
    return;
  }

  documentsGrid.innerHTML = "";

  documents.forEach((documentData) => {
    documentsGrid.appendChild(createDocumentCard(documentData));
  });
}

async function loadDocuments() {
  if (!documentsGrid) {
    return;
  }

  setDocumentsState("Зареждане на документи...");

  try {
    const response = await fetch(DOCUMENTS_CSV_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const documents = parseDocumentsCsv(csvText);

    if (documents.length === 0) {
      setDocumentsState("Неуспешно зареждане на документи", true);
      return;
    }

    renderDocuments(documents);
  } catch (error) {
    console.error("Грешка при зареждане на документи", error);
    setDocumentsState("Неуспешно зареждане на документи", true);
  }
}

const GALLERY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyCSrlm5GNW3HKRVrrmfCSgoF0L0S7fjR-hkybm2cEf1CDDOpf3d-sLiFP335L8ffwXlDKS0xOaLkh/pub?gid=1397887078&single=true&output=csv";
const galleryGrid = document.querySelector(".gallery-grid");

function convertGoogleDriveImageUrl(rawUrl = "") {
  const url = rawUrl.trim();

  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url) === false) {
    return url;
  }

  if (/googleusercontent\.com/i.test(url) || /googleapis\.com/i.test(url)) {
    return url;
  }

  if (/\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url)) {
    return url;
  }

  const fileIdMatch = url.match(/\/file\/d\/([^/]+)/i);
  if (fileIdMatch) {
    return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1200`;
  }

  const idMatch = url.match(/[?&]id=([^&]+)/i);
  if (idMatch) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1200`;
  }

  const openIdMatch = url.match(/\/open\?id=([^&]+)/i);
  if (openIdMatch) {
    return `https://drive.google.com/thumbnail?id=${openIdMatch[1]}&sz=w1200`;
  }

  return url;
}

function parseGalleryCsv(csvText) {
  const cleanedText = csvText.replace(/^\uFEFF/, "").trim();

  if (!cleanedText) {
    return [];
  }

  const lines = cleanedText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const imageIndex = headers.indexOf("image");
  const titleIndex = headers.indexOf("title");

  if (imageIndex === -1) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return {
      title: titleIndex >= 0 ? (values[titleIndex] || "").trim() : "",
      image: (values[imageIndex] || "").trim()
    };
  }).filter((row) => row.image);
}

function renderGallery(items) {
  if (!galleryGrid) {
    return;
  }

  galleryGrid.innerHTML = items.map((item) => {
    const imageUrl = convertGoogleDriveImageUrl(item.image);

    if (!imageUrl) {
      return "";
    }

    const title = item.title || "Снимка от галерията";

    return `
      <figure>
        <img src="${imageUrl}" alt="${title}" loading="lazy" decoding="async" onerror="this.closest('figure').classList.add('image-placeholder'); this.remove();">
      </figure>
    `;
  }).join("");
}

async function loadGallery() {
  if (!galleryGrid) {
    return;
  }

  try {
    const response = await fetch(GALLERY_CSV_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const galleryItems = parseGalleryCsv(csvText);

    if (galleryItems.length === 0) {
      return;
    }

    renderGallery(galleryItems);
  } catch (error) {
    console.error("Грешка при зареждане на галерията", error);
  }
}

const NEWS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyCSrlm5GNW3HKRVrrmfCSgoF0L0S7fjR-hkybm2cEf1CDDOpf3d-sLiFP335L8ffwXlDKS0xOaLkh/pub?gid=637169620&single=true&output=csv";
const newsGrid = document.querySelector(".news-grid");

function setNewsState(message, isError = false) {
  if (!newsGrid) {
    return;
  }

  newsGrid.innerHTML = "";

  const state = document.createElement("div");
  state.className = isError ? "news-state news-error-state" : "news-state news-loading-state";
  state.textContent = message;

  newsGrid.appendChild(state);
}

function parseNewsCsv(csvText) {
  const cleanedText = csvText.replace(/^\uFEFF/, "").trim();

  if (!cleanedText) {
    return [];
  }

  const lines = cleanedText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const dateIndex = headers.indexOf("date");
  const titleIndex = headers.indexOf("title");
  const textIndex = headers.indexOf("text");
  const imageIndex = headers.indexOf("image");
  const urlIndex = headers.indexOf("url");

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return {
      date: dateIndex >= 0 ? (values[dateIndex] || "").trim() : "",
      title: titleIndex >= 0 ? (values[titleIndex] || "").trim() : "",
      text: textIndex >= 0 ? (values[textIndex] || "").trim() : "",
      image: imageIndex >= 0 ? (values[imageIndex] || "").trim() : "",
      url: urlIndex >= 0 ? (values[urlIndex] || "").trim() : ""
    };
  }).filter((row) => row.title || row.text);
}

function createPlaceholderArt() {
  const wrapper = document.createElement("div");
  wrapper.className = "news-placeholder-art";

  const bubble = document.createElement("span");
  bubble.className = "news-placeholder-bubble";

  const leaf = document.createElement("span");
  leaf.className = "news-placeholder-leaf";

  const star = document.createElement("span");
  star.className = "news-placeholder-star";

  wrapper.append(bubble, leaf, star);
  return wrapper;
}

function createNewsCard(newsItem) {
  const article = document.createElement("article");
  article.className = "news-card";

  const image = document.createElement("div");
  image.className = "news-image";

  const imageUrl = newsItem.image ? convertGoogleDriveImageUrl(newsItem.image) : "";

  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = newsItem.title || "Новина";
    img.loading = "lazy";
    img.decoding = "async";
    image.appendChild(img);
  } else {
    image.classList.add("news-image--placeholder");
    image.appendChild(createPlaceholderArt());
  }

  const content = document.createElement("div");
  content.className = "news-content";

  if (newsItem.date) {
    const date = document.createElement("span");
    date.className = "news-date";
    date.textContent = newsItem.date;
    content.appendChild(date);
  }

  const title = document.createElement("h3");
  title.textContent = newsItem.title || "Новина";
  content.appendChild(title);

  if (newsItem.text) {
    const text = document.createElement("p");
    text.textContent = newsItem.text;
    content.appendChild(text);
  }

  if (newsItem.url) {
    const footer = document.createElement("div");
    footer.className = "news-card-footer";

    const link = document.createElement("a");
    link.href = newsItem.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "read-more";
    link.textContent = "Прочети повече →";

    footer.appendChild(link);
    content.appendChild(footer);
  }

  article.append(image, content);
  return article;
}

function renderNews(newsItems) {
  if (!newsGrid) {
    return;
  }

  newsGrid.innerHTML = "";

  newsItems.forEach((newsItem) => {
    newsGrid.appendChild(createNewsCard(newsItem));
  });
}

async function loadNews() {
  if (!newsGrid) {
    return;
  }

  setNewsState("Зареждане на новини...");

  try {
    const response = await fetch(NEWS_CSV_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const newsItems = parseNewsCsv(csvText);

    if (newsItems.length === 0) {
      setNewsState("Неуспешно зареждане на новини", true);
      return;
    }

    renderNews(newsItems);
  } catch (error) {
    console.error("Грешка при зареждане на новини", error);
    setNewsState("Неуспешно зареждане на новини", true);
  }
}

function createGalleryLightbox() {
  if (!galleryGrid) {
    return null;
  }

  const existingLightbox = document.querySelector(".gallery-lightbox");
  if (existingLightbox) {
    return existingLightbox;
  }

  const lightbox = document.createElement("div");
  lightbox.className = "gallery-lightbox";
  lightbox.innerHTML = `
    <div class="gallery-lightbox__backdrop"></div>
    <div class="gallery-lightbox__dialog" role="dialog" aria-modal="true" aria-label="Увеличена снимка">
      <button type="button" class="gallery-lightbox__close" aria-label="Затвори">×</button>
      <img class="gallery-lightbox__image" alt="" />
    </div>
  `;

  document.body.appendChild(lightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target.classList.contains("gallery-lightbox__backdrop") || event.target.classList.contains("gallery-lightbox")) {
      closeGalleryLightbox();
    }
  });

  const closeButton = lightbox.querySelector(".gallery-lightbox__close");
  closeButton.addEventListener("click", closeGalleryLightbox);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeGalleryLightbox();
    }
  });

  return lightbox;
}

function openGalleryLightbox(imageUrl, imageAlt = "") {
  const lightbox = createGalleryLightbox();
  if (!lightbox) {
    return;
  }

  const lightboxImage = lightbox.querySelector(".gallery-lightbox__image");
  lightboxImage.src = imageUrl;
  lightboxImage.alt = imageAlt;
  lightbox.classList.add("is-open");
  document.body.classList.add("gallery-lightbox-open");
}

function closeGalleryLightbox() {
  const lightbox = document.querySelector(".gallery-lightbox");
  if (!lightbox) {
    return;
  }

  lightbox.classList.remove("is-open");
  document.body.classList.remove("gallery-lightbox-open");

  const lightboxImage = lightbox.querySelector(".gallery-lightbox__image");
  if (lightboxImage) {
    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
  }
}

function initGalleryLightbox() {
  if (!galleryGrid) {
    return;
  }

  galleryGrid.addEventListener("click", (event) => {
    const image = event.target.closest("img");
    if (!image) {
      return;
    }

    openGalleryLightbox(image.src, image.alt || "");
  });
}

loadDocuments();
initGalleryLightbox();
loadGallery();
loadNews();
