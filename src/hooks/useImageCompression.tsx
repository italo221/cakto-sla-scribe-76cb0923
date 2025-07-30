import { useState, useCallback } from 'react';

interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
}

export const useImageCompression = () => {
  const [isCompressing, setIsCompressing] = useState(false);

  const compressImage = useCallback(async (
    file: File, 
    options: CompressionOptions = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }
  ): Promise<File> => {
    setIsCompressing(true);
    
    try {
      // Criar um canvas para redimensionar e comprimir a imagem
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          // Calcular novas dimensões mantendo aspect ratio
          let { width, height } = img;
          const maxDimension = options.maxWidthOrHeight;
          
          if (width > height) {
            if (width > maxDimension) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Desenhar a imagem redimensionada
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Converter para blob com qualidade ajustada
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Verificar se ainda está muito grande
                const targetSize = options.maxSizeMB * 1024 * 1024;
                if (blob.size > targetSize) {
                  // Tentar com qualidade menor
                  canvas.toBlob(
                    (compressedBlob) => {
                      if (compressedBlob) {
                        const compressedFile = new File([compressedBlob], file.name, {
                          type: file.type,
                          lastModified: Date.now()
                        });
                        resolve(compressedFile);
                      } else {
                        reject(new Error('Falha na compressão da imagem'));
                      }
                    },
                    file.type,
                    0.6 // Qualidade mais baixa
                  );
                } else {
                  const compressedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now()
                  });
                  resolve(compressedFile);
                }
              } else {
                reject(new Error('Falha na compressão da imagem'));
              }
            },
            file.type,
            0.8 // Qualidade inicial
          );
        };
        
        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      throw new Error(`Erro na compressão: ${error}`);
    } finally {
      setIsCompressing(false);
    }
  }, []);

  return { compressImage, isCompressing };
};