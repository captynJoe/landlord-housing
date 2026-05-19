const DEFAULT_EMPTY_TEXT = "No photos selected.";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function removePreviewUrls(container) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const previous = container.dataset.objectUrls ?? "";
  previous
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => URL.revokeObjectURL(item));
  container.dataset.objectUrls = "";
}

function createPreviewImage(src, alt, caption) {
  const figure = document.createElement("figure");
  figure.className = "upload-preview-item";

  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";
  figure.append(image);

  const note = document.createElement("figcaption");
  note.textContent = caption;
  figure.append(note);

  return figure;
}

export function validateImageFiles(
  fileList,
  { maxFiles = 4, maxSizeMb = 10 } = {}
) {
  const files = Array.from(fileList ?? []).filter((item) => item instanceof File);

  if (files.length > maxFiles) {
    throw new Error(`Select up to ${maxFiles} photo${maxFiles === 1 ? "" : "s"}.`);
  }

  const maxBytes = maxSizeMb * 1024 * 1024;
  files.forEach((file) => {
    if (!ALLOWED_IMAGE_TYPES.has(String(file.type ?? "").toLowerCase())) {
      throw new Error(`${file.name} must be a JPEG, PNG, or WebP image.`);
    }

    if (file.size > maxBytes) {
      throw new Error(`${file.name} is larger than ${maxSizeMb} MB.`);
    }
  });

  return files;
}

export function renderSelectedImagePreviews(
  container,
  fileList,
  { emptyText = DEFAULT_EMPTY_TEXT } = {}
) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  removePreviewUrls(container);
  container.replaceChildren();

  const files = Array.from(fileList ?? []).filter((item) => item instanceof File);
  if (files.length === 0) {
    const empty = document.createElement("p");
    empty.className = "upload-preview-empty";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  const objectUrls = [];
  files.forEach((file, index) => {
    const objectUrl = URL.createObjectURL(file);
    objectUrls.push(objectUrl);
    container.append(
      createPreviewImage(
        objectUrl,
        file.name || `Selected photo ${index + 1}`,
        file.name || `Photo ${index + 1}`
      )
    );
  });

  container.dataset.objectUrls = objectUrls.join("\n");
}

export function createUploadedImageGallery(urls, { linkLabel = "Open photo" } = {}) {
  const list = Array.isArray(urls)
    ? urls.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

  if (list.length === 0) {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "upload-preview-grid is-uploaded";

  list.forEach((url, index) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.className = "upload-preview-link";
    anchor.setAttribute("aria-label", `${linkLabel} ${index + 1}`);
    anchor.append(
      createPreviewImage(url, `${linkLabel} ${index + 1}`, `Photo ${index + 1}`)
    );
    wrapper.append(anchor);
  });

  return wrapper;
}

function applyUploadFields(formData, fields) {
  if (!fields || typeof fields !== "object") {
    return;
  }

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const normalized =
      typeof value === "string" ? value.trim() : String(value);
    if (!normalized) {
      return;
    }

    formData.set(key, normalized);
  });
}

export async function uploadImageFiles(
  files,
  { createUploadRequest, getSignature } = {}
) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const buildUploadRequest =
    typeof createUploadRequest === "function"
      ? createUploadRequest
      : typeof getSignature === "function"
        ? getSignature
        : null;

  if (!buildUploadRequest) {
    throw new Error("Upload request callback is required.");
  }

  const uploadedUrls = [];

  for (const file of files) {
    const uploadRequest = (await buildUploadRequest(file)) ?? {};
    const uploadUrl = String(uploadRequest.url ?? uploadRequest.uploadUrl ?? "").trim();

    if (!uploadUrl) {
      throw new Error("Upload request is missing a destination URL.");
    }

    const headers = new Headers(uploadRequest.headers ?? {});
    headers.delete("content-type");

    const formData = new FormData();
    formData.set("file", file);
    applyUploadFields(formData, uploadRequest.fields);

    const response = await fetch(uploadUrl, {
      method: String(uploadRequest.method ?? "POST").toUpperCase(),
      body: formData,
      headers,
      credentials: uploadRequest.credentials ?? "same-origin"
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const uploadError =
        payload?.issues?.[0]?.message ??
        payload?.error ??
        "Photo upload failed.";
      throw new Error(uploadError);
    }

    const uploadedUrl = String(payload?.data?.url ?? payload?.url ?? "").trim();
    if (!uploadedUrl) {
      throw new Error("Photo upload succeeded without a public URL.");
    }

    uploadedUrls.push(uploadedUrl);
  }

  return uploadedUrls;
}
