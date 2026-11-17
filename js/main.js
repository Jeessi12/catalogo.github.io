// Cambia este número por el de WhatsApp, con código de país y solo dígitos.
const whatsappNumber = "50371770106";
const defaultMessage = "Hola, vi su catálogo de Variedades Rivas y me gustaría más información";

const categoryFilters = document.querySelector("#category-filters");
const productGrids = new Map(
  [...document.querySelectorAll("[data-product-grid]")].map((grid) => [grid.dataset.productGrid, grid])
);
const productLines = [...document.querySelectorAll("[data-product-line]")];
const productSubcategories = [...document.querySelectorAll("[data-product-category]")];
const catalogSection = document.querySelector("#productos");
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");
const productDialog = document.querySelector("#product-dialog");
const dialogContent = document.querySelector("#dialog-content");
const dialogClose = document.querySelector(".dialog-close");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#site-nav");
let activeCategory = "Todos";
let lastFocusedElement = null;
let dialogCloseTimer = null;
let activeTemplates = [];
let activeTemplateIndex = 0;
let swipeStart = null;
let galleryReturnProduct = null;

function whatsappUrl(message) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function formatPrice(price) {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(price);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderFilters() {
  const categories = [
    { value: "Todos", label: "Todos" },
    { value: "Tazas bicolor", label: "Tazas bicolor" },
    { value: "Tazas tradicionales", label: "Tazas tradicionales" },
    { value: "articulos-escolares", label: "Artículos escolares" }
  ];
  categoryFilters.replaceChildren();

  categories.forEach(({ value, label }) => {
    const button = makeElement("button", "filter-button", label);
    button.type = "button";
    button.dataset.category = value;
    button.setAttribute("aria-pressed", String(value === activeCategory));
    categoryFilters.append(button);
  });
}

function renderProducts() {
  const visibleProducts = products.filter((product) => activeCategory === "Todos" || product.categoria === activeCategory);
  resultsCount.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? "producto" : "productos"}`;
  emptyState.hidden = visibleProducts.length > 0;

  productLines.forEach((line) => {
    line.hidden = activeCategory === "articulos-escolares"
      ? line.dataset.productLine === "tazas"
      : activeCategory !== "Todos" && line.dataset.productLine === "articulos-escolares";
  });

  productSubcategories.forEach((section) => {
    section.hidden = activeCategory !== "Todos" && section.dataset.productCategory !== activeCategory;
  });

  productGrids.forEach((grid) => grid.replaceChildren());

  visibleProducts.forEach((product) => {
    const gridKey = product.categoria.startsWith("Tazas") ? "tazas" : product.categoria;
    const grid = productGrids.get(gridKey);
    if (!grid) return;

    const card = makeElement("article", "product-card");
    const openButton = makeElement("button", "product-open");
    openButton.type = "button";
    openButton.dataset.productId = product.id;
    openButton.setAttribute("aria-label", `Ver detalles de ${product.nombre}, ${formatPrice(product.precio)}`);

    const image = document.createElement("img");
    image.src = product.imagen;
    image.alt = `Imagen de ${product.nombre}`;
    image.width = 400;
    image.height = 400;
    image.loading = "lazy";
    image.decoding = "async";

    const body = makeElement("span", "product-card-body");
    body.append(
      makeElement("span", "product-name", product.nombre),
      makeElement("span", "product-price", formatPrice(product.precio))
    );
    openButton.append(image, body);
    card.append(openButton);

    if (product.categoria.startsWith("Tazas")) {
      const templateButton = makeElement("button", "template-card-button");
      templateButton.type = "button";
      templateButton.dataset.templateCategory = product.categoria;
      templateButton.setAttribute("aria-label", `Ver plantillas para ${product.nombre}`);
      templateButton.append(makeElement("span", "template-card-icon", "✦"), document.createTextNode(" Ver plantillas"));
      card.append(templateButton);
    }

    grid.append(card);
  });
}

function openProduct(product) {
  const dialogAlreadyOpen = productDialog.open;
  window.clearTimeout(dialogCloseTimer);
  dialogCloseTimer = null;
  productDialog.classList.remove("is-closing");
  activeTemplates = [];
  galleryReturnProduct = null;
  if (!dialogAlreadyOpen) lastFocusedElement = document.activeElement;
  dialogContent.replaceChildren();

  const layout = makeElement("div", "dialog-layout");
  const image = document.createElement("img");
  image.className = "dialog-image";
  image.src = product.imagen;
  image.alt = `Imagen de ${product.nombre}`;
  image.width = 600;
  image.height = 600;

  const details = makeElement("div", "dialog-details");
  const title = makeElement("h2", "dialog-title", product.nombre);
  title.id = "dialog-title";
  const description = makeElement("p", "dialog-description", product.descripcion);
  const orderButton = makeElement("a", "button dialog-whatsapp", "Pedir por WhatsApp");
  orderButton.href = whatsappUrl(`Hola, me interesa el producto ${product.nombre} de Variedades Rivas.`);
  orderButton.target = "_blank";
  orderButton.rel = "noopener noreferrer";

  details.append(makeElement("p", "dialog-category", product.categoria), title, makeElement("p", "dialog-price", formatPrice(product.precio)), description);

  if (product.categoria.startsWith("Tazas")) appendTemplatePreview(details, product);
  details.append(orderButton);
  layout.append(image, details);
  dialogContent.append(layout);
  if (!dialogAlreadyOpen) productDialog.showModal();
  dialogClose.focus();
}

function appendTemplatePreview(container, product) {
  const categoryTemplates = plantillas.filter((template) => template.categoria === product.categoria);
  if (categoryTemplates.length === 0) return;

  const panel = makeElement("section", "template-preview-panel");
  panel.setAttribute("aria-labelledby", "template-preview-title");
  const heading = makeElement("h3", "template-preview-title", "Plantillas disponibles");
  const description = makeElement("p", "template-preview-description", "Elige un diseño para tu taza");
  const strip = makeElement("div", "template-strip");
  strip.setAttribute("aria-label", "Algunas plantillas disponibles");

  categoryTemplates.slice(0, 5).forEach((template) => {
    const button = makeElement("button", "template-strip-item");
    button.type = "button";
    button.dataset.templateCategory = product.categoria;
    button.dataset.templateId = template.id;
    button.dataset.returnProductId = product.id;
    button.setAttribute("aria-label", `Ver ${template.nombre} en la galería`);

    const image = document.createElement("img");
    image.src = template.imagen;
    image.alt = `${template.nombre}, plantilla para ${product.categoria.toLowerCase()}`;
    image.width = 88;
    image.height = 88;
    image.loading = "lazy";
    image.decoding = "async";
    button.append(image, makeElement("span", "", template.nombre));
    strip.append(button);
  });

  const allButton = makeElement("button", "template-all-button", "Ver todas las plantillas");
  allButton.type = "button";
  allButton.dataset.templateCategory = product.categoria;
  allButton.dataset.returnProductId = product.id;
  panel.append(heading, description, strip);
  if (categoryTemplates.length > 5) {
    panel.append(makeElement("p", "template-more-indicator", "Desliza para ver más diseños"));
  }
  panel.append(allButton);
  container.append(panel);
}

function showTemplate(index) {
  activeTemplateIndex = (index + activeTemplates.length) % activeTemplates.length;
  const template = activeTemplates[activeTemplateIndex];
  const image = dialogContent.querySelector(".template-featured-image");
  const caption = dialogContent.querySelector(".template-featured figcaption");
  const position = dialogContent.querySelector(".template-position");
  const orderButton = dialogContent.querySelector(".template-order");

  image.src = template.imagen;
  image.alt = `${template.nombre}, plantilla para ${template.categoria.toLowerCase()}`;
  caption.textContent = template.nombre;
  position.textContent = `${activeTemplateIndex + 1} de ${activeTemplates.length}`;
  orderButton.href = whatsappUrl(`Hola, me interesa la plantilla ${template.nombre} para ${template.categoria.toLowerCase()}.`);

  dialogContent.querySelectorAll(".template-thumbnail").forEach((button, buttonIndex) => {
    button.setAttribute("aria-pressed", String(buttonIndex === activeTemplateIndex));
  });
}

function openTemplateGallery(category, returnProduct = null, initialIndex = 0) {
  activeTemplates = plantillas.filter((template) => template.categoria === category);
  if (activeTemplates.length === 0) return;

  const dialogAlreadyOpen = productDialog.open;
  window.clearTimeout(dialogCloseTimer);
  dialogCloseTimer = null;
  productDialog.classList.remove("is-closing");
  activeTemplateIndex = initialIndex;
  galleryReturnProduct = returnProduct;
  if (!dialogAlreadyOpen) lastFocusedElement = document.activeElement;

  const gallery = makeElement("section", "template-gallery");
  const heading = makeElement("div", "template-gallery-heading");
  const title = makeElement("h2", "", `Plantillas de ${category.toLowerCase()}`);
  title.id = "dialog-title";
  if (returnProduct) {
    const backButton = makeElement("button", "gallery-back", "&#8592; Volver al producto");
    backButton.textContent = "← Volver al producto";
    backButton.type = "button";
    backButton.dataset.galleryBack = "true";
    heading.append(backButton);
  }
  heading.append(makeElement("p", "eyebrow", "Elige tu diseño"), title);

  const figure = makeElement("figure", "template-featured");
  const featuredImage = document.createElement("img");
  featuredImage.className = "template-featured-image";
  featuredImage.width = 800;
  featuredImage.height = 800;
  featuredImage.loading = "lazy";
  featuredImage.decoding = "async";
  figure.append(featuredImage, makeElement("figcaption", "", ""));

  const navigation = makeElement("div", "template-navigation");
  navigation.setAttribute("aria-label", "Navegación de plantillas");
  const previous = makeElement("button", "", "‹");
  previous.type = "button";
  previous.dataset.galleryStep = "-1";
  previous.setAttribute("aria-label", "Plantilla anterior");
  const position = makeElement("span", "template-position", "");
  position.setAttribute("aria-live", "polite");
  const next = makeElement("button", "", "›");
  next.type = "button";
  next.dataset.galleryStep = "1";
  next.setAttribute("aria-label", "Plantilla siguiente");
  navigation.append(previous, position, next);

  const thumbnails = makeElement("div", "template-thumbnails");
  thumbnails.setAttribute("role", "group");
  thumbnails.setAttribute("aria-label", `Miniaturas de ${category.toLowerCase()}`);

  activeTemplates.forEach((template, index) => {
    const button = makeElement("button", "template-thumbnail");
    button.type = "button";
    button.dataset.templateIndex = String(index);
    button.setAttribute("aria-label", `Ver ${template.nombre}`);
    button.setAttribute("aria-pressed", "false");

    const image = document.createElement("img");
    image.src = template.imagen;
    image.alt = `${template.nombre}, plantilla para ${category.toLowerCase()}`;
    image.width = 360;
    image.height = 360;
    image.loading = "lazy";
    image.decoding = "async";
    button.append(image, makeElement("span", "", template.nombre));
    thumbnails.append(button);
  });

  const orderButton = makeElement("a", "button template-order", "Pedir esta plantilla por WhatsApp");
  orderButton.target = "_blank";
  orderButton.rel = "noopener noreferrer";
  gallery.append(heading, figure, navigation, thumbnails, orderButton);
  dialogContent.replaceChildren(gallery);
  showTemplate(initialIndex);
  if (!dialogAlreadyOpen) productDialog.showModal();
  dialogClose.focus();
}

dialogContent.addEventListener("click", (event) => {
  const backButton = event.target.closest("button[data-gallery-back]");
  if (backButton && galleryReturnProduct) {
    openProduct(galleryReturnProduct);
    return;
  }

  const templateButton = event.target.closest("button[data-template-category]");
  if (templateButton) {
    const returnProduct = products.find((product) => product.id === templateButton.dataset.returnProductId) ?? null;
    const categoryTemplates = plantillas.filter((template) => template.categoria === templateButton.dataset.templateCategory);
    const startIndex = categoryTemplates.findIndex((template) => template.id === templateButton.dataset.templateId);
    openTemplateGallery(templateButton.dataset.templateCategory, returnProduct, Math.max(startIndex, 0));
    return;
  }

  const thumbnail = event.target.closest("button[data-template-index]");
  if (thumbnail) {
    showTemplate(Number(thumbnail.dataset.templateIndex));
    return;
  }

  const step = event.target.closest("button[data-gallery-step]");
  if (step && activeTemplates.length > 0) {
    showTemplate(activeTemplateIndex + Number(step.dataset.galleryStep));
  }
});

dialogContent.addEventListener("touchstart", (event) => {
  if (event.target.closest(".template-featured") && event.touches.length === 1) {
    swipeStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
}, { passive: true });

dialogContent.addEventListener("touchend", (event) => {
  if (!swipeStart || activeTemplates.length === 0) return;
  const deltaX = event.changedTouches[0].clientX - swipeStart.x;
  const deltaY = event.changedTouches[0].clientY - swipeStart.y;
  if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY)) {
    showTemplate(activeTemplateIndex + (deltaX < 0 ? 1 : -1));
  }
  swipeStart = null;
}, { passive: true });

function closeProductDialog() {
  if (!productDialog.open || dialogCloseTimer !== null) return;

  productDialog.classList.add("is-closing");
  const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150;
  dialogCloseTimer = window.setTimeout(() => {
    productDialog.classList.remove("is-closing");
    productDialog.close();
    dialogCloseTimer = null;
  }, delay);
}

function closeMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menú");
  siteNav.classList.remove("is-open");
}

categoryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderFilters();
  renderProducts();
});

catalogSection.addEventListener("click", (event) => {
  const productButton = event.target.closest("button[data-product-id]");
  if (productButton) {
    const product = products.find((item) => item.id === productButton.dataset.productId);
    if (product) openProduct(product);
    return;
  }

  const templateButton = event.target.closest("button[data-template-category]");
  if (templateButton) openTemplateGallery(templateButton.dataset.templateCategory);
});

dialogClose.addEventListener("click", closeProductDialog);
productDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeProductDialog();
  }
});
productDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeProductDialog();
});
productDialog.addEventListener("click", (event) => {
  if (event.target === productDialog) closeProductDialog();
});
productDialog.addEventListener("close", () => lastFocusedElement?.focus());

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Abrir menú" : "Cerrar menú");
  siteNav.classList.toggle("is-open", !isExpanded);
});

siteNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});

document.addEventListener("click", (event) => {
  if (!siteNav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
});

document.querySelector("#contact-whatsapp").href = whatsappUrl(defaultMessage);
document.querySelector("#current-year").textContent = String(new Date().getFullYear());

renderFilters();
renderProducts();