'use client';

import { useEffect } from 'react';
import {
  FaBars,
  FaDiscord,
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaPlus,
  FaSearch,
  FaSpotify,
  FaTelegramPlane,
  FaTiktok,
  FaTimes,
  FaTwitter,
  FaYoutube,
} from 'react-icons/fa';
import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';
import { ServiceTypeFields } from '@/components/service-type-fields';
import { PriceDisplay } from '@/components/price-display';
import { convertCurrency, formatCurrencyAmount } from '@/lib/currency-utils';
import { useNewOrderForm } from '@/components/new-order/use-new-order-form';

// `keyword` is matched against category names by the shared form logic (?platform=).
const PLATFORMS = [
  { name: 'All', keyword: null, Icon: FaBars },
  { name: 'TikTok', keyword: 'TikTok', Icon: FaTiktok },
  { name: 'Instagram', keyword: 'Instagram', Icon: FaInstagram },
  { name: 'Facebook', keyword: 'Facebook', Icon: FaFacebook },
  { name: 'Telegram', keyword: 'Telegram', Icon: FaTelegramPlane },
  { name: 'YouTube', keyword: 'YouTube', Icon: FaYoutube },
  { name: 'Website', keyword: 'Website', Icon: FaGlobe },
  { name: 'Twitter', keyword: 'Twitter', Icon: FaTwitter },
  { name: 'LinkedIn', keyword: 'LinkedIn', Icon: FaLinkedin },
  { name: 'Spotify', keyword: 'Spotify', Icon: FaSpotify },
  { name: 'Discord', keyword: 'Discord', Icon: FaDiscord },
  { name: 'Others', keyword: 'Others', Icon: FaPlus },
] as const;

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'bigint' ? Number(value) : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function toastText(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && 'message' in message && typeof (message as any).message === 'string') {
    return (message as any).message;
  }
  return 'Something went wrong';
}

export default function CarbonNewOrder() {
  const { appName } = useAppNameWithFallback();
  const form = useNewOrderForm();
  const {
    router,
    platformFromUrl,
    toastMessage,
    setToastMessage,
    isFormLoading,
    onSubmit,
    search,
    setSearch,
    showDropdown,
    setShowDropdown,
    isSearchLoading,
    searchRef,
    servicesData,
    handleSearchSelect,
    categoriesWithServices,
    selectedCategory,
    setSelectedCategory,
    services,
    selectedService,
    setSelectedService,
    resetServiceTypeFields,
    servicesDiscount,
    link,
    setLink,
    qty,
    setQty,
    serviceTypeFields,
    handleServiceTypeFieldChange,
    serviceTypeErrors,
    price,
    totalPrice,
    baseUsdPrice,
    currency,
    availableCurrencies,
    currentCurrencyData,
    currencySettings,
    isSubmitting,
    decodeHTML,
  } = form;

  useEffect(() => {
    setPageTitle('New Order', appName);
  }, [appName]);

  const selected: any =
    form.selected ||
    servicesData?.find((s: any) => String(s.id) === String(selectedService)) ||
    null;
  const min = toNumber(selected?.min_order);
  const max = toNumber(selected?.max_order) || 999999;
  const tooFew = qty > 0 && qty < min;
  const tooMany = qty > max;
  const usernameLink = selected?.orderLink === 'username';
  const activePlatform = platformFromUrl && platformFromUrl !== 'Everything' ? platformFromUrl : null;

  const money = (usd: number) =>
    currentCurrencyData && currencySettings && availableCurrencies
      ? formatCurrencyAmount(
          convertCurrency(usd, 'USD', currency, availableCurrencies),
          currency,
          availableCurrencies,
          currencySettings
        )
      : `$${usd.toFixed(2)}`;

  const charge =
    currentCurrencyData && currencySettings && availableCurrencies
      ? money(baseUsdPrice)
      : `${currentCurrencyData?.symbol || '$'}${totalPrice.toFixed(currency === 'USD' ? 4 : 2)}`;

  const submitLabel = isSubmitting
    ? 'Creating order…'
    : !selectedService
    ? 'Select a service first'
    : !link
    ? usernameLink
      ? 'Enter username'
      : 'Enter link'
    : qty < 1
    ? 'Enter quantity'
    : tooFew
    ? `Minimum ${min} required`
    : tooMany
    ? `Maximum ${max} allowed`
    : 'Submit';

  return (
    <div className="cb-order">
      {toastMessage && (
        <div className={`cb-toast is-${toastMessage.type || 'success'}`} role="status">
          <span>{toastText(toastMessage.message)}</span>
          <button type="button" aria-label="Close" onClick={() => setToastMessage(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      <div className="cb-card">
        <div className="cb-chips">
          {PLATFORMS.map(({ name, keyword, Icon }) => {
            const active = keyword === activePlatform;
            return (
              <button
                key={name}
                type="button"
                className={`cb-chip ${active ? 'is-active' : ''}`}
                onClick={() => router.push(keyword ? `/new-order?platform=${keyword}` : '/new-order')}
              >
                <Icon className="cb-chip-icon" />
                <span>{name}</span>
              </button>
            );
          })}
        </div>

        {isFormLoading ? (
          <div className="cb-skeleton">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="cb-skeleton-row" />
            ))}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="cb-form">
            <div className="cb-search" ref={searchRef}>
              <FaSearch className="cb-search-icon" />
              <input
                type="search"
                className="cb-input cb-search-input"
                placeholder="Search"
                autoComplete="off"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {showDropdown && search.trim().length > 0 && (
                <div className="cb-search-results">
                  {isSearchLoading && <div className="cb-search-note">Searching…</div>}
                  {!isSearchLoading && servicesData.length === 0 && (
                    <div className="cb-search-note">No services found</div>
                  )}
                  {!isSearchLoading &&
                    servicesData.map((service: any) => (
                      <button
                        key={service.id}
                        type="button"
                        className="cb-search-item"
                        onClick={() => handleSearchSelect(service.id, service.categoryId)}
                      >
                        <span className="cb-id">{service.id}</span>
                        <span className="cb-search-name">{service.name}</span>
                        <span className="cb-search-price">
                          <PriceDisplay amount={service.rate || 0} originalCurrency="USD" />
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-category">
                Category
              </label>
              <select
                id="cb-category"
                className="cb-input"
                value={selectedCategory}
                onChange={(event) => {
                  setSelectedCategory(event.target.value);
                  setSelectedService('');
                }}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categoriesWithServices.some((cat: any) => cat.isFavorite) && (
                  <optgroup label="Favorites">
                    {categoriesWithServices
                      .filter((cat: any) => cat.isFavorite)
                      .map((cat: any) => (
                        <option key={`fav-${cat.id}`} value={String(cat.id)}>
                          {cat.category_name}
                        </option>
                      ))}
                  </optgroup>
                )}
                <optgroup label="All categories">
                  {categoriesWithServices
                    .filter((cat: any) => !cat.isFavorite)
                    .map((cat: any) => (
                      <option key={`reg-${cat.id}`} value={String(cat.id)}>
                        {cat.category_name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-service">
                Service
              </label>
              <select
                id="cb-service"
                className="cb-input"
                value={selectedService}
                onChange={(event) => {
                  setSelectedService(event.target.value);
                  resetServiceTypeFields();
                }}
                disabled={!selectedCategory || services.length === 0}
                required
              >
                <option value="" disabled>
                  {services.length === 0 ? 'No services available' : 'Select a service'}
                </option>
                {services.map((service: any) => {
                  const rate = Number(service.rate) || 0;
                  const discounted = servicesDiscount <= 0 ? rate : rate * (1 - servicesDiscount / 100);
                  return (
                    <option key={service.id} value={String(service.id)}>
                      {service.id} - {service.name} - {money(discounted)} per 1000
                    </option>
                  );
                })}
              </select>
            </div>

            {selected && (
              <div className="cb-field">
                <span className="cb-label">Description</span>
                <div
                  className="cb-desc"
                  dangerouslySetInnerHTML={{
                    __html: decodeHTML(selected.description || 'No additional details available.'),
                  }}
                />
              </div>
            )}

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-link">
                {usernameLink ? 'Username' : 'Link'}
              </label>
              <input
                id="cb-link"
                className="cb-input"
                type={usernameLink ? 'text' : 'url'}
                placeholder={usernameLink ? 'Enter username' : 'https://'}
                pattern={usernameLink ? undefined : 'https?://.+'}
                required
                value={link}
                onChange={(event) => setLink(event.target.value)}
              />
            </div>

            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-qty">
                Quantity
              </label>
              <input
                id="cb-qty"
                className="cb-input"
                type="number"
                min={min || 0}
                max={toNumber(selected?.max_order) || undefined}
                value={qty || ''}
                onChange={(event) => setQty(event.target.value ? parseInt(event.target.value, 10) : 0)}
              />
              <small className={`cb-hint ${tooFew || tooMany ? 'is-error' : ''}`}>
                Min: {min} - Max: {toNumber(selected?.max_order)}
              </small>
            </div>

            {selectedService && selected?.type ? (
              <ServiceTypeFields
                serviceType={selected.type as number}
                values={serviceTypeFields}
                onChange={handleServiceTypeFieldChange}
                errors={serviceTypeErrors}
              />
            ) : null}

            {selected?.avg_time ? (
              <div className="cb-field">
                <span className="cb-label">Average time</span>
                <div className="cb-input cb-readonly">{String(selected.avg_time)}</div>
              </div>
            ) : null}

            <div className="cb-field">
              <span className="cb-label">
                Charge <span className="cb-label-note">({money(price)} per 1000)</span>
              </span>
              <div className="cb-input cb-readonly">{charge}</div>
            </div>

            <button
              type="submit"
              className="cb-btn"
              disabled={isSubmitting || !selectedService || !link || qty < 1 || tooFew || tooMany}
            >
              {submitLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
