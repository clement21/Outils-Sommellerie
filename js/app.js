import { SECTIONS, FAMILLES_AROMES, ficheVide, familleDe } from "./lexique.js";
import { chargerFiches, enregistrerFiche, supprimerFiche, importerFiches, chargerReglages, enregistrerReglages } from "./stockage.js";
import { preparerPhoto } from "./image.js";

// Le module Claude est chargé à la demande : l'application reste utilisable hors ligne pour la saisie manuelle.
const claude = () => import("./claude.js");

const $ = (sel, racine = document) => racine.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const etat = {
  fiche: null,        // fiche en cours d'édition
  section: "identite",
  photos: {},         // { etiquette: {analyse, vignette}, contre: {...} } pour l'écran photo
  reglages: chargerReglages(),
};

// ---------- Navigation ----------

function afficher(ecran) {
  document.querySelectorAll(".ecran").forEach((e) => e.hidden = e.id !== `ecran-${ecran}`);
  window.scrollTo(0, 0);
}

function toast(message, type = "info") {
  const t = $("#toast");
  t.textContent = message;
  t.className = `toast ${type}`;
  t.hidden = false;
  clearTimeout(toast.minuteur);
  toast.minuteur = setTimeout(() => (t.hidden = true), type === "erreur" ? 6000 : 2500);
}

// ---------- Cave (liste des fiches) ----------

function rendreCave() {
  const fiches = chargerFiches();
  const liste = $("#liste-fiches");
  $("#cave-vide").hidden = fiches.length > 0;
  liste.innerHTML = fiches.map((f) => {
    const i = f.identite;
    const titre = [i.domaine, i.nom].filter(Boolean).join(" · ") || "Vin sans nom";
    const sous = [i.appellation, i.millesime].filter(Boolean).join(" · ");
    const vignette = f.photos?.etiquette || f.photos?.contre;
    return `<li class="carte-fiche" data-id="${esc(f.id)}">
      <div class="vignette pastille-${esc(i.couleur || "inconnu")}">${vignette ? `<img src="${vignette}" alt="">` : "🍷"}</div>
      <div class="carte-texte">
        <strong>${esc(titre)}</strong>
        <span>${esc(sous)}</span>
        <small>${esc(i.date || "")}</small>
      </div>
      ${f.conclusion?.note != null ? `<span class="note-badge">${esc(f.conclusion.note)}<small>/20</small></span>` : ""}
    </li>`;
  }).join("");
  afficher("cave");
}

$("#liste-fiches").addEventListener("click", (e) => {
  const li = e.target.closest(".carte-fiche");
  if (!li) return;
  const f = chargerFiches().find((x) => x.id === li.dataset.id);
  if (f) ouvrirFiche(f, "identite");
});

// ---------- Prise de photo ----------

function nouvelleDegustation() {
  etat.photos = {};
  rendrePhotos();
  afficher("photo");
}

function rendrePhotos() {
  for (const cle of ["etiquette", "contre"]) {
    const zone = $(`.zone-photo[data-photo="${cle}"]`);
    const p = etat.photos[cle];
    zone.classList.toggle("remplie", !!p);
    $(".apercu-photo", zone).innerHTML = p ? `<img src="${p.vignette}" alt="">` : "";
  }
  $("#btn-analyser").disabled = !etat.photos.etiquette && !etat.photos.contre;
}

document.querySelectorAll(".zone-photo input[type=file]").forEach((input) => {
  input.addEventListener("change", async () => {
    const fichier = input.files[0];
    if (!fichier) return;
    try {
      etat.photos[input.closest(".zone-photo").dataset.photo] = await preparerPhoto(fichier);
      rendrePhotos();
    } catch {
      toast("Impossible de lire cette image.", "erreur");
    }
    input.value = "";
  });
});

async function analyser() {
  const photos = ["etiquette", "contre"].filter((c) => etat.photos[c]);
  const chargement = $("#chargement");
  chargement.hidden = false;
  try {
    const { analyserEtiquette } = await claude();
    const r = await analyserEtiquette(photos.map((c) => etat.photos[c].analyse), etat.reglages);
    const f = ficheVide();
    for (const c of photos) f.photos[c] = etat.photos[c].vignette;
    Object.assign(f.identite, r.identite, { date: f.identite.date });
    f.reperes = r.reperes;
    f.analyse = { confiance: r.confiance, illisible: r.illisible };
    enregistrerFiche(f);
    ouvrirFiche(f, "identite");
    toast("Étiquette lue. Vérifiez les informations.");
  } catch (e) {
    toast(e.message || "L'analyse a échoué.", "erreur");
    if (!etat.reglages.cle) ouvrirReglages();
  } finally {
    chargement.hidden = true;
  }
}

function saisieManuelle() {
  const f = ficheVide();
  for (const c of ["etiquette", "contre"]) if (etat.photos[c]) f.photos[c] = etat.photos[c].vignette;
  enregistrerFiche(f);
  ouvrirFiche(f, "identite");
}

// ---------- Fiche de dégustation ----------

function ouvrirFiche(fiche, section) {
  etat.fiche = fiche;
  etat.section = section;
  rendreOnglets();
  rendreSection();
  afficher("fiche");
}

function rendreOnglets() {
  $("#onglets").innerHTML = SECTIONS.map((s) =>
    `<button type="button" role="tab" data-section="${s.id}" aria-selected="${s.id === etat.section}">
      <span aria-hidden="true">${s.icone}</span>${s.titre}</button>`).join("");
}

$("#onglets").addEventListener("click", (e) => {
  const b = e.target.closest("[data-section]");
  if (!b) return;
  etat.section = b.dataset.section;
  rendreOnglets();
  rendreSection();
  window.scrollTo(0, 0);
});

function visible(champ, f) {
  return !champ.when || champ.when(f);
}

function rendreSection() {
  const f = etat.fiche;
  const s = SECTIONS.find((x) => x.id === etat.section);
  const i = SECTIONS.indexOf(s);
  const html = [];

  if (s.id === "identite") html.push(rendreEnteteIdentite(f));
  html.push(`<p class="intro">${esc(s.intro)}</p>`);
  html.push(rendreReperes(f, s.id));
  for (const c of s.champs) if (visible(c, f)) html.push(rendreChamp(s.id, c, f));

  if (s.id === "conclusion") {
    html.push(`<div class="bloc-ia">
      <button type="button" class="btn principal" data-action="rediger">✍️ Rédiger le commentaire avec Claude</button>
      <p class="aide-ia">Claude rédige un commentaire à partir de <em>vos</em> observations et vous fait un retour pour progresser.</p>
      ${rendreRetourIA(f)}
    </div>`);
  }

  const prec = SECTIONS[i - 1], suiv = SECTIONS[i + 1];
  html.push(`<nav class="pied-section">
    ${prec ? `<button type="button" class="btn" data-aller="${prec.id}">← ${prec.titre}</button>` : "<span></span>"}
    ${suiv ? `<button type="button" class="btn principal" data-aller="${suiv.id}">${suiv.titre} →</button>`
           : `<button type="button" class="btn principal" data-action="apercu">Voir la fiche complète</button>`}
  </nav>`);

  $("#contenu-section").innerHTML = html.join("");
}

function rendreEnteteIdentite(f) {
  const photos = ["etiquette", "contre"].filter((c) => f.photos?.[c]);
  let html = "";
  if (photos.length) {
    html += `<div class="photos-fiche">${photos.map((c) => `<img src="${f.photos[c]}" alt="Photo de l'${c === "etiquette" ? "étiquette" : "contre-étiquette"}">`).join("")}</div>`;
  }
  if (f.analyse) {
    html += `<div class="info-analyse confiance-${esc(f.analyse.confiance)}">
      Lecture automatique · confiance ${esc(f.analyse.confiance)}
      ${f.analyse.illisible ? `<br><small>⚠️ ${esc(f.analyse.illisible)}</small>` : ""}
    </div>`;
  }
  return html;
}

// Les « repères » sont le profil attendu du vin, déduits de l'étiquette par Claude.
// On les affiche dans chaque section pour guider, et on peut les masquer pour s'entraîner à l'aveugle.
function rendreReperes(f, section) {
  const r = f.reperes;
  if (!r) return "";
  if (f.aveugle) {
    return `<div class="reperes masques"><button type="button" class="lien" data-action="aveugle">👁️ Afficher les repères du sommelier</button></div>`;
  }
  const lignes = {
    identite: [["Style", r.style], ["Conseil de dégustation", r.a_surveiller]],
    oeil: [["Robe attendue", r.robe]],
    nez: [["Arômes attendus", (r.nez || []).join(", ")]],
    bouche: [["Bouche attendue", r.bouche]],
    conclusion: [["Service", [r.temperature, r.aeration].filter(Boolean).join(" · ")], ["Garde", r.garde], ["Accords", (r.accords || []).join(" · ")]],
  }[section] || [];
  const contenu = lignes.filter(([, v]) => v).map(([k, v]) => `<p><strong>${k} :</strong> ${esc(v)}</p>`).join("");
  if (!contenu) return "";
  return `<aside class="reperes">
    <header><span>🎓 Repères du sommelier <small>(profil attendu, à confirmer dans le verre)</small></span>
      <button type="button" class="lien" data-action="aveugle" title="Masquer pour déguster sans influence">Masquer</button></header>
    ${contenu}
    ${section === "conclusion" ? `<button type="button" class="btn petit" data-action="reprendre-reperes">Reprendre ces repères dans la fiche</button>` : ""}
  </aside>`;
}

function rendreAide(c) {
  return c.aide ? `<details class="aide"><summary aria-label="Aide">?</summary><p>${esc(c.aide)}</p></details>` : "";
}

function rendreChamp(sid, c, f) {
  const v = f[sid][c.id];
  const nom = `${sid}.${c.id}`;
  const label = `<div class="label-ligne"><span class="label">${esc(c.label)}</span>${rendreAide(c)}</div>`;

  switch (c.type) {
    case "text":
      return `<label class="champ">${label}<input type="text" name="${nom}" value="${esc(v)}" ${c.inputmode ? `inputmode="${c.inputmode}"` : ""} placeholder="${esc(c.placeholder || "")}"></label>`;
    case "textarea":
      return `<label class="champ">${label}<textarea name="${nom}" rows="${c.grand ? 8 : 3}" placeholder="${esc(c.placeholder || "")}">${esc(v)}</textarea></label>`;
    case "toggle":
      return `<label class="champ bascule"><input type="checkbox" name="${nom}" ${v ? "checked" : ""}><span class="label">${esc(c.label)}</span></label>`;
    case "single":
    case "multi": {
      const options = c.optionsFrom ? c.optionsFrom(f) : c.options;
      const choisi = (o) => (c.type === "multi" ? v.includes(o) : v === o);
      return `<fieldset class="champ">${label}<div class="pastilles" data-champ="${nom}" data-type="${c.type}">
        ${options.map((o) => `<button type="button" class="pastille ${sid === "identite" && c.id === "couleur" ? `pastille-${esc(o)}` : ""}" data-valeur="${esc(o)}" aria-pressed="${choisi(o)}">${esc(o)}</button>`).join("")}
      </div></fieldset>`;
    }
    case "scale": {
      const n = c.options.length;
      return `<fieldset class="champ">${label}<div class="echelle" data-champ="${nom}" data-type="scale" style="--n:${n}">
        ${c.options.map((o, idx) => `<button type="button" data-valeur="${idx}" aria-pressed="${v === idx}" class="${v != null && idx <= v ? "rempli" : ""}"><span>${esc(o)}</span></button>`).join("")}
      </div></fieldset>`;
    }
    case "number": {
      const affichage = v == null ? "—" : `${v} ${c.unite || ""}${c.libelle ? ` · ${c.libelle(v)}` : ""}`;
      return `<label class="champ">${label}<div class="curseur">
        <input type="range" name="${nom}" min="${c.min}" max="${c.max}" step="${c.step}" value="${v ?? c.min}" data-vide="${v == null}">
        <output>${esc(affichage)}</output></div></label>`;
    }
    case "aromas":
      return rendreAromes(sid, c, v);
  }
  return "";
}

function rendreAromes(sid, c, choisis) {
  const nom = `${sid}.${c.id}`;
  const parFamille = (fam) => fam.aromes.filter((a) => choisis.includes(a)).length;
  return `<fieldset class="champ">${`<div class="label-ligne"><span class="label">${esc(c.label)}</span></div>`}
    <div class="aromes-choisis">
      ${choisis.length ? choisis.map((a) => {
        const fam = familleDe(a);
        return `<button type="button" class="arome-choisi" data-retirer="${esc(a)}" data-champ="${nom}" style="--c:${fam?.couleur || "#888"}">${esc(a)} <span aria-hidden="true">×</span></button>`;
      }).join("") : `<span class="vide">Aucun arôme sélectionné. Ouvrez une famille ci-dessous.</span>`}
    </div>
    ${sid === "bouche" && etat.fiche.nez.aromes.length ? `<button type="button" class="btn petit" data-action="copier-nez">Reprendre les arômes du nez</button>` : ""}
    <div class="familles">
      ${FAMILLES_AROMES.map((fam) => `<details class="famille" style="--c:${fam.couleur}" data-famille="${fam.id}">
        <summary><span class="puce"></span>${esc(fam.nom)} <small>${esc(fam.origine)}</small>${parFamille(fam) ? `<b>${parFamille(fam)}</b>` : ""}</summary>
        <div class="pastilles" data-champ="${nom}" data-type="multi">
          ${fam.aromes.map((a) => `<button type="button" class="pastille" data-valeur="${esc(a)}" aria-pressed="${choisis.includes(a)}">${esc(a)}</button>`).join("")}
        </div>
      </details>`).join("")}
    </div>
    <form class="ajout-arome" data-champ="${nom}">
      <input type="text" placeholder="Autre arôme…" aria-label="Ajouter un arôme">
      <button type="submit" class="btn petit">Ajouter</button>
    </form>
  </fieldset>`;
}

function rendreRetourIA(f) {
  const ia = f.retourIA;
  if (!ia) return "";
  const liste = (titre, items) => items?.length ? `<h4>${titre}</h4><ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  return `<div class="retour-ia">${liste("🔎 Cohérence de vos observations", ia.coherence)}${liste("🎯 Pour progresser", ia.conseils)}</div>`;
}

// ---------- Saisie ----------

let minuteurSauvegarde;
function sauvegarder() {
  clearTimeout(minuteurSauvegarde);
  minuteurSauvegarde = setTimeout(() => {
    if (!enregistrerFiche(etat.fiche)) toast("Stockage plein : exportez puis supprimez d'anciennes fiches.", "erreur");
    $("#etat-sauvegarde").textContent = "Enregistré ✓";
  }, 400);
  $("#etat-sauvegarde").textContent = "…";
}

function definir(nom, valeur) {
  const [sid, cid] = nom.split(".");
  etat.fiche[sid][cid] = valeur;
  sauvegarder();
}

function lire(nom) {
  const [sid, cid] = nom.split(".");
  return etat.fiche[sid][cid];
}

function rerendre() {
  const ouverts = [...document.querySelectorAll("details.famille[open]")].map((d) => d.dataset.famille);
  const y = window.scrollY;
  rendreSection();
  ouverts.forEach((id) => { const d = $(`details.famille[data-famille="${id}"]`); if (d) d.open = true; });
  window.scrollTo(0, y);
}

const contenu = $("#contenu-section");

contenu.addEventListener("input", (e) => {
  const t = e.target;
  if (!t.name) return;
  if (t.type === "range") {
    const v = Number(t.value);
    definir(t.name, v);
    t.dataset.vide = "false";
    const [sid, cid] = t.name.split(".");
    const c = SECTIONS.find((s) => s.id === sid).champs.find((x) => x.id === cid);
    t.nextElementSibling.textContent = `${v} ${c.unite || ""}${c.libelle ? ` · ${c.libelle(v)}` : ""}`;
  } else if (t.type === "checkbox") {
    definir(t.name, t.checked);
    rerendre();
  } else {
    definir(t.name, t.value);
  }
});

contenu.addEventListener("click", async (e) => {
  const bouton = e.target.closest("button");
  if (!bouton) return;

  if (bouton.dataset.aller) {
    etat.section = bouton.dataset.aller;
    rendreOnglets();
    rendreSection();
    window.scrollTo(0, 0);
    return;
  }

  if (bouton.dataset.retirer) {
    const nom = bouton.dataset.champ;
    definir(nom, lire(nom).filter((a) => a !== bouton.dataset.retirer));
    rerendre();
    return;
  }

  const groupe = bouton.closest("[data-champ][data-type]");
  if (groupe && bouton.dataset.valeur !== undefined) {
    const nom = groupe.dataset.champ;
    const type = groupe.dataset.type;
    const val = bouton.dataset.valeur;
    const actuel = lire(nom);
    if (type === "multi") definir(nom, actuel.includes(val) ? actuel.filter((x) => x !== val) : [...actuel, val]);
    else if (type === "scale") definir(nom, actuel === Number(val) ? null : Number(val));
    else definir(nom, actuel === val ? "" : val);
    rerendre();
    return;
  }

  switch (bouton.dataset.action) {
    case "aveugle":
      etat.fiche.aveugle = !etat.fiche.aveugle;
      sauvegarder();
      rerendre();
      break;
    case "copier-nez": {
      const b = etat.fiche.bouche;
      b.aromes = [...new Set([...b.aromes, ...etat.fiche.nez.aromes])];
      sauvegarder();
      rerendre();
      break;
    }
    case "reprendre-reperes": {
      const r = etat.fiche.reperes, c = etat.fiche.conclusion;
      if (!c.temperature) c.temperature = r.temperature || "";
      if (!c.garde) c.garde = r.garde || "";
      if (!c.accords) c.accords = (r.accords || []).join("\n");
      sauvegarder();
      rerendre();
      break;
    }
    case "rediger":
      await rediger(bouton);
      break;
    case "apercu":
      ouvrirApercu();
      break;
  }
});

contenu.addEventListener("submit", (e) => {
  const form = e.target.closest(".ajout-arome");
  if (!form) return;
  e.preventDefault();
  const champ = $("input", form);
  const val = champ.value.trim();
  if (val) {
    const nom = form.dataset.champ;
    const val2 = val.charAt(0).toUpperCase() + val.slice(1);
    if (!lire(nom).includes(val2)) definir(nom, [...lire(nom), val2]);
    rerendre();
  }
});

async function rediger(bouton) {
  bouton.disabled = true;
  bouton.textContent = "Claude rédige…";
  try {
    const { redigerCommentaire } = await claude();
    const r = await redigerCommentaire(etat.fiche, etat.reglages);
    const c = etat.fiche.conclusion;
    if (c.commentaire.trim() && !confirm("Remplacer votre commentaire actuel par celui de Claude ?")) {
      etat.fiche.retourIA = { coherence: r.coherence, conseils: r.conseils };
    } else {
      c.commentaire = r.commentaire;
      etat.fiche.retourIA = { coherence: r.coherence, conseils: r.conseils };
    }
    sauvegarder();
    rerendre();
  } catch (e) {
    toast(e.message || "La rédaction a échoué.", "erreur");
    if (!etat.reglages.cle) ouvrirReglages();
    bouton.disabled = false;
    bouton.textContent = "✍️ Rédiger le commentaire avec Claude";
  }
}

// ---------- Aperçu, impression, export ----------

function valeurLisible(c, v, f) {
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return null;
  if (c.type === "scale") return c.options[v];
  if (c.type === "toggle") return v ? "Oui" : null;
  if (c.type === "number") return `${v} ${c.unite || ""}${c.libelle ? ` (${c.libelle(v)})` : ""}`;
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function lignesSection(s, f) {
  return s.champs.filter((c) => visible(c, f))
    .map((c) => [c, valeurLisible(c, f[s.id][c.id], f)])
    .filter(([, v]) => v);
}

function ouvrirApercu() {
  const f = etat.fiche;
  const i = f.identite;
  const titre = [i.domaine, i.nom].filter(Boolean).join(" — ") || "Fiche de dégustation";
  const vignette = f.photos?.etiquette || f.photos?.contre;
  const sections = SECTIONS.filter((s) => s.id !== "identite").map((s) => {
    const lignes = lignesSection(s, f).filter(([c]) => c.id !== "commentaire");
    if (!lignes.length) return "";
    return `<section><h3>${s.icone} ${s.titre}</h3><dl>${lignes.map(([c, v]) => `<dt>${esc(c.label)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></section>`;
  }).join("");
  const ident = lignesSection(SECTIONS[0], f).filter(([c]) => !["nom", "domaine"].includes(c.id));

  $("#apercu-contenu").innerHTML = `<article class="fiche-imprimable">
    <header class="entete-apercu">
      ${vignette ? `<img src="${vignette}" alt="">` : ""}
      <div>
        <h2>${esc(titre)}</h2>
        <p>${esc([i.appellation, i.millesime].filter(Boolean).join(" · "))}</p>
        ${f.conclusion.note != null ? `<p class="note-grande">${esc(f.conclusion.note)}<small>/20</small></p>` : ""}
      </div>
    </header>
    <section><h3>🏷️ Identité</h3><dl>${ident.map(([c, v]) => `<dt>${esc(c.label)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></section>
    ${sections}
    ${f.conclusion.commentaire ? `<section class="commentaire"><h3>Commentaire</h3>${f.conclusion.commentaire.split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join("")}</section>` : ""}
  </article>`;
  afficher("apercu");
}

function ficheEnTexte(f) {
  const i = f.identite;
  const out = [`# ${[i.domaine, i.nom].filter(Boolean).join(" — ") || "Fiche de dégustation"}`, ""];
  for (const s of SECTIONS) {
    const lignes = lignesSection(s, f).filter(([c]) => c.id !== "commentaire");
    if (!lignes.length) continue;
    out.push(`## ${s.titre}`);
    for (const [c, v] of lignes) out.push(`- **${c.label}** : ${v}`);
    out.push("");
  }
  if (f.conclusion.commentaire) out.push("## Commentaire", "", f.conclusion.commentaire, "");
  return out.join("\n");
}

function telecharger(nom, contenuFichier, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenuFichier], { type }));
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Réglages ----------

const dlgReglages = $("#dlg-reglages");

async function ouvrirReglages() {
  const { MODELES } = await claude().catch(() => ({ MODELES: [{ id: "claude-opus-5-5", nom: "Claude Opus 5.5" }] }));
  $("#reglage-modele").innerHTML = MODELES.map((m) => `<option value="${m.id}" ${m.id === etat.reglages.modele ? "selected" : ""}>${esc(m.nom)}</option>`).join("");
  $("#reglage-cle").value = etat.reglages.cle || "";
  dlgReglages.showModal();
}

$("#form-reglages").addEventListener("submit", (e) => {
  if (e.submitter?.value !== "ok") return;
  etat.reglages = { cle: $("#reglage-cle").value.trim(), modele: $("#reglage-modele").value };
  enregistrerReglages(etat.reglages);
  toast("Réglages enregistrés.");
});

$("#btn-exporter-tout").addEventListener("click", () => {
  telecharger(`cave-degustation-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(chargerFiches(), null, 2), "application/json");
});

$("#import-fichier").addEventListener("change", async (e) => {
  const fichier = e.target.files[0];
  if (!fichier) return;
  try {
    const donnees = JSON.parse(await fichier.text());
    const n = importerFiches(Array.isArray(donnees) ? donnees : [donnees]);
    toast(`${n} fiche(s) importée(s).`);
    dlgReglages.close();
    rendreCave();
  } catch {
    toast("Fichier invalide.", "erreur");
  }
  e.target.value = "";
});

// ---------- Boutons globaux ----------

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-global]");
  if (!b) return;
  switch (b.dataset.global) {
    case "nouvelle": nouvelleDegustation(); break;
    case "cave": rendreCave(); break;
    case "reglages": ouvrirReglages(); break;
    case "analyser": analyser(); break;
    case "manuel": saisieManuelle(); break;
    case "retirer-photo":
      delete etat.photos[b.closest(".zone-photo").dataset.photo];
      rendrePhotos();
      break;
    case "apercu": ouvrirApercu(); break;
    case "retour-fiche": ouvrirFiche(etat.fiche, etat.section); break;
    case "imprimer": window.print(); break;
    case "copier":
      navigator.clipboard.writeText(ficheEnTexte(etat.fiche)).then(() => toast("Fiche copiée."), () => toast("Copie impossible.", "erreur"));
      break;
    case "exporter": {
      const i = etat.fiche.identite;
      const nom = [i.domaine, i.nom, i.millesime].filter(Boolean).join("-").replace(/[^\p{L}\p{N}-]+/gu, "_") || "fiche";
      telecharger(`${nom}.md`, ficheEnTexte(etat.fiche), "text/markdown");
      break;
    }
    case "supprimer":
      if (confirm("Supprimer définitivement cette fiche ?")) {
        supprimerFiche(etat.fiche.id);
        rendreCave();
      }
      break;
  }
});

rendreCave();
