// Référentiel de dégustation : vocabulaire et structure de la fiche.
// Toute la fiche (formulaire, aperçu, export) est générée à partir de ces définitions.
//
// Types de champs :
//   single   : un seul choix parmi des pastilles
//   multi    : plusieurs choix parmi des pastilles
//   scale    : échelle graduée (curseur) avec un libellé par cran
//   number   : curseur numérique (ex. caudalies, note sur 20)
//   text     : saisie courte
//   textarea : saisie longue
//   aromas   : roue des arômes (familles + saisie libre)
//   toggle   : oui / non
//
// `when(fiche)` rend un champ visible seulement dans certains cas (ex. tanins pour les rouges).

const isRouge = (f) => f.identite.couleur === "rouge";
const isTannique = (f) => ["rouge", "orange"].includes(f.identite.couleur);
const isEffervescent = (f) => f.identite.effervescent === true;

export const COULEURS = ["blanc", "rosé", "rouge", "orange"];

export const TEINTES = {
  blanc: ["Incolore", "Jaune vert", "Jaune pâle", "Jaune citron", "Jaune paille", "Jaune doré", "Or", "Vieil or", "Ambré"],
  "rosé": ["Gris", "Pelure d'oignon", "Saumon", "Pêche", "Pétale de rose", "Corail", "Framboise", "Groseille", "Cerise"],
  rouge: ["Violacé", "Pourpre", "Cerise", "Rubis", "Grenat", "Tuilé", "Brique", "Acajou"],
  orange: ["Or orangé", "Ambre", "Orange", "Cuivré", "Topaze"],
};

// Les familles d'arômes, classées selon leur origine :
// primaire = le raisin (cépage, terroir) · secondaire = la fermentation · tertiaire = l'élevage et le vieillissement.
export const FAMILLES_AROMES = [
  { id: "agrumes", nom: "Agrumes", origine: "primaire", couleur: "#e8c547",
    aromes: ["Citron", "Citron vert", "Pamplemousse", "Orange", "Mandarine", "Bergamote", "Cédrat", "Zeste"] },
  { id: "fruits-blancs", nom: "Fruits blancs & jaunes", origine: "primaire", couleur: "#d9b56b",
    aromes: ["Pomme verte", "Pomme", "Poire", "Coing", "Pêche blanche", "Pêche jaune", "Abricot", "Mirabelle"] },
  { id: "exotiques", nom: "Fruits exotiques", origine: "primaire", couleur: "#f0a43a",
    aromes: ["Ananas", "Mangue", "Fruit de la passion", "Litchi", "Banane", "Melon", "Goyave"] },
  { id: "fruits-rouges", nom: "Fruits rouges", origine: "primaire", couleur: "#c8323c",
    aromes: ["Fraise", "Framboise", "Groseille", "Cerise", "Griotte", "Canneberge", "Grenade"] },
  { id: "fruits-noirs", nom: "Fruits noirs", origine: "primaire", couleur: "#5b1f3a",
    aromes: ["Cassis", "Mûre", "Myrtille", "Prune", "Cerise noire", "Baie de sureau"] },
  { id: "floral", nom: "Floral", origine: "primaire", couleur: "#d68fb8",
    aromes: ["Acacia", "Aubépine", "Chèvrefeuille", "Tilleul", "Fleur d'oranger", "Jasmin", "Rose", "Violette", "Pivoine", "Fleur de sureau", "Genêt", "Camomille"] },
  { id: "vegetal", nom: "Végétal & herbacé", origine: "primaire", couleur: "#6b9a4b",
    aromes: ["Herbe coupée", "Foin", "Buis", "Bourgeon de cassis", "Poivron vert", "Fougère", "Feuille de tomate", "Menthe", "Eucalyptus", "Thé vert"] },
  { id: "garrigue", nom: "Herbes & garrigue", origine: "primaire", couleur: "#8a9a5b",
    aromes: ["Thym", "Romarin", "Laurier", "Garrigue", "Fenouil", "Lavande"] },
  { id: "epices", nom: "Épices", origine: "primaire / tertiaire", couleur: "#a0522d",
    aromes: ["Poivre noir", "Poivre blanc", "Réglisse", "Cannelle", "Clou de girofle", "Muscade", "Anis", "Gingembre", "Safran"] },
  { id: "mineral", nom: "Minéral", origine: "primaire", couleur: "#8c96a0",
    aromes: ["Pierre à fusil", "Silex", "Craie", "Pierre mouillée", "Iode", "Sel", "Graphite", "Hydrocarbure (pétrole)"] },
  { id: "fermentaire", nom: "Lactique & fermentaire", origine: "secondaire", couleur: "#e6d3a3",
    aromes: ["Beurre frais", "Crème", "Yaourt", "Levure", "Mie de pain", "Brioche", "Pâte à pain", "Bonbon anglais"] },
  { id: "boise", nom: "Boisé", origine: "tertiaire (élevage)", couleur: "#9c6b3c",
    aromes: ["Chêne", "Bois neuf", "Vanille", "Noix de coco", "Cèdre", "Santal", "Boîte à cigare"] },
  { id: "torrefie", nom: "Torréfié & empyreumatique", origine: "tertiaire (élevage)", couleur: "#5a3b26",
    aromes: ["Pain grillé", "Fumé", "Café", "Moka", "Cacao", "Chocolat noir", "Caramel", "Goudron"] },
  { id: "fruits-secs", nom: "Fruits secs & confits", origine: "tertiaire", couleur: "#b07a3b",
    aromes: ["Amande", "Noisette", "Noix", "Figue sèche", "Pruneau", "Raisin sec", "Datte", "Abricot sec", "Fruits confits", "Écorce d'orange confite"] },
  { id: "evolution", nom: "Évolution", origine: "tertiaire", couleur: "#c9a227",
    aromes: ["Miel", "Cire d'abeille", "Tabac", "Thé noir", "Fruits à l'eau-de-vie", "Rancio", "Cuir"] },
  { id: "sous-bois", nom: "Sous-bois & terre", origine: "tertiaire", couleur: "#6d5a3f",
    aromes: ["Champignon", "Truffe", "Sous-bois", "Humus", "Feuille morte", "Terre humide"] },
  { id: "animal", nom: "Animal", origine: "tertiaire", couleur: "#7a4a3a",
    aromes: ["Fourrure", "Gibier", "Viande", "Musc", "Cuir neuf"] },
];

export const DEFAUTS = [
  "Bouchonné (TCA : carton mouillé, moisi)",
  "Réduit (œuf, chou, allumette)",
  "Oxydé (pomme blette, noix éventée)",
  "Brett (écurie, sueur de cheval)",
  "Acescence (vinaigre, colle)",
  "Géranium",
  "Poussière / moisi",
];

// Structure de la fiche : sections → champs.
export const SECTIONS = [
  {
    id: "identite",
    titre: "Identité",
    icone: "🏷️",
    intro: "Ce que dit l'étiquette. Vérifiez et corrigez ce que la lecture automatique a trouvé.",
    champs: [
      { id: "nom", label: "Nom du vin / cuvée", type: "text", placeholder: "Ex. Les Clos" },
      { id: "domaine", label: "Domaine / Château / Maison", type: "text" },
      { id: "appellation", label: "Appellation", type: "text", placeholder: "Ex. Chablis Grand Cru" },
      { id: "classement", label: "Classement / mention", type: "text", placeholder: "Ex. Grand Cru, 1er Cru Classé…" },
      { id: "region", label: "Région", type: "text" },
      { id: "pays", label: "Pays", type: "text" },
      { id: "millesime", label: "Millésime", type: "text", inputmode: "numeric", placeholder: "Ex. 2019" },
      { id: "couleur", label: "Couleur", type: "single", options: ["blanc", "rosé", "rouge", "orange"] },
      { id: "effervescent", label: "Vin effervescent", type: "toggle" },
      { id: "cepages", label: "Cépage(s)", type: "text", placeholder: "Ex. Chardonnay" },
      { id: "degre", label: "Degré d'alcool", type: "text", inputmode: "decimal", placeholder: "Ex. 13 % vol." },
      { id: "contenance", label: "Contenance", type: "text", placeholder: "Ex. 75 cl" },
      { id: "mentions", label: "Autres mentions", type: "text", placeholder: "Bio, vieilles vignes, élevé en fût…" },
      { id: "embouteilleur", label: "Mis en bouteille par", type: "text" },
      { id: "date", label: "Date de dégustation", type: "text", inputmode: "numeric" },
      { id: "lieu", label: "Lieu / occasion", type: "text" },
      { id: "prix", label: "Prix", type: "text" },
    ],
  },
  {
    id: "oeil",
    titre: "Œil",
    icone: "👁️",
    intro: "Inclinez le verre à 45° au-dessus d'un fond blanc, en pleine lumière. Observez d'abord le cœur du vin, puis le disque (le bord).",
    champs: [
      { id: "limpidite", label: "Limpidité", type: "single", options: ["Limpide", "Légèrement voilé", "Voilé", "Trouble"],
        aide: "La limpidité indique l'absence de particules en suspension. Un vin non filtré peut être légèrement voilé sans être défectueux." },
      { id: "brillance", label: "Brillance", type: "single", options: ["Terne", "Mat", "Brillant", "Lumineux", "Éclatant", "Cristallin"],
        aide: "La brillance traduit la façon dont le vin renvoie la lumière : elle est souvent liée à l'acidité (plus un vin est acide, plus il brille)." },
      { id: "intensite", label: "Intensité de la couleur", type: "scale", options: ["Pâle", "Claire", "Moyenne", "Soutenue", "Profonde"],
        aide: "Dépend du cépage (peau fine ou épaisse), de la maturité, de l'extraction et de l'âge." },
      { id: "teinte", label: "Teinte", type: "single", optionsFrom: (f) => TEINTES[f.identite.couleur] || TEINTES.rouge,
        aide: "Avec l'âge, les blancs se colorent (jaune → or → ambré) et les rouges s'éclaircissent (violacé → rubis → grenat → tuilé)." },
      { id: "reflets", label: "Reflets (au disque)", type: "multi", options: ["Verts", "Argentés", "Dorés", "Cuivrés", "Orangés", "Violets", "Bleutés", "Rubis", "Tuilés", "Bruns"],
        aide: "Des reflets violacés ou verts signalent la jeunesse ; tuilés, orangés ou bruns, l'évolution." },
      { id: "evolution", label: "Évolution apparente", type: "single", options: ["Jeune", "En développement", "À maturité", "Évolué"] },
      { id: "larmes", label: "Larmes / jambes", type: "scale", options: ["Absentes", "Fluides", "Moyennes", "Grasses", "Très grasses"],
        aide: "Les larmes qui coulent le long du verre sont liées à l'alcool (et au sucre pour les vins doux). Elles renseignent sur le gras, pas sur la qualité." },
      { id: "bulles", label: "Taille des bulles", type: "single", options: ["Très fines", "Fines", "Moyennes", "Grossières"], when: isEffervescent,
        aide: "Des bulles fines sont souvent le signe d'une prise de mousse lente et d'un long vieillissement sur lies." },
      { id: "mousse", label: "Mousse", type: "single", options: ["Fugace", "Légère", "Crémeuse", "Abondante"], when: isEffervescent },
      { id: "cordon", label: "Cordon", type: "single", options: ["Absent", "Discontinu", "Continu", "Persistant"], when: isEffervescent,
        aide: "Le cordon est l'anneau de bulles qui se forme à la surface, contre la paroi du verre." },
      { id: "particularites", label: "Particularités", type: "multi", options: ["Dépôt", "Cristaux de tartre", "Perlant (fines bulles)", "Disque épais"] },
      { id: "notes", label: "Observations", type: "textarea" },
    ],
  },
  {
    id: "nez",
    titre: "Nez",
    icone: "👃",
    intro: "Premier nez : sentez le verre immobile, sans l'agiter. Second nez : faites tourner le vin pour l'aérer, puis sentez à nouveau. Cherchez d'abord les familles, puis précisez.",
    champs: [
      { id: "etat", label: "État", type: "single", options: ["Net", "Douteux", "Défectueux"],
        aide: "Vérifiez d'abord que le vin est sain avant de chercher ses arômes." },
      { id: "defauts", label: "Défauts perçus", type: "multi", options: DEFAUTS, when: (f) => f.nez.etat && f.nez.etat !== "Net" },
      { id: "premier_nez", label: "Intensité au premier nez", type: "scale", options: ["Fermé", "Discret", "Moyen", "Aromatique", "Expressif"] },
      { id: "second_nez", label: "Intensité au second nez", type: "scale", options: ["Fermé", "Discret", "Moyen", "Aromatique", "Expressif"],
        aide: "Si le second nez est bien plus intense que le premier, le vin gagne à être aéré (carafe)." },
      { id: "aromes", label: "Arômes", type: "aromas" },
      { id: "complexite", label: "Complexité", type: "single", options: ["Simple", "Assez complexe", "Complexe", "Très complexe"],
        aide: "Un nez complexe mêle plusieurs familles et évolue dans le verre." },
      { id: "stade", label: "Stade aromatique", type: "single", options: ["Primaire (jeune)", "Secondaire", "Tertiaire (évolué)", "Mêlé"] },
      { id: "notes", label: "Observations", type: "textarea" },
    ],
  },
  {
    id: "bouche",
    titre: "Bouche",
    icone: "👄",
    intro: "Prenez une petite gorgée, faites-la circuler dans toute la bouche, aspirez un filet d'air pour libérer les arômes (rétro-olfaction). Analysez en trois temps : attaque, milieu, finale.",
    champs: [
      { id: "attaque", label: "Attaque", type: "single", options: ["Fuyante", "Souple", "Franche", "Ample", "Vive", "Puissante"],
        aide: "La première impression, durant les 2 à 3 premières secondes." },
      { id: "sucre", label: "Sucrosité", type: "scale", options: ["Sec", "Demi-sec", "Moelleux", "Doux", "Liquoreux"] },
      { id: "acidite", label: "Acidité", type: "scale", options: ["Plate", "Souple", "Fraîche", "Vive", "Nerveuse"],
        aide: "L'acidité fait saliver. C'est la colonne vertébrale du vin et un gage de bonne garde." },
      { id: "alcool", label: "Alcool", type: "scale", options: ["Léger", "Équilibré", "Généreux", "Chaleureux", "Capiteux"],
        aide: "Perçu comme une sensation de chaleur en fin de bouche et de douceur." },
      { id: "tanins_qte", label: "Tanins : quantité", type: "scale", options: ["Imperceptibles", "Légers", "Présents", "Marqués", "Puissants"], when: isTannique,
        aide: "Les tanins viennent des peaux, des pépins et du bois. Ils assèchent les gencives." },
      { id: "tanins_qualite", label: "Tanins : texture", type: "single", options: ["Soyeux", "Veloutés", "Fondus", "Fins", "Serrés", "Granuleux", "Rugueux", "Astringents", "Asséchants"], when: isTannique },
      { id: "effervescence", label: "Effervescence en bouche", type: "single", options: ["Agressive", "Vive", "Crémeuse", "Fondue"], when: isEffervescent },
      { id: "corps", label: "Corps", type: "scale", options: ["Léger", "Svelte", "Moyen", "Ample", "Charpenté"] },
      { id: "matiere", label: "Matière / texture", type: "multi", options: ["Fluide", "Tendue", "Ciselée", "Ronde", "Grasse", "Onctueuse", "Dense", "Crayeuse", "Saline"] },
      { id: "milieu", label: "Milieu de bouche", type: "single", options: ["Creux", "Court", "Construit", "Riche", "Dense"],
        aide: "Le cœur de la dégustation : la matière se développe-t-elle ou le vin se « creuse »-t-il ?" },
      { id: "aromes", label: "Arômes en bouche (rétro-olfaction)", type: "aromas" },
      { id: "finale", label: "Finale", type: "multi", options: ["Fraîche", "Saline", "Fruitée", "Épicée", "Boisée", "Chaleureuse", "Tannique", "Amertume noble", "Amertume dérangeante", "Sucrée"] },
      { id: "caudalies", label: "Longueur (caudalies)", type: "number", min: 0, max: 20, step: 1, unite: "caud.",
        libelle: (v) => v <= 3 ? "Courte" : v <= 6 ? "Moyenne" : v <= 9 ? "Longue" : "Très longue",
        aide: "Une caudalie = une seconde de persistance aromatique après avoir avalé ou recraché. Comptez les secondes pendant lesquelles les arômes (pas l'acidité ni l'alcool) persistent." },
      { id: "equilibre", label: "Équilibre", type: "single", options: ["Déséquilibré", "Équilibré", "Harmonieux"],
        aide: "Blanc : équilibre acidité / alcool (/ sucre). Rouge : acidité / alcool / tanins. Aucun élément ne doit dominer." },
      { id: "dominante", label: "Élément dominant", type: "multi", options: ["Acidité", "Alcool", "Sucre", "Tanins", "Bois", "Fruit", "Amertume"] },
      { id: "notes", label: "Observations", type: "textarea" },
    ],
  },
  {
    id: "conclusion",
    titre: "Conclusion",
    icone: "📝",
    intro: "Faites la synthèse : la qualité, le moment de le boire et avec quoi le servir.",
    champs: [
      { id: "qualite", label: "Qualité", type: "single", options: ["Défectueux", "Faible", "Correct", "Bon", "Très bon", "Exceptionnel"] },
      { id: "stade", label: "Stade de garde", type: "single", options: ["Trop jeune", "Buvable, mais à garder", "À son apogée", "À boire rapidement", "Sur le déclin"] },
      { id: "garde", label: "Potentiel de garde", type: "text", placeholder: "Ex. à boire jusqu'en 2032" },
      { id: "temperature", label: "Température de service", type: "text", placeholder: "Ex. 16-17 °C" },
      { id: "carafage", label: "Aération", type: "single", options: ["Inutile", "Ouvrir 1 h avant", "Carafer", "Décanter (dépôt)"] },
      { id: "verre", label: "Verre conseillé", type: "single", options: ["Flûte", "Tulipe", "Universel (INAO)", "Bordeaux", "Bourgogne (ballon)"] },
      { id: "accords", label: "Accords mets-vins", type: "textarea", placeholder: "Ex. volaille de Bresse à la crème, comté 24 mois…" },
      { id: "note", label: "Note", type: "number", min: 0, max: 20, step: 0.5, unite: "/ 20" },
      { id: "commentaire", label: "Commentaire de dégustation", type: "textarea", grand: true,
        placeholder: "Rédigez votre commentaire, ou utilisez « Rédiger avec Claude » à partir de vos observations." },
    ],
  },
];

export function ficheVide() {
  const f = { id: crypto.randomUUID(), cree: new Date().toISOString(), modifie: null, photos: {}, reperes: null, analyse: null };
  for (const s of SECTIONS) {
    f[s.id] = {};
    for (const c of s.champs) {
      if (c.type === "multi" || c.type === "aromas") f[s.id][c.id] = [];
      else if (c.type === "toggle") f[s.id][c.id] = false;
      else if (c.type === "scale" || c.type === "number") f[s.id][c.id] = null;
      else f[s.id][c.id] = "";
    }
  }
  f.identite.date = new Date().toLocaleDateString("fr-FR");
  return f;
}

export function familleDe(arome) {
  return FAMILLES_AROMES.find((fam) => fam.aromes.includes(arome));
}
