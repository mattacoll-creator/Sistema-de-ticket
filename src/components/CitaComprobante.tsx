import React, { useState } from 'react';
import { Cita } from '../types';
import { SERVICIOS_TRIBUNAL, SUCURSALES_TE } from '../data';
import { Calendar, Clock, MapPin, CheckCircle, Printer, Mail, Phone, User, FileClock, ShieldAlert, ArrowRight, Send, Loader2, AlertCircle, XCircle, Trash2 } from 'lucide-react';

interface CitaComprobanteProps {
  cita: Cita;
  onDone: () => void;
  onCancelCita?: (citaId: string) => void;
  onDeleteCita?: (citaId: string) => void;
}

const renderWithLinks = (text: string) => {
  // Regex to match markdown links like [text](url)
  const mdLinkRegex = /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)/g;
  
  // Parse markdown links
  const parts: Array<{ type: 'text' | 'link'; content?: string; text?: string; url?: string }> = [];
  let lastIndex = 0;
  let match;
  
  while ((match = mdLinkRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const plainText = text.substring(lastIndex, matchIndex);
    if (plainText) {
      parts.push({ type: 'text', content: plainText });
    }
    parts.push({
      type: 'link',
      text: match[1],
      url: match[2]
    });
    lastIndex = mdLinkRegex.lastIndex;
  }
  
  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    parts.push({ type: 'text', content: remainingText });
  }
  
  // If no markdown links were found, fallback to auto-linking standard URLs/emails
  if (parts.length === 1 && parts[0].type === 'text') {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const urlParts = text.split(urlRegex);
    return urlParts.map((part, index) => {
      if (part.match(/^https?:\/\//) || part.match(/^www\./)) {
        const href = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline font-bold hover:text-blue-900 break-all"
          >
            {part}
          </a>
        );
      } else if (part.match(/^[^\s]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
        return (
          <a
            key={index}
            href={`mailto:${part}`}
            className="text-blue-700 underline font-bold hover:text-blue-900 break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  }
  
  // Render text segments mixed with parsed markdown links
  return parts.map((part, index) => {
    if (part.type === 'link') {
      const href = part.url!.startsWith('http') ? part.url! : `https://${part.url!}`;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline font-bold hover:text-blue-900 break-all"
        >
          {part.text}
        </a>
      );
    } else {
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const subParts = part.content!.split(urlRegex);
      return subParts.map((subPart, subIdx) => {
        if (subPart.match(/^https?:\/\//) || subPart.match(/^www\./)) {
          const href = subPart.startsWith('http') ? subPart : `https://${subPart}`;
          return (
            <a
              key={`${index}-${subIdx}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline font-bold hover:text-blue-900 break-all"
            >
              {subPart}
            </a>
          );
        } else if (subPart.match(/^[^\s]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
          return (
            <a
              key={`${index}-${subIdx}`}
              href={`mailto:${subPart}`}
              className="text-blue-700 underline font-bold hover:text-blue-900 break-all"
            >
              {subPart}
            </a>
          );
        }
        return subPart;
      });
    }
  });
};

export default function CitaComprobante({ cita, onDone, onCancelCita, onDeleteCita }: CitaComprobanteProps) {
  const currentCategory = SERVICIOS_TRIBUNAL.find((c) => c.id === cita.servicioCategoria);
  const currentSubService = currentCategory?.subServicios.find((s) => s.id === cita.subServicioId);
  const currentSucursal = SUCURSALES_TE.find((s) => s.id === cita.sucursalId);

  // States to manage email sending
  const [emailInput, setEmailInput] = useState(cita.datosPersonales.correo || '');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSimulated, setIsSimulated] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // States to manage 24h reminder
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderIsSimulated, setReminderIsSimulated] = useState(false);
  const [simulatedConfirmUrl, setSimulatedConfirmUrl] = useState('');
  const [simulatedCancelUrl, setSimulatedCancelUrl] = useState('');
  const [simulatedHtmlPreview, setSimulatedHtmlPreview] = useState('');
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);

  // States for confirmation email simulation preview
  const [confHtmlPreview, setConfHtmlPreview] = useState('');
  const [showConfHtmlPreview, setShowConfHtmlPreview] = useState(false);

  // Poll server for status changes to support real-time interactive confirmation/cancellation email links
  React.useEffect(() => {
    let active = true;
    const checkStatus = () => {
      fetch('/api/sync-appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [cita.id] })
      })
      .then(res => res.json())
      .then(data => {
        if (active && data && data.success && Array.isArray(data.appointments) && data.appointments[0]) {
          const srvCita = data.appointments[0];
          if (srvCita.estado !== cita.estado) {
            // Update local storage so that when we reload or sync, it's correct
            try {
              const stored = localStorage.getItem('te_panama_citas');
              if (stored) {
                const parsed: Cita[] = JSON.parse(stored);
                const updatedList = parsed.map(c => c.id === cita.id ? { ...c, estado: srvCita.estado } : c);
                localStorage.setItem('te_panama_citas', JSON.stringify(updatedList));
                // Reload or soft update the application's inspected item state
                window.location.reload(); // Force simple refresh to keep layout in perfect state
              }
            } catch (e) {
              console.warn("Storage sync exception during poll:", e);
            }
          }
        }
      })
      .catch(err => console.debug("Poll error:", err));
    };

    // check immediately
    checkStatus();

    // poll every 4 seconds for immediate responsiveness
    const interval = setInterval(checkStatus, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [cita.id, cita.estado]);

  const handleSendReminder = async () => {
    setReminderStatus('sending');
    setReminderMessage('');

    try {
      const response = await fetch('/api/send-reminder-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: cita.id,
          email: emailInput,
          codigoTransaccion: cita.codigoTransaccion,
          categoriaNombre: currentCategory?.id || '',
          subServicioNombre: currentSubService?.nombre || '',
          fechaFormateada: formatDate(cita.fecha),
          fecha: cita.fecha,
          hora: cita.hora,
          sucursalNombre: currentSucursal?.nombre || '',
          sucursalDireccion: currentSucursal?.direccion || '',
          identificacion: cita.datosPersonales.identificacion,
          telefono: cita.datosPersonales.telefono,
          requisitos: currentSubService?.requisitos || [],
          numeroSeguimiento: cita.datosPersonales.numeroSeguimiento
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setReminderStatus('success');
        setReminderMessage(data.message);
        setReminderIsSimulated(!!data.simulated);
        setSimulatedConfirmUrl(data.confirmUrl || '');
        setSimulatedCancelUrl(data.cancelUrl || '');
        setSimulatedHtmlPreview(data.htmlPreview || '');
      } else {
        setReminderStatus('error');
        setReminderMessage(data.error || 'Ocurrió un error al despachar el recordatorio.');
        if (data.htmlPreview) {
          setSimulatedHtmlPreview(data.htmlPreview);
          setSimulatedConfirmUrl(data.confirmUrl || '');
          setSimulatedCancelUrl(data.cancelUrl || '');
        }
      }
    } catch (err) {
      setReminderStatus('error');
      setReminderMessage('No se pudo comunicar con el servidor.');
    }
  };

  // Format date display
  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const month = monthNames[parseInt(parts[1], 10) - 1];
    const day = parts[2];
    return `${day} de ${month} de ${year}`;
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setEmailStatus('error');
      setEmailMessage('Por favor, introduzca un correo electrónico válido.');
      return;
    }

    setEmailStatus('sending');
    setEmailMessage('');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailInput,
          codigoTransaccion: cita.codigoTransaccion,
          categoriaNombre: currentCategory?.nombre || '',
          subServicioNombre: currentSubService?.nombre || '',
          fechaFormateada: formatDate(cita.fecha),
          fecha: cita.fecha,
          id: cita.id,
          hora: cita.hora,
          sucursalNombre: currentSucursal?.nombre || '',
          sucursalDireccion: currentSucursal?.direccion || '',
          identificacion: cita.datosPersonales.identificacion,
          telefono: cita.datosPersonales.telefono,
          requisitos: currentSubService?.requisitos || [],
          numeroSeguimiento: cita.datosPersonales.numeroSeguimiento
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setEmailStatus('success');
        setEmailMessage(data.message);
        setIsSimulated(!!data.simulated);
        setConfHtmlPreview(data.htmlPreview || '');
      } else {
        setEmailStatus('error');
        setEmailMessage(data.error || 'Surgió un problema inesperado al enviar el comprobante.');
        if (data.htmlPreview) {
          setConfHtmlPreview(data.htmlPreview);
        }
      }
    } catch (err) {
      setEmailStatus('error');
      setEmailMessage('No se pudo establecer conexión con el servidor de correo.');
    }
  };

  const handlePrint = () => {
    // Try window.print but since inside iframe it may print the parent or trigger safety, 
    // we also provide simple alert/fallback. Let's make an aesthetic print container or provide download instructions.
    window.print();
  };

  const isCanceled = cita.estado === 'cancelada';

  return (
    <div className="space-y-6">
      
      {/* Visual Header Confirmation / Cancellation */}
      <div className="text-center py-4 space-y-2">
        {isCanceled ? (
          <>
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-red-100 text-red-600">
              <XCircle className="w-10 h-10 animate-pulse" />
            </div>
            <h3 className="text-lg md:text-xl font-extrabold text-red-900 tracking-tight select-none">
              Esta Cita ha sido Cancelada
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              El turno ha sido liberado para otros ciudadanos. Puede reprogramar un nuevo turno cuando lo requiera.
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-100 text-emerald-600 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-lg md:text-xl font-extrabold text-blue-900 tracking-tight">
              ¡Su Cita ha sido Agendada Exitosamente!
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              Su cita ha sido registrada formalmente en las bases del Tribunal Electoral. Presente este comprobante el día de su cita.
            </p>
          </>
        )}
      </div>

      {/* Ticket Layout style Card */}
      <div className={`relative bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden max-w-2xl mx-auto ${isCanceled ? 'opacity-85' : ''}`}>
        
        {/* Decorative Top header of ticket */}
        <div className={`bg-gradient-to-r border-b text-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${isCanceled ? 'from-red-900 to-red-950 border-red-950' : 'from-blue-950 to-blue-900 border-blue-900'}`}>
          <div className="flex items-center gap-3">
            {/* Logo Oficial */}
            <div className="p-1 px-2 shrink-0 flex items-center justify-center">
              <img
                src="/images/logo-te-aniversario.png"
                alt="Tribunal Electoral de Panamá"
                className="h-12 md:h-14 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center sm:text-left">
              <span className="text-xs md:text-sm text-amber-300 font-extrabold uppercase tracking-wider block">SISTEMA DE CITAS AGENDATE</span>
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1.5">
            <div className="text-center sm:text-right bg-white/10 rounded px-3 py-1 border border-white/10 select-all font-semibold">
              <span className="text-[9px] text-white/70 uppercase block tracking-wider font-extrabold">Código de Cita</span>
              <span className="font-mono text-xs font-black text-amber-400">{cita.codigoTransaccion}</span>
            </div>
            
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded shadow-sm border ${
              cita.estado === 'cancelada' || cita.estado === 'no_asistire'
                ? 'bg-red-650 text-white border-red-550' 
                : cita.estado === 'asistire'
                  ? 'bg-blue-650 text-white border-blue-550'
                  : 'bg-emerald-500 text-white border-emerald-400'
            }`}>
              {cita.estado === 'cancelada' 
                ? 'Cancelada' 
                : cita.estado === 'asistire' 
                  ? 'Asistencia Confirmada' 
                  : cita.estado === 'no_asistire' 
                    ? 'No Asistirá / Cancelada' 
                    : 'Confirmada'}
            </span>
          </div>
        </div>

        {/* Receipt Details Body */}
        <div className="p-5 md:p-6 space-y-4">

          {/* TV Turno Banner & Auto-Arrival indicator */}
          {cita.ticketTurnoCode && !isCanceled && (
            <div className="bg-gradient-to-r from-[#122e70] to-blue-900 text-white p-4 rounded-xl shadow-sm border border-blue-800 space-y-2 font-sans animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 bg-amber-500 text-slate-950 font-black rounded text-[10px] uppercase tracking-wider">
                    TV Turnos Cedulación
                  </span>
                  <span className="text-xs font-black uppercase text-amber-300">
                    Turno Emitido en Pantallas TV
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-300 uppercase font-bold">Turno Asignado:</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 bg-black/40 px-3 py-1 rounded border border-amber-400/30 flex items-center gap-2">
                    <span>{cita.ticketTurnoCode}</span>
                    <span className="text-xs font-sans text-amber-300 font-extrabold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/20">
                      • 📅 CITA PREVIA
                    </span>
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-100 font-medium leading-relaxed bg-white/10 p-2.5 rounded-lg border border-white/10">
                ⚡ <strong>Paso de confirmación de llegada omitido:</strong> Como su nombre y cédula ya fueron registrados en el sistema de citas, el sistema omitió automáticamente el paso de llegada. Su turno ha sido transmitido en directo a las pantallas TV de la sede como <strong>📅 CITA PREVIA</strong>.
              </div>
            </div>
          )}
          
          {/* Main info column */}
          <div className="space-y-4">
            
            {/* Service & Sub-service info */}
            <div>
              <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Trámite</span>
              <h5 className="text-xs font-extrabold text-slate-800 uppercase mt-0.5">{currentCategory?.nombre}</h5>
              <p className="text-xs text-blue-900 font-extrabold mt-0.5">{currentSubService?.nombre}</p>
            </div>

            {/* DateTime, Sede info in horizontal grid */}
            <div className="grid grid-cols-2 gap-3 border-t border-b border-dashed border-slate-200 py-3.5">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Fecha Asignada</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {formatDate(cita.fecha)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Hora Pactada</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {cita.hora}
                </span>
              </div>
            </div>

            {/* Branch location block */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Sede del Tribunal</span>
              <h6 className="text-xs font-extrabold text-blue-900">{currentSucursal?.nombre}</h6>
              <p className="text-[11px] text-slate-600 flex items-start gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{currentSucursal?.direccion}</span>
              </p>
            </div>

            {/* Applicant details */}
            {cita.servicioCategoria === 'extranjeria' ? (
              <div className="bg-amber-50/20 border border-amber-200/60 rounded p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] text-slate-700 col-span-1 sm:col-span-2">
                  <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">Nombre Completo: <strong className="font-extrabold text-slate-800">{[cita.datosPersonales.primerNombre, cita.datosPersonales.segundoNombre, cita.datosPersonales.primerApellido, cita.datosPersonales.segundoApellido].filter(Boolean).join(' ')}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                  <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider">PASAPORTE</span>
                  <span className="truncate font-mono"><strong className="font-extrabold text-slate-800">{cita.datosPersonales.pasaporte}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                  <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider">NACIONALIDAD</span>
                  <span className="truncate"><strong className="font-bold text-slate-800">{cita.datosPersonales.nacionalidad}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                  <span className="text-[9px] font-extrabold text-blue-800 bg-blue-105 px-1.5 py-0.5 rounded uppercase tracking-wider">RESOLUCIÓN N°</span>
                  <span className="truncate font-mono"><strong className="font-bold text-slate-800">{cita.datosPersonales.numeroResolucion}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                  <span className="text-[9px] font-extrabold text-blue-800 bg-blue-105 px-1.5 py-0.5 rounded uppercase tracking-wider">FECHA RESOLUCIÓN</span>
                  <span className="truncate"><strong className="font-bold text-slate-800">{cita.datosPersonales.fechaResolucion}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-700 col-span-1 sm:col-span-2 border-t border-dashed border-slate-200 pt-2.5 mt-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Correo: <strong className="font-bold text-slate-800">{cita.datosPersonales.correo}</strong></span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {cita.datosPersonales.nombreCompleto && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-700 col-span-1 sm:col-span-2 pb-1 border-b border-dashed border-slate-200">
                    <User className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                    <span className="truncate">Nombre Completo: <strong className="font-extrabold text-slate-800 uppercase">{cita.datosPersonales.nombreCompleto}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-slate-700">
                  <span className="text-[9px] font-extrabold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{cita.datosPersonales.tipoIdentificacion === 'Cedula' ? 'CÉDULA' : cita.datosPersonales.tipoIdentificacion === 'CedulaJuvenil' ? 'CÉD. JUVENIL' : cita.datosPersonales.tipoIdentificacion === 'Extranjero' ? 'CÉD. EXT.' : 'PASAPORTE'}</span>
                  <span className="truncate font-mono"><strong className="font-extrabold text-slate-800">{cita.datosPersonales.identificacion}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-755">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Teléfono: <strong className="font-bold text-slate-800">{cita.datosPersonales.telefono}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-700 col-span-1 sm:col-span-2 border-t border-slate-100 pt-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Correo: <strong className="font-bold text-slate-800">{cita.datosPersonales.correo}</strong></span>
                </div>
                {cita.datosPersonales.numeroSeguimiento && (
                  <div className="flex items-center gap-2 text-[11px] text-blue-900 col-span-1 sm:col-span-2 border-t border-blue-200 bg-blue-50/50 p-1.5 rounded mt-1 font-mono">
                    <span className="font-bold text-blue-750 bg-blue-100 text-[9px] px-1 rounded uppercase tracking-wider">EXPEDIENTE</span>
                    <span className="truncate">N°: <strong className="font-black text-blue-950">{cita.datosPersonales.numeroSeguimiento}</strong></span>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Requirements list bottom segment inside card */}
        {currentSubService && (
          <div className="border-t border-slate-200 bg-amber-50/20 p-5 md:p-6 space-y-2">
            <h6 className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileClock className="w-4 h-4 text-amber-600" /> ¡No lo olvide! Recordatorios importantes:
            </h6>
            <ul className="space-y-1 text-xs text-slate-700 pl-4 list-disc leading-relaxed font-semibold">
              {currentSubService.requisitos.map((req, idx) => (
                <li key={idx}>{renderWithLinks(req)}</li>
              ))}
              <li className="font-extrabold text-slate-900">
                Llegar con 15 minutos de anticipación al horario pactado.
              </li>
              <li className="font-medium text-slate-600">La vestimenta para la captura de fotografía biométrica exige hombros cubiertos y ausencia de escotes pronunciados o gorros/anteojos de sol.</li>
            </ul>
          </div>
        )}

      </div>

      {/* Email Dispatch Control Card */}
      <div className="bg-white border border-slate-200 rounded p-5 max-w-2xl mx-auto shadow-sm space-y-4">
        <h5 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
          <Mail className="w-4 h-4 text-blue-700 animate-pulse" />
          <span>Enviar Comprobante por Correo Electrónico</span>
        </h5>
        
        <p className="text-[11px] text-slate-500 leading-normal font-medium">
          ¿Desea recibir una copia oficial de este comprobante directamente en su buzón de entrada? Confirme o edite su dirección de correo electrónica de contacto a continuación:
        </p>

        <form onSubmit={handleSendEmail} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (emailStatus === 'success' || emailStatus === 'error') {
                  setEmailStatus('idle');
                }
              }}
              placeholder="correo@ejemplo.com"
              disabled={emailStatus === 'sending'}
              className="w-full h-11 pl-9 pr-4 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-750 font-medium"
              required
            />
          </div>
          <button
            type="submit"
            disabled={emailStatus === 'sending'}
            className={`h-11 px-5 rounded text-xs uppercase font-extrabold tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
              emailStatus === 'sending'
                ? 'bg-slate-100 text-slate-450 border border-slate-200 cursor-not-allowed'
                : 'bg-blue-700 hover:bg-blue-850 text-white shadow-sm hover:shadow'
            }`}
          >
            {emailStatus === 'sending' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar por Correo</span>
              </>
            )}
          </button>
        </form>

        {/* Status Responses */}
        {emailStatus === 'success' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs space-y-1">
            <p className="font-extrabold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>¡Comprobante despachado!</span>
            </p>
            <p className="font-medium text-[11px] leading-normal text-emerald-700 pl-5">
              {emailMessage}
            </p>
            {isSimulated && (
              <>
                <p className="font-bold text-[10px] text-amber-700 leading-normal pl-5 uppercase">
                  (Nota: El servidor está operando en Modo Demostración sin claves. Para efectuar entregas reales a cualquier bandeja, configure las variables OUTLOOK_USER y OUTLOOK_PASS en los secretos).
                </p>
                {confHtmlPreview && (
                  <div className="mt-3.5 pt-3.5 border-t border-emerald-200/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded tracking-wider">
                        Buzón de Simulación Activo
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowConfHtmlPreview(!showConfHtmlPreview)}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline decoration-dotted underline-offset-4 cursor-pointer"
                      >
                        {showConfHtmlPreview ? 'Ocultar correo' : 'Ver correo simulado (HTML)'}
                      </button>
                    </div>
                    {showConfHtmlPreview && (
                      <div className="bg-white rounded border border-emerald-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-100 p-2.5 text-[10px] border-b border-slate-200 text-slate-500 font-mono flex items-center justify-between">
                          <span>De: Tribunal Electoral (simulado)</span>
                          <span>Para: {emailInput}</span>
                        </div>
                        <div 
                          className="p-4 overflow-auto max-h-96 text-left border-t border-slate-100" 
                          dangerouslySetInnerHTML={{ __html: confHtmlPreview }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {emailStatus === 'error' && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs space-y-2">
            <div>
              <p className="font-extrabold flex items-center gap-1.5 text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>No se pudo procesar el correo</span>
              </p>
            </div>
            
            {confHtmlPreview && (
              <div className="mt-3 pt-3 border-t border-red-200/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded tracking-wider">
                    Buzón de Simulación Alternativo
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowConfHtmlPreview(!showConfHtmlPreview)}
                    className="text-[11px] font-bold text-red-800 hover:text-red-950 underline decoration-dotted underline-offset-4 cursor-pointer"
                  >
                    {showConfHtmlPreview ? 'Ocultar correo' : 'Ver correo simulado (HTML)'}
                  </button>
                </div>
                {showConfHtmlPreview && (
                  <div className="bg-white rounded border border-red-200 overflow-hidden shadow-sm">
                    <div className="bg-slate-100 p-2.5 text-[10px] border-b border-slate-200 text-slate-500 font-mono flex items-center justify-between">
                      <span>De: Tribunal Electoral</span>
                      <span>Para: {emailInput}</span>
                    </div>
                    <div 
                      className="p-4 overflow-auto max-h-96 text-left border-t border-slate-100" 
                      dangerouslySetInnerHTML={{ __html: confHtmlPreview }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Done details control */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-3 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto h-12 px-6 rounded border border-slate-300 bg-white text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Guardar en PDF</span>
        </button>

        <button
          type="button"
          onClick={onDone}
          className="w-full sm:w-auto h-12 px-8 rounded bg-blue-700 hover:bg-blue-800 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-blue-100 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <span>Finalizar Trámite</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      
    </div>
  );
}
