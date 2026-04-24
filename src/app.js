import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';
import { SEED_PAINTS } from './seed-paints.js';
import { formatMiniatureLabel, normalizeText, sortByCreatedAtDesc } from './utils.js';

/* ===== Placeholder user system ===== */
// Will be replaced with real auth later.
// For now everyone shares a single anonymous user id.
const CURRENT_USER = {
  id: 'anonymous',
  displayName: 'Anonymous Painter'
};

function getViewingUserId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('user') || CURRENT_USER.id;
}

function isOwnGallery() {
  return getViewingUserId() === CURRENT_USER.id;
}

/* ===== DOM refs ===== */
const configMissing = Object.values(firebaseConfig).some((value) => value === 'REPLACE_ME');
const statusMessage = document.createElement('p');
statusMessage.className = 'status-message';

const paintForm = document.querySelector('#paint-form');
const paintList = document.querySelector('#paint-list');
const miniatureForm = document.querySelector('#miniature-form');
const galleryGrid = document.querySelector('#gallery-grid');
const galleryEmpty = document.querySelector('#gallery-empty');
const galleryTitle = document.querySelector('#gallery-title');
const currentUserName = document.querySelector('#current-user-name');
const recipeForm = document.querySelector('#recipe-form');
const recipeList = document.querySelector('#recipe-list');
const recipeMiniatureSelect = document.querySelector('#recipe-miniature');
const recipeFilterMiniatureSelect = document.querySelector('#recipe-filter-miniature');
const recipePaintSelect = document.querySelector('#recipe-paints');
const seedPaintsBtn = document.querySelector('#seed-paints-btn');
const paintFilterBrand = document.querySelector('#paint-filter-brand');
const paintFilterColor = document.querySelector('#paint-filter-color');
const navLinks = document.querySelectorAll('.nav-link');

let db;
let storage;
let paints = [];
let miniatures = [];

/* ===== View routing ===== */
function switchView(viewName) {
  for (const section of document.querySelectorAll('.view')) {
    section.classList.remove('active');
  }
  document.querySelector(`#view-${viewName}`)?.classList.add('active');

  for (const link of navLinks) {
    link.classList.toggle('active', link.dataset.view === viewName);
  }
}

function handleHashRoute() {
  const hash = window.location.hash.replace('#', '') || 'gallery';
  switchView(hash);
}

for (const link of navLinks) {
  link.addEventListener('click', () => {
    // Let the hash change trigger the view switch
    setTimeout(handleHashRoute, 0);
  });
}

window.addEventListener('hashchange', handleHashRoute);

/* ===== Render functions ===== */
function renderGallery() {
  galleryGrid.textContent = '';
  const sorted = sortByCreatedAtDesc(miniatures);

  // Show/hide upload form depending on whose gallery we're viewing
  const uploadCard = miniatureForm.closest('.upload-card');
  if (uploadCard) {
    uploadCard.hidden = !isOwnGallery();
  }

  galleryTitle.textContent = isOwnGallery() ? 'My Gallery' : "Someone's Gallery";

  if (sorted.length === 0) {
    galleryEmpty.hidden = false;
    galleryEmpty.textContent = isOwnGallery()
      ? 'No miniatures yet — upload your first painted mini above!'
      : 'This painter hasn\u2019t uploaded any miniatures yet.';
    return;
  }

  galleryEmpty.hidden = true;

  for (const mini of sorted) {
    const card = document.createElement('div');
    card.className = 'gallery-card';

    if (mini.imageUrl) {
      const img = document.createElement('img');
      img.src = mini.imageUrl;
      img.alt = `${mini.name} miniature`;
      img.loading = 'lazy';
      card.append(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'gallery-placeholder';
      placeholder.textContent = 'No photo';
      card.append(placeholder);
    }

    const body = document.createElement('div');
    body.className = 'gallery-card-body';

    const title = document.createElement('h3');
    title.textContent = mini.name;
    body.append(title);

    const details = [mini.faction, mini.scale].filter(Boolean).join(' \u2022 ');
    if (details) {
      const subtitle = document.createElement('p');
      subtitle.textContent = details;
      body.append(subtitle);
    }

    if (mini.notes) {
      const notes = document.createElement('p');
      notes.textContent = mini.notes;
      body.append(notes);
    }

    card.append(body);
    galleryGrid.append(card);
  }
}

function renderPaints() {
  paintList.textContent = '';
  recipePaintSelect.textContent = '';

  // Populate filter dropdowns
  const brands = [...new Set(paints.map((p) => p.brand).filter(Boolean))].sort();
  const families = [...new Set(paints.map((p) => p.colorFamily).filter(Boolean))].sort();

  const prevBrand = paintFilterBrand.value;
  const prevColor = paintFilterColor.value;
  paintFilterBrand.textContent = '';
  paintFilterColor.textContent = '';

  const allBrands = document.createElement('option');
  allBrands.value = '';
  allBrands.textContent = 'All brands';
  paintFilterBrand.append(allBrands);
  for (const brand of brands) {
    const opt = document.createElement('option');
    opt.value = brand;
    opt.textContent = brand;
    paintFilterBrand.append(opt);
  }
  paintFilterBrand.value = brands.includes(prevBrand) ? prevBrand : '';

  const allColors = document.createElement('option');
  allColors.value = '';
  allColors.textContent = 'All colours';
  paintFilterColor.append(allColors);
  for (const fam of families) {
    const opt = document.createElement('option');
    opt.value = fam;
    opt.textContent = fam;
    paintFilterColor.append(opt);
  }
  paintFilterColor.value = families.includes(prevColor) ? prevColor : '';

  // Filter
  const activeBrand = paintFilterBrand.value;
  const activeColor = paintFilterColor.value;

  const sorted = sortByCreatedAtDesc(paints);
  const filtered = sorted.filter((p) => {
    if (activeBrand && p.brand !== activeBrand) return false;
    if (activeColor && p.colorFamily !== activeColor) return false;
    return true;
  });

  // Render list
  for (const paint of filtered) {
    const item = document.createElement('li');
    item.className = 'paint-item';

    if (paint.hex) {
      const swatch = document.createElement('span');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = paint.hex;
      item.append(swatch);
    }

    const details = document.createElement('div');
    details.className = 'paint-item-details';

    const nameEl = document.createElement('span');
    nameEl.className = 'paint-name';
    nameEl.textContent = paint.name;
    details.append(nameEl);

    const meta = [paint.brand, paint.range, paint.colorFamily].filter(Boolean).join(' · ');
    if (meta) {
      const metaEl = document.createElement('span');
      metaEl.className = 'paint-meta';
      metaEl.textContent = meta;
      details.append(metaEl);
    }

    item.append(details);
    paintList.append(item);
  }

  // Recipe paint selector (unfiltered)
  for (const paint of sorted) {
    const option = document.createElement('option');
    option.value = paint.id;
    option.textContent = `${paint.brand ? `${paint.brand} - ` : ''}${paint.name}`;
    recipePaintSelect.append(option);
  }
}

function renderMiniatureSelects() {
  recipeMiniatureSelect.textContent = '';
  recipeFilterMiniatureSelect.textContent = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a miniature';
  placeholder.selected = true;
  placeholder.disabled = true;
  recipeMiniatureSelect.append(placeholder);

  const allRecipes = document.createElement('option');
  allRecipes.value = '';
  allRecipes.textContent = 'Choose miniature';
  allRecipes.selected = true;
  recipeFilterMiniatureSelect.append(allRecipes);

  for (const miniature of sortByCreatedAtDesc(miniatures)) {
    const option = document.createElement('option');
    option.value = miniature.id;
    option.textContent = formatMiniatureLabel(miniature);

    recipeMiniatureSelect.append(option.cloneNode(true));
    recipeFilterMiniatureSelect.append(option);
  }
}

function renderRecipes(recipes) {
  recipeList.textContent = '';

  for (const recipe of sortByCreatedAtDesc(recipes)) {
    const item = document.createElement('li');
    const title = document.createElement('h3');
    title.textContent = recipe.title;
    item.append(title);

    const byline = document.createElement('p');
    byline.textContent = recipe.author ? `By ${recipe.author}` : 'Community recipe';
    item.append(byline);

    const paintNames = recipe.paintIds
      .map((paintId) => paints.find((paint) => paint.id === paintId)?.name)
      .filter(Boolean);

    if (paintNames.length > 0) {
      const paintsEl = document.createElement('p');
      paintsEl.textContent = `Paints: ${paintNames.join(', ')}`;
      item.append(paintsEl);
    }

    const steps = document.createElement('pre');
    steps.textContent = recipe.steps;
    item.append(steps);

    recipeList.append(item);
  }
}

/* ===== Data loading ===== */
async function loadPaints() {
  const paintSnapshot = await getDocs(collection(db, 'paints'));
  paints = paintSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderPaints();
}

async function loadMiniatures() {
  const userId = getViewingUserId();
  const miniaturesQuery = query(collection(db, 'miniatures'), where('userId', '==', userId));
  const miniaturesSnapshot = await getDocs(miniaturesQuery);
  miniatures = miniaturesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderGallery();
  renderMiniatureSelects();
}

async function loadRecipes(miniatureId) {
  if (!miniatureId) {
    renderRecipes([]);
    return;
  }

  const recipeQuery = query(collection(db, 'recipes'), where('miniatureId', '==', miniatureId));
  const recipeSnapshot = await getDocs(recipeQuery);
  const recipes = recipeSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderRecipes(recipes);
}

/* ===== Init ===== */
currentUserName.textContent = CURRENT_USER.displayName;
handleHashRoute();

if (configMissing) {
  statusMessage.textContent = 'Firebase config is missing. Update src/firebase-config.js to enable saving and loading data.';
  document.querySelector('header').append(statusMessage);
  for (const form of [paintForm, miniatureForm, recipeForm]) {
    for (const input of form.elements) {
      input.disabled = true;
    }
  }
} else {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);

  paintForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(paintForm);
    await addDoc(collection(db, 'paints'), {
      name: normalizeText(formData.get('name')),
      brand: normalizeText(formData.get('brand')),
      colorFamily: normalizeText(formData.get('colorFamily')),
      notes: normalizeText(formData.get('notes')),
      createdAt: serverTimestamp()
    });

    paintForm.reset();
    await loadPaints();
  });

  miniatureForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(miniatureForm);
    const photo = formData.get('photo');
    let imageUrl = '';

    if (photo instanceof File && photo.size > 0) {
      const imageRef = ref(storage, `miniatures/${Date.now()}-${photo.name}`);
      await uploadBytes(imageRef, photo);
      imageUrl = await getDownloadURL(imageRef);
    }

    await addDoc(collection(db, 'miniatures'), {
      name: normalizeText(formData.get('name')),
      faction: normalizeText(formData.get('faction')),
      scale: normalizeText(formData.get('scale')),
      notes: normalizeText(formData.get('notes')),
      imageUrl,
      userId: CURRENT_USER.id,
      createdAt: serverTimestamp()
    });

    miniatureForm.reset();
    await loadMiniatures();
  });

  recipeForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(recipeForm);
    const miniatureId = normalizeText(formData.get('miniatureId'));
    const paintIds = Array.from(recipePaintSelect.selectedOptions).map((option) => option.value);

    await addDoc(collection(db, 'recipes'), {
      miniatureId,
      title: normalizeText(formData.get('title')),
      paintIds,
      author: normalizeText(formData.get('author')),
      steps: normalizeText(formData.get('steps')),
      userId: CURRENT_USER.id,
      createdAt: serverTimestamp()
    });

    recipeForm.reset();
    recipeFilterMiniatureSelect.value = miniatureId;
    await loadRecipes(miniatureId);
  });

  recipeFilterMiniatureSelect.addEventListener('change', async () => {
    await loadRecipes(recipeFilterMiniatureSelect.value);
  });

  paintFilterBrand.addEventListener('change', () => renderPaints());
  paintFilterColor.addEventListener('change', () => renderPaints());

  seedPaintsBtn.addEventListener('click', async () => {
    seedPaintsBtn.disabled = true;
    seedPaintsBtn.textContent = 'Loading…';

    const paintsCol = collection(db, 'paints');
    const batch = SEED_PAINTS.map((paint) =>
      addDoc(paintsCol, {
        name: paint.name,
        brand: paint.brand,
        range: paint.range,
        colorFamily: paint.colorFamily,
        hex: paint.hex,
        notes: '',
        createdAt: serverTimestamp()
      })
    );
    await Promise.all(batch);

    seedPaintsBtn.textContent = 'Done!';
    await loadPaints();
  });

  await Promise.all([loadPaints(), loadMiniatures()]);
  await loadRecipes(recipeFilterMiniatureSelect.value);
}
