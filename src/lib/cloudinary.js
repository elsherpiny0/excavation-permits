const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a file to Cloudinary using unsigned upload
 * @param {File} file - The file to upload
 * @param {function} onProgress - Optional progress callback (0-100)
 * @returns {Promise<{secure_url: string, public_id: string, format: string}>}
 */
export async function uploadToCloudinary(file, onProgress) {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('Missing Cloudinary environment variables. Please check your .env file.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'excavation-permits');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve({
                    secure_url: response.secure_url,
                    public_id: response.public_id,
                    format: response.format,
                    original_filename: response.original_filename,
                    bytes: response.bytes,
                });
            } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
    });
}

/**
 * Delete a file from Cloudinary (requires signed request - for future backend use)
 * Note: For production, implement this in a backend/edge function
 */
export function getCloudinaryUrl(publicId, options = {}) {
    const { width, height, crop = 'fill' } = options;
    let transformation = '';

    if (width || height) {
        transformation = `/c_${crop}${width ? `,w_${width}` : ''}${height ? `,h_${height}` : ''}`;
    }

    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload${transformation}/${publicId}`;
}
