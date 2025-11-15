'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  LogOut, 
  Upload, 
  FileText, 
  Trash2, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Database
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Document {
  id: string;
  original_filename: string;
  file_size: number;
  upload_date: string;
  num_chunks: number;
  status: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  useEffect(() => {
    checkAdmin();
    fetchDocuments();
  }, []);

  const checkAdmin = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, username')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      setUser({ ...user, ...profile });
    } else {
      router.push('/login');
    }
    setLoading(false);
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/admin/documents/list');
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadSuccess(`Successfully uploaded: ${file.name} (${data.document.numChunks} chunks stored in vector DB)`);
      fetchDocuments(); // Refresh list
      
      // Clear file input
      e.target.value = '';
      
      setTimeout(() => setUploadSuccess(''), 5000);
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This will remove all associated data from the vector database.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      fetchDocuments(); // Refresh list
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-slate-400">Vector Database Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.username || 'Admin'}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Info Banner */}
        <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-400">
            <strong>Vector Database Storage:</strong> PDFs are processed and stored in Pinecone for future retrieval. 
            Query functionality will be added later.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Upload PDF Document</h2>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{uploadError}</p>
              </div>
            )}

            {uploadSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <p className="text-sm text-green-400">{uploadSuccess}</p>
              </div>
            )}

            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                    <p className="text-slate-300">Processing PDF...</p>
                    <p className="text-xs text-slate-500">Extracting text, chunking, and storing in vector DB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="w-12 h-12 text-slate-400" />
                    <p className="text-slate-300 font-medium">Click to upload PDF</p>
                    <p className="text-xs text-slate-500">Only PDF files are supported</p>
                  </div>
                )}
              </label>
            </div>

            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
              <h3 className="text-sm font-medium text-slate-300 mb-2">Processing Pipeline:</h3>
              <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                <li>Upload PDF document</li>
                <li>Extract text content</li>
                <li>Split into paragraph-based chunks</li>
                <li>Generate embeddings (OpenAI ada-002)</li>
                <li>Store vectors in Pinecone database</li>
                <li>Save metadata in Supabase</li>
              </ol>
            </div>
          </div>

          {/* Documents List */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Vector Database</h2>
              <span className="ml-auto text-sm text-slate-400">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'}
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No documents stored yet</p>
                  <p className="text-xs mt-1">Upload PDFs to populate the vector database</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">
                          {doc.original_filename}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="text-cyan-400 font-medium">{doc.num_chunks} vectors</span>
                          <span>•</span>
                          <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">
                            <CheckCircle className="w-3 h-3" />
                            Stored in Pinecone
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.original_filename)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Total Documents</p>
            <p className="text-2xl font-bold text-white">{documents.length}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Total Vectors</p>
            <p className="text-2xl font-bold text-cyan-400">
              {documents.reduce((sum, doc) => sum + doc.num_chunks, 0)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Total Storage</p>
            <p className="text-2xl font-bold text-white">
              {(documents.reduce((sum, doc) => sum + doc.file_size, 0) / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}