import type { Language } from "./i18n";

type ApiErrorEnvelope = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

export function normalizeMerchantCreateForm(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const clean = (value: unknown) =>
    typeof value === "string" ? value.trim() : value;
  const email = clean(values.email);
  const phone = clean(values.phone);

  return {
    ...values,
    displayName: clean(values.displayName),
    merchantNumber: clean(values.merchantNumber),
    username: clean(values.username),
    email: email || undefined,
    phone: phone || undefined,
  };
}

export function formatTenantApiError(
  body: unknown,
  status: number,
  language: Language,
): string {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const nested = root.error && typeof root.error === "object"
    ? (root.error as ApiErrorEnvelope)
    : (root as ApiErrorEnvelope);
  const code = String(nested.code ?? root.code ?? "").toUpperCase();
  const details = Array.isArray(nested.details)
    ? nested.details.filter((item): item is string => typeof item === "string").join(" ")
    : "";
  const serverMessage = typeof nested.message === "string" ? nested.message : "";
  const validationText = `${details} ${serverMessage}`.toLowerCase();
  const french = language === "fr";

  if (code === "VALIDATION_ERROR") {
    if (/email|e-mail/.test(validationText))
      return french
        ? "L’adresse e-mail est invalide. Corrigez-la ou laissez ce champ vide."
        : "Imèl la pa valab. Korije l oswa kite chan sa a vid."
    if (/temporary.?password|password|mot de passe/.test(validationText))
      return french
        ? "Le mot de passe temporaire doit contenir au moins 12 caractères."
        : "Modpas tanporè a dwe gen omwen 12 karaktè."
    if (/branch|succursale|biwo/.test(validationText))
      return french
        ? "Sélectionnez une succursale active pour ce vendeur."
        : "Chwazi yon biwo ki aktif pou machann sa a."
    if (/merchant.?number|username|display.?name/.test(validationText))
      return french
        ? "Vérifiez le nom du vendeur, son numéro et son identifiant."
        : "Verifye non machann nan, nimewo li ak non itilizatè li."
    return french
      ? "Certaines informations sont manquantes ou invalides. Vérifiez le formulaire puis réessayez."
      : "Gen enfòmasyon ki manke oswa ki pa valab. Verifye fòm nan epi eseye ankò."
  }

  const messages: Record<string, { ht: string; fr: string }> = {
    NUMBER_BLOCKED: { ht: "Boul sa a bloke. Li entèdi pou jwe li.", fr: "Ce numéro est bloqué. Il est interdit de le jouer." },
    MERCHANT_ACCOUNT_CANNOT_LOGIN_TENANT_APP: { ht: "Kont machann sa a dwe itilize aplikasyon Machann nan.", fr: "Ce compte vendeur doit utiliser l’application Marchand." },
    TENANT_ACCOUNT_CANNOT_LOGIN_MERCHANT_APP: { ht: "Kont tenant sa a dwe itilize aplikasyon Tenant lan.", fr: "Ce compte administrateur doit utiliser l’application Tenant." },
    MERCHANT_ACCOUNT_INACTIVE: { ht: "Kont machann sa a pa aktif. Kontakte administratè Tenant lan.", fr: "Ce compte vendeur est inactif. Contactez l’administrateur Tenant." },
    INVALID_BRANCH: {
      ht: "Biwo ou chwazi a pa valab oswa li pa aktif. Chwazi yon biwo aktif epi eseye ankò.",
      fr: "La succursale choisie est invalide ou inactive. Sélectionnez une succursale active puis réessayez.",
    },
    LIMIT_REACHED: {
      ht: "Plan biznis la rive nan limit kont machann li. Kontakte administratè a pou ogmante limit la.",
      fr: "Le forfait de l’entreprise a atteint sa limite de vendeurs. Contactez l’administrateur pour l’augmenter.",
    },
    FEATURE_NOT_AVAILABLE: {
      ht: "Plan biznis la pa pèmèt ajoute plis kont machann. Kontakte administratè a.",
      fr: "Le forfait de l’entreprise ne permet pas d’ajouter d’autres vendeurs. Contactez l’administrateur.",
    },
    TENANT_ACCESS_REQUIRED: {
      ht: "Konekte nan espas biznis la ankò pou kreye kont machann nan.",
      fr: "Reconnectez-vous à l’espace professionnel pour créer le compte vendeur.",
    },
    PERMISSION_DENIED: {
      ht: "Ou pa gen pèmisyon pou kreye kont machann. Mande administratè biznis la ba ou aksè.",
      fr: "Vous n’avez pas l’autorisation de créer un compte vendeur. Demandez l’accès à l’administrateur.",
    },
    FORBIDDEN: {
      ht: "Ou pa gen pèmisyon pou kreye kont machann. Mande administratè biznis la ba ou aksè.",
      fr: "Vous n’avez pas l’autorisation de créer un compte vendeur. Demandez l’accès à l’administrateur.",
    },
    SUBSCRIPTION_EXPIRED: {
      ht: "Abònman espas biznis la fini. Kontakte administratè a pou renouvle l.",
      fr: "L’abonnement de l’entreprise a expiré. Contactez l’administrateur pour le renouveler.",
    },
    RESOURCE_NOT_FOUND: {
      ht: "Enfòmasyon yo pa disponib ankò. Rechaje paj la epi eseye ankò.",
      fr: "Ces informations ne sont plus disponibles. Actualisez la page puis réessayez.",
    },
    USERNAME_ALREADY_EXISTS: {
      ht: "Non itilizatè sa a deja egziste nan biznis sa a. Chwazi yon lòt non itilizatè.",
      fr: "Ce nom d’utilisateur existe déjà dans cette entreprise. Choisissez-en un autre.",
    },
    MERCHANT_NUMBER_ALREADY_EXISTS: {
      ht: "Nimewo machann sa a deja egziste. Chwazi yon lòt nimewo.",
      fr: "Ce numéro de vendeur existe déjà. Choisissez-en un autre.",
    },
    EMAIL_ALREADY_EXISTS: {
      ht: "Adrès imèl sa a deja sèvi. Mete yon lòt imèl oswa kite chan an vid.",
      fr: "Cette adresse e-mail est déjà utilisée. Saisissez une autre adresse ou laissez le champ vide.",
    },
    UNIQUE_CONSTRAINT_CONFLICT: {
      ht: "Youn nan enfòmasyon sa yo deja egziste. Verifye non itilizatè a, imèl la ak nimewo machann nan.",
      fr: "Une de ces informations existe déjà. Vérifiez le nom d’utilisateur, l’adresse e-mail et le numéro du vendeur.",
    },
    INVALID_COMMISSION_PERCENTAGE: {
      ht: "Pousantaj komisyon an dwe yon chif ant 0 ak 100.",
      fr: "Le taux de commission doit être un nombre entre 0 et 100.",
    },
    TENANT_COUNTRY_LOCKED_AFTER_FIRST_TICKET: {
      ht: "Peyi ak lajan biznis la pa ka chanje apre premye tikè a, pou rapò ak tranzaksyon ki deja fèt yo rete egzak.",
      fr: "Le pays et la devise de l’entreprise sont verrouillés après le premier ticket afin de préserver les transactions et rapports existants.",
    },
    UNSUPPORTED_COUNTRY: {
      ht: "Peyi sa a poko disponib. Chwazi youn nan peyi ki nan lis la.",
      fr: "Ce pays n’est pas encore pris en charge. Choisissez un pays dans la liste.",
    },
    INVALID_REPORT_FILTER: {
      ht: "Machann oswa biwo ou chwazi pou rapò a pa disponib. Rechaje lis yo epi eseye ankò.",
      fr: "Le vendeur ou le bureau choisi pour le rapport n’est pas disponible. Actualisez les listes puis réessayez.",
    },
    REPORT_MERCHANT_OFFICE_MISMATCH: {
      ht: "Machann ou chwazi yo pa nan biwo oswa santral ki chwazi a.",
      fr: "Les vendeurs sélectionnés ne sont pas rattachés au bureau ou à la centrale sélectionné.",
    },
    INVALID_BOLET_PAYOUTS: {
      ht: "Mete twa miltiplikatè ki pi gran pase zewo pou 1ye, 2yèm ak 3yèm rezilta yo.",
      fr: "Saisissez trois multiplicateurs supérieurs à zéro pour les 1er, 2e et 3e résultats.",
    },
    BOLET_NOT_ENABLED_FOR_GAME: {
      ht: "Jwèt sa a pa gen kalite pari Bolet ki aktif.",
      fr: "Le jeu ne dispose pas d’un pari Bolet actif.",
    },
    INVALID_SCHEDULE_TIMES: {
      ht: "Lè ouvèti a dwe anvan lè fèmti a, epi rezilta a dwe fèt apre fèmti a.",
      fr: "L’ouverture doit précéder la fermeture, et le résultat doit suivre la fermeture.",
    },
  };

  const knownMessage = messages[code];
  if (knownMessage) return knownMessage[french ? "fr" : "ht"];
  if (status === 400)
    return french
      ? "Certaines informations sont manquantes ou invalides. Vérifiez le formulaire puis réessayez."
      : "Gen enfòmasyon ki manke oswa ki pa valab. Verifye fòm nan epi eseye ankò.";
  if (status === 401)
    return french
      ? "Votre session a expiré. Reconnectez-vous puis réessayez."
      : "Sesyon an fini. Konekte ankò epi eseye ankò."
  if (status === 403)
    return french
      ? "Vous n’avez pas l’autorisation de créer ce compte. Contactez l’administrateur de l’entreprise."
      : "Ou pa gen dwa kreye kont sa a. Kontakte administratè biznis la."
  if (status === 404)
    return french
      ? "La page ou les informations demandées sont introuvables. Actualisez puis réessayez."
      : "Nou pa jwenn paj la oswa enfòmasyon yo. Rechaje paj la epi eseye ankò."
  if (status === 409)
    return french
      ? "Ce nom d’utilisateur, cette adresse e-mail ou ce numéro est déjà utilisé. Choisissez-en un autre."
      : "Non itilizatè, imèl oswa nimewo sa a deja sèvi. Chwazi yon lòt."
  if (status >= 500)
    return french
      ? "Le serveur n’a pas pu créer le compte pour le moment. Réessayez dans quelques instants."
      : "Sèvè a pa rive kreye kont lan kounye a. Tann yon ti moman epi eseye ankò."
  return french
    ? "La demande n’a pas abouti. Vérifiez les informations puis réessayez."
    : "Demann nan pa reyisi. Verifye enfòmasyon yo epi eseye ankò.";
}
