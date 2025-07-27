// Supabase 관련 타입 및 스키마 내보내기
export * from './supabase-schema';
// 간트 차트 관련 타입 (기존 유지)
export var ZoomLevel;
(function (ZoomLevel) {
    ZoomLevel["DAY"] = "day";
    ZoomLevel["WEEK"] = "week";
    ZoomLevel["MONTH"] = "month";
    ZoomLevel["QUARTER"] = "quarter";
    ZoomLevel["YEAR"] = "year";
})(ZoomLevel || (ZoomLevel = {}));
