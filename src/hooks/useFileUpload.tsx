import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useImageCompression } from './useImageCompression';

interface FileUploadOptions {
  bucket: string;
  maxSizeMB: number;
  maxFiles: number;
  allowedTypes: string[];
  signedPreview?: boolean; // Use signed URL for previews (for private buckets)
  pathPrefix?: string; // Optional folder prefix inside the bucket (e.g., tickets/{ticketId})
}

interface UploadedFile {
  id: string;
  name: string;
  url: string; // Preview URL (public or signed)
  type: string;
  size: number;
  storagePath?: string; // Path in storage bucket
}

export const useFileUpload = (options: FileUploadOptions) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { compressImage } = useImageCompression();

  const validateFile = useCallback((file: File): boolean => {
    // Verificar tipo
    if (!options.allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não permitido",
        description: `Tipos aceitos: ${options.allowedTypes.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }

    // Verificar tamanho baseado no tipo
    let maxSizeBytes: number;
    let sizeLabel: string;
    
    if (file.type.startsWith('video/')) {
      maxSizeBytes = 25 * 1024 * 1024; // 25MB para vídeos
      sizeLabel = "25MB";
    } else {
      maxSizeBytes = options.maxSizeMB * 1024 * 1024; // 10MB para imagens
      sizeLabel = `${options.maxSizeMB}MB`;
    }
    
    if (file.size > maxSizeBytes) {
      toast({
        title: "Arquivo muito grande",
        description: `Tamanho máximo para ${file.type.startsWith('video/') ? 'vídeos' : 'imagens'}: ${sizeLabel}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [options.allowedTypes, options.maxSizeMB, toast]);

  const uploadFiles = useCallback(async (files: FileList): Promise<UploadedFile[]> => {
    if (files.length > options.maxFiles) {
      toast({
        title: "Muitos arquivos",
        description: `Máximo ${options.maxFiles} arquivos por vez`,
        variant: "destructive",
      });
      return [];
    }

    setUploading(true);
    setUploadProgress(0);
    const uploadedFiles: UploadedFile[] = [];

    try {
      const totalFiles = files.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        
        if (!validateFile(file)) {
          continue;
        }

        let fileToUpload = file;

        // Comprimir imagens
        if (file.type.startsWith('image/')) {
          try {
            fileToUpload = await compressImage(file, {
              maxSizeMB: options.maxSizeMB,
              maxWidthOrHeight: 1920,
              useWebWorker: true
            });
          } catch (error) {
            console.warn('Falha na compressão, usando arquivo original:', error);
          }
        }

        // Gerar nome único para o arquivo e caminho opcional
        const unique = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
          ? (crypto as any).randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const baseName = `${unique}-${file.name}`;
        const filePath = options.pathPrefix ? `${options.pathPrefix}/${baseName}` : baseName;
        
        // Upload para o Supabase Storage
        const { data, error } = await supabase.storage
          .from(options.bucket)
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw error;
        }

        // Gerar URL de pré-visualização
        let previewUrl = '';
        if (options.signedPreview) {
          const { data: signed, error: signedErr } = await supabase.storage
            .from(options.bucket)
            .createSignedUrl(filePath, 3600);
          if (signedErr) {
            console.warn('Falha ao gerar Signed URL, seguindo sem preview imediato:', signedErr);
            previewUrl = '';
          } else {
            previewUrl = signed?.signedUrl || '';
          }
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from(options.bucket)
            .getPublicUrl(filePath);
          previewUrl = publicUrl;
        }

        uploadedFiles.push({
          id: data.path,
          name: file.name,
          url: previewUrl,
          type: file.type,
          size: fileToUpload.size,
          storagePath: data.path
        });

        // Atualizar progresso
        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      toast({
        title: "Upload concluído",
        description: `${uploadedFiles.length} arquivo(s) enviado(s) com sucesso`,
      });

      return uploadedFiles;
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao enviar arquivo(s)",
        variant: "destructive",
      });
      return [];
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [options, validateFile, compressImage, toast]);

  const deleteFile = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(options.bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover arquivo",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [options.bucket, toast]);

  return {
    uploadFiles,
    deleteFile,
    uploading,
    uploadProgress
  };
};