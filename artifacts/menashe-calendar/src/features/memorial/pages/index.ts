// ── Memorial Pages barrel ─────────────────────────────────────────────────────
// Pages are defined in SPR-015 (UI implementation sprint).
// Routes are registered in App.tsx as part of that sprint.
//
// Planned page components and their routes:
//
//   MemorialSearchPage    /app/memorial
//     Search across all published memorials. Filters: name, tribe, country.
//
//   CreateMemorialPage    /app/memorial/create
//     Multi-step wizard: person details → family → privacy settings → review.
//     Requires authentication. Redirects to profile on success.
//
//   MemorialProfilePage   /app/memorial/:slug
//     Full memorial profile. Panels: candles, tributes, gallery, family info.
//     Visible to guests if privacy.visibilityLevel === "public".
//
//   EditMemorialPage      /app/memorial/:slug/edit
//     Edit person details and privacy settings.
//     Requires family_admin role or higher.
//
//   FamilyManagementPage  /app/memorial/:slug/family
//     View and manage family members: invite, change role, remove.
//     Requires family_admin role or higher.
//
//   MemorialGalleryPage   /app/memorial/:slug/gallery
//     Full-screen photo gallery with upload and caption editing.
//     Upload requires family_member; viewing respects privacy.canViewPhotos.
