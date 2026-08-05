import React, { useState, useEffect } from 'react';
import { TipoIdentificacion, DatosPersonales } from '../types';
import { ShieldCheck, RefreshCw, AlertCircle, Sparkles, Check } from 'lucide-react';

const NACIONALIDADES = [
  "Afgana", "Albana", "Alemana", "Andorrana", "Angoleña", "Antigüeña y Barbudense", "Árabe Saudí", "Argelina", "Argentina", "Armenia", 
  "Australiana", "Austríaca", "Azerbaiyana", "Bahameña", "Bangladesí", "Barbadense", "Bahréini", "Belga", "Beliceña", "Beninesa", 
  "Bielorrusa", "Birmana", "Boliviana", "Bosnia", "Botsuana", "Brasileña", "Bruneana", "Búlgara", "Burkinesa", "Burundesa", 
  "Butanesa", "Caboverdiana", "Camboyana", "Camerunesa", "Canadiense", "Catarí", "Centroafricana", "Chadiana", "Chilena", "China", 
  "Chipriota", "Colombiana", "Comorense", "Congoleña", "Norcoreana", "Surcoreana", "Marfileña", "Costarricense", "Croata", "Cubana", 
  "Danesa", "Dominiquesa", "Dominicana", "Ecuatoriana", "Egipcia", "Salvadoreña", "Emiratí", "Eritrea", "Eslovaca", "Eslovena", 
  "Española", "Estadounidense", "Estonia", "Etíope", "Filipina", "Finlandesa", "Fiyiana", "Francesa", "Gabonesa", "Gambiana", 
  "Georgiana", "Ghanesa", "Granadina", "Griega", "Guatemalteca", "Guineana", "Guyanesa", "Haitiana", "Hondureña", "Húngara", 
  "India", "Indonesia", "Iraquí", "Iraní", "Irlandesa", "Islandesa", "Israelí", "Italiana", "Jamaicana", "Japonesa", 
  "Jordana", "Kazaja", "Keniana", "Kirguís", "Kiribatiana", "Kuwaití", "Laosiana", "Lesotense", "Letona", "Libanesa", 
  "Liberiana", "Libia", "Liechtensteiniana", "Lituana", "Luxemburguesa", "Macedona", "Madagascariense", "Malasia", "Malauí", "Maldiva", 
  "Maliense", "Maltesa", "Marroquí", "Mauriciana", "Mauritana", "Mexicana", "Micronesia", "Moldava", "Monegasca", "Mongola", 
  "Montenegrina", "Mozambiqueña", "Namibiana", "Nauruana", "Nepalesa", "Nicaragüense", "Nigeriana", "Nigerina", "Noruega", "Neozelandesa", 
  "Omaní", "Neerlandesa", "Pakistaní", "Palaosiana", "Palestina", "Panameña", "Papú", "Paraguaya", "Peruana", "Polaca", 
  "Portuguesa", "Británica", "Ruandesa", "Rumana", "Rusa", "Samoana", "Sancristobaleña", "Sanmarinense", "Sanvicentina", "Santalucense", 
  "Santotomense", "Senegalesa", "Serbia", "Seychellense", "Sierraleonesa", "Singapurense", "Siria", "Somalí", "Srilankesa", "Suazi", 
  "Sudafricana", "Sudanesa", "Sueca", "Suiza", "Surinamesa", "Tailandesa", "Tanzana", "Tayika", "Togolesa", "Tongana", 
  "Trinitense", "Tunecina", "Turca", "Turcomana", "Tuvaluana", "Ucraniana", "Ugandesa", "Uruguaya", "Uzbeka", "Vanuatuense", 
  "Vaticana", "Venezolana", "Vietnamita", "Yemení", "Yibutiana", "Zambiana", "Zimbabuense"
];

interface FormularioDatosProps {
  initialData?: DatosPersonales;
  onSuccess: (data: DatosPersonales) => void;
  onBack?: () => void;
  selectedSubServicioId?: string | null;
  selectedCategoria?: string | null;
  cmsConfig?: any;
}

export default function FormularioDatos({ initialData, onSuccess, onBack, selectedSubServicioId, selectedCategoria, cmsConfig }: FormularioDatosProps) {
  const [tipoIdentificacion, setTipoIdentificacion] = useState<TipoIdentificacion>(
    initialData?.tipoIdentificacion || 'Cedula'
  );
  const [identificacion, setIdentificacion] = useState(initialData?.identificacion || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(initialData?.fechaNacimiento || '');
  const [telefono, setTelefono] = useState(initialData?.telefono || '');
  const [correo, setCorreo] = useState(initialData?.correo || '');
  const [nombreCompleto, setNombreCompleto] = useState(initialData?.nombreCompleto || '');
  const [numeroSeguimiento, setNumeroSeguimiento] = useState(initialData?.numeroSeguimiento || '');
  const [tieneDiscapacidad, setTieneDiscapacidad] = useState<boolean>(initialData?.tieneDiscapacidad || false);

  // Campos específicos para el trámite de extranjería
  const [primerNombre, setPrimerNombre] = useState(initialData?.primerNombre || '');
  const [segundoNombre, setSegundoNombre] = useState(initialData?.segundoNombre || '');
  const [primerApellido, setPrimerApellido] = useState(initialData?.primerApellido || '');
  const [segundoApellido, setSegundoApellido] = useState(initialData?.segundoApellido || '');
  const [pasaporte, setPasaporte] = useState(initialData?.pasaporte || (selectedCategoria === 'extranjeria' ? initialData?.identificacion || '' : ''));
  const [nacionalidad, setNacionalidad] = useState(initialData?.nacionalidad || '');
  const [fechaResolucion, setFechaResolucion] = useState(initialData?.fechaResolucion || '');
  const [numeroResolucion, setNumeroResolucion] = useState(initialData?.numeroResolucion || '');
  const [fechaVencimiento, setFechaVencimiento] = useState(initialData?.fechaVencimiento || '');

  const isRenovacion = selectedSubServicioId ? selectedSubServicioId.toLowerCase().includes('renovacion') : false;

  // Math Captcha state
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operativo, setOperativo] = useState<'+' | '-'>('+');
  const [captchaRes, setCaptchaRes] = useState('');
  const [captchaCorrectState, setCaptchaCorrectState] = useState<boolean | null>(null);
  const [verifyingPassport, setVerifyingPassport] = useState(false);

  // Error messages
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Generate math captcha
  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 12) + 5; // 5 to 16
    const n2 = Math.floor(Math.random() * 10) + 1; // 1 to 10
    const ops: ('+' | '-')[] = ['+', '-'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    
    setNum1(n1);
    setNum2(n2);
    setOperativo(op);
    setCaptchaRes('');
    setCaptchaCorrectState(null);
  };

  useEffect(() => {
    generateCaptcha();

    // Seed default expedientes for "Pasados de Edad" if not present
    try {
      const stored = localStorage.getItem('te_panama_historical_expedientes');
      if (!stored) {
        const seed = [
          {
            id: "NºSP-26-888-999",
            number: "NºSP-26-888-999",
            citizenName: "Roberto Carlos Alvarado",
            identificacion: "8-111-2222",
            fechaNacimiento: "1978-11-05",
            correo: "roberto.alvarado@example.com",
            telefono: "6222-3333",
            notes: "Creado de forma automática por el Supervisor/SuperIT al programar cita directa.",
            fechaCreacion: new Date().toISOString()
          },
          {
            id: "Nº26-123-456",
            number: "Nº26-123-456",
            citizenName: "Oscar González G.",
            identificacion: "8-999-9999",
            fechaNacimiento: "1975-04-12",
            correo: "oscargave3003@gmail.com",
            telefono: "6123-4567",
            notes: "Expediente de prueba pre-autorizado por la Dirección de Registro Civil",
            fechaCreacion: new Date().toISOString()
          },
          {
            id: "Nº54-474-325",
            number: "Nº54-474-325",
            citizenName: "Ana María Espinoza",
            identificacion: "4-789-1234",
            fechaNacimiento: "1980-08-30",
            correo: "ana.espinoza@example.com",
            telefono: "6987-6543",
            notes: "Filiación biométrica tardía aprobada",
            fechaCreacion: new Date().toISOString()
          }
        ];
        localStorage.setItem('te_panama_historical_expedientes', JSON.stringify(seed));
      }
    } catch (e) {
      console.warn('Could not seed default expedientes', e);
    }
  }, []);

  // Validate the answer dynamically or while editing
  useEffect(() => {
    if (captchaRes.trim() === '') {
      setCaptchaCorrectState(null);
      return;
    }
    const parsedAns = parseInt(captchaRes, 10);
    const correctAns = operativo === '+' ? num1 + num2 : num1 - num2;
    if (parsedAns === correctAns) {
      setCaptchaCorrectState(true);
    } else {
      setCaptchaCorrectState(false);
    }
  }, [captchaRes, num1, num2, operativo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyingPassport) return;
    const newErrors: { [key: string]: string } = {};

    if (selectedCategoria === 'extranjeria') {
      if (!primerNombre.trim()) {
        newErrors.primerNombre = 'El primer nombre es obligatorio';
      }
      if (!primerApellido.trim()) {
        newErrors.primerApellido = 'El primer apellido es obligatorio';
      }
      if (!correo.trim()) {
        newErrors.correo = 'El correo electrónico es obligatorio';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        newErrors.correo = 'Ingrese un formato de correo electrónico válido';
      }
      if (!pasaporte.trim()) {
        newErrors.pasaporte = 'El número de pasaporte es obligatorio';
      }
      if (!nacionalidad.trim()) {
        newErrors.nacionalidad = 'La nacionalidad es obligatoria';
      }
      if (!fechaResolucion) {
        newErrors.fechaResolucion = 'La fecha de resolución es de carácter obligatorio';
      }
      if (!numeroResolucion.trim()) {
        newErrors.numeroResolucion = 'El número de resolución es obligatorio';
      }

      // Verify Captcha math
      const correctAns = operativo === '+' ? num1 + num2 : num1 - num2;
      const userAns = parseInt(captchaRes, 10);
      if (!captchaRes) {
        newErrors.captcha = 'Debe resolver la operación matemática de control';
      } else if (isNaN(userAns) || userAns !== correctAns) {
        newErrors.captcha = 'Operación errónea. Inténtelo de nuevo o genere otro desafío';
        setCaptchaCorrectState(false);
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Se permite cualquier número de pasaporte alfanumérico o numérico sin restricciones de base de datos
      setVerifyingPassport(false);

      setErrors({});
      onSuccess({
        tipoIdentificacion: 'Pasaporte',
        identificacion: pasaporte.trim().toUpperCase(),
        fechaNacimiento: fechaResolucion,
        telefono: 'N/A',
        correo: correo.trim(),
        primerNombre: primerNombre.trim(),
        segundoNombre: segundoNombre.trim(),
        primerApellido: primerApellido.trim(),
        segundoApellido: segundoApellido.trim(),
        pasaporte: pasaporte.trim().toUpperCase(),
        nacionalidad: nacionalidad.trim(),
        fechaResolucion,
        numeroResolucion: numeroResolucion.trim(),
        tieneDiscapacidad
      });
      return;
    }

    // Basic Fields validation (for normal categories)
    if (!nombreCompleto.trim()) {
      newErrors.nombreCompleto = 'El nombre completo es obligatorio';
    }

    if (!identificacion.trim()) {
      newErrors.identificacion = 'Ingrese su número de documento o cédula';
    } else if (tipoIdentificacion === 'Cedula' && !/^\d+-(\d+)-\d+$/.test(identificacion.trim()) && identificacion.length < 5) {
      newErrors.identificacion = 'Por favor, ingrese un formato de cédula válido (ej. 8-712-345)';
    }

    if (!fechaNacimiento) {
      newErrors.fechaNacimiento = 'La fecha de nacimiento es de carácter obligatorio';
    } else {
      // Check if rational age
      const birth = new Date(fechaNacimiento);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 0 || age > 115) {
        newErrors.fechaNacimiento = 'Ingrese una fecha de nacimiento válida';
      } else if (tipoIdentificacion === 'Cedula' && age < 18) {
        newErrors.fechaNacimiento = 'La cédula de adulto es válida únicamente para mayores de 18 años';
      } else if (tipoIdentificacion === 'CedulaJuvenil' && age >= 18) {
        newErrors.fechaNacimiento = 'La cédula juvenil corresponde únicamente a menores de 18 años';
      }
    }

    if (!telefono.trim()) {
      newErrors.telefono = 'Ingrese su número telefónico de contacto';
    } else if (!/^[2368]\d{3}-?\d{4}$/.test(telefono.trim().replace(/\s/g, '')) && telefono.trim().length < 7) {
      newErrors.telefono = 'Ingrese un número de teléfono válido en Panamá (ej: 6123-4567)';
    }

    if (!correo.trim()) {
      newErrors.correo = 'El correo electrónico es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      newErrors.correo = 'Ingrese un formato de correo electrónico válido';
    }

    // Tracking number is mandatory for pasada de edad
    const isPasadoEdad = selectedSubServicioId === 'ced_pasados_edad';
    if (isPasadoEdad) {
      if (!numeroSeguimiento.trim()) {
        newErrors.numeroSeguimiento = 'El número de seguimiento de expediente es obligatorio para este trámite';
      } else if (numeroSeguimiento.trim().length < 4) {
        newErrors.numeroSeguimiento = 'Ingrese un número de seguimiento válido de mínimo 4 caracteres';
      } else {
        // Strict platform registration validation
        try {
          const stored = localStorage.getItem('te_panama_historical_expedientes');
          let isValid = false;
          let citizenDetails: any = null;
          if (stored) {
            const list = JSON.parse(stored);
            if (Array.isArray(list)) {
              const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              const cleanedInput = clean(numeroSeguimiento);
              const found = list.find((item: any) => {
                const itemNum = item.number || item.id || '';
                return clean(itemNum) === cleanedInput;
              });
              if (found) {
                isValid = true;
                citizenDetails = found;
              }
            }
          }
          if (!isValid) {
            newErrors.numeroSeguimiento = `Número de expediente no ubicado en el control de la base de datos. El trámite requiere de un proceso previamente aprobado que le dará un número de expediente, favor escribir a verificacionid@tribunal-electoral.gob.pa o entrar a la página del tribunal-electoral.gob.pa, para revisar sus requisitos.`;
          } else if (citizenDetails) {
            // Update tracking value to official casing/formatting
            if (citizenDetails.number && citizenDetails.number !== numeroSeguimiento) {
              setNumeroSeguimiento(citizenDetails.number);
            }
            // Auto pre-fill citizen name if empty to avoid mismatched inputs
            if (citizenDetails.citizenName && !nombreCompleto.trim()) {
              setNombreCompleto(citizenDetails.citizenName);
            }
          }
        } catch (e) {
          console.error('Error verifying platform expediente', e);
        }
      }
    }

    // Validation for Renewal: limit check configured by admin
    if (isRenovacion) {
      if (!fechaVencimiento) {
        newErrors.fechaVencimiento = 'La fecha de vencimiento de su cédula/documento actual es obligatoria';
      } else {
        const todayVal = new Date();
        const expDate = new Date(fechaVencimiento);
        
        const limitMonths = parseInt(cmsConfig?.customTexts?.renovacionMesesAnticipacion || '6', 10) || 6;
        const limitDate = new Date();
        limitDate.setMonth(limitDate.getMonth() + limitMonths);
        
        if (expDate > limitDate) {
          let customErrorMsg = cmsConfig?.customTexts?.msgNoCumpleRenovacion || 'No cumple. El trámite de renovación de cédula solo puede realizarse con un máximo de {meses} meses de anticipación a su vencimiento (o si está vencida).';
          customErrorMsg = customErrorMsg.replace('{meses}', limitMonths.toString());
          newErrors.fechaVencimiento = customErrorMsg;
        }
      }
    }

    // Verify Catcha math
    const correctAns = operativo === '+' ? num1 + num2 : num1 - num2;
    const userAns = parseInt(captchaRes, 10);
    if (!captchaRes) {
      newErrors.captcha = 'Debe resolver la operación matemática de control';
    } else if (isNaN(userAns) || userAns !== correctAns) {
      newErrors.captcha = 'Operación errónea. Inténtelo de nuevo o genere otro desafío';
      setCaptchaCorrectState(false);
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Se permite cualquier número de pasaporte alfanumérico o numérico sin restricciones de base de datos
    if (tipoIdentificacion === 'Pasaporte') {
      setVerifyingPassport(false);
    }

    setErrors({});
    onSuccess({
      tipoIdentificacion,
      identificacion: identificacion.trim(),
      fechaNacimiento,
      telefono: telefono.trim(),
      correo: correo.trim(),
      nombreCompleto: nombreCompleto.trim(),
      numeroSeguimiento: isPasadoEdad ? numeroSeguimiento.trim() : undefined,
      fechaVencimiento: isRenovacion ? fechaVencimiento : undefined,
      tieneDiscapacidad,
    });
  };

  const getPlaceholder = () => {
    switch (tipoIdentificacion) {
      case 'Cedula':
        return 'Ej: 8-824-1109';
      case 'CedulaJuvenil':
        return 'Ej: 8-1024-998PE';
      case 'Extranjero':
        return 'Ej: PE-4-1234';
      case 'Pasaporte':
        return 'Ej: PA0987152';
    }
  };

  const getHelperText = () => {
    switch (tipoIdentificacion) {
      case 'Cedula':
        return 'Cédula de identidad nacional para ciudadanos adultos.';
      case 'CedulaJuvenil':
        return 'Válida para personas panameñas menores de edad.';
      case 'Extranjero':
        return 'Documento de identidad nacional para residentes extranjeros permanentes.';
      case 'Pasaporte':
        return 'Válido para ciudadanos extranjeros que aún no poseen cédula PE.';
    }
  };

  if (selectedCategoria === 'extranjeria') {
    return (
      <form onSubmit={handleSubmit} id="form-datos-personales" className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 space-y-6 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Formulario de Trámite de Extranjería</h3>
              <p className="text-xs text-slate-500 font-medium">Complete los siguientes campos requeridos para la confirmación de su cita migratoria.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Primer Nombre */}
            <div className="flex flex-col gap-1.5 animate-slide-up">
              <label htmlFor="p_nombre" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Primer Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="p_nombre"
                value={primerNombre}
                onChange={(e) => setPrimerNombre(e.target.value)}
                placeholder="Ej: John"
                className={`h-11 w-full bg-white border ${
                  errors.primerNombre ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
                } rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 transition`}
              />
              {errors.primerNombre && (
                <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.primerNombre}
                </span>
              )}
            </div>

            {/* Segundo Nombre */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="s_nombre" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Segundo Nombre
              </label>
              <input
                type="text"
                id="s_nombre"
                value={segundoNombre}
                onChange={(e) => setSegundoNombre(e.target.value)}
                placeholder="Ej: Robert (Opcional)"
                className="h-11 w-full bg-white border border-slate-300 rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-700 transition"
              />
            </div>

            {/* Primer Apellido */}
            <div className="flex flex-col gap-1.5 animate-slide-up">
              <label htmlFor="p_apellido" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Primer Apellido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="p_apellido"
                value={primerApellido}
                onChange={(e) => setPrimerApellido(e.target.value)}
                placeholder="Ej: Smith"
                className={`h-11 w-full bg-white border ${
                  errors.primerApellido ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
                } rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 transition`}
              />
              {errors.primerApellido && (
                <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.primerApellido}
                </span>
              )}
            </div>

            {/* Segundo Apellido */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="s_apellido" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Segundo Apellido
              </label>
              <input
                type="text"
                id="s_apellido"
                value={segundoApellido}
                onChange={(e) => setSegundoApellido(e.target.value)}
                placeholder="Ej: Doe (Opcional)"
                className="h-11 w-full bg-white border border-slate-300 rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-700 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Pasaporte */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ext_pasaporte" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pasaporte <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ext_pasaporte"
                value={pasaporte}
                onChange={(e) => setPasaporte(e.target.value)}
                placeholder="Ej: PA0987152"
                className={`h-11 w-full bg-white border ${
                  errors.pasaporte ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
                } rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 transition font-mono uppercase`}
              />
              {errors.pasaporte ? (
                <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.pasaporte}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium mt-1">
                  Este pasaporte debe coincidir con el registro aprobado en la base de Extranjería.
                </span>
              )}
            </div>

            {/* Nacionalidad */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ext_nacionalidad" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nacionalidad <span className="text-red-500">*</span>
              </label>
              <select
                id="ext_nacionalidad"
                value={nacionalidad}
                onChange={(e) => setNacionalidad(e.target.value)}
                className={`h-11 w-full bg-white border ${
                  errors.nacionalidad ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
                } rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 transition cursor-pointer`}
              >
                <option value="">-- Seleccione su nacionalidad --</option>
                {NACIONALIDADES.map((nac) => (
                  <option key={nac} value={nac}>
                    {nac}
                  </option>
                ))}
              </select>
              {errors.nacionalidad && (
                <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.nacionalidad}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Correo Electrónico */}
            <div className="flex flex-col gap-1.5 md:col-span-1 col-span-1">
              <label htmlFor="ext_correo" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="ext_correo"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Ej: mi_correo@gmail.com"
                className={`h-11 w-full bg-white border ${
                  errors.correo ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
                } rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 transition`}
              />
              {errors.correo ? (
                <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.correo}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium mt-1">
                  Se enviará el comprobante digital a este email.
                </span>
              )}
            </div>

            {/* Número de Resolución */}
            <div className="flex flex-col gap-1.5 md:col-span-1 col-span-1">
              <label htmlFor="ext_num_resolucion" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Número de Resolución <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ext_num_resolucion"
                value={numeroResolucion}
                onChange={(e) => setNumeroResolucion(e.target.value)}
                placeholder="Ej: RESOL-2026-8492"
                className={`h-11 w-full bg-white border ${
                  errors.numeroResolucion ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
                } rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 transition font-mono`}
              />
              {errors.numeroResolucion && (
                <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.numeroResolucion}
                </span>
              )}
            </div>

            {/* Fecha de Resolución */}
            <div className="flex flex-col gap-1.5 md:col-span-1 col-span-1">
              <label htmlFor="ext_fecha_resolucion" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Fecha de Resolución <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="ext_fecha_resolucion"
                value={fechaResolucion}
                onChange={(e) => setFechaResolucion(e.target.value)}
                className={`h-11 w-full bg-white border ${
                  errors.fechaResolucion ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
                } rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 transition cursor-pointer`}
              />
              {errors.fechaResolucion && (
                <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.fechaResolucion}
                </span>
              )}
            </div>
          </div>

          {/* Discapacidad Checkbox */}
          <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg transition hover:bg-slate-100">
            <input
              type="checkbox"
              id="ext_tiene_discapacidad_id"
              checked={tieneDiscapacidad}
              onChange={(e) => setTieneDiscapacidad(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <div className="flex flex-col gap-0.5 cursor-pointer select-none" onClick={() => setTieneDiscapacidad(!tieneDiscapacidad)}>
              <label htmlFor="ext_tiene_discapacidad_id" className="text-xs font-bold text-slate-800 cursor-pointer">
                Indique si tiene alguna discapacidad (marque la casilla si aplica)
              </label>
              <span className="text-[11px] text-slate-500">
                Esta información nos ayuda a brindarle una atención preferencial y adecuada a sus necesidades.
              </span>
            </div>
          </div>
        </div>

        {/* Control Matemática - CAPTCHA */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              <div>
                <h4 className="text-sm font-bold text-slate-800 tracking-tight">Filtro de Seguridad Antirobot</h4>
                <p className="text-xs text-slate-500 font-medium">Resuelva este cálculo para autorizar el acceso a los servicios.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={generateCaptcha}
              title="Generar otra operación matemática"
              className="p-1 px-2.5 rounded hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 text-xs font-bold border border-slate-300 bg-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generar otro</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between pt-1">
            <div className="flex items-center gap-3 bg-white border border-slate-300 shadow-sm rounded px-5 py-2.5 select-none font-mono text-xl font-bold text-slate-700">
              <span>{num1}</span>
              <span className="text-blue-700 text-xl font-bold">{operativo}</span>
              <span>{num2}</span>
              <span className="text-slate-400 font-normal">=</span>
              <span className="text-slate-300">?</span>
            </div>

            <div className="flex-1 w-full max-w-xs">
              <div className="relative">
                <input
                  type="number"
                  value={captchaRes}
                  onChange={(e) => setCaptchaRes(e.target.value)}
                  placeholder="Respuesta"
                  className={`w-full h-11 bg-white border text-center font-bold text-lg rounded focus:outline-none focus:ring-2 transition ${
                    captchaCorrectState === true
                      ? 'border-emerald-500 text-emerald-700 focus:ring-emerald-200 bg-emerald-50/25'
                      : captchaCorrectState === false
                      ? 'border-red-400 text-red-700 focus:ring-red-200'
                      : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
                  }`}
                />
                {captchaCorrectState === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 bg-emerald-100 p-0.5 rounded-full">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              
              {errors.captcha && (
                <span className="flex items-center gap-1 text-[11px] text-red-500 mt-1.5 justify-center sm:justify-start font-medium leading-none animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.captcha}
                </span>
              )}
              {captchaCorrectState === true && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1.5 font-bold justify-center sm:justify-start animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" /> ¡Filtro de seguridad superado con éxito!
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto h-12 px-6 rounded border border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-50 transition cursor-pointer text-center flex items-center justify-center"
            >
              Regresar
            </button>
          ) : (
            <div className="hidden sm:block"></div>
          )}

          <button
            type="submit"
            disabled={verifyingPassport}
            className="w-full sm:w-auto h-12 bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 rounded shadow-lg shadow-blue-100 transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-75"
          >
            {verifyingPassport ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Verificando pasaporte...</span>
              </>
            ) : (
              <>
                <span>Siguiente: Oficina y Fecha</span>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} id="form-datos-personales" className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Datos Personales del Solicitante</h3>
            <p className="text-xs text-slate-500 font-medium">Ingrese la información del titular de la cita tal como aparece en su documento oficial.</p>
          </div>
        </div>

        {/* Tipo de Identificación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tipo_id" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tipo de Identificación <span className="text-red-500">*</span>
            </label>
            <select
              id="tipo_id"
              value={tipoIdentificacion}
              onChange={(e) => {
                setTipoIdentificacion(e.target.value as TipoIdentificacion);
                setIdentificacion('');
                setErrors((prev) => ({ ...prev, identificacion: '' }));
              }}
              className="h-11 w-full bg-white border border-slate-300 rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-700 transition cursor-pointer"
            >
              <option value="Cedula">Cédula de adulto (Nacional)</option>
              <option value="CedulaJuvenil">Cédula Juvenil (Menor de edad)</option>
              <option value="Extranjero">Cédula de Extranjero (PE)</option>
              <option value="Pasaporte">Pasaporte extranjero</option>
            </select>
            <span className="text-[11px] text-slate-500 font-medium mt-1">
              {getHelperText()}
            </span>
          </div>

          {/* Cédula o Identificación */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="input_id" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Número de Identificación <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="input_id"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
              placeholder={getPlaceholder()}
              className={`h-11 w-full bg-white border ${
                errors.identificacion ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
              } rounded px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition`}
            />
            {errors.identificacion ? (
              <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.identificacion}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium mt-1">
                Ingrese el número exactamente como aparece en su documento físico.
              </span>
            )}
          </div>
        </div>

        {/* Nombre Completo */}
        <div className="flex flex-col gap-1.5 animate-slide-up">
          <label htmlFor="nombre_completo" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Nombre Completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="nombre_completo"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            placeholder="Ej: Juan Antonio Pérez Rodríguez"
            className={`h-11 w-full bg-white border ${
              errors.nombreCompleto ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
            } rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 transition`}
          />
          {errors.nombreCompleto ? (
            <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.nombreCompleto}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium mt-1">
              Ingrese su nombre completo tal como aparece en su documento de identidad.
            </span>
          )}
        </div>

        {/* Fecha de nacimiento, teléfono y correo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Fecha Nacimiento */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fecha_nac" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Fecha de Nacimiento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="fecha_nac"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className={`h-11 w-full bg-white border ${
                errors.fechaNacimiento ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
              } rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 transition cursor-pointer`}
            />
            {errors.fechaNacimiento && (
              <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.fechaNacimiento}
              </span>
            )}
          </div>

          {/* Teléfono */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tel_id" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Teléfono de Contacto <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="tel_id"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 6123-4567"
              className={`h-11 w-full bg-white border ${
                errors.telefono ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
              } rounded px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition`}
            />
            {errors.telefono ? (
              <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.telefono}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium mt-1">Celular o residencial de 7 u 8 dígitos.</span>
            )}
          </div>

          {/* Correo Electrónico */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="correo_id" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Correo Electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="correo_id"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Ej: usuario@outlook.com"
              className={`h-11 w-full bg-white border ${
                errors.correo ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
              } rounded px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition`}
            />
            {errors.correo ? (
              <span className="flex items-center gap-1 text-[11px] text-red-500 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.correo}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium mt-1">Se enviará el comprobante digital a este email.</span>
            )}
          </div>
        </div>

        {/* Discapacidad Checkbox */}
        <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg transition hover:bg-slate-100">
          <input
            type="checkbox"
            id="tiene_discapacidad_id"
            checked={tieneDiscapacidad}
            onChange={(e) => setTieneDiscapacidad(e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <div className="flex flex-col gap-0.5 cursor-pointer select-none" onClick={() => setTieneDiscapacidad(!tieneDiscapacidad)}>
            <label htmlFor="tiene_discapacidad_id" className="text-xs font-bold text-slate-800 cursor-pointer">
              Indique si tiene alguna discapacidad (marque la casilla si aplica)
            </label>
            <span className="text-[11px] text-slate-500">
              Esta información nos ayuda a brindarle una atención preferencial y adecuada a sus necesidades.
            </span>
          </div>
        </div>

        {/* Tracking number conditional input field */}
        {selectedSubServicioId === 'ced_pasados_edad' && (
          <div className="border-t border-slate-100 pt-5 mt-5 flex flex-col gap-1.5 animate-fade-in">
            <label htmlFor="num_seg_id" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-900">
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">Requerido</span>
              Número de Seguimiento de Expediente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="num_seg_id"
              value={numeroSeguimiento}
              onChange={(e) => setNumeroSeguimiento(e.target.value)}
              placeholder="Ej: Nº26-847-293"
              className={`h-11 w-full bg-slate-50 border ${
                errors.numeroSeguimiento ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
              } rounded px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition font-mono`}
            />
            {errors.numeroSeguimiento ? (
              <span className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.numeroSeguimiento}
              </span>
            ) : (
              <span className="text-[11px] text-slate-550 font-medium mt-1">
                Ingrese el número de expediente de trámite tardío que le fue asignado previamente por la Dirección General de Registro Civil o Cedulación.
              </span>
            )}
          </div>
        )}

        {/* Fecha de Vencimiento para renovación */}
        {isRenovacion && (
          <div className="border-t border-slate-100 pt-5 mt-5 flex flex-col gap-1.5 animate-fade-in">
            <label htmlFor="fecha_venc_id" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-blue-900">
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">Requerido</span>
              Fecha de Vencimiento de Cédula/Documento Actual <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="fecha_venc_id"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className={`h-11 w-full bg-slate-50 border ${
                errors.fechaVencimiento ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
              } rounded px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 transition cursor-pointer`}
            />
            {errors.fechaVencimiento ? (
              <div className="flex items-start gap-2 text-xs text-red-600 mt-2 font-semibold bg-red-50 p-3 rounded-lg border border-red-200/50">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> 
                <span className="leading-snug">{errors.fechaVencimiento}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium mt-1">
                La renovación de su cédula o carné de residente únicamente está autorizada si faltan {cmsConfig?.customTexts?.renovacionMesesAnticipacion || "6"} meses o menos para que expire (o si ya se encuentra caducado/a).
              </span>
            )}
          </div>
        )}
      </div>

      {/* Control Matemática - CAPTCHA (Cacsha) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <div>
              <h4 className="text-sm font-bold text-slate-800 tracking-tight">Filtro de Seguridad Antirobot</h4>
              <p className="text-xs text-slate-500 font-medium">Resuelva este cálculo para autorizar el acceso a los servicios.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={generateCaptcha}
            title="Generar otra operación matemática"
            className="p-1 px-2.5 rounded hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 text-xs font-bold border border-slate-300 bg-white cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generar otro</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between pt-1">
          {/* Visual Equation Card */}
          <div className="flex items-center gap-3 bg-white border border-slate-300 shadow-sm rounded px-5 py-2.5 select-none font-mono text-xl font-bold text-slate-700">
            <span>{num1}</span>
            <span className="text-blue-700 text-xl font-bold">{operativo}</span>
            <span>{num2}</span>
            <span className="text-slate-400 font-normal">=</span>
            <span className="text-slate-300">?</span>
          </div>

          {/* User Answer Field */}
          <div className="flex-1 w-full max-w-xs">
            <div className="relative">
              <input
                type="number"
                value={captchaRes}
                onChange={(e) => setCaptchaRes(e.target.value)}
                placeholder="Respuesta"
                className={`w-full h-11 bg-white border text-center font-bold text-lg rounded focus:outline-none focus:ring-2 transition ${
                  captchaCorrectState === true
                    ? 'border-emerald-500 text-emerald-700 focus:ring-emerald-200 bg-emerald-50/25'
                    : captchaCorrectState === false
                    ? 'border-red-400 text-red-700 focus:ring-red-200'
                    : 'border-slate-300 focus:ring-blue-600 focus:border-blue-700'
                }`}
              />
              {captchaCorrectState === true && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 bg-emerald-100 p-0.5 rounded-full">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                </div>
              )}
            </div>
            
            {errors.captcha && (
              <span className="flex items-center gap-1 text-[11px] text-red-500 mt-1.5 justify-center sm:justify-start font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.captcha}
              </span>
            )}
            {captchaCorrectState === true && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1.5 font-bold justify-center sm:justify-start">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> ¡Filtro de seguridad superado con éxito!
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto h-12 px-6 rounded border border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-50 transition cursor-pointer text-center flex items-center justify-center"
          >
            Regresar
          </button>
        ) : (
          <div className="hidden sm:block"></div>
        )}

        <button
          type="submit"
          disabled={verifyingPassport}
          className="w-full sm:w-auto h-12 bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 rounded shadow-lg shadow-blue-100 transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-75"
        >
          {verifyingPassport ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Verificando pasaporte...</span>
            </>
          ) : (
            <>
              <span>Siguiente: Oficina y Fecha</span>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

