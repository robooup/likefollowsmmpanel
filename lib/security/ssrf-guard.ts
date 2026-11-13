import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

// Panel admins are customers. They choose provider API URLs, payment gateway
// URLs and image URLs that this server then requests. Without this guard a
// customer could point those at 127.0.0.1 / the private network and reach the
// database, Caddy's admin API or cloud metadata from inside. The guard refuses
// every outbound HTTP(S) connection whose destination is not a public address,
// at connection time (so DNS tricks and redirects are covered too).

const blocked = new net.BlockList();
for (const [subnet, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as [string, number][]) {
  blocked.addSubnet(subnet, prefix, 'ipv4');
}
for (const [subnet, prefix] of [
  ['::', 127], // :: and ::1
  ['64:ff9b::', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as [string, number][]) {
  blocked.addSubnet(subnet, prefix, 'ipv6');
}

export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return blocked.check(address, 'ipv4');
  if (family === 6) {
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return blocked.check(mapped[1], 'ipv4');
    return blocked.check(address, 'ipv6');
  }
  return true; // not an IP at all
}

function refusal(host: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`Outbound request to non-public address refused (${host})`);
  error.code = 'ESSRFBLOCKED';
  return error;
}

function guardedLookup(hostname: string, options: any, callback?: any): void {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const wantAll = !!options?.all;
  dns.lookup(hostname, { ...options, all: true }, (error, addresses: any) => {
    if (error) return callback(error);
    const list = addresses as { address: string; family: number }[];
    if (!list.length || list.some((entry) => isBlockedAddress(entry.address))) {
      return callback(refusal(hostname));
    }
    if (wantAll) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

let installed = false;

export async function installSsrfGuard(): Promise<void> {
  if (installed) return;
  installed = true;

  // 1) http/https modules (axios, nodemailer webhooks, etc.)
  for (const agent of [http.globalAgent, https.globalAgent] as any[]) {
    const original = agent.createConnection.bind(agent);
    agent.createConnection = (options: any, callback: any) => {
      const host = stripBrackets(String(options.host || options.hostname || ''));
      if (net.isIP(host) && isBlockedAddress(host)) throw refusal(host);
      return original({ ...options, lookup: guardedLookup }, callback);
    };
  }

  // 2) fetch() (undici)
  const { Agent, buildConnector, setGlobalDispatcher } = await import('undici');
  const connector = buildConnector({ lookup: guardedLookup as any });
  setGlobalDispatcher(
    new Agent({
      connect: ((options: any, callback: any) => {
        const host = stripBrackets(String(options.hostname || ''));
        if (net.isIP(host) && isBlockedAddress(host)) return callback(refusal(host), null);
        return connector(options, callback);
      }) as any,
    })
  );
}
