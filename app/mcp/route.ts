import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

// crt.sh API response interface
interface CrtShResponse {
  issuer_ca_id: number;
  issuer_name: string;
  common_name: string;
  name_value: string;
  id: number;
  entry_timestamp: string;
  not_before: string;
  not_after: string;
  serial_number: string;
  result_count: number;
}

// Parse name_value field (split by newline)
function parseNameValue(nameValue: string): string[] {
  const values = nameValue.split("\n");
  return values.filter((v) => v !== "");
}

// Clean and deduplicate results
function clearResult(result: string[], name: string): string[] {
  const escapedName = name.replace(/\./g, "\\.");
  const re = new RegExp(`[^.]+\\.${escapedName}\\b`);

  const unique: { [key: string]: boolean } = {};
  const uniqueList: string[] = [];

  for (const val of result) {
    if (!unique[val]) {
      if (re.test(val)) {
        unique[val] = true;
        uniqueList.push(val);
      }
    }
  }

  return uniqueList;
}

// Fetch subdomains from crt.sh
async function sendReqCrtSh(query: string): Promise<string[]> {
  try {
    const response = await fetch(`https://crt.sh/?q=${encodeURIComponent(query)}&output=json`);

    if (!response.ok) {
      return [];
    }

    const crtshResponse: CrtShResponse[] = await response.json();
    const domains: string[] = [];

    for (const crtshResp of crtshResponse) {
      const nameValues = parseNameValue(crtshResp.name_value);
      domains.push(...nameValues);
    }

    return domains;
  } catch (error) {
    console.error("Error fetching from crt.sh:", error);
    return [];
  }
}

// Main function to get subdomains
async function getCrtSh(target: string): Promise<string[]> {
  const subdomains = await sendReqCrtSh(target);
  const results = clearResult(subdomains, target);
  return results;
}

// Create MCP handler with crtsh tool
const handler = createMcpHandler(
  async (server) => {
    server.tool(
      "crtsh",
      "Discovers subdomains from SSL certificate logs using crt.sh",
      {
        target: z.string().describe("Target domain to analyze (e.g., example.com)"),
      },
      async ({ target }) => {
        try {
          const domains = await getCrtSh(target);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(domains, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error discovering subdomains: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }
    );
  },
  {
    capabilities: {
      tools: {
        crtsh: {
          description: "Discovers subdomains from SSL certificate logs using crt.sh",
        },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
    disableSse: true,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
