/**
 * i18n/index.ts — react-i18next initialization.
 *
 * Wired into ~/root.tsx via `import './i18n'`. After that, every component
 * can `useTranslation('namespace')` and reference keys.
 *
 * v54 evidence: signup page rendered raw `auth.signup.title` keys because
 * the LLM imported useTranslation but never initialized i18next. This file
 * removes that gap by being the single canonical init point.
 *
 * Add new namespaces by:
 *   1. Creating locales/<lang>/<namespace>.json with the key-value pairs
 *   2. Adding the import + resource entry below
 *
 * Default locale + supported list mirror the FSP PRD (ko default, en fallback).
 * Override via VITE_DEFAULT_LOCALE in .env.
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// i18n-scaffold-imports-start
import actionsEn from './locales/en/actions.json';
import appEn from './locales/en/app.json';
import authEn from './locales/en/auth.json';
import brandEn from './locales/en/brand.json';
import cartEn from './locales/en/cart.json';
import checkoutEn from './locales/en/checkout.json';
import commonEn from './locales/en/common.json';
import courseDetailEn from './locales/en/courseDetail.json';
import coursesEn from './locales/en/courses.json';
import emptyEn from './locales/en/empty.json';
import errorsEn from './locales/en/errors.json';
import homeEn from './locales/en/home.json';
import instructorDetailEn from './locales/en/instructorDetail.json';
import instructorsEn from './locales/en/instructors.json';
import learningEn from './locales/en/learning.json';
import navEn from './locales/en/nav.json';
import notFoundEn from './locales/en/notFound.json';
import orderDetailEn from './locales/en/orderDetail.json';
import ordersEn from './locales/en/orders.json';
import paginationEn from './locales/en/pagination.json';
import playerEn from './locales/en/player.json';
import profileEn from './locales/en/profile.json';
import workflowEn from './locales/en/workflow.json';
import actionsKo from './locales/ko/actions.json';
import appKo from './locales/ko/app.json';
import authKo from './locales/ko/auth.json';
import brandKo from './locales/ko/brand.json';
import cartKo from './locales/ko/cart.json';
import checkoutKo from './locales/ko/checkout.json';
import commonKo from './locales/ko/common.json';
import courseDetailKo from './locales/ko/courseDetail.json';
import coursesKo from './locales/ko/courses.json';
import emptyKo from './locales/ko/empty.json';
import errorsKo from './locales/ko/errors.json';
import homeKo from './locales/ko/home.json';
import instructorDetailKo from './locales/ko/instructorDetail.json';
import instructorsKo from './locales/ko/instructors.json';
import learningKo from './locales/ko/learning.json';
import navKo from './locales/ko/nav.json';
import notFoundKo from './locales/ko/notFound.json';
import orderDetailKo from './locales/ko/orderDetail.json';
import ordersKo from './locales/ko/orders.json';
import paginationKo from './locales/ko/pagination.json';
import playerKo from './locales/ko/player.json';
import profileKo from './locales/ko/profile.json';
import workflowKo from './locales/ko/workflow.json';
// i18n-scaffold-imports-end

const defaultLocale = import.meta.env.VITE_DEFAULT_LOCALE || 'ko';

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // i18n-scaffold-resources-start
    resources: {
      en: { actions: actionsEn, app: appEn, auth: authEn, brand: brandEn, cart: cartEn, checkout: checkoutEn, common: commonEn, courseDetail: courseDetailEn, courses: coursesEn, empty: emptyEn, errors: errorsEn, home: homeEn, instructorDetail: instructorDetailEn, instructors: instructorsEn, learning: learningEn, nav: navEn, notFound: notFoundEn, orderDetail: orderDetailEn, orders: ordersEn, pagination: paginationEn, player: playerEn, profile: profileEn, workflow: workflowEn },
      ko: { actions: actionsKo, app: appKo, auth: authKo, brand: brandKo, cart: cartKo, checkout: checkoutKo, common: commonKo, courseDetail: courseDetailKo, courses: coursesKo, empty: emptyKo, errors: errorsKo, home: homeKo, instructorDetail: instructorDetailKo, instructors: instructorsKo, learning: learningKo, nav: navKo, notFound: notFoundKo, orderDetail: orderDetailKo, orders: ordersKo, pagination: paginationKo, player: playerKo, profile: profileKo, workflow: workflowKo },
    },
    // i18n-scaffold-resources-end
    // Active language reads a stored preference first (set by the language toggle,
    // or by the story suite as i18nextLng=en), falling back to defaultLocale. SSR +
    // a no-preference user get defaultLocale (no hydration mismatch); only an explicit
    // override differs. Without this, `lng: defaultLocale` overrides LanguageDetector
    // so the app is locked to one locale — English story specs can't then match a
    // Korean-default page (RULE-T6).
    lng: (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('i18nextLng')) || defaultLocale,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'errors'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });

export default i18next;
