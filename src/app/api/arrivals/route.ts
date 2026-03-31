import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stId = searchParams.get("stId");

  if (!stId) {
    return NextResponse.json({ error: "stId가 없습니다" }, { status: 400 });
  }

  const serviceKey =
    "0be6067d11d4048d6308bd24e682e8aea509d4b4a055c87287692dcdab0a63e2";

  const url = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?serviceKey=${serviceKey}&arsId=${stId}`;

  try {
    const res = await fetch(url);
    const text = await res.text();

    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "도착정보 API 호출 실패" }, { status: 500 });
  }
}