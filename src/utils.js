export function normalizeText(value) {
  return (value ?? '').trim();
}

export function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => {
    const aSeconds = a.createdAt?.seconds ?? 0;
    const bSeconds = b.createdAt?.seconds ?? 0;
    return bSeconds - aSeconds;
  });
}

export function formatMiniatureLabel(miniature) {
  const faction = normalizeText(miniature.faction);
  return faction ? `${miniature.name} (${faction})` : miniature.name;
}
