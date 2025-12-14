import { supabase } from "./supabaseClient";

export const STORAGE_BUCKETS = {
  profileAvatars: "avatars",
} as const;

type UploadImageParams = {
  bucket: string;
  uri: string;
  path?: string;
  fileName?: string;
  contentType?: string;
  upsert?: boolean;
};

type UploadResult = {
  path: string;
  publicUrl: string | null;
};

const getExtensionFromUri = (uri: string) => {
  const splitted = uri.split(".");
  const ext = splitted[splitted.length - 1];
  return ext && ext.length <= 4 ? ext : "jpg";
};

const createRandomSuffix = () => Math.random().toString(36).slice(2, 10);

export async function uploadImageToBucket({
  bucket,
  uri,
  path,
  fileName,
  contentType,
  upsert = false,
}: UploadImageParams): Promise<UploadResult> {
  if (!uri) {
    throw new Error("Image URI is required");
  }

  const extension = getExtensionFromUri(uri);
  const finalFileName = fileName || `${Date.now()}-${createRandomSuffix()}.${extension}`;
  const filePath = path ? path : finalFileName;

  // Fetch the image file
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  console.log(`📤 Uploading to bucket "${bucket}" at path "${filePath}" (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);

  const { data: uploadData, error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
    upsert,
    contentType: contentType || blob.type || `image/${extension}`,
  });

  if (error) {
    console.error(`❌ Storage upload error:`, error);
    throw new Error(`Upload failed: ${error.message} (Code: ${error.statusCode || 'unknown'})`);
  }

  console.log(`✅ Upload successful:`, uploadData);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    path: filePath,
    publicUrl: data?.publicUrl ?? null,
  };
}

