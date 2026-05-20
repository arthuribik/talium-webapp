import { useState, useEffect } from 'react';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import { HiFolder, HiDocument, HiDownload, HiTrash, HiPlus, HiUpload } from 'react-icons/hi';

export default function Documents() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // Fetch documents
      const response = await api.get('/v1/professional/documents');
      setDocuments(response.data.data?.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await api.delete(`/v1/professional/documents/${documentId}`);
      setDocuments(documents.filter((doc) => doc.id !== documentId));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
              <HiFolder className="w-6 h-6 mr-2 text-brand-600" />
              Documents
            </h1>
            <p className="text-gray-600">Manage your uploaded documents and certificates</p>
          </div>
          <button className="flex items-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
            <HiPlus className="w-5 h-5 mr-2" />
            Upload Document
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiFolder className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-4">
              You haven't uploaded any documents yet. Upload your certificates, resumes, and other important documents.
            </p>
            <button className="flex items-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
              <HiUpload className="w-5 h-5 mr-2" />
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((document) => (
              <div
                key={document.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
                      <HiDocument className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{document.name || 'Document'}</h3>
                      <p className="text-xs text-gray-500">{document.type || 'File'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <button
                    onClick={() => window.open(document.url, '_blank')}
                    className="flex items-center text-sm text-brand-600 hover:text-brand-700"
                  >
                    <HiDownload className="w-4 h-4 mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(document.id)}
                    className="flex items-center text-sm text-red-600 hover:text-red-700"
                  >
                    <HiTrash className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProfessionalLayout>
  );
}

