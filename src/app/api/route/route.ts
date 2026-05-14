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
    const res = await fetch(url, {
      headers: { "Accept": "application/xml" }
    });
    const xmlText = await res.text();
    
    // 인증 실패시 공공데이터포털 API로 재시도
    if (xmlText.includes("SERVICE ACCESS DENIED")) {
      const portalKey = encodeURIComponent(serviceKey);
      const portalUrl = `https://apis.data.go.kr/6110000/busrouteservice/getBusRouteStationList?serviceKey=${portalKey}&busRouteId=${routeId}`;
      const portalRes = await fetch(portalUrl);
      const portalXml = await portalRes.text();
      return new NextResponse(portalXml, {
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }
    
    return new NextResponse(xmlText, {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("노선 조회 에러:", error);
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 });
  }
}
