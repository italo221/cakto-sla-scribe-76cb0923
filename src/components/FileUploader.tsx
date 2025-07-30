import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Upload, X, Eye, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface FileUploaderProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

const ALLOWED_TYPES = [
  'image/png',
  'image/jpg', 
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/webm'
];

export default function FileUploader({
  files,
  onFilesChange,
  maxFiles = 3,
  maxSizeMB = 10,
  acceptedTypes = ALLOWED_TYPES,
  className
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const { uploadFiles, deleteFile, uploading, uploadProgress } = useFileUpload({
    bucket: 'ticket-anexos',
    maxSizeMB,
    maxFiles,
    allowedTypes: acceptedTypes
  });

  const handleFiles = async (fileList: FileList) => {
    if (files.length + fileList.length > maxFiles) {
      return;
    }

    const uploadedFiles = await uploadFiles(fileList);
    if (uploadedFiles.length > 0) {
      onFilesChange([...files, ...uploadedFiles]);
    }
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
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = async (fileToRemove: UploadedFile) => {
    const success = await deleteFile(fileToRemove.id);
    if (success) {
      onFilesChange(files.filter(file => file.id !== fileToRemove.id));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (type: string) => type.startsWith('image/');
  const isVideo = (type: string) => type.startsWith('video/');

  return (
    <div className={cn("space-y-4", className)}>
      {/* Área de upload */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          uploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading || files.length >= maxFiles}
        />
        
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-2">
          {uploading ? 'Enviando arquivos...' : 'Arraste arquivos aqui ou clique para selecionar'}
        </p>
        <p className="text-xs text-muted-foreground">
          Máximo {maxFiles} arquivos • Imagens: {maxSizeMB}MB • Vídeos: sem limite • PNG, JPG, WebP, MP4, WebM
        </p>
        
        {uploading && (
          <div className="mt-2">
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{Math.round(uploadProgress)}%</p>
          </div>
        )}
      </div>

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Anexos ({files.length}/{maxFiles})</h4>
          <div className="grid gap-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                {/* Prévia do arquivo */}
                <div className="flex-shrink-0">
                  {isImage(file.type) ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  ) : isVideo(file.type) ? (
                    <video
                      src={file.url}
                      className="w-12 h-12 object-cover rounded border"
                      muted
                    />
                  ) : (
                    <div className="w-12 h-12 bg-secondary rounded border flex items-center justify-center">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Informações do arquivo */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                  </p>
                </div>
                
                {/* Ações */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(file.url, '_blank')}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = file.url;
                      a.download = file.name;
                      a.click();
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}