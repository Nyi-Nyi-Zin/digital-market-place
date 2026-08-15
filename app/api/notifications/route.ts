import { NextResponse } from "next/server";
import { getUserNotifications, markNotificationsRead } from "../../../server/db";
import { requireUser } from "../../lib/auth";

export const dynamic = "force-dynamic";
export async function GET() { try { const user = await requireUser(); return NextResponse.json({ notifications: await getUserNotifications(user.id) }); } catch (error) { return new NextResponse("Authentication required", { status: error instanceof Response ? error.status : 401 }); } }
export async function PATCH() { try { const user = await requireUser(); await markNotificationsRead(user.id); return NextResponse.json({ success: true }); } catch (error) { return new NextResponse("Authentication required", { status: error instanceof Response ? error.status : 401 }); } }
