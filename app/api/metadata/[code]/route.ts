import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createPublicClient, http, recoverTypedDataAddress } from "viem";
import { mainnet } from "viem/chains";

// ── Types ────────────────────────────────────────────────────────────────────

type CodeMetadata = {
  code: string;
  displayName: string;
  website: string;
  logoUrl: string;
  description: string;
  updatedAt: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const DATA_DIR = join(process.cwd(), "data", "metadata");

const TAG_REGISTRY_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const TAG_REGISTRY_ABI = [
  {
    type: "function",
    name: "ownerOfCode",
    inputs: [{ name: "code", type: "string", internalType: "string" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
] as const;

const EIP712_DOMAIN = {
  name: "BuilderTag",
  version: "1",
  chainId: 1,
  verifyingContract: TAG_REGISTRY_ADDRESS,
} as const;

const EIP712_TYPES = {
  UpdateMetadata: [
    { name: "code", type: "string" },
    { name: "displayName", type: "string" },
    { name: "website", type: "string" },
    { name: "logoUrl", type: "string" },
    { name: "description", type: "string" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

const MAX_DISPLAY_NAME = 64;
const MAX_WEBSITE = 256;
const MAX_LOGO_URL = 512;
const MAX_DESCRIPTION = 500;

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getMetadataPath(code: string): string {
  // Sanitize: only allow lowercase alphanumeric + underscore
  const safe = code.replace(/[^a-z0-9_]/g, "");
  return join(DATA_DIR, `${safe}.json`);
}

function readMetadata(code: string): CodeMetadata | null {
  const path = getMetadataPath(code);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as CodeMetadata;
  } catch {
    return null;
  }
}

function writeMetadata(code: string, metadata: CodeMetadata): void {
  ensureDataDir();
  const path = getMetadataPath(code);
  writeFileSync(path, JSON.stringify(metadata, null, 2), "utf-8");
}

function isValidUrl(str: string): boolean {
  if (!str) return true; // empty is ok
  try {
    const url = new URL(str);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function sanitizeString(str: string): string {
  // Strip HTML tags and control characters
  return str.replace(/<[^>]*>/g, "").replace(/[\x00-\x1F\x7F]/g, "");
}

function isValidCode(code: string): boolean {
  return /^[a-z0-9_]{1,32}$/.test(code);
}

// ── GET /api/metadata/[code] ─────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
  }

  const metadata = readMetadata(code);
  if (!metadata) {
    return NextResponse.json(
      {
        code,
        displayName: "",
        website: "",
        logoUrl: "",
        description: "",
      },
      { status: 200 },
    );
  }

  return NextResponse.json(metadata, { status: 200 });
}

// ── PUT /api/metadata/[code] ─────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { displayName, website, logoUrl, description, signature, nonce } = body as Record<string, string>;

  // Validate required fields
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Validate field lengths
  const cleanDisplayName = sanitizeString(String(displayName || ""));
  const cleanWebsite = sanitizeString(String(website || ""));
  const cleanLogoUrl = sanitizeString(String(logoUrl || ""));
  const cleanDescription = sanitizeString(String(description || ""));

  if (cleanDisplayName.length > MAX_DISPLAY_NAME) {
    return NextResponse.json({ error: `Display name must be ${MAX_DISPLAY_NAME} chars or less` }, { status: 400 });
  }
  if (cleanWebsite.length > MAX_WEBSITE) {
    return NextResponse.json({ error: `Website must be ${MAX_WEBSITE} chars or less` }, { status: 400 });
  }
  if (cleanLogoUrl.length > MAX_LOGO_URL) {
    return NextResponse.json({ error: `Logo URL must be ${MAX_LOGO_URL} chars or less` }, { status: 400 });
  }
  if (cleanDescription.length > MAX_DESCRIPTION) {
    return NextResponse.json({ error: `Description must be ${MAX_DESCRIPTION} chars or less` }, { status: 400 });
  }

  // Validate URLs
  if (cleanWebsite && !isValidUrl(cleanWebsite)) {
    return NextResponse.json({ error: "Invalid website URL" }, { status: 400 });
  }
  if (cleanLogoUrl && !isValidUrl(cleanLogoUrl)) {
    return NextResponse.json({ error: "Invalid logo URL" }, { status: 400 });
  }

  // Verify EIP-712 signature
  const message = {
    code,
    displayName: cleanDisplayName,
    website: cleanWebsite,
    logoUrl: cleanLogoUrl,
    description: cleanDescription,
    nonce: BigInt(nonce || "0"),
  };

  let signerAddress: string;
  try {
    signerAddress = await recoverTypedDataAddress({
      domain: EIP712_DOMAIN,
      types: EIP712_TYPES,
      primaryType: "UpdateMetadata",
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Verify signer is the code owner via on-chain lookup
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
      : "https://eth.llamarpc.com";

    const client = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl),
    });

    const owner = await client.readContract({
      address: TAG_REGISTRY_ADDRESS,
      abi: TAG_REGISTRY_ABI,
      functionName: "ownerOfCode",
      args: [code],
    });

    if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
      return NextResponse.json({ error: "Signer is not the code owner" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to verify code ownership on-chain" }, { status: 500 });
  }

  // Save metadata
  const metadata: CodeMetadata = {
    code,
    displayName: cleanDisplayName,
    website: cleanWebsite,
    logoUrl: cleanLogoUrl,
    description: cleanDescription,
    updatedAt: new Date().toISOString(),
  };

  try {
    writeMetadata(code, metadata);
  } catch {
    return NextResponse.json({ error: "Failed to save metadata" }, { status: 500 });
  }

  return NextResponse.json(metadata, { status: 200 });
}
