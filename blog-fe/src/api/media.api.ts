import { contentHttp } from "./http";

export type UploadedImage = {
    id: string;
    url: string;
    type: string;
    provider: string;
    public_id: string;
    mime_type: string;
    format: string;
    file_size: number;
    width: number;
    height: number;
    uploaded_by: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
};

type UploadImageResponse = {
    succeeded: boolean;
    title: string;
    message: string;
    data: UploadedImage[];
    status_code: number;
    errors: any;
    error_code: string;
};

export async function uploadImages(files: File[]): Promise<UploadedImage[]> {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append("file", file);
    });

    const res = await contentHttp.post<UploadImageResponse>(
        "/media/api/v1/image/upload",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return res.data.data;
}

export async function saveMediaToPost(mediaList: UploadedImage[]): Promise<void> {
    const payload = mediaList.map(media => ({
        id: media.id,
        url: media.url,
        type: media.type,
        provider: media.provider,
        public_id: media.public_id,
        mime_type: media.mime_type,
        format: media.format,
        file_size: media.file_size,
        width: media.width,
        height: media.height,
        uploaded_by: media.uploaded_by,
    }));

    await contentHttp.post("/content/api/v1/media", payload);
}
