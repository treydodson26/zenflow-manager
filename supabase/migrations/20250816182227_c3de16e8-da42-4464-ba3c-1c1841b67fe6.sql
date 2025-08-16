CREATE OR REPLACE FUNCTION get_customer_stats_overview()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    total_count bigint;
    status_counts json;
BEGIN
    -- Get total customer count
    SELECT count(*) INTO total_count FROM public.customers;

    -- Get counts for each status, coalescing null statuses into 'unknown'
    SELECT json_object_agg(status, count)
    INTO status_counts
    FROM (
        SELECT COALESCE(status, 'unknown') AS status, count(*) AS count
        FROM public.customers
        GROUP BY COALESCE(status, 'unknown')
    ) AS status_subquery;

    -- Return the final JSON object
    RETURN json_build_object(
        'total_customers', total_count,
        'status_breakdown', status_counts
    );
END;
$$;