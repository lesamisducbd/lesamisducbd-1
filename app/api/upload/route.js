import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { getSession } from '@/lib/auth';

export async function POST(request) {
    if (!(await getSession())) {
        return NextResponse.json({ success: false, message: 'Non autorisé', error: 'Non autorisé' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to Cloudinary using a promise wrapper since the stream API is callback-based
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { 
                    folder: 'lesamisducbd/uploads',
                    resource_type: 'auto' // Important for PDFs
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(buffer);
        });

        return NextResponse.json({
            success: true,
            url: uploadResult.secure_url
        });

    } catch (e) {
        console.error('Upload Process Error:', e);
        return NextResponse.json({
            success: false,
            message: "Server error: " + (e.message || 'Unknown error')
        }, { status: 500 });
    }
}
