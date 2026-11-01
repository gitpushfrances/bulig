import { useLocation } from 'react-router'

// True when this page was reached inside the app. 'default' means it is the first page of the
// visit (a shared link, a fresh tab): there is nothing to go back to.
export function useCanGoBack(): boolean {
  return useLocation().key !== 'default'
}
