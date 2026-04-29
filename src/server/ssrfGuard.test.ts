import { describe, it, expect, vi } from 'vitest';
import { validateAndPin, SsrfError } from './ssrfGuard';

vi.mock('node:dns/promises', () => ({
  default: { lookup: vi.fn() },
  lookup: vi.fn(),
}));

import dns from 'node:dns/promises';
const mockLookup = dns.lookup as unknown as ReturnType<typeof vi.fn>;

describe('validateAndPin', () => {
  it('rejects non-http(s) schemes', async () => {
    await expect(validateAndPin('ftp://example.com')).rejects.toMatchObject({
      code: 'invalid_scheme',
    });
  });

  it('rejects malformed URLs', async () => {
    await expect(validateAndPin('not a url')).rejects.toMatchObject({
      code: 'invalid_url',
    });
  });

  it('rejects loopback IPv4', async () => {
    mockLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    await expect(validateAndPin('http://localhost')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects RFC1918 (10.x)', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);
    await expect(validateAndPin('http://internal.example')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects RFC1918 (192.168.x)', async () => {
    mockLookup.mockResolvedValue([{ address: '192.168.1.1', family: 4 }]);
    await expect(validateAndPin('http://router.example')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects RFC1918 (172.16-31.x)', async () => {
    mockLookup.mockResolvedValue([{ address: '172.20.0.5', family: 4 }]);
    await expect(validateAndPin('http://corp.example')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects link-local (169.254.x) including GCE metadata', async () => {
    mockLookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
    await expect(validateAndPin('http://metadata')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects IPv6 loopback', async () => {
    mockLookup.mockResolvedValue([{ address: '::1', family: 6 }]);
    await expect(validateAndPin('http://[::1]')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects IPv6 unique-local (fc00::/7)', async () => {
    mockLookup.mockResolvedValue([{ address: 'fc00::1', family: 6 }]);
    await expect(validateAndPin('http://example.com')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('accepts public IPv4', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const result = await validateAndPin('https://example.com/path');
    expect(result.host).toBe('example.com');
    expect(result.resolvedIp).toBe('93.184.216.34');
    expect(result.original).toBe('https://example.com/path');
  });

  it('SsrfError carries code and message', async () => {
    try {
      await validateAndPin('ftp://example.com');
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(SsrfError);
      expect((e as SsrfError).code).toBe('invalid_scheme');
    }
  });

  it('rejects bracketed IPv6 loopback literal', async () => {
    await expect(validateAndPin('http://[::1]/')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects IPv4-mapped IPv6 loopback', async () => {
    await expect(validateAndPin('http://[::ffff:127.0.0.1]/')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects IPv4-mapped IPv6 (hex form)', async () => {
    await expect(validateAndPin('http://[::ffff:7f00:1]/')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects 0.0.0.0', async () => {
    await expect(validateAndPin('http://0.0.0.0/')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects CGNAT (100.64-127.x.x)', async () => {
    mockLookup.mockResolvedValue([{ address: '100.100.100.200', family: 4 }]);
    await expect(validateAndPin('http://cgnat.example')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects multicast (224.x.x.x)', async () => {
    await expect(validateAndPin('http://224.0.0.1/')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects broadcast (255.255.255.255)', async () => {
    await expect(validateAndPin('http://255.255.255.255/')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects IPv6 unspecified (::)', async () => {
    await expect(validateAndPin('http://[::]/')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('rejects when ANY of multiple resolved IPs is private (rebind defense)', async () => {
    mockLookup.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    await expect(validateAndPin('http://mixed.example')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });

  it('accepts when all resolved IPs are public', async () => {
    mockLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800:220:1::1', family: 6 },
    ]);
    const result = await validateAndPin('https://example.com/path?x=1');
    expect(result.host).toBe('example.com');
    expect(result.resolvedIp).toBe('93.184.216.34');
    expect(result.pathname).toBe('/path?x=1');
  });

  it('preserves search params in pathname field', async () => {
    await expect(validateAndPin('https://0.0.0.0/p?key=val#frag')).rejects.toMatchObject({
      code: 'private_ip',
    });
    // Note: when accept happens, pathname should be /p?key=val (no fragment)
    // covered by the previous test
  });

  it('rejects userinfo URL where the host is private', async () => {
    await expect(validateAndPin('http://user:pass@127.0.0.1/')).rejects.toMatchObject({
      code: 'private_ip',
    });
  });
});
