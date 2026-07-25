// src/lib/config/features.ts
//
// UI scoping for the skatepark use case (see thesis: hide, don't delete).
// The underlying framework subsystems (walls, floors, stairs, house
// templates, …) remain fully functional in the codebase; this flag only
// removes their entry points from the UI. Setting it to true restores
// the original floor-plan-editor interface.
export const SHOW_HOUSE_FEATURES = false;