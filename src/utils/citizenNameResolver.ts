/**
 * Utility to intelligently resolve, clean, and extract real human citizen names
 * avoiding generic placeholder fallbacks like 'Ciudadano (PASAPORTE)' or 'Ciudadano Extranjero'
 */

const COMMON_FIRST_NAMES = [
  'jovanna', 'jovana', 'manuel', 'carlos', 'maria', 'juan', 'jose', 'ana', 'pedro', 
  'luis', 'david', 'elena', 'andrea', 'marco', 'sofia', 'liam', 'camila', 'mateo', 
  'valeria', 'lucas', 'diego', 'daniela', 'antonio', 'miguel', 'francisco', 'javier',
  'fernando', 'jorge', 'alberto', 'ricardo', 'eduardo', 'alejandro', 'roberto', 'ramon',
  'gabriel', 'rafael', 'rosa', 'carmen', 'laura', 'patricia', 'marta', 'lucia', 'paula',
  'alexander', 'cesar', 'victor', 'adrian', 'hector', 'sergio', 'julio', 'gonzalo',
  'guillermo', 'claudia', 'monica', 'beatriz', 'vanessa', 'lorena', 'natalia', 'adriana',
  'fabian', 'gustavo', 'humberto', 'ignacio', 'joaquin', 'leonardo', 'marcelo', 'nelson',
  'oscar', 'pablo', 'raul', 'salvador', 'tomas', 'vicente', 'walter', 'xavier', 'yolanda'
];

/**
 * Returns true if a string is empty or a generic system placeholder
 */
export function isGenericPlaceholderName(name: string | null | undefined): boolean {
  if (!name || typeof name !== 'string') return true;
  const clean = name.trim().toUpperCase();
  if (!clean) return true;
  if (['N/D', 'N/A', 'SIN NOMBRE', 'CIUDADANO N/D', 'CIUDADANO SIN NOMBRE', 'NULL', 'UNDEFINED', 'NO APLICA'].includes(clean)) {
    return true;
  }
  if (clean === 'CIUDADANO' || clean === 'CIUDADANO EXTRANJERO' || clean === 'CIUDADANO CITA' || clean.startsWith('CIUDADANO DE ')) {
    return true;
  }
  if (/^CIUDADANO\s*\(.*\)$/i.test(clean)) {
    return true;
  }
  if (/^CIUDADANO\s+EXTRANJERO\s*\(.*\)$/i.test(clean)) {
    return true;
  }
  if (/^CIUDADANO\s+\d+$/i.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Intelligently extracts a human-readable name from an email address
 * e.g. 'jovannaolivares@hotmail.com' -> 'Jovanna Olivares'
 * e.g. 'manuel.g1619@gmail.com' -> 'Manuel G.'
 * e.g. 'carlos_sanchez99@yahoo.es' -> 'Carlos Sanchez'
 */
export function extractNameFromEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '';
  
  const cleanEmail = email.trim().toLowerCase();
  const username = cleanEmail.split('@')[0];
  if (!username) return '';

  // Clean numbers, dots, dashes, underscores
  let cleaned = username.replace(/[0-9]+/g, '').replace(/[._\-]+/g, ' ').trim();
  if (!cleaned) return '';

  // Capitalize words
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  
  // Try to find if it starts with a common first name
  for (const name of COMMON_FIRST_NAMES) {
    if (cleaned.startsWith(name) && cleaned.length > name.length) {
      // e.g. "jovannaolivares" -> "jovanna olivares"
      const rest = cleaned.substring(name.length).trim();
      return `${capitalize(name)} ${capitalize(rest)}`;
    }
  }

  // Otherwise, just format the cleaned string
  return cleaned.split(' ').map(word => capitalize(word)).join(' ');
}

/**
 * Central function to resolve the real citizen name from an appointment object,
 * prioritizing real human inputs, foreign records databases, structured name fields,
 * and email fallback before resorting to "Ciudadano (PASAPORTE)".
 */
export function resolveCitizenName(app: any, fallbackRecords: any[] = []): string {
  if (!app) return 'Ciudadano';

  let dp = app.datosPersonales || app.datos_personales || app.data?.datosPersonales || app.data?.datos_personales;
  
  // Safely parse dp if it is a JSON string
  if (dp && typeof dp === 'string') {
    try {
      dp = JSON.parse(dp);
    } catch (e) {}
  }

  // 1. Strictly prioritize the real name from the form (datosPersonales): Primer Nombre y Primer Apellido
  if (dp) {
    const parts = [
      dp.primerNombre || dp.primer_nombre || '',
      dp.segundoNombre || dp.segundo_nombre || '',
      dp.primerApellido || dp.primer_apellido || '',
      dp.segundoApellido || dp.segundo_apellido || ''
    ].map((s: any) => String(s || '').trim()).filter(Boolean);
    
    if (parts.length > 0) {
      const partsCombined = parts.join(' ');
      if (!isGenericPlaceholderName(partsCombined)) {
        return partsCombined;
      }
    }

    if (dp.nombreCompleto && !isGenericPlaceholderName(dp.nombreCompleto)) {
      return dp.nombreCompleto.trim();
    }

    if (dp.nombre_completo && !isGenericPlaceholderName(dp.nombre_completo)) {
      return dp.nombre_completo.trim();
    }

    if (dp.nombre && !isGenericPlaceholderName(dp.nombre)) {
      return dp.nombre.trim();
    }

    if (dp.name && !isGenericPlaceholderName(dp.name)) {
      return dp.name.trim();
    }
  }

  // 2. Direct top-level structured parts if present
  const topParts = [
    app.primerNombre || app.primer_nombre || '',
    app.segundoNombre || app.segundo_nombre || '',
    app.primerApellido || app.primer_apellido || '',
    app.segundoApellido || app.segundo_apellido || ''
  ].map((s: any) => String(s || '').trim()).filter(Boolean);
  if (topParts.length > 0) {
    const topCombined = topParts.join(' ');
    if (!isGenericPlaceholderName(topCombined)) {
      return topCombined;
    }
  }

  // 3. Direct appointment-level names (strictly verified to NOT be a placeholder or 'Ciudadano')
  if (app.nombre && !isGenericPlaceholderName(app.nombre)) {
    return app.nombre.trim();
  }
  if (app.nombreCompleto && !isGenericPlaceholderName(app.nombreCompleto)) {
    return app.nombreCompleto.trim();
  }
  if (app.nombre_completo && !isGenericPlaceholderName(app.nombre_completo)) {
    return app.nombre_completo.trim();
  }
  if (app.ciudadano_nombre && !isGenericPlaceholderName(app.ciudadano_nombre)) {
    return app.ciudadano_nombre.trim();
  }

  // 4. Match from foreign records database by passport or ID
  const passport = String(dp?.pasaporte || app.pasaporte || app.identificacion || '').trim().toUpperCase();
  if (passport && Array.isArray(fallbackRecords) && fallbackRecords.length > 0) {
    const matched = fallbackRecords.find(r => 
      (r.pasaporte && r.pasaporte.trim().toUpperCase() === passport) || 
      (r.identificacion && r.identificacion.trim().toUpperCase() === passport)
    );
    if (matched && matched.nombre && !isGenericPlaceholderName(matched.nombre)) {
      return matched.nombre.trim();
    }
  }

  // 5. Fallback if no real name was found (NO email alias extraction)
  if (passport && passport !== 'N/D' && !passport.startsWith('TE-') && !passport.startsWith('EXT-')) {
    return `Ciudadano (${passport})`;
  }
  if (dp?.nacionalidad && dp.nacionalidad !== 'No especificada' && dp.nacionalidad !== 'Extranjera') {
    return `Ciudadano de ${dp.nacionalidad}`;
  }

  return 'Ciudadano';
}
