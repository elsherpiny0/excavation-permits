import { useState, useCallback } from 'react';
import { uploadToCloudinary } from '../../lib/cloudinary';
import {
    Upload,
    X,
    FileText,
    Image,
    File,
    Loader2,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FileUploader({ files, onFilesChange, maxFiles = 10 }) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    }, [files, maxFiles]);

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    async function handleFiles(fileList) {
        const newFiles = Array.from(fileList);
        const total = files.length + newFiles.length;

        if (total > maxFiles) {
            toast.error(`Maximum ${maxFiles} files allowed`);
            return;
        }

        setUploading(true);
        const uploadedFiles = [];

        for (const file of newFiles) {
            const fileId = Date.now() + '-' + file.name;
            setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

            try {
                const result = await uploadToCloudinary(file, (progress) => {
                    setUploadProgress((prev) => ({ ...prev, [fileId]: progress }));
                });

                uploadedFiles.push({
                    url: result.secure_url,
                    name: result.original_filename || file.name,
                    format: result.format,
                    size: result.bytes || file.size,
                });

                setUploadProgress((prev) => {
                    const updated = { ...prev };
                    delete updated[fileId];
                    return updated;
                });
            } catch (error) {
                console.error('Upload error:', error);
                toast.error(`Failed to upload ${file.name}`);
                setUploadProgress((prev) => {
                    const updated = { ...prev };
                    delete updated[fileId];
                    return updated;
                });
            }
        }

        if (uploadedFiles.length > 0) {
            onFilesChange([...files, ...uploadedFiles]);
            toast.success(`${uploadedFiles.length} file(s) uploaded`);
        }

        setUploading(false);
    }

    const removeFile = (index) => {
        const updated = files.filter((_, i) => i !== index);
        onFilesChange(updated);
    };

    const getFileIcon = (format) => {
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(format?.toLowerCase())) {
            return Image;
        }
        if (format?.toLowerCase() === 'pdf') {
            return FileText;
        }
        return File;
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${dragActive
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-surface-200 hover:border-surface-300 bg-surface-50'
                    }`}
            >
                <input
                    type="file"
                    id="fileUpload"
                    multiple
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />

                <div className="flex flex-col items-center gap-3">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${dragActive ? 'bg-primary-100' : 'bg-surface-100'
                        }`}>
                        {uploading ? (
                            <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
                        ) : (
                            <Upload className={`w-7 h-7 ${dragActive ? 'text-primary-500' : 'text-surface-400'}`} />
                        )}
                    </div>
                    <div>
                        <p className="text-surface-900 font-medium">
                            {dragActive ? 'Drop files here' : 'Drag and drop files here'}
                        </p>
                        <p className="text-surface-500 text-sm mt-1">
                            or <span className="text-primary-600 hover:underline">browse</span> to upload
                        </p>
                    </div>
                    <p className="text-xs text-surface-400">
                        Supports: Images, PDFs, Word, Excel • Max {maxFiles} files
                    </p>
                </div>
            </div>

            {/* Upload Progress */}
            {Object.entries(uploadProgress).length > 0 && (
                <div className="space-y-2">
                    {Object.entries(uploadProgress).map(([id, progress]) => (
                        <div key={id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                            <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                            <div className="flex-1">
                                <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                            <span className="text-sm text-surface-600 font-medium">{progress}%</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Uploaded Files */}
            {files.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {files.map((file, index) => {
                        const FileIcon = getFileIcon(file.format);
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.format?.toLowerCase());

                        return (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-white border border-surface-200 rounded-xl group hover:border-surface-300 transition-colors"
                            >
                                {isImage ? (
                                    <img
                                        src={file.url}
                                        alt={file.name}
                                        className="w-12 h-12 rounded-lg object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-surface-100 flex items-center justify-center">
                                        <FileIcon className="w-6 h-6 text-surface-500" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-surface-900 truncate">
                                        {file.name}.{file.format}
                                    </p>
                                    <p className="text-xs text-surface-500">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
