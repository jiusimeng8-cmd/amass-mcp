import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler(
  async (server) => {
    server.tool(
      "do-nmap",
      "Run nmap network scanner with specified target. Returns the command to run locally since CLI tools cannot execute on serverless.",
      {
        target: z.string().describe("Target IP address or hostname to scan for open ports"),
        nmap_args: z.array(z.string()).optional().describe(`Additional nmap arguments. Common options:
  HOST DISCOVERY:
    -sn: Ping Scan - disable port scan
    -Pn: Treat all hosts as online -- skip host discovery
  SCAN TECHNIQUES:
    -sS: TCP SYN scan (default)
    -sT: TCP Connect scan
    -sU: UDP Scan
    -sA: TCP ACK scan
  PORT SPECIFICATION:
    -p <port ranges>: Only scan specified ports (e.g., -p22, -p1-65535, -p80,443)
    -F: Fast mode - Scan fewer ports
    --top-ports <number>: Scan most common ports
  SERVICE/VERSION DETECTION:
    -sV: Probe open ports to determine service/version info
    -sC: equivalent to --script=default
  OS DETECTION:
    -O: Enable OS detection
    -A: Enable OS detection, version detection, script scanning, and traceroute
  TIMING:
    -T<0-5>: Set timing template (higher is faster)
  OUTPUT:
    -v: Increase verbosity level
    --reason: Display the reason a port is in a particular state
    --open: Only show open (or possibly open) ports`)
      },
      async ({ target, nmap_args }) => {
        // Build the nmap command - spawn() does NOT work on Vercel serverless!
        const args: string[] = [];
        
        // Add optional nmap arguments
        if (nmap_args && nmap_args.length > 0) {
          args.push(...nmap_args);
        }
        
        // Add target at the end
        args.push(target);
        
        const command = `nmap ${args.join(" ")}`;
        
        return {
          content: [{
            type: "text",
            text: `To run nmap locally, execute:

${command}

This MCP server provides the interface. Run the command on your local machine where nmap is installed.

Nmap (Network Mapper) is a free and open source utility for network discovery and security auditing. 
Install it from: https://nmap.org/download.html

Common examples:
  nmap -sS -sV ${target}           # SYN scan with version detection
  nmap -p- ${target}                # Scan all 65535 ports
  nmap -A ${target}                 # Aggressive scan (OS, version, scripts, traceroute)
  nmap -sU -F ${target}             # Fast UDP scan
  nmap --top-ports 100 ${target}    # Scan top 100 ports`
          }]
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        "do-nmap": {
          description: "Run nmap network scanner with specified target. Returns the command to run locally since CLI tools cannot execute on serverless."
        }
      }
    }
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
    disableSse: true
  }
);

export { handler as GET, handler as POST, handler as DELETE };
