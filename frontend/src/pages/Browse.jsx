import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Browse() {
  const { category: urlCat } = useParams();
  const { apiFetch, user } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [bookModal, setBookModal] = useState(false);
  const [bookData, setBookData] = useState({ start_date: '', end_date: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Filter state
  const [filterOptions, setFilterOptions] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(urlCat || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedRating, setSelectedRating] = useState('');
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedAvailability, setSelectedAvailability] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [hasWeekly, setHasWeekly] = useState(false);
  const [hasMonthly, setHasMonthly] = useState(false);
  const [selectedOwners, setSelectedOwners] = useState([]);
  const [hasReviews, setHasReviews] = useState(false);
  const [minViews, setMinViews] = useState('');
  const [listedWithin, setListedWithin] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');

  // Collapsible sidebar sections
  const [collapsed, setCollapsed] = useState({});
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // Favorites state
  const [favIds, setFavIds] = useState(new Set());

  // Reviews state - card level (bulk)
  const [cardReviews, setCardReviews] = useState({});

  // Reviews state - modal level
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewHover, setReviewHover] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  useEffect(() => { if (urlCat) setSelectedCategory(urlCat); }, [urlCat]);

  // Load user's favorites
  useEffect(() => {
    apiFetch('/api/favorites').then(r => r.json()).then(favs => setFavIds(new Set(favs.map(f => f.listing_id)))).catch(() => {});
  }, []);

  // Build filter params
  const getFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
    if (search) params.set('search', search);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    if (selectedConditions.length) params.set('conditions', selectedConditions.join(','));
    if (selectedRating) params.set('min_rating', selectedRating);
    if (selectedCities.length) params.set('cities', selectedCities.join(','));
    if (selectedAvailability) params.set('availability', selectedAvailability);
    if (hasWeekly) params.set('has_weekly', 'true');
    if (hasMonthly) params.set('has_monthly', 'true');
    if (selectedOwners.length) params.set('owners', selectedOwners.join(','));
    if (hasReviews) params.set('has_reviews', 'true');
    if (minViews) params.set('min_views', minViews);
    if (listedWithin) params.set('listed_within', listedWithin);
    if (selectedFeature) params.set('feature', selectedFeature);
    if (sortBy) params.set('sort', sortBy);
    return params;
  }, [selectedCategory, selectedSubcategory, search, minPrice, maxPrice, selectedConditions, selectedRating, selectedCities, selectedAvailability, hasWeekly, hasMonthly, selectedOwners, hasReviews, minViews, listedWithin, selectedFeature, sortBy]);

  // Load filter options
  const loadFilters = useCallback(async () => {
    try {
      const params = getFilterParams();
      const res = await apiFetch(`/api/listings/filters?${params}`);
      setFilterOptions(await res.json());
    } catch {}
  }, [getFilterParams]);

  // Load listings
  const loadListings = useCallback(async () => {
    try {
      const params = getFilterParams();
      const res = await apiFetch(`/api/listings?${params}`);
      const data = await res.json();
      setItems(data);
      if (data.length > 0) {
        loadBulkReviews(data.map(i => i.id));
      } else {
        setCardReviews({});
      }
    } catch { toast.error('Failed to load listings'); }
  }, [getFilterParams]);

  const loadBulkReviews = async (ids) => {
    try {
      const res = await apiFetch(`/api/reviews/bulk?ids=${ids.join(',')}`);
      const allRevs = await res.json();
      const grouped = {};
      allRevs.forEach(r => { if (!grouped[r.listing_id]) grouped[r.listing_id] = []; grouped[r.listing_id].push(r); });
      setCardReviews(grouped);
    } catch { setCardReviews({}); }
  };

  // Load on filter change
  useEffect(() => {
    loadListings();
    loadFilters();
  }, [selectedCategory, selectedSubcategory, selectedConditions, minPrice, maxPrice, selectedRating, selectedCities, selectedAvailability, hasWeekly, hasMonthly, selectedOwners, hasReviews, minViews, listedWithin, selectedFeature, sortBy]);

  const doSearch = (e) => { e.preventDefault(); loadListings(); loadFilters(); };

  // Active filters for chips
  const activeFilters = [];
  if (selectedCategory) activeFilters.push({ key: 'category', label: selectedCategory, clear: () => { setSelectedCategory(''); setSelectedSubcategory(''); } });
  if (selectedSubcategory) activeFilters.push({ key: 'subcategory', label: selectedSubcategory, clear: () => setSelectedSubcategory('') });
  selectedConditions.forEach(c => activeFilters.push({ key: `cond-${c}`, label: c, clear: () => setSelectedConditions(prev => prev.filter(x => x !== c)) }));
  if (minPrice || maxPrice) activeFilters.push({ key: 'price', label: `$${minPrice || 0} - $${maxPrice || '∞'}`, clear: () => { setMinPrice(''); setMaxPrice(''); } });
  if (selectedRating) activeFilters.push({ key: 'rating', label: `${selectedRating}+ Stars`, clear: () => setSelectedRating('') });
  selectedCities.forEach(c => activeFilters.push({ key: `city-${c}`, label: c, clear: () => setSelectedCities(prev => prev.filter(x => x !== c)) }));
  if (selectedAvailability) activeFilters.push({ key: 'avail', label: selectedAvailability, clear: () => setSelectedAvailability('') });
  if (hasWeekly) activeFilters.push({ key: 'weekly', label: 'Has Weekly Price', clear: () => setHasWeekly(false) });
  if (hasMonthly) activeFilters.push({ key: 'monthly', label: 'Has Monthly Price', clear: () => setHasMonthly(false) });
  selectedOwners.forEach(id => {
    const owner = (filterOptions?.owners || []).find(o => o.id === id);
    activeFilters.push({ key: `owner-${id}`, label: `By: ${owner?.value || id}`, clear: () => setSelectedOwners(prev => prev.filter(x => x !== id)) });
  });
  if (hasReviews) activeFilters.push({ key: 'hasReviews', label: 'Has Reviews', clear: () => setHasReviews(false) });
  if (minViews) activeFilters.push({ key: 'minViews', label: `${minViews}+ Views`, clear: () => setMinViews('') });
  if (listedWithin) activeFilters.push({ key: 'listedWithin', label: `Listed within ${listedWithin} days`, clear: () => setListedWithin('') });
  if (selectedFeature) activeFilters.push({ key: 'feature', label: `Feature: ${selectedFeature}`, clear: () => setSelectedFeature('') });

  const clearAllFilters = () => {
    setSelectedCategory(''); setSelectedSubcategory(''); setSelectedConditions([]);
    setMinPrice(''); setMaxPrice(''); setSelectedRating('');
    setSelectedCities([]); setSelectedAvailability('');
    setHasWeekly(false); setHasMonthly(false); setSearch('');
    setSelectedOwners([]); setHasReviews(false); setMinViews('');
    setListedWithin(''); setSelectedFeature('');
  };

  const toggleCollapse = (section) => setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));

  const toggleCheckbox = (value, selected, setter) => {
    setter(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  };

  // Detail modal
  const loadReviews = async (listingId) => {
    setReviewsLoading(true);
    try { const res = await apiFetch(`/api/reviews/listing/${listingId}`); setReviews(await res.json()); }
    catch { setReviews([]); }
    finally { setReviewsLoading(false); }
  };

  const openDetail = async (item) => {
    try {
      const res = await apiFetch(`/api/listings/${item.id}`);
      const detail = await res.json();
      setSel(detail);
      setShowReviewForm(false); setEditingReview(null);
      setReviewRating(5); setReviewComment('');
      setPlans([]); setSelectedPlan(null);
      loadReviews(detail.id);
      apiFetch(`/api/subscriptions/plans/listing/${detail.id}`).then(r => r.json()).then(setPlans).catch(() => setPlans([]));
    } catch { setSel(item); loadReviews(item.id); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) { toast.error('Please write a comment'); return; }
    setSubmittingReview(true);
    try {
      if (editingReview) {
        const res = await apiFetch(`/api/reviews/${editingReview.id}`, { method: 'PUT', body: JSON.stringify({ rating: reviewRating, comment: reviewComment }) });
        if (!res.ok) throw new Error('Failed to update');
        toast.success('Review updated!');
      } else {
        const res = await apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify({ listing_id: sel.id, rating: reviewRating, comment: reviewComment }) });
        if (!res.ok) throw new Error('Failed to submit');
        toast.success('Review submitted!');
      }
      setShowReviewForm(false); setEditingReview(null); setReviewRating(5); setReviewComment('');
      loadReviews(sel.id);
      const updated = await apiFetch(`/api/listings/${sel.id}`); setSel(await updated.json());
      loadListings();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setSubmittingReview(false); }
  };

  const deleteReview = async (reviewId) => {
    if (!confirm('Delete this review?')) return;
    try {
      await apiFetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      toast.success('Review deleted'); loadReviews(sel.id);
      const updated = await apiFetch(`/api/listings/${sel.id}`); setSel(await updated.json()); loadListings();
    } catch { toast.error('Failed to delete review'); }
  };

  const deleteReviewFromCard = async (reviewId) => {
    if (!confirm('Delete this review?')) return;
    try { await apiFetch(`/api/reviews/${reviewId}`, { method: 'DELETE' }); toast.success('Review deleted'); loadListings(); }
    catch { toast.error('Failed to delete review'); }
  };

  const startEditReview = (rev) => { setEditingReview(rev); setReviewRating(rev.rating); setReviewComment(rev.comment); setShowReviewForm(true); };

  const toggleFav = async (lid, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await apiFetch('/api/favorites', { method: 'POST', body: JSON.stringify({ listing_id: lid }) });
      const data = await res.json();
      setFavIds(prev => { const next = new Set(prev); if (data.favorited) next.add(lid); else next.delete(lid); return next; });
      toast.success(data.favorited ? 'Added to favorites!' : 'Removed from favorites');
    } catch { toast.error('Failed'); }
  };

  const submitBooking = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify({ listing_id: sel.id, ...bookData }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const booking = await res.json();
      if (selectedPlan) {
        try {
          await apiFetch('/api/subscriptions/contracts', { method: 'POST', body: JSON.stringify({ booking_id: booking.id, plan_id: selectedPlan.id }) });
          toast.success('Booking sent with service plan!');
        } catch { toast.success('Booking sent! (Service plan creation failed)'); }
      } else {
        toast.success('Booking request sent!');
      }
      setBookModal(false); setBookData({ start_date: '', end_date: '', message: '' }); setSelectedPlan(null);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const renderStars = (r) => '★'.repeat(Math.round(r || 0)) + '☆'.repeat(5 - Math.round(r || 0));
  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Category icons
  const catIcons = { 'Properties': '🏠', 'Vehicles': '🚗', 'Electronics': '📷', 'Tools & Equipment': '🔧', 'Sports & Outdoor': '🚴', 'Event & Party': '🎉' };

  // All categories (for rendering tree even before filterOptions loads)
  const allCats = ['Properties', 'Vehicles', 'Electronics', 'Tools & Equipment', 'Sports & Outdoor', 'Event & Party'];

  // Build subcategory map from filterOptions
  const subcats = filterOptions?.subcategories || [];
  const catCounts = {};
  (filterOptions?.categories || []).forEach(c => { catCounts[c.value] = c.count; });

  // --- FILTER SIDEBAR (Hierarchical in-place tree) ---
  const renderSidebar = () => (
    <div className="filter-sidebar">
      <div className="filter-sidebar-header">
        <h3>Filters</h3>
        {activeFilters.length > 0 && (
          <button className="filter-clear-all" onClick={clearAllFilters}>Clear All</button>
        )}
        <button className="filter-mobile-close" onClick={() => setMobileSidebar(false)}>✕</button>
      </div>

      {/* Sort By */}
      <div className="filter-sort">
        <label>Sort By</label>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
          <option value="views">Most Viewed</option>
          <option value="reviews">Most Reviewed</option>
        </select>
      </div>

      {/* ===== HIERARCHICAL CATEGORY TREE (in-place expand) ===== */}
      <div className="filter-section">
        <div className="filter-section-head-static">Shop by Category</div>
        <div className="filter-section-body">
          <div className="filter-tree">
            {allCats.map(cat => {
              const isOpen = selectedCategory === cat;
              const count = catCounts[cat] || 0;
              return (
                <div key={cat} className="filter-tree-node">
                  {/* Category row */}
                  <button
                    className={`filter-tree-item ${isOpen ? 'expanded' : ''} ${isOpen && !selectedSubcategory ? 'selected' : ''}`}
                    onClick={() => {
                      if (isOpen) { setSelectedCategory(''); setSelectedSubcategory(''); }
                      else { setSelectedCategory(cat); setSelectedSubcategory(''); }
                    }}
                  >
                    <span className={`filter-tree-toggle ${isOpen ? 'open' : ''}`}>{isOpen ? '▾' : '▸'}</span>
                    <span className="filter-tree-icon">{catIcons[cat]}</span>
                    <span className="filter-tree-label">{cat}</span>
                    <span className="filter-option-count">{count}</span>
                  </button>

                  {/* Subcategories expand in-place beneath this category */}
                  {isOpen && subcats.length > 0 && (
                    <div className="filter-tree-children">
                      {subcats.map(s => (
                        <button
                          key={s.value}
                          className={`filter-tree-child ${selectedSubcategory === s.value ? 'active' : ''}`}
                          onClick={() => setSelectedSubcategory(selectedSubcategory === s.value ? '' : s.value)}
                        >
                          <span className="filter-tree-child-label">{s.value}</span>
                          <span className="filter-option-count">{s.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== APPLIED FILTERS CHIPS ===== */}
      {activeFilters.filter(f => f.key !== 'category' && f.key !== 'subcategory').length > 0 && (
        <div className="filter-chips">
          {activeFilters.filter(f => f.key !== 'category' && f.key !== 'subcategory').map(f => (
            <span key={f.key} className="filter-chip">
              {f.label}
              <button onClick={f.clear}>✕</button>
            </span>
          ))}
        </div>
      )}

      {/* ===== CONDITION ===== */}
      <div className="filter-section">
        <button className="filter-section-head" onClick={() => toggleCollapse('condition')}>
          <span>Condition</span>
          {selectedConditions.length > 0 && <span className="filter-active-dot" />}
          <span className="filter-arrow">{collapsed.condition ? '▸' : '▾'}</span>
        </button>
        {!collapsed.condition && (
          <div className="filter-section-body">
            {(filterOptions?.conditions || []).map(c => (
              <label key={c.value} className="filter-checkbox">
                <input type="checkbox" checked={selectedConditions.includes(c.value)} onChange={() => toggleCheckbox(c.value, selectedConditions, setSelectedConditions)} />
                <span className="filter-option-label">{c.value}</span>
                <span className="filter-option-count">{c.count}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ===== PRICE RANGE ===== */}
      <div className="filter-section">
        <button className="filter-section-head" onClick={() => toggleCollapse('price')}>
          <span>Price (per day)</span>
          {(minPrice || maxPrice) && <span className="filter-active-dot" />}
          <span className="filter-arrow">{collapsed.price ? '▸' : '▾'}</span>
        </button>
        {!collapsed.price && (
          <div className="filter-section-body">
            {filterOptions?.priceRange && (
              <div className="filter-price-hint">
                Range: ${filterOptions.priceRange.min} - ${filterOptions.priceRange.max}
              </div>
            )}
            <div className="filter-price-row">
              <div className="filter-price-input">
                <span className="filter-price-symbol">$</span>
                <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} min="0" />
              </div>
              <span className="filter-price-to">to</span>
              <div className="filter-price-input">
                <span className="filter-price-symbol">$</span>
                <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} min="0" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== RATING ===== */}
      <div className="filter-section">
        <button className="filter-section-head" onClick={() => toggleCollapse('rating')}>
          <span>Rating</span>
          {selectedRating && <span className="filter-active-dot" />}
          <span className="filter-arrow">{collapsed.rating ? '▸' : '▾'}</span>
        </button>
        {!collapsed.rating && (
          <div className="filter-section-body">
            {[4, 3, 2, 1].map(r => (
              <label key={r} className="filter-radio" onClick={() => setSelectedRating(selectedRating === String(r) ? '' : String(r))}>
                <input type="radio" name="rating" checked={selectedRating === String(r)} readOnly />
                <span className="filter-option-label">
                  <span className="stars" style={{ fontSize: '.8rem' }}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span> & Up
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ===== CITY / LOCATION ===== */}
      <div className="filter-section">
        <button className="filter-section-head" onClick={() => toggleCollapse('city')}>
          <span>Location</span>
          {selectedCities.length > 0 && <span className="filter-active-dot" />}
          <span className="filter-arrow">{collapsed.city ? '▸' : '▾'}</span>
        </button>
        {!collapsed.city && (
          <div className="filter-section-body filter-scrollable">
            {(filterOptions?.cities || []).map(c => (
              <label key={c.value} className="filter-checkbox">
                <input type="checkbox" checked={selectedCities.includes(c.value)} onChange={() => toggleCheckbox(c.value, selectedCities, setSelectedCities)} />
                <span className="filter-option-label">{c.value}</span>
                <span className="filter-option-count">{c.count}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ===== AVAILABILITY ===== */}
      <div className="filter-section">
        <button className="filter-section-head" onClick={() => toggleCollapse('availability')}>
          <span>Availability</span>
          {selectedAvailability && <span className="filter-active-dot" />}
          <span className="filter-arrow">{collapsed.availability ? '▸' : '▾'}</span>
        </button>
        {!collapsed.availability && (
          <div className="filter-section-body">
            <label className="filter-radio" onClick={() => setSelectedAvailability('')}>
              <input type="radio" name="availability" checked={!selectedAvailability} readOnly />
              <span className="filter-option-label">Any</span>
            </label>
            {(filterOptions?.availability || []).map(a => (
              <label key={a.value} className="filter-radio" onClick={() => setSelectedAvailability(a.value)}>
                <input type="radio" name="availability" checked={selectedAvailability === a.value} readOnly />
                <span className="filter-option-label" style={{ textTransform: 'capitalize' }}>{a.value}</span>
                <span className="filter-option-count">{a.count}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ===== PRICING OPTIONS ===== */}
      <div className="filter-section">
        <button className="filter-section-head" onClick={() => toggleCollapse('pricing')}>
          <span>Pricing Options</span>
          {(hasWeekly || hasMonthly) && <span className="filter-active-dot" />}
          <span className="filter-arrow">{collapsed.pricing ? '▸' : '▾'}</span>
        </button>
        {!collapsed.pricing && (
          <div className="filter-section-body">
            <label className="filter-checkbox">
              <input type="checkbox" checked={hasWeekly} onChange={() => setHasWeekly(!hasWeekly)} />
              <span className="filter-option-label">Has Weekly Price</span>
            </label>
            <label className="filter-checkbox">
              <input type="checkbox" checked={hasMonthly} onChange={() => setHasMonthly(!hasMonthly)} />
              <span className="filter-option-label">Has Monthly Price</span>
            </label>
          </div>
        )}
      </div>

      {/* ===== OWNER / LISTED BY ===== */}
      {(filterOptions?.owners || []).length > 0 && (
        <div className="filter-section">
          <button className="filter-section-head" onClick={() => toggleCollapse('owner')}>
            <span>Listed By</span>
            {selectedOwners.length > 0 && <span className="filter-active-dot" />}
            <span className="filter-arrow">{collapsed.owner ? '▸' : '▾'}</span>
          </button>
          {!collapsed.owner && (
            <div className="filter-section-body filter-scrollable">
              {(filterOptions?.owners || []).map(o => (
                <label key={o.id} className="filter-checkbox">
                  <input type="checkbox" checked={selectedOwners.includes(o.id)} onChange={() => toggleCheckbox(o.id, selectedOwners, setSelectedOwners)} />
                  <span className="filter-option-label">{o.value}</span>
                  <span className="filter-option-count">{o.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== FEATURES / AMENITIES ===== */}
      {(filterOptions?.features || []).length > 0 && (
        <div className="filter-section">
          <button className="filter-section-head" onClick={() => toggleCollapse('features')}>
            <span>Features</span>
            {selectedFeature && <span className="filter-active-dot" />}
            <span className="filter-arrow">{collapsed.features ? '▸' : '▾'}</span>
          </button>
          {!collapsed.features && (
            <div className="filter-section-body filter-scrollable">
              {(filterOptions?.features || []).map(f => (
                <label key={f.value} className="filter-radio" onClick={() => setSelectedFeature(selectedFeature === f.value ? '' : f.value)}>
                  <input type="radio" name="feature" checked={selectedFeature === f.value} readOnly />
                  <span className="filter-option-label">{f.value}</span>
                  <span className="filter-option-count">{f.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== LISTED WITHIN ===== */}
      <div className="filter-section">
        <button className="filter-section-head" onClick={() => toggleCollapse('listedWithin')}>
          <span>Listed Within</span>
          {listedWithin && <span className="filter-active-dot" />}
          <span className="filter-arrow">{collapsed.listedWithin ? '▸' : '▾'}</span>
        </button>
        {!collapsed.listedWithin && (
          <div className="filter-section-body">
            {[{ label: 'Any time', value: '' }, { label: 'Last 24 hours', value: '1' }, { label: 'Last 7 days', value: '7' }, { label: 'Last 30 days', value: '30' }, { label: 'Last 90 days', value: '90' }].map(opt => (
              <label key={opt.value} className="filter-radio" onClick={() => setListedWithin(opt.value)}>
                <input type="radio" name="listedWithin" checked={listedWithin === opt.value} readOnly />
                <span className="filter-option-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ===== SHOW ONLY ===== */}
      <div className="filter-section">
        <button className="filter-section-head" onClick={() => toggleCollapse('showOnly')}>
          <span>Show Only</span>
          {(hasReviews || minViews) && <span className="filter-active-dot" />}
          <span className="filter-arrow">{collapsed.showOnly ? '▸' : '▾'}</span>
        </button>
        {!collapsed.showOnly && (
          <div className="filter-section-body">
            <label className="filter-checkbox">
              <input type="checkbox" checked={hasReviews} onChange={() => setHasReviews(!hasReviews)} />
              <span className="filter-option-label">Has Reviews</span>
              {filterOptions?.reviewCounts && (
                <span className="filter-option-count">
                  {filterOptions.reviewCounts.find(r => r.value === 'Has Reviews')?.count || 0}
                </span>
              )}
            </label>
            <label className="filter-checkbox">
              <input type="checkbox" checked={minViews === '50'} onChange={() => setMinViews(minViews === '50' ? '' : '50')} />
              <span className="filter-option-label">Popular (50+ views)</span>
            </label>
            <label className="filter-checkbox">
              <input type="checkbox" checked={minViews === '100'} onChange={() => setMinViews(minViews === '100' ? '' : '100')} />
              <span className="filter-option-label">Trending (100+ views)</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="page browse-page">
      {/* Top Bar: Search + Sort */}
      <div className="browse-top-bar">
        <div className="browse-top-left">
          <button className="btn btn-s btn-sm filter-mobile-btn" onClick={() => setMobileSidebar(true)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h6"/></svg>
            Filters
          </button>
          <form className="browse-search" onSubmit={doSearch}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings..." />
            <button type="submit" className="btn btn-p btn-sm">Search</button>
          </form>
        </div>
      </div>

      {/* Results count + active chips (top bar) */}
      <div className="browse-results-bar">
        <span className="browse-results-count">{items.length} result{items.length !== 1 ? 's' : ''}</span>
        {activeFilters.length > 0 && (
          <div className="browse-active-chips">
            {activeFilters.map(f => (
              <span key={f.key} className="filter-chip">
                {f.label}
                <button onClick={f.clear}>✕</button>
              </span>
            ))}
            <button className="filter-clear-link" onClick={clearAllFilters}>Clear all</button>
          </div>
        )}
      </div>

      {/* Main Layout: Sidebar + Grid */}
      <div className="browse-layout">
        {/* Desktop sidebar */}
        <div className="browse-sidebar-desktop">
          {renderSidebar()}
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebar && <div className="filter-overlay" onClick={() => setMobileSidebar(false)} />}
        <div className={`browse-sidebar-mobile ${mobileSidebar ? 'open' : ''}`}>
          {renderSidebar()}
        </div>

        {/* Product Grid */}
        <div className="browse-content">
          {items.length === 0 ? (
            <div className="empty"><div className="ei">📭</div><h3>No listings found</h3><p>Try different filters or clear all.</p></div>
          ) : (
            <div className="grid">
              {items.map(item => {
                const itemRevs = cardReviews[item.id] || [];
                return (
                  <div key={item.id} className="card" onClick={() => openDetail(item)}>
                    <div className="card-top">
                      <h4>{item.title}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button className={`card-fav-btn ${favIds.has(item.id) ? 'favorited' : ''}`} title={favIds.has(item.id) ? 'Remove' : 'Favorite'} onClick={(e) => toggleFav(item.id, e)}>
                          {favIds.has(item.id) ? '❤️' : '🤍'}
                        </button>
                        <span className="badge">{item.category}</span>
                      </div>
                    </div>
                    <div className="card-desc">{item.description}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.5rem' }}>
                      <span className="price-tag">${item.price_per_day}/day</span>
                      <span className="stars">{renderStars(item.rating)} ({item.review_count})</span>
                    </div>
                    <div className="card-meta">
                      <span className="tag">📍 {item.city}</span>
                      <span className="tag">👁 {item.views} views</span>
                      {item.subcategory && <span className="tag">{item.subcategory}</span>}
                      {item.owner_name && <span className="tag">👤 {item.owner_name}</span>}
                    </div>
                    {itemRevs.length > 0 && (
                      <div className="card-reviews" onClick={e => e.stopPropagation()}>
                        <div className="card-reviews-title">
                          <span>📝 Recent Reviews</span>
                          <span className="card-reviews-count">{itemRevs.length}</span>
                        </div>
                        {itemRevs.slice(0, 3).map(rev => (
                          <div key={rev.id} className="card-review-item">
                            <div className="card-review-top">
                              <span className="card-review-name">{rev.reviewer_name}</span>
                              <span className="card-review-stars">{renderStars(rev.rating)}</span>
                              {user && rev.reviewer_id === user.id && (
                                <button className="card-review-delete" title="Delete review" onClick={(e) => { e.stopPropagation(); deleteReviewFromCard(rev.id); }}>✕</button>
                              )}
                            </div>
                            <div className="card-review-text">{rev.comment}</div>
                          </div>
                        ))}
                        {itemRevs.length > 3 && <div className="card-reviews-more" onClick={() => openDetail(item)}>+{itemRevs.length - 3} more reviews</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {sel && !bookModal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
          <div className="modal modal-wide">
            <div className="modal-h">
              <h2>{sel.title}</h2>
              <button className="modal-x" onClick={() => setSel(null)}>✕</button>
            </div>
            <div className="modal-b">
              <div className="detail-grid">
                <div className="detail-f"><label>Category</label><div className="val">{sel.category}{sel.subcategory ? ` / ${sel.subcategory}` : ''}</div></div>
                <div className="detail-f"><label>Daily Price</label><div className="val price-tag">${sel.price_per_day}</div></div>
                {sel.price_per_week && <div className="detail-f"><label>Weekly Price</label><div className="val">${sel.price_per_week}</div></div>}
                {sel.price_per_month && <div className="detail-f"><label>Monthly Price</label><div className="val">${sel.price_per_month}</div></div>}
                <div className="detail-f"><label>Location</label><div className="val">{sel.location}, {sel.city}</div></div>
                <div className="detail-f"><label>Condition</label><div className="val">{sel.item_condition}</div></div>
                <div className="detail-f"><label>Rating</label><div className="val"><span className="stars">{renderStars(sel.rating)}</span> ({sel.review_count} reviews)</div></div>
                <div className="detail-f"><label>Views</label><div className="val">{sel.views}</div></div>
                <div className="detail-f"><label>Status</label><div className="val"><span className={`badge ${sel.availability_status === 'available' ? 'badge-green' : 'badge-red'}`}>{sel.availability_status}</span></div></div>
                {sel.owner_name && <div className="detail-f"><label>Owner</label><div className="val">{sel.owner_name}</div></div>}
              </div>
              {sel.description && <div className="detail-f" style={{ marginBottom: '.75rem' }}><label>Description</label><div className="val">{sel.description}</div></div>}
              {sel.features && <div className="detail-f" style={{ marginBottom: '.75rem' }}><label>Features</label><div className="val">{sel.features}</div></div>}
              {sel.rules && <div className="detail-f" style={{ marginBottom: '.75rem' }}><label>Rules</label><div className="val">{sel.rules}</div></div>}

              {/* Subscription Plans */}
              {plans.length > 0 && (
                <div className="reviews-section">
                  <div className="reviews-header">
                    <h3 style={{color:'var(--teal)'}}>Service Plans</h3>
                  </div>
                  <div className="plan-cards">
                    {plans.map((p, i) => (
                      <div key={p.id} className={`plan-card ${i === 1 ? 'plan-featured' : ''}`}>
                        <h4>{p.plan_name}</h4>
                        <div className="plan-price">${p.monthly_price}<span>/mo</span></div>
                        <div className="plan-features">
                          <div className={`plan-feature ${p.includes_maintenance ? 'included' : ''}`}><span className={p.includes_maintenance ? 'check' : 'cross'}>{p.includes_maintenance ? '✓' : '✗'}</span> Maintenance</div>
                          <div className={`plan-feature ${p.includes_repair ? 'included' : ''}`}><span className={p.includes_repair ? 'check' : 'cross'}>{p.includes_repair ? '✓' : '✗'}</span> Repair</div>
                          <div className={`plan-feature ${p.includes_parts ? 'included' : ''}`}><span className={p.includes_parts ? 'check' : 'cross'}>{p.includes_parts ? '✓' : '✗'}</span> Parts Replacement</div>
                          <div className={`plan-feature ${p.includes_inspection ? 'included' : ''}`}><span className={p.includes_inspection ? 'check' : 'cross'}>{p.includes_inspection ? '✓' : '✗'}</span> Inspection</div>
                          <div className={`plan-feature ${p.includes_priority_support ? 'included' : ''}`}><span className={p.includes_priority_support ? 'check' : 'cross'}>{p.includes_priority_support ? '✓' : '✗'}</span> Priority Support</div>
                        </div>
                        <div className="plan-meta">
                          {p.response_time_hours}h response | {p.max_service_requests} requests | {p.contract_duration_months}mo
                        </div>
                        <button className={`btn ${selectedPlan?.id === p.id ? 'btn-g' : 'btn-p'} btn-sm`} style={{width:'100%',marginTop:'.75rem'}} onClick={() => setSelectedPlan(selectedPlan?.id === p.id ? null : p)}>
                          {selectedPlan?.id === p.id ? '✓ Selected' : 'Select Plan'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div className="reviews-section">
                <div className="reviews-header">
                  <h3>📝 Reviews ({reviews.length})</h3>
                  {!showReviewForm && <button className="btn btn-p btn-sm" onClick={() => { setShowReviewForm(true); setEditingReview(null); setReviewRating(5); setReviewComment(''); }}>✏️ Write a Review</button>}
                </div>
                {showReviewForm && (
                  <form className="review-form" onSubmit={submitReview}>
                    <div className="review-form-header">
                      <h4>{editingReview ? 'Edit Your Review' : 'Write Your Review'}</h4>
                      <button type="button" className="modal-x" style={{ width: 24, height: 24, fontSize: '.8rem' }} onClick={() => { setShowReviewForm(false); setEditingReview(null); }}>✕</button>
                    </div>
                    <div className="review-stars-input">
                      <label>Your Rating</label>
                      <div className="star-selector">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button key={star} type="button" className={`star-btn ${star <= (reviewHover || reviewRating) ? 'active' : ''}`} onMouseEnter={() => setReviewHover(star)} onMouseLeave={() => setReviewHover(0)} onClick={() => setReviewRating(star)}>★</button>
                        ))}
                        <span className="star-label">{reviewRating === 1 ? 'Poor' : reviewRating === 2 ? 'Fair' : reviewRating === 3 ? 'Good' : reviewRating === 4 ? 'Very Good' : 'Excellent'}</span>
                      </div>
                    </div>
                    <div className="fg">
                      <label>Your Review</label>
                      <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share your experience..." rows={4} required />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" className="btn btn-g btn-sm" disabled={submittingReview}>{submittingReview ? 'Submitting...' : editingReview ? 'Update Review' : 'Submit Review'}</button>
                      <button type="button" className="btn btn-s btn-sm" onClick={() => { setShowReviewForm(false); setEditingReview(null); }}>Cancel</button>
                    </div>
                  </form>
                )}
                {reviewsLoading ? (
                  <div className="ai-load"><div className="spinner"></div>Loading reviews...</div>
                ) : reviews.length === 0 ? (
                  <div className="reviews-empty"><p>No reviews yet. Be the first!</p></div>
                ) : (
                  <div className="reviews-list">
                    {reviews.map(rev => (
                      <div key={rev.id} className="review-card">
                        <div className="review-card-top">
                          <div className="review-avatar">{rev.reviewer_name?.charAt(0)?.toUpperCase() || '?'}</div>
                          <div className="review-info">
                            <div className="review-name">{rev.reviewer_name}</div>
                            <div className="review-date">{formatDate(rev.created_at)}</div>
                          </div>
                          <div className="review-rating"><span className="stars">{renderStars(rev.rating)}</span></div>
                        </div>
                        <div className="review-comment">{rev.comment}</div>
                        {user && rev.reviewer_id === user.id && (
                          <div className="review-actions">
                            <button className="btn btn-s btn-sm" onClick={() => startEditReview(rev)}>Edit</button>
                            <button className="btn btn-d btn-sm" onClick={() => deleteReview(rev.id)}>Delete</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
            <div className="modal-f">
              <button className="btn btn-g btn-sm" onClick={() => setBookModal(true)}>📅 Book Now</button>
              <button className={`btn ${favIds.has(sel.id) ? 'btn-d' : 'btn-o'} btn-sm`} onClick={(e) => toggleFav(sel.id, e)}>{favIds.has(sel.id) ? '💔 Unfavorite' : '❤ Favorite'}</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-s btn-sm" onClick={() => setSel(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookModal && sel && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setBookModal(false); }}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-h">
              <h2>Book: {sel.title}</h2>
              <button className="modal-x" onClick={() => setBookModal(false)}>✕</button>
            </div>
            <form onSubmit={submitBooking}>
              <div className="modal-b">
                <div className="fg"><label>Start Date</label><input type="date" value={bookData.start_date} onChange={e => setBookData({ ...bookData, start_date: e.target.value })} required /></div>
                <div className="fg"><label>End Date</label><input type="date" value={bookData.end_date} onChange={e => setBookData({ ...bookData, end_date: e.target.value })} required /></div>
                <div className="fg"><label>Message to Owner</label><textarea value={bookData.message} onChange={e => setBookData({ ...bookData, message: e.target.value })} placeholder="Introduce yourself..." /></div>
                <p style={{ color: 'var(--text-2)', fontSize: '.85rem' }}>Rate: <strong style={{ color: 'var(--green)' }}>${sel.price_per_day}/day</strong></p>
                {selectedPlan && <p style={{ color: 'var(--teal)', fontSize: '.85rem', marginTop:'.5rem' }}>+ {selectedPlan.plan_name} Service Plan: <strong>${selectedPlan.monthly_price}/mo</strong></p>}
              </div>
              <div className="modal-f">
                <button type="submit" className="btn btn-g btn-sm" disabled={saving}>{saving ? 'Sending...' : 'Send Booking Request'}</button>
                <button type="button" className="btn btn-s btn-sm" onClick={() => setBookModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
