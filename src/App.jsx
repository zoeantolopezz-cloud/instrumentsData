import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addInstrument,
  compressPhoto,
  deleteInstrument,
  getInstruments,
  isCloudMode,
} from './lib/instruments.js';

function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8M12 13v9" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M20 16.5v3A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5v-3" /></>,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    cloud: <><path d="M20 16.2A4.8 4.8 0 0 0 18 7h-1.3A7 7 0 1 0 5 17.5" /><path d="m8 16 4-4 4 4m-4-4v9" /></>,
    laptop: <><rect x="4" y="4" width="16" height="13" rx="2" /><path d="M2 21h20M8 17l-1 4m9-4 1 4" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(value));
}

function friendlyError(error) {
  if (error?.message?.includes('Failed to fetch')) return 'No se pudo conectar. Revisá tu conexión y la configuración de Supabase.';
  if (error?.message?.includes('row-level security')) return 'Supabase rechazó la operación. Revisá las políticas de acceso del esquema.';
  return error?.message || 'Ocurrió un error inesperado. Intentá nuevamente.';
}

export default function App() {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [notice, setNotice] = useState(null);
  const [loadError, setLoadError] = useState('');
  const formRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let active = true;
    getInstruments()
      .then((items) => { if (active) setInstruments(items); })
      .catch((error) => { if (active) setLoadError(friendlyError(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es');
    if (!term) return instruments;
    return instruments.filter((item) => [item.userName, item.instrumentName, item.partNumber, item.serialNumber]
      .some((value) => value.toLocaleLowerCase('es').includes(term)));
  }, [instruments, query]);

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', text: 'Elegí un archivo de imagen válido.' });
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'La imagen debe pesar menos de 8 MB.' });
      event.target.value = '';
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!photo) {
      setNotice({ type: 'error', text: 'Agregá una foto del instrumento para continuar.' });
      return;
    }

    setSaving(true);
    try {
      const compressed = await compressPhoto(photo);
      const created = await addInstrument({
        userName: form.get('userName').trim(),
        instrumentName: form.get('instrumentName').trim(),
        partNumber: form.get('partNumber').trim(),
        serialNumber: form.get('serialNumber').trim(),
        photoDataUrl: compressed.photoDataUrl,
      }, compressed.blob);
      setInstruments((items) => [created, ...items]);
      formRef.current.reset();
      setPhoto(null);
      setPreview('');
      if (fileRef.current) fileRef.current.value = '';
      setNotice({ type: 'success', text: 'Instrumento guardado correctamente.' });
    } catch (error) {
      setNotice({ type: 'error', text: friendlyError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(instrument) {
    if (!window.confirm(`¿Eliminar “${instrument.instrumentName}” (${instrument.serialNumber})?`)) return;
    try {
      await deleteInstrument(instrument);
      setInstruments((items) => items.filter((item) => item.id !== instrument.id));
      setNotice({ type: 'success', text: 'Instrumento eliminado.' });
    } catch (error) {
      setNotice({ type: 'error', text: friendlyError(error) });
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="InstrumentsData, inicio">
          <span className="brand-mark"><Icon name="box" size={21} /></span>
          <span>Instruments<span className="brand-light">Data</span></span>
        </a>
        <div className={`mode-pill ${isCloudMode ? 'mode-cloud' : ''}`}>
          <span className="mode-dot" />
          {isCloudMode ? 'Sincronización en la nube' : 'Guardado en este dispositivo'}
        </div>
      </header>

      <main id="inicio" className="page-content">
        <section className="intro">
          <div>
            <p className="eyebrow">REGISTRO DE ACTIVOS</p>
            <h1>Instrumentos, <span>en orden.</span></h1>
            <p className="intro-copy">Un lugar simple para registrar y encontrar cada instrumento de tu equipo.</p>
          </div>
          <div className="total-card" aria-label={`${instruments.length} instrumentos registrados`}>
            <span className="total-icon"><Icon name="box" size={19} /></span>
            <span className="total-number">{instruments.length}</span>
            <span className="total-label">{instruments.length === 1 ? 'instrumento' : 'instrumentos'}</span>
          </div>
        </section>

        <div className="workspace-grid">
          <section className="panel form-panel" aria-labelledby="form-heading">
            <div className="panel-heading">
              <div className="heading-icon"><Icon name="plus" size={19} /></div>
              <div><h2 id="form-heading">Nuevo instrumento</h2><p>Completá los datos para agregarlo al registro.</p></div>
            </div>

            <form ref={formRef} className="instrument-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Nombre de quien carga <b>*</b></span>
                <input name="userName" type="text" placeholder="Ej. Ana García" autoComplete="name" maxLength="100" required />
              </label>
              <label className="field">
                <span>Nombre del instrumento <b>*</b></span>
                <input name="instrumentName" type="text" placeholder="Ej. Multímetro digital" maxLength="120" required />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Número de parte <b>*</b></span>
                  <input name="partNumber" type="text" placeholder="Ej. FLUKE-117" maxLength="100" required />
                </label>
                <label className="field">
                  <span>Número de serie <b>*</b></span>
                  <input name="serialNumber" type="text" placeholder="Ej. 48290173" maxLength="100" required />
                </label>
              </div>

              <div className="field photo-field">
                <span>Foto del instrumento <b>*</b></span>
                <input ref={fileRef} className="visually-hidden" id="instrument-photo" type="file" accept="image/*" onChange={handlePhoto} />
                <label className={`photo-drop ${preview ? 'has-photo' : ''}`} htmlFor="instrument-photo">
                  {preview ? (
                    <><img className="photo-preview" src={preview} alt="Vista previa del instrumento" /><span className="photo-change"><Icon name="upload" size={15} /> Cambiar foto</span></>
                  ) : (
                    <><span className="photo-upload-icon"><Icon name="image" size={23} /></span><span className="photo-title">Elegí una foto para subir</span><span className="photo-hint">JPG, PNG o WEBP · hasta 8 MB</span></>
                  )}
                </label>
              </div>

              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? <span className="spinner" /> : <Icon name="plus" size={18} />}
                {saving ? 'Guardando…' : 'Guardar instrumento'}
              </button>
              <p className="form-footnote">Los campos marcados con * son obligatorios.</p>
            </form>
          </section>

          <section className="panel inventory-panel" aria-labelledby="inventory-heading">
            <div className="inventory-header">
              <div className="panel-heading inventory-title">
                <div className="heading-icon heading-icon-green"><Icon name="box" size={19} /></div>
                <div><h2 id="inventory-heading">Instrumentos cargados</h2><p>Tu inventario registrado.</p></div>
              </div>
              <span className="count-badge">{instruments.length}</span>
            </div>

            <label className="search-box">
              <Icon name="search" size={18} />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, parte o serie…" aria-label="Buscar instrumentos" />
              {query && <button className="clear-search" type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">×</button>}
            </label>

            {loadError && <div className="inline-error" role="alert">{loadError}</div>}
            {loading ? (
              <div className="empty-state"><span className="spinner spinner-dark" /><p>Cargando instrumentos…</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><Icon name={query ? 'search' : 'box'} size={25} /></span>
                <h3>{query ? 'No encontramos resultados' : 'Todavía no hay instrumentos'}</h3>
                <p>{query ? 'Probá con otro nombre, número de parte o serie.' : 'Cuando agregues uno, va a aparecer acá.'}</p>
              </div>
            ) : (
              <div className="instrument-list">
                {filtered.map((item) => (
                  <article className="instrument-card" key={item.id}>
                    <img className="instrument-photo" src={item.photoUrl} alt={`Foto de ${item.instrumentName}`} />
                    <div className="instrument-info">
                      <div className="instrument-card-top">
                        <h3 title={item.instrumentName}>{item.instrumentName}</h3>
                        <button className="icon-button delete-button" type="button" onClick={() => handleDelete(item)} aria-label={`Eliminar ${item.instrumentName}`} title="Eliminar instrumento"><Icon name="trash" size={17} /></button>
                      </div>
                      <div className="instrument-numbers">
                        <span><small>PARTE</small>{item.partNumber}</span>
                        <span><small>SERIE</small>{item.serialNumber}</span>
                      </div>
                      <div className="instrument-meta"><span className="person-avatar">{item.userName.charAt(0).toLocaleUpperCase('es')}</span><span>{item.userName}</span><span className="meta-divider">·</span><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {!loading && filtered.length > 0 && <p className="list-footer">Mostrando {filtered.length} de {instruments.length} {instruments.length === 1 ? 'instrumento' : 'instrumentos'}</p>}
          </section>
        </div>

        <footer className="page-footer"><span>InstrumentsData</span><span>Registro claro. Equipo listo.</span></footer>
      </main>

      {notice && <div className={`toast toast-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}><span className="toast-icon"><Icon name={notice.type === 'success' ? 'check' : 'image'} size={17} /></span>{notice.text}<button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso">×</button></div>}
    </div>
  );
}
