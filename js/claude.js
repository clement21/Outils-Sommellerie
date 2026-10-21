// Appels à l'API Claude, directement depuis le navigateur, avec la clé saisie par l'utilisateur.
import Anthropic from "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.132.1/+esm";

export const MODELES = [
  { id: "claude-opus-5-5", nom: "Claude Opus 5.5 (le plus précis)" },
  { id: "claude-sonnet-5-5", nom: "Claude Sonnet 5.5 (rapide)" },
  { id: "claude-haiku-5-5", nom: "Claude Haiku 5.5 (le plus économique)" },
];

// Haiku 5.5 n'a pas de modèle de repli côté serveur.
const AVEC_REPLI = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

function client(cle) {
  if (!cle) throw new ErreurClaude("Ajoutez votre clé API Anthropic dans les réglages (⚙️) pour activer la lecture d'étiquette.");
  return new Anthropic({ apiKey: cle, dangerouslyAllowBrowser: true, maxRetries: 2 });
}

export class ErreurClaude extends Error {}

const chaine = { type: "string" };
const liste = { type: "array", items: { type: "string" } };

const SCHEMA_ETIQUETTE = {
  type: "object",
  additionalProperties: false,
  required: ["identite", "confiance", "illisible", "reperes"],
  properties: {
    identite: {
      type: "object",
      additionalProperties: false,
      required: ["nom", "domaine", "appellation", "classement", "region", "pays", "millesime", "couleur", "effervescent",
        "cepages", "degre", "contenance", "mentions", "embouteilleur"],
      properties: {
        nom: chaine, domaine: chaine, appellation: chaine, classement: chaine, region: chaine, pays: chaine,
        millesime: chaine,
        couleur: { type: "string", enum: ["blanc", "rosé", "rouge", "orange", ""] },
        effervescent: { type: "boolean" },
        cepages: chaine, degre: chaine, contenance: chaine, mentions: chaine, embouteilleur: chaine,
      },
    },
    confiance: { type: "string", enum: ["faible", "moyenne", "élevée"] },
    illisible: chaine,
    reperes: {
      type: "object",
      additionalProperties: false,
      required: ["style", "robe", "nez", "bouche", "temperature", "aeration", "garde", "accords", "a_surveiller"],
      properties: {
        style: chaine, robe: chaine, nez: liste, bouche: chaine, temperature: chaine, aeration: chaine,
        garde: chaine, accords: liste, a_surveiller: chaine,
      },
    },
  },
};

const PROMPT_ETIQUETTE = `Tu es sommelier. Voici une ou plusieurs photos d'une bouteille de vin (étiquette, et parfois contre-étiquette).

1. Lis l'étiquette et remplis "identite". Recopie fidèlement ce qui est écrit. Pour un champ absent de l'étiquette, tu peux le déduire seulement s'il découle sans ambiguïté de ce qui est lu (ex. la région et le pays d'une appellation, la couleur évidente d'une appellation ou visible sur la bouteille, le cépage imposé par l'appellation comme Chardonnay pour Chablis). Sinon laisse une chaîne vide. N'invente jamais un domaine, une cuvée, un millésime ou un degré.
2. "confiance" : ta confiance globale dans la lecture. "illisible" : ce que tu n'as pas pu lire ou ce qui est incertain (chaîne vide si tout est clair).
3. "reperes" : à partir de ta connaissance de l'appellation, du producteur, du millésime et des cépages, décris le profil ATTENDU de ce vin pour guider la dégustation (en français, phrases courtes) :
   - style : le style du vin et ce qui le caractérise (terroir, vinification, élevage), 2-3 phrases ;
   - robe : la robe attendue à cet âge ;
   - nez : 4 à 8 arômes typiques attendus ;
   - bouche : la structure attendue (acidité, tanins, corps, longueur) ;
   - temperature : température de service conseillée ;
   - aeration : faut-il ouvrir à l'avance, carafer ou décanter ;
   - garde : où en est le vin dans sa vie et jusqu'à quand le boire, en tenant compte du millésime ;
   - accords : 3 à 5 accords mets-vins précis ;
   - a_surveiller : un conseil de dégustation pour ce vin (ce qu'il faut chercher, un piège fréquent).
   Ces repères sont des attentes, pas des constats : formule-les comme tels.`;

function imageBloc(dataUrl) {
  const [entete, data] = dataUrl.split(",");
  const media_type = entete.match(/data:(.*?);/)[1];
  return { type: "image", source: { type: "base64", media_type, data } };
}

async function appeler(reglages, params) {
  const c = client(reglages.cle);
  const modele = reglages.modele || "claude-opus-5-5";
  const requete = { model: modele, max_tokens: 16000, ...params };
  let reponse;
  try {
    if (AVEC_REPLI.has(modele)) {
      // Si les filtres de sécurité refusent la requête, l'API la relance sur un autre modèle.
      reponse = await c.beta.messages.create({ ...requete, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
    } else {
      reponse = await c.messages.create(requete);
    }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new ErreurClaude("Clé API refusée. Vérifiez-la dans les réglages (⚙️).");
    if (e instanceof Anthropic.PermissionDeniedError) throw new ErreurClaude("Cette clé API n'a pas accès à ce modèle.");
    if (e instanceof Anthropic.RateLimitError) throw new ErreurClaude("Trop de requêtes pour le moment. Réessayez dans une minute.");
    if (e instanceof Anthropic.BadRequestError) throw new ErreurClaude("Requête refusée par l'API : " + (e.message || ""));
    if (e instanceof Anthropic.APIConnectionError) throw new ErreurClaude("Impossible de joindre l'API Claude. Vérifiez votre connexion.");
    if (e instanceof Anthropic.APIError) throw new ErreurClaude("Erreur de l'API Claude : " + (e.message || e.status));
    throw e;
  }
  if (reponse.stop_reason === "refusal") throw new ErreurClaude("Claude a refusé de traiter cette demande.");
  if (reponse.stop_reason === "max_tokens") throw new ErreurClaude("La réponse a été tronquée. Réessayez.");
  const texte = reponse.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try {
    return JSON.parse(texte);
  } catch {
    throw new ErreurClaude("Réponse illisible reçue de Claude. Réessayez.");
  }
}

/** Lit l'étiquette (1 ou 2 photos) et renvoie l'identité du vin + les repères de dégustation attendus. */
export async function analyserEtiquette(photos, reglages) {
  const contenu = photos.map(imageBloc);
  contenu.push({ type: "text", text: PROMPT_ETIQUETTE });
  return appeler(reglages, {
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA_ETIQUETTE } },
    messages: [{ role: "user", content: contenu }],
  });
}

const SCHEMA_COMMENTAIRE = {
  type: "object",
  additionalProperties: false,
  required: ["commentaire", "coherence", "conseils"],
  properties: { commentaire: chaine, coherence: liste, conseils: liste },
};

/** Rédige un commentaire de dégustation à partir des observations, et fait un retour pédagogique. */
export async function redigerCommentaire(fiche, reglages) {
  const observations = {
    identite: fiche.identite, oeil: fiche.oeil, nez: fiche.nez, bouche: fiche.bouche,
    conclusion: { ...fiche.conclusion, commentaire: undefined },
    profil_attendu: fiche.reperes || null,
  };
  const prompt = `Tu es sommelier et formateur. Voici les observations d'un dégustateur qui se forme pour devenir expert, saisies dans sa fiche de dégustation (JSON) :

${JSON.stringify(observations, null, 2)}

Réponds en français :
- "commentaire" : un commentaire de dégustation rédigé, au style d'un sommelier professionnel, en 3 paragraphes (œil, nez, bouche) suivis d'une phrase de conclusion (potentiel, service, accord). Fonde-toi UNIQUEMENT sur ses observations : n'ajoute pas d'arômes ou de sensations qu'il n'a pas notés. S'il manque des éléments, n'en parle pas.
- "coherence" : 2 à 5 remarques sur la cohérence de ses observations entre elles (ex. une robe tuilée avec un nez « primaire », des larmes très grasses avec un alcool « léger ») et avec le profil attendu s'il est fourni. Sois précis et bienveillant. Liste vide si tout est cohérent.
- "conseils" : 2 à 4 conseils concrets pour progresser sur CE vin (ce qu'il pourrait rechercher encore, un exercice, un vocabulaire plus précis).`;
  return appeler(reglages, {
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA_COMMENTAIRE } },
    messages: [{ role: "user", content: prompt }],
  });
}
