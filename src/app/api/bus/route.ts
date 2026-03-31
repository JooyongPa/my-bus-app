import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");

  if (!keyword) {
    return NextResponse.json({ error: "keyword가 없습니다" }, { status: 400 });
  }

  const serviceKey =
    "0be6067d11d4048d6308bd24e682e8aea509d4b4a055c87287692dcdab0a63e2";

  const url = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByName?serviceKey=${serviceKey}&stSrch=${keyword}`;

  console.log("API URL:", url);

  try {
    const res = await fetch(url);
    const text = await res.text();

    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "API 호출 실패" }, { status: 500 });
  }
}