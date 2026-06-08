"use client";

import { useEffect, useState, useCallback } from "react";

export default function HomePage() {
  const [stopName, setStopName] = useState("");
  const [results, setResults] = useState<
    { stId: string; stNm: string; arsId: string; direction?: string }[]
  >([]);

  type FavoriteStop = {
    name: string;
    id: string;
    direction?: string;
  };

  const [favorites, setFavorites] = useState<FavoriteStop[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedStopId, setSelectedStopId] = useState("");
  const [selectedStopName, setSelectedStopName] = useState("");
  const [selectedStopDirection, setSelectedStopDirection] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 검색결과 카드 버스목록 미리보기
  const [previewStopId, setPreviewStopId] = useState<string | null>(null);
  const [previewBuses, setPreviewBuses] = useState<Record<string, string[]>>({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  type ArrivalItem = {
    routeName?: string;
    predictTime1?: string | number;
    predictTime2?: string | number;
    direction?: string;
  };

  const [arrivals, setArrivals] = useState<ArrivalItem[]>([]);

  function formatArrival(message?: string | number) {
    const text = String(message ?? "").trim();
    if (!text) return "-";
    if (text.includes("곧도착") || text.includes("곧 도착")) return "곧 도착 🚌";
    if (text.includes("출발대기") || text.includes("차고지출발") || text.includes("차고지 출발"))
      return "차고지 출발";
    return text
      .replace(/분후/g, "분 후 ")
      .replace(/\[([0-9]+)번째 전\]/g, "[$1정류장 전]")
      .replace(/\s+/g, " ")
      .trim();
  }

  useEffect(() => {
    const savedFavorites = localStorage.getItem("favorites");
    const savedRecentSearches = localStorage.getItem("recentSearches");
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedRecentSearches) setRecentSearches(JSON.parse(savedRecentSearches));
  }, []);

  useEffect(() => { localStorage.setItem("favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("recentSearches", JSON.stringify(recentSearches)); }, [recentSearches]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const keyword = stopName.trim();
      if (!keyword) { setResults([]); return; }
      try {
        const res = await fetch(`/api/bus?keyword=${encodeURIComponent(keyword)}`);
        const xmlText = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const itemList = xmlDoc.getElementsByTagName("itemList");
        const parsedStops: { stId: string; stNm: string; arsId: string; direction?: string }[] = [];
        for (let i = 0; i < itemList.length; i++) {
          const stNm = itemList[i].getElementsByTagName("stNm")[0]?.textContent;
          const stId = itemList[i].getElementsByTagName("stId")[0]?.textContent;
          const arsId = itemList[i].getElementsByTagName("arsId")[0]?.textContent;
          const direction = itemList[i].getElementsByTagName("adirection")[0]?.textContent || "";
          if (stNm && stId && arsId) parsedStops.push({ stId, stNm, arsId, direction });
        }
        const uniqueStopsMap = new Map<string, { stId: string; stNm: string; arsId: string; direction?: string }>();
        for (const stop of parsedStops) {
          const key = stop.arsId || stop.stId;
          if (!uniqueStopsMap.has(key)) uniqueStopsMap.set(key, stop);
        }
        setResults(Array.from(uniqueStopsMap.values()));
      } catch (error) {
        console.error("정류장 검색 실패:", error);
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [stopName]);

  const fetchPreviewBuses = async (arsId: string) => {
    if (previewStopId === arsId) {
      setPreviewStopId(null);
      return;
    }
    setPreviewStopId(arsId);
    if (previewBuses[arsId]) return;
    setPreviewLoading(arsId);
    try {
      const res = await fetch(`/api/arrivals?stId=${arsId}`);
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = Array.from(xmlDoc.getElementsByTagName("itemList"));
      const busNames = items
        .map((item) => item.getElementsByTagName("rtNm")[0]?.textContent || "")
        .filter(Boolean);
      setPreviewBuses((prev) => ({ ...prev, [arsId]: busNames }));
    } catch {
      setPreviewBuses((prev) => ({ ...prev, [arsId]: [] }));
    } finally {
      setPreviewLoading(null);
    }
  };

  const fetchArrivals = useCallback(async (stId: string) => {
    if (!stId) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/arrivals?stId=${stId}`);
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = Array.from(xmlDoc.getElementsByTagName("itemList"));
      const parsed = items.map((item) => ({
        routeName: item.getElementsByTagName("rtNm")[0]?.textContent || "",
        predictTime1: item.getElementsByTagName("arrmsg1")[0]?.textContent || "",
        predictTime2: item.getElementsByTagName("arrmsg2")[0]?.textContent || "",
        direction: item.getElementsByTagName("adirection")[0]?.textContent || "",
      }));
      const directions = parsed.map((item) => item.direction).filter((dir) => dir && dir.trim() !== "");
      const uniqueDirections = Array.from(new Set(directions));
      setSelectedStopDirection(uniqueDirections.slice(0, 2).join(" / "));
      setArrivals(parsed);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("도착정보 에러", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedStopId) return;
    fetchArrivals(selectedStopId);
  }, [selectedStopId, fetchArrivals]);

  const handleFavorite = (name: string, id: string) => {
    const exists = favorites.some((favorite) => favorite.id === id);
    if (exists) return;
    setFavorites([...favorites, { name, id, direction: selectedStopDirection }]);
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites(favorites.filter((favorite) => favorite.id !== id));
  };

  const handleClearFavorites = () => setFavorites([]);

  const handleSearch = async () => {
    const keyword = stopName.trim();
    if (!keyword) { setResults([]); return; }
    const updatedSearches = [keyword, ...recentSearches.filter((item) => item !== keyword)].slice(0, 5);
    setRecentSearches(updatedSearches);
    setPreviewStopId(null);
    setPreviewBuses({});
    try {
      const res = await fetch(`/api/bus?keyword=${encodeURIComponent(keyword)}`);
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const itemList = xmlDoc.getElementsByTagName("itemList");
      const parsedStops: { stId: string; stNm: string; arsId: string; direction?: string }[] = [];
      for (let i = 0; i < itemList.length; i++) {
        const stNm = itemList[i].getElementsByTagName("stNm")[0]?.textContent;
        const stId = itemList[i].getElementsByTagName("stId")[0]?.textContent;
        const arsId = itemList[i].getElementsByTagName("arsId")[0]?.textContent;
        const direction = itemList[i].getElementsByTagName("adirection")[0]?.textContent || "";
        if (stNm && stId && arsId) parsedStops.push({ stId, stNm, arsId, direction });
      }
      const uniqueStopsMap = new Map<string, { stId: string; stNm: string; arsId: string; direction?: string }>();
      for (const stop of parsedStops) {
        const key = stop.arsId || stop.stId;
        if (!uniqueStopsMap.has(key)) uniqueStopsMap.set(key, stop);
      }
      setResults(Array.from(uniqueStopsMap.values()));
    } catch (error) {
      console.error("정류장 검색 실패:", error);
      setResults([]);
    }
  };

  const handleRecentSearchClick = (keyword: string) => {
    setStopName(keyword);
    setTimeout(() => handleSearch(), 0);
  };

  const handleSelectStop = (id: string, name: string) => {
    setSelectedStopId(id);
    setSelectedStopName(name);
    setArrivals([]);
    setLastUpdated(null);
    setTimeout(() => {
      document.getElementById("arrival-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 py-6">
        <h1 className="text-2xl font-bold text-center">버스 정류장 검색</h1>

        {/* 검색 */}
        <div className="bg-zinc-900 p-4 rounded-xl shadow-md space-y-3">
          <h2 className="text-lg font-semibold">정류장 찾기</h2>
          <input
            type="text"
            placeholder="정류장 이름 입력"
            value={stopName}
            onChange={(e) => setStopName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            className="w-full border p-2 rounded text-black"
          />
          <button onClick={handleSearch} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            검색
          </button>
        </div>

        {/* 최근 검색어 */}
        <div className="bg-zinc-900 p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-3">최근 검색어</h2>
          {recentSearches.length === 0 ? (
            <div className="text-gray-400">최근 검색어가 없습니다</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item, index) => (
                <button key={index} onClick={() => handleRecentSearchClick(item)}
                  className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-sm">
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 검색 결과 */}
        <div className="bg-zinc-900 p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-3">검색 결과 ({results.length}개)</h2>
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
                  <div className="text-white font-semibold mb-1">{name}</div>
                  {group.map((item) => (
                    <div key={item.arsId} className={`rounded mb-1 border ${
                      selectedStopId === item.arsId ? "border-blue-500" : "border-zinc-700"
                    }`}>
                      <div
                        className={`flex items-center justify-between px-3 py-2 rounded-t cursor-pointer ${
                          selectedStopId === item.arsId ? "bg-blue-900" : "bg-zinc-800 hover:bg-zinc-700"
                        }`}
                        onClick={() => fetchPreviewBuses(item.arsId)}
                      >
                        <div>
                          {item.direction ? (
                            <div className="text-sm text-yellow-300 font-medium">→ {item.direction} 방면</div>
                          ) : null}
                          <div className="text-xs text-gray-400">
                            정류장번호: {item.arsId} &nbsp;·&nbsp;
                            <span className="text-blue-400">탭해서 버스 확인 {previewStopId === item.arsId ? "▲" : "▼"}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFavorite(item.stNm, item.arsId);
                          }}
                          className={`px-2 py-1 rounded text-xs text-white ml-2 ${
                            favorites.some((f) => f.id === item.arsId) ? "bg-gray-600" : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {favorites.some((f) => f.id === item.arsId) ? "저장됨" : "저장"}
                        </button>
                      </div>

                      {previewStopId === item.arsId && (
                        <div className="bg-zinc-800 border-t border-zinc-700 px-3 py-2 rounded-b">
                          {previewLoading === item.arsId ? (
                            <div className="text-gray-400 text-sm py-1">불러오는 중...</div>
                          ) : previewBuses[item.arsId]?.length > 0 ? (
                            <div>
                              <div className="text-xs text-gray-400 mb-2">이 정류장에 서는 버스</div>
                              <div className="flex flex-wrap gap-1 mb-3">
                                {previewBuses[item.arsId].map((bus, idx) => (
                                  <span key={idx} className="bg-blue-800 text-white text-xs px-2 py-0.5 rounded font-medium">
                                    {bus}
                                  </span>
                                ))}
                              </div>
                              <button
                                onClick={() => handleSelectStop(item.arsId, item.stNm)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded"
                              >
                                이 정류장 도착정보 보기 →
                              </button>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm py-1">운행 중인 버스가 없습니다</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 즐겨찾기 */}
        <div className="bg-zinc-900 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">즐겨찾기 ({favorites.length}개)</h2>
            <button onClick={handleClearFavorites} className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm">
              전체 삭제
            </button>
          </div>
          {favorites.length === 0 ? (
            <div className="text-gray-400">아직 저장된 정류장이 없습니다</div>
          ) : (
            <div className="space-y-2">
              {favorites.map((item) => (
                <div key={item.id}
                  className={`flex items-center justify-between px-3 py-2 rounded border ${
                    selectedStopId === item.id ? "bg-blue-900 border-blue-500" : "bg-zinc-800 border-transparent"
                  }`}>
                  <button onClick={() => { handleSelectStop(item.id, item.name); setResults([]); }}
                    className="text-yellow-300 text-left">
                    <div>{item.name}</div>
                    <div style={{ fontSize: "12px", color: "#aaa" }}>정류장 번호: {item.id}</div>
                    {item.direction && (
                      <div className="text-xs text-yellow-300">→ {item.direction} 방면</div>
                    )}
                  </button>
                  <button onClick={() => handleRemoveFavorite(item.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm">
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 도착정보 */}
        <div id="arrival-section" className="bg-zinc-900 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">실시간 도착정보</h2>
              {selectedStopName && <div className="text-sm text-yellow-300">{selectedStopName}</div>}
              {selectedStopDirection && <div className="text-xs text-gray-400">→ {selectedStopDirection} 방면</div>}
            </div>
            {selectedStopId && (
              <button onClick={() => fetchArrivals(selectedStopId)} disabled={isRefreshing}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium ${
                  isRefreshing ? "bg-zinc-700 text-gray-400 cursor-not-allowed" : "bg-zinc-700 hover:bg-zinc-600 text-white"
                }`}>
                <span className={isRefreshing ? "animate-spin" : ""}>↻</span>
                {isRefreshing ? "갱신 중..." : "새로고침"}
              </button>
            )}
          </div>

          {lastUpdated && (
            <div className="text-xs text-gray-500 mb-3">
              마지막 업데이트: {lastUpdated.toLocaleTimeString("ko-KR")}
            </div>
          )}

          {!selectedStopId ? (
            <div className="text-gray-400">정류장을 선택하면 도착정보가 표시됩니다.</div>
          ) : arrivals.length === 0 && !isRefreshing ? (
            <div className="text-gray-400">도착정보가 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {arrivals.map((arrival, index) => (
                <div key={`${arrival.routeName}-${index}`} className="bg-zinc-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-white">{arrival.routeName ?? "노선 없음"}</div>
                      <div className="text-xs text-gray-400">→ {arrival.direction || "방향정보 없음"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-400 font-semibold">{formatArrival(arrival.predictTime1)}</div>
                    </div>
                  </div>
                  {arrival.predictTime2 && (
                    <div className="mt-2 pt-2 border-t border-zinc-700 text-sm text-gray-400">
                      다음 차량: {formatArrival(arrival.predictTime2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 공공데이터 저작권 푸터 */}
      <footer className="w-full text-center py-4 mt-4 border-t border-zinc-800 space-y-1">
        <div className="text-xs text-gray-500">
          🏛️ 공공데이터 활용 · 🗂️ 서울 열린데이터 광장 · ©서울특별시
        </div>
        <div className="text-xs text-gray-600">
          본 서비스는 서울특별시 공공데이터를 활용하여 제공됩니다
        </div>
      </footer>
    </main>
  );
}