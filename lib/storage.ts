import { createAdminClient } from '@/lib/supabase/admin';

interface UploadResult {
  url: string;
  path: string;
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Buffer,
  contentType?: string
): Promise<UploadResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(bucket)
    .upload(path, file, {
      contentType: contentType ?? (file instanceof File ? file.type : 'application/octet-stream'),
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = admin.storage.from(bucket).getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

export function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const admin = createAdminClient();
  return admin.storage.from(bucket).createSignedUrl(path, expiresIn);
}
