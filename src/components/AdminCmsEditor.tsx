import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Compass, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Layout, 
  Globe, 
  FileCode,
  Edit2,
  Trash,
  Upload,
  Copy,
  Check
} from 'lucide-react';
import { CmsConfig } from '../types';

interface AdminCmsEditorProps {
  onConfigSaved?: () => void;
}

export default function AdminCmsEditor({ onConfigSaved }: AdminCmsEditorProps) {
  const [config, setConfig] = useState<CmsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Editor tabs: 'general' | 'secciones' | 'paginas' | 'imagenes'
  const [editorTab, setEditorTab] = useState<'general' | 'secciones' | 'paginas' | 'imagenes'>('general');

  // Form states for items
  const [newSection, setNewSection] = useState({ id: '', name: '', description: '' });
  const [newPage, setNewPage] = useState({ id: '', title: '', slug: '', content: '' });
  const [newImage, setNewImage] = useState({ id: '', name: '', url: '', category: '' });

  // States for local storage uploads
  const [localFiles, setLocalFiles] = useState<Array<{ filename: string; url: string; size: number; mtime: string }>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load local uploaded files from fast server storage
  const loadLocalFiles = async () => {
    setLoadingFiles(true);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const res = await fetch('/api/uploads/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.files) {
          setLocalFiles(data.files);
        }
      }
    } catch (err) {
      console.error('Error fetching uploaded files from express storage:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    loadLocalFiles();
  }, []);

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showStatus('El archivo seleccionado debe ser una imagen válida (JPG, PNG, WEBP, SVG, GIF).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showStatus('La imagen excede el límite de 10 Megabytes.', 'error');
      return;
    }

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const token = sessionStorage.getItem('admin_token') || '';
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              filename: file.name,
              base64Data
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.url) {
              showStatus('¡Imagen subida exitosamente al almacenamiento rápido local!', 'success');
              
              // Automatically register/fill the config name and ID inputs
              const sanitizedId = file.name
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '_')
                .substring(0, 20) + '_' + Math.floor(Math.random() * 100);
              
              const sanitizedName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              
              setNewImage(prev => ({
                ...prev,
                url: data.url,
                id: sanitizedId,
                name: sanitizedName
              }));
              
              // Reload visual bank list
              loadLocalFiles();
            } else {
              showStatus('Error de subida: ' + (data.error || 'No se recibió la confirmación.'), 'error');
            }
          } else {
            showStatus('Error en el servidor al subir la imagen.', 'error');
          }
        } catch (err: any) {
          console.error('Upload call error:', err);
          showStatus('Error de conexión al cargar el archivo.', 'error');
        } finally {
          setUploadingFile(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('File reader error:', err);
      showStatus('No se pudo procesar la lectura local del archivo.', 'error');
      setUploadingFile(false);
    }
  };

  const handleDeleteLocalFile = async (filename: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar permanentemente este archivo '${filename}' del almacenamiento local?`)) {
      return;
    }
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const res = await fetch(`/api/uploads/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showStatus('Archivo eliminado del almacenamiento.', 'success');
        loadLocalFiles();
      } else {
        const data = await res.json();
        showStatus('Error al eliminar archivo: ' + (data.error || 'Desconocido'), 'error');
      }
    } catch (err: any) {
      console.error('Error deleting local file:', err);
      showStatus('Error de conexión al intentar eliminar el archivo.', 'error');
    }
  };

  const handleCopyUrl = (url: string, filename: string) => {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedFilename(filename);
    setTimeout(() => {
      setCopiedFilename(null);
    }, 2000);
  };

  // Load current configuration
  const loadCmsConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setConfig(data.config);
        }
      }
    } catch (err) {
      console.error('Error fetching CMS config in editor:', err);
      showStatus('No se pudo establecer conexión para cargar la configuración.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCmsConfig();
  }, []);

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Main Save changes
  const handleSaveAll = async (updatedConfig = config) => {
    if (!updatedConfig) return;
    setSaving(true);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const res = await fetch('/api/cms/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedConfig),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        showStatus('¡Configuración guardada y sincronizada correctamente de manera persistente!', 'success');
        if (onConfigSaved) {
          onConfigSaved();
        }
      } else {
        showStatus('Error al persistir la configuración en la base de datos: ' + (data.error || 'Intente de nuevo.'), 'error');
      }
    } catch (err: any) {
      console.error('Error saving CMS config:', err);
      showStatus('Error de conexión con el servidor: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // GENERAL CONFIG handlers
  const handleGeneralChange = (key: string, value: string) => {
    if (!config) return;
    const updated = {
      ...config,
      [key]: value
    };
    setConfig(updated);
  };

  const handleCustomTextChange = (key: string, value: string) => {
    if (!config) return;
    const updated = {
      ...config,
      customTexts: {
        ...config.customTexts,
        [key]: value
      }
    };
    setConfig(updated);
  };

  // SECTOR / CATEGORY handlers
  const handleAddSection = () => {
    if (!config) return;
    if (!newSection.id || !newSection.name) {
      showStatus('Debe suministrar un identificador y un nombre para la sección.', 'error');
      return;
    }
    
    // Check if duplicate
    if (config.sections.some(s => s.id === newSection.id)) {
      showStatus('Ese identificador de sección ya existe.', 'error');
      return;
    }

    const updated = {
      ...config,
      sections: [...config.sections, { ...newSection }]
    };
    setConfig(updated);
    setNewSection({ id: '', name: '', description: '' });
    showStatus('Sección agregada con éxito a la lista de cambios.', 'success');
  };

  const handleDeleteSection = (secId: string) => {
    if (!config) return;
    const filtered = config.sections.filter(s => s.id !== secId);
    const updated = {
      ...config,
      sections: filtered
    };
    setConfig(updated);
    showStatus('Sección eliminada de la lista de cambios.', 'success');
  };

  const handleUpdateSectionField = (index: number, key: string, val: string) => {
    if (!config) return;
    const sectCopy = [...config.sections];
    sectCopy[index] = {
      ...sectCopy[index],
      [key]: val
    };
    setConfig({
      ...config,
      sections: sectCopy
    });
  };

  // PAGE handlers
  const handleAddPage = () => {
    if (!config) return;
    if (!newPage.id || !newPage.title || !newPage.slug) {
      showStatus('Debe suministrar código, título y enlace slug para la página.', 'error');
      return;
    }

    if (config.pages.some(p => p.id === newPage.id || p.slug === newPage.slug)) {
      showStatus('Ese código o slug de página ya está registrado.', 'error');
      return;
    }

    const updated = {
      ...config,
      pages: [...config.pages, { ...newPage }]
    };
    setConfig(updated);
    setNewPage({ id: '', title: '', slug: '', content: '' });
    showStatus('Página web agregada a la lista de cambios.', 'success');
  };

  const handleDeletePage = (pageId: string) => {
    if (!config) return;
    const filtered = config.pages.filter(p => p.id !== pageId);
    const updated = {
      ...config,
      pages: filtered
    };
    setConfig(updated);
    showStatus('Página eliminada de la lista de cambios.', 'success');
  };

  const handleUpdatePageField = (index: number, key: string, val: string) => {
    if (!config) return;
    const pagesCopy = [...config.pages];
    pagesCopy[index] = {
      ...pagesCopy[index],
      [key]: val
    };
    setConfig({
      ...config,
      pages: pagesCopy
    });
  };

  // IMAGES handlers
  const handleAddImage = () => {
    if (!config) return;
    if (!newImage.id || !newImage.name || !newImage.url) {
      showStatus('Debe suministrar una clave, un nombre y una URL de imagen válida.', 'error');
      return;
    }

    const updated = {
      ...config,
      images: [...config.images, { ...newImage }]
    };
    setConfig(updated);
    setNewImage({ id: '', name: '', url: '', category: '' });
    showStatus('Imagen agregada a la lista de cambios de la galería.', 'success');
  };

  const handleDeleteImage = (imgId: string) => {
    if (!config) return;
    const filtered = config.images.filter(i => i.id !== imgId);
    const updated = {
      ...config,
      images: filtered
    };
    setConfig(updated);
    showStatus('Imagen eliminada de la lista actual.', 'success');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-sm font-semibold text-slate-400">Cargando gestor de contenidos institucionales del portal...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-red-950/20 text-red-400 border border-red-900/40 p-6 rounded flex items-center gap-3">
        <AlertCircle className="w-5 h-5" />
        <div>
          <h4 className="font-bold">Error al inicializar el CMS</h4>
          <p className="text-xs mt-1">El servidor no devolvió una estructura de configuración válida. Verifique la conexión con Supabase o el archivo local.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Layout className="w-5 h-5 text-emerald-500" />
            Consola de Edición y Gestión de Contenido del Sitio (CMS)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Herramienta administrativa para realizar modificaciones globales en tiempo real de textos, logos, imágenes, categorías de trámites y páginas adicionales.
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => handleSaveAll()}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 text-xs uppercase tracking-wider rounded flex items-center gap-1.5 transition shadow-md hover:shadow-emerald-900/10 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Guardando...' : 'Aplicar Cambios del Sitio'}
        </button>
      </div>

      {/* Operation Status Feedbacks */}
      {statusMessage && (
        <div className={`p-4 rounded border text-xs flex items-center gap-2.5 transition-all duration-300 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/20 text-emerald-400 border-emerald-550/40' 
            : 'bg-red-950/30 text-red-400 border-red-500/30'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span className="font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Sub tabs of editor */}
      <div className="flex flex-wrap gap-2 border-b border-slate-850 pb-3">
        <button
          type="button"
          onClick={() => setEditorTab('general')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
            editorTab === 'general'
              ? 'bg-slate-800 text-white border border-slate-700 font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          General, Textos y Logo
        </button>

        <button
          type="button"
          onClick={() => setEditorTab('secciones')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
            editorTab === 'secciones'
              ? 'bg-slate-800 text-white border border-slate-700 font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          Secciones de Trámites
        </button>

        <button
          type="button"
          onClick={() => setEditorTab('paginas')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
            editorTab === 'paginas'
              ? 'bg-slate-800 text-white border border-slate-700 font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-purple-400" />
          Páginas del Sitio
        </button>

        <button
          type="button"
          onClick={() => setEditorTab('imagenes')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
            editorTab === 'imagenes'
              ? 'bg-slate-800 text-white border border-slate-700 font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
          Galería de Imágenes
        </button>
      </div>

      {/* Editor Main body container */}
      <div className="bg-slate-900/45 border border-slate-850 p-4 md:p-6 rounded-lg space-y-6 shadow-inner">
        
        {/* TAB 1: GENERAL SETTINGS EDITOR */}
        {editorTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 uppercase tracking-wide flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              Identidad de Marca, Textos y Enlaces Principales
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Título Global de la Institución / Sitio</label>
                <input
                  type="text"
                  value={config.siteTitle}
                  onChange={(e) => handleGeneralChange('siteTitle', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                  placeholder="Ejemplo: Portal de Trámites del Tribunal Electoral"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Subtítulo Descriptivo</label>
                <input
                  type="text"
                  value={config.siteSubtitle}
                  onChange={(e) => handleGeneralChange('siteSubtitle', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                  placeholder="Ejemplo: Solicitud y agendamiento de citas en línea rápidos"
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400">URL del Escudo/Logo Oficial (.png recomendado y con fondo transparente)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.logoUrl}
                    onChange={(e) => handleGeneralChange('logoUrl', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-slate-700"
                    placeholder="https://servidor.dominio/logo.png"
                  />
                  {config.logoUrl && (
                    <div className="h-8 w-8 bg-slate-950 rounded border border-slate-800 flex items-center justify-center overflow-hidden">
                      <img src={config.logoUrl} alt="Vista previa logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 border-t border-slate-800 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest">Textos Específicos del Welcome Banner (Inicio)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Título del Saludo Principal</label>
                    <input
                      type="text"
                      value={config.customTexts?.welcomeTitle || ''}
                      onChange={(e) => handleCustomTextChange('welcomeTitle', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                      placeholder="Ejemplo: Bienvenido al Portal Oficial de Citas"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Subtítulo del Saludo Principal</label>
                    <input
                      type="text"
                      value={config.customTexts?.welcomeSubtitle || ''}
                      onChange={(e) => handleCustomTextChange('welcomeSubtitle', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                      placeholder="Ejemplo: Reserve su espacio para atención presencial de manera rápida"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 border-t border-slate-800 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest">Textos de la Sección "Visítanos"</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Etiqueta/Badge de Sección</label>
                    <input
                      type="text"
                      value={config.customTexts?.visitanosBadge || ''}
                      onChange={(e) => handleCustomTextChange('visitanosBadge', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                      placeholder="Ejemplo: Visítanos"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Título de la Sección</label>
                    <input
                      type="text"
                      value={config.customTexts?.visitanosTitle || ''}
                      onChange={(e) => handleCustomTextChange('visitanosTitle', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                      placeholder="Ejemplo: Visitas Guiadas al Tribunal Electoral"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Descripción Corta</label>
                    <input
                      type="text"
                      value={config.customTexts?.visitanosDescription || ''}
                      onChange={(e) => handleCustomTextChange('visitanosDescription', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                      placeholder="Ejemplo: Regístrese para conocer la historia y espacios institucionales."
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 border-t border-slate-800 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest">Validación de Citas de Renovación (Cédula/Residente)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Meses Máximos de Anticipación</label>
                    <input
                      type="number"
                      value={config.customTexts?.renovacionMesesAnticipacion || '6'}
                      onChange={(e) => handleCustomTextChange('renovacionMesesAnticipacion', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                      placeholder="Ejemplo: 6"
                      min="1"
                      max="12"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Mensaje de Error No Cumple</label>
                    <input
                      type="text"
                      value={config.customTexts?.msgNoCumpleRenovacion || ''}
                      onChange={(e) => handleCustomTextChange('msgNoCumpleRenovacion', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                      placeholder="Utilice {meses} como comodín para el número de meses."
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 border-t border-slate-800 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest">Textos de Pie de Página (Footer) y Soporte</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Mensaje de Derechos del Footer</label>
                    <input
                      type="text"
                      value={config.customTexts?.footerText || ''}
                      onChange={(e) => handleCustomTextChange('footerText', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                      placeholder="© 2026 Tribunal Electoral de Panamá."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Información de Teléfono de Ayuda / Soporte</label>
                    <input
                      type="text"
                      value={config.customTexts?.helpContact || ''}
                      onChange={(e) => handleCustomTextChange('helpContact', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                      placeholder="Línea gratuita de atención: 311"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-800 pt-4 col-span-1 md:col-span-2">
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Color Primario de la Temática (Formatos Hexagonal CSS)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.primaryColor || '#0f172a'}
                    onChange={(e) => handleGeneralChange('primaryColor', e.target.value)}
                    className="h-8 w-14 bg-slate-950 rounded cursor-pointer border border-slate-800"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => handleGeneralChange('primaryColor', e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-xs font-mono text-white focus:outline-none"
                    style={{ width: '85px' }}
                  />
                  <span className="text-[11px] text-slate-400">Este color guiará las tonalidades principales de botones, barras y resaltes del portal del ciudadano.</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: SECTIONS LIST EDITOR */}
        {editorTab === 'secciones' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 uppercase tracking-wide flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-500" />
              Catálogo de Secciones y Categorías de Trámites
            </h3>

            <div className="space-y-4">
              {config.sections.map((sec, idx) => (
                <div key={sec.id} className="bg-slate-950 border border-slate-800 p-4 rounded relative space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-wider">Sección Cod: #{sec.id}</span>
                    
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(sec.id)}
                      className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-950/20 transition cursor-pointer"
                      title="Eliminar Sección"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Nombre Comercial/Gubernamental</label>
                      <input
                        type="text"
                        value={sec.name}
                        onChange={(e) => handleUpdateSectionField(idx, 'name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Descripción General para el Ciudadano</label>
                      <input
                        type="text"
                        value={sec.description}
                        onChange={(e) => handleUpdateSectionField(idx, 'description', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Form to add section */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-350 uppercase flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                Agregar Nueva Sección al Catálogo
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Código Identificador (ID único)</label>
                  <input
                    type="text"
                    value={newSection.id}
                    onChange={(e) => setNewSection({ ...newSection, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    placeholder="ej: cedulacion_extranjera"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Nombre Institucional</label>
                  <input
                    type="text"
                    value={newSection.name}
                    onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none"
                    placeholder="ej: Renovación PE"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Descripción del Trámite</label>
                  <input
                    type="text"
                    value={newSection.description}
                    onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none"
                    placeholder="ej: Renovaciones de carnés de residencias"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-mono px-3 py-2 rounded transition cursor-pointer"
                >
                  Agregar Sección
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: PAGES CONTENT EDITOR */}
        {editorTab === 'paginas' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              Gestión de Páginas Institucionales y Divulgativas
            </h3>

            <div className="space-y-4">
              {config.pages.map((p, idx) => (
                <div key={p.id} className="bg-slate-950 border border-slate-800 p-4 rounded space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">Pág ID: #{p.id}</span>
                      <span className="text-xs text-slate-500">| Enlace slug: <strong className="text-slate-300 font-mono">/{p.slug}</strong></span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleDeletePage(p.id)}
                      className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-950/20 transition cursor-pointer"
                      title="Eliminar Página"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Título de la Página</label>
                        <input
                          type="text"
                          value={p.title}
                          onChange={(e) => handleUpdatePageField(idx, 'title', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Ruta / Enlace Directo (Slug)</label>
                        <input
                          type="text"
                          value={p.slug}
                          onChange={(e) => handleUpdatePageField(idx, 'slug', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                          className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Contenido Principal de la Página (Texto/HTML/Información)</label>
                      <textarea
                        value={p.content}
                        onChange={(e) => handleUpdatePageField(idx, 'content', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-2 text-xs text-white font-sans focus:outline-none h-24"
                        placeholder="Redacte la información descriptiva de esta sección..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Form to add page */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-350 uppercase flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                Crear Nueva Página de Contenidos
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Código Único (ID)</label>
                  <input
                    type="text"
                    value={newPage.id}
                    onChange={(e) => setNewPage({ ...newPage, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    placeholder="ej: calendario_feriados"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Título Principal</label>
                  <input
                    type="text"
                    value={newPage.title}
                    onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none"
                    placeholder="ej: Calendario de Fiestas Patrias"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Enlace Amistoso (Slug)</label>
                  <input
                    type="text"
                    value={newPage.slug}
                    onChange={(e) => setNewPage({ ...newPage, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    placeholder="ej: feriados-institucionales"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Contenido Principal</label>
                <textarea
                  value={newPage.content}
                  onChange={(e) => setNewPage({ ...newPage, content: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none h-20"
                  placeholder="Redacte la información principal que conformará esta página..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddPage}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] uppercase font-mono px-3 py-2 rounded transition cursor-pointer"
                >
                  Agregar Página
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: IMAGES GALLERY EDITOR */}
        {editorTab === 'imagenes' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 uppercase tracking-wide flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-500" />
              Banco y Galería de Imágenes Oficiales
            </h3>

            {/* SECTION A: FAST INTERACTIVE STORAGE UPLOADER */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-4 shadow-sm">
              <div>
                <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-emerald-500 animate-pulse" />
                  Almacenamiento Rápido de Imágenes (Storage Local)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Suba imágenes directamente a nuestro servidor de alta velocidad para acelerar su carga, optimizar el rendimiento del portal y obtener enlaces estáticos instantáneos.
                </p>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleUploadFile(file);
                }}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition duration-200 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-950/20'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="local-file-uploader"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(file);
                  }}
                />
                
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 bg-slate-900 rounded-full border border-slate-800 text-slate-400">
                    <Upload className="w-5 h-5 text-emerald-500" />
                  </div>
                  
                  {uploadingFile ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                      Procesando y optimizando imagen en el servidor...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-200">
                        Suelte su imagen aquí o{' '}
                        <label
                          htmlFor="local-file-uploader"
                          className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer font-bold"
                        >
                          busque en su dispositivo
                        </label>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Formatos soportados: PNG, JPG, JPEG, WEBP, SVG, GIF (Máx 10 MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* LIST OF CURRENTLY UPLOADED STATIC FILES */}
              <div className="space-y-2.5">
                <h5 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Archivos en Almacenamiento Rápido ({localFiles.length})
                </h5>

                {loadingFiles ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-4 justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Listando banco de imágenes local...
                  </div>
                ) : localFiles.length === 0 ? (
                  <div className="text-center py-6 bg-slate-950 rounded border border-slate-850 text-[11px] text-slate-500">
                    No hay imágenes cargadas en el storage local rápido todavía. ¡Suba su primera imagen arriba!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {localFiles.map((file) => (
                      <div
                        key={file.filename}
                        className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded p-2.5 flex flex-col justify-between space-y-2"
                      >
                        <div className="flex gap-2.5 items-start">
                          <div className="h-12 w-12 bg-slate-900 border border-slate-800 rounded overflow-hidden flex items-center justify-center shrink-0">
                            <img
                              src={file.url}
                              alt={file.filename}
                              className="h-full w-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-[11px] font-bold text-white truncate font-sans"
                              title={file.filename}
                            >
                              {file.filename.split('-').slice(1).join('-') || file.filename}
                            </p>
                            <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                              {(file.size / 1024).toFixed(1)} KB | {new Date(file.mtime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 pt-1.5 border-t border-slate-900">
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(file.url, file.filename)}
                            className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded py-1 px-1.5 text-[9px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                            title="Copiar enlace completo"
                          >
                            {copiedFilename === file.filename ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-400">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar Enlace</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNewImage((prev) => ({
                                ...prev,
                                url: file.url,
                                id: file.filename
                                  .toLowerCase()
                                  .replace(/[^a-z0-9_]/g, '_')
                                  .substring(0, 20),
                                name: file.filename.split('-').slice(1).join('-').split('.')[0] || 'Imagen Subida'
                              }));
                              showStatus('El enlace de la imagen ha sido ingresado al formulario de registro básico inferior.', 'success');
                            }}
                            className="bg-emerald-950/45 hover:bg-emerald-900/35 border border-emerald-900/30 text-emerald-400 font-bold rounded py-1 px-2 text-[9px] transition cursor-pointer shrink-0"
                            title="Usar imagen en el formulario de abajo"
                          >
                            Usar URL
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLocalFile(file.filename)}
                            className="bg-red-950/20 hover:bg-red-900/20 border border-red-900/10 text-red-400 hover:text-red-300 rounded py-1 px-1.5 text-[9px] transition cursor-pointer shrink-0"
                            title="Eliminar permanentemente del disco del servidor"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION B: IMAGES REFERENCED IN CONFIGURATION */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest">
                Galería y Referencias Activas en la Configuración
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.images.map((img) => (
                  <div key={img.id} className="bg-slate-950 border border-slate-800 p-3 rounded flex gap-4 relative">
                    <div className="h-16 w-16 bg-slate-900 rounded border border-slate-850 shrink-0 flex items-center justify-center overflow-hidden">
                      <img src={img.url} alt={img.name} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                    </div>

                    <div className="flex-1 space-y-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wide">Img-ID: #{img.id}</span>
                        {img.url.startsWith('/uploads/') && (
                          <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-1 py-0.5 rounded font-bold uppercase">Fast Load</span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-white truncate">{img.name}</h5>
                      <p className="text-[10px] font-mono text-slate-500 truncate" title={img.url}>{img.url}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-950/20 transition cursor-pointer"
                      title="Eliminar del catálogo de configuración del sitio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Form to add image */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-4">
                <h4 className="text-xs font-bold text-slate-350 uppercase flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  Registrar Referencia de Imagen en Configuración
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Identificación (ID único)</label>
                    <input
                      type="text"
                      value={newImage.id}
                      onChange={(e) => setNewImage({ ...newImage, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                      placeholder="ej: banner_promocional"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Nombre Ilustrativo</label>
                    <input
                      type="text"
                      value={newImage.name}
                      onChange={(e) => setNewImage({ ...newImage, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none"
                      placeholder="ej: Foto Banner Principal"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Categoría o Ubicación</label>
                    <input
                      type="text"
                      value={newImage.category || ''}
                      onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none"
                      placeholder="ej: Cabecera, Botones"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Dirección Web Completa (Url de la Imagen)</label>
                  <input
                    type="text"
                    value={newImage.url}
                    onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    placeholder="https://servidor.dominio/carpeta/imagen.jpg o enlace fast-load"
                  />
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    Consejo: Puede subir una imagen en la sección Almacenamiento de arriba, presionar "Usar URL" y se autocompletará este campo al instante con la configuración optimizada.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="bg-amber-600 hover:bg-amber-500 text-slate-950 text-[10px] uppercase font-bold px-3 py-2 rounded transition cursor-pointer"
                  >
                    Registrar Imagen
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
