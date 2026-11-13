import authConfig from '@/auth.config';
import NextAuth from 'next-auth';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { isInternalHost, isPlatformHost } from './lib/tenant/config';
import { getTenantStore, normalizeHost, tenancy } from './lib/tenant/context';
import { isTenantServing, resolveHost } from './lib/tenant/registry';
import { saasCookieName, verifySaasSession } from './lib/saas/session';
import { getClientIP } from './lib/activity-logger';
import {
    apiAuthPrefixes,
    authRoutes,
    DEFAULT_SIGN_IN_REDIRECT,
    publicRoutes,
} from './lib/routes';
import { getTicketSettings } from './lib/utils/ticket-settings';
import { getModuleSettings } from './lib/utils/module-settings';
import { getMaintenanceMode } from './lib/utils/general-settings';
import { db } from './lib/db';

export const { auth } = NextAuth(authConfig);

const isAdminOrModerator = (role: string | undefined | null): boolean => {
  return role === 'admin' || role === 'moderator';
};

const panelProxy = auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req?.auth?.user;
  const isApiAuthRoute = apiAuthPrefixes.some((prefix) =>
    nextUrl.pathname.startsWith(prefix)
  );
  let isPublicRoute = publicRoutes.some((route) =>
    nextUrl.pathname === route || nextUrl.pathname.startsWith(route + '/')
  );
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  if (nextUrl.pathname === '/transactions' && 
      (nextUrl.searchParams.get('payment') || nextUrl.searchParams.get('invoice_id'))) {
    const hostname = nextUrl.hostname;
    const currentPort = nextUrl.port;
    
    const hostHeader = req.headers.get('host') || '';
    const serverPort = hostHeader.includes(':') ? hostHeader.split(':')[1] : '80';
    
    if (hostname === 'localhost' && serverPort !== '80' && serverPort !== '443') {
      if (currentPort !== serverPort) {
        const fixedUrl = new URL(nextUrl);
        fixedUrl.port = serverPort;
        console.log('Middleware: Fixing redirect URL - redirecting to:', fixedUrl.toString());
        return NextResponse.redirect(fixedUrl);
      }
    }
  }

  const clientIP = getClientIP(req);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-client-ip', clientIP);




  const impersonatedUserId = req.cookies.get('impersonated-user-id')?.value;
  const originalAdminId = req.cookies.get('original-admin-id')?.value;
  const isImpersonating = !!userRole?.isImpersonating;

  const callbackUrl =
    nextUrl.searchParams.get('callbackUrl') || DEFAULT_SIGN_IN_REDIRECT;

  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isPaymentWebhook = nextUrl.pathname.startsWith('/api/payment/webhook');
  const isMaintenancePage = nextUrl.pathname === '/maintenance';
  const isSignInPage = nextUrl.pathname === '/sign-in';
  const isAdminRoute = nextUrl.pathname.startsWith('/admin');
  
  // Blanket guard: nothing under /api/admin may change data without a staff
  // session, whatever the individual route handler forgot to check.
  if (nextUrl.pathname.startsWith('/api/admin/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const staffOpenWrites = [
      '/api/admin/switch-back',
      '/api/admin/services/catId-by-services', // read-only lookup used by the order form
      '/api/admin/delete-image', // checks ownership itself
    ];
    const role = userRole?.role;
    const isStaff = !isImpersonating && (role === 'admin' || role === 'moderator');
    if (!isStaff && !staffOpenWrites.includes(nextUrl.pathname.replace(/\/$/, ''))) {
      return NextResponse.json(
        { success: false, error: isLoggedIn ? 'Forbidden' : 'Unauthorized' },
        { status: isLoggedIn ? 403 : 401 }
      );
    }
  }

  if (isApiRoute || isPaymentWebhook || isApiAuthRoute) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  try {
    const maintenanceMode = await getMaintenanceMode();
    const userRoleType = userRole?.role;
    const isAdmin = userRoleType === 'admin' || userRoleType === 'super_admin';
    const isModerator = userRoleType === 'moderator';
    const isAdminOrMod = isAdmin || isModerator;
    
    if (maintenanceMode === 'active') {
      if (isAdminRoute && !isAdminOrMod) {
        return NextResponse.redirect(new URL('/sign-in', nextUrl));
      }
      
      if (isAdmin) {
        if (isMaintenancePage) {
          return NextResponse.redirect(new URL('/admin', nextUrl));
        }
      } 
      else if (isModerator && isLoggedIn) {
        if (isMaintenancePage) {
          return NextResponse.redirect(new URL('/admin', nextUrl));
        }
        
        const isPublic = publicRoutes.some((route) =>
          nextUrl.pathname === route || nextUrl.pathname.startsWith(route + '/')
        );
        
        if (isPublic) {
        } else if (isAdminRoute) {
          const { hasPermission } = await import('@/lib/permissions');
          const userPermissions = (userRole as any)?.permissions as string[] | null | undefined;
          const normalizedPath = nextUrl.pathname.endsWith('/') && nextUrl.pathname !== '/' 
            ? nextUrl.pathname.slice(0, -1) 
            : nextUrl.pathname;
          
          if (!hasPermission(userRoleType, userPermissions, normalizedPath)) {
            return NextResponse.redirect(new URL('/sign-in', nextUrl));
          }
        } else {
          return NextResponse.redirect(new URL('/maintenance', nextUrl));
        }
      }
      else if (isSignInPage) {
        if (isLoggedIn && isAdminOrMod) {
          return NextResponse.redirect(new URL('/admin', nextUrl));
        }
      }
      else {
        if (!isMaintenancePage) {
          return NextResponse.redirect(new URL('/maintenance', nextUrl));
        }
      }
    } else if (maintenanceMode === 'inactive' && isMaintenancePage) {
      if (isLoggedIn) {
        const redirectPath = isAdminOrMod ? '/admin' : '/dashboard';
        return NextResponse.redirect(new URL(redirectPath, nextUrl));
      } else {
        return NextResponse.redirect(new URL('/', nextUrl));
      }
    }
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
  }

  const ourServicesPage = '/our-services';
  const isOurServicesPage = nextUrl.pathname === ourServicesPage || nextUrl.pathname.startsWith(ourServicesPage + '/');

  if (isOurServicesPage) {
    try {
      const moduleSettings = await getModuleSettings(true);
      const servicesListPublic = moduleSettings?.servicesListPublic ?? true;
      if (!servicesListPublic) {
        isPublicRoute = false;
        if (!isLoggedIn) {
          return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${encodeURIComponent(nextUrl.pathname)}&reason=services-restricted`, nextUrl));
        }
      }
    } catch (error) {
      console.error('Error checking services list public status in proxy:', error);
      isPublicRoute = false;
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${encodeURIComponent(nextUrl.pathname)}&reason=services-restricted`, nextUrl));
      }
    }
  }

  const ticketPages = [
    '/admin/tickets',
    '/support-tickets',
  ];

  const isTicketPage = ticketPages.some(page => 
    nextUrl.pathname === page || nextUrl.pathname.startsWith(page + '/')
  );

  if (isTicketPage) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/sign-in', nextUrl));
    }
    
    try {
      const ticketSettings = await getTicketSettings(true);
      if (!ticketSettings.ticketSystemEnabled) {
        const redirectPath = (isAdminOrModerator(userRole?.role) && !isImpersonating) ? '/admin' : '/dashboard';
        return NextResponse.redirect(new URL(redirectPath, nextUrl));
      }
    } catch (error) {
      console.error('Error checking ticket system status in proxy:', error);
      const redirectPath = (userRole?.role === 'admin' && !isImpersonating) ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(redirectPath, nextUrl));
    }
  }

  if (isAuthRoute) {
    if (isLoggedIn) {

      if (isImpersonating) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl));
      }

      if (userRole?.role === 'admin' || userRole?.role === 'moderator') {
        const roleLabel = userRole?.role === 'admin' ? 'Admin' : 'Moderator';
        console.log(`${roleLabel} user detected, redirecting to admin dashboard`);
        return NextResponse.redirect(new URL('/admin', nextUrl));
      }
      console.log('Regular user detected, redirecting to user dashboard');
      return NextResponse.redirect(new URL(callbackUrl, nextUrl));
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const contactPages = [
    '/admin/contact-messages',
    '/contact-support',
    '/contact'
  ];

  const isContactPage = contactPages.some(page => 
    nextUrl.pathname === page || nextUrl.pathname.startsWith(page + '/')
  );

  if (isContactPage && isLoggedIn) {
    const isAdminContactMessages = nextUrl.pathname.startsWith('/admin/contact-messages');
    const isAdmin = isAdminOrModerator(userRole?.role) && !isImpersonating;
    
    if (isAdminContactMessages && isAdmin) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    try {
      const { contactDB } = await import('@/lib/contact-db');
      const contactSettings = await contactDB.getContactSettings();
      if (!(contactSettings?.contactSystemEnabled ?? false)) {
        return NextResponse.redirect(new URL(isAdmin ? '/admin' : '/dashboard', nextUrl));
      }
    } catch (error) {
      console.error('Error checking contact system status in proxy:', error);
      return NextResponse.redirect(new URL(isAdmin ? '/admin' : '/dashboard', nextUrl));
    }
  }

  const affiliatePages = [
    '/admin/affiliates',
    '/affiliate',
    '/api/ref',
  ];

  const isAffiliatePage = affiliatePages.some(page => 
    nextUrl.pathname === page || nextUrl.pathname.startsWith(page + '/')
  );

  if (isAffiliatePage && isLoggedIn) {
    try {
      const moduleSettings = await getModuleSettings(true);
      if (!moduleSettings.affiliateSystemEnabled) {
        const redirectPath = (isAdminOrModerator(userRole?.role) && !isImpersonating) ? '/admin' : '/dashboard';
        return NextResponse.redirect(new URL(redirectPath, nextUrl));
      }

      const isUserAffiliatePage = nextUrl.pathname === '/affiliate' || nextUrl.pathname.startsWith('/affiliate/');
      if (isUserAffiliatePage) {
        const rawId = (userRole as any)?.id;
        const userId = typeof rawId === 'string' ? parseInt(rawId, 10) : rawId;
        if (userId != null && !isNaN(userId)) {
          try {
            const affiliate = await db.affiliates.findUnique({
              where: { userId },
              select: { status: true },
            });
            if (affiliate?.status === 'suspended') {
              return NextResponse.redirect(new URL('/dashboard', nextUrl));
            }
          } catch (err) {
            console.error('Error checking affiliate status in proxy:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error checking affiliate system status in proxy:', error);
      const redirectPath = (userRole?.role === 'admin' && !isImpersonating) ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(redirectPath, nextUrl));
    }
  }

  const childPanelPages = [
    '/admin/child-panels',
    '/child-panel',
  ];

  const isChildPanelPage = childPanelPages.some(page => 
    nextUrl.pathname === page || nextUrl.pathname.startsWith(page + '/')
  );

  if (isChildPanelPage && isLoggedIn) {
    try {
      const moduleSettings = await getModuleSettings(true);
      if (!moduleSettings.childPanelSellingEnabled) {
        const redirectPath = (isAdminOrModerator(userRole?.role) && !isImpersonating) ? '/admin' : '/dashboard';
        return NextResponse.redirect(new URL(redirectPath, nextUrl));
      }
    } catch (error) {
      console.error('Error checking child panel system status in proxy:', error);
      const redirectPath = (userRole?.role === 'admin' && !isImpersonating) ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(redirectPath, nextUrl));
    }
  }

  const massOrderPages = [
    '/mass-orders',
  ];

  const isMassOrderPage = massOrderPages.some(page => 
    nextUrl.pathname === page || nextUrl.pathname.startsWith(page + '/')
  );

  if (isMassOrderPage && isLoggedIn) {
    try {
      const moduleSettings = await getModuleSettings(true);
      if (!moduleSettings.massOrderEnabled) {
        const redirectPath = (isAdminOrModerator(userRole?.role) && !isImpersonating) ? '/admin' : '/dashboard';
        return NextResponse.redirect(new URL(redirectPath, nextUrl));
      }
    } catch (error) {
      console.error('Error checking mass order system status in proxy:', error);
      const redirectPath = (userRole?.role === 'admin' && !isImpersonating) ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(redirectPath, nextUrl));
    }
  }

  const serviceUpdatePages = [
    '/services/updates',
  ];

  const isServiceUpdatePage = serviceUpdatePages.some(page => 
    nextUrl.pathname === page || nextUrl.pathname.startsWith(page + '/')
  );

  if (isServiceUpdatePage && isLoggedIn) {
    try {
      const moduleSettings = await getModuleSettings(true);
      if (!moduleSettings.serviceUpdateLogsEnabled) {
        const redirectPath = (isAdminOrModerator(userRole?.role) && !isImpersonating) ? '/admin' : '/dashboard';
        return NextResponse.redirect(new URL(redirectPath, nextUrl));
      }
    } catch (error) {
      console.error('Error checking service update logs status in proxy:', error);
      const redirectPath = (userRole?.role === 'admin' && !isImpersonating) ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(redirectPath, nextUrl));
    }
  }

  if (nextUrl.pathname.startsWith('/admin')) {
    const originalAdminRole = (userRole as any)?.originalAdminRole;
    const hasAdminAccess = !isImpersonating 
      ? (userRole?.role === 'admin' || userRole?.role === 'moderator')
      : (originalAdminRole === 'admin' || originalAdminRole === 'moderator');

    if (!hasAdminAccess) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
  }

  const userPages = [
    '/dashboard',
    '/my-orders',
    '/new-order',
    '/transactions',
    '/add-funds',
    '/transfer-funds',
    '/services',
    '/support-tickets',
    '/affiliate',
    '/child-panel',
    '/api',
    '/mass-orders',
    '/contact-support',
  ];

  const isUserPage = userPages.some(page => 
    nextUrl.pathname === page || nextUrl.pathname.startsWith(page + '/')
  );

  if (isUserPage && isLoggedIn && !isImpersonating) {
    if (userRole?.role === 'admin' || userRole?.role === 'moderator') {
      return NextResponse.redirect(new URL('/admin', nextUrl));
    }
  }

  if (!isLoggedIn && !isPublicRoute) {
    let redirectUrl = `/sign-in`;
    if (nextUrl.pathname !== '/') {
      redirectUrl += `?callbackUrl=${encodeURIComponent(nextUrl.pathname)}`;
    }
    return NextResponse.redirect(new URL(redirectUrl, nextUrl));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

const SAAS_PAGE_PREFIX = '/saas';
const SAAS_API_PREFIX = '/api/saas';

function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

function notFound(isApi: boolean): NextResponse {
  return isApi
    ? NextResponse.json({ error: 'Not found' }, { status: 404 })
    : new NextResponse('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

/** topupcraft.com itself: marketing site, customer portal, super admin. */
async function platformProxy(req: NextRequest, internalOrigin: string): Promise<NextResponse> {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  if (isUnder(pathname, '/api')) {
    // Only the SaaS API exists on the platform host; panel APIs do not.
    return isUnder(pathname, SAAS_API_PREFIX) && !isUnder(pathname, `${SAAS_API_PREFIX}/internal`)
      ? NextResponse.next()
      : notFound(true);
  }

  if (isUnder(pathname, SAAS_PAGE_PREFIX)) {
    const clean = new URL(pathname.slice(SAAS_PAGE_PREFIX.length) || '/', nextUrl);
    clean.search = nextUrl.search;
    return NextResponse.redirect(clean, 308);
  }

  const needsLogin = isUnder(pathname, '/portal') || isUnder(pathname, '/admin');
  const isAuthPage = pathname === '/login' || pathname === '/register';
  if (needsLogin || isAuthPage) {
    const session = await verifySaasSession(req.cookies.get(saasCookieName())?.value);
    if (needsLogin && !session) {
      const login = new URL('/login', nextUrl);
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }
    if (isUnder(pathname, '/admin') && session?.role !== 'admin') {
      return NextResponse.redirect(new URL('/portal', nextUrl));
    }
    if (isAuthPage && session) {
      return NextResponse.redirect(new URL(session.role === 'admin' ? '/admin' : '/portal', nextUrl));
    }
  }

  const target = new URL(`${SAAS_PAGE_PREFIX}${pathname === '/' ? '' : pathname}`, internalOrigin);
  target.search = nextUrl.search;
  return NextResponse.rewrite(target);
}

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  const rawHost = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim().toLowerCase();
  const host = normalizeHost(rawHost);
  const proto = (req.headers.get('x-forwarded-proto') || 'http').split(',')[0].trim() === 'https' ? 'https' : 'http';
  // Behind the reverse proxy Next.js reports its own bind address as the URL
  // host. Every redirect/rewrite below must use the host the visitor used.
  const internalOrigin = req.nextUrl.origin; // rewrites must stay on this origin to be served in-process
  if (rawHost) {
    req.nextUrl.protocol = proto;
    req.nextUrl.host = rawHost;
  }
  const pathname = req.nextUrl.pathname;
  const isApi = isUnder(pathname, '/api');

  // Domain verification probe: answered on whatever host the request came in on.
  if (pathname === '/.well-known/tc-domain-check') {
    const target = new URL(`${SAAS_API_PREFIX}/probe`, internalOrigin);
    target.search = req.nextUrl.search;
    return NextResponse.rewrite(target);
  }

  // Loopback: only Caddy's on-demand-TLS check and the cron runner live here.
  if (isInternalHost(host) && !isPlatformHost(host)) {
    const direct = req.headers.get('x-tc-direct') === '1'; // set by server.js, cannot be forged
    return direct && isUnder(pathname, `${SAAS_API_PREFIX}/internal`) ? NextResponse.next() : notFound(isApi);
  }

  if (isPlatformHost(host)) return platformProxy(req, internalOrigin);

  // Everything else is a customer panel, identified by its domain.
  if (isUnder(pathname, SAAS_PAGE_PREFIX) || isUnder(pathname, SAAS_API_PREFIX)) return notFound(isApi);

  let tenant;
  try {
    tenant = await resolveHost(host);
  } catch (error) {
    console.error('Panel lookup failed:', error);
    return isApi
      ? NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
      : new NextResponse('Service temporarily unavailable', { status: 503 });
  }

  if (!tenant || !isTenantServing(tenant)) {
    if (isApi) {
      return NextResponse.json(
        { error: tenant ? 'This panel is currently unavailable' : 'No panel is configured for this domain' },
        { status: tenant ? 503 : 404 }
      );
    }
    const target = new URL(`${SAAS_PAGE_PREFIX}/panel-status`, internalOrigin);
    target.search = `?state=${tenant ? encodeURIComponent(tenant.status) : 'unknown'}`;
    return NextResponse.rewrite(target, { status: tenant ? 503 : 404 });
  }

  const run = () => (panelProxy as any)(req, event);
  const store = getTenantStore();
  if (store && store.host === host) {
    store.tenantId = tenant.id;
    return run();
  }
  return tenancy.als.run({ host, proto, origin: `${proto}://${rawHost}`, tenantId: tenant.id }, run);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',

    '/(api|trpc)(.*)',
  ],
};
