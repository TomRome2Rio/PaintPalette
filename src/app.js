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
import { formatMiniatureLabel, normalizeText, sortByCreatedAtDesc } from './utils.js';

const configMissing = Object.values(firebaseConfig).some((value) => value === 'REPLACE_ME');
const statusMessage = document.createElement('p');
statusMessage.className = 'status-message';

const paintForm = document.querySelector('#paint-form');
const paintList = document.querySelector('#paint-list');
const miniatureForm = document.querySelector('#miniature-form');
const miniatureList = document.querySelector('#miniature-list');
const recipeForm = document.querySelector('#recipe-form');
const recipeList = document.querySelector('#recipe-list');
const recipeMiniatureSelect = document.querySelector('#recipe-miniature');
const recipeFilterMiniatureSelect = document.querySelector('#recipe-filter-miniature');
const recipePaintSelect = document.querySelector('#recipe-paints');

let db;
let storage;
let paints = [];
let miniatures = [];

function renderPaints() {
  paintList.textContent = '';
  recipePaintSelect.textContent = '';

  for (const paint of sortByCreatedAtDesc(paints)) {
    const item = document.createElement('li');
    const headline = [paint.brand, paint.name].filter(Boolean).join(' - ') || paint.name;
    item.textContent = `${headline}${paint.colorFamily ? ` (${paint.colorFamily})` : ''}`;
    paintList.append(item);

    const option = document.createElement('option');
    option.value = paint.id;
    option.textContent = `${paint.brand ? `${paint.brand} - ` : ''}${paint.name}`;
    recipePaintSelect.append(option);
  }
}

function renderMiniatures() {
  miniatureList.textContent = '';
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
    const item = document.createElement('li');
    item.className = 'miniature-card';

    const name = document.createElement('h3');
    name.textContent = miniature.name;
    item.append(name);

    const details = [miniature.faction, miniature.scale].filter(Boolean).join(' • ');
    if (details) {
      const detailsEl = document.createElement('p');
      detailsEl.textContent = details;
      item.append(detailsEl);
    }

    if (miniature.imageUrl) {
      const image = document.createElement('img');
      image.src = miniature.imageUrl;
      image.alt = `${miniature.name} miniature`;
      image.loading = 'lazy';
      item.append(image);
    }

    miniatureList.append(item);

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

async function loadPaints() {
  const paintSnapshot = await getDocs(collection(db, 'paints'));
  paints = paintSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderPaints();
}

async function loadMiniatures() {
  const miniaturesSnapshot = await getDocs(collection(db, 'miniatures'));
  miniatures = miniaturesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderMiniatures();
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
      createdAt: serverTimestamp()
    });

    recipeForm.reset();
    recipeFilterMiniatureSelect.value = miniatureId;
    await loadRecipes(miniatureId);
  });

  recipeFilterMiniatureSelect.addEventListener('change', async () => {
    await loadRecipes(recipeFilterMiniatureSelect.value);
  });

  await Promise.all([loadPaints(), loadMiniatures()]);
  await loadRecipes(recipeFilterMiniatureSelect.value);
}
