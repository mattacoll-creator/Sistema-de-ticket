import { CategoriaServicio, Sucursal } from './types';

export const SERVICIOS_TRIBUNAL: CategoriaServicio[] = [
  {
    id: 'registro_civil',
    nombre: 'Registro Civil',
    descripcion: 'Certificados de nacimiento, matrimonio, defunción y otros trámites del estado civil de las personas.',
    icono: 'FileText',
    subServicios: [
      {
        id: 'rc_nacimiento',
        nombre: 'Certificado de Nacimiento',
        descripcion: 'Expedición de certificados oficiales para trámites escolares, legales o de viaje.',
        requisitos: [
          'Proporcionar al funcionario el número de inscripción de nacimiento del titular (cédula) o el número de cédula de los padres.',
          'Costo de B/. 5.00',
          'Tercera persona:',
          'Número de cédula del solicitante.',
          'Nota de autorización por parte del solicitante notariada.'
        ]
      },
      {
        id: 'rc_matrimonio',
        nombre: 'Certificado de Matrimonio',
        descripcion: 'Documento que certifica el enlace de matrimonio inscrito legalmente.',
        requisitos: [
          'Proporcionar al funcionario, de contar con la información, el número de cédula de cualquiera de los contrayentes.',
          'Número de acta del matrimonio.',
          'Costo (B/.5.00)'
        ]
      },
      {
        id: 'rc_defuncion',
        nombre: 'Certificado de Defunción',
        descripcion: 'Expedición de actas para trámites legales de herencias o procesos luctuosos.',
        requisitos: [
          'De contar con la información proporcionar al funcionario el número de cédula o inscripción de nacimiento de la persona, de quien se solicita el certificado de defunción.',
          'Número de acta de defunción.',
          'En caso de ser una persona no relacionada con el fallecido, aportar una autorización escrita por la familia de primer grado de consanguineidad y/o afinidad.',
          'El Certificado de Defunción con Causa de Muerte, se expiden en las oficinas del Tribunal Electoral.',
          'Costo B/5.00'
        ]
      },
      {
        id: 'rc_inscripcion',
        nombre: 'Inscripción de Nacimiento / Matrimonio',
        descripcion: 'Registro oficial de un nuevo nacimiento o de un enlace matrimonial civil.',
        requisitos: [
          'Parte clínico del hospital/partera (para nacimientos).',
          'Acta matrimonial original de la notaría o juzgado.',
          'Cédulas vigentes de los padres o contrayentes.'
        ]
      }
    ]
  },
  {
    id: 'cedulacion',
    nombre: 'Cedulación',
    descripcion: 'Documento de identidad personal (cédula y carné de residente permanente): trámite para obtención, renovación y duplicado.',
    icono: 'IdCard',
    subServicios: [
      {
        id: 'ced_primera_vez',
        nombre: 'Cédula por primera vez (18 años hasta 20 años)',
        descripcion: 'Panameños que alcanzan la mayoría de edad',
        requisitos: [
          'Trámite gratuito',
          'Tener 18 años cumplidos.',
          'Presentarse personalmente',
          '• Instrucciones para toma de fotografía:',
          'Vestimenta: podrá usar ropa de cualquier color, excepto blanco, y deberá mantener los hombros cubiertos para evitar interferencias visuales. En caso de que utilice velo o toca como parte de su vestimenta, debe dejar expuesta la frente, el rostro y las orejas, asegurando la plena visibilidad de los rasgos faciales.',
          'Cabello: El titular deberá mantener el cabello recogido detrás de las orejas, permitiendo que el contorno del rostro sea completamente visible.',
          'Accesorios: Se permitirán únicamente aretes pequeños, no grandes ni llamativos. No se permite el uso de piercings faciales, salvo que sean permanentes o constituyan una expresión cultural de pueblos originarios, tampoco se permite el uso de gorra, sombrero u otro accesorio en la cabeza que pueda ocultar o distorsionar rasgos faciales.'
        ]
      },
      {
        id: 'ced_renovacion',
        nombre: 'Renovación de Cédula',
        descripcion: 'Cédula vencida o por vencer (6 meses antes de su vencimiento)',
        requisitos: [
          'Trámite gratuito',
          'Presentarse personalmente',
          'Presentar la cédula de identidad vencida o por vencer (6 meses antes).',
          '• Instrucciones para toma de fotografía:',
          'Vestimenta: podrá usar ropa de cualquier color, excepto blanco, y deberá mantener los hombros cubiertos para evitar interferencias visuales. En caso de que utilice velo o toca como parte de su vestimenta, debe dejar expuesta la frente, el rostro y las orejas, asegurando la plena visibilidad de los rasgos faciales.',
          'Cabello: El titular deberá mantener el cabello recogido detrás de las orejas, permitiendo que el contorno del rostro sea completamente visible.',
          'Accesorios: Se permitirán únicamente aretes pequeños, no grandes ni llamativos. No se permite el uso de piercings faciales, salvo que sean permanentes o constituyan una expresión cultural de pueblos originarios, tampoco se permite el uso de gorra, sombrero u otro accesorio en la cabeza que pueda ocultar o distorsionar rasgos faciales.'
        ]
      },
      {
        id: 'ced_duplicado',
        nombre: 'Duplicado de Cédula',
        descripcion: '',
        requisitos: [
          'Precio (efectivo) B/. 35.00 / Jubilados, pensionados o tercera edad B/. 17.50',
          'Presentarse personalmente',
          'En caso de robo o hurto del documento de identidad, se recomienda presente denuncia (no obligatorio)',
          '• Instrucciones para toma de fotografía:',
          'Vestimenta: podrá usar ropa de cualquier color, excepto blanco, y deberá mantener los hombros cubiertos para evitar interferencias visuales. En caso de que utilice velo o toca como parte de su vestimenta, debe dejar expuesta la frente, el rostro y las orejas, asegurando la plena visibilidad de los rasgos faciales.',
          'Cabello: El titular deberá mantener el cabello recogido detrás de las orejas, permitiendo que el contorno del rostro sea completamente visible.',
          'Accesorios: Se permitirán únicamente aretes pequeños, no grandes ni llamativos. No se permite el uso de piercings faciales, salvo que sean permanentes o constituyan una expresión cultural de pueblos originarios, tampoco se permite el uso de gorra, sombrero u otro accesorio en la cabeza que pueda ocultar o distorsionar rasgos faciales.'
        ]
      },
      {
        id: 'ced_juvenil_primera',
        nombre: 'Cédula Juvenil por primera vez',
        descripcion: 'A partir de los 12 años de edad, es obligatorio portar el documento de identidad personal',
        requisitos: [
          'Trámite gratuito',
          'Presentarse personalmente acompañado de uno de los padres, hermano mayor de edad, abuelo o tío que consten inscritos como familiares',
          '• Instrucciones para toma de fotografía:',
          'Vestimenta: podrá usar ropa de cualquier color, excepto blanco, y deberá mantener los hombros cubiertos para evitar interferencias visuales. En caso de que utilice velo o toca como parte de su vestimenta, debe dejar expuesta la frente, el rostro y las orejas, asegurando la plena visibilidad de los rasgos faciales.',
          'Cabello: El titular deberá mantener el cabello recogido detrás de las orejas, permitiendo que el contorno del rostro sea completamente visible.',
          'Accesorios: Se permitirán únicamente aretes pequeños, no grandes ni llamativos. No se permite el uso de piercings faciales, salvo que sean permanentes o constituyan una expresión cultural de pueblos originarios, tampoco se permite el uso de gorra, sombrero u otro accesorio en la cabeza que pueda ocultar o distorsionar rasgos faciales.'
        ]
      },
      {
        id: 'ced_juvenil_renovacion',
        nombre: 'Renovación de Cédula Juvenil',
        descripcion: 'Cédula vencida o por vencer (6 meses antes de su vencimiento)',
        requisitos: [
          'Trámite gratuito',
          'Presentarse personalmente acompañado de uno de los padres, hermano mayor de edad, abuelo o tío que consten inscritos como familiares',
          '• Instrucciones para toma de fotografía:',
          'Vestimenta: podrá usar ropa de cualquier color, excepto blanco, y deberá mantener los hombros cubiertos para evitar interferencias visuales. En caso de que utilice velo o toca como parte de su vestimenta, debe dejar expuesta la frente, el rostro y las orejas, asegurando la plena visibilidad de los rasgos faciales.',
          'Cabello: El titular deberá mantener el cabello recogido detrás de las orejas, permitiendo que el contorno del rostro sea completamente visible.',
          'Accesorios: Se permitirán únicamente aretes pequeños, no grandes ni llamativos. No se permite el uso de piercings faciales, salvo que sean permanentes o constituyan una expresión cultural de pueblos originarios, tampoco se permite el uso de gorra, sombrero u otro accesorio en la cabeza que pueda ocultar o distorsionar rasgos faciales.'
        ]
      },
      {
        id: 'ced_pasados_edad',
        nombre: 'Cédula por primera vez con edad de 20 años y 1 día, en adelante',
        descripcion: 'Ciudadano panameño que solicita su cédula a los 20 años y 1 día de edad, en adelante. Este trámite no aplica a ciudadanos que tengan menos de la edad indicada.',
        requisitos: [
          'Complete el formulario de solicitud: Descargue el formulario [aquí](https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/05/MEMORIAL-DE-SOLICITUD-DE-TRAMITE-PRIMERA-VEZ-PASADO-DE-EDAD.pdf)',
          'Adjunte las pruebas con el memorial de solicitud y remítalo al correo de verificacionid@tribunal-electoral.gob.pa para revisión, previo a la asignación de la cita.',
          'Según el caso, se requiere que aporte los siguientes documentos, algunos de los cuales se han identificado como obligatorios.  El proceso de evaluación será más ágil, en la medida que se cuente con mayor cantidad de documentos que acrediten su identidad:',
          'Panameño residente en el país:',
          '• Documentos escolares (boletín escolar, diplomas, certificación de estudios u otros) sellados por el MEDUCA.',
          '• Certificado de Bautismo.',
          '• Documentos médicos (tarjetas de vacunación o certificación médica, historial clínico, referencia médica).',
          '• Otro documento que acrediten la identidad y nacionalidad panameña.',
          '• (Obligatorio) Familiar cercano panameño o tutor legal (resolución o sentencia). De no poder comparecer un familiar cercano, deberán brindar declaración jurada dos (2) testigos.',
          ' ',
          'Panameño que residen fuera del país:',
          '• (Obligatorio) Pasaporte original vigente / salvoconducto con sello de entrada (2 copias).',
          '• (Opcional) carné de residente, licencia de conducir, documento de identidad personal del país donde reside, pasaporte panameño con sello de salida, registro de nacimiento, de tener padres extranjeros presentar documento de identidad, Documentos que acrediten el cambio de nombre y/o apellido, cuando estos no coincidan con la inscripción de nacimiento en Panamá.',
          '• (Obligatorio) Familiar panameño cercano o tutor legal (resolución o sentencia). De no poder presentar familiar cercano dos (2) testigos deberán brindar declaración jurada.',
          '• Todo documento en idioma distinto al español, deberá ser traducido al español por Traductor Público Autorizado en Panamá.',
          '• Todo documento proveniente de otro país debe ser apostillado o legalizado.',
          '• De no hablar español el solicitante, familiar o testigo, debe asistirse por un Traductor Público Autorizado en Panamá (debe presentar carné de idoneidad y su respectivo sello de traductor).',
          ' ',
          'Información adicional de atención:',
          '• El día de la cita presentar las pruebas en original y 2 copias.',
          '• Se le tomará declaración jurada al solicitante y al familiar responsable / tutor / testigos (portar cédula vigente).',
          '• Presentarse quince (15) minutos antes de la hora programada, de lo contrario deberá agendar nuevamente, y quedará sujeto a la disponibilidad existente.'
        ]
      }
    ]
  },
  {
    id: 'organizacion_electoral',
    nombre: 'Organización Electoral',
    descripcion: 'Certificaciones de afiliación política, historial político y certificados de residencia electoral.',
    icono: 'Vote',
    subServicios: [
      {
        id: 'oe_certificacion_afiliacion',
        nombre: 'Certificación de Afiliación, No Afiliación e Historial Político',
        descripcion: 'Expedición de certificación oficial sobre afiliación partidaria, no afiliación o historial político.',
        requisitos: [
          'Precio (efectivo): $1.25 / B/. 1.25',
          '• Solicitud personal:',
          '  - Cédula de identidad vigente.',
          '  - Comprobante de pago de $1.25 en la ventanilla de cobro de la Dirección Regional de Registro Civil o Cedulación (Aplica solo para Panamá Centro).',
          '• Solicitud a través de un tercero (Persona autorizada):',
          '  - Carta de autorización firmada por el titular del trámite.',
          '  - Fotocopia de la cédula de identidad de ambas partes (titular y autorizado).',
          '  - Comprobante de pago de $1.25 en la ventanilla de cobro de la Dirección Regional de Registro Civil o Cedulación (Aplica solo para Panamá Centro).'
        ]
      },
      {
        id: 'oe_certificacion_residencia',
        nombre: 'Certificación de Residencia (Actual, Historial, Reducida e Historial Reducida)',
        descripcion: 'Certificado oficial de domicilio e historial de residencia electoral.',
        requisitos: [
          'Precio (efectivo): $1.25 / B/. 1.25',
          '• Solicitud personal:',
          '  - Cédula de identidad vigente.',
          '  - Comprobante de pago de $1.25 en la ventanilla de cobro de la Dirección Regional de Registro Civil o Cedulación (Aplica solo para Panamá Centro).',
          '• Solicitud a través de un tercero (Persona autorizada):',
          '  - Carta de autorización firmada por el titular del trámite.',
          '  - Fotocopia de la cédula de identidad de ambas partes (titular y autorizado).',
          '  - Comprobante de pago de $1.25 en la ventanilla de cobro de la Dirección Regional de Registro Civil o Cedulación (Aplica solo para Panamá Centro).'
        ]
      },
      {
        id: 'oe_residencia_fallecido',
        nombre: 'Certificación de Residencia e Historial de Residencia de una Persona Fallecida',
        descripcion: 'Expedición de certificación de residencia electoral correspondiente a un ciudadano difunto.',
        requisitos: [
          'Precio (efectivo): $1.25 / B/. 1.25',
          '• Nota de solicitud dirigida a la institución, explicando el trámite a realizar y el parentesco con el difunto.',
          '• Copia del certificado de defunción.',
          '• Copia del certificado de nacimiento o matrimonio (para acreditar el parentesco).',
          '• Copia de la cédula del solicitante.',
          '• Copia de la cédula del difunto (opcional / no indispensable).',
          '• Recibo de pago de la certificación ($1.25 / B/. 1.25).'
        ]
      }
    ]
  },
  {
    id: 'extranjeria',
    nombre: 'Trámites de Extranjería',
    descripcion: 'Procesamiento de cédulas de identidad para ciudadanos extranjeros (PE) y certificaciones.',
    icono: 'Globe',
    subServicios: [
      {
        id: 'ext_primera_vez',
        nombre: 'Carné de residente permanente por primera vez',
        descripcion: 'Emisión del documento de identidad personal para extranjeros residentes permanentes.',
        requisitos: [
          'Precio (efectivo) B/. 100.00',
          'Requiere contar con cita programada',
          'Nota del Servicio Nacional de Migración',
          'Fotocopia del carné expedido por el Servicio Nacional de Migración',
          'Fotocopia de la página de las generales del pasaporte',
          'En caso de menor de edad, aplican los mismos requisitos y debe estar acompañado de uno de sus padres siempre que esté incluido en la resolución del Servicio Nacional de Migración.',
          '• Instrucciones para toma de fotografía:',
          'Vestimenta: podrá usar ropa de cualquier color, excepto blanco, y deberá mantener los hombros cubiertos para evitar interferencias visuales. En caso de que utilice velo o toca como parte de su vestimenta, debe dejar expuesta la frente, el rostro y las orejas, asegurando la plena visibilidad de los rasgos faciales.',
          'Cabello: El titular deberá mantener el cabello recogido detrás de las orejas, permitiendo que el contorno del rostro sea completamente visible.',
          'Accesorios: Se permitirán únicamente aretes pequeños, no grandes ni llamativos. No se permite el uso de piercings faciales, salvo que sean permanentes o constituyan una expresión cultural de pueblos originarios, tampoco se permite el uso de gorra, sombrero u otro accesorio en la cabeza que pueda ocultar o distorsionar rasgos faciales.'
        ]
      },
      {
        id: 'ced_extranjero_renovacion',
        nombre: 'Renovación de carné de residente permanente',
        descripcion: 'Trámite de renovación de documento de identidad personal para ciudadano extranjero residente permanente, con documento vencido o por vencer (6 meses antes de su vencimiento)',
        requisitos: [
          'Precio (efectivo) B/. 75.00',
          'Presentarse personalmente',
          'En caso de menor de edad, aplican los mismos requisitos y debe estar acompañado de uno de los padres, hermano mayor de edad, abuelo o tío que consten inscritos como familiares.',
          '• Instrucciones para toma de fotografía:',
          'Vestimenta: podrá usar ropa de cualquier color, excepto blanco, y deberá mantener los hombros cubiertos para evitar interferencias visuales. En caso de que utilice velo o toca como parte de su vestimenta, debe dejar expuesta la frente, el rostro y las orejas, asegurando la plena visibilidad de los rasgos faciales.',
          'Cabello: El titular deberá mantener el cabello recogido detrás de las orejas, permitiendo que el contorno del rostro sea completamente visible.',
          'Accesorios: Se permitirán únicamente aretes pequeños, no grandes ni llamativos. No se permite el uso de piercings faciales, salvo que sean permanentes o constituyan una expresión cultural de pueblos originarios, tampoco se permite el uso de gorra, sombrero u otro accesorio en la cabeza que pueda ocultar o distorsionar rasgos faciales.'
        ]
      },
      {
        id: 'ced_extranjero_duplicado_perdida',
        nombre: 'Duplicado carné de residente permanente',
        descripcion: 'Reposición de la cédula de extranjero (PE) residente permanente debido a robo, extravío o deterioro.',
        requisitos: [
          'Precio (efectivo) B/. 65.00',
          'Presentarse personalmente',
          'En caso de robo o hurto del documento de identidad, se recomienda presente denuncia (no obligatorio)',
          '• Instrucciones para toma de fotografía:',
          'Vestimenta: podrá usar ropa de cualquier color, excepto blanco, y deberá mantener los hombros cubiertos para evitar interferencias visuales. En caso de que utilice velo o toca como parte de su vestimenta, debe dejar expuesta la frente, el rostro y las orejas, asegurando la plena visibilidad de los rasgos faciales.',
          'Cabello: El titular deberá mantener el cabello recogido detrás de las orejas, permitiendo que el contorno del rostro sea completamente visible.',
          'Accesorios: Se permitirán únicamente aretes pequeños, no grandes ni llamativos. No se permite el uso de piercings faciales, salvo que sean permanentes o constituyan una expresión cultural de pueblos originarios, tampoco se permite el uso de gorra, sombrero u otro accesorio en la cabeza que pueda ocultar o distorsionar rasgos faciales.'
        ]
      }
    ]
  },
  {
    id: 'panamenos_extranjero',
    nombre: 'Trámite de Panameños en el Extranjero',
    descripcion: 'Inscripción de hechos vitales y trámites consulares de identidad para ciudadanos residentes en el exterior.',
    icono: 'Plane',
    subServicios: [
      {
        id: 'pe_nacimiento',
        nombre: 'Inscripción de Nacimiento en el Extranjero',
        descripcion: 'Registro de nacimiento para hijos de padre y/o madre panameños nacidos fuera del territorio nacional.',
        requisitos: [
          'Certificado de nacimiento original otorgado por el país extranjero, debidamente apostillado o legalizado.',
          'Cédula de identidad de origen o pasaportes vigentes del padre o la madre panameña.',
          'Copia simple del documento de identidad del menor.'
        ]
      },
      {
        id: 'pe_cedulacion',
        nombre: 'Cédula de Identidad en Oficinas Consulares',
        descripcion: 'Gestión y renovación de cédula de identidad a través de delegaciones diplomáticas y consulados de enlace.',
        requisitos: [
          'Presencia física obligatoria en el consulado panameño correspondiente.',
          'Suministrar número de cédula anterior o pasaporte panameño vigente.',
          'Formulario de validación biométrica consular firmado.'
        ]
      },
      {
        id: 'pe_matrimonio',
        nombre: 'Inscripción de Matrimonio celebrado en el Extranjero',
        descripcion: 'Registro oficial de matrimonios de ciudadanos panameños celebrados en el exterior.',
        requisitos: [
          'Certificado de matrimonio original extranjero apostillado o legalizado.',
          'Cédula de identidad vigente del cónyuge panameño.',
          'Traducción autorizada al español si el documento original fue emitido en otro idioma.'
        ]
      }
    ]
  }
];

export const SUCURSALES_TE: Sucursal[] = [
  {
    id: 'anc_main',
    provincia: 'Panamá',
    nombre: 'Tribunal Electoral de Panamá',
    direccion: 'Avenida Omar Torrijos Herrera, Ancón, frente a la terminal de Albrook, Ciudad de Panamá',
    telefono: '+507 507-8000',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'boc_office',
    provincia: 'Bocas del Toro',
    nombre: 'Dirección Regional de Bocas del Toro',
    direccion: 'Calle Principal, Isla Colón, Bocas del Toro',
    telefono: '+507 757-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'coc_office',
    provincia: 'Coclé',
    nombre: 'Dirección Regional de Coclé',
    direccion: 'Vía Interamericana, entrada de Penonomé, frente a Plaza Iguana, Coclé',
    telefono: '+507 997-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'col_office',
    provincia: 'Colón',
    nombre: 'Dirección Regional de Colón',
    direccion: 'Calle 11 y Avenida Roosevelt, Ciudad de Colón',
    telefono: '+507 433-8200',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'chi_office',
    provincia: 'Chiriquí',
    nombre: 'Dirección Regional de Chiriquí',
    direccion: 'Calle F Sur y Avenida 3ra Oeste, David, Chiriquí',
    telefono: '+507 728-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'dar_office',
    provincia: 'Darién',
    nombre: 'Dirección Regional de Darién',
    direccion: 'Metetí, Carretera Panamericana, Darién',
    telefono: '+507 299-6350',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'her_office',
    provincia: 'Herrera',
    nombre: 'Dirección Regional de Herrera',
    direccion: 'Avenida Melitón Martín, Chitré, Herrera',
    telefono: '+507 913-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'los_office',
    provincia: 'Los Santos',
    nombre: 'Dirección Regional de Los Santos',
    direccion: 'Vía Circunvalación, frente al Estadio Flaco Bala Hernández, Las Tablas',
    telefono: '+507 926-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'pac_office',
    provincia: 'Panamá Centro',
    nombre: 'Dirección Regional de Panamá Centro',
    direccion: 'Centro Comercial El Dorado, Vía Ricardo J. Alfaro, Planta Alta, Ciudad de Panamá',
    telefono: '+507 507-8100',
    horario: 'Martes a Sábado 9:00 AM - 5:00 PM'
  },
  {
    id: 'pan_office',
    provincia: 'Panamá Norte',
    nombre: 'Dirección Regional de Panamá Norte',
    direccion: 'Vía Transístmica, Centro Comercial Plaza Las Cumbres, Las Cumbres',
    telefono: '+507 507-8250',
    horario: 'Lunes a Viernes 8:00 AM - 4:00 PM'
  },
  {
    id: 'pae_office',
    provincia: 'Panamá Este',
    nombre: 'Dirección Regional de Panamá Este',
    direccion: 'Plaza Comercial El Cruce, Planta Alta, 24 de Diciembre',
    telefono: '+507 507-8280',
    horario: 'Lunes a Viernes 8:00 AM - 4:00 PM'
  },
  {
    id: 'pao_office',
    provincia: 'Panamá Oeste',
    nombre: 'Dirección Regional de Panamá Oeste',
    direccion: 'Avenida Las Américas, al lado del cuartel de bomberos, La Chorrera',
    telefono: '+507 507-8400',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'sm_office',
    provincia: 'San Miguelito',
    nombre: 'Dirección Regional de San Miguelito',
    direccion: 'Centro Comercial Los Andes, Centro de Servicios Gubernamentales, San Miguelito',
    telefono: '+507 507-8300',
    horario: 'Martes a Sábado 9:00 AM - 5:00 PM'
  },
  {
    id: 'ver_office',
    provincia: 'Veraguas',
    nombre: 'Dirección Regional de Veraguas',
    direccion: 'Avenida Héctor Alejandro Santacoloma, Santiago, Veraguas',
    telefono: '+507 950-8100',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'gun_office',
    provincia: 'Guna Yala',
    nombre: 'Dirección Regional de Guna Yala',
    direccion: 'Sede Comarcal, El Porvenir, Guna Yala',
    telefono: '+507 299-9130',
    horario: 'Lunes a Viernes 7:30 AM - 3:30 PM'
  },
  {
    id: 'arr_office',
    provincia: 'Arraiján',
    nombre: 'Regional Especial de Arraiján',
    direccion: 'Vía Interamericana, Plaza Paseo Arraiján, Arraiján',
    telefono: '+507 507-8410',
    horario: 'Lunes a Viernes 8:00 AM - 4:00 PM'
  }
];

export const HORAS_DISPONIBLES = [
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM'
];

// Dynamically synchronize with localStorage if customized by administration
try {
  const cachedServicios = localStorage.getItem('TE_SERVICIOS');
  if (cachedServicios) {
    const parsed = JSON.parse(cachedServicios);
    if (parsed && parsed.length > 0 && parsed[0].id === 'registro_civil') {
      // Dynamic migration for any older cached description / title
      parsed.forEach((cat: any) => {
        if (cat.subServicios) {
          cat.subServicios.forEach((sub: any) => {
            if (sub.id === 'ced_renovacion') {
              if (sub.descripcion === 'Renovación de documento vencido o próximo a vencer.') {
                sub.descripcion = 'Cédula vencida o por vencer (6 meses antes de su vencimiento)';
              }
              if (sub.nombre === 'Renovación de Cédula de Identidad') {
                sub.nombre = 'Renovación de Cédula';
              }
            }
            if (sub.id === 'ced_pasados_edad') {
              if (sub.descripcion && sub.descripcion.includes('20 años')) {
                sub.descripcion = 'Ciudadano panameño que solicita su cédula a los 20 años y 1 día de edad, en adelante. Este trámite no aplica a ciudadanos que tengan menos de la edad indicada.';
              }
              sub.requisitos = [
                'Complete el formulario de solicitud: Descargue el formulario [aquí](https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/05/MEMORIAL-DE-SOLICITUD-DE-TRAMITE-PRIMERA-VEZ-PASADO-DE-EDAD.pdf)',
                'Adjunte las pruebas con el memorial de solicitud y remítalo al correo de verificacionid@tribunal-electoral.gob.pa para revisión, previo a la asignación de la cita.',
                'Según el caso, se requiere que aporte los siguientes documentos, algunos de los cuales se han identificado como obligatorios.  El proceso de evaluación será más ágil, en la medida que se cuente con mayor cantidad de documentos que acrediten su identidad:',
                'Panameño residente en el país:',
                '• Documentos escolares (boletín escolar, diplomas, certificación de estudios u otros) sellados por el MEDUCA.',
                '• Certificado de Bautismo.',
                '• Documentos médicos (tarjetas de vacunación o certificación médica, historial clínico, referencia médica).',
                '• Otro documento que acrediten la identidad y nacionalidad panameña.',
                '• (Obligatorio) Familiar cercano panameño o tutor legal (resolución o sentencia). De no poder comparecer un familiar cercano, deberán brindar declaración jurada dos (2) testigos.',
                ' ',
                'Panameño que residen fuera del país:',
                '• (Obligatorio) Pasaporte original vigente / salvoconducto con sello de entrada (2 copias).',
                '• (Opcional) carné de residente, licencia de conducir, documento de identidad personal del país donde reside, pasaporte panameño con sello de salida, registro de nacimiento, de tener padres extranjeros presentar documento de identidad, Documentos que acrediten el cambio de nombre y/o apellido, cuando estos no coincidan con la inscripción de nacimiento en Panamá.',
                '• (Obligatorio) Familiar panameño cercano o tutor legal (resolución o sentencia). De no poder presentar familiar cercano dos (2) testigos deberán brindar declaración jurada.',
                '• Todo documento en idioma distinto al español, deberá ser traducido al español por Traductor Público Autorizado en Panamá.',
                '• Todo documento proveniente de otro país debe ser apostillado o legalizado.',
                '• De no hablar español el solicitante, familiar o testigo, debe asistirse por un Traductor Público Autorizado en Panamá (debe presentar carné de idoneidad y su respectivo sello de traductor).',
                ' ',
                'Información adicional de atención:',
                '• El día de la cita presentar las pruebas en original y 2 copias.',
                '• Se le tomará declaración jurada al solicitante y al familiar responsable / tutor / testigos (portar cédula vigente).',
                '• Presentarse quince (15) minutos antes de la hora programada, de lo contrario deberá agendar nuevamente, y quedará sujeto a la disponibilidad existente.'
              ];
            }
            if (sub.id === 'ext_primera_vez') {
              if (Array.isArray(sub.requisitos) && !sub.requisitos.some((r: string) => r.toLowerCase().includes('en caso de menor de edad'))) {
                const idx = sub.requisitos.findIndex((r: string) => r.includes('pasaporte') || r.toLowerCase().includes('pasaporte'));
                if (idx !== -1) {
                  sub.requisitos.splice(idx + 1, 0, 'En caso de menor de edad, aplican los mismos requisitos y debe estar acompañado de uno de sus padres siempre que esté incluido en la resolución del Servicio Nacional de Migración.');
                } else {
                  sub.requisitos.push('En caso de menor de edad, aplican los mismos requisitos y debe estar acompañado de uno de sus padres siempre que esté incluido en la resolución del Servicio Nacional de Migración.');
                }
              }
            }
            if (sub.id === 'ced_extranjero_renovacion') {
              sub.descripcion = 'Trámite de renovación de documento de identidad personal para ciudadano extranjero residente permanente, con documento vencido o por vencer (6 meses antes de su vencimiento)';
              if (Array.isArray(sub.requisitos) && !sub.requisitos.some((r: string) => r.toLowerCase().includes('en caso de menor de edad'))) {
                const idx = sub.requisitos.indexOf('Presentarse personalmente');
                if (idx !== -1) {
                  sub.requisitos.splice(idx + 1, 0, 'En caso de menor de edad, aplican los mismos requisitos y debe estar acompañado de uno de los padres, hermano mayor de edad, abuelo o tío que consten inscritos como familiares.');
                } else {
                  sub.requisitos.push('En caso de menor de edad, aplican los mismos requisitos y debe estar acompañado de uno de los padres, hermano mayor de edad, abuelo o tío que consten inscritos como familiares.');
                }
              }
            }
            if (sub.id === 'ced_extranjero_duplicado_perdida') {
              sub.descripcion = 'Reposición de la cédula de extranjero (PE) residente permanente debido a robo, extravío o deterioro.';
              if (Array.isArray(sub.requisitos) && !sub.requisitos.some((r: string) => r.toLowerCase().includes('robo o hurto'))) {
                const idx = sub.requisitos.indexOf('Presentarse personalmente');
                if (idx !== -1) {
                  sub.requisitos.splice(idx + 1, 0, 'En caso de robo o hurto del documento de identidad, se recomienda presente denuncia (no obligatorio)');
                } else {
                  sub.requisitos.unshift('En caso de robo o hurto del documento de identidad, se recomienda presente denuncia (no obligatorio)');
                }
              }
            }
            if (sub.id === 'ced_juvenil_primera' && Array.isArray(sub.requisitos)) {
              sub.requisitos = sub.requisitos.filter((r: string) => !r.toLowerCase().includes('certificado de nacimiento del menor'));
            }
          });
        }
      });
      SERVICIOS_TRIBUNAL.length = 0;
      SERVICIOS_TRIBUNAL.push(...parsed);
    } else {
      localStorage.removeItem('TE_SERVICIOS');
    }
  }
} catch (e) {
  console.error("Error loading cached servicios", e);
}

try {
  const cachedSucursales = localStorage.getItem('TE_SUCURSALES');
  if (cachedSucursales) {
    const parsed = JSON.parse(cachedSucursales);
    SUCURSALES_TE.length = 0;
    SUCURSALES_TE.push(...parsed);
  }
} catch (e) {
  console.error("Error loading cached sucursales", e);
}

export function saveTramiteMutation(newServicios: CategoriaServicio[]) {
  SERVICIOS_TRIBUNAL.length = 0;
  SERVICIOS_TRIBUNAL.push(...newServicios);
  localStorage.setItem('TE_SERVICIOS', JSON.stringify(newServicios));
}

export function saveSucursalMutation(newSucursales: Sucursal[]) {
  SUCURSALES_TE.length = 0;
  SUCURSALES_TE.push(...newSucursales);
  localStorage.setItem('TE_SUCURSALES', JSON.stringify(newSucursales));
}

