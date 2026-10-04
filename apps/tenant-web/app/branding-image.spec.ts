import { describe, expect, it } from "vitest";
import { brandingImageIssue, fitBrandingImage } from "./branding-image";
import { translateTenantText } from "./language-switcher";

describe("tenant branding image preparation", () => {
  it("keeps uploaded previews within the logo and favicon dimensions", () => {
    expect(fitBrandingImage(2400, 1200, "logo")).toEqual({ width: 512, height: 256 });
    expect(fitBrandingImage(1000, 2000, "favicon")).toEqual({ width: 64, height: 128 });
    expect(fitBrandingImage(180, 80, "logo")).toEqual({ width: 180, height: 80 });
  });

  it("accepts supported image formats and rejects unsupported or oversized files", () => {
    expect(brandingImageIssue("image/png", 1024)).toBeNull();
    expect(brandingImageIssue("image/svg+xml", 1024)).toBeNull();
    expect(brandingImageIssue("application/pdf", 1024)).toBe("type");
    expect(brandingImageIssue("image/png", 6 * 1024 * 1024)).toBe("size");
  });
});

describe("tenant text translations", () => {
  it("translates settings, branding, and common actions in both languages", () => {
    expect(translateTenantText("Business settings", "ht")).toBe("Paramèt biznis");
    expect(translateTenantText("Business settings", "fr")).toBe("Paramètres de l’entreprise");
    expect(translateTenantText("Create merchant account", "ht")).toBe("Kreye kont machann");
    expect(translateTenantText("Create merchant account", "fr")).toBe("Créer un compte vendeur");
    expect(translateTenantText("Date format", "ht")).toBe("Fòma dat");
    expect(translateTenantText("Date format", "fr")).toBe("Format de date");
  });

  it("translates French navigation labels and Haitian helper text", () => {
    expect(translateTenantText("Résultats publiés", "ht")).toBe("Rezilta pibliye");
    expect(translateTenantText("Horaires des tirages", "ht")).toBe("Orè tiraj yo");
    expect(translateTenantText("Ajiste lè ouvèti, fèmti ak rezilta pou chak orè.", "fr")).toBe(
      "Réglez les heures d’ouverture, de clôture et de résultat pour chaque horaire.",
    );
  });
});
