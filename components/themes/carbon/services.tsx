'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaBars,
  FaChevronDown,
  FaFilter,
  FaDiscord,
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaPlus,
  FaRegStar,
  FaSearch,
  FaSpotify,
  FaStar,
  FaTelegramPlane,
  FaTiktok,
  FaTimes,
  FaTwitter,
  FaYoutube,
} from 'react-icons/fa';
import ServiceDetailsModal from '@/components/dashboard/services/modals/service-details';
import { PriceDisplay } from '@/components/price-display';
import { formatNumber } from '@/lib/utils';
import { useServicesList } from '@/components/services/use-services-list';

const PLATFORMS = [
  { name: 'All', keyword: null, Icon: FaBars },
  { name: 'TikTok', keyword: 'TikTok', Icon: FaTiktok },
  { name: 'Instagram', keyword: 'Instagram', Icon: FaInstagram },
  { name: 'Facebook', keyword: 'Facebook', Icon: FaFacebook },
  { name: 'Telegram', keyword: 'Telegram', Icon: FaTelegramPlane },
  { name: 'YouTube', keyword: 'YouTube', Icon: FaYoutube },
  { name: 'Traffic', keyword: 'Website', Icon: FaGlobe },
  { name: 'Twitter', keyword: 'Twitter', Icon: FaTwitter },
  { name: 'LinkedIn', keyword: 'LinkedIn', Icon: FaLinkedin },
  { name: 'Spotify', keyword: 'Spotify', Icon: FaSpotify },
  { name: 'Discord', keyword: 'Discord', Icon: FaDiscord },
  { name: 'Other', keyword: 'Other', Icon: FaPlus },
] as const;

const KNOWN = PLATFORMS.map((p) => p.keyword).filter((k): k is NonNullable<typeof k> => !!k && k !== 'Other');
const PAGE_SIZES = ['10', '25', '50', '100', '200', '500'];

function toastText(message: unknown): string {
  return typeof message === 'string' ? message : 'Something went wrong';
}

export default function CarbonServices() {
  const {
    groupedServices,
    loading,
    isSearchLoading,
    search,
    setSearch,
    limit,
    handleLimitChange,
    totalServices,
    page,
    totalPages,
    handlePrevious,
    handleNext,
    toggleFavorite,
    handleViewDetails,
    isOpen,
    setIsOpen,
    selected,
    toastMessage,
    setToastMessage,
  } = useServicesList();

  const [platform, setPlatform] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const close = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [filterOpen]);

  const cleanName = (name: string) => name.replace(/\s*\(ID:\s*\d+\)\s*$/, '');

  // Categories with services, matched to a platform by name the same way New order does it.
  const nonEmpty = useMemo(
    () => Object.entries(groupedServices).filter(([, services]) => services.length > 0),
    [groupedServices]
  );

  const groups = useMemo(() => {
    return nonEmpty.filter(([name]) => {
      if (category && name !== category) return false;
      if (!platform) return true;
      const lower = name.toLowerCase();
      if (platform === 'Other') return !KNOWN.some((keyword) => lower.includes(keyword.toLowerCase()));
      return lower.includes(platform.toLowerCase());
    });
  }, [nonEmpty, platform, category]);

  const busy = loading || isSearchLoading;

  return (
    <div className="cb-page">
      {toastMessage && (
        <div className={`cb-toast is-${toastMessage.type || 'success'}`} role="status">
          <span>{toastText(toastMessage.message)}</span>
          <button type="button" aria-label="Close" onClick={() => setToastMessage(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      <div className="cb-card">
        <div className="cb-chips cb-chips-wide">
          {PLATFORMS.map(({ name, keyword, Icon }) => (
            <button
              key={name}
              type="button"
              className={`cb-chip ${keyword === platform ? 'is-active' : ''}`}
              onClick={() => {
                setPlatform(keyword);
                setCategory(null);
              }}
            >
              <Icon className="cb-chip-icon" />
              <span>{name}</span>
            </button>
          ))}
        </div>

        <div className="cb-filter-row">
          <div className="cb-filter" ref={filterRef}>
            <button
              type="button"
              className={`cb-btn cb-filter-btn ${category ? 'is-set' : ''}`}
              aria-haspopup="listbox"
              aria-expanded={filterOpen}
              aria-label="Filter by category"
              onClick={() => setFilterOpen((open) => !open)}
            >
              <FaFilter />
              <FaChevronDown className="cb-filter-caret" />
            </button>
            {filterOpen && (
              <div className="cb-menu" role="listbox">
                <button
                  type="button"
                  role="option"
                  aria-selected={!category}
                  className={`cb-menu-item ${!category ? 'is-active' : ''}`}
                  onClick={() => {
                    setCategory(null);
                    setFilterOpen(false);
                  }}
                >
                  All categories
                </button>
                {nonEmpty.map(([name]) => (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={category === name}
                    className={`cb-menu-item ${category === name ? 'is-active' : ''}`}
                    onClick={() => {
                      setCategory(name);
                      setPlatform(null);
                      setFilterOpen(false);
                    }}
                  >
                    {cleanName(name)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="cb-searchbar">
            <input
              type="search"
              className="cb-input"
              placeholder="Search"
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span className={`cb-searchbar-btn ${isSearchLoading ? 'is-busy' : ''}`} aria-hidden="true">
              <FaSearch />
            </span>
          </div>
        </div>
      </div>

      <div className="cb-table-wrap">
        <table className="cb-table">
          <thead>
            <tr>
              <th className="cb-col-fav" aria-label="Favourite" />
              <th>ID</th>
              <th>Service</th>
              <th>Rate per 1000</th>
              <th>Min order</th>
              <th>Max order</th>
              <th>Average time</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {busy && groups.length === 0 ? (
              [0, 1, 2, 3, 4, 5].map((row) => (
                <tr key={row}>
                  <td colSpan={8}>
                    <div className="cb-skeleton-row cb-skeleton-line" />
                  </td>
                </tr>
              ))
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={8} className="cb-empty">
                  {search.trim()
                    ? `No services match "${search.trim()}".`
                    : platform
                    ? `No ${platform === 'Other' ? 'other' : platform} services found.`
                    : 'No services found.'}
                </td>
              </tr>
            ) : (
              groups.map(([categoryName, services]) => [
                <tr key={`cat-${categoryName}`} className="cb-cat-row">
                  <td colSpan={8}>{cleanName(categoryName)}</td>
                </tr>,
                ...services.map((service: any) => (
                  <tr key={service.id}>
                    <td className="cb-col-fav">
                      <button
                        type="button"
                        className={`cb-star ${service.isFavorite ? 'is-on' : ''}`}
                        aria-label={service.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
                        onClick={() => toggleFavorite(service.id)}
                      >
                        {service.isFavorite ? <FaStar /> : <FaRegStar />}
                      </button>
                    </td>
                    <td>{service.id}</td>
                    <td className="cb-col-service">{service.name}</td>
                    <td>
                      <PriceDisplay amount={service.rate} originalCurrency="USD" />
                    </td>
                    <td>{formatNumber(service.min_order || 0)}</td>
                    <td>{formatNumber(service.max_order || 0)}</td>
                    <td>{service.avg_time || 'N/A'}</td>
                    <td>
                      <button type="button" className="cb-btn cb-btn-view" onClick={() => handleViewDetails(service)}>
                        View
                      </button>
                    </td>
                  </tr>
                )),
              ])
            )}
          </tbody>
        </table>
      </div>

      {totalServices > 0 && (
        <div className="cb-pager">
          <select
            className="cb-input cb-pager-select"
            aria-label="Services per page"
            value={limit}
            onChange={(event) => handleLimitChange(event.target.value)}
          >
            {PAGE_SIZES.filter((size) => size === '10' || totalServices >= Number(size)).map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
            <option value="all">Show all</option>
          </select>
          {totalPages > 1 && (
            <>
              <button type="button" className="cb-btn cb-btn-ghost cb-btn-small" disabled={page <= 1 || loading} onClick={handlePrevious}>
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="cb-btn cb-btn-ghost cb-btn-small"
                disabled={page >= totalPages || loading}
                onClick={handleNext}
              >
                Next
              </button>
            </>
          )}
        </div>
      )}

      {isOpen && selected && <ServiceDetailsModal isOpen={isOpen} setIsOpen={setIsOpen} service={selected} />}
    </div>
  );
}
