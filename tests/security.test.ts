import { describe, expect, it } from "vitest";
import { isPublicAddress } from "@/lib/papers/ip";
import { sniffFileType } from "@/lib/papers/file-type";

describe("isPublicAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"])(
    "blocks %s",
    (ip) => expect(isPublicAddress(ip)).toBe(false),
  );
  it.each(["8.8.8.8", "172.32.0.1", "2606:4700:4700::1111"])("allows %s", (ip) => expect(isPublicAddress(ip)).toBe(true));
});

describe("sniffFileType", () => {
  it("detects by magic bytes", () => {
    expect(sniffFileType(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffFileType(new TextEncoder().encode("<html>"))).toBeNull();
  });
});
