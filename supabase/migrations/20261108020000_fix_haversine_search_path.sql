-- 보안 점검(function_search_path_mutable) 대응
alter function public.haversine_km(double precision, double precision, double precision, double precision) set search_path = '';
