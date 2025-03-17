import { useQuery } from 'react-query';
import { fetchMaps } from '../api/maps';
import { useMemo } from 'react';

export const useMaps = () => {
    return useQuery('maps', fetchMaps);
}

export const useMap = (map_id) => {
    const mapsQuery = useMaps();
    const map = useMemo(() => {
        return mapsQuery.data ? mapsQuery.data.find((m) => m.id === map_id) : undefined;
    }, [mapsQuery.data, map_id]);

    return {
        ...mapsQuery,
        data: map,
    };
}
