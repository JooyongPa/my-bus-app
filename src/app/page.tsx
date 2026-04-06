"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [stopName, setStopName] = useState("");
  const [results, setResults] = useState<
  { stId: string; stNm: string; arsId: string }[]
>([]);
type FavoriteStop = {
  name: string
  id: string
  direction?: string
}

const [favorites, setFavorites] = useState<FavoriteStop[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedStopId, setSelectedStopId] = useState("");
  const [selectedStopDirection, setSelectedStopDirection] = useState("");
  type ArrivalItem = {
    routeId?: string
    routeName?: string
    routeTypeName?: string
    predictTime1?: string | number
    predictTime2?: string | number
    locationNo1?: string | number
    locationNo2?: string | number
    direction?: string
    nextStation?: string
  }
    const [arrivals, setArrivals] = useState<ArrivalItem[]>([]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem("favorites");
    const savedRecentSearches = localStorage.getItem("recentSearches");

    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }

    if (savedRecentSearches) {
      setRecentSearches(JSON.parse(savedRecentSearches));
    }
  }, []);

  
  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const keyword = stopName.trim();

      if (!keyword) {
        setResults([]);
        return;
      }

      try {
        const res = await fetch(`/api/bus?keyword=${encodeURIComponent(keyword)}`);
        const xmlText = await res.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const itemList = xmlDoc.getElementsByTagName("itemList");
        const parsedStops: { stId: string; stNm: string; arsId: string }[] = [];

        for (let i = 0; i < itemList.length; i++) {
          const stNm = itemList[i].getElementsByTagName("stNm")[0]?.textContent;
const stId = itemList[i].getElementsByTagName("stId")[0]?.textContent;
const arsId = itemList[i].getElementsByTagName("arsId")[0]?.textContent;

if (stNm && stId && arsId) {
  parsedStops.push({
    stId,
    stNm,
    arsId,
  });
}
        }

        const uniqueStopsMap = new Map<string, { stId: string; stNm: string; arsId: string }>();

for (const stop of parsedStops) {
  const key = stop.arsId || stop.stId;
  if (!uniqueStopsMap.has(key)) {
    uniqueStopsMap.set(key, stop);
  }
}

const uniqueStops = Array.from(uniqueStopsMap.values());
const groupedStopsMap = new Map<string, typeof uniqueStops>();

for (const stop of uniqueStops) {
  if (!groupedStopsMap.has(stop.stNm)) {
    groupedStopsMap.set(stop.stNm, []);
  }
  groupedStopsMap.get(stop.stNm)!.push(stop);
}

const groupedStops = Array.from(groupedStopsMap.values()).flat();
setResults(groupedStops);
      } catch (error) {
        console.error("정류장 검색 실패:", error);
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [stopName]);
  useEffect(() => {
    if (!selectedStopId) return;
  
    const fetchArrivals = async () => {
      try {
        const res = await fetch(`/api/arrivals?stId=${selectedStopId}`);
        const xmlText = await res.text();
  
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
        const items = Array.from(xmlDoc.getElementsByTagName("itemList"));
  
        const parsed = items.map((item) => ({
          routeName: item.getElementsByTagName("rtNm")[0]?.textContent || "",
          routeTypeName: item.getElementsByTagName("routeType")[0]?.textContent || "",
        
          predictTime1: item.getElementsByTagName("arrmsg1")[0]?.textContent || "",
          predictTime2: item.getElementsByTagName("arrmsg2")[0]?.textContent || "",
        
          locationNo1: item.getElementsByTagName("arrmsg1")[0]?.textContent || "",
          locationNo2: item.getElementsByTagName("arrmsg2")[0]?.textContent || "",
        
          // ⭐ 추가 (핵심)
          direction: item.getElementsByTagName("adirection")[0]?.textContent || "",
          nextStation: item.getElementsByTagName("nxtStn")[0]?.textContent || "",
        }));     
        // 방향 대표값 추출 (핵심)
const directions = parsed
.map((item) => item.direction)
.filter((dir) => dir && dir.trim() !== "");

const uniqueDirections = Array.from(new Set(directions));

// 최대 2개만 표시
setSelectedStopDirection(uniqueDirections.slice(0, 2).join(" / "));   
        setArrivals(parsed);
      } catch (err) {
        console.error("도착정보 에러", err);
      }
    };
  
    fetchArrivals();
  }, [selectedStopId]);

  const handleFavorite = (name: string, id: string) => {
    const exists = favorites.some((favorite) => favorite.id === id)
    if (exists) return
  
    setFavorites([
      ...favorites,
      {
        name,
        id,
        direction: selectedStopDirection,
      },
    ])
  };

  const handleRemoveFavorite = (id: string) => {
    const updated = favorites.filter((favorite) => favorite.id !== id)
    setFavorites(updated)
    };

  const handleClearFavorites = () => {
    setFavorites([]);
  };

  const handleSearch = async () => {
    const keyword = stopName.trim();
  
    if (!keyword) {
      setResults([]);
      return;
    }
  
    const updatedSearches = [
      keyword,
      ...recentSearches.filter((item) => item !== keyword),
    ].slice(0, 5);
  
    setRecentSearches(updatedSearches);
  
    try {
      const res = await fetch(`/api/bus?keyword=${encodeURIComponent(keyword)}`);
      const xmlText = await res.text();
  
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
      const itemList = xmlDoc.getElementsByTagName("itemList");
      const parsedStops: { stId: string; stNm: string; arsId: string }[] = [];
  
      for (let i = 0; i < itemList.length; i++) {
        const stNm = itemList[i].getElementsByTagName("stNm")[0]?.textContent;
        const stId = itemList[i].getElementsByTagName("stId")[0]?.textContent;
        const arsId = itemList[i].getElementsByTagName("arsId")[0]?.textContent;
  
        if (stNm && stId && arsId) {
          parsedStops.push({
            stId,
            stNm,
            arsId,
          });
        }
      }
  
      const uniqueStopsMap = new Map<string, { stId: string; stNm: string; arsId: string }>();
  
      for (const stop of parsedStops) {
        const key = stop.arsId || stop.stId;
        if (!uniqueStopsMap.has(key)) {
          uniqueStopsMap.set(key, stop);
        }
      }
  
      const uniqueStops = Array.from(uniqueStopsMap.values());
      setResults(uniqueStops);
    } catch (error) {
      console.error("정류장 검색 실패:", error);
      setResults([]);
    }
  };

  const handleRecentSearchClick = (keyword: string) => {
    setStopName(keyword);
    setTimeout(() => {
      handleSearch();
    }, 0);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">버스 정류장 검색</h1>

        <div className="bg-zinc-900 p-4 rounded-xl shadow-md space-y-3">
          <h2 className="text-lg font-semibold">정류장 찾기</h2>

          <input
            type="text"
            placeholder="정류장 이름 입력"
            value={stopName}
            onChange={(e) => setStopName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            className="w-full border p-2 rounded text-black"
          />

          <button
            onClick={handleSearch}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            검색
          </button>
        </div>

        <div className="bg-zinc-900 p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-3">최근 검색어</h2>

          {recentSearches.length === 0 ? (
            <div className="text-gray-400">최근 검색어가 없습니다</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(item)}
                  className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-sm"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-3">
            검색 결과 ({results.length}개)
          </h2>

          {stopName && results.length === 0 ? (
            <div className="text-red-400">검색 결과가 없습니다</div>
          ) : results.length === 0 ? (
            <div className="text-gray-400">정류장 이름을 입력하면 결과가 표시됩니다</div>
          ) : (
<div className="space-y-2">
  {Object.entries(
    results.reduce((acc: Record<string, typeof results>, cur) => {
      if (!acc[cur.stNm]) acc[cur.stNm] = [];
      acc[cur.stNm].push(cur);
      return acc;
    }, {})
  ).map(([name, group]) => (
    <div key={name} className="mb-3">
      <div className="text-white font-semibold mb-1">
        {name}
      </div>

      {group.map((item) => (
        <div
          key={item.arsId}
          className="flex items-center justify-between bg-zinc-800 px-3 py-2 rounded mb-1"
        >
          <div>
          <div style={{ fontSize: "12px", color: "#aaa" }}>
  정류장번호: {item.arsId}
</div>

<div style={{ fontSize: "12px", color: "#666" }}>
  ID: {item.stId}
</div>
          </div>

          <button
            onClick={() => {
              setSelectedStopId(item.arsId);
              handleFavorite(item.stNm, item.arsId);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm"
          >
            저장
          </button>
        </div>
      ))}
    </div>
  ))}
</div>
)}
</div>
   
        <div className="bg-zinc-900 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              즐겨찾기 ({favorites.length}개)
            </h2>

            <button
              onClick={handleClearFavorites}
              className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm"
            >
              전체 삭제
            </button>
          </div>

          {favorites.length === 0 ? (
  <div className="text-gray-400">아직 저장된 정류장이 없습니다</div>
) : (
  <div className="space-y-2">
    {favorites.map((item) => (
      <div
        key={item.id}
        className="flex items-center justify-between bg-zinc-800 px-3 py-2 rounded"
      >
        <button
          onClick={() => {
            setSelectedStopId(item.id)
            setResults([])
          }}
          className="text-yellow-300 text-left"
        >
<div>
  <div>{item.name}</div>
  <div style={{ fontSize: "12px", color: "#aaa" }}>
    정류장 번호: {item.id}
  </div>
  {item.direction && (
  <div className="text-xs text-yellow-300">
    대표 방향: {item.direction}
  </div>
)}
</div>
        </button>

        <button
          onClick={() => handleRemoveFavorite(item.id)}
          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
        >
          삭제
        </button>
      </div>
    ))}
  </div>
)}
              {/* 도착정보 */}
      <div className="mt-4 bg-zinc-900 p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold mb-3">실시간 도착정보</h2>
        {selectedStopId && (
  <div className="text-sm text-gray-400 mb-3">
    선택된 정류장 ID: {selectedStopId}
  </div>
)}
{selectedStopDirection && (
  <div className="text-sm text-yellow-300 mb-3">
    대표 방향: {selectedStopDirection}
  </div>
)}

        {!selectedStopId ? (
          <div className="text-gray-400">정류장을 선택하면 도착정보가 표시됩니다.</div>
        ) : arrivals.length === 0 ? (
          <div className="text-gray-400">도착정보가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {arrivals.map((arrival, index) => (
              <div
                key={`${arrival.routeId ?? arrival.routeName ?? "route"}-${index}`}
                className="bg-zinc-800 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                  <div className="font-medium text-white">
                  {arrival.routeName ?? "노선 없음"} → {arrival.direction || "방향정보 없음"}
</div>
                    <div className="text-sm text-gray-400">
                      {arrival.routeTypeName ?? ""}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-blue-400 font-semibold">
                      {arrival.predictTime1 ? `${arrival.predictTime1}분 후` : "곧 도착"}
                    </div>
                    <div className="text-sm text-gray-400">
                      {arrival.locationNo1 ? `${arrival.locationNo1}정거장 전` : ""}
                    </div>
                  </div>
                </div>

                {(arrival.predictTime2 || arrival.locationNo2) && (
                  <div className="mt-2 pt-2 border-t border-zinc-700 text-sm text-gray-400">
                    다음 차량: {arrival.predictTime2 ? `${arrival.predictTime2}분 후` : "-"}
                    {arrival.locationNo2 ? ` · ${arrival.locationNo2}정거장 전` : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      </div>
        </main>
  )
}

