import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { User } from "@/models/User";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "FILE_REQUIRED", "Send a file under the `file` form field.");
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      throw new ApiError(400, "BAD_FILE_TYPE", "Only JPG, PNG, WEBP or GIF images are allowed.");
    }
    if (file.size > MAX_BYTES) {
      throw new ApiError(400, "FILE_TOO_LARGE", "Image must be 5MB or smaller.");
    }
    if (file.size === 0) {
      throw new ApiError(400, "FILE_EMPTY", "Selected file is empty.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${auth.sub}-${Date.now()}.${ext}`;
    await writeFile(path.join(uploadsDir, filename), buffer);

    const publicPath = `/uploads/avatars/${filename}`;
    const user = await User.findByIdAndUpdate(auth.sub, { image: publicPath }, { new: true }).lean();
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found.");

    return Response.json({ ok: true, image: publicPath });
  } catch (err) {
    return toErrorResponse(err);
  }
}
