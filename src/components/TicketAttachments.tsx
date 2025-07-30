import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Eye, Download, FileImage, Video, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface TicketAttachmentsProps {
  linkReferencia?: string;
  anexos?: string;
  className?: string;
  compact?: boolean;
}

export default function TicketAttachments({ 
  linkReferencia, 
  anexos, 
  className,
  compact = false 
}: TicketAttachmentsProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Parse dos anexos
  const attachments: AttachmentFile[] = (() => {
    if (!anexos) return [];
    try {
      const parsed = JSON.parse(anexos);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (type: string) => type.startsWith('image/');
  const isVideo = (type: string) => type.startsWith('video/');

  const getFileIcon = (type: string) => {
    if (isImage(type)) return <FileImage className="w-4 h-4" />;
    if (isVideo(type)) return <Video className="w-4 h-4" />;
    return <Paperclip className="w-4 h-4" />;
  };

  // Se não há link nem anexos, não renderizar nada
  if (!linkReferencia && attachments.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-xs", className)}>
        {linkReferencia && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(linkReferencia, '_blank', 'noopener,noreferrer')}
            className="h-6 px-2 gap-1 text-xs"
          >
            <ExternalLink className="w-3 h-3" />
            Link
          </Button>
        )}
        {attachments.length > 0 && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Paperclip className="w-3 h-3" />
            {attachments.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
        {/* Link de referência */}
        {linkReferencia && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Link de referência
            </h4>
            <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate flex-1">{linkReferencia}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(linkReferencia, '_blank', 'noopener,noreferrer')}
                className="h-7 px-2"
              >
                Abrir
              </Button>
            </div>
          </div>
        )}

        {/* Anexos */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Anexos ({attachments.length})
            </h4>
            
            {/* Grid de anexos */}
            <div className="grid gap-2">
              {attachments.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                  {/* Prévia */}
                  <div className="flex-shrink-0">
                    {isImage(file.type) ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(file.url)}
                      />
                    ) : isVideo(file.type) ? (
                      <video
                        src={file.url}
                        className="w-12 h-12 object-cover rounded border"
                        muted
                        poster=""
                      />
                    ) : (
                      <div className="w-12 h-12 bg-secondary rounded border flex items-center justify-center">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                  </div>
                  
                  {/* Informações */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                    </p>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    {isImage(file.type) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedImage(file.url)}
                        className="h-8 w-8 p-0"
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {isVideo(file.type) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                        className="h-8 w-8 p-0"
                        title="Abrir vídeo"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    
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
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de visualização de imagem */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Visualizar imagem</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="p-6 pt-0">
              <img
                src={selectedImage}
                alt="Anexo"
                className="w-full h-auto max-h-[70vh] object-contain rounded border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}