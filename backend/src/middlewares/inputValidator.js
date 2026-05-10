// ─────────────────────────────────────────────────────────────
// Input Validation Middleware — SQL Injection Security Story 3
// Enforces type, length, and format validation on all API input.
// Rejects unexpected fields and blocks malformed data before
// it ever reaches the database layer.
// ─────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const URL_REGEX = /^https?:\/\/.{1,490}$/;

// ── Field Validators ────────────────────────────────────────
const validators = {
    string: (val, opts = {}) => {
        if (typeof val !== 'string') return 'must be a string';
        if (opts.min && val.length < opts.min) return `must be at least ${opts.min} characters`;
        if (opts.max && val.length > opts.max) return `must be at most ${opts.max} characters`;
        return null;
    },
    email: (val) => {
        if (typeof val !== 'string') return 'must be a string';
        if (val.length > 255) return 'must be at most 255 characters';
        if (!EMAIL_REGEX.test(val)) return 'must be a valid email address';
        return null;
    },
    uuid: (val) => {
        if (typeof val !== 'string') return 'must be a string';
        if (!UUID_REGEX.test(val)) return 'must be a valid UUID';
        return null;
    },
    isoDate: (val) => {
        if (typeof val !== 'string') return 'must be a string';
        if (!ISO_DATE_REGEX.test(val) || isNaN(new Date(val).getTime())) return 'must be a valid ISO date';
        return null;
    },
    url: (val) => {
        if (typeof val !== 'string') return 'must be a string';
        if (val.length > 500) return 'must be at most 500 characters';
        if (!URL_REGEX.test(val)) return 'must be a valid URL';
        return null;
    },
    int: (val, opts = {}) => {
        const n = typeof val === 'string' ? parseInt(val, 10) : val;
        if (typeof n !== 'number' || isNaN(n) || !Number.isInteger(n)) return 'must be an integer';
        if (opts.min !== undefined && n < opts.min) return `must be at least ${opts.min}`;
        if (opts.max !== undefined && n > opts.max) return `must be at most ${opts.max}`;
        return null;
    },
    float: (val, opts = {}) => {
        const n = typeof val === 'string' ? parseFloat(val) : val;
        if (typeof n !== 'number' || isNaN(n)) return 'must be a number';
        if (opts.min !== undefined && n < opts.min) return `must be at least ${opts.min}`;
        if (opts.max !== undefined && n > opts.max) return `must be at most ${opts.max}`;
        return null;
    },
    enum: (val, opts = {}) => {
        if (typeof val !== 'string') return 'must be a string';
        if (opts.values && !opts.values.includes(val)) return `must be one of: ${opts.values.join(', ')}`;
        return null;
    }
};

// ── Core Validation Function ────────────────────────────────
function validateFields(data, schema) {
    const errors = {};
    const allowedKeys = Object.keys(schema);

    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];

        // Required check
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors[field] = `${field} is required`;
            continue;
        }

        // Skip optional undefined fields
        if (value === undefined || value === null) continue;

        // Type validation
        const validator = validators[rules.type];
        if (validator) {
            const err = validator(value, rules);
            if (err) {
                errors[field] = `${field} ${err}`;
            }
        }
    }

    return { errors, allowedKeys };
}

// ── Strip Unknown Fields ────────────────────────────────────
function stripUnknown(data, allowedKeys) {
    const cleaned = {};
    for (const key of allowedKeys) {
        if (data[key] !== undefined) {
            cleaned[key] = data[key];
        }
    }
    return cleaned;
}

// ── Middleware Factory ───────────────────────────────────────

/**
 * Validate req.body against a schema.
 * Strips unexpected fields and returns 400 on validation failure.
 */
export function validateBody(schema) {
    return (req, res, next) => {
        const { errors, allowedKeys } = validateFields(req.body, schema);
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }
        // Strip unexpected fields to reject unknown input
        req.body = stripUnknown(req.body, allowedKeys);
        next();
    };
}

/**
 * Validate req.params UUIDs (route params like :id)
 */
export function validateParamId(paramName = 'id') {
    return (req, res, next) => {
        const val = req.params[paramName];
        if (val && !UUID_REGEX.test(val)) {
            return res.status(400).json({ error: `Invalid ${paramName} format — must be a valid UUID` });
        }
        next();
    };
}

/**
 * Validate req.query against a whitelist of allowed keys and their types
 */
export function validateQuery(schema) {
    return (req, res, next) => {
        const allowedKeys = Object.keys(schema);
        // Remove any query params not in the whitelist
        for (const key of Object.keys(req.query)) {
            if (!allowedKeys.includes(key)) {
                delete req.query[key];
            }
        }
        // Validate allowed query params
        for (const [field, rules] of Object.entries(schema)) {
            const value = req.query[field];
            if (value === undefined) continue;
            const validator = validators[rules.type];
            if (validator) {
                const err = validator(value, rules);
                if (err) {
                    return res.status(400).json({ error: `Query parameter '${field}' ${err}` });
                }
            }
        }
        next();
    };
}

// ── Pre-Built Schemas ───────────────────────────────────────

export const schemas = {
    register: {
        email: { type: 'email', required: true },
        password: { type: 'string', required: true, min: 8, max: 128 },
        first_name: { type: 'string', required: true, max: 100 },
        last_name: { type: 'string', required: true, max: 100 },
        role: { type: 'enum', values: ['owner', 'vet', 'trainer'] }
    },
    login: {
        email: { type: 'email', required: true },
        password: { type: 'string', required: true, max: 128 }
    },
    updateProfile: {
        first_name: { type: 'string', max: 100 },
        last_name: { type: 'string', max: 100 },
        profile_pic_url: { type: 'url' }
    },
    createAppointment: {
        vet_user_id: { type: 'uuid', required: true },
        appointment_time: { type: 'isoDate', required: true },
        reason: { type: 'string', required: true, max: 500 },
        pet_id: { type: 'uuid' }
    },
    createPost: {
        content: { type: 'string', required: true, max: 5000 },
        image_url: { type: 'url' }
    },
    addComment: {
        content: { type: 'string', required: true, max: 2000 }
    },
    createPet: {
        name: { type: 'string', required: true, max: 100 },
        species: { type: 'string', required: true, max: 50 },
        breed: { type: 'string', max: 100 },
        age_years: { type: 'float', min: 0, max: 50 },
        weight_kg: { type: 'float', min: 0, max: 500 },
        avatar_url: { type: 'url' }
    },
    updatePet: {
        name: { type: 'string', max: 100 },
        species: { type: 'string', max: 50 },
        breed: { type: 'string', max: 100 },
        age_years: { type: 'float', min: 0, max: 50 },
        weight_kg: { type: 'float', min: 0, max: 500 },
        avatar_url: { type: 'url' }
    },
    createService: {
        title: { type: 'string', required: true, max: 200 },
        description: { type: 'string', max: 2000 },
        category: { type: 'string', required: true, max: 100 },
        base_price: { type: 'float', required: true, min: 0 }
    },
    updateService: {
        title: { type: 'string', max: 200 },
        description: { type: 'string', max: 2000 },
        category: { type: 'string', max: 100 },
        base_price: { type: 'float', min: 0 },
        is_active: { type: 'enum', values: ['true', 'false'] }
    },
    reportLostPet: {
        pet_id: { type: 'uuid', required: true },
        latitude: { type: 'float', required: true, min: -90, max: 90 },
        longitude: { type: 'float', required: true, min: -180, max: 180 },
        lost_time: { type: 'isoDate', required: true },
        description: { type: 'string', max: 2000 }
    },
    updateLostPetStatus: {
        status: { type: 'enum', required: true, values: ['lost', 'found', 'closed'] }
    },
    reportFoundPet: {
        lost_pet_id: { type: 'uuid' },
        latitude: { type: 'float', required: true, min: -90, max: 90 },
        longitude: { type: 'float', required: true, min: -180, max: 180 },
        found_time: { type: 'isoDate', required: true },
        description: { type: 'string', max: 2000 },
        image_url: { type: 'url' }
    },
    addReview: {
        rating: { type: 'int', required: true, min: 1, max: 5 },
        comment: { type: 'string', max: 2000 }
    },
    aiTriage: {
        symptoms: { type: 'string', required: true, max: 2000 },
        petId: { type: 'uuid' },
        userLocation: { type: 'string', max: 200 }
    },
    // Query schemas (for GET endpoints with filters)
    servicesQuery: {
        category: { type: 'string', max: 100 }
    }
};
