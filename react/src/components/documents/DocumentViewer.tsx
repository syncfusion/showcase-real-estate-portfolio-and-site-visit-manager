import React from 'react';
import {
  PdfViewerComponent,
  Toolbar,
  Magnification,
  Navigation,
  LinkAnnotation,
  BookmarkView,
  ThumbnailView,
  Print,
  TextSelection,
  TextSearch,
  Inject
} from '@syncfusion/ej2-react-pdfviewer';

// The Syncfusion PDF Viewer in its own chunk: the package is about 7 MB of script, so Due Diligence loads it lazily and shows its list and filters first.
const SERVICES = [Toolbar, Magnification, Navigation, LinkAnnotation, BookmarkView, ThumbnailView, Print, TextSelection, TextSearch];

interface DocumentViewerProps {
  url: string;
  onLoaded: () => void;
  onFailed: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ url, onLoaded, onFailed }) => (
  <PdfViewerComponent
    id="due-diligence-pdf-viewer"
    documentPath={url}
    documentLoad={onLoaded}
    documentLoadFailed={onFailed}
    resourceUrl="https://cdn.syncfusion.com/ej2/35.1.37/dist/ej2-pdfviewer-lib"
    height="100%"
    style={{ width: '100%', height: '100%' }}
  >
    <Inject services={SERVICES} />
  </PdfViewerComponent>
);

export default DocumentViewer;
