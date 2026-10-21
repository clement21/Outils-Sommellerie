// Sauvegarde locale (dans le navigateur de l'appareil) des fiches et des réglages.

const CLE_FICHES = "sommellerie.fiches";
const CLE_REGLAGES = "sommellerie.reglages";

function lire(cle, defaut) {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? JSON.parse(brut) : defaut;
  } catch {
    return defaut;
  }
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false; // stockage plein ou indisponible (navigation privée)
  }
}

export function chargerFiches() {
  return lire(CLE_FICHES, []);
}

export function enregistrerFiche(fiche) {
  const fiches = chargerFiches();
  fiche.modifie = new Date().toISOString();
  const i = fiches.findIndex((f) => f.id === fiche.id);
  if (i >= 0) fiches[i] = fiche;
  else fiches.unshift(fiche);
  return ecrire(CLE_FICHES, fiches);
}

export function supprimerFiche(id) {
  return ecrire(CLE_FICHES, chargerFiches().filter((f) => f.id !== id));
}

export function importerFiches(nouvelles) {
  const fiches = chargerFiches();
  const ids = new Set(fiches.map((f) => f.id));
  let ajout = 0;
  for (const f of nouvelles) {
    if (f && f.id && f.identite && !ids.has(f.id)) {
      fiches.push(f);
      ajout++;
    }
  }
  ecrire(CLE_FICHES, fiches);
  return ajout;
}

export function chargerReglages() {
  return lire(CLE_REGLAGES, { cle: "", modele: "claude-opus-5-5" });
}

export function enregistrerReglages(r) {
  return ecrire(CLE_REGLAGES, r);
}
