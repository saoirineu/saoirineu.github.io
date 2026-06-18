import { europeanGatheringUploadMaxBytes, formatFileSize } from './europeanGatheringUpload';

export type FileUploadLabelsLocale = 'pt' | 'en' | 'es' | 'it';

export type FileUploadLabels = {
  closeLabel: string;
  compressedSizeLabel: string;
  compressionBody: string;
  compressionError: string;
  compressionTitle: string;
  downloadLabel: string;
  invalidTypeError: string;
  keepOriginalLabel: string;
  openInNewTabLabel: string;
  originalSizeLabel: string;
  previewLabel: string;
  previewTitle: string;
  processingLabel: string;
  removeLabel: string;
  selectLabel: string;
  tooLargeError: string;
  useCompressedLabel: string;
};

const labelsByLocale: Record<FileUploadLabelsLocale, FileUploadLabels> = {
  pt: {
    closeLabel: 'Fechar',
    compressedSizeLabel: 'Tamanho reduzido',
    compressionBody: 'A imagem foi reduzida antes do envio. Verifique o resultado e escolha se deseja usar a versao reduzida ou manter o arquivo original.',
    compressionError: 'Nao foi possivel reduzir a imagem automaticamente. Voce pode manter o arquivo original se ele estiver dentro do limite.',
    compressionTitle: 'Revisar imagem reduzida',
    downloadLabel: 'Baixar',
    invalidTypeError: 'Envie um arquivo PDF, JPG, JPEG ou PNG.',
    keepOriginalLabel: 'Manter original',
    openInNewTabLabel: 'Abrir em nova aba',
    originalSizeLabel: 'Tamanho original',
    previewLabel: 'Ver',
    previewTitle: 'Visualizar arquivo',
    processingLabel: 'Preparando imagem...',
    removeLabel: 'Remover',
    selectLabel: 'Escolher ou soltar arquivo',
    tooLargeError: 'O arquivo precisa ter no maximo XXX.',
    useCompressedLabel: 'Usar imagem reduzida'
  },
  en: {
    closeLabel: 'Close',
    compressedSizeLabel: 'Reduced size',
    compressionBody: 'This image was reduced before upload. Review the result and choose whether to use the reduced version or keep the original file.',
    compressionError: 'The image could not be reduced automatically. You may keep the original file if it is within the limit.',
    compressionTitle: 'Review reduced image',
    downloadLabel: 'Download',
    invalidTypeError: 'Please upload a PDF, JPG, JPEG, or PNG file.',
    keepOriginalLabel: 'Keep original',
    openInNewTabLabel: 'Open in new tab',
    originalSizeLabel: 'Original size',
    previewLabel: 'View',
    previewTitle: 'Preview file',
    processingLabel: 'Preparing image...',
    removeLabel: 'Remove',
    selectLabel: 'Choose or drop file',
    tooLargeError: 'The file must be at most XXX.',
    useCompressedLabel: 'Use reduced image'
  },
  es: {
    closeLabel: 'Cerrar',
    compressedSizeLabel: 'Tamano reducido',
    compressionBody: 'La imagen se redujo antes del envio. Revise el resultado y elija si desea usar la version reducida o mantener el archivo original.',
    compressionError: 'No fue posible reducir la imagen automaticamente. Puede mantener el archivo original si esta dentro del limite.',
    compressionTitle: 'Revisar imagen reducida',
    downloadLabel: 'Descargar',
    invalidTypeError: 'Suba un archivo PDF, JPG, JPEG o PNG.',
    keepOriginalLabel: 'Mantener original',
    openInNewTabLabel: 'Abrir en una pestaña nueva',
    originalSizeLabel: 'Tamano original',
    previewLabel: 'Ver',
    previewTitle: 'Ver archivo',
    processingLabel: 'Preparando imagen...',
    removeLabel: 'Quitar',
    selectLabel: 'Elegir o soltar archivo',
    tooLargeError: 'El archivo debe tener como maximo XXX.',
    useCompressedLabel: 'Usar imagen reducida'
  },
  it: {
    closeLabel: 'Chiudi',
    compressedSizeLabel: 'Dimensione ridotta',
    compressionBody: 'L\'immagine e stata ridotta prima del caricamento. Controlla il risultato e scegli se usare la versione ridotta o mantenere il file originale.',
    compressionError: 'Non e stato possibile ridurre automaticamente l\'immagine. Puoi mantenere il file originale se rientra nel limite.',
    compressionTitle: 'Controlla immagine ridotta',
    downloadLabel: 'Scarica',
    invalidTypeError: 'Carica un file PDF, JPG, JPEG o PNG.',
    keepOriginalLabel: 'Mantieni originale',
    openInNewTabLabel: 'Apri in una nuova scheda',
    originalSizeLabel: 'Dimensione originale',
    previewLabel: 'Apri',
    previewTitle: 'Anteprima file',
    processingLabel: 'Preparazione immagine...',
    removeLabel: 'Rimuovi',
    selectLabel: 'Scegli o trascina file',
    tooLargeError: 'Il file deve essere al massimo di XXX.',
    useCompressedLabel: 'Usa immagine ridotta'
  }
};

export function getFileUploadLabels(locale: FileUploadLabelsLocale): FileUploadLabels {
  const labels = labelsByLocale[locale];
  return {
    ...labels,
    tooLargeError: labels.tooLargeError.replace('XXX', formatFileSize(europeanGatheringUploadMaxBytes))
  };
}
