import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { toErrorResponse } from "@/lib/api-errors";
import { User } from "@/models/User";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["creator", "admin"]);

    const brands = await User.find({ role: "client", status: "active" })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return Response.json({
      ok: true,
      brands: brands.map((u) => {
        const image =
          typeof u.image === "string" && u.image.trim() ? u.image.trim() : null;
        return {
          id: u._id.toString(),
          email: u.email,
          image,
          createdAt: u.createdAt,
        };
      }),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
