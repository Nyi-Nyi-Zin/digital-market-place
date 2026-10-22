import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminPayments, setPaymentStatus } from "../../../../server/db";
import { requireAdmin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({
  paymentId: z.number().int().positive(),
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().min(2).max(1000).optional(),
});
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ payments: await getAdminPayments() });
  } catch (error) {
    return new NextResponse("Administrator access required", {
      status: error instanceof Response ? error.status : 403,
    });
  }
}
export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    if (input.status === "rejected" && !input.rejectionReason)
      return new NextResponse("A rejection reason is required", {
        status: 400,
      });
    await setPaymentStatus(
      input.paymentId,
      input.status,
      admin.id,
      input.rejectionReason
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof Response ? error.status : 400;
    return new NextResponse(
      error instanceof Error ? error.message : "Unable to update payment",
      { status }
    );
  }
}
