import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Play, 
  RefreshCw,
  Info,
  Calendar,
  Clock,
  Shield,
  Sparkles
} from 'lucide-react';

interface CsvImporterProps {
  citasList: any[];
  onUpdateCitas: (newList: any[]) => Promise<void> | void;
}

const EXTRANJERIA_REQUISITOS = [
  "Precio (efectivo) B/. 100.00",
  "Requiere contar con cita programada",
  "Nota del Servicio Nacional de Migración",
  "Fotocopia del carné expedido por el Servicio Nacional de Migración",
  "Fotocopia de la página de las generales del pasaporte"
];

// Regulación Oficial de Extranjería: 28 intervalos de 15 minutos x 2 cupos = 56 citas exactas por día
export const EXTRANJERIA_OFFICIAL_SLOTS = [
  '07:00 AM', '07:15 AM', '07:30 AM', '07:45 AM',
  '08:00 AM', '08:15 AM', '08:30 AM', '08:45 AM',
  '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM',
  '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
  '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
  '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM',
  '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM'
];

export const DIVERSE_CITIZENS_56 = [
  { nombre: "Carlos Eduardo Mendoza Silva", pasaporte: "PA-7845101", resolucion: "Res. 500601 de 15/05/2026", nacionalidad: "Colombiana", correo: "carlos.mendoza@email.com", telefono: "6234-5101" },
  { nombre: "Elena Rostova Ivanova", pasaporte: "PA-4491002", resolucion: "Res. 500602 de 15/05/2026", nacionalidad: "Rusa", correo: "elena.rostova@email.com", telefono: "6789-0102" },
  { nombre: "David Chen Wu", pasaporte: "PA-9932103", resolucion: "Res. 500603 de 15/05/2026", nacionalidad: "China", correo: "david.chen@email.com", telefono: "6456-7103" },
  { nombre: "Maria Santos Da Silva", pasaporte: "PA-3321404", resolucion: "Res. 500604 de 15/05/2026", nacionalidad: "Brasileña", correo: "maria.santos@email.com", telefono: "6111-2104" },
  { nombre: "Jean Pierre Dupont", pasaporte: "PA-8822005", resolucion: "Res. 500605 de 15/05/2026", nacionalidad: "Francesa", correo: "jean.dupont@email.com", telefono: "6999-0105" },
  { nombre: "Andrea Paola Gutierrez", pasaporte: "PA-5511206", resolucion: "Res. 500606 de 16/05/2026", nacionalidad: "Venezolana", correo: "andrea.gutierrez@email.com", telefono: "6333-4106" },
  { nombre: "Marco Aurelio Rossi", pasaporte: "PA-6622307", resolucion: "Res. 500607 de 16/05/2026", nacionalidad: "Italiana", correo: "marco.rossi@email.com", telefono: "6222-1107" },
  { nombre: "Sofia Nicole Castillo", pasaporte: "PA-7733408", resolucion: "Res. 500608 de 16/05/2026", nacionalidad: "Nicaragüense", correo: "sofia.castillo@email.com", telefono: "6444-5108" },
  { nombre: "Liam Alexander Smith", pasaporte: "PA-8844509", resolucion: "Res. 500609 de 17/05/2026", nacionalidad: "Estadounidense", correo: "liam.smith@email.com", telefono: "6555-6109" },
  { nombre: "Camila Alejandra Morales", pasaporte: "PA-9955610", resolucion: "Res. 500610 de 17/05/2026", nacionalidad: "Costarricense", correo: "camila.morales@email.com", telefono: "6666-7110" },
  { nombre: "Mateo Sebastian Vargas", pasaporte: "PA-1166711", resolucion: "Res. 500611 de 17/05/2026", nacionalidad: "Peruana", correo: "mateo.vargas@email.com", telefono: "6777-8111" },
  { nombre: "Isabella Marie Leclerc", pasaporte: "PA-2277812", resolucion: "Res. 500612 de 18/05/2026", nacionalidad: "Canadiense", correo: "isabella.leclerc@email.com", telefono: "6888-9112" },
  { nombre: "Alejandro Jose Hernandez", pasaporte: "PA-3388913", resolucion: "Res. 500613 de 18/05/2026", nacionalidad: "Dominicana", correo: "alejandro.hernandez@email.com", telefono: "6999-1113" },
  { nombre: "Valeria Gomez Gomez", pasaporte: "PA-4499014", resolucion: "Res. 500614 de 18/05/2026", nacionalidad: "Española", correo: "valeria.gomez@email.com", telefono: "6123-2114" },
  { nombre: "Lucas Santiago Ferreira", pasaporte: "PA-5500115", resolucion: "Res. 500615 de 19/05/2026", nacionalidad: "Portuguesa", correo: "lucas.ferreira@email.com", telefono: "6234-3115" },
  { nombre: "Fatima Zahra Mansouri", pasaporte: "PA-6611216", resolucion: "Res. 500616 de 19/05/2026", nacionalidad: "Marroquí", correo: "fatima.mansouri@email.com", telefono: "6345-4116" },
  { nombre: "Kenji Sato Tanaka", pasaporte: "PA-7722317", resolucion: "Res. 500617 de 19/05/2026", nacionalidad: "Japonesa", correo: "kenji.sato@email.com", telefono: "6456-5117" },
  { nombre: "Ana Maria Alvarez", pasaporte: "PA-8833418", resolucion: "Res. 500618 de 20/05/2026", nacionalidad: "Mexicana", correo: "ana.alvarez@email.com", telefono: "6567-6118" },
  { nombre: "Oliver James Wright", pasaporte: "PA-9944519", resolucion: "Res. 500619 de 20/05/2026", nacionalidad: "Británica", correo: "oliver.wright@email.com", telefono: "6678-7119" },
  { nombre: "Lucia Fernandez Diaz", pasaporte: "PA-1155620", resolucion: "Res. 500620 de 20/05/2026", nacionalidad: "Argentina", correo: "lucia.fernandez@email.com", telefono: "6789-8120" },
  { nombre: "Gabriel Antonio Castro", pasaporte: "PA-2266721", resolucion: "Res. 500621 de 21/05/2026", nacionalidad: "Salvadoreña", correo: "gabriel.castro@email.com", telefono: "6890-9121" },
  { nombre: "Emma Louise Mueller", pasaporte: "PA-3377822", resolucion: "Res. 500622 de 21/05/2026", nacionalidad: "Alemana", correo: "emma.mueller@email.com", telefono: "6901-0122" },
  { nombre: "Diego Andres Pineda", pasaporte: "PA-4488923", resolucion: "Res. 500623 de 21/05/2026", nacionalidad: "Hondureña", correo: "diego.pineda@email.com", telefono: "6012-1123" },
  { nombre: "Mia Chloe Jansen", pasaporte: "PA-5599024", resolucion: "Res. 500624 de 22/05/2026", nacionalidad: "Holandesa", correo: "mia.jansen@email.com", telefono: "6123-3124" },
  { nombre: "Samuel David Ocampo", pasaporte: "PA-6600125", resolucion: "Res. 500625 de 22/05/2026", nacionalidad: "Guatemalteca", correo: "samuel.ocampo@email.com", telefono: "6234-4125" },
  { nombre: "Clara Beatriz Romero", pasaporte: "PA-7711226", resolucion: "Res. 500626 de 22/05/2026", nacionalidad: "Chilena", correo: "clara.romero@email.com", telefono: "6345-5126" },
  { nombre: "Noah Benjamin Cohen", pasaporte: "PA-8822327", resolucion: "Res. 500627 de 23/05/2026", nacionalidad: "Israelí", correo: "noah.cohen@email.com", telefono: "6456-6127" },
  { nombre: "Julieta Rocio Benitez", pasaporte: "PA-9933428", resolucion: "Res. 500628 de 23/05/2026", nacionalidad: "Paraguaya", correo: "julieta.benitez@email.com", telefono: "6567-7128" },
  { nombre: "Thiago Silva Barbosa", pasaporte: "PA-1144529", resolucion: "Res. 500629 de 23/05/2026", nacionalidad: "Brasileña", correo: "thiago.barbosa@email.com", telefono: "6678-8129" },
  { nombre: "Zoe Charlotte Martin", pasaporte: "PA-2255630", resolucion: "Res. 500630 de 24/05/2026", nacionalidad: "Francesa", correo: "zoe.martin@email.com", telefono: "6789-9130" },
  { nombre: "Sebastian Cruz Delgado", pasaporte: "PA-3366731", resolucion: "Res. 500631 de 24/05/2026", nacionalidad: "Ecuatoriana", correo: "sebastian.cruz@email.com", telefono: "6890-0131" },
  { nombre: "Astrid Linnea Lind", pasaporte: "PA-4477832", resolucion: "Res. 500632 de 24/05/2026", nacionalidad: "Sueca", correo: "astrid.lind@email.com", telefono: "6901-1132" },
  { nombre: "Joaquin Manuel Rios", pasaporte: "PA-5588933", resolucion: "Res. 500633 de 25/05/2026", nacionalidad: "Uruguaya", correo: "joaquin.rios@email.com", telefono: "6012-2133" },
  { nombre: "Chloe Grace O'Connor", pasaporte: "PA-6699034", resolucion: "Res. 500634 de 25/05/2026", nacionalidad: "Irlandesa", correo: "chloe.oconnor@email.com", telefono: "6123-4134" },
  { nombre: "Emilio Rafael Cardenas", pasaporte: "PA-7700135", resolucion: "Res. 500635 de 25/05/2026", nacionalidad: "Boliviana", correo: "emilio.cardenas@email.com", telefono: "6234-5135" },
  { nombre: "Min-Jun Park Kim", pasaporte: "PA-8811236", resolucion: "Res. 500636 de 26/05/2026", nacionalidad: "Surcoreana", correo: "minjun.park@email.com", telefono: "6345-6136" },
  { nombre: "Renata Luciana Pacheco", pasaporte: "PA-9922337", resolucion: "Res. 500637 de 26/05/2026", nacionalidad: "Mexicana", correo: "renata.pacheco@email.com", telefono: "6456-7137" },
  { nombre: "Dmitry Sergeyev Popov", pasaporte: "PA-1133438", resolucion: "Res. 500638 de 26/05/2026", nacionalidad: "Rusa", correo: "dmitry.popov@email.com", telefono: "6567-8138" },
  { nombre: "Mariana Soledad Flores", pasaporte: "PA-2244539", resolucion: "Res. 500639 de 27/05/2026", nacionalidad: "Argentina", correo: "mariana.flores@email.com", telefono: "6678-9139" },
  { nombre: "Lars Erik Hansen", pasaporte: "PA-3355640", resolucion: "Res. 500640 de 27/05/2026", nacionalidad: "Noruega", correo: "lars.hansen@email.com", telefono: "6789-0140" },
  { nombre: "Alonso Javier Sucre", pasaporte: "PA-4466741", resolucion: "Res. 500641 de 27/05/2026", nacionalidad: "Venezolana", correo: "alonso.sucre@email.com", telefono: "6890-1141" },
  { nombre: "Hanna Marie Becker", pasaporte: "PA-5577842", resolucion: "Res. 500642 de 28/05/2026", nacionalidad: "Alemana", correo: "hanna.becker@email.com", telefono: "6901-2142" },
  { nombre: "Gonzalo Ignacio Paredes", pasaporte: "PA-6688943", resolucion: "Res. 500643 de 28/05/2026", nacionalidad: "Peruana", correo: "gonzalo.paredes@email.com", telefono: "6012-3143" },
  { nombre: "Amina Bint Youssef", pasaporte: "PA-7799044", resolucion: "Res. 500644 de 28/05/2026", nacionalidad: "Egipcia", correo: "amina.youssef@email.com", telefono: "6123-5144" },
  { nombre: "Federico Dante Moretti", pasaporte: "PA-8800145", resolucion: "Res. 500645 de 29/05/2026", nacionalidad: "Italiana", correo: "federico.moretti@email.com", telefono: "6234-6145" },
  { nombre: "Sara Ines Betancourt", pasaporte: "PA-9911246", resolucion: "Res. 500646 de 29/05/2026", nacionalidad: "Colombiana", correo: "sara.betancourt@email.com", telefono: "6345-7146" },
  { nombre: "William Robert Taylor", pasaporte: "PA-1122347", resolucion: "Res. 500647 de 29/05/2026", nacionalidad: "Australiana", correo: "william.taylor@email.com", telefono: "6456-8147" },
  { nombre: "Daniela Paola Navarro", pasaporte: "PA-2233448", resolucion: "Res. 500648 de 30/05/2026", nacionalidad: "Nicaragüense", correo: "daniela.navarro@email.com", telefono: "6567-9148" },
  { nombre: "Rajesh Kumar Patel", pasaporte: "PA-3344549", resolucion: "Res. 500649 de 30/05/2026", nacionalidad: "India", correo: "rajesh.patel@email.com", telefono: "6678-0149" },
  { nombre: "Victoria Isabel Salazar", pasaporte: "PA-4455650", resolucion: "Res. 500650 de 30/05/2026", nacionalidad: "Costarricense", correo: "victoria.salazar@email.com", telefono: "6789-1150" },
  { nombre: "Ethan Bradley Miller", pasaporte: "PA-5566751", resolucion: "Res. 500651 de 31/05/2026", nacionalidad: "Estadounidense", correo: "ethan.miller@email.com", telefono: "6890-2151" },
  { nombre: "Paulina Eugenia Cordero", pasaporte: "PA-6677852", resolucion: "Res. 500652 de 31/05/2026", nacionalidad: "Chilena", correo: "paulina.cordero@email.com", telefono: "6901-3152" },
  { nombre: "Klaus Dieter Schmidt", pasaporte: "PA-7788953", resolucion: "Res. 500653 de 31/05/2026", nacionalidad: "Suiza", correo: "klaus.schmidt@email.com", telefono: "6012-4153" },
  { nombre: "Catalina Maria Restrepo", pasaporte: "PA-8899054", resolucion: "Res. 500654 de 31/05/2026", nacionalidad: "Colombiana", correo: "catalina.restrepo@email.com", telefono: "6123-6154" },
  { nombre: "Andrei Nicolae Radu", pasaporte: "PA-9900155", resolucion: "Res. 500655 de 31/05/2026", nacionalidad: "Rumana", correo: "andrei.radu@email.com", telefono: "6234-7155" },
  { nombre: "Beatriz Helena Moncada", pasaporte: "PA-1111256", resolucion: "Res. 500656 de 31/05/2026", nacionalidad: "Hondureña", correo: "beatriz.moncada@email.com", telefono: "6345-8156" }
];

function formatTimeToStandard(raw: string): string {
  const m = raw.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return raw;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  let ap = m[3] ? m[3].toUpperCase() : '';
  if (!ap) {
    if (h >= 7 && h < 12) ap = 'AM';
    else if (h === 12 || (h >= 1 && h <= 5)) ap = 'PM';
    else if (h >= 13) { h -= 12; ap = 'PM'; }
    else ap = 'AM';
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} ${ap}`;
}

export function standardizeCsvDate(rawDate: string): string {
  if (!rawDate) return new Date().toISOString().substring(0, 10);
  
  // Clean up whitespace
  let clean = rawDate.trim();
  
  // If it's already YYYY-MM-DD, return it
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  
  // If it is in YYYY/MM/DD format, replace slashes with dashes
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) {
    return clean.replace(/\//g, '-');
  }

  // If it is in DD/MM/YYYY or MM/DD/YYYY format or 2-digit year (MM/DD/YY):
  // e.g. 09/11/26, 09/14/26, 29/12/2026 or 12/29/2026
  const parts = clean.split(/[/\-.]/);
  if (parts.length === 3) {
    let p0 = parts[0].trim();
    let p1 = parts[1].trim();
    let p2 = parts[2].trim();
    
    // Normalize 2-digit year
    if (p2.length === 2 && /^\d{2}$/.test(p2)) {
      p2 = `20${p2}`;
    }
    if (p0.length === 2 && /^\d{2}$/.test(p0) && parseInt(p0, 10) > 31) {
      p0 = `20${p0}`;
    }
    
    // Check if the third part is a 4-digit year (e.g. 2026)
    if (p2.length === 4 && /^\d{4}$/.test(p2)) {
      const year = p2;
      const val0 = parseInt(p0, 10);
      const val1 = parseInt(p1, 10);
      
      // If second part is > 12, it must be MM/DD/YYYY (e.g. 09/14/2026)
      if (val1 > 12) {
        const month = p0.padStart(2, '0');
        const day = p1.padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // If first part is > 12, it must be DD/MM/YYYY (e.g. 14/09/2026)
      if (val0 > 12) {
        const day = p0.padStart(2, '0');
        const month = p1.padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // If both are <= 12: In CSV datasets like 09/11/26, month is first (09) and day is second (11)
      const month = p0.padStart(2, '0');
      const day = p1.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Check if the first part is a 4-digit year (e.g. 2026/12/29)
    if (p0.length === 4 && /^\d{4}$/.test(p0)) {
      const year = p0;
      const month = p1.padStart(2, '0');
      const day = p2.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  return clean;
}

export default function CsvImporter({ citasList, onUpdateCitas }: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetJornadaDate, setTargetJornadaDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [markAsRealized, setMarkAsRealized] = useState(true);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect previous non-extranjeria CSV appointments in the list
  const previousCsvNonExtranjeriaCount = useMemo(() => {
    if (!Array.isArray(citasList)) return 0;
    return citasList.filter(c => {
      if (!c) return false;
      const id = String(c.id || '');
      const tx = String(c.codigoTransaccion || '');
      const creado = String(c.creadoPor || '').toLowerCase();
      const isCsv = id.includes('CSV') || tx.includes('CSV') || creado.includes('csv') || creado.includes('importaci') || id.startsWith('TE-CSV');
      const isExt = c.servicioCategoria === 'extranjeria' && id.startsWith('EXT-');
      return isCsv && !isExt;
    }).length;
  }, [citasList]);

  // Helper to trigger download of full 56-slot Extranjería CSV template (07:00 AM - 01:45 PM)
  const handleDownloadTemplate = () => {
    const headers = 'Fecha,N°,Hora,Nombre,Pasaporte,Resolución,Nacionalidad,Correo,Teléfono\n';
    const chosenDate = targetJornadaDate || new Date().toISOString().substring(0, 10);
    
    let csvRows = '';
    for (let i = 0; i < 56; i++) {
      const seq = i + 1;
      const slotIdx = Math.min(EXTRANJERIA_OFFICIAL_SLOTS.length - 1, Math.floor(i / 2));
      const hora = EXTRANJERIA_OFFICIAL_SLOTS[slotIdx];
      const citizen = DIVERSE_CITIZENS_56[i] || {
        nombre: `Ciudadano Extranjero ${seq}`,
        pasaporte: `PA-${7845100 + seq}`,
        resolucion: `Res. 5006${String(seq).padStart(2, '0')} de 15/05/2026`,
        nacionalidad: 'Extranjera',
        correo: `extranjero.${seq}@email.com`,
        telefono: `6${String(100 + seq).padStart(3, '0')}-5000`
      };
      csvRows += `${chosenDate},${seq},${hora},${citizen.nombre},${citizen.pasaporte},${citizen.resolucion},${citizen.nacionalidad},${citizen.correo},${citizen.telefono}\n`;
    }
    
    const csvContent = '\uFEFF' + headers + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `plantilla_citas_extranjeria_56_cupos_${chosenDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Instant generator for complete 56-appointment jornada from 07:00 AM to 01:45 PM
  const handleGenerate56Jornada = (dateStr: string) => {
    setIsProcessing(true);
    try {
      const chosenDate = dateStr || new Date().toISOString().substring(0, 10);
      const cleanDate = chosenDate.replace(/[^0-9]/g, '').substring(0, 8);
      const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

      const generatedList = DIVERSE_CITIZENS_56.slice(0, 56).map((c, idx) => {
        const seqNum = idx + 1;
        const slotIdx = Math.min(EXTRANJERIA_OFFICIAL_SLOTS.length - 1, Math.floor(idx / 2));
        const hora = EXTRANJERIA_OFFICIAL_SLOTS[slotIdx];

        let csvCode = '';
        for (let i = 0; i < 5; i++) {
          csvCode += alpha.charAt(Math.floor(Math.random() * alpha.length));
        }
        const finalTxCode = `EXT-${csvCode}`;
        const finalId = `EXT-CSV-${cleanDate || '2026'}-${101 + idx}`;

        return {
          id: finalId,
          codigoTransaccion: finalTxCode,
          nombre: c.nombre,
          servicioCategoria: 'extranjeria',
          categoriaNombre: 'Trámites de Extranjería',
          subServicioId: 'ext_primera_vez',
          subServicioNombre: 'Carné de residente permanente por primera vez',
          sucursalId: 'anc_main',
          sucursalNombre: 'Sede Principal de Ancón (Extranjería)',
          sucursalDireccion: 'Ciudad de Panamá, Ancón, Ave. Omar Torrijos Herrera',
          fecha: chosenDate,
          hora,
          telefono: c.telefono,
          correo: c.correo,
          estado: 'confirmada',
          llegadaConfirmadaAuto: true,
          tipoIdentificacion: 'Pasaporte',
          numeroCitaDia: seqNum,
          resolucion: c.resolucion,
          creadoPor: 'Generador Oficial 56 Cupos (07:00 AM - 01:45 PM)',
          fechaCreacion: new Date().toISOString(),
          requisitos: EXTRANJERIA_REQUISITOS,
          datosPersonales: {
            primerNombre: c.nombre.split(' ')[0] || '',
            primerApellido: c.nombre.split(' ')[1] || '',
            nombreCompleto: c.nombre,
            pasaporte: c.pasaporte,
            identificacion: c.pasaporte,
            nacionalidad: c.nacionalidad,
            numeroResolucion: c.resolucion,
            correo: c.correo,
            telefono: c.telefono,
            tipoIdentificacion: 'Pasaporte',
            creadoPor: 'Generador Oficial 56 Cupos (07:00 AM - 01:45 PM)'
          },
          isValid: true,
          rowNumber: idx + 1
        };
      });

      setParsedRows(generatedList);
      setImportStatus({
        success: true,
        message: `¡Jornada de 56 citas generada con éxito para el ${chosenDate}! Horario oficial distribuido de 07:00 AM a 01:45 PM (28 intervalos x 2 cupos). Revise la lista y confirme la importación.`
      });
    } catch (e: any) {
      setImportStatus({
        success: false,
        message: `Error al generar jornada de 56 citas: ${e.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-convert existing non-extranjeria CSV citations to Extranjería nomenclature
  const handleConvertPreviousCsv = async () => {
    if (!Array.isArray(citasList) || citasList.length === 0) return;
    setIsProcessing(true);
    try {
      let convertedCount = 0;
      const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const updatedList = citasList.map(c => {
        if (!c) return c;
        const id = String(c.id || '');
        const tx = String(c.codigoTransaccion || '');
        const creado = String(c.creadoPor || '').toLowerCase();
        const isCsv = id.includes('CSV') || tx.includes('CSV') || creado.includes('csv') || creado.includes('importaci') || id.startsWith('TE-CSV');
        
        if (isCsv) {
          convertedCount++;
          let cleanCode = '';
          for (let i = 0; i < 5; i++) {
            cleanCode += alpha.charAt(Math.floor(Math.random() * alpha.length));
          }
          const finalId = id.startsWith('EXT-') ? id : `EXT-${id.replace(/^TE-/, '')}`;
          const finalTx = tx.startsWith('EXT-') ? tx : `EXT-${cleanCode}`;
          
          const dp = c.datosPersonales ? { ...c.datosPersonales } : {};
          const pasaporteVal = dp.pasaporte || dp.identificacion || c.identificacion || `PA-${cleanCode}`;
          dp.pasaporte = pasaporteVal;
          dp.tipoIdentificacion = 'Pasaporte';
          if (!dp.numeroResolucion) dp.numeroResolucion = c.resolucion || 'RES-MIG-2026-8812';

          return {
            ...c,
            id: finalId,
            codigoTransaccion: finalTx,
            servicioCategoria: 'extranjeria',
            categoriaNombre: 'Trámites de Extranjería',
            subServicioId: 'ext_primera_vez',
            subServicioNombre: 'Carné de residente permanente por primera vez',
            sucursalId: 'anc_main',
            sucursalNombre: 'Sede Principal de Ancón (Extranjería)',
            sucursalDireccion: 'Ciudad de Panamá, Ancón, Ave. Omar Torrijos Herrera',
            tipoIdentificacion: 'Pasaporte',
            requisitos: EXTRANJERIA_REQUISITOS,
            creadoPor: 'Importación CSV Extranjería',
            resolucion: c.resolucion || dp.numeroResolucion || 'RES-MIG-2026-8812',
            datosPersonales: dp
          };
        }
        return c;
      });

      await onUpdateCitas(updatedList);
      try {
        const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token') || 'superadmin_token';
        await fetch('/api/appointments', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ appointments: updatedList })
        });
      } catch (postErr) {
        console.warn('Error syncing converted appointments to server:', postErr);
      }

      setImportStatus({
        success: true,
        message: `¡Conversión completada! Se actualizaron ${convertedCount} citas de carga masiva con la nomenclatura oficial EXT- y requisitos de Extranjería.`
      });
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `Error al convertir citas: ${err.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Eliminate non-extranjeria appointments or unwanted CSV citations
  const handleDeleteNonExtranjeriaCsv = async () => {
    if (!Array.isArray(citasList) || citasList.length === 0) return;
    if (!window.confirm("¿Está seguro de que desea eliminar todas las citas de carga masiva que no pertenecen a Extranjería?")) {
      return;
    }
    setIsProcessing(true);
    try {
      const beforeCount = citasList.length;
      const filtered = citasList.filter(c => {
        if (!c) return false;
        const id = String(c.id || '');
        const tx = String(c.codigoTransaccion || '');
        const creado = String(c.creadoPor || '').toLowerCase();
        const isCsv = id.includes('CSV') || tx.includes('CSV') || creado.includes('csv') || creado.includes('importaci') || id.startsWith('TE-CSV');
        const isExt = c.servicioCategoria === 'extranjeria' && (id.startsWith('EXT-') || tx.startsWith('EXT-'));
        // If it's a CSV appointment and NOT valid Extranjeria, remove it!
        if (isCsv && !isExt) return false;
        return true;
      });

      const deletedCount = beforeCount - filtered.length;
      await onUpdateCitas(filtered);
      try {
        const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token') || 'superadmin_token';
        await fetch('/api/appointments', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ appointments: filtered })
        });
      } catch (postErr) {
        console.warn('Error syncing filtered appointments to server:', postErr);
      }

      setImportStatus({
        success: true,
        message: `Se eliminaron ${deletedCount} citas de carga masiva ajenas a Extranjería.`
      });
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `Error al eliminar citas: ${err.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Safe CSV Parsing Regex (handles quotes and commas/semicolons)
  const parseCSVText = (text: string) => {
    const lines: string[] = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' || char === ';') {
        if (inQuotes) {
          row[row.length - 1] += char;
        } else {
          row.push("");
        }
      } else if (char === '\r' || char === '\n') {
        if (inQuotes) {
          row[row.length - 1] += char;
        } else {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          lines.push(JSON.stringify(row));
          row = [""];
        }
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(JSON.stringify(row));
    }

    return lines.map(l => JSON.parse(l));
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setImportStatus({
        success: false,
        message: 'Por favor, cargue un archivo con extensión .csv.'
      });
      return;
    }
    setFile(selectedFile);
    setImportStatus(null);
    processFileContent(selectedFile);
  };

  const processFileContent = (targetFile: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const allParsedRows = parseCSVText(text);

        if (allParsedRows.length < 2) {
          throw new Error('El archivo CSV está vacío o no contiene suficientes filas.');
        }

        // Headers mapping
        const headers = allParsedRows[0].map((h: string) => h.trim().toLowerCase());
        
        const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

        // Normalize accents, spaces, slashes and special characters for flexible column mapping
        const cleanKey = (str: string) => {
          return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-z0-9]/g, "");     // keep only alphanumeric
        };

        const mappedData = allParsedRows.slice(1).map((rowValues: string[], index: number) => {
          // Map headers to values
          const item: any = {};
          headers.forEach((header: string, colIdx: number) => {
            if (rowValues[colIdx] !== undefined) {
              item[header] = rowValues[colIdx].trim();
            }
          });

          const getColValue = (aliases: string[]) => {
            const cleanedAliases = aliases.map(cleanKey);
            const matchedHeader = headers.find((h: string) => cleanedAliases.includes(cleanKey(h)));
            return matchedHeader ? item[matchedHeader] : '';
          };

          // Standardize fields using flexible alias matching
          const identificacion = getColValue([
            'pasaporte', 'passport', 'identificacion', 'identificación', 'cedula', 'cédula', 'documento',
            'pasaporte/cedula', 'cedula/pasaporte', 'nº pasaporte', 'nro pasaporte', 'numero pasaporte', 'nro_pasaporte', 'num_pasaporte'
          ]) || `PA-${10001 + index}`;
          const nombreCompleto = getColValue([
            'nombre', 'nombrecompleto', 'nombre_completo', 'ciudadano', 'nombres', 'nombre y apellido', 'nombre y apellidos', 'nombre completo'
          ]);
          const correo = getColValue([
            'correo', 'email', 'ciudadano_correo', 'correo electronico', 'correo electrónico', 'e-mail', 'mail'
          ]) || 'extranjeria@te.gob.pa';
          const telefono = getColValue([
            'telefono', 'phone', 'celular', 'teléfono', 'telefono movil', 'telefono de contacto', 'contacto', 'movil', 'móvil'
          ]) || 'N/A';
          const rawFecha = getColValue([
            'fecha', 'date', 'fecha_cita', 'fechacita', 'dia', 'día', 'fecha de cita', 'fecha de la cita'
          ]);
          const fecha = standardizeCsvDate(rawFecha);
          const resolucion = getColValue([
            'resolución/fecha', 'resolucion/fecha', 'resolucion', 'resolución', 'resolución_fecha', 'resolucion_fecha', 
            'resolución / fecha', 'resolucion / fecha', 'motivo', 'nro resolucion', 'nro resolución', 'numero resolucion', 'resolucion nro'
          ]) || `RES-MIG-2026-${8800 + index}`;
          const nacionalidad = getColValue([
            'nacionalidad', 'pais', 'país', 'nationality', 'origen', 'procedencia'
          ]) || 'Extranjera';
          const seqRaw = getColValue([
            'n°', 'n', 'numero', 'num', 'secuencia', 'orden', 'nº', 'nro', 'consecutivo', 'id_fila'
          ]);
          
          const parsedSeq = seqRaw ? parseInt(String(seqRaw).replace(/[^0-9]/g, ''), 10) : (index + 1);
          const numeroCitaDia = isNaN(parsedSeq) || parsedSeq < 1 ? (index + 1) : parsedSeq;

          // Official schedule: 28 intervals (07:00 AM - 01:45 PM), 2 cupos each (1 to 56)
          const seqIdx = Math.max(1, numeroCitaDia);
          const slotIdx = Math.min(EXTRANJERIA_OFFICIAL_SLOTS.length - 1, Math.floor((seqIdx - 1) / 2));
          const calculatedSlot = EXTRANJERIA_OFFICIAL_SLOTS[slotIdx];

          const rawHora = getColValue(['hora', 'time', 'tiempo', 'hora_cita', 'horacita']).trim();
          const hora = rawHora ? formatTimeToStandard(rawHora) : calculatedSlot;

          // ALL CSV IMPORTS ARE 100% EXTRANJERÍA
          let csvCode = '';
          for (let i = 0; i < 5; i++) {
            csvCode += alpha.charAt(Math.floor(Math.random() * alpha.length));
          }
          
          // Extranjería official nomenclature
          const finalTxCode = `EXT-${csvCode}`;
          const cleanDate = fecha.replace(/[^0-9]/g, '').substring(0, 8);
          const finalId = `EXT-CSV-${cleanDate || '2026'}-${index + 101}`;

          const hasRequired = (identificacion || nombreCompleto) && fecha && hora;

          return {
            id: finalId,
            codigoTransaccion: finalTxCode,
            nombre: nombreCompleto || `Ciudadano Extranjero (${identificacion})`,
            servicioCategoria: 'extranjeria',
            categoriaNombre: 'Trámites de Extranjería',
            subServicioId: 'ext_primera_vez',
            subServicioNombre: 'Carné de residente permanente por primera vez',
            sucursalId: 'anc_main',
            sucursalNombre: 'Sede Principal de Ancón (Extranjería)',
            sucursalDireccion: 'Ciudad de Panamá, Ancón, Ave. Omar Torrijos Herrera',
            fecha,
            hora,
            telefono,
            correo,
            estado: 'confirmada',
            llegadaConfirmadaAuto: true,
            tipoIdentificacion: 'Pasaporte',
            numeroCitaDia,
            resolucion,
            creadoPor: 'Importación CSV Extranjería',
            fechaCreacion: new Date().toISOString(),
            requisitos: EXTRANJERIA_REQUISITOS,
            datosPersonales: {
              primerNombre: nombreCompleto.split(' ')[0] || '',
              primerApellido: nombreCompleto.split(' ')[1] || '',
              nombreCompleto: nombreCompleto || `Ciudadano (${identificacion})`,
              pasaporte: identificacion || `PA-${csvCode}`,
              identificacion: identificacion || `PA-${csvCode}`,
              nacionalidad,
              numeroResolucion: resolucion,
              correo,
              telefono,
              tipoIdentificacion: 'Pasaporte',
              creadoPor: 'Importación CSV Extranjería'
            },
            isValid: Boolean(hasRequired),
            rowNumber: index + 2
          };
        }).filter((item: any) => item.datosPersonales.identificacion || item.datosPersonales.nombreCompleto);

        setParsedRows(mappedData);
        setImportStatus({
          success: true,
          message: `Archivo CSV leído con éxito. Se detectaron ${mappedData.length} registros listos para Extranjería (Nomenclatura EXT-).`
        });
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: `Error al procesar el archivo CSV: ${err.message}`
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(targetFile, 'UTF-8');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setImportStatus(null);
  };

  const handleImportSubmit = async () => {
    const validCitas = parsedRows.filter(row => row.isValid);
    if (validCitas.length === 0) {
      setImportStatus({
        success: false,
        message: 'No hay registros válidos con información suficiente para importar.'
      });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Remove any old erroneous non-extranjeria CSV citations that match or are duplicates
      const cleanExisting = Array.isArray(citasList) ? citasList.filter(c => {
        if (!c) return false;
        const id = String(c.id || '');
        const isOldWrongCsv = id.startsWith('TE-CSV-') || (id.includes('CSV') && c.servicioCategoria !== 'extranjeria');
        return !isOldWrongCsv;
      }) : [];
      
      // 2. Merge: put new Extranjería citations first
      const mergedList = [...validCitas, ...cleanExisting];
      
      // 3. Trigger update on parent & localStorage
      await onUpdateCitas(mergedList);

      // 4. Sync directly to backend database
      try {
        const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token') || 'superadmin_token';
        await fetch('/api/appointments', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ appointments: mergedList })
        });
      } catch (backendErr) {
        console.warn("Backend bulk sync notice:", backendErr);
      }

      // 5. Generate and sync attention metadata if selected
      if (markAsRealized) {
        try {
          const metadataPayload: Record<string, any> = {};
          validCitas.forEach(cita => {
            metadataPayload[cita.id] = {
              passedToSupervisor: true,
              hasDocuments: true,
              assignedCubiculo: Math.floor(Math.random() * 4) + 1,
              estadoTicket: 'realizada',
              staffResponsable: 'Agente Importador (Histórico)',
              timestampCompletado: `${cita.fecha} ${cita.hora}`,
              calledTime: cita.hora,
              startedTime: cita.hora
            };
          });

          await fetch('/api/extranjeria/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metadata: metadataPayload })
          });

          // Update local storage so the current active supervisor session picks it up instantly
          const localMetaRaw = localStorage.getItem('extranjeria_appointment_metadata');
          const localMeta = localMetaRaw ? JSON.parse(localMetaRaw) : {};
          const updatedLocalMeta = { ...localMeta, ...metadataPayload };
          localStorage.setItem('extranjeria_appointment_metadata', JSON.stringify(updatedLocalMeta));
        } catch (metaErr) {
          console.warn("Backend metadata bulk sync notice:", metaErr);
        }
      }

      // Dispatch global events so calendar and open sessions refresh availability immediately
      window.dispatchEvent(new CustomEvent('appointments_updated'));
      window.dispatchEvent(new CustomEvent('citas_updated'));

      const hasSepDecAppts = validCitas.some(c => c.fecha >= '2026-09-01' && c.fecha <= '2026-12-30');

      setImportStatus({
        success: true,
        message: markAsRealized
          ? `¡Éxito total! Se importaron ${validCitas.length} citas históricas y se marcaron automáticamente como ATENDIDAS (REALIZADAS) con operador y cubículo para reportes.${hasSepDecAppts ? ' Las fechas de Septiembre a Diciembre 30 han quedado bloqueadas para nuevas reservas en el calendario.' : ''}`
          : `¡Éxito total! Se importaron ${validCitas.length} citas con nomenclatura oficial EXT-, canalizadas a la bandeja de Extranjería (Sede Ancón).${hasSepDecAppts ? ' El sistema ha bloqueado automáticamente el agendamiento público para el periodo de Septiembre a Diciembre 30 de 2026.' : ''}`
      });
      setFile(null);
      setParsedRows([]);
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `Error al guardar las citas en la base de datos: ${err.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalRows = parsedRows.length;
  const validRows = parsedRows.filter(r => r.isValid).length;
  const invalidRows = totalRows - validRows;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6 text-slate-100 max-w-6xl mx-auto font-sans">
      
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-amber-500" />
              <span>Carga Masiva de Citas de Extranjería (Exclusivo CSV)</span>
            </h2>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Nomenclatura EXT-
            </span>
          </div>
          <p className="text-xs text-slate-400">
            La carga masiva por archivo CSV está habilitada exclusivamente para <strong className="text-amber-400">Trámites de Extranjería</strong>. Todas las citas se codifican con prefijo <code className="text-amber-300 font-mono font-bold">EXT-</code>, Pasaporte y 5 requisitos migratorios.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 px-4 py-2.5 rounded-lg transition-all shadow cursor-pointer font-semibold"
            title="Descarga archivo CSV con los 56 cupos oficiales (07:00 AM - 01:45 PM)"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Descargar Plantilla Oficial (56 Cupos)</span>
          </button>
        </div>
      </div>

      {/* BANNER JORNADA OFICIAL 56 CITAS / DÍA (07:00 AM A 01:45 PM) */}
      <div className="bg-gradient-to-r from-amber-950/50 via-slate-850 to-slate-900 border border-amber-500/30 rounded-xl p-4 md:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
              Jornada Regulatoria: 56 Citas / Día (07:00 AM a 01:45 PM)
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Se aplican estrictamente <strong className="text-amber-300">56 cupos diarios</strong> distribuidos en 28 intervalos de 15 minutos (2 citas por horario). Puede generar la jornada completa para una fecha específica o cargar su archivo CSV.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              type="date"
              value={targetJornadaDate}
              onChange={(e) => setTargetJornadaDate(e.target.value)}
              className="bg-transparent text-slate-100 text-xs outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => handleGenerate56Jornada(targetJornadaDate)}
            disabled={isProcessing}
            className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-lg transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generar 56 Citas Oficiales</span>
          </button>
        </div>
      </div>

      {/* ALERT / RECOVERY CARD IF THERE WERE OLD NON-EXTRANJERIA CSV CITAS */}
      {previousCsvNonExtranjeriaCount > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">
                Se detectaron {previousCsvNonExtranjeriaCount} citas previas cargadas por CSV con nomenclatura común o sin prefijo EXT-.
              </p>
              <p className="text-slate-300 mt-0.5">
                Puede convertirlas inmediatamente a la nomenclatura oficial de Extranjería o eliminarlas de la base de datos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleConvertPreviousCsv}
              disabled={isProcessing}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-md transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Convertir a EXT- ({previousCsvNonExtranjeriaCount})</span>
            </button>
            <button
              onClick={handleDeleteNonExtranjeriaCsv}
              disabled={isProcessing}
              className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 font-semibold px-3 py-1.5 rounded-md transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Ajenas</span>
            </button>
          </div>
        </div>
      )}

      {/* CSV INFORMATION HELP CARD */}
      <div className="bg-slate-950 border border-slate-800/60 rounded-lg p-4 flex gap-3 text-xs leading-relaxed text-slate-400">
        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <span className="font-bold text-slate-200">Reglas de Integración para Citas Masivas de Extranjería:</span>
          <p>
            1. El archivo CSV admite columnas separadas por comas (<code className="bg-slate-900 px-1 py-0.5 text-amber-300 font-mono">,</code>) o puntos y comas (<code className="bg-slate-900 px-1 py-0.5 text-amber-300 font-mono">;</code>).
          </p>
          <p>
            2. Cada registro se crea automáticamente bajo la categoría <strong className="text-amber-400">extranjeria</strong>, sede <strong className="text-slate-300">Sede Principal de Ancón</strong>, con tipo de identificación <strong className="text-slate-300">Pasaporte</strong> y código con prefijo <strong className="text-amber-400 font-mono">EXT-XXXXX</strong>.
          </p>
          <p>
            3. Los 3 requisitos oficiales (Nota de Migración, Fotocopia Carné y Fotocopia Pasaporte) quedan precargados para certificación directa por el Supervisor.
          </p>
        </div>
      </div>

      {/* STATUS MESSAGE */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-lg flex items-start gap-3 text-sm border ${
              importStatus.success 
                ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/20' 
                : 'bg-rose-950/30 text-rose-300 border-rose-500/20'
            }`}
          >
            {importStatus.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="font-medium">{importStatus.message}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRAG AND DROP ZONE OR PREVIEW */}
      {!file && parsedRows.length === 0 ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
            dragActive 
              ? 'border-amber-500 bg-amber-500/10' 
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept=".csv"
            className="hidden"
          />
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-full text-slate-400 shadow-lg">
            <Upload className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white">Arrastra y suelta tu archivo CSV de Extranjería aquí</p>
            <p className="text-xs text-slate-500">O haz clic para explorar tus archivos locales (.csv)</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* STATS OVERVIEW BENTO BOXES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Filas CSV</span>
              <span className="text-2xl font-black text-white mt-1">{totalRows}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Citas Extranjería Listas</span>
              <span className="text-2xl font-black text-amber-400 mt-1">{validRows}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500">Registros Inválidos</span>
              <span className="text-2xl font-black text-rose-400 mt-1">{invalidRows}</span>
            </div>
          </div>

          {/* PREVIEW TABLE CONTAINER */}
          <div className="border border-slate-800 bg-slate-950 rounded-lg overflow-hidden">
            <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Vista previa de citas de Extranjería</span>
                <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 font-mono">Prefijo EXT- garantizado</span>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Limpiar Archivo</span>
              </button>
            </div>
            
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3"># N°</th>
                    <th className="p-3">Código Generado</th>
                    <th className="p-3">Pasaporte / Doc</th>
                    <th className="p-3">Nombre Completo</th>
                    <th className="p-3">Fecha / Hora</th>
                    <th className="p-3">Resolución Migración</th>
                    <th className="p-3">Categoría Asignada</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {parsedRows.map((row) => (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-slate-900/40 transition-colors ${
                        !row.isValid ? 'bg-rose-950/5' : ''
                      }`}
                    >
                      <td className="p-3 font-mono text-amber-400 font-black">N° {row.numeroCitaDia}</td>
                      <td className="p-3 font-mono text-amber-300 font-bold">{row.codigoTransaccion}</td>
                      <td className="p-3 font-bold text-white">{row.datosPersonales.pasaporte || <span className="text-rose-500 font-normal italic">[Falta]</span>}</td>
                      <td className="p-3 max-w-xs truncate font-medium text-slate-200" title={row.datosPersonales.nombreCompleto}>
                        {row.datosPersonales.nombreCompleto || <span className="text-rose-500 font-normal italic">[Falta]</span>}
                      </td>
                      <td className="p-3 space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{row.fecha || <span className="text-rose-500 font-normal italic">[Falta]</span>}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{row.hora || <span className="text-rose-500 font-normal italic">[Falta]</span>}</span>
                        </div>
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-300 font-mono text-[11px]" title={row.resolucion}>
                        {row.resolucion}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase border bg-amber-950 text-amber-400 border-amber-800/40">
                          Extranjería (Ancón)
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-900/40">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Listo</span>
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/20 px-2 py-0.5 rounded-full border border-rose-900/40 cursor-help"
                            title="Por favor asegúrese de tener identificación, nombre, fecha y hora válidos."
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>Incompleto</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CONTROL SWITCH: AUTOPROCESS HISTÓRICO */}
          <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-200 block uppercase tracking-wider">Modo de Carga Histórica (Citas ya Atendidas)</span>
              <p className="text-[11px] text-slate-400">
                Al activar esta opción, el sistema marcará estas citas importadas directamente como <strong className="text-emerald-400">Atendidas (Realizadas)</strong> de forma automática, asignándoles operador y cubículo de atención para que aparezcan correctamente en todos los reportes operativos de Extranjería.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={markAsRealized}
                onChange={(e) => setMarkAsRealized(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-amber-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600/30 peer-checked:border-amber-500 border border-slate-700"></div>
              <span className="ml-2.5 text-xs font-bold text-slate-300">Marcar como Realizadas</span>
            </label>
          </div>

          {/* ACTION BUTTON ROW */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-300 transition cursor-pointer"
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={isProcessing || validRows === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent text-white shadow-lg transition duration-150 cursor-pointer"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 shrink-0" />
              )}
              <span>Importar {validRows} Citas a Extranjería (EXT-)</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
