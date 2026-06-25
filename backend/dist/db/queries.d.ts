import { Database as SqlJsDatabase } from 'sql.js';
import { Place, BBox } from '../types.js';
export declare function getPlacesByBBox(db: SqlJsDatabase, bbox: BBox, filters?: {
    internetAccess?: boolean;
    sockets?: boolean;
    openNow?: boolean;
}): Place[];
export declare function insertPlace(db: SqlJsDatabase, place: Place): void;
export declare function updatePlace(db: SqlJsDatabase, id: string, updates: Partial<Place>): void;
export declare function deletePlace(db: SqlJsDatabase, id: string): void;
export declare function getAllPlaces(db: SqlJsDatabase): Place[];
export declare function clearPlaces(db: SqlJsDatabase): void;
//# sourceMappingURL=queries.d.ts.map