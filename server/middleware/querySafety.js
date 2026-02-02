/**
 * Query Safety Middleware
 * 
 * Provides utilities to prevent runaway database queries:
 * - Automatic pagination enforcement
 * - Field projection requirements
 * - Query timeout limits
 * - Aggregation safeguards
 * 
 * @module middleware/querySafety
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum number of documents that can be returned without pagination
 * Any query that could return more will be auto-limited
 */
export const MAX_UNBOUNDED_RESULTS = 100;

/**
 * Default page size for paginated queries
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Maximum page size that can be requested
 */
export const MAX_PAGE_SIZE = 500;

/**
 * Query timeout in milliseconds
 */
export const QUERY_TIMEOUT_MS = 30000; // 30 seconds

// ============================================================================
// SAFE FIND WRAPPERS
// ============================================================================

/**
 * Wrap a Mongoose model with query safety features
 * @param {mongoose.Model} Model - The Mongoose model to wrap
 * @returns {Object} - Safe query methods
 */
export function createSafeModel(Model) {
    return {
        /**
         * Safe find with automatic pagination and projection
         * @param {Object} filter - Query filter
         * @param {Object} options - Query options
         * @returns {Promise<{ data: Array, pagination: Object }>}
         */
        async safeFind(filter = {}, options = {}) {
            const {
                page = 1,
                limit = DEFAULT_PAGE_SIZE,
                projection = null,
                sort = { createdAt: -1 },
                maxTimeMS = QUERY_TIMEOUT_MS
            } = options;

            // Enforce maximum page size
            const safeLimit = Math.min(Math.max(1, parseInt(limit) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
            const safePage = Math.max(1, parseInt(page) || 1);
            const skip = (safePage - 1) * safeLimit;

            // Build query with timeout
            let query = Model.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(safeLimit)
                .maxTimeMS(maxTimeMS);

            // Apply projection if provided
            if (projection) {
                query = query.select(projection);
            }

            // Execute with lean for performance
            const [data, totalCount] = await Promise.all([
                query.lean(),
                Model.countDocuments(filter).maxTimeMS(maxTimeMS)
            ]);

            return {
                data,
                pagination: {
                    currentPage: safePage,
                    pageSize: safeLimit,
                    totalPages: Math.ceil(totalCount / safeLimit),
                    totalCount,
                    hasNextPage: skip + safeLimit < totalCount,
                    hasPrevPage: safePage > 1
                }
            };
        },

        /**
         * Safe find for dropdown/autocomplete (limited fields)
         * @param {Object} filter - Query filter
         * @param {Array<string>} fields - Fields to return
         * @param {number} limit - Max results (default 50)
         * @returns {Promise<Array>}
         */
        async safeFindForDropdown(filter = {}, fields = ["_id", "name"], limit = 50) {
            const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
            const projection = fields.reduce((acc, field) => {
                acc[field] = 1;
                return acc;
            }, {});

            return Model.find(filter)
                .select(projection)
                .limit(safeLimit)
                .maxTimeMS(QUERY_TIMEOUT_MS)
                .lean();
        },

        /**
         * Safe findOne with projection
         * @param {Object} filter - Query filter
         * @param {Object} projection - Fields to return
         * @returns {Promise<Object|null>}
         */
        async safeFindOne(filter, projection = null) {
            let query = Model.findOne(filter).maxTimeMS(QUERY_TIMEOUT_MS);

            if (projection) {
                query = query.select(projection);
            }

            return query.lean();
        },

        /**
         * Safe aggregate with result limit
         * @param {Array} pipeline - Aggregation pipeline
         * @param {Object} options - Options
         * @returns {Promise<Array>}
         */
        async safeAggregate(pipeline, options = {}) {
            const {
                maxResults = MAX_UNBOUNDED_RESULTS,
                maxTimeMS = QUERY_TIMEOUT_MS
            } = options;

            // Add $limit stage if not present
            const hasLimit = pipeline.some(stage => "$limit" in stage);

            const safePipeline = hasLimit
                ? pipeline
                : [...pipeline, { $limit: maxResults }];

            return Model.aggregate(safePipeline)
                .option({ maxTimeMS })
                .exec();
        }
    };
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Middleware to enforce pagination on list endpoints
 * Automatically adds pagination params and limits response size
 */
export function enforcePagination(options = {}) {
    const {
        defaultLimit = DEFAULT_PAGE_SIZE,
        maxLimit = MAX_PAGE_SIZE,
        limitParam = "limit",
        pageParam = "page"
    } = options;

    return (req, res, next) => {
        // Parse and sanitize pagination params
        const requestedLimit = parseInt(req.query[limitParam]) || defaultLimit;
        const requestedPage = parseInt(req.query[pageParam]) || 1;

        // Enforce limits
        req.pagination = {
            page: Math.max(1, requestedPage),
            limit: Math.min(Math.max(1, requestedLimit), maxLimit),
            skip: (Math.max(1, requestedPage) - 1) * Math.min(Math.max(1, requestedLimit), maxLimit)
        };

        // Store original json to wrap response
        const originalJson = res.json.bind(res);

        res.json = function (data) {
            // If data is an array and larger than maxLimit, warn in logs
            if (Array.isArray(data) && data.length > maxLimit) {
                console.warn(`⚠️ Large unbounded response detected: ${data.length} items at ${req.originalUrl}`);
            }

            return originalJson(data);
        };

        next();
    };
}

/**
 * Middleware to add response size tracking
 * Logs warnings for large responses
 */
export function trackResponseSize(warningThresholdBytes = 1024 * 1024) { // 1MB default
    return (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = function (data) {
            const jsonString = JSON.stringify(data);
            const sizeBytes = Buffer.byteLength(jsonString, "utf8");

            if (sizeBytes > warningThresholdBytes) {
                console.warn(`⚠️ Large response (${(sizeBytes / 1024 / 1024).toFixed(2)}MB) at ${req.originalUrl}`);
            }

            // Add size header for monitoring
            res.setHeader("X-Response-Size", sizeBytes);

            return originalJson(data);
        };

        next();
    };
}

// ============================================================================
// QUERY BUILDING HELPERS
// ============================================================================

/**
 * Build a safe projection object excluding heavy fields
 * @param {string[]} includeFields - Fields to include
 * @param {string[]} excludeFields - Fields to exclude
 * @returns {Object} - Projection object
 */
export function buildProjection(includeFields = [], excludeFields = []) {
    if (includeFields.length > 0) {
        // Inclusion projection
        return includeFields.reduce((acc, field) => {
            acc[field] = 1;
            return acc;
        }, {});
    }

    if (excludeFields.length > 0) {
        // Exclusion projection
        return excludeFields.reduce((acc, field) => {
            acc[field] = 0;
            return acc;
        }, {});
    }

    return null;
}

/**
 * Default exclusions for ExJobModel to reduce payload size
 */
export const EXJOB_LIGHT_PROJECTION = {
    operations: 0,
    invoices: 0,
    containers: 0,
    eSanchitDocuments: 0,
    export_documents: 0,
    charges: 0,
    apInvoices: 0,
    arInvoices: 0
};

/**
 * Minimal fields for list views
 */
export const EXJOB_LIST_PROJECTION = {
    _id: 1,
    job_no: 1,
    year: 1,
    exporter: 1,
    status: 1,
    consignmentType: 1,
    sb_no: 1,
    sb_date: 1,
    destination_country: 1,
    createdAt: 1,
    isJobtrackingEnabled: 1,
    milestones: 1
};

// ============================================================================
// EXPORT AGGREGATION HELPERS
// ============================================================================

/**
 * Create aggregation summary instead of returning full documents
 * @param {Object} match - Match stage criteria
 * @returns {Array} - Aggregation pipeline
 */
export function createSummaryPipeline(match = {}) {
    return [
        { $match: match },
        {
            $group: {
                _id: null,
                totalCount: { $sum: 1 },
                // Add relevant summary fields
            }
        },
        { $limit: 1 }
    ];
}

export default {
    MAX_UNBOUNDED_RESULTS,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    QUERY_TIMEOUT_MS,
    createSafeModel,
    enforcePagination,
    trackResponseSize,
    buildProjection,
    EXJOB_LIGHT_PROJECTION,
    EXJOB_LIST_PROJECTION,
    createSummaryPipeline
};
