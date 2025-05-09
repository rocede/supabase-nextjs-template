"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Download, Share2, Trash2, Loader2, FileIcon, AlertCircle, CheckCircle, Copy, Brain } from 'lucide-react';
import { createSPASassClient } from '@/lib/supabase/client';
import { FileObject } from '@supabase/storage-js';
import { SupabaseClient } from '@supabase/supabase-js';

export default function FileManagementPage() {
    const { user } = useGlobal();
    const [files, setFiles] = useState<FileObject[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [shareUrl, setShareUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const [showCopiedMessage, setShowCopiedMessage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [processingLlamaIndex, setProcessingLlamaIndex] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
    const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

    useEffect(() => {
        const initSupabase = async () => {
            const client = await createSPASassClient();
            setSupabase(client.getSupabaseClient());
        };
        initSupabase();
    }, []);

    const loadFiles = useCallback(async () => {
        if (!user?.id || !supabase) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .storage
                .from('avatars')
                .list(user.id);

            if (error) {
                throw error;
            }

            setFiles(data || []);
        } catch (error) {
            console.error('Error loading files:', error);
            setError('Error loading files');
        } finally {
            setLoading(false);
        }
    }, [user, supabase]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const handleFileUpload = useCallback(async (file: File) => {
        if (!user?.id || !supabase) return;
        try {
            setUploading(true);
            setError('');

            const { error } = await supabase
                .storage
                .from('avatars')
                .upload(`${user.id}/${file.name}`, file);

            if (error) throw error;

            await loadFiles();
            setSuccess('File uploaded successfully');
        } catch (err) {
            setError('Failed to upload file');
            console.error('Error uploading file:', err);
        } finally {
            setUploading(false);
        }
    }, [user, supabase, loadFiles]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = event.target.files;
        if (!fileList || fileList.length === 0) return;
        handleFileUpload(fileList[0]);
        event.target.value = '';
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    }, [handleFileUpload]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDownload = async (filename: string) => {
        if (!user?.id || !supabase) return;
        try {
            setError('');
            const { data, error } = await supabase
                .storage
                .from('avatars')
                .createSignedUrl(`${user.id}/${filename}`, 60);

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (err) {
            setError('Failed to download file');
            console.error('Error downloading file:', err);
        }
    };

    const handleShare = async (filename: string) => {
        if (!user?.id || !supabase) return;
        try {
            setError('');
            const { data, error } = await supabase
                .storage
                .from('avatars')
                .createSignedUrl(`${user.id}/${filename}`, 24 * 60 * 60);

            if (error) throw error;
            if (data?.signedUrl) {
                setShareUrl(data.signedUrl);
                setSelectedFile(filename);
            }
        } catch (err) {
            setError('Failed to generate share link');
            console.error('Error sharing file:', err);
        }
    };

    const handleDelete = async () => {
        if (!fileToDelete || !user?.id || !supabase) return;

        try {
            setError('');
            const { error } = await supabase
                .storage
                .from('avatars')
                .remove([`${user.id}/${fileToDelete}`]);

            if (error) throw error;

            await loadFiles();
            setSuccess('File deleted successfully');
        } catch (err) {
            setError('Failed to delete file');
            console.error('Error deleting file:', err);
        } finally {
            setShowDeleteDialog(false);
            setFileToDelete(null);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setShowCopiedMessage(true);
            setTimeout(() => setShowCopiedMessage(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            setError('Failed to copy to clipboard');
        }
    };

    const sendToLlamaIndex = async (filename: string) => {
        if (!user?.id || !supabase) return;
        try {
            setProcessingLlamaIndex(true);
            setError('');
            setSelectedFile(filename);
            
            const { data, error } = await supabase
                .storage
                .from('avatars')
                .createSignedUrl(`${user.id}/${filename}`, 60);
            
            if (error) throw error;
            if (!data?.signedUrl) throw new Error('Failed to generate signed URL');
            
            console.log('Sending request to LlamaIndex API with URL:', data.signedUrl);
            
            const response = await fetch('http://localhost:8000/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: `Process and analyze this document: ${data.signedUrl}`,
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error('LlamaIndex API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });
                throw new Error(
                    `LlamaIndex API Error (${response.status}): ${
                        errorData?.detail || response.statusText
                    }`
                );
            }
            
            const result = await response.json();
            console.log('LlamaIndex API Response:', result);
            setSuccess('Document processed successfully by LlamaIndex');
            setAnalysisResult(result.response);
            setShowAnalysisDialog(true);
            
        } catch (err) {
            console.error('Error processing document:', err);
            setError(err instanceof Error ? err.message : 'Failed to process document with LlamaIndex');
        } finally {
            setProcessingLlamaIndex(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>File Management</CardTitle>
                    <CardDescription>Upload, download, and share your files</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4"/>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="mb-4">
                            <CheckCircle className="h-4 w-4"/>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex items-center justify-center w-full">
                        <label
                            className={`w-full flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border-2 cursor-pointer transition-colors ${
                                isDragging
                                    ? 'border-primary-500 border-dashed bg-primary-50'
                                    : 'border-primary-600 hover:bg-primary-50'
                            }`}
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <Upload className="w-8 h-8"/>
                            <span className="mt-2 text-base">
                                {uploading
                                    ? 'Uploading...'
                                    : isDragging
                                        ? 'Drop your file here'
                                        : 'Drag and drop or click to select a file (max 50mb)'}
                            </span>
                            <input
                                type="file"
                                className="hidden"
                                onChange={handleInputChange}
                                disabled={uploading}
                            />
                        </label>
                    </div>

                    <div className="space-y-4">
                        {loading && (
                            <div className="flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin"/>
                            </div>
                        )}
                        {files.length === 0 ? (
                            <p className="text-center text-gray-500">No files uploaded yet</p>
                        ) : (
                            files.map((file) => (
                                <div
                                    key={file.name}
                                    className="flex items-center justify-between p-4 bg-white rounded-lg border"
                                >
                                    <div className="flex items-center space-x-3">
                                        <FileIcon className="h-6 w-6 text-gray-400"/>
                                        <span className="font-medium">{file.name.split('/').pop()}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {processingLlamaIndex && selectedFile === file.name && (
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-600"/>
                                        )}
                                        {file.name.toLowerCase().endsWith('.pdf') && (
                                            <button
                                                onClick={() => sendToLlamaIndex(file.name)}
                                                disabled={processingLlamaIndex}
                                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                                                title="Process with LlamaIndex"
                                            >
                                                <Brain className="w-5 h-5"/>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDownload(file.name)}
                                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-colors"
                                        >
                                            <Download className="w-5 h-5"/>
                                        </button>
                                        <button
                                            onClick={() => handleShare(file.name)}
                                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-colors"
                                        >
                                            <Share2 className="w-5 h-5"/>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFileToDelete(file.name);
                                                setShowDeleteDialog(true);
                                            }}
                                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Share Dialog */}
                    <Dialog open={Boolean(shareUrl)} onOpenChange={() => {
                        setShareUrl('');
                        setSelectedFile(null);
                    }}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Share {selectedFile?.split('/').pop()}</DialogTitle>
                                <DialogDescription>
                                    Copy the link below to share your file. This link will expire in 24 hours.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 p-2 border rounded bg-gray-50"
                                />
                                <button
                                    onClick={() => copyToClipboard(shareUrl)}
                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors relative"
                                >
                                    <Copy className="h-5 w-5"/>
                                    {showCopiedMessage && (
                                        <span
                                            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                                            Copied!
                                        </span>
                                    )}
                                </button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete File</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this file? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>

            {/* Analysis Results Dialog */}
            <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Document Analysis Results</DialogTitle>
                        <DialogDescription>
                            Analysis of {selectedFile?.split('/').pop()}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                        {analysisResult && (
                            <div className="prose prose-sm max-w-none">
                                {analysisResult.split('\n').map((line, index) => (
                                    <p key={index} className="mb-2">
                                        {line}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}