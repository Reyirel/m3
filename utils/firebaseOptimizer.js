/**
 * firebaseOptimizer.js
 * 
 * Firebase/Firestore Query Optimization
 * Reduce reads, implement pagination, batching, and intelligent caching
 * 
 * 📊 Impacto Esperado: -60% Firebase reads, better UX
 * 
 * Uso:
 * import { PaginatedQuery, FirebaseCache, optimizeQuery } from './utils/firebaseOptimizer';
 * 
 * const { query, loading, data, nextPage, hasMore } = usePaginatedQuery(
 *   'tasks',
 *   { pageSize: 20, filters: { status: 'abierta' } }
 * );
 */

import { useCallback, useState, useEffect, useRef } from 'react';

/**
 * Firebase Cache Management
 * Reduces redundant queries and improves performance
 */
export class FirebaseCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      this.hitCount++;
      return cached.data;
    }
    this.missCount++;
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   * @param {string} pattern - Optional pattern to match keys
   */
  clear(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total * 100).toFixed(2) : 0;
    
    return {
      size: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: `${hitRate}%`,
      ttl: this.ttl,
    };
  }

  /**
   * Export cache state for persistence
   * @returns {Object} Serializable cache state
   */
  export() {
    return Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      data: value.data,
      timestamp: value.timestamp,
    }));
  }
}

// Global cache instance
export const firestoreCache = new FirebaseCache();

/**
 * Optimized query builder
 * Helps construct efficient Firestore queries
 * 
 * @param {Object} options - Query options
 * @returns {Object} { query, indexes }
 * 
 * @example
 * const { query } = optimizeQuery({
 *   collection: 'tasks',
 *   filters: [
 *     { field: 'status', operator: '==', value: 'abierta' },
 *     { field: 'assignedTo', operator: '==', value: 'user@example.com' }
 *   ],
 *   orderBy: [{ field: 'dueAt', direction: 'asc' }],
 *   limit: 20
 * });
 * 
 * // Run query
 * const snapshot = await getDocs(query);
 */
export const optimizeQuery = (options) => {
  const {
    collection,
    filters = [],
    orderBy = [],
    limit = 50,
  } = options;

  // Log recommended indexes
  const requiredIndexes = [];
  if (filters.length > 1 && orderBy.length > 0) {
    requiredIndexes.push({
      collection,
      fields: [...filters.map(f => f.field), ...orderBy.map(o => o.field)],
      note: 'This query requires a composite index',
    });
  }

  // Query statistics for monitoring
  const stats = {
    estimatedCost: filters.length * 1 + orderBy.length * 0.5, // Rough estimate
    requiredIndexes,
    recommendation: limit > 100 ? 'Consider pagination' : 'OK',
  };

  return {
    options,
    stats,
  };
};

/**
 * Pagination Hook for Firestore
 * Efficiently load large datasets in chunks
 * 
 * @param {string} collection - Firestore collection name
 * @param {Object} options - Query options
 * @returns {Object} { data, loading, error, nextPage, prevPage, hasMore, hasPrev }
 * 
 * @example
 * const {
 *   data: tasks,
 *   loading,
 *   nextPage,
 *   hasMore
 * } = usePaginatedQuery('tasks', {
 *   pageSize: 20,
 *   filters: { status: 'abierta' },
 *   orderBy: 'dueAt'
 * });
 * 
 * // In list:
 * {tasks.map(t => <TaskItem key={t.id} task={t} />)}
 * 
 * {hasMore && (
 *   <Button onPress={nextPage} title="Load More" />
 * )}
 */
export const usePaginatedQuery = (collection, options = {}) => {
  const {
    pageSize = 20,
    filters = {},
    orderBy = 'createdAt',
    direction: _direction = 'desc',
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasPrev, setHasPrev] = useState(false);
  
  const pageRef = useRef(0);
  const snapshots = useRef([]);
  const lastDocRef = useRef(null);
  const firstDocRef = useRef(null);
  const allDataRef = useRef([]);

  /**
   * Build Firestore query
   */
  const buildQuery = useCallback((_direction = 'next') => {
    // This is a template - implement based on your Firebase service
    // Example structure:
    const queryConfig = {
      collection,
      pageSize,
      filters,
      orderBy,
    };
    
    console.log('[FirebaseOptimizer] Query:', queryConfig);
    return queryConfig;
  }, [collection, pageSize, filters, orderBy]);

  /**
   * Load next page
   */
  const nextPage = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      
      // Build optimized query
      const queryConfig = buildQuery('next');
      
      // Simulate data fetch (replace with actual Firebase query)
      const newDocs = await simulatePaginatedFetch(queryConfig);
      
      if (newDocs.length < pageSize) {
        setHasMore(false);
      }

      allDataRef.current = [...allDataRef.current, ...newDocs];
      setData(allDataRef.current);
      
      pageRef.current += 1;
      setHasPrev(pageRef.current > 0);
      
      // Update cursor for next page
      if (newDocs.length > 0) {
        lastDocRef.current = newDocs[newDocs.length - 1];
      }

      setError(null);
    } catch (err) {
      setError(err);
      console.error('[FirebaseOptimizer] Pagination error:', err);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, buildQuery, pageSize]);

  /**
   * Load previous page
   */
  const prevPage = useCallback(async () => {
    if (!hasPrev || loading) return;

    try {
      setLoading(true);

      if (pageRef.current > 0) {
        pageRef.current -= 1;
        
        // Reconstruct data from earlier snapshots
        const snapshot = snapshots.current[pageRef.current];
        if (snapshot) {
          const prevDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          allDataRef.current = prevDocs;
          setData(prevDocs);
          
          setHasMore(true);
          setHasPrev(pageRef.current > 0);
          setError(null);
        }
      }
    } catch (err) {
      setError(err);
      console.error('[FirebaseOptimizer] Previous page error:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasPrev]);

  /**
   * Load initial data
   */
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        const queryConfig = buildQuery();
        const docs = await simulatePaginatedFetch(queryConfig);
        
        allDataRef.current = docs;
        setData(docs);
        setHasMore(docs.length >= pageSize);
        
        if (docs.length > 0) {
          lastDocRef.current = docs[docs.length - 1];
          firstDocRef.current = docs[0];
        }

        setError(null);
      } catch (err) {
        setError(err);
        console.error('[FirebaseOptimizer] Initial load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, [buildQuery, pageSize]);

  return {
    data,
    loading,
    error,
    nextPage,
    prevPage,
    hasMore,
    hasPrev,
    page: pageRef.current,
    totalLoaded: allDataRef.current.length,
  };
};

/**
 * Simulate paginated fetch (replace with real Firebase query)
 * @param {Object} queryConfig - Query configuration
 * @returns {Promise<Array>} Documents
 */
const simulatePaginatedFetch = async (_queryConfig) => {
  // This is a placeholder - implement with your actual Firebase service
  // Example:
  // const q = query(
  //   collection(db, queryConfig.collection),
  //   where('status', '==', queryConfig.filters.status),
  //   orderBy(queryConfig.orderBy, 'desc'),
  //   limit(queryConfig.pageSize)
  // );
  // const snap = await getDocs(q);
  // return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return [];
};

/**
 * Batch read optimization
 * Load multiple documents efficiently
 * 
 * @param {Array<string>} docIds - Document IDs to read
 * @param {string} collection - Collection name
 * @returns {Promise<Array>} Documents
 * 
 * @example
 * const docs = await batchRead(
 *   ['user1', 'user2', 'user3'],
 *   'users'
 * );
 */
export const batchRead = async (docIds, _collection) => {
  // Firebase recommendation: max 100 docs per read, batch into 10 operations max

  if (docIds.length === 0) return [];

  const batchSize = 100;
  const batches = [];

  for (let i = 0; i < docIds.length; i += batchSize) {
    batches.push(docIds.slice(i, i + batchSize));
  }

  console.log(`[FirebaseOptimizer] Batching ${docIds.length} reads into ${batches.length} operations`);

  try {
    const results = [];
    
    // This is a template - implement with your Firebase service
    for (const _batch of batches) {
      // const q = query(
      //   collection(db, collection),
      //   where('__name__', 'in', batch)
      // );
      // const snap = await getDocs(q);
      // results.push(...snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }

    return results;
  } catch (error) {
    console.error('[FirebaseOptimizer] Batch read failed:', error);
    throw error;
  }
};

/**
 * Query cost estimation
 * Helps estimate Firestore costs for queries
 * 
 * @param {Object} queryStats - Query statistics from optimizeQuery
 * @returns {Object} Cost estimation
 * 
 * @example
 * const { stats } = optimizeQuery(options);
 * const cost = estimateQueryCost(stats);
 * console.log(`This query costs ~${cost.readOps} read operations`);
 */
export const estimateQueryCost = (queryStats) => {
  // Firestore pricing: $0.06 per 100k reads
  const readOps = queryStats.estimatedCost;
  const costPer100k = 0.06;
  const estimatedCostUSD = (readOps / 100000) * costPer100k;

  return {
    readOps: readOps.toFixed(0),
    estimatedCostUSD: estimatedCostUSD.toFixed(6),
    recommendation: readOps > 10 ? '⚠ High cost - consider optimization' : '✓ Efficient',
  };
};

/**
 * Clear all caches
 * Call on logout or when data should be refreshed
 */
export const clearAllCaches = () => {
  firestoreCache.clear();
  console.log('[FirebaseOptimizer] All caches cleared');
};

export default {
  FirebaseCache,
  firestoreCache,
  optimizeQuery,
  usePaginatedQuery,
  batchRead,
  estimateQueryCost,
  clearAllCaches,
};
