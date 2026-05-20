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

/**
 * Utiliza la API de Síntesis de voz del navegador para anunciar un ticket por su nombre.
 */
export function speakCall(ticketCode: string, name: string, cubicleName: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      console.warn("La síntesis de voz no está soportada en este navegador.");
      resolve();
      return;
    }

    // Cancelar cualquier discurso pendiente
    window.speechSynthesis.cancel();

    // Crear el mensaje a pronunciar
    // e.g.: "Ticket A-01, Juan Pérez, pase al Cubículo 1"
    const parsedCode = ticketCode.split("").join(" "); // Pronuncia dígito por dígito para mayor claridad
    const message = `¿Atención, ticket? ${parsedCode}!... ${name}!... Por favor, pase al ${cubicleName}.`;
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "es-ES";
    utterance.rate = 0.95; // Un poco más lento para mejor comprensión
    utterance.pitch = 1.05; // Tono agradable

    // Buscar una voz en español
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Buscar voces que correspondan a español (es, es-ES, es-MX, es-CO, etc.)
      const spanishVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith("es"));
      
      if (spanishVoices.length > 0) {
        // Preferir una voz de Microsoft, Google o Apple que suene natural
        const preferredVoice = spanishVoices.find(voice => 
          voice.name.includes("Google") || 
          voice.name.includes("Natural") || 
          voice.name.includes("Sabina") || 
          voice.name.includes("Helena")
        );
        utterance.voice = preferredVoice || spanishVoices[0];
      }
    };

    // La lista de voces puede cargarse de manera asíncrona
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
      console.error("Error en SpeechSynthesisUtterance:", err);
      resolve();
    };

    window.speechSynthesis.speak(utterance);

    // Timeout de resguardo por si el navegador suspende la promesa indefinidamente
    setTimeout(() => {
      resolve();
    }, 5500);
  });
}

/**
 * Llama al timbre y luego hace la lectura de voz del turno consecutivamente.
 */
export async function announceAndCall(ticketCode: string, name: string, cubicleName: string) {
  await playCallingChime();
  // Breve pausa para que el eco del timbre termine
  await new Promise(r => setTimeout(r, 450));
  await speakCall(ticketCode, name, cubicleName);
}
