import React, { useState } from 'react';
import { ServicioCategoriaId, CategoriaServicio, CmsConfig } from '../types';
import { SERVICIOS_TRIBUNAL } from '../data';
import { 
  IdCard, 
  FileText, 
  Globe, 
  Vote, 
  ClipboardCheck, 
  Info, 
  ArrowLeft, 
  ArrowRight, 
  CornerDownRight, 
  Plane, 
  Check, 
  HelpCircle,
  AlertTriangle,
  Search,
  X,
  Building2,
  MapPin,
  Users,
  Calendar
} from 'lucide-react';
import VisitasGuiadasForm from './VisitasGuiadasForm';

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

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

interface SeleccionServicioProps {
  selectedCategoria: ServicioCategoriaId | null;
  selectedSubServicioId: string | null;
  onBack?: () => void;
  onSelect: (categoria: ServicioCategoriaId, subServicioId: string) => void;
  cmsConfig?: CmsConfig | null;
}

// Custom badges & descriptions based on Category IDs to look extremely realistic
const CATEGORY_META: Record<ServicioCategoriaId, { 
  themeColor: string;
  activeBorder: string;
  bgLight: string;
  textColor: string;
  pillColor: string;
  badgeText: string;
}> = {
  cedulacion: {
    themeColor: 'bg-indigo-600',
    activeBorder: 'border-indigo-600 ring-indigo-600/10 bg-indigo-50/5',
    bgLight: 'bg-indigo-50 text-indigo-700',
    textColor: 'text-indigo-900',
    pillColor: 'bg-indigo-100 text-indigo-800',
    badgeText: 'Cedulación'
  },
  registro_civil: {
    themeColor: 'bg-teal-600',
    activeBorder: 'border-teal-600 ring-teal-600/10 bg-teal-50/5',
    bgLight: 'bg-teal-50 text-teal-700',
    textColor: 'text-teal-900',
    pillColor: 'bg-teal-100 text-teal-800',
    badgeText: 'Registro Civil'
  },
  extranjeria: {
    themeColor: 'bg-amber-600',
    activeBorder: 'border-amber-600 ring-amber-600/10 bg-amber-50/5',
    bgLight: 'bg-amber-50 text-amber-700',
    textColor: 'text-amber-900',
    pillColor: 'bg-amber-100 text-amber-800',
    badgeText: 'Inmigración PE'
  },
  organizacion_electoral: {
    themeColor: 'bg-purple-600',
    activeBorder: 'border-purple-600 ring-purple-600/10 bg-purple-50/5',
    bgLight: 'bg-purple-50 text-purple-700',
    textColor: 'text-purple-900',
    pillColor: 'bg-purple-100 text-purple-800',
    badgeText: 'Org. Electoral'
  },
  panamenos_extranjero: {
    themeColor: 'bg-sky-600',
    activeBorder: 'border-sky-600 ring-sky-600/10 bg-sky-50/5',
    bgLight: 'bg-sky-50 text-sky-700',
    textColor: 'text-sky-900',
    pillColor: 'bg-sky-100 text-sky-800',
    badgeText: 'Panameños en Extranjero'
  }
};

const renderIcon = (iconName: string, className: string) => {
  switch (iconName) {
    case 'IdCard':
      return <IdCard className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'Globe':
      return <Globe className={className} />;
    case 'Vote':
      return <Vote className={className} />;
    case 'Plane':
      return <Plane className={className} />;
    default:
      return <ClipboardCheck className={className} />;
  }
};

export default function SeleccionServicio({
  selectedCategoria,
  selectedSubServicioId,
  onBack,
  onSelect,
  cmsConfig,
}: SeleccionServicioProps) {
  const getSubServicesForCategory = (catId: ServicioCategoriaId): any[] => {
    const mainCat = SERVICIOS_TRIBUNAL.find(c => c.id === catId);
    if (!mainCat) return [];
    
    let list = [...mainCat.subServicios];
    
    if (catId === 'registro_civil') {
      const extPan = SERVICIOS_TRIBUNAL.find(c => c.id === 'panamenos_extranjero');
      if (extPan) {
        list = [...list, ...extPan.subServicios];
      }
    } else if (catId === 'cedulacion') {
      const ext = SERVICIOS_TRIBUNAL.find(c => c.id === 'extranjeria');
      if (ext) {
        list = [...list, ...ext.subServicios];
      }
    }
    
    return list;
  };

  const getInitialCategory = (cat: ServicioCategoriaId | null): ServicioCategoriaId | null => {
    if (!cat) return null;
    if (cat === 'extranjeria') return 'cedulacion';
    if (cat === 'panamenos_extranjero') return 'registro_civil';
    return cat;
  };

  const [activeCat, setActiveCat] = useState<ServicioCategoriaId | null>(getInitialCategory(selectedCategoria));
  const [activeSub, setActiveSub] = useState<string | null>(selectedSubServicioId);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVisitasGuiadas, setShowVisitasGuiadas] = useState(false);

  // Global search items list across allowed categories (Cedulación, Organización Electoral)
  const allSubServices = [
    ...SERVICIOS_TRIBUNAL.filter((cat) => ['cedulacion', 'organizacion_electoral', 'extranjeria'].includes(cat.id)).flatMap((cat) => {
      return cat.subServicios.map((sub) => {
        let customCategoryName = cat.nombre;
        let targetCategoryId: ServicioCategoriaId = cat.id;

        if (cat.id === 'extranjeria') {
          customCategoryName = 'Cedulación (Extranjería)';
          targetCategoryId = 'cedulacion';
        }

        return {
          ...sub,
          categoriaNombre: customCategoryName,
          categoriaId: targetCategoryId,
          originalCategoriaId: cat.id,
        };
      });
    }),
  ];

  // Filter based on normalized search query
  const filteredSubServices = allSubServices.filter((sub) => {
    if (!searchQuery.trim()) return false;
    const query = normalizeText(searchQuery);
    
    const matchesNombre = normalizeText(sub.nombre).includes(query);
    const matchesDescripcion = normalizeText(sub.descripcion).includes(query);
    const matchesCategoria = normalizeText(sub.categoriaNombre).includes(query);
    
    const matchesRequisitos = sub.requisitos.some((req) => 
      normalizeText(req).includes(query)
    );

    return matchesNombre || matchesDescripcion || matchesCategoria || matchesRequisitos;
  });

  const handleSearchResultClick = (sub: any) => {
    if (sub.isVisitasGuiadas) {
      setShowVisitasGuiadas(true);
      setSearchQuery('');
    } else {
      setActiveCat(sub.categoriaId);
      setActiveSub(sub.id);
      setSearchQuery('');
    }
  };

  const handleCategoryClick = (catId: ServicioCategoriaId) => {
    setActiveCat(catId);
    setActiveSub(null); // Reset sub-service on category change
  };

  const currentCategory = SERVICIOS_TRIBUNAL.find((c) => c.id === activeCat);
  const subServicesList = activeCat ? getSubServicesForCategory(activeCat) : [];
  const currentSubService = subServicesList.find((s) => s.id === activeSub);

  const handleNextSubmit = () => {
    if (activeCat && activeSub) {
      let finalCat = activeCat;
      if (activeSub.startsWith('ext_')) {
        finalCat = 'extranjeria';
      } else if (activeSub.startsWith('pe_')) {
        finalCat = 'panamenos_extranjero';
      }
      onSelect(finalCat, activeSub);
    }
  };

  const getSubServicesCount = (catId: ServicioCategoriaId): number => {
    const mainCat = SERVICIOS_TRIBUNAL.find(c => c.id === catId);
    if (!mainCat) return 0;
    let count = mainCat.subServicios.length;
    if (catId === 'registro_civil') {
      const extPan = SERVICIOS_TRIBUNAL.find(c => c.id === 'panamenos_extranjero');
      if (extPan) count += extPan.subServicios.length;
    } else if (catId === 'cedulacion') {
      const ext = SERVICIOS_TRIBUNAL.find(c => c.id === 'extranjeria');
      if (ext) count += ext.subServicios.length;
    }
    return count;
  };

  if (showVisitasGuiadas) {
    return (
      <div className="animate-fade-in">
        <VisitasGuiadasForm onBack={() => setShowVisitasGuiadas(false)} />
      </div>
    );
  }

  if (!activeCat) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Top Banner & Heading */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-xl border border-blue-900/40">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-4 translate-x-4">
            <ClipboardCheck className="w-56 h-56 stroke-1" />
          </div>
          
          <div className="relative z-15 space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border border-blue-400/20">
                Paso 1 de 3: Selección de Trámite
              </span>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Elija el trámite que desea realizar
                </h2>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Seleccione el trámite para el que requiere la cita en: Registro Civil, Cedulación u Organización Electoral.  Ingrese y lea detenidamente los requisitos, elija la fecha disponible para su cita.
                </p>
              </div>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="self-start md:self-center px-4 py-2 border border-slate-700/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition text-xs font-bold flex items-center gap-2 cursor-pointer bg-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Regresar
                </button>
              )}
            </div>

            {/* Global Search Engine (Buscador de Trámites) */}
            <div className="max-w-xl relative pt-2">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none pt-2">
                <Search className="h-4.5 w-4.5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar trámite por nombre, costo o requisitos (ej: duplicado, juvenil, carné, matrimonio)"
                className="block w-full pl-10 pr-10 py-3 text-xs md:text-sm bg-slate-950/40 border border-slate-700/60 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white pt-2"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Results OR Categories Grid */}
        {searchQuery.trim().length > 0 ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span>Resultados de Búsqueda ({filteredSubServices.length})</span>
                <span className="w-4 h-[1px] bg-slate-200"></span>
              </h3>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 transition flex items-center gap-1 cursor-pointer"
              >
                Ver todas las categorías
              </button>
            </div>

            {filteredSubServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredSubServices.map((sub) => {
                  const meta = CATEGORY_META[sub.categoriaId] || {
                    themeColor: 'bg-blue-600',
                    activeBorder: 'border-blue-600 ring-blue-600/10 shadow-sm bg-blue-50/5',
                    bgLight: 'bg-slate-100 text-slate-700',
                    textColor: 'text-slate-800',
                    pillColor: 'bg-slate-100 text-slate-700',
                    badgeText: 'Trámite'
                  };

                  const isPaid = sub.requisitos.some(r => r.toLowerCase().includes('costo') || r.toLowerCase().includes('pago') || r.toLowerCase().includes('b/.'));

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSearchResultClick(sub)}
                      className="text-left p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-700 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full relative group hover:scale-[1.01]"
                    >
                      <div className="space-y-3 w-full">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.bgLight}`}>
                            {sub.categoriaNombre}
                          </span>
                          {isPaid ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-850 border border-amber-200/50">
                              Arancelado
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-850 border border-emerald-200/50">
                              Sin Costo
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs md:text-sm font-black text-slate-805 group-hover:text-blue-900 transition-colors leading-snug">
                            {sub.nombre}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                            {sub.descripcion}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 w-full border-t border-slate-100 mt-4 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400 group-hover:text-blue-700 transition-all font-semibold">
                          Ver requisitos de atención
                        </span>
                        <span className="transition-transform duration-200 group-hover:translate-x-1 text-slate-300 group-hover:text-blue-700 font-extrabold flex items-center gap-1">
                          Seleccionar <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-14 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <HelpCircle className="w-14 h-14 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-1">
                  Sin coincidencias encontradas
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto px-4 font-semibold leading-relaxed">
                  Pruebe buscando palabras clave más simples como <strong className="text-slate-600">cédula</strong>, <strong className="text-slate-600">matrimonio</strong>, <strong className="text-slate-600">carné</strong>, o <strong className="text-slate-600">duplicado</strong>.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end pb-1">
              <span className="text-[11px] text-slate-400 font-medium">Elige una de nuestras opciones</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICIOS_TRIBUNAL.filter(cat => ['cedulacion', 'organizacion_electoral'].includes(cat.id)).map((cat) => {
                const meta = CATEGORY_META[cat.id] || {
                  themeColor: 'bg-blue-600',
                  activeBorder: 'border-blue-600 ring-blue-600/10 shadow-sm bg-blue-50/5',
                  bgLight: 'bg-blue-50 text-blue-700',
                  textColor: 'text-slate-800',
                  pillColor: 'bg-slate-100 text-slate-700',
                  badgeText: 'Trámite'
                };

                const optionsCount = getSubServicesCount(cat.id);

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryClick(cat.id)}
                    className="text-left p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-slate-300 shadow-sm transition-all duration-300 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-md hover:scale-[1.015]"
                  >
                    <div className="space-y-5">
                      {/* Icon & Mini-badge */}
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 bg-slate-50 text-slate-600 border border-slate-100">
                          {renderIcon(cat.icono, 'w-6 h-6')}
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${meta.bgLight}`}>
                          {meta.badgeText}
                        </span>
                      </div>

                      {/* Title & description */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-black tracking-wide uppercase text-slate-700 group-hover:text-blue-900 transition-colors">
                          {cat.nombre}
                        </h4>
                        <p className="text-xs text-slate-500 leading-snug line-clamp-3 font-medium">
                          {cat.descripcion}
                        </p>
                      </div>
                    </div>

                    {/* Counter & Arrow Footer */}
                    <div className="pt-3 w-full border-t border-slate-100/80 mt-5 flex items-center justify-between text-[11px] font-bold">
                      <span className="px-2.5 py-0.5 rounded text-[10px] bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-700 transition-all">
                        {optionsCount} opciones disponibles
                      </span>
                      <span className="transition-transform duration-300 group-hover:translate-x-1.5 text-slate-300 group-hover:text-blue-700 font-extrabold flex items-center gap-1">
                        Explorar <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sección Visítanos con Banner Identico a la Imagen */}
            <div className="pt-10 border-t border-slate-100">
              <div 
                onClick={() => setShowVisitasGuiadas(true)}
                className="group relative w-full bg-white border border-slate-150 rounded-2xl md:rounded-3xl shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer flex flex-col md:flex-row items-stretch select-none"
              >
                {/* Left Side: Visítanos Main Info */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    {/* Header: Circle Icon + VISÍTANOS text */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-blue-900 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-black tracking-widest text-blue-900 select-none uppercase">
                        {cmsConfig?.customTexts?.visitanosBadge || "Visítanos"}
                      </h3>
                    </div>

                    {/* Slogan/Description */}
                    <p className="text-sm md:text-base font-bold text-slate-700 leading-normal max-w-xl">
                      {cmsConfig?.customTexts?.visitanosTitle || "Conoce nuestra historia, funciones y espacios institucionales del Tribunal Electoral."}
                    </p>
                  </div>

                  {/* Aesthetic Separation Line with Diamond */}
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-[1px] bg-blue-100 flex-1"></div>
                    <div className="w-2 h-2 rotate-45 bg-blue-900/80 shrink-0"></div>
                    <div className="h-[1px] bg-blue-100 flex-1"></div>
                  </div>

                  {/* Three pillars/columns from the image */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Pillar 1: Información */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black leading-tight text-blue-900 uppercase">Información</span>
                        <span className="text-[9px] font-bold text-slate-500 leading-tight">sobre nuestra institución</span>
                      </div>
                    </div>

                    {/* Pillar 2: Espacios */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black leading-tight text-blue-900 uppercase">Espacios</span>
                        <span className="text-[9px] font-bold text-slate-500 leading-tight">institucionales para ti</span>
                      </div>
                    </div>

                    {/* Pillar 3: Visitas guiadas */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black leading-tight text-blue-900 uppercase">Visitas guiadas</span>
                        <span className="text-[9px] font-bold text-slate-500 leading-tight">para estudiantes y público</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vertical Divider for Desktop */}
                <div className="hidden md:block w-[1px] bg-slate-100 self-stretch my-6"></div>

                {/* Right Side: "Conócenos" Action Button */}
                <div className="w-full md:w-[220px] bg-slate-50/50 p-6 md:p-8 flex flex-col justify-center items-center border-t md:border-t-0 border-slate-100 shrink-0">
                  {/* Button "Conócenos" */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowVisitasGuiadas(true);
                    }}
                    className="w-full flex items-center justify-between px-5 py-3 bg-blue-900 text-white rounded-full font-black text-xs md:text-sm tracking-wide shadow-xs group-hover:bg-blue-950 transition-all duration-300 cursor-pointer hover:scale-[1.025]"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>Conócenos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-normal">|</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    );
  }

  // Loaded Category layout (Page with procedures of that category)
  const meta = CATEGORY_META[activeCat] || {
    themeColor: 'bg-blue-600',
    activeBorder: 'border-blue-600 ring-blue-600/10 shadow-sm bg-blue-50/5',
    bgLight: 'bg-blue-50 text-blue-700',
    textColor: 'text-slate-800',
    pillColor: 'bg-slate-100 text-slate-700',
    badgeText: 'Trámite'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dynamic Header for Selected Page */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveCat(null)}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-slate-800 border border-slate-200 cursor-pointer shadow-sm bg-white shrink-0"
              title="Volver a Categorías"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.bgLight}`}>
                  {meta.badgeText}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-[11px] text-slate-500 font-semibold uppercase">Paso 1: Trámites de la sección</span>
              </div>
              <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-800">
                {currentCategory?.nombre}
              </h2>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setActiveCat(null)}
            className="md:self-center px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-850 rounded-lg transition text-xs font-bold flex items-center justify-center gap-2 cursor-pointer bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Otras Opciones
          </button>
        </div>
      </div>

      {/* Sub-procedures Listing with unified styling */}
      <div className="bg-slate-50 border border-slate-200/85 rounded-2xl p-5 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-700"></span>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                Trámites de {currentCategory?.nombre}
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Elija el trámite que desea realizar, del listado siguiente:
            </p>
          </div>
          
          {activeSub && (
            <div className="bg-emerald-50 text-emerald-850 border border-emerald-200 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 self-start">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
              Trámite Listo para Agendar
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List left side */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {subServicesList.map((sub) => {
              const isSelected = activeSub === sub.id;
              
              // Dynamic helper checks for realistic tags
              const isPaid = sub.requisitos.some(r => r.toLowerCase().includes('costo') || r.toLowerCase().includes('pago') || r.toLowerCase().includes('b/.'));
              const isJuvenilOrMenor = sub.id.includes('juvenil') || sub.nombre.toLowerCase().includes('menor');
              const isFirstTime = sub.id.includes('primera_vez') || sub.nombre.toLowerCase().includes('primera');
              const isPanamenoExt = sub.id.startsWith('pe_');
              const isExtranjeriaSub = sub.id.startsWith('ext_');

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveSub(sub.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 relative ${
                    isSelected
                      ? 'border-blue-700 bg-white shadow-md ring-2 ring-blue-700/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Active highlight bar on left border */}
                  {isSelected && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-700 rounded-r" />
                  )}

                  <div className={`mt-0.5 p-1.5 rounded-lg border shrink-0 transition-all ${
                    isSelected 
                      ? 'bg-blue-700 text-white border-blue-800 shadow-sm' 
                      : 'bg-slate-50 text-slate-500 border-slate-100'
                  }`}>
                    <CornerDownRight className="w-4 h-4" />
                  </div>

                  <div className="space-y-1.5 flex-1 pr-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h5 className="text-xs font-extrabold text-slate-800 leading-snug">
                        {sub.nombre}
                      </h5>
                      
                      {/* Interactive dynamic tags */}
                      {isPaid ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/50">
                          Arancelado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                          Sin Costo / Regular
                        </span>
                      )}

                      {isJuvenilOrMenor && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200/50">
                          Menores de Edad
                        </span>
                      )}

                      {isFirstTime && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200/50">
                          Primera Vez
                        </span>
                      )}

                      {isPanamenoExt && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200/50">
                          Panameños en el Exterior
                        </span>
                      )}

                      {isExtranjeriaSub && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/50">
                          Extranjería
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-normal font-medium line-clamp-2">
                      {sub.descripcion}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sub-service Requirements panel on Right side styled like an Official Sheet */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 md:p-6 flex flex-col justify-between shadow-sm min-h-[300px] relative overflow-hidden">
            {/* Soft decorative background element */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-slate-50 rounded-full blur-2xl pointer-events-none" />

            {currentSubService ? (
              <div className="space-y-5 relative z-10">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-700"></span>
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Ficha Técnica del Trámite
                    </h5>
                  </div>
                  <p className="text-xs font-black text-slate-850 text-sm leading-snug">
                    {currentSubService.nombre}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1.5 font-medium">
                    {currentSubService.descripcion}
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-wide uppercase">
                    <ClipboardCheck className="w-4 h-4 text-blue-700" /> 
                    Requisitos Necesarios:
                  </span>
                  
                  <div className="bg-slate-50/50 border border-slate-100/80 rounded-xl p-4 space-y-3">
                    <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed font-semibold pl-1">
                      {currentSubService.requisitos.map((req: string, idx: number) => {
                        const colonIndex = req.indexOf(':');
                        const hasColon = colonIndex > 0 && colonIndex < req.length - 1;
                        const label = hasColon ? req.substring(0, colonIndex) : '';
                        const text = hasColon ? req.substring(colonIndex + 1) : req;

                        const isSpecialRule = 
                          req.toUpperCase().includes('EVITA EL COLOR BLANCO') ||
                          req.toUpperCase().includes('EVITA ACCESORIOS') ||
                          req.toUpperCase().includes('CABELLO DESPEJADO') ||
                          req.toUpperCase().includes('VESTIMENTA:') ||
                          req.toUpperCase().includes('CABELLO:') ||
                          req.toUpperCase().includes('ACCESORIOS:') ||
                          req.toUpperCase().includes('INSTRUCCIONES PARA TOMA DE FOTOGRAFÍA');

                        return (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[9px] border border-emerald-200">
                              ✓
                            </span>
                            <span className={`flex-1 col-span-1 ${isSpecialRule ? 'font-extrabold text-slate-900 bg-yellow-50/30 px-1 rounded' : ''}`}>
                              {hasColon ? (
                                <>
                                  <strong className={isSpecialRule ? 'font-black text-slate-950' : 'font-extrabold text-slate-800'}>{label}:</strong>
                                  {renderWithLinks(text)}
                                </>
                              ) : (
                                renderWithLinks(req)
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50/30 border border-blue-100/60 rounded-xl p-3.5 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-black text-blue-900 uppercase tracking-wide">
                      Información Adicional de Atención
                    </p>
                    <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5 font-medium">
                      Presentarse quince (15) minutos antes de la hora programada, de lo contrario deberá agendar nuevamente, y quedará sujeto a la disponibilidad existente.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 relative z-10">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                  <ClipboardCheck className="w-8 h-8 stroke-1 text-slate-400" />
                </div>
                <h6 className="text-xs font-black text-slate-700 uppercase tracking-wide mb-1">
                  Visualizador de Requisitos
                </h6>
                <p className="text-xs font-medium text-slate-400 max-w-[280px] leading-relaxed">
                  Seleccione un trámite de la lista a su izquierda para revisar la documentación obligatoria que debe presentar el día de su cita.
                </p>
              </div>
            )}

            {/* Fee notice at bottom */}
            {currentSubService && (
              <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="italic">
                  Nota: Los datos personales suministrados serán tratados conforme a lo establecido en la Ley 81 de 26 de marzo de 2019, sobre Protección de Datos.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-5 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setActiveCat(null)}
          className="w-full sm:w-auto h-12 px-6 rounded-lg border border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-50 transition cursor-pointer text-center flex items-center justify-center gap-2 bg-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Cambiar Sección
        </button>

        <button
          type="button"
          onClick={handleNextSubmit}
          disabled={!activeSub}
          className={`w-full sm:w-auto h-12 font-bold px-8 rounded-lg shadow-lg uppercase tracking-wider text-xs transition duration-150 flex items-center justify-center gap-2 ${
            activeSub
              ? 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer shadow-blue-100'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Siguiente: Datos Personales</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
