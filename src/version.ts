// Versión y marca de compilación de la aplicación
// Cada vez que se sube una nueva actualización o despliegue, esta marca de versión cambia.
export const APP_BUILD_VERSION = (import.meta as any).env?.VITE_APP_VERSION || "V5.15 test";
export const STORAGE_VERSION_KEY = "te_app_build_version_installed";
