export function getPlacesByBBox(db, bbox, filters) {
    let query = `
    SELECT * FROM places
    WHERE latitude BETWEEN ? AND ?
      AND longitude BETWEEN ? AND ?
  `;
    const params = [bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon];
    if (filters?.internetAccess) {
        query += ` AND internet_access = 'yes'`;
    }
    if (filters?.sockets) {
        query += ` AND sockets IN ('yes', 'many')`;
    }
    if (filters?.openNow) {
        query += ` AND opening_hours IS NOT NULL`;
    }
    const stmt = db.prepare(query);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        latitude: row.latitude,
        longitude: row.longitude,
        address: row.address,
        internetAccess: row.internet_access,
        sockets: row.sockets,
        openingHours: row.opening_hours,
        osmId: row.osm_id,
        osmTags: row.osm_tags ? JSON.parse(row.osm_tags) : undefined,
        source: row.source,
        verified: Boolean(row.verified),
        verifiedBy: row.verified_by,
        lastChecked: row.last_checked,
        lastSynced: row.last_synced,
    }));
}
export function insertPlace(db, place) {
    const stmt = db.prepare(`
    INSERT INTO places (
      id, name, category, latitude, longitude, address,
      internet_access, sockets, opening_hours,
      osm_id, osm_tags, source, verified, verified_by, last_checked, last_synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.bind([
        place.id,
        place.name,
        place.category || null,
        place.latitude,
        place.longitude,
        place.address || null,
        place.internetAccess || null,
        place.sockets || null,
        place.openingHours || null,
        place.osmId || null,
        place.osmTags ? JSON.stringify(place.osmTags) : null,
        place.source,
        place.verified ? 1 : 0,
        place.verifiedBy || null,
        place.lastChecked || null,
        place.lastSynced || null,
    ]);
    stmt.step();
    stmt.free();
}
export function updatePlace(db, id, updates) {
    const setClauses = [];
    const values = [];
    if (updates.name !== undefined) {
        setClauses.push('name = ?');
        values.push(updates.name);
    }
    if (updates.category !== undefined) {
        setClauses.push('category = ?');
        values.push(updates.category || null);
    }
    if (updates.internetAccess !== undefined) {
        setClauses.push('internet_access = ?');
        values.push(updates.internetAccess || null);
    }
    if (updates.sockets !== undefined) {
        setClauses.push('sockets = ?');
        values.push(updates.sockets || null);
    }
    if (updates.openingHours !== undefined) {
        setClauses.push('opening_hours = ?');
        values.push(updates.openingHours || null);
    }
    if (updates.verified !== undefined) {
        setClauses.push('verified = ?');
        values.push(updates.verified ? 1 : 0);
    }
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    const query = `UPDATE places SET ${setClauses.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    stmt.bind(values);
    stmt.step();
    stmt.free();
}
export function deletePlace(db, id) {
    const stmt = db.prepare('DELETE FROM places WHERE id = ?');
    stmt.bind([id]);
    stmt.step();
    stmt.free();
}
export function getAllPlaces(db) {
    const stmt = db.prepare('SELECT * FROM places');
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        latitude: row.latitude,
        longitude: row.longitude,
        address: row.address,
        internetAccess: row.internet_access,
        sockets: row.sockets,
        openingHours: row.opening_hours,
        osmId: row.osm_id,
        osmTags: row.osm_tags ? JSON.parse(row.osm_tags) : undefined,
        source: row.source,
        verified: Boolean(row.verified),
        verifiedBy: row.verified_by,
        lastChecked: row.last_checked,
        lastSynced: row.last_synced,
    }));
}
export function clearPlaces(db) {
    const stmt = db.prepare('DELETE FROM places');
    stmt.step();
    stmt.free();
}
//# sourceMappingURL=queries.js.map