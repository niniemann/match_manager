import { useQuery } from 'react-query';
import { fetchMaps } from '../api/maps';

export const useMaps = () => {
    return useQuery('maps', fetchMaps);
}
