import { createClient } from '@supabase/supabase-js';

const LOCAL_KEY = 'instruments-data.records.v1';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const bucket = import.meta.env.VITE_SUPABASE_BUCKET?.trim() || 'instruments-photos';
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isCloudMode = Boolean(supabase);

function fromDatabase(row) {
  return {
    id: row.id,
    userName: row.user_name,
    instrumentName: row.instrument_name,
    partNumber: row.part_number,
    serialNumber: row.serial_number,
    photoUrl: row.photo_url,
    photoPath: row.photo_path,
    createdAt: row.created_at,
  };
}

export async function getInstruments() {
  if (!supabase) {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch {
      return [];
    }
  }

  const { data, error } = await supabase
    .from('instruments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(fromDatabase);
}

export async function addInstrument(instrument, photoBlob) {
  if (!supabase) {
    const record = {
      ...instrument,
      id: crypto.randomUUID(),
      photoUrl: instrument.photoDataUrl,
      photoPath: null,
      createdAt: new Date().toISOString(),
    };
    const records = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    localStorage.setItem(LOCAL_KEY, JSON.stringify([record, ...records]));
    return record;
  }

  const photoPath = `${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(photoPath, photoBlob, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;

  const { data: photoData } = supabase.storage.from(bucket).getPublicUrl(photoPath);
  const { data, error } = await supabase
    .from('instruments')
    .insert({
      user_name: instrument.userName,
      instrument_name: instrument.instrumentName,
      part_number: instrument.partNumber,
      serial_number: instrument.serialNumber,
      photo_url: photoData.publicUrl,
      photo_path: photoPath,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from(bucket).remove([photoPath]);
    throw error;
  }
  return fromDatabase(data);
}

export async function deleteInstrument(instrument) {
  if (!supabase) {
    const records = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    localStorage.setItem(LOCAL_KEY, JSON.stringify(records.filter((item) => item.id !== instrument.id)));
    return;
  }

  const { error } = await supabase.from('instruments').delete().eq('id', instrument.id);
  if (error) throw error;
  if (instrument.photoPath) {
    const { error: photoError } = await supabase.storage.from(bucket).remove([instrument.photoPath]);
    if (photoError) console.warn('No se pudo eliminar la foto:', photoError.message);
  }
}

export async function compressPhoto(file) {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('No se pudo procesar la imagen.'));
    }, 'image/jpeg', 0.78);
  });
  const photoDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(blob);
  });
  return { blob, photoDataUrl };
}
