// components/admin/AdminReviewFilters.tsx
'use client';

import { useState } from 'react';

interface FilterState {
  productId: string;
  customerName: string;
  ratingFilter: string;
  statusFilter: string;
  visibilityFilter: string;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
}

export function AdminReviewFilters({
  filters,
  setFilters,
}: {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleReset = () => {
    setFilters({
      productId: '',
      customerName: '',
      ratingFilter: 'all',
      statusFilter: 'all',
      visibilityFilter: 'all',
      dateFrom: '',
      dateTo: '',
      searchQuery: ''
    });
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6 p-6">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="mt-6 space-y-4">
          {/* Search Query */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search (Title, Content, Customer)
            </label>
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              placeholder="Search reviews..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Product Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
              <input
                type="text"
                value={filters.productId}
                onChange={(e) => handleFilterChange('productId', e.target.value)}
                placeholder="Product ID or name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            {/* Customer Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <input
                type="text"
                value={filters.customerName}
                onChange={(e) => handleFilterChange('customerName', e.target.value)}
                placeholder="Name or email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <select
                value={filters.ratingFilter}
                onChange={(e) => handleFilterChange('ratingFilter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.statusFilter}
                onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Visibility Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
              <select
                value={filters.visibilityFilter}
                onChange={(e) => handleFilterChange('visibilityFilter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Visibility</option>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleReset}
            className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
