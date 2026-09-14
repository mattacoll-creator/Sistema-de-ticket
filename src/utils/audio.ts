/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Utilidades para efectos de audio y síntesis de voz en español

let activeAudioCtx: AudioContext | null = null;
let currentCallSessionToken = 0;

/**
 * Detiene inmediatamente cualquier audio, timbre o locución de voz en curso y limpia la cola.
 */
export function stopAllAudio(): void {
  currentCallSessionToken++;
  if (typeof window !== "undefined") {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }
  if (activeAudioCtx) {
    try {
      activeAudioCtx.close().catch(() => {});
    } catch (e) {}
    activeAudioCtx = null;
  }
}

/**
 * Produce un timbre de alerta agradable y ágil usando la Web Audio API,
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
      activeAudioCtx = ctx;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Efecto envolvente: decaimiento suave y nítido
        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Tocar notas ágiles (arpegio de llamada moderna de 3 notas)
      playTone(554.37, now, 0.35);       // C#5
      playTone(659.25, now + 0.08, 0.35); // E5
      playTone(880.00, now + 0.16, 0.40);  // A5
      
      // Resuelve rápido para que la voz empiece de inmediato (280ms para alta agilidad)
      setTimeout(() => {
        try {
          ctx.close().catch(() => {});
        } catch (e) {}
        if (activeAudioCtx === ctx) activeAudioCtx = null;
        resolve();
      }, 280);
    } catch (e) {
      console.warn("No se pudo reproducir el timbre.", e);
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
        message = `Segundo llamado: ${trimmedName}, por favor diríjase ${targetPrep} ${cleanCubicleName}, turno ${parsedCode}.`;
      } else {
        message = `Segundo llamado: Turno ${parsedCode}, por favor diríjase ${targetPrep} ${cleanCubicleName}.`;
      }
    } else {
      if (trimmedName) {
        message = `Atención: ${trimmedName}, por favor diríjase ${targetPrep} ${cleanCubicleName}, turno ${parsedCode}.`;
      } else {
        message = `Atención: Turno ${parsedCode}, por favor diríjase ${targetPrep} ${cleanCubicleName}.`;
      }
    }
    
    const rateStr = localStorage.getItem("ticket_tts_rate");
    const pitchStr = localStorage.getItem("ticket_tts_pitch");

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "es-ES";

    // Modulación acústica diferenciada y ágil
    if (options.customRate) {
      utterance.rate = options.customRate;
    } else if (rateStr) {
      utterance.rate = parseFloat(rateStr);
    } else {
      utterance.rate = isTriada ? 1.12 : 1.16; // Agilizado y nítido para áreas concurridas
    }

    if (options.customPitch) {
      utterance.pitch = options.customPitch;
    } else if (pitchStr) {
      utterance.pitch = isTriada ? Math.max(0.75, parseFloat(pitchStr) - 0.22) : parseFloat(pitchStr);
    } else {
      utterance.pitch = isTriada ? 0.90 : 1.08;
    }

    // Selección de voz inteligente: Voz Femenina/Clara para Caja vs Voz Masculina/Distinta para Tríada
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const spanishVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith("es"));
      
      if (spanishVoices.length > 0) {
        let preferredVoice;

        if (isTriada) {
          // Tríada / Fotografía: Prioridad a voces masculinas o profundas
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

          if (!preferredVoice && spanishVoices.length > 1) {
            preferredVoice = spanishVoices[spanishVoices.length - 1];
          }
        } else {
          // Caja: Prioridad a voces femeninas e institucionales
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

    let isResolved = false;
    const finish = () => {
      if (!isResolved) {
        isResolved = true;
        resolve();
      }
    };

    utterance.onend = finish;
    utterance.onerror = (err) => {
      console.warn("SpeechSynthesisUtterance event/error:", err);
      finish();
    };

    window.speechSynthesis.speak(utterance);

    setTimeout(finish, 5000);
  });
}

/**
 * Dispara la vibración háptica en dispositivos móviles compatibles (Smartphones).
 * @param pattern Patrón de vibración en milisegundos [vibrar, pausa, vibrar...]
 */
export function triggerHapticVibration(pattern: number | number[] = [400, 150, 400]): boolean {
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

// Cola secuencial de audios para evitar colisiones cuando múltiples agentes llaman al mismo tiempo
let audioCallQueue: Promise<void> = Promise.resolve();

/**
 * Llama al timbre y luego hace la lectura de voz del turno consecutivamente y de forma ágil.
 */
export function announceAndCall(
  ticketCode: string, 
  name: string, 
  cubicleName: string, 
  repeatCalls: number = 2,
  options?: SpeakCallOptions
): Promise<void> {
  const sessionToken = ++currentCallSessionToken;

  // Encadenar en la cola secuencial
  audioCallQueue = audioCallQueue.then(async () => {
    try {
      if (sessionToken !== currentCallSessionToken) return;

      const firstCallOptions: SpeakCallOptions = {
        ...(options || {}),
        isSecondCall: false
      };

      const secondCallOptions: SpeakCallOptions = {
        ...(options || {}),
        isSecondCall: true
      };

      // 1er LLAMADO
      triggerHapticVibration([300, 100, 300]);
      await playCallingChime();
      if (sessionToken !== currentCallSessionToken) return;

      await new Promise(r => setTimeout(r, 40));
      if (sessionToken !== currentCallSessionToken) return;

      await speakCall(ticketCode, name, cubicleName, firstCallOptions);
      if (sessionToken !== currentCallSessionToken) return;

      // Si se solicitó repetir (2 llamados)
      if (repeatCalls >= 2) {
        // Pausa breve de 250ms entre el 1er y 2do llamado para agilidad
        await new Promise(r => setTimeout(r, 250));
        if (sessionToken !== currentCallSessionToken) return;

        await playCallingChime();
        if (sessionToken !== currentCallSessionToken) return;

        await new Promise(r => setTimeout(r, 40));
        if (sessionToken !== currentCallSessionToken) return;

        await speakCall(ticketCode, name, cubicleName, secondCallOptions);
      }
    } catch (e) {
      console.warn("Error en secuencia de audio de turno:", e);
    }
  }).catch(err => {
    console.warn("Error en la cola de reproducción de audio:", err);
  });

  return audioCallQueue;
}

