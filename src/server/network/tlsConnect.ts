import tls from 'node:tls';
import { X509Certificate } from 'node:crypto';

export interface ParsedCert {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  sanList: string[];
}

export function parseCertPem(pem: string): ParsedCert {
  const cert = new X509Certificate(pem);
  return {
    subject: cert.subject,
    issuer: cert.issuer,
    validFrom: new Date(cert.validFrom).toISOString(),
    validTo: new Date(cert.validTo).toISOString(),
    sanList: extractSan(cert.subjectAltName),
  };
}

function extractSan(raw: string | undefined): string[] {
  if (!raw) return [];
  // X509Certificate.subjectAltName format: "DNS:foo.com, DNS:bar.com, IP:1.2.3.4"
  return raw.split(',').map((entry) => {
    const trimmed = entry.trim();
    const colon = trimmed.indexOf(':');
    return colon === -1 ? trimmed : trimmed.slice(colon + 1);
  });
}

export interface TlsConnectOpts {
  timeoutMs: number;
}

export async function tlsConnect(host: string, port: number, opts: TlsConnectOpts): Promise<ParsedCert> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false, // we're inspecting, not validating
    });
    const timer = setTimeout(() => {
      socket.destroy(new Error('tls_timeout'));
    }, opts.timeoutMs);

    socket.once('secureConnect', () => {
      clearTimeout(timer);
      const peer = socket.getPeerX509Certificate();
      socket.end();
      if (!peer) {
        reject(new Error('no_peer_cert'));
        return;
      }
      resolve({
        subject: peer.subject,
        issuer: peer.issuer,
        validFrom: new Date(peer.validFrom).toISOString(),
        validTo: new Date(peer.validTo).toISOString(),
        sanList: extractSan(peer.subjectAltName),
      });
    });

    socket.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
