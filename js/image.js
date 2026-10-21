// Redimensionnement des photos dans le navigateur avant envoi ou stockage.

function chargerImage(fichier) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
    img.src = url;
  });
}

function reduire(img, cote, qualite) {
  const echelle = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * echelle);
  canvas.height = Math.round(img.naturalHeight * echelle);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", qualite);
}

/**
 * Renvoie deux versions de la photo :
 * - `analyse` : 1568 px de côté max., la taille idéale pour la lecture par Claude ;
 * - `vignette` : petite version conservée dans la fiche.
 */
export async function preparerPhoto(fichier) {
  const img = await chargerImage(fichier);
  return { analyse: reduire(img, 1568, 0.88), vignette: reduire(img, 480, 0.75) };
}
