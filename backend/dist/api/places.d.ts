import { Request, Response } from 'express';
import { Database as SqlJsDatabase } from 'sql.js';
export declare function createPlacesRoute(db: SqlJsDatabase): (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=places.d.ts.map