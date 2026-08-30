/**
 * useAppDispatch.ts — shorthand re-export of the typed dispatch hook.
 *
 * The canonical implementation lives in ~/redux/store/hooks.ts. This file
 * exists because LLM-generated code consistently expects `import { useAppDispatch }
 * from '~/hooks/useAppDispatch'` (matches Redux Toolkit's documented pattern).
 * v58 evidence: TS2307 "Cannot find module '~/hooks/useAppDispatch'" across
 * multiple LLM-written pages.
 */
export { useAppDispatch } from '~/redux/store/hooks';
