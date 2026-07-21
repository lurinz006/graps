import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, ArrowRight, Loader2, X } from 'lucide-react';

export default function DataUploader({ onDataUploaded }) {
  const [file, setFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
  };

  const validateAndSetFile = (selectedFile) => {
    const name = selectedFile.name;
    const type = selectedFile.type;
    const isJson = type === 'application/json' || name.endsWith('.json');
    const isCsv = type === 'text/csv' || name.endsWith('.csv');
    const isExcel = type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    type === 'application/vnd.ms-excel' || 
                    name.endsWith('.xlsx') || 
                    name.endsWith('.xls');
    if (!isJson && !isCsv && !isExcel) {
      setErrorMessage('Unsupported file type. Please upload a JSON, CSV, or Excel file.');
      setUploadStatus('error');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  const handleUpload = () => {
    if (!file) return;
    setIsConfirmOpen(false);
    setUploadStatus('uploading');

    // onDataUploaded returns a Promise; resolve/reject controls our status
    const result = onDataUploaded ? onDataUploaded(file) : Promise.resolve();
    Promise.resolve(result)
      .then(() => setUploadStatus('success'))
      .catch((err) => {
        setErrorMessage(err?.message || 'Upload failed. Please try again.');
        setUploadStatus('error');
      });
  };

  const removeFile = () => {
    setFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">Upload Dataset</h3>
        <span className="text-xs text-slate-400">Supported: JSON, CSV, Excel</span>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
          isDragActive
            ? 'border-brand-500 bg-brand-500/5'
            : file
            ? 'border-slate-700 bg-slate-950/40'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
        }`}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".json,.csv,.xlsx,.xls,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={handleChange}
        />

        {file ? (
          <div className="w-full flex flex-col items-center">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl mb-3">
              <FileText size={28} />
            </div>
            <p className="text-sm font-medium text-slate-200 max-w-xs truncate mb-1">{file.name}</p>
            <p className="text-xs text-slate-500 mb-4">{(file.size / 1024).toFixed(2)} KB</p>

            {uploadStatus === 'idle' && (
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsConfirmOpen(true); }}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-slate-50 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                >
                  Upload &amp; Sync <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="p-4 bg-slate-800/40 text-slate-400 rounded-full mb-3">
              <Upload size={24} />
            </div>
            <p className="text-sm text-slate-300 mb-1">
              Drag and drop file here, or <span className="text-brand-400 font-semibold">browse</span>
            </p>
            <p className="text-xs text-slate-500">Maximum file size: 10MB</p>
          </>
        )}
      </div>

      {/* Uploading Status */}
      {uploadStatus === 'uploading' && (
        <div className="mt-4 bg-slate-950/50 border border-slate-800/60 rounded-xl p-4 flex items-center gap-3">
          <Loader2 size={16} className="text-brand-400 animate-spin shrink-0" />
          <div>
            <p className="text-xs font-medium text-slate-300">Inserting records into PostgreSQL...</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Processing all rows in bulk chunks. Please wait.</p>
          </div>
        </div>
      )}

      {/* Success */}
      {uploadStatus === 'success' && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-emerald-300">Sync Completed Successfully</h4>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">
              Dataset saved to local PostgreSQL database. ML analytics job dispatched to background queue.
            </p>
            <button
              onClick={removeFile}
              className="mt-2 text-[10px] font-bold underline text-emerald-300 hover:text-emerald-200 block"
            >
              Upload another file
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {uploadStatus === 'error' && (
        <div className="mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-rose-300">Upload Failed</h4>
            <p className="text-[10px] text-rose-400/80 mt-0.5">{errorMessage}</p>
            <button
              onClick={removeFile}
              className="mt-2 text-[10px] font-bold underline text-rose-300 hover:text-rose-200 block"
            >
              Clear error
            </button>
          </div>
        </div>
      )}
      {/* ⚠️ OVERWRITE DATASET CONFIRMATION MODAL */}
      {isConfirmOpen && file && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsConfirmOpen(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Upload size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Dataset Upload</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">Overwrite Database?</h3>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              You are about to upload <strong className="text-slate-200">{file.name}</strong>. Note that syncing this file will overwrite existing spatial data points on the map. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                className="bg-brand-600 hover:bg-brand-500 text-slate-50 font-semibold rounded-xl px-4 py-2 text-xs shadow transition-all cursor-pointer"
              >
                Upload &amp; Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
