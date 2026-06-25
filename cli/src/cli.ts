#!/usr/bin/env node
import { Address, StrKey } from "@stellar/stellar-sdk";
import { Command } from "commander";

import { parseDisplayAmount } from "./amounts";
import { ILNClient } from "./client";
import { loadConfig } from "./config";
import { parseDueDate } from "./dates";
import { LocalDevEnvironment } from "./dev-environment";
import { formatUnknownError } from "./errors";
import { decodeScValXdr, formatDecodedScVal } from "./xdr";
import {
  createUi,
  describeConfig,
  formatHistoryJson,
  formatHistoryTable,
  formatInvoiceDetails,
  formatInvoiceDetailsJson,
  formatInvoiceList,
  formatInvoiceListJson,
  formatProtocolConfig,
} from "./format";
import { registerInspectCommand } from "./inspect";
import { registerCompletionCommand } from "./completion";
import { createKeypairFileSigner } from "./signer";
import { TestnetAccountSeeder } from "./dev-seed";
import type { Ui } from "./format";
import type { ResolvedConfig, RpcServerLike } from "./types";

import { checkCompatibility } from "@invoice-liquidity/sdk";

export interface CliDependencies {
  createClient(config: ResolvedConfig): ILNClient;
  createDevEnvironment?(ui: Ui): Pick<LocalDevEnvironment, "reset" | "start" | "status" | "stop">;
  loadConfig(options?: { cwd?: string; env?: NodeJS.ProcessEnv }): ResolvedConfig;
  stderr: NodeJS.WritableStream;
  stdout: NodeJS.WritableStream;
}

export async function runCli(
  argv: string[],
  dependencies: Partial<CliDependencies> = {},
): Promise<number> {
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const ui = createUi(stdout, stderr);
  const load = dependencies.loadConfig ?? loadConfig;
  const createClient =
    dependencies.createClient ??
    ((config: ResolvedConfig) => new ILNClient({
      contractId: config.contractId,
      networkPassphrase: config.networkPassphrase,
      rpcUrl: config.rpcUrl,
      signer: createKeypairFileSigner(config.keypairPath),
    }));
  const createDevEnvironment =
    dependencies.createDevEnvironment ??
    ((devUi: Ui) => new LocalDevEnvironment({ ui: devUi }));

  const program = new Command();
  program
    .name("iln")
    .description("Invoice Liquidity Network CLI")
    .exitOverride()
    .showHelpAfterError()
    .option("--json", "output machine-readable JSON (applies to: status, list)")
    .option("--quiet", "suppress informational messages; show only command output")
    .hook("preAction", (_thisCommand, actionCommand) => {
      registerCompletionCommand(program);

  const isConfiglessXdrCommand =
        actionCommand.name() === "decode" && actionCommand.parent?.name() === "xdr";
      if (
        isConfiglessXdrCommand ||
        (actionCommand.parent?.name() === "dev" &&
          ["reset", "start", "status", "stop"].includes(actionCommand.name()))
      ) {
        return;
      }

      try {
        const config = load();
        const opts = program.opts() as { quiet?: boolean };
        if (!opts.quiet) {
          ui.info(`Using ${describeConfig(config)}`);
        }
      } catch (error) {
        throw error;
      }
    });

  program
    .command("submit")
    .description("Submit a new invoice from the configured signer account.")
    .requiredOption("--payer <address>", "payer Stellar address")
    .requiredOption("--amount <amount>", "invoice amount in display units, for example 100 or 12.5")
    .requiredOption("--due <date>", "due date as YYYY-MM-DD or Unix timestamp")
    .requiredOption("--rate <bps>", "discount rate in basis points")
    .option("--token <contractId>", "override token contract ID from config")
    .action(async (options: { amount: string; due: string; payer: string; rate: string; token?: string }) => {
      const config = load();
      const client = createClient(config);
      const tokenId = options.token ?? config.tokenId;
      if (!tokenId) {
        throw new Error(
          "Missing token ID. Set `tokenId` in .iln.json, set `ILN_TOKEN_ID`, or pass `--token`.",
        );
      }

      assertStellarAddress(options.payer, "payer");
      assertContractId(tokenId, "token");

      const { invoiceId, txHash } = await client.submitInvoice({
        amount: parseDisplayAmount(options.amount),
        discountRate: parseBasisPoints(options.rate),
        dueDate: parseDueDate(options.due),
        payer: options.payer,
        tokenId,
      });

      ui.success(`Submitted invoice ${invoiceId.toString()} in transaction ${txHash}.`);
    });

  program
    .command("fund")
    .description("Fund an invoice using the configured signer account.")
    .requiredOption("--id <invoiceId>", "invoice ID")
    .option("--amount <amount>", "amount to fund in display units; defaults to the remaining balance")
    .action(async (options: { amount?: string; id: string }) => {
      const client = createClient(load());
      const result = await client.fundInvoice(
        parseInvoiceId(options.id),
        options.amount ? parseDisplayAmount(options.amount) : undefined,
      );
      ui.success(`Funded invoice ${options.id} in transaction ${result.hash}.`);
    });

  program
    .command("pay")
    .description("Mark an invoice as paid using the configured signer account.")
    .requiredOption("--id <invoiceId>", "invoice ID")
    .action(async (options: { id: string }) => {
      const client = createClient(load());
      const result = await client.markPaid(parseInvoiceId(options.id));
      ui.success(`Marked invoice ${options.id} as paid in transaction ${result.hash}.`);
    });

  program
    .command("status")
    .description("Show the current state of an invoice.")
    .requiredOption("--id <invoiceId>", "invoice ID")
    .action(async (options: { id: string }) => {
      const client = createClient(load());
      const invoice = await client.getInvoice(parseInvoiceId(options.id));
      const opts = program.opts() as { json?: boolean };
      ui.info(opts.json ? formatInvoiceDetailsJson(invoice) : formatInvoiceDetails(invoice));
    });

  program
    .command("list")
    .description("List all invoices associated with a Stellar address.")
    .requiredOption("--address <address>", "freelancer, payer, or funder Stellar address")
    .action(async (options: { address: string }) => {
      assertStellarAddress(options.address, "address");
      const client = createClient(load());
      const invoices = await client.listInvoicesByAddress(options.address);
      const opts = program.opts() as { json?: boolean };
      ui.info(opts.json ? formatInvoiceListJson(invoices) : formatInvoiceList(invoices));
    });

  program
    .command("history")
    .description("Show past invoice submissions, fundings, and payments for a Stellar address.")
    .requiredOption("--address <address>", "Stellar address to query history for")
    .option("--id <invoiceId>", "filter to a specific invoice ID")
    .option(
      "--action <type>",
      "filter by action type: submit (freelancer), fund (funder), pay (payer)",
    )
    .option("--limit <n>", "maximum number of results to return")
    .option("--format <fmt>", "output format: table (default) or json", "table")
    .action(
      async (options: {
        address: string;
        id?: string;
        action?: string;
        limit?: string;
        format: string;
      }) => {
        assertStellarAddress(options.address, "address");

        if (options.format !== "table" && options.format !== "json") {
          throw new Error("--format must be table or json");
        }

        const ACTION_TO_ROLE: Record<string, "freelancer" | "funder" | "payer"> = {
          submit: "freelancer",
          fund: "funder",
          pay: "payer",
        };

        if (options.action && !ACTION_TO_ROLE[options.action]) {
          throw new Error(
            `--action must be one of: ${Object.keys(ACTION_TO_ROLE).join(", ")}`,
          );
        }

        const client = createClient(load());
        let invoices = await client.listInvoicesByAddress(options.address);

        if (options.id !== undefined) {
          const targetId = parseInvoiceId(options.id);
          invoices = invoices.filter((inv) => inv.id === targetId);
        }

        if (options.action) {
          const role = ACTION_TO_ROLE[options.action];
          invoices = invoices.filter((inv) => inv.role === role);
        }

        if (options.limit !== undefined) {
          const limit = parseInt(options.limit, 10);
          if (isNaN(limit) || limit <= 0) {
            throw new Error("--limit must be a positive integer");
          }
          invoices = invoices.slice(0, limit);
        }

        const globalOpts = program.opts() as { json?: boolean };
        const output =
          options.format === "json" || globalOpts.json
            ? formatHistoryJson(invoices)
            : formatHistoryTable(invoices);

        ui.info(output);
      },
    );

  // Compatibility check command
  const compatCommand = program.command("compat").description("SDK and contract compatibility utilities");

  compatCommand
    .command("check")
    .description("Check SDK compatibility with the deployed contract version.")
    .action(async () => {
      const config = load();
      const client = createClient(config);
      
      ui.info("Checking contract compatibility...");
      const result = await checkCompatibility(async (method: string) => {
        if (method === "get_version") {
          return client.getVersion();
        }
        throw new Error(`Unsupported compatibility check invoke method: ${method}`);
      });

      ui.info(`SDK Version:      ${result.sdkVersion}`);
      ui.info(`Contract Version: ${result.contractVersion}`);
      
      if (result.compatible) {
        ui.success("Compatibility check passed! The SDK is fully compatible with the deployed contract.");
      } else {
        ui.error("Compatibility check failed!");
        result.issues.forEach((issue) => {
          ui.error(` - ${issue}`);
        });
        throw new Error("Compatibility check failed.");
      }
    });

  program
    .command("config")
    .description("Show live protocol configuration from the ILN contract.")
    .action(async () => {
      const client = createClient(load());
      const config = await client.getProtocolConfig();
      ui.info(formatProtocolConfig(config));
    });

  const xdrCommand = program.command("xdr").description("Inspect Soroban XDR values");

  xdrCommand
    .command("decode")
    .description("Decode a base64 Soroban ScVal XDR value.")
    .argument("[base64]", "base64-encoded ScVal XDR")
    .action((base64?: string) => {
      if (!base64) {
        throw new Error("Missing base64 ScVal XDR. Usage: iln xdr decode <base64>");
      }

      stdout.write(formatDecodedScVal(decodeScValXdr(base64)));
    });

  // Dashboard command
  program
    .command("dashboard")
    .description("Launch the real-time dashboard for monitoring invoice activity.")
    .option("--refresh <ms>", "Refresh interval in milliseconds", "5000")
    .option("--export <file>", "Export dashboard data to JSON file")
    .action(async (options: { refresh: string; export?: string }) => {
      const config = load();
      const client = createClient(config);
      const { runDashboard } = await import("./dashboard");

      if (options.export) {
        const { Dashboard } = await import("./dashboard");
        const dashboard = new Dashboard(client, config, {
          refreshIntervalMs: parseInt(options.refresh, 10),
        });
        // Quick refresh and export
        await dashboard["refresh"]();
        const data = dashboard.exportData();
        const fs = await import("fs");
        fs.writeFileSync(options.export, JSON.stringify(data, null, 2));
        ui.success(`Dashboard data exported to ${options.export}`);
      } else {
        await runDashboard(client, config, {
          refreshIntervalMs: parseInt(options.refresh, 10),
        });
      }
    });

  // Development commands
  const devCommand = program.command("dev").description("Development utilities");

  devCommand
    .command("start")
    .description("Start a local Stellar node, deploy contracts, fund accounts, and write .env.local.")
    .action(async () => {
      await createDevEnvironment(ui).start();
    });

  devCommand
    .command("stop")
    .description("Stop and remove the local Stellar node container.")
    .action(async () => {
      await createDevEnvironment(ui).stop();
    });

  devCommand
    .command("reset")
    .description("Stop, clear local state, and start a fresh local environment.")
    .action(async () => {
      await createDevEnvironment(ui).reset();
    });

  devCommand
    .command("status")
    .description("Show local node, contract, and account environment status.")
    .action(async () => {
      await createDevEnvironment(ui).status();
    });

  devCommand
    .command("seed")
    .description("Create and fund testnet accounts with USDC/EURC trustlines for development.")
    .option("--scenario <type>", "seeding scenario: new-user, active-lp, disputed")
    .option("--count <n>", "number of records to seed per scenario", "1")
    .option("--token <symbol>", "specific token to use: USDC or EURC")
    .action(async (options: { scenario?: string; count?: string; token?: string }) => {
      const config = load();
      const seeder = new TestnetAccountSeeder({ config, ui });
      const count = parseInt(options.count ?? "1", 10);
      if (isNaN(count) || count <= 0) {
        throw new Error("--count must be a positive integer");
      }
      await seeder.seed({ scenario: options.scenario, count, token: options.token });
    });

  try {
    await program.parseAsync(argv, { from: "user" });
    return 0;
  } catch (error) {
    ui.error(formatUnknownError(error));
    return 1;
  }
}

export async function main(): Promise<void> {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}

function parseInvoiceId(value: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error("Invoice ID must be a positive integer.");
  }

  return BigInt(value);
}

function parseBasisPoints(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error("Discount rate must be an integer basis-point value.");
  }

  return Number(value);
}

function assertStellarAddress(value: string, field: string): void {
  if (!StrKey.isValidEd25519PublicKey(value)) {
    throw new Error(`Invalid ${field} address: ${value}`);
  }
}

function assertContractId(value: string, field: string): void {
  try {
    Address.fromString(value);
  } catch {
    throw new Error(`Invalid ${field} contract ID: ${value}`);
  }
}
