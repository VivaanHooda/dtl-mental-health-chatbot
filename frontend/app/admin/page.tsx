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
  Database,
  BarChart3,
  Table2,
  Image as ImageIcon,
  Type,
  ChevronDown,
  ChevronRight,
  Calendar,
  HardDrive,
  Layers
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface DocumentStats {
  id: string;
  filename: string;
  file_size: number;
  upload_date: string;
  num_chunks: number;
  status: string;
  metadata?: {
    totalChunks?: number;
    textChunks?: number;
    tableChunks?: number;
    imageChunks?: number;
    totalPages?: number;
    processingTime?: number;
    contentTypes?: {
      text: number;
      table: number;
      image: number;
    };
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentStats[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

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
      // Add timestamp to prevent caching
      const response = await fetch(`/api/admin/documents/list?t=${Date.now()}`);
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const toggleExpanded = (docId: string) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocs(newExpanded);
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

      const statsMsg = data.document.stats 
        ? ` (${data.document.stats.text} text, ${data.document.stats.tables} tables, ${data.document.stats.images} images)`
        : '';
      
      setUploadSuccess(`Successfully uploaded: ${file.name} - ${data.document.numChunks} chunks${statsMsg}`);
      fetchDocuments(); // Refresh list
      
      // Clear file input
      e.target.value = '';
      
      setTimeout(() => setUploadSuccess(''), 10000);
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

  const getTotalStats = () => {
    return documents.reduce((acc, doc) => {
      const meta = doc.metadata;
      return {
        totalDocs: acc.totalDocs + 1,
        totalChunks: acc.totalChunks + (doc.num_chunks || 0),
        totalText: acc.totalText + (meta?.textChunks || meta?.contentTypes?.text || 0),
        totalTables: acc.totalTables + (meta?.tableChunks || meta?.contentTypes?.table || 0),
        totalImages: acc.totalImages + (meta?.imageChunks || meta?.contentTypes?.image || 0),
        totalSize: acc.totalSize + doc.file_size,
        totalPages: acc.totalPages + (meta?.totalPages || 0),
      };
    }, {
      totalDocs: 0,
      totalChunks: 0,
      totalText: 0,
      totalTables: 0,
      totalImages: 0,
      totalSize: 0,
      totalPages: 0,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen aurora-bg bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="min-h-screen aurora-bg bg-background">
      {/* Header */}
      <header className="glass border-b border-border/50 px-6 py-4 sticky top-0 backdrop-blur-xl z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">RAG Vector Database Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.username || 'Admin'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overall Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="glass rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Documents</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalDocs}</p>
          </div>
          
          <div className="glass rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <p className="text-muted-foreground text-xs">Total Vectors</p>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.totalChunks}</p>
          </div>

          <div className="glass rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-info" />
              <p className="text-muted-foreground text-xs">Text Chunks</p>
            </div>
            <p className="text-2xl font-bold text-info">{stats.totalText}</p>
          </div>

          <div className="glass rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Table2 className="w-4 h-4 text-success" />
              <p className="text-muted-foreground text-xs">Table Chunks</p>
            </div>
            <p className="text-2xl font-bold text-success">{stats.totalTables}</p>
          </div>

          <div className="glass rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-secondary" />
              <p className="text-muted-foreground text-xs">Image Chunks</p>
            </div>
            <p className="text-2xl font-bold text-secondary">{stats.totalImages}</p>
          </div>

          <div className="glass rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Total Pages</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalPages}</p>
          </div>

          <div className="glass rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Storage</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {(stats.totalSize / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="glass rounded-3xl p-6 hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)] transition-all duration-300 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Upload PDF</h2>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 glass border-error/30 rounded-2xl flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <p className="text-sm text-error">{uploadError}</p>
              </div>
            )}

            {uploadSuccess && (
              <div className="mb-4 p-3 glass border-success/30 rounded-2xl flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <p className="text-sm text-success">{uploadSuccess}</p>
              </div>
            )}

            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary transition-colors duration-200">
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
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-foreground">Processing...</p>
                    <p className="text-xs text-muted-foreground">Extracting content with Docling</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="w-12 h-12 text-muted-foreground" />
                    <p className="text-foreground font-medium">Click to upload</p>
                    <p className="text-xs text-muted-foreground">PDF files only</p>
                  </div>
                )}
              </label>
            </div>

            <div className="mt-4 p-4 glass rounded-2xl">
              <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Processing Pipeline
              </h3>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Extract tables, images & text (Docling)</li>
                <li>Smart chunking with context</li>
                <li>Generate embeddings (Gemini)</li>
                <li>Store in Pinecone vector DB</li>
                <li>Save metadata to Supabase</li>
              </ol>
            </div>
          </div>

          {/* Documents List with Detailed Stats */}
          <div className="glass rounded-3xl p-6 hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)] transition-all duration-300 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Document Statistics</h2>
              <span className="ml-auto text-sm text-muted-foreground">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">No documents uploaded yet</p>
                  <p className="text-xs mt-1">Upload PDFs to populate the RAG database</p>
                </div>
              ) : (
                documents.map((doc) => {
                  const isExpanded = expandedDocs.has(doc.id);
                  const meta = doc.metadata;
                  
                  return (
                    <div
                      key={doc.id}
                      className="glass rounded-2xl hover:shadow-lg transition-all duration-200"
                    >
                      {/* Header - Always Visible */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            onClick={() => toggleExpanded(doc.id)}
                            className="flex-1 text-left flex items-start gap-2 min-w-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-foreground truncate">
                                {doc.filename}
                              </h3>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <HardDrive className="w-3 h-3" />
                                  {(doc.file_size / 1024).toFixed(1)} KB
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-primary font-medium">
                                  <Database className="w-3 h-3" />
                                  {doc.num_chunks} vectors
                                </span>
                                {meta?.totalPages && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Layers className="w-3 h-3" />
                                      {meta.totalPages} pages
                                    </span>
                                  </>
                                )}
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(doc.upload_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                            className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-xl transition-colors shrink-0"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Stats */}
                      {isExpanded && meta && (
                        <div className="px-4 pb-4 border-t border-border/30">
                          <div className="pt-4 grid grid-cols-3 gap-3">
                            <div className="glass rounded-2xl p-3 hover:shadow-lg transition-all duration-200">
                              <div className="flex items-center gap-2 mb-1">
                                <Type className="w-3 h-3 text-info" />
                                <p className="text-xs text-info font-medium">Text</p>
                              </div>
                              <p className="text-lg font-bold text-info">
                                {meta.textChunks || meta.contentTypes?.text || 0}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">chunks</p>
                            </div>

                            <div className="glass rounded-2xl p-3 hover:shadow-lg transition-all duration-200">
                              <div className="flex items-center gap-2 mb-1">
                                <Table2 className="w-3 h-3 text-success" />
                                <p className="text-xs text-success font-medium">Tables</p>
                              </div>
                              <p className="text-lg font-bold text-success">
                                {meta.tableChunks || meta.contentTypes?.table || 0}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">chunks</p>
                            </div>

                            <div className="glass rounded-2xl p-3 hover:shadow-lg transition-all duration-200">
                              <div className="flex items-center gap-2 mb-1">
                                <ImageIcon className="w-3 h-3 text-secondary" />
                                <p className="text-xs text-secondary font-medium">Images</p>
                              </div>
                              <p className="text-lg font-bold text-secondary">
                                {meta.imageChunks || meta.contentTypes?.image || 0}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">chunks</p>
                            </div>
                          </div>

                          {meta.processingTime && (
                            <div className="mt-3 p-2 glass rounded-xl text-xs text-muted-foreground">
                              ⚡ Processing time: {meta.processingTime.toFixed(2)}s
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}