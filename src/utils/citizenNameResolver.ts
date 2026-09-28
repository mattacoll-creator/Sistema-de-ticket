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
  const local = email.split('@')[0].trim().toLowerCase();
  if (
    local.startsWith('admin') || 
    local.startsWith('soporte') || 
    local.startsWith('test') || 
    local.startsWith('extranjeria') ||
    local.startsWith('info') || 
    local.startsWith('contacto') || 
    local.startsWith('sede') || 
    local.startsWith('sucursal') ||
    local.startsWith('noreply') ||
    local.startsWith('no-reply')
  ) {
    return '';
  }
  
  // Replace separators with spaces
  let cleaned = local.replace(/[\._\-\+]/g, ' ');
  // Remove numbers
  cleaned = cleaned.replace(/[0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return words.map(w => {
      if (w.length === 1) return w.toUpperCase() + '.';
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }
  
  if (words.length === 1) {
    const single = words[0];
    for (const fn of COMMON_FIRST_NAMES) {
      if (single.startsWith(fn) && single.length > fn.length) {
        const first = fn.charAt(0).toUpperCase() + fn.slice(1);
        const rest = single.slice(fn.length);
        const restCap = rest.length === 1 ? rest.toUpperCase() + '.' : rest.charAt(0).toUpperCase() + rest.slice(1);
        return `${first} ${restCap}`.trim();
      }
    }
    if (single.length >= 3) {
      return single.charAt(0).toUpperCase() + single.slice(1);
    }
  }
  return '';
}

/**
 * Central function to resolve the real citizen name from an appointment object,
 * prioritizing real human inputs, foreign records databases, structured name fields,
 * and email fallback before resorting to "Ciudadano (PASAPORTE)".
 */
export function resolveCitizenName(app: any, fallbackRecords: any[] = []): string {
  if (!app) return 'Ciudadano';

  const dp = app.datosPersonales || app.datos_personales || app.data?.datosPersonales || app.data?.datos_personales;
  
  // 1. Structured names inside datosPersonales (primerNombre, segundoNombre, primerApellido, segundoApellido)
  if (dp) {
    const parts = [
      dp.primerNombre || dp.primer_nombre || '',
      dp.segundoNombre || dp.segundo_nombre || '',
      dp.primerApellido || dp.primer_apellido || '',
      dp.segundoApellido || dp.segundo_apellido || ''
    ].map((s: any) => String(s || '').trim()).filter(Boolean);
    
    if (parts.length > 0) {
      const joined = parts.join(' ');
      if (!isGenericPlaceholderName(joined)) {
        return joined;
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

    if (dp.solicitante && !isGenericPlaceholderName(dp.solicitante)) {
      return dp.solicitante.trim();
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
    const joined = topParts.join(' ');
    if (!isGenericPlaceholderName(joined)) {
      return joined;
    }
  }

  // 3. Direct appointment-level names (if not a generic placeholder)
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
  if (app.solicitante && !isGenericPlaceholderName(app.solicitante)) {
    return app.solicitante.trim();
  }
  if (app.titular && !isGenericPlaceholderName(app.titular)) {
    return app.titular.trim();
  }

  // 4. Match from foreign / extranjeria records database by passport or ID
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

  // 5. Extract real name from contact email - examine ALL candidates across dp and app
  const emailCandidates = [
    dp?.correo,
    app?.correo,
    app?.email,
    dp?.email,
    app?.contactEmail,
    dp?.contactEmail,
    app?.contacto,
    dp?.contacto,
    app?.telefono,
    dp?.telefono,
    app?.creadoPor,
    dp?.creadoPor
  ];
  for (const cand of emailCandidates) {
    if (cand && typeof cand === 'string' && cand.includes('@')) {
      const fromEmail = extractNameFromEmail(cand);
      if (fromEmail && !isGenericPlaceholderName(fromEmail)) {
        return fromEmail;
      }
    }
  }

  // Also check any other string property in app or dp in case an email is present
  for (const container of [app, dp]) {
    if (container && typeof container === 'object') {
      for (const k of Object.keys(container)) {
        const val = container[k];
        if (typeof val === 'string' && val.includes('@')) {
          const fromEmail = extractNameFromEmail(val);
          if (fromEmail && !isGenericPlaceholderName(fromEmail)) {
            return fromEmail;
          }
        }
      }
    }
  }

  // 6. Clean passport or nationality fallback as last resort
  if (passport && passport !== 'N/D' && !passport.startsWith('TE-') && !passport.startsWith('EXT-')) {
    return `Ciudadano (${passport})`;
  }
  if (dp?.nacionalidad && dp.nacionalidad !== 'No especificada' && dp.nacionalidad !== 'Extranjera') {
    return `Ciudadano de ${dp.nacionalidad}`;
  }

  return 'Ciudadano Extranjero';
}
