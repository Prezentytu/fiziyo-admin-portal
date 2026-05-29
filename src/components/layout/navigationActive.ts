export function matchesNavigationHref(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavigationHrefActive(pathname: string, href: string, allHrefs: string[]): boolean {
  if (!matchesNavigationHref(pathname, href)) {
    return false;
  }

  let longestMatch = '';
  for (const currentHref of allHrefs) {
    if (!matchesNavigationHref(pathname, currentHref)) {
      continue;
    }

    if (currentHref.length > longestMatch.length) {
      longestMatch = currentHref;
    }
  }

  return href === longestMatch;
}
