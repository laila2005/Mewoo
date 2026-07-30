/**
 * PetPulse — shared lost-pet matching.
 * Ranks open lost reports against a query (a found sighting or a searcher) using
 * the deterministic, explainable scorer. Used by both the public /match endpoint
 * and VetAI chat so the two never drift.
 */
import { query } from '../config/db.js';
import { scoreLostFoundMatch } from '../utils/matchScore.js';

/**
 * @param {{species?:string, breed?:string, area?:string, description?:string, date?:string}} q
 * @param {{minScore?:number, limit?:number}} opts
 * @returns ranked "possible match" rows (never certainties), phone kept private.
 */
export async function findLostMatches(q = {}, { minScore = 30, limit = 10 } = {}) {
  const { rows } = await query(`
    SELECT lp.*, u.first_name, u.last_name
      FROM lost_pets lp
      LEFT JOIN users u ON u.id = lp.reporter_id
     WHERE lp.status = 'lost'
     ORDER BY lp.created_at DESC
     LIMIT 200
  `);
  return rows
    .map(r => {
      const { score, reasons } = scoreLostFoundMatch(r, q);
      const pref = r.contact_pref || 'both';
      return {
        id: r.id, pet_name: r.pet_name, species: r.species, breed: r.breed,
        last_seen_location: r.last_seen_location, description: r.description,
        image_url: r.image_url, photos: r.photos || [], created_at: r.created_at,
        reporter_id: r.reporter_id,
        reporter_name: r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : 'Anonymous',
        contact_pref: pref, has_phone: !!r.contact_phone && pref !== 'message',
        match_score: score, match_reasons: reasons,
      };
    })
    .filter(m => m.match_score >= minScore)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, limit);
}

export default { findLostMatches };
