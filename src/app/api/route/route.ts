
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get("routeId");

  if (!routeId) {
    return NextResponse.json({ error: "routeId is required" }, { status: 400 });
  }

  const serviceKey = "0be6067d11d4048d6308bd24e682e8aea509d4b4a055c87287692dcdab0a63e2";
  const url = `http://ws.bus.go.kr/api/rest/busRouteInfo/getStaionByRoute?serviceKey=${serviceKey}&busRouteId=${routeId}`;

  try {
    const res = await fetch(url);
    const xmlText = await res.text();
    return new NextResponse(xmlText, {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("노선 조회 에러:", error);
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 });
  }
}
