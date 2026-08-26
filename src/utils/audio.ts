/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Utilidades para efectos de audio y síntesis de voz en español

/**
 * Produce un timbre de alerta agradable usando la Web Audio API,
 * imitando los timbres de llamada de oficinas y bancos.
 */
export function playCallingChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        resolve();
        return;
      }

      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Notas de un acorde de timbre clásico (F5, A5, C6)
      const now = ctx.currentTime;
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Efecto envolvente: decaimiento suave
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Tocar notas con pequeños retardos (arpegio de llamada clásica)
      playTone(554.37, now, 1.2);       // C#5
      playTone(659.25, now + 0.15, 1.0); // E5
      playTone(880.00, now + 0.3, 1.5);  // A5
      
      setTimeout(() => {
        ctx.close();
        resolve();
      }, 1800);
    } catch (e) {
      console.warn("No se pudo reproducir el timbre. Interacción del usuario requerida o soporte de Audio API ausente.", e);
      resolve();
    }
  });
}

export interface SpeakCallOptions {
  isSecondCall?: boolean;
  isCaja?: boolean;
  isTriada?: boolean;
  phase?: string;
  customRate?: number;
  customPitch?: number;
}

/**
 * Utiliza la API de Síntesis de voz del navegador para anunciar un ticket por su nombre,
 * aplicando perfiles vocales diferenciados (Caja vs Tríada / Fotografía).
 */
export function speakCall(
  ticketCode: string, 
  name: string, 
  cubicleName: string, 
  isSecondCallOrOptions: boolean | SpeakCallOptions = false,
  phaseOrType?: string
): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      console.warn("La síntesis de voz no está soportada en este navegador.");
      resolve();
      return;
    }

    const options: SpeakCallOptions = typeof isSecondCallOrOptions === "boolean"
      ? { isSecondCall: isSecondCallOrOptions, phase: phaseOrType }
      : (isSecondCallOrOptions || {});

    const isSecondCall = !!options.isSecondCall;

    // Clean up cubicle name for a more natural voice announcement
    // e.g. "Módulo 1 (Tríada / Fotografía)" -> "Módulo 1"
    const cleanCubicleName = cubicleName.replace(/\s*\(.*?\)\s*/g, '').trim();
    const lowerCubicle = cleanCubicleName.toLowerCase();

    // Determinar si es llamado para Caja o para Tríada / Fotografía / Módulo
    const isCaja = options.isCaja !== undefined
      ? options.isCaja
      : (lowerCubicle.startsWith("caja") || options.phase?.toLowerCase() === "caja");

    const isTriada = options.isTriada !== undefined
      ? options.isTriada
      : (!isCaja && (
          lowerCubicle.includes("tríada") || 
          lowerCubicle.includes("triada") || 
          lowerCubicle.includes("fotograf") || 
          lowerCubicle.startsWith("módulo") || 
          lowerCubicle.startsWith("modulo") ||
          options.phase?.toLowerCase() === "triada"
        ));

    // Formatear código dígito a dígito para pronunciación nítida (ej: "C 0 0 1")
    const parsedCode = ticketCode.split("").join(" ");
    
    let targetPrep = "al";
    if (lowerCubicle.startsWith("caja") || lowerCubicle.startsWith("ventanilla") || lowerCubicle.startsWith("sala") || lowerCubicle.startsWith("recepcion") || lowerCubicle.startsWith("recepción")) {
      targetPrep = "a la";
    }

    const trimmedName = name && name.trim() !== "" ? name.trim() : "";
    
    let message = "";
    if (isSecondCall) {
      if (trimmedName) {
        message = `Segundo llamado: ${trimmedName}... Por favor, diríjase ${targetPrep} ${cleanCubicleName}... Ticket ${parsedCode}.`;
      } else {
        message = `Segundo llamado: Ticket ${parsedCode}... Por favor, diríjase ${targetPrep} ${cleanCubicleName}.`;
      }
    } else {
      if (trimmedName) {
        message = `Atención: ${trimmedName}... Por favor, diríjase ${targetPrep} ${cleanCubicleName}... Ticket ${parsedCode}.`;
      } else {
        message = `Atención: Ticket ${parsedCode}... Por favor, diríjase ${targetPrep} ${cleanCubicleName}.`;
      }
    }
    
    const rateStr = localStorage.getItem("ticket_tts_rate");
    const pitchStr = localStorage.getItem("ticket_tts_pitch");
    const voicePref = localStorage.getItem("ticket_tts_voice_pref");

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "es-ES";

    // Modulación acústica diferenciada (Tríada tiene un pitch más grave/profundo y cadencia ágil; Caja es más clara y aguda)
    if (options.customRate) {
      utterance.rate = options.customRate;
    } else if (rateStr) {
      utterance.rate = parseFloat(rateStr);
    } else {
      utterance.rate = isTriada ? 0.98 : 0.93;
    }

    if (options.customPitch) {
      utterance.pitch = options.customPitch;
    } else if (pitchStr) {
      utterance.pitch = isTriada ? Math.max(0.75, parseFloat(pitchStr) - 0.22) : parseFloat(pitchStr);
    } else {
      utterance.pitch = isTriada ? 0.85 : 1.10;
    }

    // Selección de voz inteligente: Voz Femenina/Clara para Caja vs Voz Masculina/Distinta para Tríada
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const spanishVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith("es"));
      
      if (spanishVoices.length > 0) {
        let preferredVoice;

        if (isTriada) {
          // Tríada / Fotografía: Prioridad a voces masculinas o profundas (Pablo, Jorge, Diego, Andres, Raul, David, etc.)
          preferredVoice = spanishVoices.find(voice => {
            const vName = voice.name.toLowerCase();
            return vName.includes("pablo") || 
                   vName.includes("jorge") || 
                   vName.includes("diego") || 
                   vName.includes("andres") || 
                   vName.includes("andrés") ||
                   vName.includes("raul") || 
                   vName.includes("raúl") || 
                   vName.includes("carlos") || 
                   vName.includes("juan") ||
                   vName.includes("male") ||
                   vName.includes("hombre");
          });

          // Si no hay voz masculina explícita, seleccionar una voz secundaria diferente a la de Caja
          if (!preferredVoice && spanishVoices.length > 1) {
            preferredVoice = spanishVoices[spanishVoices.length - 1];
          }
        } else {
          // Caja: Prioridad a voces femeninas e institucionales (Helena, Sabina, Laura, Monica, Paulina, Zira, etc.)
          preferredVoice = spanishVoices.find(voice => {
            const vName = voice.name.toLowerCase();
            return vName.includes("sabina") || 
                   vName.includes("helena") || 
                   vName.includes("laura") || 
                   vName.includes("monica") || 
                   vName.includes("mónica") || 
                   vName.includes("paulina") || 
                   vName.includes("lucia") || 
                   vName.includes("lucía") || 
                   vName.includes("conchita") || 
                   vName.includes("zira") ||
                   vName.includes("female") ||
                   vName.includes("mujer");
          });
        }
        
        // Fallback a voces naturales de Google/Microsoft si no hubo coincidencia específica
        if (!preferredVoice) {
          preferredVoice = spanishVoices.find(voice => 
            voice.name.includes("Google") || 
            voice.name.includes("Natural") ||
            voice.name.includes("Online")
          );
        }
        
        utterance.voice = preferredVoice || spanishVoices[0];
      }
    };

    setVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        setVoice();
      };
    }

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (err) => {
      console.warn("SpeechSynthesisUtterance event/error:", err);
      resolve();
    };

    window.speechSynthesis.speak(utterance);

    setTimeout(() => {
      resolve();
    }, 7000);
  });
}

/**
 * Dispara la vibración háptica en dispositivos móviles compatibles (Smartphones).
 * @param pattern Patrón de vibración en milisegundos [vibrar, pausa, vibrar...]
 */
export function triggerHapticVibration(pattern: number | number[] = [600, 250, 600, 250, 1000, 300, 800]): boolean {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      return navigator.vibrate(pattern);
    }
  } catch (e) {
    console.warn("Vibration API no permitida o no disponible:", e);
  }
  return false;
}

export function isVibrationSupported(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/**
 * Llama al timbre y luego hace la lectura de voz del turno consecutivamente.
 * Realiza 2 llamados completos (Primer llamado + Segundo llamado) tal como solicitado,
 * adaptando el timbre de voz según el área (Tríada/Fotografía vs Caja).
 */
export async function announceAndCall(
  ticketCode: string, 
  name: string, 
  cubicleName: string, 
  repeatCalls: number = 2,
  options?: SpeakCallOptions
) {
  // Cancelar cualquier lectura anterior para que el nuevo llamado tome prioridad inmediata
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  const firstCallOptions: SpeakCallOptions = {
    ...(options || {}),
    isSecondCall: false
  };

  const secondCallOptions: SpeakCallOptions = {
    ...(options || {}),
    isSecondCall: true
  };

  // 1er LLAMADO
  triggerHapticVibration([400, 200, 400]);
  await playCallingChime();
  await new Promise(r => setTimeout(r, 350));
  await speakCall(ticketCode, name, cubicleName, firstCallOptions);

  // Si se solicitó repetir (2 llamados)
  if (repeatCalls >= 2) {
    // Pausa breve entre el 1er y 2do llamado
    await new Promise(r => setTimeout(r, 1100));
    await playCallingChime();
    await new Promise(r => setTimeout(r, 350));
    await speakCall(ticketCode, name, cubicleName, secondCallOptions);
  }
}

